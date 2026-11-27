-- A-9 · Copy the teaser's signups into hisn-prod, once, on launch day right before the domain switch.
-- Run only as docs/runbooks/A-09-teaser-migration.md says: in ONE transaction (psql -1) on hisn-prod, after
--   1. create temp table teaser_signups (email text, created_at timestamptz) on commit drop;
--   2. loading every row of the old project's signups into it (\copy … from program, no file on disk);
--   3. select set_config('teaser.expected_rows', '<count taken on the old project after the freeze>', true);
-- Any failure raises, so psql -1 rolls back and hisn-prod is left exactly as it was.
--
-- What it does:
-- - normalizes each address with lower(trim(email)), as newsletter_signup does;
-- - drops malformed addresses with newsletter_signup's own check (the spec: malformed addresses are never stored)
--   and lists them for the owner;
-- - keeps one row per address: the earliest created_at (owner decision: original signup times are kept);
-- - inserts with source 'import'; locale comes from the column default 'ar' (A-19);
-- - leaves an address that is already in hisn-prod as it is;
-- - checks that the rows loaded equal the old project's count, and that every valid address is now in signups.
-- Safe to run twice: a second run inserts nothing.

do $$
begin
  if coalesce(current_setting('teaser.expected_rows', true), '') = '' then
    raise exception 'set teaser.expected_rows to the row count taken on the old project first';
  end if;
  if (select count(*) from teaser_signups) <> current_setting('teaser.expected_rows')::bigint then
    raise exception 'expected % rows from the old project, loaded %',
      current_setting('teaser.expected_rows'), (select count(*) from teaser_signups);
  end if;
end $$;

-- quiet: on the first run these do not exist yet, and the notice would only be noise in the owner's terminal
set local client_min_messages = warning;
drop table if exists pg_temp.teaser_checked, pg_temp.teaser_unique, pg_temp.teaser_counts;
set local client_min_messages = notice;

-- Same check as newsletter_signup (A-5, A-19): null, longer than 254, or not like a@b.tld is malformed.
create temp table teaser_checked on commit drop as
select
  email as original,
  lower(trim(email)) as email,
  created_at,
  coalesce(char_length(lower(trim(email))) <= 254 and lower(trim(email)) ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$', false) as valid
from teaser_signups;

create temp table teaser_unique on commit drop as
select distinct on (email) email, created_at
from teaser_checked
where valid
order by email, created_at;

create temp table teaser_counts on commit drop as
select
  (select count(*) from teaser_checked)::int as total,
  (select count(*) from teaser_checked where not valid)::int as malformed,
  (select count(*) from teaser_checked where valid)::int - (select count(*) from teaser_unique)::int as duplicates,
  (select count(*) from teaser_unique)::int as unique_valid,
  0 as inserted,
  (select count(*) from teaser_unique u where exists (
    select 1 from public.signups s where lower(trim(s.email)) = u.email))::int as already_in_prod;

with inserted as (
  insert into public.signups (email, source, created_at)
  select email, 'import', created_at from teaser_unique
  on conflict ((lower(trim(email)))) do nothing
  returning 1
)
update teaser_counts set inserted = (select count(*) from inserted);

-- The count check: inserted + already there = every valid address, and each one is really in signups.
do $$
declare
  c teaser_counts;
  missing int;
begin
  select * into c from teaser_counts;
  select count(*) into missing from teaser_unique u
  where not exists (select 1 from public.signups s where lower(trim(s.email)) = u.email);
  if missing > 0 or c.inserted + c.already_in_prod <> c.unique_valid
     or c.malformed + c.duplicates + c.unique_valid <> c.total then
    raise exception 'count check failed: total %, malformed %, duplicates %, unique %, inserted %, already %, missing %',
      c.total, c.malformed, c.duplicates, c.unique_valid, c.inserted, c.already_in_prod, missing;
  end if;
end $$;

-- For the owner's terminal only: the malformed addresses that were dropped (keep them out of chat and tickets).
select original as email from teaser_checked where not valid order by created_at, original;

-- The summary, last.
select total, malformed, duplicates, unique_valid, inserted, already_in_prod from teaser_counts;
