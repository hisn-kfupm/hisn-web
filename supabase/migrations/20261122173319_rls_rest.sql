-- A-5 · Access to signups, email_unsubscribes, email_deliveries, talent_submission_log, and newsletter_signup().

-- signups: no direct access; newsletter_signup() is the only way in -------------------------------------------

revoke all on public.signups from anon, authenticated;

-- email_unsubscribes, email_deliveries: server only (service key). No policies, so reads return no rows.
-- Write privileges are revoked as well (defense in depth; owner decision). TRUNCATE was revoked in A-4.

revoke insert, update, delete on public.email_unsubscribes, public.email_deliveries from anon, authenticated;

-- talent_submission_log: a user reads their own row. No admin clause. Server writes through the service key ------

revoke insert, update, delete on public.talent_submission_log from anon, authenticated;

create policy talent_submission_log_select_own on public.talent_submission_log
  for select to authenticated
  using (user_id = auth.uid());

-- newsletter_signup() ---------------------------------------------------------------------------------------------
-- Only inserts. It is granted to anon and accepts any address, so it cannot prove the caller owns the email:
-- it must never delete from email_unsubscribes or change profiles (spec §10.2). A signed-in person opts back in
-- only through saveProfile (D2-6).

create function public.newsletter_signup(p_email text, p_source text default 'footer')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := lower(trim(p_email));
begin
  if v is null or char_length(v) > 254 or v !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  -- "is null" is needed: null not in (...) is null, which would not raise (owner decision).
  if p_source is null or p_source not in ('teaser', 'footer') then
    raise exception 'invalid_source' using errcode = '22023';
  end if;

  insert into signups (email, source) values (v, p_source)
  on conflict ((lower(trim(email)))) do nothing;
end;
$$;

grant execute on function public.newsletter_signup(text, text) to anon, authenticated;
