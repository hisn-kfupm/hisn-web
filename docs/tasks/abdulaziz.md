# Abdulaziz — Tasks for حصن Phase 2

**Feature-complete:** Wed 25 Nov 2026 · **Launch:** Mon 30 Nov 2026 · **Deadline:** Tue 1 Dec 2026
**Your dates:** Thu 12 Nov – Mon 30 Nov
**References:** Spec `docs/superpowers/specs/2026-11-10-hisn-phase2-design.md` (§ numbers below). Plan `docs/superpowers/plans/2026-11-12-hisn-phase2.md` (T numbers below).

## Summary

**You own:** accounts, access and production settings; the database clients and environment schema; the production schema, row-level security, seed data and test helpers; the CI database jobs and the deploy pipeline; the teaser data migration; everything in قاعدة المواهب on the server side (talent schema, submission action, export and purge scripts); the admin CSV exports; the Resend bounce and complaint webhook; Sentry; and the rehearsal and launch.

**You need from others before you can start:**

| You need | From | Expected |
|---|---|---|
| Bare app and npm scripts | Abdulrahman (D1-1) | Thu 12 Nov (evening) |
| Data files and `labels.ts` | Abdulrahman (D1-2) | Fri 13 Nov |
| Basic CI workflow `pr.yml` | Abdulrahman (D1-4) | Sun 15 Nov |
| Sign-in on a preview (for the real-inbox test) | Abdullah (D2-5) | Mon 16 Nov |
| `reportError` signature | Abdullah (D2-5) | Mon 16 Nov |
| `requireAdmin` | Abdulrahman (D1-13) | Tue 24 Nov |
| Content shape, one department, hero quote and image | Marketing | Thu 12 Nov |
| Final copy for all six departments | Marketing | Thu 19 Nov |
| Talent field list | Specialized committee | no date yet |
| Talent consent text | Founder | no date yet |

**Waiting on you:**
- **Both, Thu 12 morning, before anything else:** the GitHub repo (A-1).
- **Abdulrahman:** six department codes/slugs/icons and the majors list by **Fri 13 Nov noon**; `supabaseProdServer` (A-2, Fri 13); tables and seed (A-3 to A-6, Sat 14 – Tue 17); `newsletter_signup` (A-5, Mon 16); talent action and fields (A-11, Mon 23).
- **Abdullah:** `lib/env.ts`, clients and `supabase/config.toml` (A-2, Fri 13); tables (A-3, Sat 14); RLS, `is_admin()` and SQL test helpers (A-4, Sun 15); seed, `tests/fixtures/seed.ts`, `tests/db/helpers.ts` (A-6, Tue 17); CI `e2e` job (A-7, Thu 19).
- **Both:** PR reviews every day.

**Daily review window:** 21:00–22:30. Review every PR opened before 20:00 the same day. Merges to `main` deploy to the private production address (after A-8).

### Rules for every task

- Write the listed tests first, see them fail, implement, see them pass, open a PR. You review your own PRs at the next window, after a second look by Abdulrahman or Abdullah for anything security-related (A-4, A-5, A-10, A-11).
- All constraints in plan "Global Constraints" apply.
- Production and talent credentials never go into the repo, GitHub repository secrets or Vercel preview env. They live in Vercel production env, the GitHub `production` environment, or your `.env.owner.local` (git-ignored).
- Migrations: `supabase migration new <name>` → `supabase/migrations/<timestamp>_<name>.sql`. Talent migrations live in `talent/migrations/NNNN_<name>.sql` and you apply them to `hisn-talent` by hand.
- Branch name: `abdulaziz/<task-id>-<slug>`, task id zero-padded to two digits (e.g. `abdulaziz/A-04-rls-core`). PR title: `<task-id> · <what it does>` (e.g. `A-04 · RLS for profiles, events, registrations`).
- **⇄** marks a task you may do out of order or in parallel.

---

## A-1 · Accounts, access and production settings (plan T0)

**Date:** Thu 12 Nov.

**Build:** Owner-only setup in dashboards; no code.

**Files:** none.

**Interfaces:** the settings below.
- [ ] **First thing Thursday morning:** create the private GitHub repo `hisn-web` (empty), add Abdulrahman and Abdullah as collaborators, and tell Abdulrahman to push the bare app straight to `main` (D1-1). Turn on branch protection (below) right after that first push. Then Abdullah and you clone it.
- [ ] Supabase organizations (spec §5.1): **Hisn Dev** (you + Abdulrahman + Abdullah) with `hisn-dev`; **Hisn Prod** (you only, Pro) with `hisn-prod`; **Hisn Talent** (you only, Pro) with `hisn-talent`.
- [ ] Supabase Auth on `hisn-dev` and `hisn-prod`: Email provider on; OTP length `6`; OTP expiry `600` s; custom SMTP = Resend (`smtp.resend.com`, port `465`, user `resend`, password = Resend API key; sender `noreply@hisn-sa.org`, name `حصن`). "Confirm signup" and "Magic Link" templates both show `{{ .Token }}` (Arabic text, **no link**). Site URL = the Vercel production address; redirect URLs include `https://*-<team>.vercel.app/**`.
- [ ] Vercel: new project for phase 2 linked to the GitHub repo. Developers have the **Developer** role without Full Production Deployment or Environment Variable Manager. Settings → Git → turn off automatic production deployments from `main` (A-8 deploys through GitHub Actions).
- [ ] Vercel preview env: `hisn-dev` URL and keys, `TALENT_SUPABASE_URL`/`TALENT_SUPABASE_ANON_KEY` = `hisn-dev` values, `TOKEN_SECRET` (dev), `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY` (a second key), `EMAIL_ALLOWLIST` (the three team emails), `SITE_URL` (`https://$VERCEL_URL` is fine), `CRON_SECRET` (dev).
- [ ] GitHub: branch protection on `main`: PR required, your review required, required checks (`checks` now; `db` and `e2e` added in A-7), no force pushes. Create environment `production`, deployment branches = `main` only, required reviewer = you.
- [ ] Resend: hisn-sa.org status. If not verified: add the SPF and DKIM records in Cloudflare now (DNS only, not proxied). Add DMARC: `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:Contact@Hisn-sa.org`.
- [ ] Sentry: project `hisn-web` (Next.js); invite Abdulrahman and Abdullah.
- [ ] Send Abdulrahman by **Fri 13 Nov noon**: the six departments as `{ code, slug, icon }` (codes `UPPER_SNAKE`, Latin slugs, Lucide icon names) and the majors list as `{ code, ar, en }` (general fields seeded from KFUPM's programs, `OTHER` last), plus the teaser's colour hex values.
- [ ] Post the confirmation for each item in the WhatsApp group.

**Needs first:** nothing.

**Blocks:** everyone (the repo, Thu 12 morning); Abdulrahman (D1-2 data files), Abdullah (D2-5 preview sign-in), A-7/A-8.

**Tests to write:** none.

**Done when:** every box above is checked and posted.

---

## A-2 · Environment schema, database clients and Supabase config (plan T4)

**Date:** Fri 13 Nov.

**Build:** The validated server environment, the three production clients, the isolated talent client, and the local Supabase configuration (OTP settings, mail-catcher SMTP port, Arabic code templates).

**Files:**
- `supabase/config.toml` (`supabase init`), `supabase/templates/otp.html`
- `lib/env.ts`, `lib/db/prod.ts`, `lib/db/talent.ts`
- Modify `.env.example`
- `tests/unit/talent-isolation.test.ts`, `tests/unit/env.test.ts`

**Interfaces — produces:**
```ts
// lib/env.ts ('server-only')
export type ServerEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string; NEXT_PUBLIC_SUPABASE_ANON_KEY: string; SUPABASE_SERVICE_ROLE_KEY: string;
  TOKEN_SECRET: string;                       // min 32 chars
  EMAIL_TRANSPORT: 'resend' | 'smtp'; RESEND_API_KEY?: string; SMTP_HOST?: string; SMTP_PORT?: number;
  SITE_URL: string; CRON_SECRET: string; EMAIL_ALLOWLIST?: string; NEXT_PUBLIC_SENTRY_DSN?: string;
  RESEND_WEBHOOK_SECRET?: string              // required by A-18's route; absent locally until then
}
export function serverEnv(): ServerEnv   // zod-parsed once, cached; throws listing missing names
// The talent variables are deliberately NOT here. Only lib/db/talent.ts reads them.

// lib/db/prod.ts
export async function supabaseProdServer(): Promise<SupabaseClient>   // @supabase/ssr createServerClient with await cookies()
export function supabaseProdBrowser(): SupabaseClient                  // createBrowserClient
export function supabaseProdService(): SupabaseClient                  // 'server-only'; service key; auth.persistSession false

// lib/db/talent.ts ('server-only')
export type TalentRow = {
  user_id: string; kind: 'submission' | 'withdrawal';
  email?: string; full_name_ar?: string; major_code?: string; major_other?: string | null;
  academic_level_code?: string; gender?: 'male' | 'female';
  answers?: Record<string, unknown>; fields_version?: string; consent?: boolean; consent_version?: string
}
export async function insertTalentEntry(row: TalentRow): Promise<void>
// createClient(process.env.TALENT_SUPABASE_URL!, process.env.TALENT_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
// const { error } = await client.from('talent_entries').insert(row)   ← no .select(), ever
// if (error) throw error
```
- Comment at the top of `lib/db/talent.ts`: `// Write-only by design (HR-1). Reading talent data from the site is forbidden. Never add .select() or a read policy.`
- `supabase/config.toml`: `[auth.email] otp_length = 6`, `otp_expiry = 600`; `[inbucket] smtp_port = 54325` (uncommented); `[auth.email.template.confirmation]` and `[auth.email.template.magic_link]` with `content_path = "./supabase/templates/otp.html"` and an Arabic subject; `otp.html` shows `{{ .Token }}` and no link.
- `.env.example` adds: `TALENT_SUPABASE_URL`, `TALENT_SUPABASE_ANON_KEY` (locally = the local URL and anon key), `SUPABASE_JWT_SECRET`, `SUPABASE_DB_URL`, `MAIL_CATCHER_URL`, `TALENT_FORM_OPEN=false`, `LIBRARY_REQUIRES_SIGN_IN=false`, `EMAIL_TRANSPORT=smtp`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=54325`, `SITE_URL=http://localhost:3000`.

**Needs first:** D1-1.

**Blocks:** Abdulrahman (all database reads), Abdullah (D2-1 local setup, D2-4 onwards).

**Tests to write:**
- `talent-isolation.test.ts`:
  - Search every `.ts`/`.tsx` file under `app/`, `components/`, `lib/` for imports of `lib/db/talent`; the only importer is `app/talent/actions.ts` (passes trivially until A-11 adds it).
  - Search every file except `lib/db/talent.ts` for `TALENT_SUPABASE_`; no matches.
  - `insertTalentEntry({ user_id: 'u', kind: 'withdrawal' })` with a mocked client: `insert` called once with that row; `select` never called.
  - Mocked `insert` returning `{ error: { message: 'denied' } }` → `insertTalentEntry` rejects with `'denied'`.
- `env.test.ts`: with `TOKEN_SECRET='short'` → `serverEnv()` throws, and the message contains `TOKEN_SECRET`.

**Done when:** `npm run typecheck && npm test -- tests/unit/talent-isolation.test.ts tests/unit/env.test.ts` passes and `supabase start` runs with the new config.

---

## A-3 · Core production tables (plan T3)

**Date:** Fri 13 Nov (afternoon) – Sat 14 Nov.

**Build:** Every `hisn-prod` table from spec §9.1, including `event_private`, with checks, indexes, `updated_at` triggers, and row-level security **enabled** on every table. Policies come in A-4/A-5; until then, nothing is readable through the API.

**Files:**
- `supabase/migrations/<timestamp>_core.sql`
- `supabase/tests/schema.test.sql`

**Interfaces — produces (exact names):**
- `profiles(id uuid pk references auth.users on delete cascade, email text not null, full_name_ar text not null check (char_length(full_name_ar) between 2 and 100), major_code text not null check (major_code in (<majors codes>)), major_other text, academic_level_code text not null check (academic_level_code in ('BACHELOR','MASTER','PHD')), gender text not null check (gender in ('male','female')), announcements_opt_in boolean not null default false, announcements_updated_at timestamptz not null default now(), is_admin boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`, plus check `profiles_major_other_chk`: `(major_code = 'OTHER' and char_length(trim(major_other)) between 2 and 80) or (major_code <> 'OTHER' and major_other is null)`.
- `events(id bigint generated always as identity pk, title text not null, description text not null, department_code text check (department_code in (<department codes>)), starts_at timestamptz not null, ends_at timestamptz not null, format text not null check (format in ('in_person','online')), location text, presenter text, capacity int check (capacity > 0), registration_closes_at timestamptz not null, status text not null default 'draft' check (status in ('draft','published','cancelled')), image_url text, recording_url text, announcement_started_at timestamptz, created_at, updated_at)`, check `ends_at > starts_at`, check `format <> 'in_person' or location is not null`.
- `event_private(event_id bigint pk references events on delete cascade, meeting_url text not null)`.
- `registrations(id bigint identity pk, event_id bigint not null references events, user_id uuid not null references profiles, status text not null check (status in ('registered','waitlisted','cancelled')), waitlisted_at timestamptz, promoted_at timestamptz, registration_version int not null default 1, created_at timestamptz not null default now(), cancelled_at timestamptz, unique (event_id, user_id))`; index `(event_id, status)`. `registration_version` goes up by 1 each time a cancelled row is reused (D2-9, D2-10); cancel links carry it, so an old link can't cancel a newer registration.
- `signups(id bigint identity pk, email text not null, source text not null check (source in ('teaser','footer','import')), created_at)`; unique index on `lower(trim(email))`.
- `email_unsubscribes(email text pk check (email = lower(trim(email))), source text not null check (source in ('link','header','profile','bounce','complaint')), created_at)`. Every writer stores the normalized email; the check makes a raw value impossible.
- `email_deliveries(id bigint identity pk, event_id bigint references events, registration_id bigint references registrations, kind text not null check (kind in ('announcement','confirmation','promoted','waitlist_joined','cancel_confirmation','event_cancelled','event_changed')), email text not null, status text not null default 'queued' check (status in ('queued','sent','failed','skipped')), provider_message_id text, batch_key text, error text, created_at timestamptz not null default now(), attempted_at timestamptz)`; indexes `(status, created_at)` and `(event_id, kind, status)`.
- `talent_submission_log(user_id uuid pk references profiles on delete cascade, submitted_at timestamptz, withdrawn_at timestamptz)`.
- Trigger function `set_updated_at()` on `profiles` and `events`.
- `alter table … enable row level security` on all eight tables.
- Major and department codes are copied from `data/*.json` exactly (A-8's test enforces this).

**Needs first:** A-2, D1-2.

**Blocks:** everyone's database work.

**Tests to write** (`supabase/tests/schema.test.sql`, as `postgres`):
- `has_table` for all eight tables.
- A profile with `major_code = 'OTHER'` and `major_other = null` → `throws_ok(…, '23514')`.
- A profile with `major_code = '<first non-OTHER code>'` and `major_other = 'x'` → `throws_ok(…, '23514')`.
- `gender = 'x'` → `23514`; `academic_level_code = 'NOPE'` → `23514`.
- An event with `ends_at = starts_at` → `23514`; `capacity = 0` → `23514`; in-person with `location = null` → `23514`.
- Two registrations with the same `(event_id, user_id)` → `throws_ok(…, '23505')`.
- `email_deliveries.status = 'bogus'` → `23514`.
- Signups `'Ali@x.com'` then `' ali@x.com'` → `23505`.
- Updating an event bumps `updated_at`.
- A new registration row has `registration_version = 1`.

**Done when:** `supabase db reset && supabase test db` passes.

---

## A-4 · Row-level security: profiles, events, registrations + test helpers (plan T3)

**Date:** Sun 15 Nov.

**Build:** The `is_admin()` helper, policies and column privileges for `profiles`, `events`, `event_private` and `registrations`, and the `tests` schema of SQL helpers everyone's pgTAP tests use.

**Files:**
- `supabase/migrations/<timestamp>_rls_core.sql`
- `supabase/seed.sql` (create it with the `tests` schema only; A-6 adds data)
- `supabase/tests/rls_core.test.sql`

**Interfaces — produces:**
```sql
public.is_admin() returns boolean  -- language sql stable security definer set search_path = public
  -- select coalesce((select is_admin from profiles where id = auth.uid()), false); grant to anon, authenticated
```
- **profiles:** `revoke insert, update on profiles from authenticated, anon`; `grant insert (id, email, full_name_ar, major_code, major_other, academic_level_code, gender, announcements_opt_in, announcements_updated_at) on profiles to authenticated`; `grant update (full_name_ar, major_code, major_other, academic_level_code, gender, announcements_opt_in, announcements_updated_at) on profiles to authenticated`. Policies: insert `with check (id = auth.uid() and email = auth.jwt() ->> 'email')`; select `using (id = auth.uid() or is_admin())`; update `using (id = auth.uid()) with check (id = auth.uid())`.
- **events:** select `using (status in ('published','cancelled') or is_admin())` for `anon, authenticated`; insert/update/delete `using/with check (is_admin())` for `authenticated`.
- **event_private:** all operations `using/with check (is_admin())` for `authenticated`; nothing for `anon`.
- **registrations:** select `using (user_id = auth.uid() or is_admin())`; **no** insert/update/delete policies (writes only through Abdullah's functions).
- **`tests` schema (in `seed.sql`; never in a migration).** The data helpers below are `security definer`, owned by `postgres`, with `set search_path = public, auth`, so they work **while a test is logged in** as anon or as a user (otherwise row-level security would block them: `profiles` insert requires `id = auth.uid()`, and `registrations` has no insert policy at all).
```sql
-- Data helpers: SECURITY DEFINER, owner postgres, set search_path = public, auth
tests.create_user(p_email text, p_with_profile boolean default true, p_is_admin boolean default false) returns uuid
  -- inserts auth.users (id, email); if p_with_profile inserts profiles with defaults
  -- (full_name_ar 'مستخدم تجريبي', major_code <first code>, academic_level_code 'BACHELOR', gender 'male')
tests.create_event(p_capacity int default null, p_status text default 'published', p_starts_in interval default '7 days',
                   p_closes_in interval default null, p_format text default 'in_person') returns bigint
  -- ends_at = starts_at + 2 hours; registration_closes_at = now() + coalesce(p_closes_in, p_starts_in);
  -- location 'قاعة 1' when in_person; online also inserts event_private (id, 'https://meet.example/' || id)
tests.add_registration(p_user uuid, p_event bigint, p_status text default 'registered') returns bigint
  -- waitlisted rows get waitlisted_at = clock_timestamp()
tests._user_email(p_user uuid) returns text  -- select email from auth.users where id = p_user

-- Role helpers: SECURITY INVOKER (must not be definer). Postgres refuses to change "role" inside a
-- security-definer function ("cannot set parameter role within security-definer function").
tests.login_as(p_user uuid) returns void     -- v := tests._user_email(p_user); then set_config('role','authenticated',true)
                                             -- and request.jwt.claims {sub, email: v, role} (works while already logged in)
tests.login_anon() returns void              -- role 'anon', claims {"role":"anon"}
tests.logout() returns void                  -- role 'postgres' (allowed because the session user is postgres)
-- grant usage on schema tests and execute on all its functions to anon, authenticated
```

**Needs first:** A-3.

**Blocks:** Abdullah (D2-6 onwards), Abdulrahman (D1-8, D1-13).

**Tests to write** (`supabase/tests/rls_core.test.sql`):
- As a user, inserting own profile with `is_admin = true` → `throws_ok(…, '42501')`.
- As a user, inserting a profile whose `email` differs from the JWT email → `throws_ok(…, '42501')`.
- As a user, `update profiles set is_admin = true where id = <self>` → `42501`.
- As a user, `update profiles set email = 'x@y.com' where id = <self>` → `42501`.
- As user A, `select count(*) from profiles where id = <B>` → `0`.
- As admin, `select count(*) from profiles` → all rows.
- As anon, `select * from event_private` → `0` rows. As a non-admin user → `0` rows. As admin → the row exists.
- As anon, a draft event → `0` rows; published and cancelled → visible.
- As admin, a draft event → visible.
- As user A, `select count(*) from registrations` → only A's rows. As admin → all.
- As a non-admin user, `insert into events …` → `42501`. As admin → succeeds.
- As a user, `insert into registrations …` directly → `42501`.
- After `tests.login_as(A)`: `tests.create_user('helper@test.local')` → `lives_ok`; `tests.add_registration(A, <event>)` → `lives_ok`; `tests.login_as(B)` → `lives_ok` and `auth.uid() = B`.

**Done when:** `supabase db reset && supabase test db` passes.

---

## A-5 · Row-level security: signups, email tables, talent log + newsletter function (plan T3)

**Date:** Mon 16 Nov.

**Build:** Access rules for the remaining tables, and the newsletter function, which becomes the **only** way into `signups` (the teaser and the footer both call it). It rejects malformed addresses so they never reach the announcement audience.

**Files:**
- `supabase/migrations/<timestamp>_rls_rest.sql`
- `supabase/tests/rls_rest.test.sql`

**Interfaces — produces:**
- **signups:** `revoke all on signups from anon, authenticated`; **no** policies. Nobody inserts directly; the teaser switches to `newsletter_signup` in A-9.
- **email_unsubscribes**, **email_deliveries:** no policies (server only, through the service key).
- **talent_submission_log:** select `using (user_id = auth.uid())` for `authenticated` — **no admin clause**; no write policies (server writes through the service key).
```sql
newsletter_signup(p_email text, p_source text default 'footer') returns void
  -- security definer set search_path = public; grant execute to anon, authenticated
  -- v := lower(trim(p_email));
  -- if v is null or char_length(v) > 254 or v !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
  --   then raise exception 'invalid_email' using errcode = '22023';
  -- if p_source not in ('teaser','footer') then raise exception 'invalid_source' using errcode = '22023';
  -- insert into signups (email, source) values (v, p_source) on conflict ((lower(trim(email)))) do nothing;
  -- Nothing else. No delete from email_unsubscribes, no update to profiles (spec §10.2).
```
- **Why it only inserts:** the function is granted to `anon` and accepts any address, so it cannot prove the caller owns the email. If it removed unsubscribes or set `announcements_opt_in`, anyone could type someone else's address into the footer and reverse that person's explicit unsubscribe. A signed-in person opts back in only through `saveProfile` (D2-6), whose `account` context removes the unsubscribe row.

**Needs first:** A-4.

**Blocks:** Abdulrahman (D1-6), Abdullah (D2-6, D2-13).

**Tests to write** (`supabase/tests/rls_rest.test.sql`):
- As anon, `insert into signups …` → `throws_ok(…, '42501')`; `select` from `signups` → `throws_ok(…, '42501')`.
- As postgres, `'Ali@x.com'` then `'ali@x.com '` → `23505`.
- `newsletter_signup(' Ali@x.com')` with an existing unsubscribe row for `ali@x.com` → exactly 1 `signups` row for `ali@x.com`; the unsubscribe row is **still present**. Calling it again → no error, still 1 row, unsubscribe row still present. (That this email is then absent from `announcement_audience()` is asserted in D2-13's `tests/db/audience.test.ts`, because that function is created in D2-13, after this migration.)
- As anon and as a user: `select` from `email_unsubscribes` and `email_deliveries` → `0` rows.
- As user A, `talent_submission_log` → only A's row. As admin → `0` rows.
- As anon: `newsletter_signup('not-an-email')` → `throws_ok(…, '22023')`; `newsletter_signup('a@b')` → `22023`; `newsletter_signup('a@b.com', 'evil')` → `22023`; `newsletter_signup('ok@x.com', 'teaser')` → `lives_ok`, and the row has `source = 'teaser'`.
- A profile `p@x.com` with `announcements_opt_in = false` → after `newsletter_signup('P@x.com')` it is still `false`, and `announcements_updated_at` is unchanged.
- As postgres, `insert into email_unsubscribes (email, source) values ('A@X.com', 'link')` → `throws_ok(…, '23514')`.

**Done when:** `supabase db reset && supabase test db` passes.

---

## A-6 · Seed data, test fixtures and database test helpers (plan T3, T6)

**Date:** Tue 17 Nov.

**Build:** Realistic fake data covering every event state, a fixture file with the seed ids for tests, and the Vitest helpers for database tests. Also run the real-inbox sign-in test.

**Files:**
- Modify `supabase/seed.sql` (data after the `tests` schema)
- `tests/fixtures/seed.ts`
- `tests/db/helpers.ts`
- `tests/db/seed.test.ts`

**Interfaces — produces:**
```ts
// tests/fixtures/seed.ts
export const SEED = {
  admin: { id: '00000000-0000-4000-8000-0000000000a1', email: 'admin@test.local' },
  user: (n: number) => ({ id: `00000000-0000-4000-8000-0000000000${String(n).padStart(2,'0')}`, email: `u${String(n).padStart(2,'0')}@test.local` }), // n = 1..30
  events: { open: 101, fullWithWaitlist: 102, unlimited: 103, draft: 104, cancelled: 105,
            pastWithRecording: 106, pastNoRecording: 107, closed: 108, almostFull: 109, onlineOpen: 110 },
} as const

// tests/db/helpers.ts — env from `supabase status` (SUPABASE_DB_URL, SUPABASE_JWT_SECRET, NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)
export async function pgAdmin(): Promise<pg.Client>                     // connected as postgres
export function clientAs(user: { id: string; email: string }): SupabaseClient
  // JWT { sub, email, role: 'authenticated', aud: 'authenticated', exp: now + 3600 } signed HS256 with SUPABASE_JWT_SECRET
export function anonClient(): SupabaseClient
export async function createUser(opts?: { withProfile?: boolean; isAdmin?: boolean; email?: string }): Promise<{ id: string; email: string }>
export async function createEvent(opts?: { capacity?: number | null; status?: 'draft' | 'published' | 'cancelled';
  startsIn?: string; closesIn?: string | null; format?: 'in_person' | 'online' }): Promise<number>   // intervals like '7 days'
export async function addRegistration(userId: string, eventId: number,
  status?: 'registered' | 'waitlisted' | 'cancelled'): Promise<number>
```
Seed contents (all times relative to `now()` so the seed never goes stale):

| id | status | when | format | dept | capacity | rows |
|---|---|---|---|---|---|---|
| 101 open | published | +7 days | in_person | 1st | 30 | 5 registered |
| 102 fullWithWaitlist | published | +10 days | online | 2nd | 10 | 10 registered, 3 waitlisted |
| 103 unlimited | published | +14 days | in_person | 3rd | null | 2 registered |
| 104 draft | draft | +5 days | in_person | 1st | 20 | — |
| 105 cancelled | cancelled | +6 days | in_person | 2nd | 20 | 2 registered |
| 106 pastWithRecording | published | −7 days | in_person | 1st | 30 | `recording_url = 'https://youtu.be/dQw4w9WgXcQ'` |
| 107 pastNoRecording | published | −3 days | online | 4th | 30 | — |
| 108 closed | published | +2 days, closes −1 hour | in_person | 5th | 30 | 1 registered |
| 109 almostFull | published | +3 days | in_person | 4th | 30 | 25 registered |
| 110 onlineOpen | published | +4 days | online | 6th | 50 | — |

Online events get `event_private` rows `https://meet.example/<id>`. Users: admin + `u01`–`u30`; majors cycle through all codes, with `u10`, `u20`, `u30` = `OTHER` (`major_other` `'Mechanical Engineering'`, `'Physics'`, `'Law'`); levels cycle `BACHELOR`, `MASTER`, `PHD`; gender alternates `male`/`female`; `announcements_opt_in = true` for odd numbers. Signups: `s01@signup.test` … `s10@signup.test` plus `u02@test.local`. Unsubscribes: `u03@test.local` (`link`), `s02@signup.test` (`header`), `nobody@test.local` (`profile`). Event ids are inserted with `overriding system value`, then the identity sequence is reset past 1000.

**Real-inbox test (same day):** on Abdullah's preview, request a sign-in code to your Gmail and to your `@kfupm.edu.sa` address. Record for each: seconds to arrive, inbox or junk, and whether the Arabic subject displays correctly. Post the results in the WhatsApp group.

**Needs first:** A-5; D2-5 on a preview for the inbox test.

**Blocks:** Abdulrahman (D1-8 onwards), Abdullah (D2-6 onwards).

**Tests to write** (`tests/db/seed.test.ts`):
- `clientAs(SEED.admin)` selects event `SEED.events.draft` → 1 row; `anonClient()` → 0 rows.
- Event 102 has exactly 10 `registered` and 3 `waitlisted` rows.
- `createEvent({ capacity: 1 })` returns an id > 1000; `addRegistration` on it returns an id.

**Done when:** `npm run db:reset && npm run test:db -- tests/db/seed.test.ts` passes, and the inbox results are posted.

---

## A-7 · CI database, script and E2E jobs (plan T2)

**Date:** Wed 18 Nov – Thu 19 Nov (two days: includes setting up Supabase inside GitHub Actions).

**Build:** Extend Abdulrahman's PR workflow so every pull request starts a throwaway Supabase, applies all migrations on the seed, and runs pgTAP, database, script and end-to-end tests. Also a script that writes `.env.local` from `supabase status`, used by CI and by developers.

**Files:**
- Modify `.github/workflows/pr.yml` (add jobs `db` and `e2e`)
- `scripts/ci/apply-talent.sh`, `scripts/ci/write-env.sh`
- `tests/fixtures/talent-consent-final.md` (two short Arabic paragraphs, no «مؤقت»)
- Modify `package.json`: `db:reset` → `supabase db reset && bash scripts/ci/apply-talent.sh`; add `env:local` → `bash scripts/ci/write-env.sh`

**Interfaces — produces:**
- `apply-talent.sh`: for each `talent/migrations/*.sql` in name order, then `talent/seed.sql` if present: `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f <file>`. Exits 0 when the folder is empty.
- `write-env.sh`: writes `.env.local` from `supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY --override-name auth.jwt_secret=SUPABASE_JWT_SECRET --override-name db.url=SUPABASE_DB_URL`, then appends `TALENT_SUPABASE_URL`/`TALENT_SUPABASE_ANON_KEY` (= the same local values), `TOKEN_SECRET=local-test-secret-0123456789abcdef0123`, `CRON_SECRET=local-cron`, `EMAIL_TRANSPORT=smtp`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=54325`, `SITE_URL=http://localhost:3000`, `MAIL_CATCHER_URL=http://127.0.0.1:54324`, `TALENT_FORM_OPEN=false`.
- Job `db`: `supabase/setup-cli@v1` → `supabase start` → `npm run db:reset` → `npm run env:local` → `supabase test db` → `npm run test:db` → `npm run test:scripts`.
- Job `e2e`: same start + reset + env → `npx playwright install --with-deps chromium`, then two runs in sequence:
  - **Run 1 (talent form closed):** `npm run test:e2e -- --grep-invert @talent-open --pass-with-no-tests` (uses `TALENT_FORM_OPEN=false` from `.env.local`).
  - **Run 2 (talent form open):** `cp tests/fixtures/talent-consent-final.md content/talent-consent/v1.md` → `TALENT_FORM_OPEN=true npm run test:e2e -- --grep @talent-open --pass-with-no-tests`. Playwright's `webServer` rebuilds the app, so the copied consent is compiled in. The copy exists only inside the CI job; it is never committed. (The process environment wins over `.env.local`.)
  - Which spec belongs to which run is set in D2-16 (`talent-closed.spec.ts` → run 1, `talent-open.spec.ts` → run 2).
- Add `db` and `e2e` to the required checks on `main`.
- Until this merges, PRs with database tests include pasted local output of `supabase test db` in the description.

**Needs first:** D1-4, A-6.

**Blocks:** Abdullah (D2-16 runs in the `e2e` job).

**Tests to write:** none in code. Verification below.

**Done when:** a throwaway PR containing a deliberately broken migration (`select * from nope;`) fails at `npm run db:reset` in job `db`; after reverting, all three jobs pass.

---

## A-8 · Deploy pipeline and code-consistency test (plan T2)

**Date:** Fri 20 Nov.

**Build:** On merge to `main`: migrate `hisn-dev`, then (in the `production` environment) migrate `hisn-prod`, then deploy production. A failed migration stops the deploy. Also a test that fails if the database's allowed codes drift from the data files.

**Files:**
- `.github/workflows/main.yml`
- `tests/unit/codes-match.test.ts`

**Interfaces — produces:**
- `main.yml`, `on: push: branches: [main]`:
  - job `migrate-dev`: `supabase link --project-ref ${{ secrets.DEV_PROJECT_REF }}` + `supabase db push` (secrets `SUPABASE_ACCESS_TOKEN`, `DEV_DB_PASSWORD`).
  - job `migrate-prod` (`needs: migrate-dev`, `environment: production`): same with `PROD_PROJECT_REF`, `PROD_DB_PASSWORD`.
  - job `deploy` (`needs: migrate-prod`, `environment: production`): `vercel pull --yes --environment=production --token=$VERCEL_TOKEN` → `vercel build --prod` → `vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN`.
- Vercel production env (set by you): `hisn-prod` URL and keys, `TALENT_SUPABASE_URL` + `TALENT_SUPABASE_ANON_KEY` = **`hisn-talent`** URL and anon key (set after A-10 is applied there), a fresh `TOKEN_SECRET`, `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY` (production key), `SITE_URL` = the private production address, `CRON_SECRET`, `TALENT_FORM_OPEN=false`, `LIBRARY_REQUIRES_SIGN_IN=false`, `NEXT_PUBLIC_SENTRY_DSN`, and `RESEND_WEBHOOK_SECRET` (added in A-18).
- Lower the Cloudflare TTL on the hisn-sa.org records to 60 s today, a day before the rehearsal (A-16, Sat 21).
- `codes-match.test.ts`: for `major_code`, `academic_level_code`, `department_code`, take the **last** `<column> in ( … )` list found across `supabase/migrations/*.sql` (by filename order), and separately across `talent/migrations/*.sql` for `major_code` and `academic_level_code`; each set must equal the codes in `data/*.json`.

**Needs first:** A-7.

**Blocks:** production deploys for everyone.

**Tests to write:**
- `codes-match.test.ts` passes on the real files.
- The same comparison on a temporary fixture migration with one extra code → fails, and the message names the extra code.

**Done when:** `npm test -- tests/unit/codes-match.test.ts` passes, and the next merge to `main` shows `migrate-dev` → `migrate-prod` → `deploy` green with the private production address updated.

---

## A-9 · Teaser data migration (plan T5)

**Date:** Sat 21 Nov (morning).

**Build:** Move phase 1 signups into `hisn-prod`, point the teaser at `hisn-prod`, and close the old project.

**Files:** teaser repo `js/script.js` (outside this repo).

**Interfaces:** `signups (email, source = 'import')`.
- [ ] Export the old `signups`; normalize `lower(trim(email))`; drop case-duplicates; import into `hisn-prod` with `source = 'import'`.
- [ ] Edit the teaser's `js/script.js`: `hisn-prod` URL and **public** anon key, and replace the direct table insert with `supabase.rpc('newsletter_signup', { p_email, p_source: 'teaser' })` (the teaser's own variable name is outside this repo's lint). Redeploy the teaser; submit a test email → it appears in `hisn-prod.signups` with `source = 'teaser'`; submit `not-an-email` → rejected.
- [ ] Remove the insert policy on the old project; submit again → rejected.

**Needs first:** A-8 (`hisn-prod` migrated).

**Blocks:** nobody.

**Tests to write:** none.

**Done when:** imported count = old count minus duplicates, and both test submissions behave as stated.

---

## A-16 · Domain switch rehearsal (plan T24)

**Date:** Sat 21 Nov (afternoon, after A-9). It needs only the deployed new project (A-8) and the TTL lowered on Fri 20.

**Build:** Rehearse the switch and the rollback on a subdomain and time every step.

**Files:** `docs/launch-runbook.md`.

- [ ] Check whether Vercel gives a different DNS target for the new project than for the teaser project.
- [ ] In Cloudflare, `rehearsal.hisn-sa.org` CNAME → teaser project (DNS only). Add it to the teaser Vercel project; wait for SSL.
- [ ] Switch: remove from teaser project → add to new project → update the CNAME if the target differs → wait for SSL. Record minutes per step.
- [ ] Rollback: the reverse. Record minutes per step.
- [ ] Write the timed steps into `docs/launch-runbook.md`.

**Needs first:** A-8.

**Blocks:** A-17.

**Tests to write:** none.

**Done when:** `docs/launch-runbook.md` lists every step with measured minutes for switch and rollback.

---

## A-10 · Talent schema (plan T19)

**Date:** Sat 21 Nov (evening, after A-9 and A-16) – Sun 22 Nov.

**Build:** The `hisn-talent` table with insert-only access for the site's key, checks for submissions and withdrawals, the private export view, and fake talent seed data for local, CI and `hisn-dev`.

**Files:**
- `talent/migrations/0001_talent.sql`
- `talent/seed.sql`
- `supabase/tests/talent.test.sql`

**Interfaces — produces:**
- `talent_entries(id bigint identity pk, user_id uuid not null, kind text not null check (kind in ('submission','withdrawal')), email text, full_name_ar text, major_code text check (major_code in (<majors codes>)), major_other text, academic_level_code text check (academic_level_code in ('BACHELOR','MASTER','PHD')), gender text check (gender in ('male','female')), answers jsonb, fields_version text, consent boolean, consent_version text, consented_at timestamptz not null default now(), created_at timestamptz not null default now())`.
- Check `talent_kind_shape`:
  - `kind = 'submission'` → `email, full_name_ar, major_code, academic_level_code, gender, answers, fields_version, consent_version` not null, `consent = true`, `jsonb_typeof(answers) = 'object'`, `pg_column_size(answers) < 20000`, and the same `major_other` rule as `profiles`.
  - `kind = 'withdrawal'` → `email, full_name_ar, major_code, major_other, academic_level_code, gender, answers, fields_version, consent, consent_version` all null.
- Index `(user_id, created_at desc)`.
- Access: `enable row level security`; `revoke all on talent_entries from anon, authenticated, public`; `grant insert on talent_entries to anon`; `grant usage on sequence talent_entries_id_seq to anon`; policy `talent_insert` `for insert to anon with check (true)`. **No select, update or delete for anyone but the owner's direct connection.**
- `create schema private; revoke all on schema private from public, anon, authenticated;`
- View `private.talent_export`: `select distinct on (user_id) * from talent_entries order by user_id, created_at desc, id desc` wrapped so that rows whose latest `kind = 'withdrawal'` are excluded. Columns: `user_id, email, full_name_ar, major_code, major_other, academic_level_code, gender, answers, fields_version, consent_version, consented_at, created_at`.
- `talent/seed.sql` (fake data, never applied to `hisn-talent`): `SEED.user(1)` two submissions (older and newer), `SEED.user(2)` submission then withdrawal, `SEED.user(3)` one submission; matching `talent_submission_log` rows.
- After review: apply `0001_talent.sql` to `hisn-talent` yourself (`psql "<hisn-talent connection string>" -f talent/migrations/0001_talent.sql`), then set its URL and anon key in Vercel production env.

**Needs first:** A-7 (`apply-talent.sh`).

**Blocks:** A-11, A-12, A-13.

**Tests to write** (`supabase/tests/talent.test.sql`):
- As anon, inserting a valid submission → `lives_ok`.
- As anon, `select * from talent_entries` → `throws_ok(…, '42501')`.
- As anon, `select * from private.talent_export` → `throws_ok(…, '42501')`.
- A submission with `consent = false` → `23514`; with `consent_version = null` → `23514`.
- A withdrawal with `answers = '{}'` → `23514`.
- A submission with `answers = '[]'` → `23514`.
- As postgres, `private.talent_export` returns exactly one row for `SEED.user(1)` (the newer submission), none for `SEED.user(2)`, one for `SEED.user(3)`.

**Done when:** `npm run db:reset && supabase test db` passes.

---

## A-11 · Talent fields, consent, flags and server action (plan T19)

**Date:** Mon 23 Nov.

**Build:** The single module that defines the talent fields (provisional set), the versioned consent text, the open/closed flag that can never open without final consent, and the submit and withdraw actions in the order spec §8.6 fixes.

**Files:**
- `lib/talent/fields.ts`, `lib/talent/consent.ts`
- `content/talent-consent/v1.md` (placeholder containing «مؤقت»)
- Modify `lib/config/flags.ts` (Abdulrahman created it in D1-12)
- `app/talent/actions.ts`
- `tests/unit/talent-fields.test.ts`, `tests/unit/talent-flags.test.ts`, `tests/db/talent-action.test.ts`

**Interfaces — produces:**
```ts
// lib/talent/fields.ts
export const FIELDS_VERSION = 'provisional-1'
export type TalentField = {
  key: string; labelKey: StringKey; exportHeader: string;      // English column header for export-talent
  kind: 'text' | 'textarea' | 'year' | 'url' | 'tags'; required: boolean;
  rules?: { min?: number; max?: number; minItems?: number; maxItems?: number; itemMax?: number; host?: 'github.com' }
}
export const talentFields: TalentField[]
export const talentAnswersSchema: z.ZodType<Record<string, unknown>>   // built from talentFields; unknown keys stripped
```
Provisional `talentFields` (spec §7.7), in order:

| key | kind | required | rules | exportHeader |
|---|---|---|---|---|
| `full_name_en` | text | yes | min 2, max 100 | `Name (English)` |
| `graduation_year` | year | yes | min 1980, max 2035 | `Graduation year` |
| `project_title` | text | yes | min 3, max 120 | `Project title` |
| `project_description` | textarea | yes | min 20, max 1500 | `Project description` |
| `skills` | tags | yes | minItems 1, maxItems 20, itemMax 40 | `Skills` |
| `cv_url` | url | yes | must start with `https://` | `CV / portfolio` |
| `github_url` | url | no | host `github.com` | `GitHub` |

```ts
// lib/talent/consent.ts ('server-only')
export const CONSENT_VERSION = 'v1'
export const consentIsFinal: boolean       // false while content/talent-consent/v1.md contains «مؤقت»
export function consentHtml(): string      // paragraphs split on blank lines, HTML-escaped, wrapped in <p>

// lib/config/flags.ts (add)
export const TALENT_FORM_OPEN = process.env.TALENT_FORM_OPEN === 'true' && consentIsFinal

// app/talent/actions.ts ('use server') — the ONLY importer of lib/db/talent
export async function submitTalent(answers: unknown, consent: boolean): Promise<
  { ok: true } | { ok: false; reason: 'closed' | 'needs_profile' | 'invalid' | 'failed'; errors?: FieldErrors }>
export async function withdrawTalent(): Promise<{ ok: boolean }>
```
`submitTalent`, exact order:
1. `!TALENT_FORM_OPEN` → `{ ok: false, reason: 'closed' }`.
2. `getSession()`; none → `throw new Error('unauthenticated')`.
3. Read the caller's profile with `supabaseProdServer()`; none → `{ ok: false, reason: 'needs_profile' }`. There is **no email-domain check**: anyone with a complete profile may submit (spec §7.7, founder decision of 12 Nov).
4. `consent !== true` → `{ ok: false, reason: 'invalid', errors: { consent: 'talent.error.consent' } }`; `talentAnswersSchema` fails → `{ ok: false, reason: 'invalid', errors }`.
5. `insertTalentEntry({ user_id, kind: 'submission', email, full_name_ar, major_code, major_other, academic_level_code, gender` — **all from the profile** `, answers: parsed, fields_version: FIELDS_VERSION, consent: true, consent_version: CONSENT_VERSION })`; error → `reportError(err, { level: 'error', tags: { area: 'talent' } })` → `{ ok: false, reason: 'failed' }`.
6. **Then** upsert `talent_submission_log { user_id, submitted_at: now, withdrawn_at: null }` with `supabaseProdService()`; error → report → `{ ok: false, reason: 'failed' }`.
7. `revalidatePath('/account')`, `revalidatePath('/talent')` → `{ ok: true }`.

`withdrawTalent` (allowed even when the form is closed): session required; `insertTalentEntry({ user_id, kind: 'withdrawal' })` **first**, then upsert the log `withdrawn_at = now`; any error → `{ ok: false }`.

**Needs first:** A-10, D2-5 (`reportError`), D2-7.

**Blocks:** Abdulrahman (D1-17).

**Tests to write:**
- `talent-fields.test.ts`: valid answers for all seven fields parse; `graduation_year: 1979` fails; `skills: []` fails; `cv_url: 'http://x.com'` fails; `github_url: 'https://gitlab.com/a'` fails; `github_url` missing passes; `{ ...valid, email: 'x@y.com' }` parses without `email`.
- `talent-flags.test.ts`: env `TALENT_FORM_OPEN='true'` with the placeholder consent file → `TALENT_FORM_OPEN === false`; with a fixture consent file without «مؤقت» → `true`.
- `tests/db/talent-action.test.ts` (flag forced open via `vi.mock('@/lib/config/flags')`):
  - flag closed → `{ ok: false, reason: 'closed' }`; `insertTalentEntry` not called.
  - user without profile → `needs_profile`.
  - a user whose profile email is `someone@gmail.com` → `{ ok: true }` (no domain gate).
  - valid submit with `answers` containing `email: 'attacker@x.com'` → the inserted talent row has `email` = the profile's email and its `answers` has no `email` key.
  - call order: `insertTalentEntry` before the log upsert (spy order).
  - `insertTalentEntry` rejects → result `failed` and **no** log row written.
  - `withdrawTalent` → a `withdrawal` row inserted, then `withdrawn_at` set in the log.

**Done when:** `npm test -- tests/unit/talent-fields.test.ts tests/unit/talent-flags.test.ts tests/unit/talent-isolation.test.ts && npm run test:db -- tests/db/talent-action.test.ts` passes.

---

## A-12 · Talent export script ⇄ (plan T21)

**Date:** Tue 24 Nov. ⇄ May swap with A-13.

**Build:** The script you run on your own machine to produce the Excel file for partner companies from `private.talent_export`.

**Files:**
- `scripts/export-talent.ts`, `scripts/lib/connect.ts`
- `tests/scripts/export.test.ts`
- Add `.env.owner.local` to `.gitignore`

**Interfaces — produces:**
```
npx tsx scripts/export-talent.ts [--out talent-YYYY-MM-DD.xlsx]
```
```ts
// scripts/lib/connect.ts
export async function connectTalent(): Promise<pg.Client>   // TALENT_DB_URL from .env.owner.local (env override allowed for tests)
export async function connectProd(): Promise<pg.Client>     // PROD_DB_URL, same rules
// Missing .env.owner.local and no env override → exit 1 with 'missing .env.owner.local'

// scripts/export-talent.ts
export async function exportTalent(client: pg.Client, outPath: string): Promise<{ rows: number }>
```
- Library: `exceljs`. One sheet `Talent`. Columns in this exact order: `Email`, `Name (Arabic)`, `Major`, `Academic level`, `Gender`, then one column per `talentFields` entry using `exportHeader`, then `Consent version`, `Consented at (Riyadh)`.
- `Major` = `labelEn('majors', code)`, or `major_other` when the code is `OTHER`. `Academic level` = `labelEn('levels', code)`. `Gender` = `Male` / `Female`. `tags` values joined with `', '`. `Consented at` formatted `YYYY-MM-DD HH:mm` in Asia/Riyadh.
- Default output `talent-<today>.xlsx` in the current folder.

**Needs first:** A-10, A-11.

**Blocks:** nobody (launch checklist).

**Tests to write** (`tests/scripts/export.test.ts`, against the local database with `talent/seed.sql`):
- The file exists and `new ExcelJS.Workbook().xlsx.readFile(path)` succeeds.
- Header row equals `['Email','Name (Arabic)','Major','Academic level','Gender','Name (English)','Graduation year','Project title','Project description','Skills','CV / portfolio','GitHub','Consent version','Consented at (Riyadh)']`.
- Data rows = 2 (`user(1)` latest, `user(3)`; `user(2)` withdrawn).
- An Arabic name (`'عبدالعزيز'`) and an English name (`'Abdulaziz'`) read back unchanged.
- A seed row with `major_code = 'OTHER'`, `major_other = 'Physics'` shows `Physics` under `Major`.

**Done when:** `npm run test:scripts -- tests/scripts/export.test.ts` passes.

---

## A-13 · Talent purge script ⇄ (plan T21)

**Date:** Wed 25 Nov. ⇄ May swap with A-12.

**Build:** Deletion of talent records: per-person on request, and periodic expiry once the retention period is set. Dry run by default.

**Files:**
- `scripts/purge-talent.ts`
- `tests/scripts/purge.test.ts`

**Interfaces — produces:**
```
npx tsx scripts/purge-talent.ts --expired [--apply]
npx tsx scripts/purge-talent.ts --user <email> [--apply]
```
```ts
export async function purgeExpired(t: pg.Client, p: pg.Client, opts: { months: number; apply: boolean }):
  Promise<{ people: number; rows: number }>
export async function purgeUser(t: pg.Client, p: pg.Client, opts: { email: string; apply: boolean }):
  Promise<{ people: number; rows: number }>
```
- `--expired` reads `TALENT_RETENTION_MONTHS` from `lib/config/retention.ts`; when `null` → print `retention not set` and exit with code `2`.
- Expired = people whose **latest** `talent_entries.created_at < now() - <months> months`. Delete all their `talent_entries` rows, then their `talent_submission_log` rows in `hisn-prod`.
- `--user`: `user_id`s with any submission where `lower(email) = normalized`; delete all their rows and log rows.
- Without `--apply`: print `would delete <rows> rows for <people> people`, change nothing. With `--apply`: one transaction per database; print `deleted …`.

**Needs first:** A-10.

**Blocks:** nobody.

**Tests to write** (`tests/scripts/purge.test.ts`, local database):
- Running the CLI with `--expired` while the constant is `null` → exit code `2`, stdout contains `retention not set`.
- `purgeExpired(…, { months: 1, apply: false })` after back-dating `user(3)`'s row by 2 months → returns `{ people: 1, rows: 1 }` and the row still exists.
- Same with `apply: true` → `user(3)`'s talent rows and log row gone; `user(1)`'s rows untouched.
- `purgeUser(…, { email: 'U01@test.local', apply: true })` → only `user(1)`'s 2 rows and log row deleted.

**Done when:** `npm run test:scripts -- tests/scripts/purge.test.ts` passes.

---

## A-18 · Bounce and complaint webhook (decision of 12 Nov on signups)

**Date:** Thu 26 Nov.

**Build:** Resend calls our endpoint when an email hard-bounces or is reported as spam. The address goes into `email_unsubscribes`, so it is never mailed again and bounces stop hurting the sending domain.

**Files:**
- `lib/email/webhook.ts`
- `app/api/webhooks/resend/route.ts`
- `tests/unit/resend-webhook.test.ts`, `tests/db/resend-webhook.test.ts`

**Interfaces — produces:**
```ts
// lib/email/webhook.ts
export type ResendEvent = { type: string; data: { to: string[]; bounce?: { type?: string } } }
export function suppressionFor(e: ResendEvent): { emails: string[]; source: 'bounce' | 'complaint' } | null
// 'email.bounced' with data.bounce.type === 'Permanent' → { emails: data.to.map(normalizeEmail), source: 'bounce' }
// 'email.complained' → { emails: data.to.map(normalizeEmail), source: 'complaint' }
// anything else, including transient bounces → null
// Check the bounce payload against Resend's webhook docs on the day; if the field name differs, keep the rule:
// permanent bounces only.

// app/api/webhooks/resend/route.ts
export async function POST(req: Request): Promise<Response>
// raw body + headers 'svix-id', 'svix-timestamp', 'svix-signature' → new Webhook(serverEnv().RESEND_WEBHOOK_SECRET).verify(…)
//   (package `svix`); failure → new Response(null, { status: 400 })
// suppressionFor(event) → for each email: supabaseProdService() upsert email_unsubscribes { email, source }
//   on conflict (email) do nothing → new Response(null, { status: 200 })
```
- Resend dashboard (production key): add webhook `https://<private production address>/api/webhooks/resend` for events `email.bounced` and `email.complained`; put its signing secret in Vercel production env as `RESEND_WEBHOOK_SECRET`. Update the URL to `https://hisn-sa.org/api/webhooks/resend` at the switch (A-17).

**Needs first:** A-3 (`bounce`/`complaint` sources), A-8.

**Blocks:** launch checklist.

**Tests to write:**
- `resend-webhook.test.ts`:
  - `suppressionFor({ type: 'email.bounced', data: { to: ['A@x.com'], bounce: { type: 'Permanent' } } })` deep-equals `{ emails: ['a@x.com'], source: 'bounce' }`.
  - same with `bounce: { type: 'Transient' }` → `null`.
  - `{ type: 'email.complained', data: { to: ['b@x.com'] } }` → `{ emails: ['b@x.com'], source: 'complaint' }`.
  - `{ type: 'email.delivered', data: { to: ['c@x.com'] } }` → `null`.
- `tests/db/resend-webhook.test.ts` (sign test payloads with `svix` using a test secret):
  - bad signature → status `400`; no row.
  - valid permanent bounce for `x@test.local` → status `200`; row `{ email: 'x@test.local', source: 'bounce' }`; `announcementAudience()` no longer contains it.
  - same event delivered twice → still one row, status `200`.

**Done when:** `npm test -- tests/unit/resend-webhook.test.ts && npm run test:db -- tests/db/resend-webhook.test.ts` passes, and an email from production to `bounced@resend.dev` produces a `bounce` row.

---

## A-14 · Admin CSV exports (plan T18)

**Date:** Fri 27 Nov.

**Build:** Two downloads for the admin: one event's registrations, and all accounts («عموم المسجّلين») regardless of announcement consent. Both open correctly in Excel.

**Files:**
- `lib/csv/to-csv.ts`
- `app/admin/export/[kind]/route.ts`
- `tests/unit/csv.test.ts`, `tests/db/exports.test.ts`

**Interfaces — produces:**
```ts
// lib/csv/to-csv.ts
export function toCsv(rows: Record<string, string | number | null>[], columns: { key: string; header: string }[]): string
// '﻿' + header line + rows; lines joined with '\r\n'; null → ''; a value containing , " \r or \n is wrapped in
// double quotes with inner quotes doubled

// app/admin/export/[kind]/route.ts
export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }): Promise<Response>
// kind ∈ 'event-registrations' (requires ?event=<id>) | 'all-accounts'; anything else → 404
// not admin → 403 (no redirect); Content-Type 'text/csv; charset=utf-8';
// Content-Disposition attachment; filename="registrations-<id>.csv" | "accounts-<YYYY-MM-DD>.csv"
```
- Reads with `supabaseProdServer()` (the admin's own session; admin policies grant access).
- `event-registrations` columns (header text from `ar.json`): name, email, major (Arabic label, or `major_other` for `OTHER`), academic level (Arabic label), gender (ذكر/أنثى), status (Arabic label), registered at (`formatRiyadh(created_at, 'datetime')`), waitlist position (number for waitlisted rows, else empty). Rows ordered: registered by `created_at`, then waitlisted by position, then cancelled.
- `all-accounts` columns: name, email, major, academic level, gender, announcements opt-in (نعم/لا), created at (Riyadh).

**Needs first:** D1-13 (`requireAdmin` pattern), D1-7 (`formatRiyadh`).

**Blocks:** nobody.

**Tests to write:**
- `csv.test.ts`:
  - `toCsv([{ a: 'x' }], [{ key: 'a', header: 'A' }]).startsWith('﻿')`.
  - Arabic `'عبدالعزيز'` appears unchanged.
  - Value `a,b` → `"a,b"`; value `say "hi"` → `"say ""hi"""`; `null` → empty field.
- `tests/db/exports.test.ts`:
  - as a non-admin user → status `403`.
  - as admin, `all-accounts` includes a profile with `announcements_opt_in = false` (e.g. `u02@test.local`).
  - as admin, `event-registrations?event=102` → 13 data rows; the first waitlisted row's position column = `1`.
  - `kind = 'nope'` → `404`.

**Done when:** `npm test -- tests/unit/csv.test.ts && npm run test:db -- tests/db/exports.test.ts` passes, and both files open in Excel with Arabic intact.

---

## A-15 · Sentry and launch preparation (plan T22, T24)

**Date:** Sat 28 Nov.

**Build:** Sentry for client and server with request bodies, replays and form fields excluded. Replace the body of `reportError` so critical sign-in failures alert you. Then prepare production for the switch.

**Files:**
- `sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts`, `lib/monitoring/scrub.ts`
- Modify `lib/monitoring/report.ts` (body only; signature unchanged)
- `tests/unit/sentry-scrub.test.ts`, `tests/unit/report.test.ts`

**Interfaces — produces:**
```ts
// lib/monitoring/scrub.ts
export function scrubEvent<E extends { request?: { data?: unknown; cookies?: unknown; headers?: Record<string, string> }; extra?: Record<string, unknown> }>(e: E): E
// deletes request.data and request.cookies; deletes headers.cookie and headers.authorization; deletes extra keys
// matching /answers|full_name|email|cv_url|github|project|skills|consent|major|gender/i

// lib/monitoring/report.ts (same signature as D2-5)
export function reportError(err: unknown, opts: { level: 'fatal' | 'error'; tags?: Record<string, string> }): void
// Sentry.captureException(err, { level: opts.level, tags: opts.tags })
```
- `Sentry.init`: `sendDefaultPii: false`, `beforeSend: scrubEvent`, no Replay integration, `tracesSampleRate: 0.1`.
- Sentry alert rules: `level:fatal AND alert:sign-in` → email you immediately; other errors → daily digest.

**Launch preparation (same day):**
- [ ] Paste final department copy and hero content into `ar.json`; set `HERO_IMAGE` if cleared. `npm run check:content` passes; make `check:content` a required check (remove `continue-on-error`).
- [ ] Production env reviewed against spec §5.4.
- [ ] Prepare the bug-bash checklist for Sun 29 from spec §17 and share it in the WhatsApp group.

**Needs first:** D2-5.

**Blocks:** launch checklist.

**Tests to write:**
- `sentry-scrub.test.ts`: an event with `request.data = { email: 'a@b.com' }`, `request.cookies = 'x'`, `headers.cookie = 'y'`, `extra.answers = {…}`, `extra.route = '/talent'` → `request.data`, `cookies`, `headers.cookie` and `extra.answers` removed; `extra.route` kept.
- `report.test.ts` (mock `@sentry/nextjs`): `reportError(new Error('x'), { level: 'fatal', tags: { alert: 'sign-in' } })` → `captureException` called with `{ level: 'fatal', tags: { alert: 'sign-in' } }`.

**Done when:** `npm test -- tests/unit/sentry-scrub.test.ts tests/unit/report.test.ts` passes, and a test `fatal` event from the preview reaches your email.

---

## A-17 · Bug bash and launch (plan T24)

**Date:** Sun 29 Nov (bug bash) – Mon 30 Nov (switch).

- [ ] **Sun 29:** run the bug bash with Abdulrahman and Abdullah on the private production address. Triage issues labelled `launch`.
- [ ] **Mon 30:** work through spec §17 one item at a time:
  - the talent key gets permission denied reading `talent_entries` and `private.talent_export` (run with the production anon key);
  - each developer account has no access to Hisn Prod, Hisn Talent or production env vars (check each member list);
  - run `scripts/export-talent.ts` and open the file in Excel.
- [ ] Switch hisn-sa.org following `docs/launch-runbook.md`. Set `SITE_URL=https://hisn-sa.org` in Vercel production env and redeploy.
- [ ] Send one real announcement to the team; press Gmail's own unsubscribe button; confirm the row in `email_unsubscribes`.
- [ ] Update the Resend webhook URL to `https://hisn-sa.org/api/webhooks/resend`; send one email to `bounced@resend.dev` → a `bounce` row appears in `email_unsubscribes`.
- [ ] If the talent form is open: submit once from a Gmail account → success.
- [ ] Confirm the flush cron is running (Vercel → Cron Jobs) and `Contact@Hisn-sa.org` receives mail.

**Needs first:** A-16, D2-16, all `launch` issues closed.

**Done when:** every box in spec §17 is checked.

---

## Floating · Final talent fields and consent text (plan T23)

**Date:** the day after **both** inputs arrive, not before Mon 23 Nov. If they arrive before Mon 23, fold this into A-11.

**Build:** Replace the provisional fields with the committee's list and the placeholder consent with the founder's text, then open the form.

**Files:** `lib/talent/fields.ts`, `lib/i18n/ar.json`, `content/talent-consent/v1.md`, `tests/scripts/export.test.ts`.

- [ ] Replace `talentFields` (same `TalentField` type); set `FIELDS_VERSION = 'final-1'`; add label keys to `ar.json`.
- [ ] Replace `content/talent-consent/v1.md` with the founder's text (no «مؤقت»); `consentIsFinal` becomes `true`.
- [ ] Update the expected header row in `tests/scripts/export.test.ts`.
- [ ] After merge: set `TALENT_FORM_OPEN=true` in Vercel production env and redeploy.
- If the inputs are not in by launch: skip; the site launches with the form closed («يفتح قريبًا»).

**Needs first:** A-11, A-12; both inputs.

**Done when:** `npm test && npm run test:scripts && cp tests/fixtures/talent-consent-final.md content/talent-consent/v1.md`, then `TALENT_FORM_OPEN=true npm run test:e2e -- --grep @talent-open` passes with the final fields (the run-2 command from A-7).

---

**If you're stuck:** after 30 minutes on the same problem, push a draft PR with what you have and the question in its description, ask Abdulrahman or Abdullah for a second pair of eyes in the WhatsApp group, and move to the next task marked ⇄. Pushing a draft branch early always beats waiting. For dashboard or account issues (Supabase, Vercel, Resend), open the provider's support chat the same day rather than waiting.
