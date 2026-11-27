-- A-19 · Locale columns (spec revision 2.3: Hisn launches in Arabic and English).
-- A-3 to A-5 stay as they are; everything English needs from the database comes in this extra migration.
-- Expand-only: new nullable or defaulted columns, and a backward-compatible newsletter_signup.

-- profiles.locale: the person's email language. The page locale at their first profile save (D2-6),
-- editable on /account (D1-16).
alter table public.profiles
  add column locale text not null default 'ar' check (locale in ('ar', 'en'));

-- A-4 grants profile columns to authenticated one by one, so the new column needs its own grants.
grant insert (locale), update (locale) on public.profiles to authenticated;

-- events.title_en / description_en: optional. On /en a missing value falls back to the Arabic text
-- (lib/events/text.ts).
alter table public.events
  add column title_en text,
  add column description_en text;

-- signups.locale: the page language at signup. Teaser and imported rows get 'ar'.
alter table public.signups
  add column locale text not null default 'ar' check (locale in ('ar', 'en'));

-- email_deliveries.locale: the language the email is rendered in, set when the row is queued
-- (D2-9, D2-10, D2-14).
alter table public.email_deliveries
  add column locale text not null default 'ar' check (locale in ('ar', 'en'));

-- newsletter_signup(p_email, p_source, p_locale) ------------------------------------------------------------------
-- Drop and create: create or replace can't add a parameter, and keeping both versions would make a two-argument
-- call ambiguous. Backward compatible: every existing call, positional or named (the teaser's p_email, p_source
-- in A-9), still resolves and gets 'ar'.

drop function public.newsletter_signup(text, text);

-- Exactly A-5's body, plus the locale check and column. Still only inserts: an existing signup keeps its locale,
-- and nothing else changes (spec §10.2).
create function public.newsletter_signup(p_email text, p_source text default 'footer', p_locale text default 'ar')
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

  if p_locale is null or p_locale not in ('ar', 'en') then
    raise exception 'invalid_locale' using errcode = '22023';
  end if;

  insert into signups (email, source, locale) values (v, p_source, p_locale)
  on conflict ((lower(trim(email)))) do nothing;
end;
$$;

grant execute on function public.newsletter_signup(text, text, text) to anon, authenticated;
