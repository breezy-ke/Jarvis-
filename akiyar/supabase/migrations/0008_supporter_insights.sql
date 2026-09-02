-- 0008_supporter_insights.sql
--
-- What the campaign learns from its own supporters.
--
-- This is not a horse race against rivals. It answers three questions the
-- campaign can act on the same week it reads them:
--
--   What do my people actually care about, ward by ward?
--   Which of them will do more than vote?
--   Which channel is bringing them in?
--
-- The answers live on the supporter record rather than in a separate anonymous
-- pool, and that is the whole point. An anonymous survey tells you "38 per cent
-- of respondents care about water". This tells you "in Kalokol, water is the
-- top issue and here are the 46 verified people who said so and will help".
-- One is a statistic. The other is a ground plan.
--
-- Every answer is optional. A supporter who wants only to be counted can skip
-- the entire step, and the register is worth more with their name in it than
-- without it.

do $$ begin
  create type supporter_issue as enum (
    'jobs', 'education', 'oversight', 'water', 'security', 'health', 'livestock', 'other'
  );
exception when duplicate_object then null; end $$;

-- How far somebody is willing to go. Ordered from least to most involved so
-- the campaign can filter on "at least willing to share".
do $$ begin
  create type supporter_pledge as enum (
    'vote_only',      -- my vote, and that is enough
    'spread_word',    -- I will bring my neighbours
    'attend_events',  -- I will show up at barazas and rallies
    'volunteer'       -- put me to work
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type supporter_source as enum (
    'friend_family', 'baraza', 'social_media', 'whatsapp', 'radio', 'agent', 'other'
  );
exception when duplicate_object then null; end $$;

alter table supporters
  add column if not exists top_issue    supporter_issue,
  add column if not exists second_issue supporter_issue,
  add column if not exists pledge       supporter_pledge,
  add column if not exists heard_via    supporter_source;

create index if not exists supporters_issue_idx  on supporters (top_issue) where top_issue is not null;
create index if not exists supporters_pledge_idx on supporters (pledge) where pledge is not null;

comment on column supporters.top_issue is
  'Self declared priority. Drives what the campaign talks about in each ward.';
comment on column supporters.pledge is
  'How far this supporter will go. The volunteer and attend_events tiers are the recruiting pool for the ground team.';

-- ------------------------------------------------------------------ views
-- Verified supporters only, in keeping with every other figure in the system.

create or replace view insight_issues as
  select
    s.top_issue::text as issue,
    count(*)::int     as supporters,
    round(100.0 * count(*) / nullif((
      select count(*) from supporters
      where verification_status in ('otp_verified','agent_verified')
        and top_issue is not null
    ), 0), 1) as share_pct
  from supporters s
  where s.verification_status in ('otp_verified','agent_verified')
    and s.top_issue is not null
  group by s.top_issue
  order by count(*) desc;

-- The same question asked ward by ward. This is the version that changes what
-- the campaign does on a Tuesday: a county wide average hides the fact that
-- water wins in one ward and jobs win in the next.
create or replace view insight_issues_by_ward as
  select
    w.id   as ward_id,
    w.name as ward_name,
    c.name as constituency_name,
    s.top_issue::text as issue,
    count(*)::int as supporters
  from supporters s
  join wards w on w.id = s.ward_id
  join constituencies c on c.id = w.constituency_id
  where s.verification_status in ('otp_verified','agent_verified')
    and s.top_issue is not null
  group by w.id, w.name, c.name, s.top_issue;

create or replace view insight_pledges as
  select
    s.pledge::text as pledge,
    count(*)::int  as supporters,
    round(100.0 * count(*) / nullif((
      select count(*) from supporters
      where verification_status in ('otp_verified','agent_verified')
        and pledge is not null
    ), 0), 1) as share_pct
  from supporters s
  where s.verification_status in ('otp_verified','agent_verified')
    and s.pledge is not null
  group by s.pledge
  order by count(*) desc;

create or replace view insight_sources as
  select
    s.heard_via::text as source,
    count(*)::int     as supporters,
    round(100.0 * count(*) / nullif((
      select count(*) from supporters
      where verification_status in ('otp_verified','agent_verified')
        and heard_via is not null
    ), 0), 1) as share_pct
  from supporters s
  where s.verification_status in ('otp_verified','agent_verified')
    and s.heard_via is not null
  group by s.heard_via
  order by count(*) desc;

-- The recruiting pool. Everyone who offered to do more than vote.
create or replace view ground_team_pool as
  select
    w.name as ward_name,
    count(*) filter (where s.pledge = 'volunteer')::int     as volunteers,
    count(*) filter (where s.pledge = 'attend_events')::int as event_goers,
    count(*) filter (where s.pledge = 'spread_word')::int   as sharers,
    count(*)::int as total_willing
  from supporters s
  join wards w on w.id = s.ward_id
  where s.verification_status in ('otp_verified','agent_verified')
    and s.pledge is not null
    and s.pledge <> 'vote_only'
  group by w.name
  order by count(*) desc;

alter view insight_issues         set (security_invoker = true);
alter view insight_issues_by_ward set (security_invoker = true);
alter view insight_pledges        set (security_invoker = true);
alter view insight_sources        set (security_invoker = true);
alter view ground_team_pool       set (security_invoker = true);
