-- 0001_extensions_and_enums.sql
-- Akiyar — Turkana Senate supporter register
-- Base extensions and shared enum types.

create extension if not exists "pgcrypto";   -- gen_random_uuid(), digest()
create extension if not exists "pg_trgm";    -- fuzzy name matching for duplicate review
create extension if not exists "citext";     -- case-insensitive text

-- How a supporter reached the register.
do $$ begin
  create type registration_channel as enum ('web', 'agent_offline', 'ussd', 'sms');
exception when duplicate_object then null; end $$;

-- Verification tier. Only 'otp_verified' and 'agent_verified' are ever counted
-- in a public-facing or client-facing number.
do $$ begin
  create type verification_status as enum (
    'unverified',      -- record created, code not yet entered
    'otp_verified',    -- phone answered back. the number we quote.
    'agent_verified',  -- a named agent vouched in person
    'flagged',         -- integrity queue: needs a human decision
    'duplicate',       -- resolved as a duplicate of another record
    'withdrawn'        -- supporter exercised their DPA erasure right
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type supporter_gender as enum ('female', 'male', 'other', 'undisclosed');
exception when duplicate_object then null; end $$;

-- Roles inside the campaign organisation.
do $$ begin
  create type staff_role as enum (
    'admin',              -- full county view, integrity decisions, exports
    'county_coordinator', -- full read, no destructive actions
    'ward_agent'          -- scoped to assigned wards only
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type integrity_flag_kind as enum (
    'possible_duplicate',
    'volume_anomaly',
    'exceeds_denominator',
    'invalid_phone',
    'manual_review'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type integrity_flag_state as enum ('open', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;
