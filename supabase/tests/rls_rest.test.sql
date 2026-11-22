-- A-5 · Access to signups, email_unsubscribes, email_deliveries, talent_submission_log, and newsletter_signup().
-- Ids are kept in transaction-local settings (t.*) so they can be read under any role.
begin;
select plan(28);

-- Fixtures (as postgres) ----------------------------------------------------------------------------------------
do $$
begin
  perform set_config('t.a',     tests.create_user('a@rls-rest.test')::text, true);
  perform set_config('t.b',     tests.create_user('b@rls-rest.test')::text, true);
  perform set_config('t.admin', tests.create_user('admin@rls-rest.test', true, true)::text, true);
  perform set_config('t.p',     tests.create_user('p@x.com')::text, true);

  -- p@x.com has opted out; announcements_updated_at is set in the past so any change to it is visible
  update public.profiles
     set announcements_opt_in = false, announcements_updated_at = '2000-01-01T00:00:00Z'
   where id = current_setting('t.p')::uuid;

  insert into public.email_unsubscribes (email, source) values ('ali@x.com', 'link');
  insert into public.email_deliveries (kind, email) values ('announcement', 'a@rls-rest.test');

  insert into public.talent_submission_log (user_id, submitted_at) values
    (current_setting('t.a')::uuid, now()),
    (current_setting('t.b')::uuid, now());
end
$$;

-- signups: no direct access ---------------------------------------------------------------------------------------
select tests.login_anon();

select throws_ok(
  $$insert into public.signups (email, source) values ('direct@x.com', 'footer')$$,
  '42501',
  'permission denied for table signups',
  'anon cannot insert into signups directly'
);

select throws_ok(
  $$select * from public.signups$$,
  '42501',
  'permission denied for table signups',
  'anon cannot select from signups'
);

-- signups: unique on lower(trim(email)), as postgres ------------------------------------------------------------
select tests.logout();

insert into public.signups (email, source) values ('Ali@x.com', 'footer');

select throws_ok(
  $$insert into public.signups (email, source) values ('ali@x.com ', 'footer')$$,
  '23505',
  null,
  'signups rejects an address differing only in case and trailing space'
);

delete from public.signups where lower(trim(email)) = 'ali@x.com';

-- newsletter_signup never touches email_unsubscribes ---------------------------------------------------------------
select tests.login_anon();
select lives_ok($$select public.newsletter_signup(' Ali@x.com')$$, 'newsletter_signup('' Ali@x.com'') succeeds');

select tests.logout();
select is(
  (select count(*) from public.signups where email = 'ali@x.com'),
  1::bigint,
  'exactly one normalized signups row for ali@x.com'
);
select is(
  (select count(*) from public.email_unsubscribes where email = 'ali@x.com'),
  1::bigint,
  'the unsubscribe row for ali@x.com is still present'
);

select tests.login_anon();
select lives_ok($$select public.newsletter_signup(' Ali@x.com')$$, 'calling newsletter_signup again does not error');

select tests.logout();
select is(
  (select count(*) from public.signups where email = 'ali@x.com'),
  1::bigint,
  'still exactly one signups row for ali@x.com'
);
select is(
  (select count(*) from public.email_unsubscribes where email = 'ali@x.com'),
  1::bigint,
  'the unsubscribe row for ali@x.com is still present after the second call'
);

-- email_unsubscribes, email_deliveries: unreadable ----------------------------------------------------------------
select tests.login_anon();
select is((select count(*) from public.email_unsubscribes), 0::bigint, 'anon sees no email_unsubscribes rows');
select is((select count(*) from public.email_deliveries), 0::bigint, 'anon sees no email_deliveries rows');

select tests.login_as(current_setting('t.a')::uuid);
select is((select count(*) from public.email_unsubscribes), 0::bigint, 'a user sees no email_unsubscribes rows');
select is((select count(*) from public.email_deliveries), 0::bigint, 'a user sees no email_deliveries rows');

-- talent_submission_log: own row only, and no admin access -------------------------------------------------------
select is(
  (select array_agg(user_id) from public.talent_submission_log),
  array[current_setting('t.a')::uuid],
  'user A sees only their own talent_submission_log row'
);

select tests.login_as(current_setting('t.admin')::uuid);
select is((select count(*) from public.talent_submission_log), 0::bigint, 'admin sees no talent_submission_log rows');

-- newsletter_signup: input validation, as anon -------------------------------------------------------------------
select tests.login_anon();

select throws_ok(
  $$select public.newsletter_signup('not-an-email')$$,
  '22023',
  'invalid_email',
  'newsletter_signup rejects not-an-email'
);
select throws_ok(
  $$select public.newsletter_signup('a@b')$$,
  '22023',
  'invalid_email',
  'newsletter_signup rejects a@b'
);
select throws_ok(
  $$select public.newsletter_signup('a@b.com', 'evil')$$,
  '22023',
  'invalid_source',
  'newsletter_signup rejects source evil'
);
select throws_ok(
  $$select public.newsletter_signup('a@b.com', null)$$,
  '22023',
  'invalid_source',
  'newsletter_signup rejects a null source'
);
select lives_ok(
  $$select public.newsletter_signup('ok@x.com', 'teaser')$$,
  'newsletter_signup accepts ok@x.com from the teaser'
);

select tests.logout();
select is(
  (select source from public.signups where email = 'ok@x.com'),
  'teaser',
  'the ok@x.com signups row has source teaser'
);

-- newsletter_signup never touches profiles ------------------------------------------------------------------------
select tests.login_anon();
select lives_ok($$select public.newsletter_signup('P@x.com')$$, 'newsletter_signup(''P@x.com'') succeeds');

select tests.logout();
select is(
  (select announcements_opt_in from public.profiles where id = current_setting('t.p')::uuid),
  false,
  'p@x.com is still opted out after newsletter_signup'
);
select is(
  (select announcements_updated_at from public.profiles where id = current_setting('t.p')::uuid),
  '2000-01-01T00:00:00Z'::timestamptz,
  'p@x.com announcements_updated_at is unchanged'
);

-- email_unsubscribes stores normalized emails only ---------------------------------------------------------------
select throws_ok(
  $$insert into public.email_unsubscribes (email, source) values ('A@X.com', 'link')$$,
  '23514',
  null,
  'email_unsubscribes rejects a non-normalized email'
);

-- Server-only tables: no write privileges for users --------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);

select throws_ok(
  $$insert into public.email_unsubscribes (email, source) values ('a@rls-rest.test', 'profile')$$,
  '42501',
  'permission denied for table email_unsubscribes',
  'a user cannot insert into email_unsubscribes'
);
select throws_ok(
  $$insert into public.email_deliveries (kind, email) values ('announcement', 'a@rls-rest.test')$$,
  '42501',
  'permission denied for table email_deliveries',
  'a user cannot insert into email_deliveries'
);
select throws_ok(
  $$insert into public.talent_submission_log (user_id, submitted_at) values (current_setting('t.a')::uuid, now())$$,
  '42501',
  'permission denied for table talent_submission_log',
  'a user cannot insert into talent_submission_log'
);

select tests.logout();

select * from finish();
rollback;
