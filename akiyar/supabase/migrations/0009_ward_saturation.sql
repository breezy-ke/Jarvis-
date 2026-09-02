-- 0009_ward_saturation.sql
--
-- Moves the saturation metric from per-polling-station to per-ward.
--
-- WHY: the IEBC publishes registered-voter counts down to WARD level as
-- structured data, but the per-polling-station split lives only inside the full
-- Register of Voters PDF and is not available as data. Rather than invent a
-- per-station denominator, we compute saturation on the real ward figures.
-- Polling stations still exist and are selected at sign-up (and supporters are
-- still counted per station) — they just do not each carry a voter denominator.
--
-- This migration is additive and safe to run on an existing database.

-- ---------------------------------------------------------------- schema

-- The real denominator now lives on the ward.
alter table wards
  add column if not exists registered_voters integer
  check (registered_voters is null or registered_voters > 0);

-- Per-station voter counts are not public; the column stays for the day they
-- are, but is no longer required.
alter table polling_stations
  alter column registered_voters drop not null;

do $$ begin
  alter table polling_stations drop constraint polling_stations_registered_voters_check;
exception when undefined_object then null; end $$;

-- Administrative sub-locations (chief's areas) are not in the electoral data, so
-- a supporter is no longer required to pick one. Village stays as free text.
alter table supporters
  alter column sub_location_id drop not null;

-- Integrity flags can now target a ward (the denominator tripwire is ward-level).
alter table integrity_flags
  add column if not exists ward_id smallint references wards(id) on delete cascade;

alter table integrity_flags drop constraint if exists integrity_flags_targets_something;
alter table integrity_flags add constraint integrity_flags_targets_something
  check (supporter_id is not null or station_id is not null or ward_id is not null);

comment on column wards.registered_voters is
  'Real IEBC registered voters for the ward. The saturation denominator.';

-- Duplicate detection now scopes to the WARD rather than the sub-location,
-- since sub-locations are no longer collected. Same name plus same ward is the
-- combination worth a human look.
drop function if exists find_similar_supporters(uuid, text, integer, real);
create or replace function find_similar_supporters(
  p_supporter_id uuid,
  p_full_name    text,
  p_ward_id      smallint,
  p_threshold    real default 0.55
)
returns table (id uuid, full_name text, phone text, similarity real)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.full_name,
    s.phone,
    similarity(s.full_name, p_full_name) as similarity
  from supporters s
  where s.ward_id = p_ward_id
    and s.id <> p_supporter_id
    and s.verification_status <> 'duplicate'
    and similarity(s.full_name, p_full_name) >= p_threshold
  order by similarity desc
  limit 10;
$$;

revoke all on function find_similar_supporters(uuid, text, smallint, real) from public, anon;

-- ------------------------------------------------------------- views

-- Replace the per-station saturation view with a per-station ACTIVITY view:
-- counts only, no percentage, because there is no per-station denominator.
drop view if exists station_saturation cascade;
create view station_activity as
  select
    ps.id                       as station_id,
    ps.iebc_code                as station_code,
    ps.name                     as station_name,
    w.id                        as ward_id,
    w.name                      as ward_name,
    c.id                        as constituency_id,
    c.name                      as constituency_name,
    coalesce(v.verified, 0)     as verified_supporters,
    coalesce(p.pending, 0)      as pending_supporters
  from polling_stations ps
  join wards w          on w.id = ps.ward_id
  join constituencies c on c.id = w.constituency_id
  left join (
    select polling_station_id, count(*)::int as verified
    from supporters
    where verification_status in ('otp_verified','agent_verified')
    group by polling_station_id
  ) v on v.polling_station_id = ps.id
  left join (
    select polling_station_id, count(*)::int as pending
    from supporters
    where verification_status = 'unverified'
    group by polling_station_id
  ) p on p.polling_station_id = ps.id;

-- The real saturation metric: verified supporters over the ward's registered
-- voters. This is what tells the campaign which wards are cold.
drop view if exists ward_saturation cascade;
create view ward_saturation as
  select
    w.id   as ward_id,
    w.name as ward_name,
    c.id   as constituency_id,
    c.name as constituency_name,
    w.registered_voters,
    coalesce(v.verified, 0)  as verified_supporters,
    coalesce(pnd.pending, 0) as pending_supporters,
    round(100.0 * coalesce(v.verified, 0) / nullif(w.registered_voters, 0), 2) as saturation_pct,
    case
      when w.registered_voters is null then 'unknown'
      when 100.0 * coalesce(v.verified, 0) / w.registered_voters <  3 then 'cold'
      when 100.0 * coalesce(v.verified, 0) / w.registered_voters <  8 then 'needs_work'
      when 100.0 * coalesce(v.verified, 0) / w.registered_voters < 15 then 'holding'
      else 'strong'
    end as status,
    -- Tripwire: verified support cannot legitimately exceed the register.
    coalesce(v.verified, 0) > coalesce(w.registered_voters, 2147483647) as exceeds_denominator
  from wards w
  join constituencies c on c.id = w.constituency_id
  left join (
    select ward_id, count(*)::int as verified
    from supporters
    where verification_status in ('otp_verified','agent_verified')
    group by ward_id
  ) v on v.ward_id = w.id
  left join (
    select ward_id, count(*)::int as pending
    from supporters
    where verification_status = 'unverified'
    group by ward_id
  ) pnd on pnd.ward_id = w.id;

-- County roll-up, now on the real ward denominators.
create or replace view county_summary as
  select
    (select count(*) from verified_supporters)                                 as verified_supporters,
    (select count(*) from supporters where verification_status = 'unverified') as awaiting_verification,
    (select sum(registered_voters) from wards)                                 as registered_voters,
    round(
      100.0 * (select count(*) from verified_supporters)
      / nullif((select sum(registered_voters) from wards), 0), 2
    )                                                                          as saturation_pct,
    (select count(*) from ward_saturation where status = 'cold')               as cold_wards,
    (select count(*) from integrity_flags where state = 'open')                as open_flags,
    (select count(*) from verified_supporters where verified_at > now() - interval '7 days')
                                                                               as verified_last_7d;

alter view station_activity set (security_invoker = true);
alter view ward_saturation  set (security_invoker = true);
alter view county_summary   set (security_invoker = true);

comment on view ward_saturation is
  'Verified supporters over the ward''s real registered voters. The saturation metric the campaign acts on.';
comment on view station_activity is
  'Supporter counts per polling station. No percentage — per-station denominators are not public.';
