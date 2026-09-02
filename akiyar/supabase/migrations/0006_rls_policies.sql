-- 0006_rls_policies.sql
-- Row level security.
--
-- Posture: the browser is never trusted with the register. Public traffic can
-- read reference geography (the signup form needs it) and nothing else.
-- Writes to `supporters` go through server actions holding the service role,
-- which bypasses RLS — these policies are the second line of defence for the
-- day a key is misconfigured or an anon client is pointed at the project.

-- --------------------------------------------------------------- helpers

-- SECURITY DEFINER so that a policy on `staff` can read `staff` without
-- recursing into its own policy.
create or replace function auth_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from staff where id = auth.uid() and is_active;
$$;

create or replace function auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff
    where id = auth.uid() and is_active and role = 'admin'
  );
$$;

create or replace function auth_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from staff where id = auth.uid() and is_active);
$$;

-- Wards an agent may see. Admins and county coordinators see all wards.
create or replace function auth_visible_ward_ids()
returns smallint[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when role in ('admin','county_coordinator')
      then (select coalesce(array_agg(id), '{}') from wards)
    else ward_ids
  end
  from staff
  where id = auth.uid() and is_active;
$$;

-- ------------------------------------------------- reference data: public read

alter table constituencies      enable row level security;
alter table wards               enable row level security;
alter table polling_stations    enable row level security;
alter table sub_counties        enable row level security;
alter table locations           enable row level security;
alter table sub_locations       enable row level security;
alter table ward_sub_locations  enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'constituencies','wards','polling_stations',
    'sub_counties','locations','sub_locations','ward_sub_locations'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_public_read', t);
    execute format(
      'create policy %I on %I for select to anon, authenticated using (true)',
      t || '_public_read', t
    );
  end loop;
end $$;

-- No insert/update/delete policies exist for reference tables, so no client
-- role can write them. Imports run through the service role.

-- ------------------------------------------------------------ staff

alter table staff enable row level security;

drop policy if exists staff_read_self on staff;
create policy staff_read_self on staff
  for select to authenticated
  using (id = auth.uid() or auth_is_admin());

drop policy if exists staff_admin_write on staff;
create policy staff_admin_write on staff
  for all to authenticated
  using (auth_is_admin())
  with check (auth_is_admin());

-- ------------------------------------------------------- supporters

alter table supporters enable row level security;

-- Deliberately no policy for `anon`. The public cannot read the register at all,
-- not even their own row — the signup flow returns what it needs from the
-- server action rather than letting the browser query this table.

drop policy if exists supporters_staff_read on supporters;
create policy supporters_staff_read on supporters
  for select to authenticated
  using (
    auth_is_staff()
    and ward_id = any (auth_visible_ward_ids())
  );

-- Only admins may change a supporter record from a client session, and even
-- then the application routes these through server actions so they are logged.
drop policy if exists supporters_admin_update on supporters;
create policy supporters_admin_update on supporters
  for update to authenticated
  using (auth_is_admin())
  with check (auth_is_admin());

-- ------------------------------------------------------ otp_challenges

alter table otp_challenges enable row level security;
-- No policies at all: unreachable from anon and authenticated alike.
-- Only the service role touches this table.

-- ------------------------------------------------------ integrity_flags

alter table integrity_flags enable row level security;

drop policy if exists integrity_flags_staff_read on integrity_flags;
create policy integrity_flags_staff_read on integrity_flags
  for select to authenticated
  using (auth_is_staff());

drop policy if exists integrity_flags_admin_resolve on integrity_flags;
create policy integrity_flags_admin_resolve on integrity_flags
  for update to authenticated
  using (auth_is_admin())
  with check (auth_is_admin());

-- ----------------------------------------------------------- audit_log

alter table audit_log enable row level security;

drop policy if exists audit_log_admin_read on audit_log;
create policy audit_log_admin_read on audit_log
  for select to authenticated
  using (auth_is_admin());

-- No insert policy: writes come from the service role inside server actions.
-- Update/delete are additionally blocked by trigger in 0004.

-- --------------------------------------------------------------- views

-- Postgres runs views as their owner by default, which would let a view read
-- straight past the policies above. Force them to run as the caller so the
-- supporter policies actually apply to dashboard queries.
alter view verified_supporters   set (security_invoker = true);
alter view station_saturation    set (security_invoker = true);
alter view ward_saturation       set (security_invoker = true);
alter view ward_momentum_weekly  set (security_invoker = true);
alter view county_summary        set (security_invoker = true);
