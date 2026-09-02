-- 0004_verification_and_audit.sql
-- Phone verification, the integrity queue, and the append-only audit log.

-- ------------------------------------------------------- OTP challenges

-- Codes are stored hashed. A leak of this table must not let anyone verify
-- a pending registration.
create table if not exists otp_challenges (
  id            uuid primary key default gen_random_uuid(),
  supporter_id  uuid not null references supporters(id) on delete cascade,
  phone         text not null,
  code_hash     text not null,
  expires_at    timestamptz not null,
  attempts      smallint not null default 0 check (attempts >= 0),
  consumed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists otp_supporter_idx on otp_challenges (supporter_id);
create index if not exists otp_phone_idx     on otp_challenges (phone, created_at desc);

-- Only one live challenge per supporter at a time.
create unique index if not exists otp_one_live_per_supporter
  on otp_challenges (supporter_id)
  where consumed_at is null;

-- Cheap send-rate guard: how many codes went to this number recently.
create or replace function otp_sends_last_hour(p_phone text)
returns integer
language sql
stable
as $$
  select count(*)::int
  from otp_challenges
  where phone = p_phone
    and created_at > now() - interval '1 hour';
$$;

-- --------------------------------------------------------- integrity queue

create table if not exists integrity_flags (
  id             uuid primary key default gen_random_uuid(),
  kind           integrity_flag_kind not null,
  state          integrity_flag_state not null default 'open',

  -- One of these will be set depending on what was flagged.
  supporter_id   uuid    references supporters(id) on delete cascade,
  station_id     integer references polling_stations(id) on delete cascade,

  -- Human-readable statement of what tripped, and the numbers behind it.
  summary        text not null,
  detail         jsonb not null default '{}'::jsonb,

  resolved_by    uuid references staff(id) on delete set null,
  resolved_at    timestamptz,
  resolution     text,

  created_at     timestamptz not null default now(),

  constraint integrity_flags_targets_something
    check (supporter_id is not null or station_id is not null),
  constraint integrity_flags_resolution_complete
    check ((state = 'open') = (resolved_at is null))
);

create index if not exists integrity_flags_open_idx
  on integrity_flags (created_at desc) where state = 'open';
create index if not exists integrity_flags_supporter_idx on integrity_flags (supporter_id);

-- ------------------------------------------------------------ audit log

-- Append-only. If the register is ever disputed — and in a contested
-- nomination it will be — this is what makes it defensible.
create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references staff(id) on delete set null,
  actor_label text,                       -- survives staff deletion
  action      text not null,              -- 'supporter.verify', 'flag.resolve', ...
  entity      text not null,              -- table name
  entity_id   text,
  before      jsonb,
  after       jsonb,
  at          timestamptz not null default now()
);

create index if not exists audit_log_at_idx     on audit_log (at desc);
create index if not exists audit_log_entity_idx on audit_log (entity, entity_id);

-- Refuse edits and deletes at the database level, not just in application code.
create or replace function audit_log_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only; % is not permitted', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists audit_log_no_update on audit_log;
create trigger audit_log_no_update
  before update or delete on audit_log
  for each row execute function audit_log_is_append_only();

comment on table audit_log is
  'Append-only by trigger. Every integrity decision lands here so the register can survive a dispute.';
comment on table otp_challenges is
  'Codes are hashed. This table leaking must not allow anyone to verify a pending registration.';
