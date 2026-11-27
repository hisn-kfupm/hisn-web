-- D2-10 · Waitlist and capacity functions (spec §7.5, §8.4; plan T12): join_waitlist, waitlist_position,
-- promote_waitlist (replacing D2-9's stub) and set_event_capacity.
-- Ids are kept in transaction-local settings (t.*) so they can be read under any role. Emails end in @wait.test,
-- so counts never include rows other database tests left behind.
begin;
select plan(76);

-- Fixtures (as postgres) ----------------------------------------------------------------------------------------
do $$
begin
  perform set_config('t.np',     tests.create_user('noprofile@wait.test', false)::text, true);
  perform set_config('t.a',      tests.create_user('a@wait.test')::text, true);
  perform set_config('t.b',      tests.create_user('b@wait.test')::text, true);
  perform set_config('t.c',      tests.create_user('c@wait.test')::text, true);
  perform set_config('t.r',      tests.create_user('r@wait.test')::text, true);
  perform set_config('t.filler', tests.create_user('filler@wait.test')::text, true);
  perform set_config('t.admin',  tests.create_user('admin@wait.test', true, true)::text, true);
  perform set_config('t.r1',     tests.create_user('r1@wait.test')::text, true);
  perform set_config('t.r2',     tests.create_user('r2@wait.test')::text, true);
  perform set_config('t.r3',     tests.create_user('r3@wait.test')::text, true);
  perform set_config('t.r4',     tests.create_user('r4@wait.test')::text, true);
  perform set_config('t.w1',     tests.create_user('w1@wait.test')::text, true);
  perform set_config('t.w2',     tests.create_user('w2@wait.test')::text, true);
  perform set_config('t.w3',     tests.create_user('w3@wait.test')::text, true);

  -- a reads English (set as postgres, like /account would)
  update public.profiles set locale = 'en' where id = current_setting('t.a')::uuid;

  perform set_config('t.draft',            tests.create_event(1, 'draft')::text, true);
  perform set_config('t.cancelled',        tests.create_event(1, 'cancelled')::text, true);
  perform set_config('t.cancelled_closed', tests.create_event(1, 'cancelled', '1 day', '-1 hour')::text, true);
  perform set_config('t.closed',           tests.create_event(1, 'published', '1 day', '-1 hour')::text, true);
  perform set_config('t.notfull',          tests.create_event(2)::text, true);
  perform set_config('t.unlimited',        tests.create_event()::text, true);
  perform set_config('t.full',             tests.create_event(1)::text, true);
  perform set_config('t.promote',          tests.create_event(1)::text, true);
  perform set_config('t.closed_promote',   tests.create_event(1, 'published', '1 day', '-1 hour')::text, true);
  perform set_config('t.leave',            tests.create_event(1)::text, true);
  perform set_config('t.raise',            tests.create_event(2)::text, true);
  perform set_config('t.lower',            tests.create_event(4)::text, true);
  perform set_config('t.uncap',            tests.create_event(1)::text, true);
  perform set_config('t.tie',              tests.create_event(1)::text, true);
  perform set_config('t.rejoin',           tests.create_event(1)::text, true);
  perform set_config('t.end',              tests.create_event(1)::text, true);
  perform set_config('t.draft_wait',       tests.create_event(2, 'draft')::text, true);
  perform set_config('t.cancelled_wait',   tests.create_event(2, 'cancelled')::text, true);

  -- t.notfull (capacity 2): r has one seat. t.full, t.closed, t.leave, t.rejoin, t.end (capacity 1): filler's.
  perform tests.add_registration(current_setting('t.r')::uuid, current_setting('t.notfull')::bigint);
  perform tests.add_registration(current_setting('t.filler')::uuid, current_setting('t.full')::bigint);
  perform tests.add_registration(current_setting('t.filler')::uuid, current_setting('t.closed')::bigint);
  perform tests.add_registration(current_setting('t.filler')::uuid, current_setting('t.leave')::bigint);
  perform tests.add_registration(current_setting('t.filler')::uuid, current_setting('t.rejoin')::bigint);
  perform tests.add_registration(current_setting('t.filler')::uuid, current_setting('t.end')::bigint);
  -- t.promote (capacity 1): r has the seat; a and b join below.
  perform tests.add_registration(current_setting('t.r')::uuid, current_setting('t.promote')::bigint);
  -- t.closed_promote (capacity 1, closed an hour ago, starts tomorrow): r has the seat, a then b wait.
  perform tests.add_registration(current_setting('t.r')::uuid, current_setting('t.closed_promote')::bigint);
  perform tests.add_registration(current_setting('t.a')::uuid, current_setting('t.closed_promote')::bigint, 'waitlisted');
  perform tests.add_registration(current_setting('t.b')::uuid, current_setting('t.closed_promote')::bigint, 'waitlisted');
  -- t.raise (capacity 2): r1, r2 registered; w1, w2, w3 wait in that order.
  perform tests.add_registration(current_setting('t.r1')::uuid, current_setting('t.raise')::bigint);
  perform tests.add_registration(current_setting('t.r2')::uuid, current_setting('t.raise')::bigint);
  perform set_config('t.raise_w1', tests.add_registration(current_setting('t.w1')::uuid, current_setting('t.raise')::bigint, 'waitlisted')::text, true);
  perform set_config('t.raise_w2', tests.add_registration(current_setting('t.w2')::uuid, current_setting('t.raise')::bigint, 'waitlisted')::text, true);
  perform set_config('t.raise_w3', tests.add_registration(current_setting('t.w3')::uuid, current_setting('t.raise')::bigint, 'waitlisted')::text, true);
  -- t.lower (capacity 4): r1–r4 registered.
  perform tests.add_registration(current_setting('t.r1')::uuid, current_setting('t.lower')::bigint);
  perform tests.add_registration(current_setting('t.r2')::uuid, current_setting('t.lower')::bigint);
  perform tests.add_registration(current_setting('t.r3')::uuid, current_setting('t.lower')::bigint);
  perform tests.add_registration(current_setting('t.r4')::uuid, current_setting('t.lower')::bigint);
  -- t.uncap (capacity 1): r1 registered; w1, w2 wait.
  perform tests.add_registration(current_setting('t.r1')::uuid, current_setting('t.uncap')::bigint);
  perform set_config('t.uncap_w1', tests.add_registration(current_setting('t.w1')::uuid, current_setting('t.uncap')::bigint, 'waitlisted')::text, true);
  perform set_config('t.uncap_w2', tests.add_registration(current_setting('t.w2')::uuid, current_setting('t.uncap')::bigint, 'waitlisted')::text, true);
  -- t.tie (capacity 1): r1 registered; w1 waits last, w2 and w3 joined at the same instant (w2 has the lower id).
  perform tests.add_registration(current_setting('t.r1')::uuid, current_setting('t.tie')::bigint);
  perform set_config('t.tie_w1', tests.add_registration(current_setting('t.w1')::uuid, current_setting('t.tie')::bigint, 'waitlisted')::text, true);
  perform set_config('t.tie_w2', tests.add_registration(current_setting('t.w2')::uuid, current_setting('t.tie')::bigint, 'waitlisted')::text, true);
  perform set_config('t.tie_w3', tests.add_registration(current_setting('t.w3')::uuid, current_setting('t.tie')::bigint, 'waitlisted')::text, true);
  update public.registrations set waitlisted_at = now() - interval '1 hour'
   where id in (current_setting('t.tie_w2')::bigint, current_setting('t.tie_w3')::bigint);
  -- a draft and a cancelled event, each with a free seat and someone waiting
  perform tests.add_registration(current_setting('t.w1')::uuid, current_setting('t.draft_wait')::bigint, 'waitlisted');
  perform tests.add_registration(current_setting('t.w1')::uuid, current_setting('t.cancelled_wait')::bigint, 'waitlisted');
end
$$;

-- join_waitlist: each check, and their order -----------------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);

select results_eq($$select * from public.join_waitlist(current_setting('t.draft')::bigint)$$,
  $$values ('not_found'::text, null::int)$$, 'a draft event → not_found');
select results_eq($$select * from public.join_waitlist(999999)$$,
  $$values ('not_found'::text, null::int)$$, 'an unknown event id → not_found');
select results_eq($$select * from public.join_waitlist(null)$$,
  $$values ('not_found'::text, null::int)$$, 'a null event id → not_found');
select results_eq($$select * from public.join_waitlist(current_setting('t.cancelled')::bigint)$$,
  $$values ('cancelled'::text, null::int)$$, 'a cancelled event → cancelled');
select results_eq($$select * from public.join_waitlist(current_setting('t.cancelled_closed')::bigint)$$,
  $$values ('cancelled'::text, null::int)$$, 'cancelled comes before closed');
select results_eq($$select * from public.join_waitlist(current_setting('t.closed')::bigint)$$,
  $$values ('closed'::text, null::int)$$, 'registration closed (the event is full) → closed');
select results_eq($$select * from public.join_waitlist(current_setting('t.notfull')::bigint)$$,
  $$values ('not_full'::text, null::int)$$, 'capacity 2 with 1 registered → not_full');
select results_eq($$select * from public.join_waitlist(current_setting('t.unlimited')::bigint)$$,
  $$values ('no_capacity'::text, null::int)$$, 'no capacity → no_capacity');

select tests.login_as(current_setting('t.np')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.full')::bigint)$$,
  $$values ('profile_required'::text, null::int)$$, 'no profile → profile_required');
select results_eq($$select * from public.join_waitlist(current_setting('t.draft')::bigint)$$,
  $$values ('not_found'::text, null::int)$$, 'not_found comes before profile_required');
select results_eq($$select * from public.join_waitlist(current_setting('t.cancelled')::bigint)$$,
  $$values ('profile_required'::text, null::int)$$, 'profile_required comes before cancelled');

select tests.login_as(current_setting('t.filler')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.full')::bigint)$$,
  $$values ('already_registered'::text, null::int)$$, 'a registered person → already_registered');

select tests.logout();
select is((select count(*)::int from public.registrations r join public.profiles p on p.id = r.user_id
            where p.email like '%@wait.test' and r.status = 'waitlisted'
              and r.event_id in (current_setting('t.notfull')::bigint, current_setting('t.unlimited')::bigint,
                                 current_setting('t.closed')::bigint, current_setting('t.cancelled')::bigint)),
  0, 'none of those answers added anyone to a waitlist');

-- Three people join a full event, in order ---------------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.full')::bigint)$$,
  $$values ('waitlisted'::text, 1)$$, 'a joins a full event → waitlisted, position 1');
select tests.login_as(current_setting('t.b')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.full')::bigint)$$,
  $$values ('waitlisted'::text, 2)$$, 'then b → position 2');
select tests.login_as(current_setting('t.c')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.full')::bigint)$$,
  $$values ('waitlisted'::text, 3)$$, 'then c → position 3');
select is(public.waitlist_position(current_setting('t.full')::bigint), 3, 'waitlist_position as c → 3');
select results_eq($$select * from public.join_waitlist(current_setting('t.full')::bigint)$$,
  $$values ('already_waitlisted'::text, 3)$$, 'c joining again → already_waitlisted, with the position');

select tests.login_as(current_setting('t.a')::uuid);
select is(public.waitlist_position(current_setting('t.full')::bigint), 1, 'waitlist_position as a → 1');
select tests.login_as(current_setting('t.r')::uuid);
select is(public.waitlist_position(current_setting('t.full')::bigint), null, 'waitlist_position with no row → null');
select tests.login_as(current_setting('t.filler')::uuid);
select is(public.waitlist_position(current_setting('t.full')::bigint), null, 'waitlist_position when registered → null');

select tests.logout();
select results_eq(
  $$select email, locale, status from public.email_deliveries
     where event_id = current_setting('t.full')::bigint and kind = 'waitlist_joined' order by id$$,
  $$values ('a@wait.test', 'en', 'queued'), ('b@wait.test', 'ar', 'queued'), ('c@wait.test', 'ar', 'queued')$$,
  'each join queued one waitlist_joined email, in the joiner''s language');
select is((select count(*)::int from public.email_deliveries where event_id = current_setting('t.full')::bigint), 3,
  'joining again queued nothing');
select is((select count(distinct waitlisted_at)::int from public.registrations
            where event_id = current_setting('t.full')::bigint and status = 'waitlisted'), 3,
  'joins in one transaction still get distinct, ordered join times (taken after the lock)');
select results_eq(
  $$select p.email::text from public.registrations r join public.profiles p on p.id = r.user_id
     where r.event_id = current_setting('t.full')::bigint and r.status = 'waitlisted' order by r.waitlisted_at$$,
  $$values ('a@wait.test'), ('b@wait.test'), ('c@wait.test')$$,
  'waitlisted_at follows the order of joining');

-- A seat frees: the first person waiting is promoted ---------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.promote')::bigint)$$,
  $$values ('waitlisted'::text, 1)$$, 'a waits on t.promote');
select tests.login_as(current_setting('t.b')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.promote')::bigint)$$,
  $$values ('waitlisted'::text, 2)$$, 'then b');
select tests.login_as(current_setting('t.r')::uuid);
select is(public.cancel_my_registration(current_setting('t.promote')::bigint), 'cancelled', 'r gives up the seat');

select tests.logout();
select results_eq(
  $$select p.email::text, r.status, r.promoted_at is not null from public.registrations r
      join public.profiles p on p.id = r.user_id
     where r.event_id = current_setting('t.promote')::bigint and p.email in ('a@wait.test', 'b@wait.test')
     order by p.email$$,
  $$values ('a@wait.test', 'registered', true), ('b@wait.test', 'waitlisted', false)$$,
  'a is promoted (promoted_at set); b still waits');
select results_eq(
  $$select registration_id, email, locale, status from public.email_deliveries
     where event_id = current_setting('t.promote')::bigint and kind = 'promoted'$$,
  $$select r.id, 'a@wait.test'::text, 'en'::text, 'queued'::text from public.registrations r
     where r.event_id = current_setting('t.promote')::bigint and r.user_id = current_setting('t.a')::uuid$$,
  'exactly one promoted email, for a, in a''s language');
select is(public.seats_left(current_setting('t.promote')::bigint), 0, 'a took the seat');
select tests.login_as(current_setting('t.b')::uuid);
select is(public.waitlist_position(current_setting('t.promote')::bigint), 1, 'b is now first');

-- After registration closes, a freed seat stays empty -----------------------------------------------------------
select tests.login_as(current_setting('t.r')::uuid);
select is(public.cancel_my_registration(current_setting('t.closed_promote')::bigint), 'cancelled',
  'r cancels after registration closed (before the start)');
select tests.logout();
select results_eq(
  $$select p.email::text, r.status from public.registrations r join public.profiles p on p.id = r.user_id
     where r.event_id = current_setting('t.closed_promote')::bigint order by p.email$$,
  $$values ('a@wait.test', 'waitlisted'), ('b@wait.test', 'waitlisted'), ('r@wait.test', 'cancelled')$$,
  'nobody is promoted; a still waits');
select is((select count(*)::int from public.email_deliveries
            where event_id = current_setting('t.closed_promote')::bigint and kind = 'promoted'), 0,
  'no promoted email');

-- Leaving the waitlist promotes nobody ---------------------------------------------------------------------------
select tests.login_as(current_setting('t.a')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.leave')::bigint)$$,
  $$values ('waitlisted'::text, 1)$$, 'a waits on t.leave');
select tests.login_as(current_setting('t.b')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.leave')::bigint)$$,
  $$values ('waitlisted'::text, 2)$$, 'then b');
select tests.login_as(current_setting('t.a')::uuid);
select is(public.cancel_my_registration(current_setting('t.leave')::bigint), 'cancelled', 'a leaves the waitlist → cancelled');
select tests.logout();
select results_eq(
  $$select p.email::text, r.status from public.registrations r join public.profiles p on p.id = r.user_id
     where r.event_id = current_setting('t.leave')::bigint order by p.email$$,
  $$values ('a@wait.test', 'cancelled'), ('b@wait.test', 'waitlisted'), ('filler@wait.test', 'registered')$$,
  'nobody is promoted');
select is((select count(*)::int from public.email_deliveries
            where event_id = current_setting('t.leave')::bigint and kind = 'promoted'), 0, 'no promoted email');
select tests.login_as(current_setting('t.b')::uuid);
select is(public.waitlist_position(current_setting('t.leave')::bigint), 1, 'b''s position becomes 1');

-- set_event_capacity ---------------------------------------------------------------------------------------------
select tests.login_as(current_setting('t.admin')::uuid);
select is(public.set_event_capacity(current_setting('t.raise')::bigint, 4),
  array[current_setting('t.raise_w1')::bigint, current_setting('t.raise_w2')::bigint],
  'capacity 2 → 4 with 3 waiting: w1 and w2 are promoted, in that order');
select tests.logout();
select results_eq(
  $$select r.id, r.status, r.promoted_at is not null from public.registrations r
     where r.id in (current_setting('t.raise_w1')::bigint, current_setting('t.raise_w2')::bigint, current_setting('t.raise_w3')::bigint)
     order by r.id$$,
  $$values (current_setting('t.raise_w1')::bigint, 'registered'::text, true),
           (current_setting('t.raise_w2')::bigint, 'registered'::text, true),
           (current_setting('t.raise_w3')::bigint, 'waitlisted'::text, false)$$,
  'w3 still waits');
select results_eq(
  $$select registration_id from public.email_deliveries
     where event_id = current_setting('t.raise')::bigint and kind = 'promoted' order by id$$,
  $$values (current_setting('t.raise_w1')::bigint), (current_setting('t.raise_w2')::bigint)$$,
  'one promoted email each, in order');
select is((select capacity from public.events where id = current_setting('t.raise')::bigint), 4, 'the capacity is saved');

select tests.login_as(current_setting('t.admin')::uuid);
select is(public.set_event_capacity(current_setting('t.lower')::bigint, 1), '{}'::bigint[], 'lowering capacity promotes nobody');
select tests.logout();
select is((select count(*)::int from public.registrations
            where event_id = current_setting('t.lower')::bigint and status = 'registered'), 4,
  'capacity 4 → 1 with 4 registered: all 4 keep their seats');
select is(public.seats_left(current_setting('t.lower')::bigint), 0, 'seats_left is 0, never below');

select tests.login_as(current_setting('t.admin')::uuid);
select is(public.set_event_capacity(current_setting('t.uncap')::bigint, null),
  array[current_setting('t.uncap_w1')::bigint, current_setting('t.uncap_w2')::bigint],
  'no capacity: everyone waiting is promoted');
select tests.logout();
select is((select count(*)::int from public.registrations
            where event_id = current_setting('t.uncap')::bigint and status = 'registered'), 3, 'all three registered');
select is((select capacity from public.events where id = current_setting('t.uncap')::bigint), null, 'capacity is null');

select tests.login_as(current_setting('t.admin')::uuid);
select is(public.set_event_capacity(current_setting('t.tie')::bigint, 3),
  array[current_setting('t.tie_w2')::bigint, current_setting('t.tie_w3')::bigint],
  'promotion order is (waitlisted_at, id): earlier joins first, then the lower id at the same instant');
select throws_ok(
  $$select public.set_event_capacity(current_setting('t.raise')::bigint, 0)$$,
  '22023', 'invalid_capacity', 'capacity 0 → 22023');
select throws_ok(
  $$select public.set_event_capacity(current_setting('t.raise')::bigint, -1)$$,
  '22023', 'invalid_capacity', 'a negative capacity → 22023');
select is(public.set_event_capacity(999999, 3), '{}'::bigint[], 'an unknown event: nothing to promote');

select tests.login_as(current_setting('t.a')::uuid);
select throws_ok(
  $$select public.set_event_capacity(current_setting('t.raise')::bigint, 5)$$,
  '42501', 'forbidden', 'a signed-in person who is not admin → 42501');

select tests.logout();
select is((select capacity from public.events where id = current_setting('t.raise')::bigint), 4,
  'the refused calls changed nothing');

-- A cancelled event ----------------------------------------------------------------------------------------------
select tests.login_as(current_setting('t.c')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.cancelled')::bigint)$$,
  $$values ('cancelled'::text, null::int)$$, 'a cancelled event → cancelled');

-- Join, leave, join again: the same row, a new version, at the end of the waitlist -------------------------------
select results_eq($$select * from public.join_waitlist(current_setting('t.rejoin')::bigint)$$,
  $$values ('waitlisted'::text, 1)$$, 'c joins t.rejoin');
select tests.logout();
select set_config('t.rejoin_reg',
  (select id from public.registrations where event_id = current_setting('t.rejoin')::bigint
      and user_id = current_setting('t.c')::uuid)::text, true);
select tests.login_as(current_setting('t.c')::uuid);
select is(public.cancel_my_registration(current_setting('t.rejoin')::bigint), 'cancelled', 'c leaves');
select results_eq($$select * from public.join_waitlist(current_setting('t.rejoin')::bigint)$$,
  $$values ('waitlisted'::text, 1)$$, 'c joins again');
select tests.logout();
select results_eq(
  $$select id, status, registration_version, cancelled_at is null, promoted_at is null, waitlisted_at is not null
      from public.registrations
     where event_id = current_setting('t.rejoin')::bigint and user_id = current_setting('t.c')::uuid$$,
  $$values (current_setting('t.rejoin_reg')::bigint, 'waitlisted'::text, 2, true, true, true)$$,
  'the same row, registration_version 1 → 2, and its cancelled_at cleared');
select results_eq(
  $$select kind from public.email_deliveries where event_id = current_setting('t.rejoin')::bigint order by id$$,
  $$values ('waitlist_joined'), ('cancel_confirmation'), ('waitlist_joined')$$,
  'each join and the leave queued their emails');

select tests.login_as(current_setting('t.a')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.end')::bigint)$$,
  $$values ('waitlisted'::text, 1)$$, 'a joins t.end first');
select tests.login_as(current_setting('t.b')::uuid);
select results_eq($$select * from public.join_waitlist(current_setting('t.end')::bigint)$$,
  $$values ('waitlisted'::text, 2)$$, 'then b');
select tests.login_as(current_setting('t.a')::uuid);
select is(public.cancel_my_registration(current_setting('t.end')::bigint), 'cancelled', 'a leaves');
select results_eq($$select * from public.join_waitlist(current_setting('t.end')::bigint)$$,
  $$values ('waitlisted'::text, 2)$$, 'and joins again: at the end, behind b');

-- promote_waitlist promotes only on a published event --------------------------------------------------------------
select tests.logout();
select is(public.promote_waitlist(current_setting('t.draft_wait')::bigint), '{}'::bigint[], 'a draft event: nobody promoted');
select is(public.promote_waitlist(current_setting('t.cancelled_wait')::bigint), '{}'::bigint[], 'a cancelled event: nobody promoted');
select is((select count(*)::int from public.registrations
            where event_id in (current_setting('t.draft_wait')::bigint, current_setting('t.cancelled_wait')::bigint)
              and status = 'waitlisted'), 2, 'both still wait');

-- Who may call what ------------------------------------------------------------------------------------------------
select tests.login_anon();
select throws_ok($$select * from public.join_waitlist(current_setting('t.full')::bigint)$$, '42501', null, 'anon cannot join a waitlist');
select throws_ok($$select public.waitlist_position(current_setting('t.full')::bigint)$$, '42501', null, 'anon cannot read a position');
select throws_ok($$select public.set_event_capacity(current_setting('t.full')::bigint, 2)$$, '42501', null, 'anon cannot set a capacity');
select tests.login_as(current_setting('t.a')::uuid);
select throws_ok($$select public.promote_waitlist(current_setting('t.full')::bigint)$$, '42501', null,
  'a signed-in person cannot call promote_waitlist');
select tests.logout();

select results_eq(
  $$select p.proname::text collate "default", has_function_privilege('anon', p.oid, 'execute'),
           has_function_privilege('authenticated', p.oid, 'execute'), has_function_privilege('service_role', p.oid, 'execute')
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('join_waitlist', 'waitlist_position', 'set_event_capacity', 'promote_waitlist', 'waitlist_place')
     order by 1$$,
  $$values ('join_waitlist', false, true, true), ('promote_waitlist', false, false, false),
           ('set_event_capacity', false, true, true), ('waitlist_place', false, false, false),
           ('waitlist_position', false, true, true)$$,
  'grants: signed-in people may call the three public functions; promote_waitlist and waitlist_place are internal');
select results_eq(
  $$select p.proname::text collate "default", pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid),
           l.lanname::text collate "default", p.prosecdef, p.proconfig collate "default"
      from pg_proc p
      join pg_language l on l.oid = p.prolang
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('join_waitlist', 'waitlist_position', 'set_event_capacity', 'promote_waitlist', 'waitlist_place')
     order by 1$$,
  $$values
    ('join_waitlist', 'p_event_id bigint', 'TABLE(result text, "position" integer)', 'plpgsql', true, array['search_path=public']),
    ('promote_waitlist', 'p_event_id bigint', 'bigint[]', 'plpgsql', true, array['search_path=public']),
    ('set_event_capacity', 'p_event_id bigint, p_capacity integer', 'bigint[]', 'plpgsql', true, array['search_path=public']),
    ('waitlist_place', 'p_registration_id bigint', 'integer', 'sql', true, array['search_path=public']),
    ('waitlist_position', 'p_event_id bigint', 'integer', 'plpgsql', true, array['search_path=public'])$$,
  'each function has the interface''s arguments and result, and is security definer with search_path public');

select * from finish();
rollback;
