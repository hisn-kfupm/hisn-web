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

-- Seed data (A-6) -----------------------------------------------------------------------------------------------
-- Fake data covering every event state. Ids match tests/fixtures/seed.ts. All times are relative to now(), so the
-- seed never goes stale. Runs as postgres after the migrations (row-level security does not apply).

-- Users: the admin and u01–u30 (SEED.admin, SEED.user(n)).
insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000a1', 'admin@test.local');

insert into auth.users (id, email)
select ('00000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || lpad(n::text, 2, '0') || '@test.local'
from generate_series(1, 30) as n;

-- Profiles. Majors follow data/majors.json order: u01–u30 (except u10, u20, u30, which are OTHER) take the first 27
-- non-OTHER codes and the admin takes the 28th (TRANS), so every code appears (owner decision). Levels cycle
-- BACHELOR, MASTER, PHD; gender alternates male/female; odd numbers opt in to announcements; users whose number is
-- divisible by 4 read English (A-19). The admin is Arabic and opted out.
insert into public.profiles (id, email, full_name_ar, major_code, major_other, academic_level_code, gender,
                             announcements_opt_in, locale, is_admin)
values ('00000000-0000-4000-8000-0000000000a1', 'admin@test.local', 'مدير تجريبي', 'TRANS', null, 'BACHELOR', 'male',
        false, 'ar', true);

insert into public.profiles (id, email, full_name_ar, major_code, major_other, academic_level_code, gender,
                             announcements_opt_in, locale)
select ('00000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       'u' || lpad(n::text, 2, '0') || '@test.local',
       'مستخدم ' || lpad(n::text, 2, '0'),
       case when n % 10 = 0 then 'OTHER'
            else (array['EE', 'ME', 'AE', 'CE', 'IE', 'CIE', 'MATE', 'CHE', 'MARE', 'CIVE', 'PHYS', 'CHEM', 'MATH',
                        'STAT', 'CS', 'SWE', 'SEC', 'AIDS', 'IS', 'BA', 'SCM', 'FIN', 'ACC', 'ECON', 'HR', 'LAW', 'IRPS',
                        'TRANS'])[n - n / 10] end,
       case n when 10 then 'Mechanical Engineering' when 20 then 'Physics' when 30 then 'Law' end,
       (array['BACHELOR', 'MASTER', 'PHD'])[(n - 1) % 3 + 1],
       case when n % 2 = 1 then 'male' else 'female' end,
       n % 2 = 1,
       case when n % 4 = 0 then 'en' else 'ar' end
from generate_series(1, 30) as n;

-- Events 101–110 (SEED.events), each at 18:00 Riyadh time on its day, ending two hours later. Registration closes
-- at the start, except 108 (closed an hour ago). Departments follow data/departments.json order. Events 101, 102 and
-- 110 have English text; the others show their Arabic text on /en (A-19).
insert into public.events (id, title, description, title_en, description_en, department_code, starts_at, ends_at,
                           format, location, capacity, registration_closes_at, status, recording_url)
overriding system value
select e.id,
       'فعالية تجريبية ' || e.id,
       'وصف تجريبي للفعالية ' || e.id,
       case when e.english then 'Test event ' || e.id end,
       case when e.english then 'Test description for event ' || e.id end,
       e.dept,
       s.starts,
       s.starts + interval '2 hours',
       e.format,
       case when e.format = 'in_person' then 'قاعة 1' end,
       e.capacity,
       coalesce(e.closes, s.starts),
       e.status,
       e.recording
from (values
  (101, 'published', 7,   'in_person', 'SECTOR_AWARENESS',     30,   null,                           null::timestamptz,          true),
  (102, 'published', 10,  'online',    'CAREER_READINESS',     10,   null,                           null,                       true),
  (103, 'published', 14,  'in_person', 'SYSTEMS_INTEGRATION',  null, null,                           null,                       false),
  (104, 'draft',     5,   'in_person', 'SECTOR_AWARENESS',     20,   null,                           null,                       false),
  (105, 'cancelled', 6,   'in_person', 'CAREER_READINESS',     20,   null,                           null,                       false),
  (106, 'published', -7,  'in_person', 'SECTOR_AWARENESS',     30,   'https://youtu.be/dQw4w9WgXcQ', null,                       false),
  (107, 'published', -3,  'online',    'CYBERSECURITY',        30,   null,                           null,                       false),
  (108, 'published', 2,   'in_person', 'MANUFACTURING_DESIGN', 30,   null,                           now() - interval '1 hour',  false),
  (109, 'published', 3,   'in_person', 'CYBERSECURITY',        30,   null,                           null,                       false),
  (110, 'published', 4,   'online',    'DATA_ANALYSIS',        50,   null,                           null,                       true)
) as e(id, status, days, format, dept, capacity, recording, closes, english)
cross join lateral (
  select ((date_trunc('day', now() at time zone 'Asia/Riyadh') + make_interval(days => e.days) + interval '18 hours')
          at time zone 'Asia/Riyadh') as starts
) as s;

-- Meeting links for the online events.
insert into public.event_private (event_id, meeting_url)
select id, 'https://meet.example/' || id from public.events where format = 'online';

-- New events get ids past the seed's.
select setval(pg_get_serial_sequence('public.events', 'id'), 1000);

-- Registrations, filled from u01 upward. Event 102's waitlist is u11, u12, u13, in that order.
insert into public.registrations (event_id, user_id, status, waitlisted_at)
select r.event_id,
       ('00000000-0000-4000-8000-0000000000' || lpad(u::text, 2, '0'))::uuid,
       r.status,
       case when r.status = 'waitlisted' then now() - make_interval(mins => 100 - u) end
from (values
  (101, 1, 5,   'registered'),
  (102, 1, 10,  'registered'),
  (102, 11, 13, 'waitlisted'),
  (103, 1, 2,   'registered'),
  (105, 1, 2,   'registered'),
  (108, 1, 1,   'registered'),
  (109, 1, 25,  'registered')
) as r(event_id, first_user, last_user, status)
cross join lateral generate_series(r.first_user, r.last_user) as u;

-- Newsletter signups: s01–s10 (s05 reads English) and u02, all from the footer.
insert into public.signups (email, source, locale)
select 's' || lpad(n::text, 2, '0') || '@signup.test', 'footer', case when n = 5 then 'en' else 'ar' end
from generate_series(1, 10) as n;

insert into public.signups (email, source, locale) values ('u02@test.local', 'footer', 'ar');

-- Unsubscribes (stored normalized, as the A-3 check requires).
insert into public.email_unsubscribes (email, source) values
  ('u03@test.local', 'link'),
  ('s02@signup.test', 'header'),
  ('nobody@test.local', 'profile');
