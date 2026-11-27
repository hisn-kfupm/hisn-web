-- A-19 · Locale columns: profiles.locale (and its column grants), events.title_en/description_en,
-- signups.locale, email_deliveries.locale, and newsletter_signup(p_email, p_source, p_locale).
-- Ids are kept in transaction-local settings (t.*) so they can be read under any role.
begin;
select plan(23);

-- Fixtures (as postgres) ----------------------------------------------------------------------------------------
do $$
begin
  perform set_config('t.plain',  tests.create_user('plain@locale.test')::text, true);           -- profile, no locale given
  perform set_config('t.fr',     tests.create_user('fr@locale.test', false)::text, true);       -- no profile
  perform set_config('t.noprof', tests.create_user('noprofile@locale.test', false)::text, true); -- no profile
  perform set_config('t.withprof', tests.create_user('withprofile@locale.test')::text, true);   -- profile
end
$$;

-- profiles.locale -------------------------------------------------------------------------------------------------
select is(
  (select locale from public.profiles where id = current_setting('t.plain')::uuid),
  'ar',
  'a profile inserted without locale has locale ar'
);

select throws_ok(
  $$insert into public.profiles (id, email, full_name_ar, major_code, academic_level_code, gender, locale)
    values (current_setting('t.fr')::uuid, 'fr@locale.test', 'مستخدم تجريبي', 'EE', 'BACHELOR', 'male', 'fr')$$,
  '23514',
  null,
  'profiles.locale fr is rejected'
);

-- profiles.locale: column grants for authenticated ---------------------------------------------------------------
select tests.login_as(current_setting('t.noprof')::uuid);
select lives_ok(
  $$insert into public.profiles (id, email, full_name_ar, major_code, academic_level_code, gender, locale)
    values (current_setting('t.noprof')::uuid, 'noprofile@locale.test', 'مستخدم تجريبي', 'EE', 'BACHELOR', 'male', 'en')$$,
  'a user can insert own profile with locale en'
);

select tests.login_as(current_setting('t.withprof')::uuid);
select lives_ok(
  $$update public.profiles set locale = 'en' where id = current_setting('t.withprof')::uuid$$,
  'a user can update own profile locale'
);
select throws_ok(
  $$update public.profiles set is_admin = true where id = current_setting('t.withprof')::uuid$$,
  '42501',
  'permission denied for table profiles',
  'a user still cannot set is_admin'
);
select throws_ok(
  $$update public.profiles set email = 'x@y.com' where id = current_setting('t.withprof')::uuid$$,
  '42501',
  'permission denied for table profiles',
  'a user still cannot change own email'
);

select tests.logout();
select is(
  (select locale from public.profiles where id = current_setting('t.noprof')::uuid),
  'en',
  'the inserted profile kept locale en'
);
select is(
  (select locale from public.profiles where id = current_setting('t.withprof')::uuid),
  'en',
  'the update really changed locale to en'
);

-- events.title_en / description_en (optional) ---------------------------------------------------------------------
select lives_ok(
  $$insert into public.events (title, description, title_en, description_en, starts_at, ends_at, format, location, registration_closes_at)
    values ('t', 'd', null, null, now() + interval '7 days', now() + interval '7 days 2 hours', 'in_person', 'قاعة 1', now() + interval '7 days')$$,
  'an event without English text is accepted'
);
select lives_ok(
  $$insert into public.events (title, description, title_en, description_en, starts_at, ends_at, format, location, registration_closes_at)
    values ('t', 'd', 'Drone Day', 'An English description', now() + interval '7 days', now() + interval '7 days 2 hours', 'in_person', 'قاعة 1', now() + interval '7 days')$$,
  'an event with English title and description is accepted'
);

-- email_deliveries.locale -----------------------------------------------------------------------------------------
insert into public.email_deliveries (kind, email) values ('announcement', 'delivery@locale.test');
select is(
  (select locale from public.email_deliveries where email = 'delivery@locale.test'),
  'ar',
  'an email_deliveries row inserted without locale has locale ar'
);
select throws_ok(
  $$insert into public.email_deliveries (kind, email, locale) values ('announcement', 'fr@locale.test', 'fr')$$,
  '23514',
  null,
  'email_deliveries.locale fr is rejected'
);

-- signups.locale --------------------------------------------------------------------------------------------------
insert into public.signups (email, source) values ('plain-signup@locale.test', 'footer');
select is(
  (select locale from public.signups where email = 'plain-signup@locale.test'),
  'ar',
  'a signups row inserted without locale has locale ar'
);

-- newsletter_signup(p_email, p_source, p_locale), as anon ---------------------------------------------------------
select tests.login_anon();
select lives_ok($$select public.newsletter_signup('en@x.com', 'footer', 'en')$$, 'newsletter_signup with locale en succeeds');
select lives_ok($$select public.newsletter_signup('ar@x.com')$$, 'newsletter_signup with only an email succeeds');
select lives_ok(
  $$select public.newsletter_signup(p_email => 'n@x.com', p_source => 'teaser')$$,
  'the teaser''s named call (p_email, p_source) still works'
);
select throws_ok(
  $$select public.newsletter_signup('a@x.com', 'footer', 'fr')$$,
  '22023',
  'invalid_locale',
  'newsletter_signup rejects locale fr'
);
select throws_ok(
  $$select public.newsletter_signup('a@x.com', 'footer', null)$$,
  '22023',
  'invalid_locale',
  'newsletter_signup rejects a null locale'
);
select lives_ok(
  $$select public.newsletter_signup('en@x.com', 'footer', 'ar')$$,
  'signing up en@x.com again, now with locale ar, does not error'
);

select tests.logout();
select is((select locale from public.signups where email = 'en@x.com'), 'en', 'en@x.com was stored with locale en');
select is((select locale from public.signups where email = 'ar@x.com'), 'ar', 'a call without a locale stores ar');
select is((select locale from public.signups where email = 'n@x.com'), 'ar', 'the teaser''s named call stores ar');
select is(
  (select count(*) || ':' || min(locale) from public.signups where email = 'en@x.com'),
  '1:en',
  'still exactly one row for en@x.com, and it keeps locale en'
);

select * from finish();
rollback;
