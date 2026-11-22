-- A-4 · Row-level security for profiles, events, event_private and registrations (spec §9.1).
-- signups, email tables and talent_submission_log are A-5.

-- is_admin() ----------------------------------------------------------------------------------------------------
-- Security definer so it can read profiles.is_admin without going through the profiles select policy.

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- profiles ------------------------------------------------------------------------------------------------------
-- HR-4: authenticated can never write is_admin; email is set once on insert and never updated.

revoke insert, update on public.profiles from authenticated, anon;

grant insert (id, email, full_name_ar, major_code, major_other, academic_level_code, gender,
              announcements_opt_in, announcements_updated_at)
  on public.profiles to authenticated;

grant update (full_name_ar, major_code, major_other, academic_level_code, gender,
              announcements_opt_in, announcements_updated_at)
  on public.profiles to authenticated;

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and email = auth.jwt() ->> 'email');

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- events --------------------------------------------------------------------------------------------------------

create policy events_select_public_or_admin on public.events
  for select to anon, authenticated
  using (status in ('published', 'cancelled') or is_admin());

create policy events_insert_admin on public.events
  for insert to authenticated
  with check (is_admin());

create policy events_update_admin on public.events
  for update to authenticated
  using (is_admin())
  with check (is_admin());

create policy events_delete_admin on public.events
  for delete to authenticated
  using (is_admin());

-- event_private (meeting links): admin only; nothing for anon ---------------------------------------------------

create policy event_private_admin on public.event_private
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- registrations: read own (admin reads all); no write policies, writes go through the registration functions ----

create policy registrations_select_own_or_admin on public.registrations
  for select to authenticated
  using (user_id = auth.uid() or is_admin());
