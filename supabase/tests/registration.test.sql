-- D2-9 · Registration functions (spec §8.4, plan T12): register_for_event, cancel_my_registration,
-- cancel_registration_by_id, seats_left, queue_delivery and the promote_waitlist stub.
-- Ids are kept in transaction-local settings (t.*) so they can be read under any role. Emails end in @reg.test,
-- so counts never include rows other database tests left behind.
begin;
select plan(74);

-- Fixtures (as postgres) ----------------------------------------------------------------------------------------
do $$
begin
  perform set_config('t.np',     tests.create_user('noprofile@reg.test', false)::text, true);
  perform set_config('t.a',      tests.create_user('a@reg.test')::text, true);
  perform set_config('t.b',      tests.create_user('b@reg.test')::text, true);
  perform set_config('t.filler', tests.create_user('filler@reg.test')::text, true);
  perform set_config('t.w',      tests.create_user('w@reg.test')::text, true);
  perform set_config('t.en',     tests.create_user('en@reg.test')::text, true);
  perform set_config('t.c',      tests.create_user('c@reg.test')::text, true);
  perform set_config('t.s',      tests.create_user('s@reg.test')::text, true);
  perform set_config('t.r',      tests.create_user('r@reg.test')::text, true);
  perform set_config('t.r2',     tests.create_user('r2@reg.test')::text, true);

  perform set_config('t.open',             tests.create_event(10)::text, true);
  perform set_config('t.draft',            tests.create_event(5, 'draft')::text, true);
  perform set_config('t.cancelled',        tests.create_event(10, 'cancelled')::text, true);
  perform set_config('t.cancelled_closed', tests.create_event(10, 'cancelled', '1 day', '-1 hour')::text, true);
  perform set_config('t.closed',           tests.create_event(10, 'published', '1 day', '-1 hour')::text, true);
  perform set_config('t.full',             tests.create_event(1)::text, true);
  perform set_config('t.seats',            tests.create_event(5)::text, true);
  perform set_config('t.unlimited',        tests.create_event()::text, true);
  perform set_config('t.over',             tests.create_event(1)::text, true);
  perform set_config('t.freed',            tests.create_event(1)::text, true);
  perform set_config('t.started',          tests.create_event(10, 'published', '-1 hour')::text, true);
  -- now() is fixed for the whole transaction, so these two sit exactly on the boundary.
  perform set_config('t.closes_now',       tests.create_event(10, 'published', '1 day', '0 seconds')::text, true);
  perform set_config('t.starts_now',       tests.create_event(10, 'published', '0 seconds')::text, true);

  -- t.closed: a already has a seat. t.full (capacity 1): filler has the seat, w waits.
  perform tests.add_registration(current_setting('t.a')::uuid, current_setting('t.closed')::bigint);
  perform tests.add_registration(current_setting('t.filler')::uuid, current_setting('t.full')::bigint);
  perform tests.add_registration(current_setting('t.w')::uuid, current_setting('t.full')::bigint, 'waitlisted');
  -- t.seats (capacity 5): 2 registered, 1 waitlisted, 1 cancelled.
  perform tests.add_registration(current_setting('t.a')::uuid, current_setting('t.seats')::bigint);
  perform tests.add_registration(current_setting('t.b')::uuid, current_setting('t.seats')::bigint);
  perform set_config('t.w_seats',
    tests.add_registration(current_setting('t.w')::uuid, current_setting('t.seats')::bigint, 'waitlisted')::text, true);
  perform tests.add_registration(current_setting('t.c')::uuid, current_setting('t.seats')::bigint, 'cancelled');
  -- t.over: capacity 1 with 2 registered (the capacity was lowered after they registered).
  perform tests.add_registration(current_setting('t.a')::uuid, current_setting('t.over')::bigint);
  perform tests.add_registration(current_setting('t.b')::uuid, current_setting('t.over')::bigint);
  -- t.freed (capacity 1): its only row was cancelled.
  perform tests.add_registration(current_setting('t.c')::uuid, current_setting('t.freed')::bigint, 'cancelled');
  -- t.started began an hour ago; s has a seat.
  perform set_config('t.s_reg',
    tests.add_registration(current_setting('t.s')::uuid, current_setting('t.started')::bigint)::text, true);
  -- t.starts_now starts at this very moment; s and b have seats.
  perform tests.add_registration(current_setting('t.s')::uuid, current_setting('t.starts_now')::bigint);
  perform set_config('t.b_now',
    tests.add_registration(current_setting('t.b')::uuid, current_setting('t.starts_now')::bigint)::text, true);
  -- c has a seat on t.open.
  perform set_config('t.c_reg',
    tests.add_registration(current_setting('t.c')::uuid, current_setting('t.open')::bigint)::text, true);
  -- r2 has a cancelled row on t.open that had been waitlisted and then promoted.
  perform set_config('t.r2_reg',
    tests.add_registration(current_setting('t.r2')::uuid, current_setting('t.open')::bigint, 'cancelled')::text, true);
  update public.registrations
     set waitlisted_at = now() - interval '2 hours', promoted_at = now() - interval '1 hour'
   where id = current_setting('t.r2_reg')::bigint;

  -- en reads English (set as postgres, like /account would).
  update public.profiles set locale = 'en' where id = current_setting('t.en')::uuid;
end
$$;

-- register_for_event: each check, and their order -----------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);

select is(public.register_for_event(current_setting('t.draft')::bigint), 'not_found', 'a draft event → not_found');
select is(public.register_for_event(999999), 'not_found', 'an unknown event id → not_found');
select is(public.register_for_event(null), 'not_found', 'a null event id → not_found');
select is(public.register_for_event(current_setting('t.cancelled')::bigint), 'cancelled', 'a cancelled event → cancelled');
select is(
  public.register_for_event(current_setting('t.cancelled_closed')::bigint),
  'cancelled',
  'cancelled comes before closed'
);
select is(
  public.register_for_event(current_setting('t.closed')::bigint),
  'closed',
  'closed comes before already_registered'
);

select tests.login_as(current_setting('t.np')::uuid);

select is(public.register_for_event(current_setting('t.open')::bigint), 'profile_required', 'no profile → profile_required');
select is(public.register_for_event(current_setting('t.draft')::bigint), 'not_found', 'not_found comes before profile_required');
select is(
  public.register_for_event(current_setting('t.cancelled')::bigint),
  'profile_required',
  'profile_required comes before cancelled'
);

select tests.login_as(current_setting('t.b')::uuid);

select is(public.register_for_event(current_setting('t.closed')::bigint), 'closed', 'registration closed an hour ago → closed');
select is(
  public.register_for_event(current_setting('t.closes_now')::bigint),
  'closed',
  'registration closing at this very moment → closed'
);
select is(public.register_for_event(current_setting('t.full')::bigint), 'full', 'capacity 1 with 1 registered → full');

select tests.login_as(current_setting('t.filler')::uuid);
select is(
  public.register_for_event(current_setting('t.full')::bigint),
  'already_registered',
  'already_registered comes before full'
);

select tests.login_as(current_setting('t.w')::uuid);
select is(
  public.register_for_event(current_setting('t.full')::bigint),
  'already_waitlisted',
  'a person on the waitlist → already_waitlisted, which comes before full'
);

select tests.logout();
select is(
  (select count(*) from public.email_deliveries where email like '%@reg.test'),
  0::bigint,
  'none of those answers queued an email'
);
select results_eq(
  $$select status, count(*) from public.registrations
     where event_id = current_setting('t.full')::bigint group by status order by status$$,
  $$values ('registered', 1::bigint), ('waitlisted', 1::bigint)$$,
  'full and the already_* answers left the full event as it was'
);

-- register_for_event: a seat and its confirmation email ------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);

select is(public.register_for_event(current_setting('t.open')::bigint), 'registered', 'a seat on an open event → registered');
select is(
  public.register_for_event(current_setting('t.open')::bigint),
  'already_registered',
  'asking again → already_registered'
);

select tests.logout();
select results_eq(
  $$select status, registration_version, cancelled_at is null, waitlisted_at is null, promoted_at is null
      from public.registrations
     where event_id = current_setting('t.open')::bigint and user_id = current_setting('t.a')::uuid$$,
  $$values ('registered', 1, true, true, true)$$,
  'exactly one row for that person and event: registered, version 1'
);
select results_eq(
  $$select d.kind, d.status, d.locale, d.event_id, d.email
      from public.email_deliveries d
      join public.registrations r on r.id = d.registration_id
     where r.event_id = current_setting('t.open')::bigint and r.user_id = current_setting('t.a')::uuid$$,
  $$values ('confirmation', 'queued', 'ar', current_setting('t.open')::bigint, 'a@reg.test')$$,
  'exactly one queued confirmation for that registration: in Arabic (the profile default), to the profile email'
);

select tests.login_as(current_setting('t.b')::uuid);
select is(
  public.register_for_event(current_setting('t.freed')::bigint),
  'registered',
  'capacity 1 whose only row was cancelled → registered (a cancelled row holds no seat)'
);

-- The registrant's language, copied when the email is queued -------------------------------------------------------
select tests.login_as(current_setting('t.en')::uuid);

select is(public.register_for_event(current_setting('t.open')::bigint), 'registered', 'a person who reads English registers');
select is(public.cancel_my_registration(current_setting('t.open')::bigint), 'cancelled', '… and cancels');

select tests.logout();
select results_eq(
  $$select kind, locale from public.email_deliveries where email = 'en@reg.test' order by id$$,
  $$values ('confirmation', 'en'), ('cancel_confirmation', 'en')$$,
  'both emails are queued in English, the profile''s language'
);

update public.profiles set locale = 'ar' where id = current_setting('t.en')::uuid;
select results_eq(
  $$select locale from public.email_deliveries where email = 'en@reg.test' order by id$$,
  $$values ('en'), ('en')$$,
  'changing the profile''s language later leaves the queued emails in English'
);

-- seats_left -------------------------------------------------------------------------------------------------------
select is(
  public.seats_left(current_setting('t.seats')::bigint),
  3,
  'capacity 5 with 2 registered (and a waitlisted and a cancelled row) → 3'
);
select is(public.seats_left(current_setting('t.unlimited')::bigint), null::int, 'no capacity → null');
select is(public.seats_left(current_setting('t.draft')::bigint), null::int, 'a draft (capacity 5, nobody registered) → null');
select is(public.seats_left(999999), null::int, 'an unknown event → null');
select is(public.seats_left(current_setting('t.full')::bigint), 0, 'capacity 1 with 1 registered → 0');
select is(
  public.seats_left(current_setting('t.over')::bigint),
  0,
  'more registered than the capacity (lowered later) → 0, never negative'
);

select tests.login_anon();
select is(public.seats_left(current_setting('t.seats')::bigint), 3, 'seats_left works for anon');

select tests.login_as(current_setting('t.b')::uuid);
select is(public.seats_left(current_setting('t.seats')::bigint), 3, 'seats_left works for a signed-in person');

-- cancel_my_registration -------------------------------------------------------------------------------------------
select tests.login_as(current_setting('t.c')::uuid);

select is(public.cancel_my_registration(current_setting('t.open')::bigint), 'cancelled', 'cancelling a seat → cancelled');
select is(public.cancel_my_registration(current_setting('t.open')::bigint), 'not_found', 'cancelling again → not_found');
select is(public.cancel_my_registration(999999), 'not_found', 'an unknown event → not_found');
select is(public.cancel_my_registration(null), 'not_found', 'a null event id → not_found');

select tests.logout();
select results_eq(
  $$select status, cancelled_at is not null from public.registrations where id = current_setting('t.c_reg')::bigint$$,
  $$values ('cancelled', true)$$,
  'the row is cancelled, with cancelled_at set'
);
select results_eq(
  $$select kind, status, locale, event_id, email from public.email_deliveries
     where registration_id = current_setting('t.c_reg')::bigint$$,
  $$values ('cancel_confirmation', 'queued', 'ar', current_setting('t.open')::bigint, 'c@reg.test')$$,
  'exactly one cancel_confirmation is queued (the second call queued nothing)'
);

select tests.login_as(current_setting('t.w')::uuid);
select is(public.cancel_my_registration(current_setting('t.full')::bigint), 'cancelled', 'leaving a waitlist → cancelled');

select tests.login_as(current_setting('t.a')::uuid);
select is(
  public.cancel_my_registration(current_setting('t.closed')::bigint),
  'cancelled',
  'registration has closed but the event has not started → cancelled'
);

select tests.login_as(current_setting('t.b')::uuid);
select is(public.cancel_my_registration(current_setting('t.open')::bigint), 'not_found', 'nothing to cancel → not_found');

select tests.login_as(current_setting('t.s')::uuid);
select is(
  public.cancel_my_registration(current_setting('t.started')::bigint),
  'started',
  'the event started an hour ago → started'
);
select is(
  public.cancel_my_registration(current_setting('t.starts_now')::bigint),
  'started',
  'the event starting at this very moment → started'
);

select tests.logout();
select results_eq(
  $$select r.status, (select count(*) from public.email_deliveries d where d.registration_id = r.id)
      from public.registrations r where r.id = current_setting('t.s_reg')::bigint$$,
  $$values ('registered', 0::bigint)$$,
  'started changes nothing: still registered, no email queued'
);
select results_eq(
  $$select r.status, d.kind from public.registrations r
      join public.email_deliveries d on d.registration_id = r.id
     where r.user_id = current_setting('t.w')::uuid and r.event_id = current_setting('t.full')::bigint$$,
  $$values ('cancelled', 'cancel_confirmation')$$,
  'the waitlist place is cancelled, with one cancel_confirmation queued'
);

-- Register, cancel, register again: the same row, version 2 --------------------------------------------------------
select tests.login_as(current_setting('t.r')::uuid);
select is(public.register_for_event(current_setting('t.open')::bigint), 'registered', 'r registers');

select tests.logout();
do $$
begin
  perform set_config('t.r_reg', (select id from public.registrations
                                  where user_id = current_setting('t.r')::uuid
                                    and event_id = current_setting('t.open')::bigint)::text, true);
end
$$;

select tests.login_as(current_setting('t.r')::uuid);
select is(public.cancel_my_registration(current_setting('t.open')::bigint), 'cancelled', 'r cancels');
select is(public.register_for_event(current_setting('t.open')::bigint), 'registered', 'r registers again → registered');

select tests.logout();
select results_eq(
  $$select id, status, registration_version, cancelled_at is null from public.registrations
     where user_id = current_setting('t.r')::uuid and event_id = current_setting('t.open')::bigint$$,
  $$values (current_setting('t.r_reg')::bigint, 'registered', 2, true)$$,
  'the same row (same id) is registered again, with registration_version 2 and no cancelled_at'
);
select results_eq(
  $$select kind from public.email_deliveries where registration_id = current_setting('t.r_reg')::bigint order by id$$,
  $$values ('confirmation'), ('cancel_confirmation'), ('confirmation')$$,
  'each step queued its email: confirmation, cancel_confirmation, confirmation'
);

select tests.login_as(current_setting('t.r2')::uuid);
select is(
  public.register_for_event(current_setting('t.open')::bigint),
  'registered',
  'a cancelled row that had been waitlisted and promoted is reused'
);

select tests.logout();
select results_eq(
  $$select id, status, registration_version, cancelled_at is null, waitlisted_at is null, promoted_at is null
      from public.registrations
     where user_id = current_setting('t.r2')::uuid and event_id = current_setting('t.open')::bigint$$,
  $$values (current_setting('t.r2_reg')::bigint, 'registered', 2, true, true, true)$$,
  '… with cancelled_at, waitlisted_at and promoted_at cleared and the version raised'
);

-- cancel_registration_by_id (the signed cancel link; server only), as postgres -------------------------------------
select is(
  public.cancel_registration_by_id(current_setting('t.r_reg')::bigint, 1),
  'not_found',
  'a link from before re-registering (version 1) → not_found'
);
select is(
  (select status from public.registrations where id = current_setting('t.r_reg')::bigint),
  'registered',
  '… and the new registration stays registered'
);
select is(
  public.cancel_registration_by_id(current_setting('t.r_reg')::bigint, 2),
  'cancelled',
  'the current version → cancelled'
);
select results_eq(
  $$select r.status, r.cancelled_at is not null,
           (select count(*) from public.email_deliveries d
             where d.registration_id = r.id and d.kind = 'cancel_confirmation' and d.status = 'queued')
      from public.registrations r where r.id = current_setting('t.r_reg')::bigint$$,
  $$values ('cancelled', true, 2::bigint)$$,
  '… the row is cancelled and a second cancel_confirmation is queued'
);
select is(
  public.cancel_registration_by_id(current_setting('t.r_reg')::bigint, 2),
  'not_found',
  'the same link again → not_found'
);
select is(public.cancel_registration_by_id(999999, 1), 'not_found', 'an unknown registration → not_found');
select is(
  public.cancel_registration_by_id(current_setting('t.r2_reg')::bigint, null),
  'not_found',
  'a null version → not_found'
);
select is(
  public.cancel_registration_by_id(current_setting('t.s_reg')::bigint, 1),
  'started',
  'after the start → started'
);
select is(
  public.cancel_registration_by_id(current_setting('t.b_now')::bigint, 1),
  'started',
  'at the very moment of the start → started'
);
select is(
  public.cancel_registration_by_id(current_setting('t.w_seats')::bigint, 1),
  'cancelled',
  'a waitlist place → cancelled'
);
select is(
  (select status from public.registrations where id = current_setting('t.r2_reg')::bigint),
  'registered',
  'the null-version call left that row registered'
);

-- queue_delivery and the promote_waitlist stub, as postgres ---------------------------------------------------------
select throws_ok(
  $$select public.queue_delivery(999999, 'confirmation')$$,
  'P0002',
  'registration_not_found',
  'queue_delivery for a missing registration raises, so a change never goes through without its email'
);
select is(
  public.promote_waitlist(current_setting('t.open')::bigint),
  '{}'::bigint[],
  'promote_waitlist on an event with nobody waiting promotes nobody'
);

-- Who may call what ------------------------------------------------------------------------------------------------
select tests.login_anon();
select throws_ok(
  $$select public.register_for_event(1)$$,
  '42501',
  'permission denied for function register_for_event',
  'anon cannot call register_for_event'
);
select throws_ok(
  $$select public.cancel_my_registration(1)$$,
  '42501',
  'permission denied for function cancel_my_registration',
  'anon cannot call cancel_my_registration'
);

select tests.login_as(current_setting('t.a')::uuid);
select throws_ok(
  $$select public.cancel_registration_by_id(1, 1)$$,
  '42501',
  'permission denied for function cancel_registration_by_id',
  'a signed-in person cannot call cancel_registration_by_id'
);
select throws_ok(
  $$select public.queue_delivery(1, 'confirmation')$$,
  '42501',
  'permission denied for function queue_delivery',
  'a signed-in person cannot queue an email'
);
select throws_ok(
  $$select public.promote_waitlist(1)$$,
  '42501',
  'permission denied for function promote_waitlist',
  'a signed-in person cannot call promote_waitlist'
);

select tests.logout();
select results_eq(
  $$select p.proname::text collate "default",
           has_function_privilege('anon', p.oid, 'execute'),
           has_function_privilege('authenticated', p.oid, 'execute')
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('queue_delivery', 'register_for_event', 'cancel_my_registration',
                         'cancel_registration_by_id', 'seats_left', 'promote_waitlist')
     order by 1$$,
  $$values ('cancel_my_registration', false, true),
           ('cancel_registration_by_id', false, false),
           ('promote_waitlist', false, false),
           ('queue_delivery', false, false),
           ('register_for_event', false, true),
           ('seats_left', true, true)$$,
  'execute for anon and authenticated: exactly as spec §8.4 grants'
);
select results_eq(
  $$select p.proname::text collate "default", has_function_privilege('service_role', p.oid, 'execute')
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('queue_delivery', 'cancel_registration_by_id', 'promote_waitlist')
     order by 1$$,
  $$values ('cancel_registration_by_id', true), ('promote_waitlist', false), ('queue_delivery', false)$$,
  'the service key can cancel by id (the signed link), but never call the internal functions directly'
);

-- The functions' shape ---------------------------------------------------------------------------------------------
select results_eq(
  $$select p.proname::text collate "default", pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid),
           l.lanname::text collate "default", p.prosecdef, p.proconfig collate "default"
      from pg_proc p
      join pg_language l on l.oid = p.prolang
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('queue_delivery', 'register_for_event', 'cancel_my_registration',
                         'cancel_registration_by_id', 'seats_left', 'promote_waitlist')
     order by 1$$,
  $$values
    ('cancel_my_registration', 'p_event_id bigint', 'text', 'plpgsql', true, array['search_path=public']),
    ('cancel_registration_by_id', 'p_registration_id bigint, p_version integer', 'text', 'plpgsql', true, array['search_path=public']),
    ('promote_waitlist', 'p_event_id bigint', 'bigint[]', 'plpgsql', true, array['search_path=public']),
    ('queue_delivery', 'p_registration_id bigint, p_kind text', 'void', 'plpgsql', true, array['search_path=public']),
    ('register_for_event', 'p_event_id bigint', 'text', 'plpgsql', true, array['search_path=public']),
    ('seats_left', 'p_event_id bigint', 'integer', 'plpgsql', true, array['search_path=public'])$$,
  'each function has the interface''s arguments and result, and is plpgsql, security definer, search_path public'
);

select * from finish();
rollback;
