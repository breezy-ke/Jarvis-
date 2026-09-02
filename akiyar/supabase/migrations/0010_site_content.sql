-- 0010_site_content.sql
-- The campaign site's editable content: news posts and diary entries.
--
-- WHY THIS EXISTS
--
-- The campaign site used to be a separate WordPress install, chosen for exactly
-- one reason: non-technical staff had to be able to publish news from a phone
-- without a developer. Folding the site into the Next.js application would have
-- thrown that away, so these two tables and the editor at /admin/content put it
-- back — without a second platform, a second host, or a second database holding
-- anything about a supporter.
--
-- BOUNDARY
--
-- Nothing in this file touches the register. `posts` and `events` are public
-- marketing copy: readable by anyone, written only by campaign staff. A leak
-- here exposes press releases. That separation is the point — keep it.

-- ------------------------------------------------------------------ enums

-- Draft is the default and the safe state: a post being written is never
-- momentarily live. `archived` keeps a record without publishing it, because
-- deleting a post that was already shared breaks somebody's link.
do $$ begin
  create type content_state as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------ posts

create table if not exists posts (
  id           uuid primary key default gen_random_uuid(),

  -- The address this post lives at. Stable once published: a slug edited after
  -- the link has been forwarded round WhatsApp is a 404 for everyone who got it.
  slug         citext not null unique,

  title        text not null check (length(btrim(title)) between 3 and 200),

  -- One line under the headline in the log. Optional: an entry with no summary
  -- still reads correctly, it just says less.
  excerpt      text check (excerpt is null or length(excerpt) <= 400),

  -- The post itself, as plain text with blank lines between paragraphs. NOT
  -- HTML: this is written by campaign staff on a phone and rendered into
  -- paragraphs by the app, so a pasted script tag is text, never markup.
  body         text not null check (length(btrim(body)) >= 1),

  -- A short free-text label ("Statement", "Ward visit"). Free text rather than
  -- an enum because a campaign invents a category the week it needs one, and a
  -- migration is not something staff can run.
  category     text check (category is null or length(category) <= 40),

  state        content_state not null default 'draft',

  -- When it should be dated in the log. Separate from created_at so a post
  -- written on Sunday about Friday's meeting is filed on Friday.
  published_at timestamptz,

  author_id    uuid references staff (id) on delete set null,
  author_label text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A published post must be dated. Without this a live post can sort anywhere
  -- in a log whose entire structure is the date.
  constraint posts_published_has_date
    check (state <> 'published' or published_at is not null)
);

create index if not exists posts_live_idx
  on posts (published_at desc)
  where state = 'published';

-- ----------------------------------------------------------------- events

-- The diary. Deliberately not a calendar system: campaign stops move with the
-- weather and the roads, staff are non-technical, and a plugin that needs a
-- manual is a schedule that will go stale.
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),

  title        text not null check (length(btrim(title)) between 3 and 200),

  -- Free text rather than a timestamp pair. "Saturday 14 March, from 10am" is
  -- how these are announced on the ground, and forcing a precise time on a
  -- meeting that starts when people arrive produces a schedule that is wrong in
  -- a way the reader can measure.
  when_text    text not null check (length(btrim(when_text)) between 1 and 120),

  -- Where, in the same spirit: a named place people recognise.
  where_text   text not null check (length(btrim(where_text)) between 1 and 160),

  -- Optional link to the electoral geography, so the campaign can later ask
  -- which wards it has actually visited without parsing free text.
  ward_id      smallint references wards (id) on delete set null,

  summary      text check (summary is null or length(summary) <= 400),

  state        content_state not null default 'draft',

  -- The sort key. A date the app can order by, kept alongside when_text rather
  -- than derived from it, so a stop can be filed correctly even when its time
  -- is written loosely.
  starts_on    date not null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists events_live_idx
  on events (starts_on)
  where state = 'published';

-- ---------------------------------------------------------------- touches

drop trigger if exists posts_touch_updated_at on posts;
create trigger posts_touch_updated_at
  before update on posts
  for each row execute function touch_updated_at();

drop trigger if exists events_touch_updated_at on events;
create trigger events_touch_updated_at
  before update on events
  for each row execute function touch_updated_at();

-- -------------------------------------------------------------------- rls
--
-- Reads: anyone, but only what is published. A draft is invisible to the anon
-- key even though it sits in the same table.
--
-- Writes: staff only, and never through the browser in practice — the editor
-- goes through server actions holding the service role. These policies are the
-- second line of defence for the day a key is misconfigured.

alter table posts  enable row level security;
alter table events enable row level security;

drop policy if exists posts_public_read on posts;
create policy posts_public_read on posts
  for select to anon, authenticated
  using (state = 'published' and published_at <= now());

drop policy if exists posts_staff_read on posts;
create policy posts_staff_read on posts
  for select to authenticated
  using (auth_is_staff());

drop policy if exists posts_staff_write on posts;
create policy posts_staff_write on posts
  for all to authenticated
  using (auth_is_staff())
  with check (auth_is_staff());

drop policy if exists events_public_read on events;
create policy events_public_read on events
  for select to anon, authenticated
  using (state = 'published');

drop policy if exists events_staff_read on events;
create policy events_staff_read on events
  for select to authenticated
  using (auth_is_staff());

drop policy if exists events_staff_write on events;
create policy events_staff_write on events
  for all to authenticated
  using (auth_is_staff())
  with check (auth_is_staff());
