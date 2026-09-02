-- 0003_supporters_and_staff.sql
-- The register itself, plus the campaign staff who operate it.

-- ------------------------------------------------------------------- staff

-- Mirrors auth.users with a campaign role. Supabase auth holds credentials;
-- this holds authorisation.
create table if not exists staff (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  role         staff_role not null default 'ward_agent',
  -- Only meaningful for ward_agent. Empty means "no wards yet", not "all wards".
  ward_ids     smallint[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists staff_role_idx on staff (role) where is_active;

-- -------------------------------------------------------------- supporters

create table if not exists supporters (
  id                  uuid primary key default gen_random_uuid(),

  full_name           text not null check (length(btrim(full_name)) between 3 and 120),

  -- Stored E.164 (+2547XXXXXXXX). Unique across the register: one person,
  -- one number. This single constraint is the cheapest integrity win available.
  phone               text not null unique
                        check (phone ~ '^\+254[17][0-9]{8}$'),

  -- Last four digits of the national ID only. Enough to disambiguate two people
  -- with the same name in the same sub-location; useless to an attacker who
  -- gets the table. Never store the full number.
  national_id_last4   text check (national_id_last4 ~ '^[0-9]{4}$'),

  gender              supporter_gender not null default 'undisclosed',
  -- Year rather than full date of birth: enough for age-band analysis,
  -- one less identifying field to hold.
  year_of_birth       smallint check (year_of_birth between 1920 and extract(year from now())::int - 17),

  -- Electoral pin (where the vote is cast and counted)
  ward_id             smallint not null references wards(id) on delete restrict,
  polling_station_id  integer  not null references polling_stations(id) on delete restrict,

  -- Administrative pin (where the person is organised and mobilised)
  sub_location_id     integer  not null references sub_locations(id) on delete restrict,
  village             text check (village is null or length(btrim(village)) <= 80),

  verification_status verification_status not null default 'unverified',
  verified_at         timestamptz,
  channel             registration_channel not null default 'web',

  -- Growth loop
  referral_code       text not null unique,
  referred_by         uuid references supporters(id) on delete set null,

  -- Which agent captured this record, when it came in through a field device.
  captured_by         uuid references staff(id) on delete set null,

  -- Data Protection Act 2019 audit trail. Consent to be on the register and
  -- consent to receive SMS are separate purposes and are recorded separately.
  consent_register     boolean not null default false check (consent_register),
  consent_sms          boolean not null default false,
  consent_version      text not null,
  consent_at           timestamptz not null default now(),

  -- Coarse provenance for abuse detection. Hashed, never raw.
  ip_hash             text,
  device_hash         text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- A supporter must vote at a station inside the ward they selected.
  -- Enforced for real by a trigger below, since a CHECK cannot reach another table.
  constraint supporters_verified_has_timestamp
    check (
      (verification_status in ('otp_verified','agent_verified')) = (verified_at is not null)
    )
);

create index if not exists supporters_ward_idx    on supporters (ward_id);
create index if not exists supporters_station_idx on supporters (polling_station_id);
create index if not exists supporters_sub_loc_idx on supporters (sub_location_id);
create index if not exists supporters_status_idx  on supporters (verification_status);
create index if not exists supporters_created_idx on supporters (created_at desc);
create index if not exists supporters_referrer_idx on supporters (referred_by) where referred_by is not null;

-- Verified-only counting is the default read pattern; give it its own index.
create index if not exists supporters_verified_station_idx
  on supporters (polling_station_id)
  where verification_status in ('otp_verified','agent_verified');

-- Fuzzy name search powers the duplicate review queue.
create index if not exists supporters_name_trgm_idx
  on supporters using gin (full_name gin_trgm_ops);

-- ------------------------------------------------------- integrity trigger

-- A polling station belongs to exactly one ward. If the submitted ward and the
-- submitted station disagree, every downstream saturation figure is quietly
-- wrong, so reject the row rather than store an inconsistency.
create or replace function assert_station_in_ward()
returns trigger
language plpgsql
as $$
declare
  station_ward smallint;
begin
  select ward_id into station_ward
  from polling_stations
  where id = new.polling_station_id;

  if station_ward is null then
    raise exception 'Unknown polling station %', new.polling_station_id
      using errcode = 'foreign_key_violation';
  end if;

  if station_ward <> new.ward_id then
    raise exception
      'Polling station % belongs to ward %, but the record claims ward %',
      new.polling_station_id, station_ward, new.ward_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists supporters_station_ward_check on supporters;
create trigger supporters_station_ward_check
  before insert or update of ward_id, polling_station_id on supporters
  for each row execute function assert_station_in_ward();

-- keep updated_at honest
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists supporters_touch_updated_at on supporters;
create trigger supporters_touch_updated_at
  before update on supporters
  for each row execute function touch_updated_at();

comment on column supporters.phone is
  'E.164, unique. The one-person-one-number rule; most of the register''s integrity rests here.';
comment on column supporters.national_id_last4 is
  'Last four digits only, by design. Full national ID numbers are never stored.';
comment on column supporters.consent_register is
  'CHECK forces true — a row cannot exist without consent to be on the register (DPA 2019).';
