-- D2-9 · Registration functions (spec §8.4, plan T12): register, cancel (your own, or by a signed link), seats left,
-- and the outbox insert they share. promote_waitlist promotes nobody until D2-10 replaces it.
--
-- Every function that changes a registration first locks the event row (select … for update). A second request
-- for the same event waits there until the first commits, then counts the first one's seat, so two people can never
-- both take the last seat. Each change queues its email in the same transaction (outbox; D2-8 sends it).
-- Tables and functions are schema-qualified, so inside these security definer functions a temporary table can
-- never stand in for one of ours.

-- queue_delivery: one queued email about a registration, to the registrant's profile email and in their language
-- as it is now. A later change on /account leaves rows already queued as they are. Internal. ------------------------

create function public.queue_delivery(p_registration_id bigint, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.email_deliveries (event_id, registration_id, kind, email, locale, status)
  select r.event_id, r.id, p_kind, p.email, p.locale, 'queued'
    from public.registrations r
    join public.profiles p on p.id = r.user_id
   where r.id = p_registration_id;

  -- A change must never go through without its email: raising undoes the whole transaction.
  if not found then
    raise exception 'registration_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- promote_waitlist: a stub that promotes nobody. D2-10 replaces the body (create or replace keeps the grants below).
-- Its callers already hold the event lock. Internal. -----------------------------------------------------------------

create function public.promote_waitlist(p_event_id bigint)
returns bigint[]
language plpgsql
security definer
set search_path = public
as $$
begin
  return '{}'::bigint[];
end;
$$;

-- register_for_event ------------------------------------------------------------------------------------------------

create function public.register_for_event(p_event_id bigint)
returns text
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
  select status, capacity, registration_closes_at
    into v_status, v_capacity, v_closes_at
    from public.events
   where id = p_event_id
     for update;

  -- The checks, in this order; the first that matches is the answer.
  if not found or v_status = 'draft' then
    return 'not_found';
  end if;

  if not exists (select 1 from public.profiles where id = v_user) then
    return 'profile_required';
  end if;

  if v_status = 'cancelled' then
    return 'cancelled';
  end if;

  if now() >= v_closes_at then
    return 'closed';
  end if;

  select id, status
    into v_registration, v_registration_status
    from public.registrations
   where event_id = p_event_id and user_id = v_user;

  if v_registration_status = 'registered' then
    return 'already_registered';
  elsif v_registration_status = 'waitlisted' then
    return 'already_waitlisted';
  end if;

  if v_capacity is not null
     and (select count(*) from public.registrations
           where event_id = p_event_id and status = 'registered') >= v_capacity then
    return 'full';
  end if;

  if v_registration is null then
    insert into public.registrations (event_id, user_id, status)
    values (p_event_id, v_user, 'registered')
    returning id into v_registration;
  else
    -- The caller's cancelled row, reused: the new version makes the cancel links in its earlier emails do nothing.
    update public.registrations
       set status = 'registered',
           cancelled_at = null,
           waitlisted_at = null,
           promoted_at = null,
           registration_version = registration_version + 1
     where id = v_registration;
  end if;

  perform public.queue_delivery(v_registration, 'confirmation');
  return 'registered';
end;
$$;

-- cancel_my_registration: a seat or a waitlist place, by the signed-in person ---------------------------------------

create function public.cancel_my_registration(p_event_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starts_at timestamptz;
  v_registration bigint;
  v_registration_status text;
begin
  select starts_at into v_starts_at from public.events where id = p_event_id for update;
  if not found then
    return 'not_found';
  end if;

  select id, status
    into v_registration, v_registration_status
    from public.registrations
   where event_id = p_event_id and user_id = auth.uid() and status in ('registered', 'waitlisted');
  if not found then
    return 'not_found';
  end if;

  if now() >= v_starts_at then
    return 'started';
  end if;

  update public.registrations set status = 'cancelled', cancelled_at = now() where id = v_registration;
  perform public.queue_delivery(v_registration, 'cancel_confirmation');
  if v_registration_status = 'registered' then
    perform public.promote_waitlist(p_event_id); -- a seat came free
  end if;
  return 'cancelled';
end;
$$;

-- cancel_registration_by_id: the signed cancel link (D2-12), called with the service key. A link carries the
-- registration_version it was sent with; after the row is reused, an older link answers not_found. ----------------

create function public.cancel_registration_by_id(p_registration_id bigint, p_version int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event bigint;
  v_starts_at timestamptz;
  v_registration_status text;
begin
  -- The registration names its event; lock that event, then read the registration again under the lock.
  select event_id into v_event from public.registrations where id = p_registration_id;
  if not found then
    return 'not_found';
  end if;

  select starts_at into v_starts_at from public.events where id = v_event for update;
  if not found then
    return 'not_found';
  end if;

  select status
    into v_registration_status
    from public.registrations
   where id = p_registration_id
     and event_id = v_event
     and status in ('registered', 'waitlisted')
     and registration_version = p_version;
  if not found then
    return 'not_found';
  end if;

  if now() >= v_starts_at then
    return 'started';
  end if;

  update public.registrations set status = 'cancelled', cancelled_at = now() where id = p_registration_id;
  perform public.queue_delivery(p_registration_id, 'cancel_confirmation');
  if v_registration_status = 'registered' then
    perform public.promote_waitlist(v_event); -- a seat came free
  end if;
  return 'cancelled';
end;
$$;

-- seats_left: null for a draft, an unknown event or no capacity; never below 0 (a capacity lowered under the
-- registered count keeps everyone, D2-10). A read: it takes no lock. ------------------------------------------------

create function public.seats_left(p_event_id bigint)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
  v_capacity int;
begin
  select status, capacity into v_status, v_capacity from public.events where id = p_event_id;
  if not found or v_status = 'draft' or v_capacity is null then
    return null;
  end if;

  return greatest(0, v_capacity - (select count(*) from public.registrations
                                    where event_id = p_event_id and status = 'registered'))::int;
end;
$$;

-- Who may call what (spec §8.4) -------------------------------------------------------------------------------------
-- Postgres grants execute on a new function to public, and Supabase's default privileges grant it to anon,
-- authenticated and service_role, so every restriction is an explicit revoke. The two internal functions are
-- revoked from the service key too: only the functions above (running as their owner) call them.

revoke execute on function public.queue_delivery(bigint, text) from public, anon, authenticated, service_role;
revoke execute on function public.promote_waitlist(bigint) from public, anon, authenticated, service_role;

revoke execute on function public.register_for_event(bigint) from public, anon;
grant execute on function public.register_for_event(bigint) to authenticated;

revoke execute on function public.cancel_my_registration(bigint) from public, anon;
grant execute on function public.cancel_my_registration(bigint) to authenticated;

revoke execute on function public.cancel_registration_by_id(bigint, int) from public, anon, authenticated;
grant execute on function public.cancel_registration_by_id(bigint, int) to service_role;

grant execute on function public.seats_left(bigint) to anon, authenticated;
