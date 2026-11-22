-- A-4 · Row-level security for profiles, events, event_private, registrations, and the tests.* helpers.
-- Ids are kept in transaction-local settings (t.*) so they can be read under any role.
begin;
select plan(26);

-- Fixtures (as postgres) ----------------------------------------------------------------------------------------
do $$
begin
  perform set_config('t.u',     tests.create_user('noprofile@rls.test', false)::text, true);
  perform set_config('t.a',     tests.create_user('a@rls.test')::text, true);
  perform set_config('t.b',     tests.create_user('b@rls.test')::text, true);
  perform set_config('t.admin', tests.create_user('admin@rls.test', true, true)::text, true);

  perform set_config('t.draft',     tests.create_event(p_status => 'draft')::text, true);
  perform set_config('t.published', tests.create_event()::text, true);
  perform set_config('t.cancelled', tests.create_event(p_status => 'cancelled')::text, true);
  perform set_config('t.online',    tests.create_event(p_format => 'online')::text, true);
  perform set_config('t.free',      tests.create_event()::text, true);

  perform tests.add_registration(current_setting('t.a')::uuid, current_setting('t.published')::bigint);
  perform tests.add_registration(current_setting('t.a')::uuid, current_setting('t.online')::bigint);
  perform tests.add_registration(current_setting('t.b')::uuid, current_setting('t.published')::bigint);
end
$$;

-- profiles: insert own row ------------------------------------------------------------------------------------
select tests.login_as(current_setting('t.u')::uuid);

select throws_ok(
  $$insert into public.profiles (id, email, full_name_ar, major_code, academic_level_code, gender, is_admin)
    values (current_setting('t.u')::uuid, 'noprofile@rls.test', 'مستخدم تجريبي', 'EE', 'BACHELOR', 'male', true)$$,
  '42501',
  'permission denied for table profiles',
  'a user cannot insert own profile with is_admin = true'
);

select throws_ok(
  $$insert into public.profiles (id, email, full_name_ar, major_code, academic_level_code, gender)
    values (current_setting('t.u')::uuid, 'someone-else@rls.test', 'مستخدم تجريبي', 'EE', 'BACHELOR', 'male')$$,
  '42501',
  'new row violates row-level security policy for table "profiles"',
  'a user cannot insert a profile whose email differs from the JWT email'
);

-- control: the same insert with the JWT email works, so the two failures above are for the stated reasons
select lives_ok(
  $$insert into public.profiles (id, email, full_name_ar, major_code, academic_level_code, gender)
    values (current_setting('t.u')::uuid, 'noprofile@rls.test', 'مستخدم تجريبي', 'EE', 'BACHELOR', 'male')$$,
  'a user can insert own profile with the JWT email'
);

-- profiles: update own row ------------------------------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);

select throws_ok(
  $$update public.profiles set is_admin = true where id = current_setting('t.a')::uuid$$,
  '42501',
  'permission denied for table profiles',
  'a user cannot set is_admin on own profile'
);

select throws_ok(
  $$update public.profiles set email = 'x@y.com' where id = current_setting('t.a')::uuid$$,
  '42501',
  'permission denied for table profiles',
  'a user cannot change own email'
);

-- control: an allowed column can be updated
select lives_ok(
  $$update public.profiles set full_name_ar = 'اسم جديد' where id = current_setting('t.a')::uuid$$,
  'a user can update full_name_ar on own profile'
);

-- profiles: select ----------------------------------------------------------------------------------------------
select is(
  (select count(*) from public.profiles where id = current_setting('t.b')::uuid),
  0::bigint,
  'user A cannot see user B''s profile'
);

-- expected totals, counted as postgres
select tests.logout();
do $$
begin
  perform set_config('t.profiles_total', (select count(*) from public.profiles)::text, true);
  perform set_config('t.registrations_total', (select count(*) from public.registrations)::text, true);
end
$$;

select tests.login_as(current_setting('t.admin')::uuid);

select is(
  (select count(*) from public.profiles),
  current_setting('t.profiles_total')::bigint,
  'admin sees all profiles'
);

-- event_private -------------------------------------------------------------------------------------------------
select tests.login_anon();
select is((select count(*) from public.event_private), 0::bigint, 'anon sees no event_private rows');

select tests.login_as(current_setting('t.a')::uuid);
select is((select count(*) from public.event_private), 0::bigint, 'a non-admin user sees no event_private rows');

select tests.login_as(current_setting('t.admin')::uuid);
select is(
  (select count(*) from public.event_private where event_id = current_setting('t.online')::bigint),
  1::bigint,
  'admin sees the event_private row'
);

-- events: visibility ------------------------------------------------------------------------------------------
select tests.login_anon();
select is(
  (select count(*) from public.events where id = current_setting('t.draft')::bigint),
  0::bigint,
  'anon cannot see a draft event'
);
select is(
  (select count(*) from public.events where id = current_setting('t.published')::bigint),
  1::bigint,
  'anon sees a published event'
);
select is(
  (select count(*) from public.events where id = current_setting('t.cancelled')::bigint),
  1::bigint,
  'anon sees a cancelled event'
);

select tests.login_as(current_setting('t.admin')::uuid);
select is(
  (select count(*) from public.events where id = current_setting('t.draft')::bigint),
  1::bigint,
  'admin sees a draft event'
);

-- registrations: visibility -------------------------------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);
select is(
  (select count(*) from public.registrations where user_id <> current_setting('t.a')::uuid),
  0::bigint,
  'user A sees no other user''s registrations'
);
select is(
  (select count(*) from public.registrations where user_id = current_setting('t.a')::uuid),
  2::bigint,
  'user A sees own registrations'
);

select tests.login_as(current_setting('t.admin')::uuid);
select is(
  (select count(*) from public.registrations),
  current_setting('t.registrations_total')::bigint,
  'admin sees all registrations'
);

-- events: writes ------------------------------------------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);
select throws_ok(
  $$insert into public.events (title, description, starts_at, ends_at, format, location, registration_closes_at)
    values ('t', 'd', now() + interval '7 days', now() + interval '7 days 2 hours', 'in_person', 'قاعة 1', now() + interval '7 days')$$,
  '42501',
  'new row violates row-level security policy for table "events"',
  'a non-admin user cannot insert an event'
);

select tests.login_as(current_setting('t.admin')::uuid);
select lives_ok(
  $$insert into public.events (title, description, starts_at, ends_at, format, location, registration_closes_at)
    values ('t', 'd', now() + interval '7 days', now() + interval '7 days 2 hours', 'in_person', 'قاعة 1', now() + interval '7 days')$$,
  'admin can insert an event'
);

-- registrations: no direct writes -------------------------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);
select throws_ok(
  $$insert into public.registrations (event_id, user_id, status)
    values (current_setting('t.free')::bigint, current_setting('t.a')::uuid, 'registered')$$,
  '42501',
  null,
  'a user cannot insert a registration directly'
);

-- tests.* helpers work while logged in ---------------------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);

select lives_ok(
  $$select tests.create_user('helper@test.local')$$,
  'tests.create_user works while logged in as a user'
);
select lives_ok(
  $$select tests.add_registration(current_setting('t.a')::uuid, current_setting('t.free')::bigint)$$,
  'tests.add_registration works while logged in as a user'
);
select lives_ok(
  $$select tests.login_as(current_setting('t.b')::uuid)$$,
  'tests.login_as works while already logged in'
);
select is(auth.uid(), current_setting('t.b')::uuid, 'after login_as(B), auth.uid() = B');

select tests.logout();
select is(auth.uid(), null, 'after logout, auth.uid() is null');

select * from finish();
rollback;
