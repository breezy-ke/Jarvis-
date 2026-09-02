-- 0002_geography.sql
-- Two parallel hierarchies, deliberately kept separate.
--
--   ELECTORAL (IEBC)  county > constituency > ward > polling_station
--     This is the only chain along which votes are actually tallied.
--
--   ADMINISTRATIVE    county > sub_county > location > sub_location
--     This is the chain chiefs and assistant chiefs work in, and it is how
--     the ground team convenes a baraza.
--
-- A supporter is pinned to a leaf in BOTH. Collecting only one of them makes
-- half the questions the campaign needs to ask unanswerable.
--
-- Everything in this file is reference data imported from the IEBC register.
-- It is read-only to the application; see 0006_rls_policies.sql.

-- ---------------------------------------------------------------- electoral

create table if not exists constituencies (
  id            smallint primary key,
  iebc_code     text not null unique,
  name          text not null unique,
  county_code   text not null default '023',
  county_name   text not null default 'Turkana'
);

create table if not exists wards (
  id                smallint primary key,
  constituency_id   smallint not null references constituencies(id) on delete restrict,
  iebc_code         text not null unique,
  name              text not null,
  unique (constituency_id, name)
);

create index if not exists wards_constituency_idx on wards (constituency_id);

create table if not exists polling_stations (
  id                 integer primary key,
  ward_id            smallint not null references wards(id) on delete restrict,
  iebc_code          text not null unique,
  name               text not null,

  -- The denominator. Every saturation figure in the product divides by this,
  -- so it must come from the IEBC register and never be estimated.
  registered_voters  integer not null check (registered_voters > 0),

  -- Which register edition the count above came from, so a refresh is auditable.
  register_edition   text not null default '2022-general',

  unique (ward_id, name)
);

create index if not exists polling_stations_ward_idx on polling_stations (ward_id);

-- ---------------------------------------------------------- administrative

create table if not exists sub_counties (
  id      smallint primary key,
  name    text not null unique
);

create table if not exists locations (
  id             smallint primary key,
  sub_county_id  smallint not null references sub_counties(id) on delete restrict,
  name           text not null,
  unique (sub_county_id, name)
);

create index if not exists locations_sub_county_idx on locations (sub_county_id);

create table if not exists sub_locations (
  id           integer primary key,
  location_id  smallint not null references locations(id) on delete restrict,
  name         text not null,
  unique (location_id, name)
);

create index if not exists sub_locations_location_idx on sub_locations (location_id);

-- The two hierarchies cross-cut rather than nest: one ward can span several
-- sub-locations and one sub-location can fall across two wards. This table
-- carries that relationship instead of pretending it is a tree.
create table if not exists ward_sub_locations (
  ward_id          smallint not null references wards(id) on delete cascade,
  sub_location_id  integer  not null references sub_locations(id) on delete cascade,
  primary key (ward_id, sub_location_id)
);

create index if not exists ward_sub_locations_sub_location_idx
  on ward_sub_locations (sub_location_id);

comment on table polling_stations is
  'IEBC reference data. registered_voters is the saturation denominator — import it, never type it.';
comment on table ward_sub_locations is
  'Electoral wards and administrative sub-locations overlap; this is a many-to-many, not a hierarchy.';
