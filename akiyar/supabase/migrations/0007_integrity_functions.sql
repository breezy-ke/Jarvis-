-- 0007_integrity_functions.sql
-- Server-side helpers used by the integrity layer.

-- Fuzzy name match within a sub-location.
--
-- Deliberately scoped to one sub-location rather than the whole county: Turkana
-- naming conventions mean many genuine, distinct people share a name across the
-- county, and a county-wide fuzzy match would bury the review queue in false
-- positives on day one. Same name plus same sub-location is the combination
-- actually worth a human look.
create or replace function find_similar_supporters(
  p_supporter_id    uuid,
  p_full_name       text,
  p_sub_location_id integer,
  p_threshold       real default 0.55
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
  where s.sub_location_id = p_sub_location_id
    and s.id <> p_supporter_id
    and s.verification_status <> 'duplicate'
    and similarity(s.full_name, p_full_name) >= p_threshold
  order by similarity desc
  limit 10;
$$;

revoke all on function find_similar_supporters(uuid, text, integer, real) from public, anon;

-- Volume anomaly detector.
--
-- A burst of registrations from one device is what an agent registering a queue
-- at a baraza looks like. It is also what a script looks like. This does not
-- try to tell them apart — it surfaces the burst and lets a human decide, which
-- is the only honest way to handle a signal with two innocent explanations.
create or replace function detect_volume_anomalies(
  p_window   interval default interval '1 hour',
  p_threshold integer default 60
)
returns table (device_hash text, station_id integer, registrations bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.device_hash,
    s.polling_station_id as station_id,
    count(*) as registrations
  from supporters s
  where s.created_at > now() - p_window
    and s.device_hash is not null
  group by s.device_hash, s.polling_station_id
  having count(*) >= p_threshold;
$$;

revoke all on function detect_volume_anomalies(interval, integer) from public, anon;

-- Referral attribution: resolve a code to the supporter who owns it.
create or replace function resolve_referral_code(p_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from supporters
  where referral_code = upper(btrim(p_code))
    and verification_status in ('otp_verified', 'agent_verified')
  limit 1;
$$;

revoke all on function resolve_referral_code(text) from public, anon;
