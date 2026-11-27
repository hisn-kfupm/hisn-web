# A-9 · Copy the teaser's signups into hisn-prod

**When:** launch day (Mon 30 Nov), right before the domain switch in A-17. Nothing else changes on the teaser: it keeps writing to the old project until hisn-sa.org moves, and it retires with the switch.

**Who:** the owner only. It needs the database passwords of the old (phase 1) project and of hisn-prod.

**What it does:**
- **Freeze:** turns off new signups on the old project, so nothing arrives after the count.
- **Count:** counts the old project's rows.
- **Copy:** copies them into hisn-prod with [`scripts/launch/teaser-signups.sql`](../../scripts/launch/teaser-signups.sql), in one transaction. That script:
  - normalizes every address with `lower(trim(email))`;
  - drops malformed addresses (the same check as `newsletter_signup`) and lists them;
  - keeps one row per address, with the earliest original signup time;
  - inserts with `source = 'import'` and `locale = 'ar'`;
  - leaves an address already in hisn-prod as it is.
- **Check:** the copy fails, and writes nothing, unless the rows copied equal the count and every valid address ends up in `signups`.

**Personal data:** the addresses are real people's.
- They go straight from one database to the other through a pipe; nothing is saved to disk.
- The list of dropped malformed addresses appears only in your terminal. Never paste addresses into chat, tickets, PRs or the launch notes; record only the counts.

## Before launch day

- [ ] `psql` (14 or later) on your machine, and a checkout of `hisn-web` at `main`. Run every command from the repo root.
- [ ] The two connection strings: Supabase → project → **Connect** → **Session pooler** (works over IPv4), with the database password filled in and `?sslmode=require` added at the end.
- [ ] Optional dry run, any day: do steps 1, 4 and 5 below with `finish=rollback`, without the freeze. Nothing is written. Without the freeze the count can change between steps 4 and 5; if so, just run again.

## Launch day

### 1. Connection strings (not saved in your shell history)

```bash
read -rs -p 'Old project URL: ' OLD_DB_URL; echo; export OLD_DB_URL
```
```bash
read -rs -p 'hisn-prod URL: ' PROD_DB_URL; echo; export PROD_DB_URL
```

Check that the old table has the two columns the copy reads, `email` and `created_at`:

```bash
psql "$OLD_DB_URL" -X -c '\d public.signups'
```

If either is missing or named differently, stop here.

### 2. Save the insert policy (for rollback)

```bash
psql "$OLD_DB_URL" -XAt <<'SQL'
select format('create policy %I on %I.%I as %s for %s to %s%s%s;', policyname, schemaname, tablename, lower(permissive), lower(cmd),
  array_to_string(roles, ', '), coalesce(' using (' || qual || ')', ''), coalesce(' with check (' || with_check || ')', ''))
from pg_policies where schemaname = 'public' and tablename = 'signups';
SQL
```

Keep the printed `create policy …` line in your launch notes; it holds no secret. If it prints nothing, the old table has no policy, so inserts work some other way. Stop and look before going on.

### 3. Freeze the old project

Use the policy name from step 2:

```bash
psql "$OLD_DB_URL" -X -v ON_ERROR_STOP=1 -c 'drop policy "<policy name>" on public.signups;'
```

Check: submit your own address on the teaser (hisn-sa.org). It must fail. From now until the switch, the teaser's form shows an error; that window is what the freeze costs. Go straight on.

### 4. Count the old rows

```bash
N=$(psql "$OLD_DB_URL" -XAt -v ON_ERROR_STOP=1 -c 'select count(*) from public.signups'); echo "$N"
```

Write `N` in the launch notes.

### 5. Copy

First with `finish=rollback` (a rehearsal on the real data that writes nothing), then the same command with `finish=commit`:

```bash
copy_signups() {
  psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -v expected="$N" -v finish="$1" <<'SQL'
begin;
create temp table teaser_signups (email text, created_at timestamptz) on commit drop;
\copy teaser_signups from program 'psql "$OLD_DB_URL" -X -v ON_ERROR_STOP=1 -c "copy (select email, created_at from public.signups) to stdout with (format csv)"' with (format csv)
select set_config('teaser.expected_rows', :'expected', true);
\i scripts/launch/teaser-signups.sql
:finish;
SQL
}
```
```bash
copy_signups rollback
```
```bash
copy_signups commit
```

The output ends with the dropped malformed addresses (terminal only), then the summary:

```
 total | malformed | duplicates | unique_valid | inserted | already_in_prod
```

- **Enforced by the script** (otherwise it stops with an error and nothing is written):
  - `total` = `N`;
  - `inserted + already_in_prod = unique_valid`;
  - every valid address is in `signups`.
- **Done when:** the `commit` run ends with `COMMIT` and the summary row. Write its six numbers (no addresses) in the launch notes.
- `already_in_prod` counts people who also signed up on the new site's footer; their footer row stays as it is.
- Running it again is safe: a second `commit` run inserts nothing new.

### 6. Switch the domain

Follow `docs/launch-runbook.md` (A-16), as A-17 says.

### 7. Clean up

```bash
unset OLD_DB_URL PROD_DB_URL N
```
```bash
clear && printf '\e[3J'
```

The second command clears the terminal's scrollback, which holds the malformed addresses.

## After the switch

- The old project stays frozen. Check: the teaser's own `*.vercel.app` address still serves the form, and a submission there must fail.
- Don't delete the old project yet; it is the original copy of the data and the rollback target. Deleting it is a separate decision.

## Rollback (back to the teaser)

1. Follow the rollback in `docs/launch-runbook.md`.
2. Restore the insert policy so the teaser accepts signups again: run the `create policy …` line saved in step 2 on the old project.
3. The rows already copied into hisn-prod stay; they are the same people.
4. On the next attempt, repeat steps 1–5. The copy only adds addresses that are new since the last run.

## If something fails

Any error stops psql before `commit`, so hisn-prod is unchanged.

| Message | Meaning |
|---|---|
| `expected N rows from the old project, loaded M` | Rows changed between the count and the copy: the freeze isn't working. Check step 3. |
| `set teaser.expected_rows …` | `N` is empty: redo step 4 in the same shell. |
| `count check failed: …` | Shouldn't happen. Stop and keep the output, minus any addresses. |
| connection errors | Use the Session pooler URL, check the password, keep `?sslmode=require`. |
