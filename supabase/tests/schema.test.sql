-- A-3 · Core production tables (spec §9.1). Runs as postgres, so row-level security does not apply here.
begin;
select plan(20);

-- Tables
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'events', 'events exists');
select has_table('public', 'event_private', 'event_private exists');
select has_table('public', 'registrations', 'registrations exists');
select has_table('public', 'signups', 'signups exists');
select has_table('public', 'email_unsubscribes', 'email_unsubscribes exists');
select has_table('public', 'email_deliveries', 'email_deliveries exists');
select has_table('public', 'talent_submission_log', 'talent_submission_log exists');

-- Fixtures: auth users the profiles below point at
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a301', 'schema1@test.local'),
  ('00000000-0000-4000-8000-00000000a302', 'schema2@test.local');

-- profiles checks
select throws_ok(
  $$insert into public.profiles (id, email, full_name_ar, major_code, major_other, academic_level_code, gender)
    values ('00000000-0000-4000-8000-00000000a302', 'schema2@test.local', 'مستخدم تجريبي', 'OTHER', null, 'BACHELOR', 'male')$$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_major_other_chk"',
  'major_code OTHER with null major_other is rejected'
);

select throws_ok(
  $$insert into public.profiles (id, email, full_name_ar, major_code, major_other, academic_level_code, gender)
    values ('00000000-0000-4000-8000-00000000a302', 'schema2@test.local', 'مستخدم تجريبي', 'EE', 'x', 'BACHELOR', 'male')$$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_major_other_chk"',
  'a non-OTHER major_code with major_other set is rejected'
);

select throws_ok(
  $$insert into public.profiles (id, email, full_name_ar, major_code, major_other, academic_level_code, gender)
    values ('00000000-0000-4000-8000-00000000a302', 'schema2@test.local', 'مستخدم تجريبي', 'EE', null, 'BACHELOR', 'x')$$,
  '23514',
  null,
  'gender x is rejected'
);

select throws_ok(
  $$insert into public.profiles (id, email, full_name_ar, major_code, major_other, academic_level_code, gender)
    values ('00000000-0000-4000-8000-00000000a302', 'schema2@test.local', 'مستخدم تجريبي', 'EE', null, 'NOPE', 'male')$$,
  '23514',
  null,
  'academic_level_code NOPE is rejected'
);

-- events checks
select throws_ok(
  $$insert into public.events (title, description, starts_at, ends_at, format, location, registration_closes_at)
    values ('t', 'd', now() + interval '7 days', now() + interval '7 days', 'in_person', 'قاعة 1', now() + interval '7 days')$$,
  '23514',
  null,
  'an event with ends_at = starts_at is rejected'
);

select throws_ok(
  $$insert into public.events (title, description, starts_at, ends_at, format, location, capacity, registration_closes_at)
    values ('t', 'd', now() + interval '7 days', now() + interval '7 days 2 hours', 'in_person', 'قاعة 1', 0, now() + interval '7 days')$$,
  '23514',
  null,
  'an event with capacity 0 is rejected'
);

select throws_ok(
  $$insert into public.events (title, description, starts_at, ends_at, format, location, registration_closes_at)
    values ('t', 'd', now() + interval '7 days', now() + interval '7 days 2 hours', 'in_person', null, now() + interval '7 days')$$,
  '23514',
  null,
  'an in-person event without a location is rejected'
);

-- email_deliveries checks
select throws_ok(
  $$insert into public.email_deliveries (kind, email, status) values ('announcement', 'schema1@test.local', 'bogus')$$,
  '23514',
  null,
  'email_deliveries status bogus is rejected'
);

-- signups: unique on lower(trim(email))
insert into public.signups (email, source) values ('Ali@x.com', 'footer');

select throws_ok(
  $$insert into public.signups (email, source) values (' ali@x.com', 'footer')$$,
  '23505',
  null,
  'a signup differing only in case and surrounding spaces is rejected'
);

-- events: updated_at trigger
insert into public.events (title, description, starts_at, ends_at, format, location, registration_closes_at, updated_at)
values ('updated_at probe', 'd', now() + interval '7 days', now() + interval '7 days 2 hours', 'in_person', 'قاعة 1',
        now() + interval '7 days', '2000-01-01T00:00:00Z');

update public.events set title = 'updated_at probe (changed)' where title = 'updated_at probe';

select cmp_ok(
  (select updated_at from public.events where title = 'updated_at probe (changed)'),
  '>',
  '2000-01-01T00:00:00Z'::timestamptz,
  'updating an event bumps updated_at'
);

-- registrations
insert into public.profiles (id, email, full_name_ar, major_code, major_other, academic_level_code, gender)
values ('00000000-0000-4000-8000-00000000a301', 'schema1@test.local', 'مستخدم تجريبي', 'EE', null, 'BACHELOR', 'male');

insert into public.events (title, description, starts_at, ends_at, format, location, capacity, registration_closes_at)
values ('registration probe', 'd', now() + interval '7 days', now() + interval '7 days 2 hours', 'in_person', 'قاعة 1',
        30, now() + interval '7 days');

insert into public.registrations (event_id, user_id, status)
values ((select id from public.events where title = 'registration probe'),
        '00000000-0000-4000-8000-00000000a301', 'registered');

select is(
  (select registration_version from public.registrations
    where user_id = '00000000-0000-4000-8000-00000000a301'),
  1,
  'a new registration row has registration_version = 1'
);

select throws_ok(
  $$insert into public.registrations (event_id, user_id, status)
    values ((select id from public.events where title = 'registration probe'),
            '00000000-0000-4000-8000-00000000a301', 'registered')$$,
  '23505',
  null,
  'a second registration for the same (event_id, user_id) is rejected'
);

select * from finish();
rollback;
