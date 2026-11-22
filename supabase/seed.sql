-- Local and CI only (supabase db reset). Never applied to hisn-dev, hisn-prod or hisn-talent.

-- tests schema: helpers for pgTAP and database tests (A-4) ------------------------------------------------------
-- Never put this schema in a migration.

create schema tests;

-- Data helpers: SECURITY DEFINER, owned by postgres, so they work while a test is logged in as anon or a user
-- (row-level security would otherwise block them).

create function tests.create_user(p_email text, p_with_profile boolean default true, p_is_admin boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (v_id, p_email);
  if p_with_profile then
    insert into public.profiles (id, email, full_name_ar, major_code, academic_level_code, gender, is_admin)
    values (v_id, p_email, 'مستخدم تجريبي', 'EE', 'BACHELOR', 'male', p_is_admin);
  end if;
  return v_id;
end;
$$;

create function tests.create_event(
  p_capacity int default null,
  p_status text default 'published',
  p_starts_in interval default '7 days',
  p_closes_in interval default null,
  p_format text default 'in_person'
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id bigint;
begin
  insert into public.events (title, description, starts_at, ends_at, format, location, capacity,
                             registration_closes_at, status)
  values ('فعالية تجريبية', 'وصف تجريبي', now() + p_starts_in, now() + p_starts_in + interval '2 hours', p_format,
          case when p_format = 'in_person' then 'قاعة 1' end, p_capacity,
          now() + coalesce(p_closes_in, p_starts_in), p_status)
  returning id into v_id;

  if p_format = 'online' then
    insert into public.event_private (event_id, meeting_url) values (v_id, 'https://meet.example/' || v_id);
  end if;

  return v_id;
end;
$$;

create function tests.add_registration(p_user uuid, p_event bigint, p_status text default 'registered')
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id bigint;
begin
  insert into public.registrations (event_id, user_id, status, waitlisted_at, cancelled_at)
  values (p_event, p_user, p_status,
          case when p_status = 'waitlisted' then clock_timestamp() end,
          case when p_status = 'cancelled' then clock_timestamp() end)
  returning id into v_id;
  return v_id;
end;
$$;

create function tests._user_email(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select email from auth.users where id = p_user
$$;

alter function tests.create_user(text, boolean, boolean) owner to postgres;
alter function tests.create_event(int, text, interval, interval, text) owner to postgres;
alter function tests.add_registration(uuid, bigint, text) owner to postgres;
alter function tests._user_email(uuid) owner to postgres;

-- Role helpers: SECURITY INVOKER (must not be definer: Postgres refuses to change "role" inside a
-- security-definer function).

create function tests.login_as(p_user uuid)
returns void
language plpgsql
as $$
declare
  v_email text := tests._user_email(p_user);
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', p_user, 'email', v_email, 'role', 'authenticated')::text, true);
end;
$$;

create function tests.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end;
$$;

-- Back to postgres (allowed because the session user is postgres). Claims are cleared so auth.uid() is null.
create function tests.logout()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;
