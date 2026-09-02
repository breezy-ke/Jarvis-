-- 0005_analytics_views.sql
-- Every view here counts verified supporters ONLY.
--
-- This is a product decision expressed in SQL: an unverified signup is a claim,
-- not a supporter, and a campaign that quotes raw signup totals walks into a
-- nomination believing a number nobody checked. If a raw total is ever needed
-- it has to be asked for explicitly against the base table.

-- A supporter that counts.
create or replace view verified_supporters as
  select *
  from supporters
  where verification_status in ('otp_verified', 'agent_verified');

-- ------------------------------------------------- polling station saturation

-- The core analytic of the whole product: supporters as a share of the people
-- who can actually vote at that station. A headcount says nothing about
-- whether you are winning the room; this ratio does.
create or replace view station_saturation as
  select
    ps.id                       as station_id,
    ps.iebc_code                as station_code,
    ps.name                     as station_name,
    ps.registered_voters,
    w.id                        as ward_id,
    w.name                      as ward_name,
    c.id                        as constituency_id,
    c.name                      as constituency_name,
    coalesce(v.verified, 0)     as verified_supporters,
    coalesce(p.pending, 0)      as pending_supporters,
    round(100.0 * coalesce(v.verified, 0) / ps.registered_voters, 2) as saturation_pct,
    case
      when 100.0 * coalesce(v.verified, 0) / ps.registered_voters <  3 then 'cold'
      when 100.0 * coalesce(v.verified, 0) / ps.registered_voters <  8 then 'needs_work'
      when 100.0 * coalesce(v.verified, 0) / ps.registered_voters < 15 then 'holding'
      else 'strong'
    end as status,
    -- Tripwire: verified support cannot exceed the register. If this is true the
    -- station mapping is wrong or the registrations are not genuine.
    coalesce(v.verified, 0) > ps.registered_voters as exceeds_denominator
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

-- --------------------------------------------------------- ward roll-up

create or replace view ward_saturation as
  select
    w.id   as ward_id,
    w.name as ward_name,
    c.id   as constituency_id,
    c.name as constituency_name,
    sum(ss.registered_voters)::int     as registered_voters,
    sum(ss.verified_supporters)::int   as verified_supporters,
    count(*)::int                      as station_count,
    count(*) filter (where ss.status = 'cold')::int as cold_stations,
    round(100.0 * sum(ss.verified_supporters) / nullif(sum(ss.registered_voters), 0), 2)
      as saturation_pct
  from station_saturation ss
  join wards w          on w.id = ss.ward_id
  join constituencies c on c.id = w.constituency_id
  group by w.id, w.name, c.id, c.name;

-- ----------------------------------------------------------- ward momentum

-- Verified signups per ward per week for the last 8 weeks. A falling line in a
-- stronghold is the earliest warning the campaign will get.
create or replace view ward_momentum_weekly as
  select
    w.id   as ward_id,
    w.name as ward_name,
    date_trunc('week', s.verified_at)::date as week,
    count(*)::int as verified_count
  from supporters s
  join wards w on w.id = s.ward_id
  where s.verification_status in ('otp_verified','agent_verified')
    and s.verified_at > now() - interval '8 weeks'
  group by w.id, w.name, date_trunc('week', s.verified_at)
  order by w.name, week;

-- ------------------------------------------------------------ county totals

create or replace view county_summary as
  select
    (select count(*) from verified_supporters)                                as verified_supporters,
    (select count(*) from supporters where verification_status = 'unverified') as awaiting_verification,
    (select sum(registered_voters) from polling_stations)                      as registered_voters,
    round(
      100.0 * (select count(*) from verified_supporters)
      / nullif((select sum(registered_voters) from polling_stations), 0), 2
    )                                                                          as saturation_pct,
    (select count(*) from station_saturation where status = 'cold')            as cold_stations,
    (select count(*) from integrity_flags where state = 'open')                as open_flags,
    (select count(*) from verified_supporters where verified_at > now() - interval '7 days')
                                                                               as verified_last_7d;

comment on view station_saturation is
  'Verified supporters over registered voters, per station. The number that tells the campaign where to go next.';
comment on view verified_supporters is
  'The only supporter set any dashboard figure is allowed to be built from.';
