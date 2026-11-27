-- D2-10 · Waitlist and capacity functions (spec §7.5, §8.4, plan T12): join the waitlist, read your place in it,
-- promote the first person waiting when a seat frees, and the admin's capacity change, which promotes in order.
--
-- Like D2-9's functions, every change first locks the event row (select … for update), so the seat count and the
-- waitlist can't change underneath it, and queues its email in the same transaction, in the person's language
-- (queue_delivery copies profiles.locale). The waitlist's order is (waitlisted_at, id). waitlisted_at is the
-- time after the lock (clock_timestamp(), not the transaction's start), so the order is the order people joined in
-- and a place already given never gets worse because of someone who joined later (owner's decision).
-- Tables and functions are schema-qualified, as in D2-9.

-- waitlist_place: 1 + the people waiting ahead of this registration. Internal. ----------------------------------------

create function public.waitlist_place(p_registration_id bigint)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select 1 + count(*)::int
    from public.registrations ahead
    join public.registrations me on me.id = p_registration_id
   where ahead.event_id = me.event_id
     and ahead.status = 'waitlisted'
     and (ahead.waitlisted_at, ahead.id) < (me.waitlisted_at, me.id)
$$;

-- promote_waitlist: replaces D2-9's stub (create or replace keeps its grants: internal). The caller holds the event
-- lock. Only a published event that still takes registrations promotes; after that, freed seats stay empty. -------

create or replace function public.promote_waitlist(p_event_id bigint)
returns bigint[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_capacity int;
  v_closes_at timestamptz;
  v_next bigint;
  v_promoted bigint[] := '{}';
begin
  select status, capacity, registration_closes_at
    into v_status, v_capacity, v_closes_at
    from public.events
   where id = p_event_id;

  if v_status is distinct from 'published' or now() >= v_closes_at then
    return v_promoted;
  end if;

  loop
    exit when v_capacity is not null
          and (select count(*) from public.registrations
                where event_id = p_event_id and status = 'registered') >= v_capacity;

    select id into v_next
      from public.registrations
     where event_id = p_event_id and status = 'waitlisted'
     order by waitlisted_at, id
     limit 1;
    exit when not found;

    update public.registrations set status = 'registered', promoted_at = now() where id = v_next;
    perform public.queue_delivery(v_next, 'promoted');
    v_promoted := v_promoted || v_next;
  end loop;

  return v_promoted;
end;
$$;

-- join_waitlist ------------------------------------------------------------------------------------------------------
-- "position" is quoted: it is a keyword. The rpc returns rows of { result, position }.

create function public.join_waitlist(p_event_id bigint)
returns table(result text, "position" int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_status text;
  v_capacity int;
  v_closes_at timestamptz;
  v_registration bigint;
  v_registration_status text;
begin
  select e.status, e.capacity, e.registration_closes_at
    into v_status, v_capacity, v_closes_at
    from public.events e
   where e.id = p_event_id
     for update;

  -- The checks, in this order; the first that matches is the answer.
  if not found or v_status = 'draft' then
    return query select 'not_found'::text, null::int;
    return;
  end if;

  if not exists (select 1 from public.profiles where id = v_user) then
    return query select 'profile_required'::text, null::int;
    return;
  end if;

  if v_status = 'cancelled' then
    return query select 'cancelled'::text, null::int;
    return;
  end if;

  if now() >= v_closes_at then
    return query select 'closed'::text, null::int;
    return;
  end if;

  select r.id, r.status
    into v_registration, v_registration_status
    from public.registrations r
   where r.event_id = p_event_id and r.user_id = v_user;

  if v_registration_status = 'registered' then
    return query select 'already_registered'::text, null::int;
    return;
  elsif v_registration_status = 'waitlisted' then
    return query select 'already_waitlisted'::text, public.waitlist_place(v_registration);
    return;
  end if;

  if v_capacity is null then
    return query select 'no_capacity'::text, null::int;
    return;
  end if;

  if (select count(*) from public.registrations r
       where r.event_id = p_event_id and r.status = 'registered') < v_capacity then
    return query select 'not_full'::text, null::int;
    return;
  end if;

  if v_registration is null then
    insert into public.registrations (event_id, user_id, status, waitlisted_at)
    values (p_event_id, v_user, 'waitlisted', clock_timestamp())
    returning id into v_registration;
  else
    -- The caller's cancelled row, reused, at the end of the waitlist: the new version makes the leave links in its
    -- earlier emails do nothing, and its old cancel date goes (owner's decision).
    update public.registrations
       set status = 'waitlisted',
           waitlisted_at = clock_timestamp(),
           promoted_at = null,
           cancelled_at = null,
           registration_version = registration_version + 1
     where id = v_registration;
  end if;

  perform public.queue_delivery(v_registration, 'waitlist_joined');
  return query select 'waitlisted'::text, public.waitlist_place(v_registration);
end;
$$;

-- waitlist_position: the caller's place, or null when they are not waiting. A read: it takes no lock. ----------------

create function public.waitlist_position(p_event_id bigint)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_registration bigint;
begin
  select id into v_registration
    from public.registrations
   where event_id = p_event_id and user_id = auth.uid() and status = 'waitlisted';
  if not found then
    return null;
  end if;
  return public.waitlist_place(v_registration);
end;
$$;

-- set_event_capacity: the admin's capacity change (D1-14). Raising it promotes people in order; lowering it never
-- changes a registration (seats_left stays at 0 until enough people cancel). ----------------------------------------

create function public.set_event_capacity(p_event_id bigint, p_capacity int)
returns bigint[]
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_capacity is not null and p_capacity < 1 then
    raise exception 'invalid_capacity' using errcode = '22023';
  end if;

  perform 1 from public.events where id = p_event_id for update;
  update public.events set capacity = p_capacity where id = p_event_id;
  return public.promote_waitlist(p_event_id);
end;
$$;

-- Who may call what (spec §8.4), as in D2-9: Postgres and Supabase grant execute on a new function to everyone, so
-- every restriction is an explicit revoke. promote_waitlist keeps D2-9's revokes.

revoke execute on function public.waitlist_place(bigint) from public, anon, authenticated, service_role;

revoke execute on function public.join_waitlist(bigint) from public, anon;
grant execute on function public.join_waitlist(bigint) to authenticated;

revoke execute on function public.waitlist_position(bigint) from public, anon;
grant execute on function public.waitlist_position(bigint) to authenticated;

revoke execute on function public.set_event_capacity(bigint, int) from public, anon;
grant execute on function public.set_event_capacity(bigint, int) to authenticated;
