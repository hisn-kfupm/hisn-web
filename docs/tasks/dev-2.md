# Abdullah — Tasks for حصن Phase 2

**Feature-complete:** Wed 25 Nov 2026 · **Launch:** Mon 30 Nov 2026 · **Deadline:** Tue 1 Dec 2026
**Your dates:** Thu 12 Nov – Mon 30 Nov
**References:** Spec `docs/superpowers/specs/2026-11-10-hisn-phase2-design.md` (§ numbers below). Plan `docs/superpowers/plans/2026-11-12-hisn-phase2.md` (T numbers below).

## Summary

**You own:** signed tokens; all email (templates, `.ics`, the outbox that sends them, the cron, announcements with unsubscribe); sign-in; the profile step and announcement-consent rules; the registration and waitlist database functions and the server actions that call them; the signed cancel and unsubscribe pages; the admin notice actions; and the end-to-end tests.

**You need from others before you can start:**

| You need | From | Expected |
|---|---|---|
| Bare app, npm scripts, `t()` | Abdulrahman (D1-1, D1-2) | Thu 12 – Fri 13 Nov |
| `lib/env.ts`, `supabaseProdServer`, `supabaseProdService` | Abdulaziz (A-2) | Fri 13 Nov |
| Tables incl. `profiles`, `events`, `event_private`, `registrations`, `email_deliveries`, `email_unsubscribes` | Abdulaziz (A-3) | Sat 14 Nov |
| Row-level security, `is_admin()`, SQL test helpers `tests.*` | Abdulaziz (A-4) | Sun 15 Nov |
| Seed data, `tests/fixtures/seed.ts`, `tests/db/helpers.ts` | Abdulaziz (A-6) | Tue 17 Nov |
| `RegisterButton` (calls your actions) | Abdulrahman (D1-11) | Sun 22 Nov |
| `requireAdmin`, `setStatus`, admin event page | Abdulrahman (D1-13 – D1-15) | Tue 24 – Thu 26 Nov |

**Waiting on you:**
- Abdulrahman needs `getSession`/`signOut` (D2-4, Sun 15), `FieldErrors` and `saveProfile` (D2-6, Tue 17), `useProfileGate` (D2-7, Wed 18), and the SQL functions (D2-9/D2-10, Fri 20 – Sun 22).
- Abdulaziz needs `reportError` (D2-5) and `verifyTokenDetailed` (D2-1).
- Everyone needs sign-in working on a preview (D2-5, Mon 16). Abdulaziz tests it against real inboxes on Tue 17.

### Rules for every task

- Write the listed tests first, see them fail, implement, see them pass, open a PR. One task = one PR, opened the same day.
- All constraints in plan "Global Constraints" apply. In particular: no literal UI text in components (keys into `lib/i18n/ar.json`; add your keys under your own prefix, e.g. `email.*`, `signin.*`, `waitlist.*`); never name a variable `supabase`; times stored UTC, shown `Asia/Riyadh`; wrap emails, URLs and English names inside Arabic text in `<Bdi>`/`<bdi>`.
- `supabaseProdServer()` is **async** (current Next.js `cookies()` is async): `const db = await supabaseProdServer()`. `supabaseProdService()` (service key, server only) is sync and used only for the outbox, announcements, the token flows and `email_unsubscribes`.
- Database migrations: create with `supabase migration new <name>`; the file is `supabase/migrations/<timestamp>_<name>.sql`. Never change the schema in the dashboard.
- Database tests:
  - **pgTAP** in `supabase/tests/*.test.sql`, run with `supabase test db`. Each file starts with `begin; select plan(N);` and ends with `select * from finish(); rollback;`. Use the helpers from A-4/A-6: `tests.create_user(email, with_profile, is_admin) returns uuid`, `tests.create_event(capacity, status, starts_in, closes_in, format) returns bigint`, `tests.add_registration(user_id, event_id, status) returns bigint`, `tests.login_as(uuid)`, `tests.login_anon()`, `tests.logout()`.
  - **Vitest** in `tests/db/*.test.ts`, run with `npm run test:db` against local Supabase. Use `tests/db/helpers.ts`: `pgAdmin()`, `clientAs(user: { id, email })`, `anonClient()`, `createUser()` (returns `{ id, email }`), `createEvent()`, `addRegistration()`. Seed ids are in `tests/fixtures/seed.ts` (`SEED.admin`, `SEED.user(n)`, `SEED.events.*`). To run a server action as a test user: `vi.mock('@/lib/db/prod', async (orig) => ({ ...(await orig()), supabaseProdServer: async () => clientAs(user) }))`.
- Local email: `EMAIL_TRANSPORT=smtp` sends to the local mail catcher (`supabase status` shows its URL and SMTP port). Nothing leaves your machine.
- PRs opened before 20:00 are reviewed the same evening, 21:00–22:30. Keep stacking branches while you wait.
- Branch name: `dev2/<task-id>-<slug>`, task id zero-padded to two digits (e.g. `dev2/D2-09-registration-sql`). PR title: `<task-id> · <what it does>` (e.g. `D2-09 · Registration and cancel functions`).
- **⇄** marks a task you may do out of order or in parallel, under the stated condition.

---

## D2-1 · Local setup, email normalization and signed tokens ⇄ (plan T14)

**Date:** Thu 12 Nov – Fri 13 Nov (morning). Thursday covers installing tools; tokens are pure TypeScript.

**Build:** Get Supabase running locally. Write the email normalizer and the HMAC-signed tokens used by the cancel and unsubscribe links.

**Setup:** Thu 12: install Node 20 (`.nvmrc`), Docker Desktop and the Supabase CLI (latest); clone the repo once Abdulrahman's bare app is merged and start on the tokens (they need no database). Fri 13, once Abdulaziz's A-2 (`supabase/config.toml`) is merged: run `supabase start` and copy the URL, anon key, service key, JWT secret, DB URL and mail-catcher URL from `supabase status` into `.env.local` (names in `.env.example`; from Thu 19, `npm run env:local` writes this file for you). Set `TOKEN_SECRET` to any 32+ character string locally.

**Files:**
- `lib/email/normalize.ts`
- `lib/tokens/sign.ts`
- `tests/unit/tokens.test.ts`, `tests/unit/normalize.test.ts`

**Interfaces — produces:**
```ts
// lib/email/normalize.ts
export function normalizeEmail(email: string): string   // email.trim().toLowerCase()

// lib/tokens/sign.ts   ('server-only')
export type TokenPayload =
  | { kind: 'unsub'; sub: string }                 // sub = normalized email; no expiry
  | { kind: 'cancel'; sub: string; ver: number; exp: number }
    // sub = registration id as string; ver = registrations.registration_version; exp = Unix SECONDS (event start)
export function signToken(p: TokenPayload): string
export function verifyToken(t: string, kind: 'unsub' | 'cancel'): { sub: string; ver?: number } | null   // ver present for cancel tokens
export function verifyTokenDetailed(t: string, kind: 'unsub' | 'cancel'):
  { ok: true; sub: string; ver?: number } | { ok: false; reason: 'invalid' | 'expired' }
```
- Format: `base64url(JSON.stringify(payload)) + '.' + base64url(HMAC-SHA256(TOKEN_SECRET, <first part>))`.
- Verification: compare signatures with `crypto.timingSafeEqual`; bad format, bad signature, wrong `kind`, or a cancel token without an integer `ver ≥ 1` → `invalid`; `exp <= Math.floor(Date.now() / 1000)` → `expired`. `verifyToken` returns `null` for any failure.

**Needs first:** D1-1 (repo exists). Nothing else.

**Blocks:** D2-2, D2-8, D2-12, D2-13 (yours).

**Tests to write:**
- `normalize.test.ts`: `normalizeEmail('  Ali@KFUPM.edu.SA ') === 'ali@kfupm.edu.sa'`.
- `tokens.test.ts`:
  - `verifyToken(signToken({ kind: 'unsub', sub: 'a@b.com' }), 'unsub')` deep-equals `{ sub: 'a@b.com' }`.
  - Changing one character of the payload part → `verifyToken` returns `null`.
  - Cancel token with `exp = now - 1` → `verifyToken(...) === null` and `verifyTokenDetailed(...)` deep-equals `{ ok: false, reason: 'expired' }`.
  - Cancel token with `exp = now + 3600`, `sub: '42'`, `ver: 2` → `{ sub: '42', ver: 2 }`.
  - A cancel payload without `ver` (built and signed by hand in the test) → `verifyTokenDetailed` returns `{ ok: false, reason: 'invalid' }`.
  - An `unsub` token verified as `'cancel'` → `null`; `verifyTokenDetailed` → `{ ok: false, reason: 'invalid' }`.
  - `verifyToken('abc', 'unsub') === null`.
  - Signed with `TOKEN_SECRET='x'.repeat(32)`, verified with `'y'.repeat(32)` → `null`.

**Done when:** `npm test -- tests/unit/tokens.test.ts tests/unit/normalize.test.ts` passes.

---

## D2-2 · Calendar file and unsubscribe headers ⇄ (plan T14)

**Date:** Fri 13 Nov. ⇄ Pure TypeScript; any time after D2-1.

**Build:** The `.ics` calendar attachment for registration emails, and the two RFC 8058 headers every announcement carries.

**Files:**
- `lib/email/ics.ts`, `lib/email/headers.ts`
- `tests/unit/ics.test.ts`, `tests/unit/headers.test.ts`

**Interfaces — produces:**
```ts
// lib/email/ics.ts
export function buildIcs(e: { id: number; title: string; startsAt: string; endsAt: string; location: string | null; url: string }): string

// lib/email/headers.ts
export function unsubscribeHeaders(email: string): Record<'List-Unsubscribe' | 'List-Unsubscribe-Post', string>
// 'List-Unsubscribe'      → `<${SITE_URL}/api/unsubscribe?t=${signToken({ kind: 'unsub', sub: normalizeEmail(email) })}>`
// 'List-Unsubscribe-Post' → 'List-Unsubscribe=One-Click'
```
- `.ics` content, lines joined with `\r\n`, in this order: `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//Hisn//Events//AR`, `METHOD:PUBLISH`, `BEGIN:VEVENT`, `UID:event-{id}@hisn-sa.org`, `DTSTAMP:{now UTC, YYYYMMDDTHHMMSSZ}`, `DTSTART:{startsAt}`, `DTEND:{endsAt}`, `SUMMARY:{title}`, `LOCATION:{location ?? url}`, `URL:{url}`, `END:VEVENT`, `END:VCALENDAR`. Escape `\`, `,`, `;` and newlines in text values as `\\`, `\,`, `\;`, `\n`.

**Needs first:** D2-1.

**Blocks:** D2-8, D2-14.

**Tests to write:**
- `ics.test.ts`:
  - For `startsAt: '2026-11-18T15:00:00Z'`, output contains `DTSTART:20261118T150000Z`.
  - Two calls for `id: 7` both contain `UID:event-7@hisn-sa.org`.
  - Output contains `\r\n` and no bare `\n` outside `\r\n`.
  - `title: 'ورشة, الطائرات'` → contains `SUMMARY:ورشة\, الطائرات`.
  - `location: null`, `url: 'https://hisn-sa.org/events/7'` → contains `LOCATION:https://hisn-sa.org/events/7`.
- `headers.test.ts` (with `SITE_URL=https://x.test`):
  - `unsubscribeHeaders('A@B.com')['List-Unsubscribe']` matches `/^<https:\/\/x\.test\/api\/unsubscribe\?t=[^>]+>$/`.
  - The token inside verifies (`verifyToken(token, 'unsub')`) to `{ sub: 'a@b.com' }`.
  - `['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click'`.

**Done when:** `npm test -- tests/unit/ics.test.ts tests/unit/headers.test.ts` passes.

---

## D2-3 · Email templates ⇄ (plan T14)

**Date:** Sat 14 Nov. ⇄ Needs only D1-2 (`t()`); independent of the database.

**Build:** Seven React Email templates with one shared RTL layout, plus the subject helper. Templates take plain props; loading the data is D2-8's job.

**Files:**
- `lib/email/types.ts`
- `lib/email/templates/Layout.tsx`, `Confirmation.tsx`, `Promoted.tsx`, `WaitlistJoined.tsx`, `CancelConfirmation.tsx`, `EventCancelled.tsx`, `EventChanged.tsx`, `Announcement.tsx`
- `lib/email/subject.ts`
- `tests/unit/templates.test.tsx`

**Interfaces — produces:**
```ts
// lib/email/types.ts
export type DeliveryKind = 'announcement' | 'confirmation' | 'promoted' | 'waitlist_joined'
  | 'cancel_confirmation' | 'event_cancelled' | 'event_changed'
export type EventEmailData = {
  id: number; title: string; startsAt: string; endsAt: string;
  format: 'in_person' | 'online'; location: string | null; meetingUrl: string | null;
  presenter: string | null; url: string          // `${SITE_URL}/events/${id}`
}

// templates (default exports), exact props:
Confirmation(props: { name: string; event: EventEmailData; cancelUrl: string })
Promoted(props: { name: string; event: EventEmailData; cancelUrl: string })
WaitlistJoined(props: { name: string; event: EventEmailData; position: number; leaveUrl: string })
CancelConfirmation(props: { name: string; event: EventEmailData; wasWaitlisted: boolean })
EventCancelled(props: { name: string; event: EventEmailData })
EventChanged(props: { name: string; event: EventEmailData; cancelUrl: string })   // shows the full updated details
Announcement(props: { event: EventEmailData; unsubscribeUrl: string })

// lib/email/subject.ts
export function subjectFor(kind: DeliveryKind, eventTitle: string): string   // t(`email.${kind}.subject`, { title })
```
- `Layout`: `<Html lang="ar" dir="rtl">`, font stack `'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif`, Hisn header, footer with `Contact@Hisn-sa.org` in `<bdi>`.
- Dates and times with `formatRiyadh` (Abdulrahman, D1-7). **Stub until D1-7 merges:** use `new Date(iso).toISOString()` and switch the import when D1-7 lands.
- Meeting link appears **only** in `Confirmation`, `Promoted` and `EventChanged`, and only when `format === 'online'` and `meetingUrl` is set. `WaitlistJoined` never shows it.
- Names, emails and URLs in body text are wrapped in `<bdi>`.

**Needs first:** D1-2.

**Blocks:** D2-8.

**Tests to write** (render with `@react-email/render`):
- `Confirmation` with an online event and `meetingUrl: 'https://meet.example/abc'` → html contains `dir="rtl"` and `https://meet.example/abc`.
- `Confirmation` with `format: 'in_person'` and `meetingUrl: 'https://meet.example/abc'` → html does **not** contain `meet.example`.
- `Confirmation` with `name: 'Ali Ahmed'` → html matches `/<bdi[^>]*>Ali Ahmed<\/bdi>/`.
- `WaitlistJoined` with `position: 3` and an online event with a meeting URL → contains `3`, does not contain the meeting URL, contains `leaveUrl`.
- `Announcement` → html contains `unsubscribeUrl`.
- `subjectFor('confirmation', 'ورشة الأمن السيبراني')` contains `'ورشة الأمن السيبراني'`.

**Done when:** `npm test -- tests/unit/templates.test.tsx` passes.

---

## D2-4 · Session, returnTo and middleware (plan T6)

**Date:** Sun 15 Nov.

**Build:** Server helpers to read the signed-in user and sign out, safe `returnTo` handling, the university-email check, and the Supabase cookie-refresh middleware.

**Files:**
- `lib/auth/session.ts`, `lib/auth/return-to.ts`
- `middleware.ts`
- `tests/unit/return-to.test.ts`, `tests/unit/session.test.ts`

**Interfaces — produces:**
```ts
// lib/auth/session.ts
export async function getSession(): Promise<{ userId: string; email: string } | null>
  // (await supabaseProdServer()).auth.getUser(); never auth.getSession() on the server
export async function signOut(): Promise<void>   // 'use server'; auth.signOut(); redirect('/')

// lib/auth/return-to.ts
export function safeReturnTo(input: string | null | undefined): string
  // returns input only if it starts with '/', does not start with '//' or '/\\', contains no ':' before the first '/', and length ≤ 512; else '/'
export function isInstitutionalEmail(email: string): boolean
  // domain = part after '@', lowercased; true iff domain === 'edu' or ends with '.edu' or '.edu.sa'
```
- `middleware.ts`: the standard `@supabase/ssr` cookie-refresh middleware; `matcher` excludes `_next/static`, `_next/image`, `favicon.ico`, `api/cron`.

**Needs first:** A-2.

**Blocks:** D2-5 (yours); Abdulrahman (D1-5 header, D1-13 admin guard).

**Tests to write:**
- `return-to.test.ts`:
  - `safeReturnTo('/events/3') === '/events/3'`; `safeReturnTo('/events?m=2026-11') === '/events?m=2026-11'`
  - `'//evil.com'`, `'https://evil.com'`, `'/\\evil.com'`, `'javascript:alert(1)'` → `'/'`
  - `safeReturnTo(null) === '/'`; `safeReturnTo('')` → `'/'`
  - `isInstitutionalEmail('a@kfupm.edu.sa') === true`; `('a@stanford.edu') === true`; `('a@gmail.com') === false`; `('a@edu.sa.com') === false`
- `session.test.ts` (mock `supabaseProdServer`): `auth.getUser` → `{ data: { user: { id: 'u1', email: 'a@b.com' } } }` → `{ userId: 'u1', email: 'a@b.com' }`; `{ data: { user: null } }` → `null`.

**Done when:** `npm test -- tests/unit/return-to.test.ts tests/unit/session.test.ts` passes.

---

## D2-5 · Sign-in page and code flow (plan T6)

**Date:** Mon 16 Nov.

**Build:** `/sign-in`, two steps: email (with the personal-email hint and a university-email warning) → 6-digit code (resend after 60 seconds, junk-folder hint). Includes the critical-failure report for codes that fail to send.

**Files:**
- `app/sign-in/page.tsx`, `app/sign-in/SignInForm.tsx`, `app/sign-in/actions.ts`
- `lib/monitoring/report.ts`
- `tests/unit/sign-in-actions.test.ts`, `tests/unit/sign-in-form.test.tsx`

**Interfaces — produces:**
```ts
// app/sign-in/actions.ts ('use server')
export async function sendCode(email: string): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'rate_limited' | 'send_failed' }>
  // z.string().trim().email(); auth.signInWithOtp({ email: normalizeEmail(email), options: { shouldCreateUser: true } })
  // error.status === 429 → 'rate_limited'; any other error → 'send_failed' + reportError(err, { level: 'fatal', tags: { alert: 'sign-in' } })
export async function verifyCode(email: string, code: string, returnTo?: string): Promise<{ ok: false; reason: 'wrong' | 'expired' } | never>
  // auth.verifyOtp({ email: normalizeEmail(email), token: code, type: 'email' })
  // error message containing 'expired' (case-insensitive) → 'expired'; other error → 'wrong'
  // success → redirect(safeReturnTo(returnTo))

// lib/monitoring/report.ts — stub body now; Abdulaziz replaces the body with Sentry in A-15 (signature fixed):
export function reportError(err: unknown, opts: { level: 'fatal' | 'error'; tags?: Record<string, string> }): void
  // now: console.error('[reportError]', opts.level, opts.tags, err)
```
- Page reads `returnTo` from the query string and passes it through both steps.
- Step 1: hint `t('signin.personalHint')` («استخدم بريدك الشخصي — يبقى معك بعد التخرج»); when `isInstitutionalEmail(value)`, an inline warning `t('signin.institutionalWarning')` that does **not** block submit.
- Step 2: `<input inputMode="numeric" autoComplete="one-time-code" maxLength={6}>`; resend button disabled for 60 s after each send (countdown shown); text `t('signin.checkJunk')`.
- Errors shown with `t('signin.error.<reason>')`.

**Needs first:** D2-4. For the preview test: Abdulaziz has set `hisn-dev` Auth to send through Resend (A-1).

**Blocks:** everyone (sign-in on previews). Abdulaziz's real-inbox test on Tue 17.

**Tests to write:**
- `sign-in-actions.test.ts` (mock client and `redirect`):
  - `sendCode('bad')` → `{ ok: false, reason: 'invalid' }`; `signInWithOtp` not called.
  - `sendCode(' A@Gmail.com ')` → `signInWithOtp` called with `{ email: 'a@gmail.com', options: { shouldCreateUser: true } }`.
  - error `{ status: 429 }` → `rate_limited`.
  - error `{ status: 500 }` → `send_failed`, and `reportError` called with `{ level: 'fatal', tags: { alert: 'sign-in' } }`.
  - `verifyOtp` error `{ message: 'Token has expired or is invalid' }` → `{ ok: false, reason: 'expired' }`.
  - `verifyOtp` error `{ message: 'Invalid token' }` → `{ ok: false, reason: 'wrong' }`.
  - success with `returnTo: '//evil.com'` → `redirect('/')`; with `'/events/3'` → `redirect('/events/3')`.
- `sign-in-form.test.tsx` (fake timers):
  - After sending, the resend button is disabled; after `vi.advanceTimersByTime(60_000)` it is enabled.
  - Typing `x@kfupm.edu.sa` shows the warning text; the submit button stays enabled.

**Done when:** `npm test -- tests/unit/sign-in-actions.test.ts tests/unit/sign-in-form.test.tsx` passes, and on your preview you sign in with your own Gmail and land back on the page you came from.

---

## D2-6 · Profile schema, save and announcement rules (plan T7)

**Date:** Tue 17 Nov.

**Build:** The profile validation schema, the save action (insert on first save, update after), and the announcement-consent rules from spec §10.2, exactly as written.

**Files:**
- `lib/forms/types.ts`
- `lib/profile/schema.ts`, `lib/profile/announcements.ts`
- `app/account/actions.ts` (profile part; Abdulrahman builds the account page on it)
- `tests/unit/profile-schema.test.ts`, `tests/db/announcements.test.ts`, `tests/db/save-profile.test.ts`

**Interfaces — produces:**
```ts
// lib/forms/types.ts
export type FieldErrors = Partial<Record<string, StringKey>>

// lib/profile/schema.ts
export type ProfileInput = {
  full_name_ar: string; major_code: string; major_other?: string | null;
  academic_level_code: string; gender: 'male' | 'female'; announcements_opt_in: boolean
}
export const profileSchema: z.ZodType<ProfileInput>
// full_name_ar: trim, 2–100 chars; major_code ∈ majors codes; major_code === 'OTHER' → major_other trim 2–80 required;
// otherwise major_other is set to null; academic_level_code ∈ academicLevels codes; gender ∈ {'male','female'};
// announcements_opt_in: boolean, default false. Unknown keys are stripped (so { is_admin: true } is dropped).

// app/account/actions.ts ('use server')
export async function saveProfile(input: ProfileInput): Promise<{ ok: true } | { ok: false; errors: FieldErrors }>
// no session → throw Error('unauthenticated')
// no profile row → INSERT { id: userId, email: session.email, ...parsed, announcements_updated_at: now }
//   then applyAnnouncementChoice(session.email, parsed.announcements_opt_in, 'signup')
// existing row → UPDATE parsed fields (never email); if announcements_opt_in changed: set announcements_updated_at = now
//   and applyAnnouncementChoice(email, newValue, 'account')
// revalidatePath('/account')

// lib/profile/announcements.ts  ('server-only'; uses supabaseProdService())
export async function applyAnnouncementChoice(email: string, optIn: boolean, context: 'signup' | 'account'): Promise<void>
```
`applyAnnouncementChoice`, exact behaviour (email normalized first):

| context | optIn | Effect on `email_unsubscribes` |
|---|---|---|
| `signup` | `true` | delete the row for this email |
| `signup` | `false` | **no change** (do not insert, do not delete) |
| `account` | `true` | delete the row |
| `account` | `false` | upsert `{ email, source: 'profile' }` |

`signup` + `false` writes nothing here, and the person still gets no announcements: when an account exists for an email, the audience (D2-13) ignores any newsletter signup for it, so the account's checkbox decides.

This function is the **only** way an unsubscribe is reversed. `newsletter_signup` (A-5) inserts into `signups` and nothing else: it is open to `anon` and cannot prove the caller owns the address, so letting it remove unsubscribes would let a stranger re-subscribe someone by typing their email into the footer. A person who unsubscribed opts back in by ticking the box in `/account` (context `account`), from a signed-in, code-verified session.

**Needs first:** A-2, A-3, A-4, A-6 (helpers).

**Blocks:** D2-7 (yours); Abdulrahman (D1-14 uses `FieldErrors`, D1-16 uses `saveProfile`).

**Tests to write:**
- `profile-schema.test.ts`:
  - `major_code: 'OTHER'` with no `major_other` → error on `major_other`.
  - `major_code: 'SWE'`, `major_other: 'x'` → parses with `major_other === null`.
  - `academic_level_code: 'NOPE'` → error.
  - `gender: 'x'` → error.
  - input without `announcements_opt_in` → parsed value `false`.
  - input with `is_admin: true` → parsed object has no `is_admin` key.
- `tests/db/announcements.test.ts`:
  - signup, `true`, with an existing `email_unsubscribes` row for `a@x.com` → row deleted.
  - signup, `false`, with an existing row → row still present.
  - signup, `false`, no row → still no row.
  - account, `false` → row exists with `source = 'profile'`.
  - account, `true` after that → row deleted.
  - signup with `'A@X.com '` deletes the row stored as `'a@x.com'`.
- `tests/db/save-profile.test.ts` (as a new user via `clientAs`):
  - first save inserts a row whose `email` equals the session email and `is_admin === false`.
  - second save with a different `full_name_ar` updates it; `email` unchanged.
  - passing `{ ..., is_admin: true }` → stored `is_admin === false`.

**Done when:** `npm test -- tests/unit/profile-schema.test.ts && npm run test:db -- tests/db/announcements.test.ts tests/db/save-profile.test.ts` passes.

---

## D2-7 · Profile overlay and action gate (plan T7)

**Date:** Wed 18 Nov.

**Build:** The profile overlay that opens when a signed-in person without a profile tries an action, and runs that action once the profile is saved. Also the server-side guard that tells the client a profile is needed.

**Files:**
- `components/ProfileOverlay.tsx`
- `lib/profile/gate.tsx` (client provider + hook)
- `lib/profile/guard.ts` (server)
- Modify `app/layout.tsx` (wrap children in `ProfileGateProvider`; Abdulrahman owns the file, so keep the change to that one wrapper)
- `tests/unit/profile-overlay.test.tsx`, `tests/unit/profile-guard.test.ts`

**Interfaces — produces:**
```ts
// lib/profile/guard.ts ('server-only')
export async function hasProfile(): Promise<boolean>
export async function withProfile<T>(action: () => Promise<T>): Promise<T | { needsProfile: true }>
  // no session → throw Error('unauthenticated'); no profile row → { needsProfile: true } (action not called); else return await action()

// lib/profile/gate.tsx ('use client')
export function ProfileGateProvider(props: { children: React.ReactNode }): JSX.Element
export function useProfileGate(): (action: () => Promise<void>) => void
  // gate(action): opens the overlay; after saveProfile returns { ok: true }, closes it and calls action() exactly once.
  // Closing the overlay without saving discards the action.
```
- Overlay fields (spec §7.2): الاسم بالعربية (text); التخصص (select from `majors`; choosing `OTHER` reveals a required text input `major_other`); المرحلة العلمية (select from `academicLevels`); الجنس (two radios, `male` ذكر / `female` أنثى, **none selected**); announcements checkbox, **unchecked**, labelled with `t('profile.announcements')`, whose value in `ar.json` is exactly «لقاءات مع قادة القطاع، وورش تقرّبك من دورك فيه، تصلك أولًا بأول على بريدك.»
- Field errors shown from `FieldErrors`.

**Needs first:** D2-6.

**Blocks:** Abdulrahman (D1-11 register button, D1-16 account, D1-17 talent); D2-11 (yours).

**Tests to write:**
- `profile-overlay.test.tsx`:
  - `screen.getByText('لقاءات مع قادة القطاع، وورش تقرّبك من دورك فيه، تصلك أولًا بأول على بريدك.')` exists.
  - The announcements checkbox is not checked on render.
  - Neither gender radio is checked on render.
  - Selecting `OTHER` shows an input named `major_other`; selecting `SWE` hides it.
  - With `saveProfile` mocked to `{ ok: true }`, calling `gate(action)` then submitting → `action` called exactly once.
  - With `saveProfile` mocked to `{ ok: false, errors: { full_name_ar: 'profile.error.name' } }` → `action` not called and the error text renders.
- `profile-guard.test.ts` (mock session and client):
  - no profile → returns `{ needsProfile: true }` and the action spy was not called.
  - profile exists → returns the action's value.
  - no session → rejects with `'unauthenticated'`.

**Done when:** `npm test -- tests/unit/profile-overlay.test.tsx tests/unit/profile-guard.test.ts` passes.

---

## D2-8 · Outbox, sender and cron (plan T14)

**Date:** Thu 19 Nov.

**Build:** The code that turns `queued` rows in `email_deliveries` into sent emails: a transport switch (local mail catcher or Resend), a renderer that loads each delivery's data, flush functions called right after actions, and a cron route that sends anything left behind.

**Files:**
- `lib/email/send.ts`, `lib/email/render.ts`, `lib/email/outbox.ts`
- `app/api/cron/flush-email/route.ts`
- `vercel.json`
- `tests/db/outbox.test.ts`, `tests/db/render.test.ts`, `tests/unit/cron-route.test.ts`

**Interfaces — produces:**
```ts
// lib/email/send.ts ('server-only')
export type OutgoingEmail = { to: string; subject: string; react: React.ReactElement;
  headers?: Record<string, string>; attachments?: { filename: string; content: string }[] }
export async function sendEmail(m: OutgoingEmail): Promise<{ id: string } | { skipped: true }>
export async function sendBatch(ms: OutgoingEmail[], idempotencyKey: string): Promise<{ ids: string[] }>
// EMAIL_TRANSPORT='smtp' → nodemailer to SMTP_HOST:SMTP_PORT; sendBatch sends one by one, ids = message ids
// EMAIL_TRANSPORT='resend' → resend.emails.send / resend.batch.send(ms, { idempotencyKey })
// From: 'حصن <noreply@hisn-sa.org>', Reply-To: 'Contact@Hisn-sa.org'
// If EMAIL_ALLOWLIST is set and `to` is not in it (comma-separated, normalized) → { skipped: true }, nothing sent

// lib/email/outbox.ts ('server-only'; supabaseProdService())
export type DeliveryRow = { id: number; event_id: number | null; registration_id: number | null; kind: DeliveryKind;
  email: string; status: 'queued' | 'sent' | 'failed' | 'skipped'; batch_key: string | null;
  created_at: string; attempted_at: string | null }
export async function flushOutboxFor(registrationIds: number[]): Promise<void>
export async function flushQueuedForEvent(eventId: number): Promise<void>
  // kinds confirmation | promoted | waitlist_joined | cancel_confirmation only
export async function flushStale(olderThanMinutes = 2): Promise<{ sent: number; failed: number }>
  // same four kinds; created_at < now - olderThanMinutes. Announcement kinds are sent by D2-14, never here.

// lib/email/render.ts ('server-only')
export async function renderDelivery(d: DeliveryRow): Promise<OutgoingEmail>
```
- **Claiming rows (prevents double sending when the action and the cron run together):** before sending, run `update email_deliveries set attempted_at = now() where id = any($ids) and status = 'queued' and (attempted_at is null or attempted_at < now() - interval '5 minutes') returning *`, and send only the returned rows.
- After sending: `status = 'sent'`, `provider_message_id`; on error: `status = 'failed'`, `error` = message (first 500 chars), and `reportError(err, { level: 'error', tags: { kind } })`. `{ skipped: true }` from `sendEmail` → `status = 'skipped'`.
- `renderDelivery` has two branches:
  - **`kind = 'announcement'`:** load the event only (by `event_id`). **No** registration or profile lookup: `registration_id` is null and the recipient may be a newsletter email with no account. Template `Announcement` with props `{ event, unsubscribeUrl }`, where `unsubscribeUrl = ${SITE_URL}/unsubscribe?t=${signToken({ kind: 'unsub', sub: normalizeEmail(email) })}`. `headers: unsubscribeHeaders(email)`. No `.ics` attachment.
  - **every other kind:** load the registration (including `registration_version`), profile (`full_name_ar`), event and, for `confirmation`, `promoted` and `event_changed`, `event_private.meeting_url`. Cancel/leave URL: `${SITE_URL}/registrations/cancel?t=${signToken({ kind: 'cancel', sub: String(registration_id), ver: registration_version, exp: Math.floor(Date.parse(starts_at) / 1000) })}`. Attachment `hisn-event-{id}.ics` (via `buildIcs`) for `confirmation`, `promoted` and `event_changed`. `CancelConfirmation.wasWaitlisted` is true when the registration has `waitlisted_at` set and `promoted_at` null.
- Cron route: `GET`; header `Authorization: Bearer ${CRON_SECRET}` required, else `401`; returns `Response.json(await flushStale())`.
- `vercel.json`: `{ "crons": [{ "path": "/api/cron/flush-email", "schedule": "*/10 * * * *" }] }`.

**Needs first:** D2-1, D2-2, D2-3, A-3/A-5 (tables), A-6 (helpers).

**Blocks:** D2-11, D2-12, D2-14 (yours).

**Tests to write** (`sendEmail`/`sendBatch` mocked unless stated):
- `outbox.test.ts`:
  - a `queued` `confirmation` row with `created_at = now() - 3 min` → `flushStale()` calls `sendEmail` once; row `status = 'sent'`.
  - same with `created_at = now() - 1 min` → not sent; row still `queued`.
  - `sendEmail` throws `new Error('boom')` → row `status = 'failed'`, `error` contains `'boom'`.
  - `flushQueuedForEvent(A)` sends event A's queued rows and leaves event B's queued.
  - `Promise.all([flushStale(), flushStale()])` on one stale row → `sendEmail` called exactly once.
  - a queued `announcement` row older than 2 minutes is **not** sent by `flushStale`.
- `render.test.ts`:
  - online event with `event_private.meeting_url = 'https://meet.example/x'`, kind `confirmation` → rendered html contains `https://meet.example/x`; `attachments[0].filename === 'hisn-event-<id>.ics'`.
  - in-person event, kind `confirmation` → no `meet.example` in html.
  - kind `waitlist_joined` → no attachment and no meeting URL.
  - a queued `announcement` row for `nobody-here@test.local` (no profile; `registration_id` null) → renders without error; html contains `/unsubscribe?t=`; `headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click'`; `attachments` empty or undefined.
  - kind `confirmation` for a registration with `registration_version = 2` → the token in the cancel URL verifies to `{ sub: String(id), ver: 2 }`.
- `cron-route.test.ts`: no header → status `401`; `Authorization: Bearer <CRON_SECRET>` → status `200` with JSON keys `sent`, `failed`.

**Done when:** `npm test -- tests/unit/cron-route.test.ts && npm run test:db -- tests/db/outbox.test.ts tests/db/render.test.ts` passes.

---

## D2-9 · Registration functions (plan T12)

**Date:** Fri 20 Nov.

**Build:** The SQL functions to register, cancel and count seats. They lock the event row so two people can't take the last seat, and queue the confirmation email in the same transaction. `promote_waitlist` is a no-op stub here; D2-10 fills it in.

**Files:**
- `supabase/migrations/<timestamp>_registration.sql` (`supabase migration new registration`)
- `supabase/tests/registration.test.sql`
- `tests/db/concurrency.test.ts`

**Interfaces — produces** (all `language plpgsql security definer set search_path = public`):
```sql
queue_delivery(p_registration_id bigint, p_kind text) returns void
  -- inserts email_deliveries (event_id, registration_id, kind, email, status 'queued') with email from profiles;
  -- revoke execute from public, anon, authenticated

register_for_event(p_event_id bigint) returns text
  -- grant execute to authenticated; revoke from public, anon
cancel_my_registration(p_event_id bigint) returns text
  -- grant to authenticated; revoke from public, anon
cancel_registration_by_id(p_registration_id bigint, p_version int) returns text
  -- revoke from public, anon, authenticated; grant to service_role
seats_left(p_event_id bigint) returns int
  -- grant to anon, authenticated
promote_waitlist(p_event_id bigint) returns bigint[]
  -- STUB in this task: returns '{}'::bigint[]; revoke from public, anon, authenticated
```
`register_for_event`: `select … from events where id = p_event_id for update`, then these checks **in this order**, returning at the first match:
1. no event, or `status = 'draft'` → `'not_found'`
2. no `profiles` row for `auth.uid()` → `'profile_required'`
3. `status = 'cancelled'` → `'cancelled'`
4. `now() >= registration_closes_at` → `'closed'`
5. own row `status = 'registered'` → `'already_registered'`
6. own row `status = 'waitlisted'` → `'already_waitlisted'`
7. `capacity is not null` and count of `registered` rows `>= capacity` → `'full'`
8. insert a row (`registration_version` = 1 by default), or update the caller's `cancelled` row to `status = 'registered'`, `cancelled_at = null`, `waitlisted_at = null`, `promoted_at = null`, `registration_version = registration_version + 1` (same row id) → `queue_delivery(id, 'confirmation')` → `'registered'`

`cancel_my_registration` / `cancel_registration_by_id`: lock the event; the row (by `event_id` + `auth.uid()`, or by id) must have `status in ('registered','waitlisted')`, and for `cancel_registration_by_id` also `registration_version = p_version`, else `'not_found'`; `now() >= starts_at` → `'started'`; set `status = 'cancelled'`, `cancelled_at = now()`; `queue_delivery(id, 'cancel_confirmation')`; if the previous status was `registered`, `perform promote_waitlist(event_id)`; return `'cancelled'`.

`seats_left`: event not found or `draft` → `null`; `capacity is null` → `null`; else `greatest(0, capacity - <count of registered>)`.

**Needs first:** A-3, A-4, A-6.

**Blocks:** D2-10, D2-11 (yours); Abdulrahman's badges and button show live data once this merges (no change needed on their side).

**Tests to write:**
- `supabase/tests/registration.test.sql` (pgTAP, `tests.*` helpers):
  - draft event → `register_for_event` returns `'not_found'`; id `999999` → `'not_found'`.
  - user created with `with_profile = false` → `'profile_required'`.
  - cancelled event → `'cancelled'`.
  - event with `starts_in = '1 day'`, `closes_in = '-1 hour'` → `'closed'`.
  - capacity 1 with 1 registered → `'full'`.
  - same user twice → `'registered'` then `'already_registered'`; `count(*)` of that user's rows for the event = 1.
  - after a successful register: exactly 1 `email_deliveries` row with `kind = 'confirmation'`, `status = 'queued'`, `registration_id` = that row.
  - `seats_left`: capacity 5 with 2 registered → `3`; capacity null → `null`; draft → `null`; works after `tests.login_anon()`.
  - `cancel_my_registration` → `'cancelled'`, row `status = 'cancelled'`, 1 `cancel_confirmation` delivery queued; calling again → `'not_found'`.
  - event with `starts_in = '-1 hour'` and a registered row → `cancel_my_registration` returns `'started'`.
  - register → cancel → register again → `'registered'`, same `registrations.id` as the first time, and `registration_version = 2`.
  - as postgres, after that re-register, `cancel_registration_by_id(<id>, 1)` → `'not_found'` and the row stays `registered`; `cancel_registration_by_id(<id>, 2)` → `'cancelled'`.
  - as anon, `register_for_event` → `throws_ok(…, '42501')`.
  - as authenticated, `cancel_registration_by_id` → `throws_ok(…, '42501')`.
- `tests/db/concurrency.test.ts` (Vitest, real concurrent requests):
  - Five times in a loop: `createEvent({ capacity: 1 })`, two new users with profiles; `Promise.all([clientAs(u1).rpc('register_for_event', { p_event_id }), clientAs(u2).rpc(...)])` → the two `data` values sorted equal `['full', 'registered']`.

**Done when:** `npm run db:reset && supabase test db && npm run test:db -- tests/db/concurrency.test.ts` passes.

---

## D2-10 · Waitlist and capacity functions (plan T12)

**Date:** Sat 21 Nov – Sun 22 Nov.

**Build:** Join the waitlist, read your position, automatic promotion when a seat frees, and the admin capacity change that promotes people in order. Every promotion queues a "you have a seat" email in the same transaction.

**Files:**
- `supabase/migrations/<timestamp>_waitlist.sql` (`supabase migration new waitlist`)
- `supabase/tests/waitlist.test.sql`

**Interfaces — produces:**
```sql
join_waitlist(p_event_id bigint) returns table(result text, position int)    -- grant to authenticated
waitlist_position(p_event_id bigint) returns int                             -- grant to authenticated
create or replace function promote_waitlist(p_event_id bigint) returns bigint[]   -- internal (no grants)
set_event_capacity(p_event_id bigint, p_capacity int) returns bigint[]       -- grant to authenticated
```
`join_waitlist`, after locking the event, checks **in this order**:
1. not found / draft → `('not_found', null)`
2. no profile → `('profile_required', null)`
3. cancelled → `('cancelled', null)`
4. `now() >= registration_closes_at` → `('closed', null)`
5. own row registered → `('already_registered', null)`
6. own row waitlisted → `('already_waitlisted', <position>)`
7. `capacity is null` → `('no_capacity', null)`
8. registered count `< capacity` → `('not_full', null)`
9. insert, or update the caller's cancelled row, to `status = 'waitlisted'`, `waitlisted_at = now()`, `promoted_at = null`, and (when reusing a cancelled row) `registration_version = registration_version + 1` → `queue_delivery(id, 'waitlist_joined')` → `('waitlisted', <position>)`

Position = 1 + the number of `waitlisted` rows for the event ordered before the caller by `(waitlisted_at, id)`.

`waitlist_position`: the caller's position, or `null` if not waitlisted.

`promote_waitlist` (assumes the caller holds the event lock): if `status <> 'published'` or `now() >= registration_closes_at` → `'{}'`. Otherwise loop while (`capacity is null` or registered `< capacity`) and a `waitlisted` row exists: take the first by `(waitlisted_at, id)`, set `status = 'registered'`, `promoted_at = now()`, `queue_delivery(id, 'promoted')`, append the id. Return the ids.

`set_event_capacity`: `not public.is_admin()` → `raise exception 'forbidden' using errcode = '42501'`; `p_capacity is not null and p_capacity < 1` → `raise exception 'invalid_capacity' using errcode = '22023'`; lock; update `capacity`; `return promote_waitlist(p_event_id)`. Lowering capacity never changes any registration.

**Needs first:** D2-9.

**Blocks:** D2-11 (yours); Abdulrahman (D1-14 capacity save, D1-11 position).

**Tests to write** (`supabase/tests/waitlist.test.sql`):
- capacity 2 with 1 registered → `join_waitlist` returns `('not_full', null)`.
- capacity null → `('no_capacity', null)`.
- capacity 1 full; users A, B, C join in that order → positions `1`, `2`, `3`; `waitlist_position` as C → `3`.
- C joining again → `('already_waitlisted', 3)`.
- each join queues 1 `waitlist_joined` delivery.
- capacity 1, registered R, waitlisted A then B; R cancels (before close) → A becomes `registered`, `promoted_at` not null; B still `waitlisted`; exactly 1 `promoted` delivery queued for A.
- same setup with `closes_in = '-1 hour'` (still before start) → R cancels → nobody promoted; A still `waitlisted`.
- A leaves the waitlist via `cancel_my_registration` → `'cancelled'`; no promotion happens; B's position becomes `1`.
- as admin: capacity 2 with 2 registered and 3 waitlisted (W1, W2, W3) → `set_event_capacity(e, 4)` returns W1's and W2's ids in that order; W3 still waitlisted.
- as admin: capacity 4 with 4 registered → `set_event_capacity(e, 1)` → all 4 still `registered`; `seats_left(e) = 0`.
- as admin: capacity set to `null` with 2 waitlisted → both promoted.
- as a non-admin user, `set_event_capacity` → `throws_ok(…, '42501')`.
- as admin, `set_event_capacity(e, 0)` → `throws_ok(…, '22023')`.
- cancelled event → `join_waitlist` returns `('cancelled', null)`.
- join → leave → join again on a full event → same row id, `registration_version` goes from 1 to 2.

**Done when:** `npm run db:reset && supabase test db` passes.

---

## D2-11 · Registration server actions (plan T13)

**Date:** Mon 23 Nov.

**Build:** The three server actions behind the event page buttons. Each wraps the SQL function, sends the queued emails right away, and refreshes the pages. Replace Abdulrahman's stub with these.

**Files:**
- `app/events/[id]/actions.ts`
- Modify `app/events/[id]/page.tsx`: import from `./actions` instead of `@/lib/events/actions-stub`; delete `lib/events/actions-stub.ts`
- `tests/unit/register-action.test.ts`, `tests/db/register-action.test.ts`

**Interfaces:**
- Produces (`'use server'`; types from `lib/events/types.ts`, Abdulrahman D1-7):
```ts
export async function registerAction(eventId: number): Promise<RegisterResult>
export async function joinWaitlistAction(eventId: number): Promise<JoinWaitlistResult>
export async function cancelAction(eventId: number): Promise<CancelResult>
```
- `registerAction` and `joinWaitlistAction` run inside `withProfile`; `cancelAction` does not.
- Steps: rpc (`register_for_event` / `join_waitlist` / `cancel_my_registration`) with `{ p_event_id: eventId }` → `await flushQueuedForEvent(eventId)` inside `try/catch` (a failure is reported with `reportError(err, { level: 'error' })` and **never** changes the returned result) → `revalidatePath('/events/' + eventId)` and `revalidatePath('/account')` → return.
- `join_waitlist` returns a row set: map `data[0]` to `{ result, position: position ?? undefined }`.
- Consumes: `withProfile` (D2-7), `flushQueuedForEvent` (D2-8), D2-9/D2-10 functions, `RegisterButton` (D1-11).

**Needs first:** D2-7, D2-8, D2-10, D1-11.

**Blocks:** Abdulrahman (D1-16 uses `cancelAction`); D2-16 (E2E).

**Tests to write:**
- `tests/unit/register-action.test.ts` (mocks):
  - no profile → `registerAction(7)` returns `{ needsProfile: true }`; rpc not called.
  - with profile → rpc called with `('register_for_event', { p_event_id: 7 })`, then `flushQueuedForEvent(7)`, in that order.
  - `flushQueuedForEvent` rejects → `registerAction` still returns `'registered'`; `reportError` called once.
  - rpc `join_waitlist` returns `data: [{ result: 'waitlisted', position: 2 }]` → `{ result: 'waitlisted', position: 2 }`.
- `tests/db/register-action.test.ts`: calling `registerAction` twice for the same user and event → `'registered'` then `'already_registered'`; one row.
- Re-run Abdulrahman's `tests/unit/register-button.test.tsx` after switching the import; it must still pass.

**Done when:** `npm test -- tests/unit/register-action.test.ts tests/unit/register-button.test.tsx && npm run test:db -- tests/db/register-action.test.ts` passes; on the preview, registering sends a confirmation email.

---

## D2-12 · Signed cancel page (plan T13)

**Date:** Tue 24 Nov.

**Build:** `/registrations/cancel?t=…`, opened from the cancel or leave link in emails. It shows what will be cancelled and a single confirm button; nothing changes until the button is pressed (spec HR-5).

**Files:**
- `app/registrations/cancel/page.tsx`, `app/registrations/cancel/actions.ts`
- `components/ConfirmPage.tsx` (shared with D2-13)
- `tests/db/cancel-token.test.ts`

**Interfaces — produces:**
```ts
// components/ConfirmPage.tsx
export function ConfirmPage(props: { title: string; body: React.ReactNode; confirmLabel: string;
  action: (formData: FormData) => Promise<void>; hidden: Record<string, string> }): JSX.Element
  // one <form> with hidden inputs and one submit button; disabled while pending

// app/registrations/cancel/actions.ts ('use server')
export async function confirmCancelByToken(token: string): Promise<'cancelled' | 'already' | 'started' | 'invalid'>
// verifyTokenDetailed(token, 'cancel'): reason 'invalid' → 'invalid'; reason 'expired' → 'started'
// ok → supabaseProdService().rpc('cancel_registration_by_id', { p_registration_id: Number(sub), p_version: ver })
//      → 'cancelled' → 'cancelled'; 'not_found' → 'already'; 'started' → 'started'
// then flushQueuedForEvent(event_id) (failure reported, not thrown)
```
- Page (GET): `verifyTokenDetailed`; invalid → `t('cancel.invalid')`; expired → `t('cancel.started')`; otherwise load the registration with the service client and show event title, Riyadh date/time and whether it is a registration or a waitlist place (`t('cancel.registration')` / `t('cancel.waitlist')`), then `ConfirmPage`. **The page component performs no writes.**
- After the action: a result state with `t('cancel.result.<result>')`.

**Needs first:** D2-1, D2-8, D2-9.

**Blocks:** D2-13 (reuses `ConfirmPage`), D2-16.

**Tests to write** (`tests/db/cancel-token.test.ts`):
- Rendering the page component with a valid token → the registration row is still `registered`.
- `confirmCancelByToken(valid)` → `'cancelled'`; row `status = 'cancelled'`.
- Calling it again with the same token → `'already'`.
- A token with one changed character → `'invalid'`.
- A token whose `exp` is in the past → `'started'`; row unchanged.
- A token for a waitlist place → `'cancelled'`, and nobody is promoted (seat count unchanged).
- **Stale link after re-registering:** register (version 1) → keep that confirmation's token T1 → cancel → register again (version 2) → `confirmCancelByToken(T1)` → `'already'`; the new registration stays `registered`.

**Done when:** `npm run test:db -- tests/db/cancel-token.test.ts` passes.

---

## D2-13 · Audience and unsubscribe (plan T15)

**Date:** Wed 25 Nov.

**Build:** The announcement audience (spec §10.2 formula), unsubscribing by email, the one-click POST endpoint mail clients call, and the confirm page the email link opens.

**Files:**
- `supabase/migrations/<timestamp>_audience.sql`
- `lib/email/audience.ts`
- `app/api/unsubscribe/route.ts`
- `app/unsubscribe/page.tsx`, `app/unsubscribe/actions.ts`
- `tests/db/audience.test.ts`, `tests/db/unsubscribe.test.ts`

**Interfaces — produces:**
```sql
announcement_audience() returns table(email text)
  -- security definer; revoke from public, anon, authenticated; grant to service_role
  -- (select lower(trim(email)) from profiles where announcements_opt_in)
  -- union (select lower(trim(s.email)) from signups s
  --        where not exists (select 1 from profiles p where lower(trim(p.email)) = lower(trim(s.email))))
  -- except (select email from email_unsubscribes)   -- this column is always stored normalized (A-3 check)
  -- When an account exists for an email, its checkbox decides; a newsletter signup for that email is ignored.
```
```ts
// lib/email/audience.ts ('server-only')
export async function announcementAudience(): Promise<string[]>   // sorted ascending, unique
export async function unsubscribe(email: string, source: 'link' | 'header'): Promise<void>
  // upsert email_unsubscribes { email: normalizeEmail(email), source };
  // update profiles set announcements_opt_in = false, announcements_updated_at = now() where lower(email) = normalized

// app/api/unsubscribe/route.ts
export async function POST(req: Request): Promise<Response>
  // token from the URL query ?t= (the RFC 8058 body is 'List-Unsubscribe=One-Click'; ignore it)
  // valid → unsubscribe(sub, 'header') → new Response(null, { status: 200 }); invalid → new Response(null, { status: 400 })
export async function GET(req: Request): Promise<Response>
  // 307 redirect to `/unsubscribe?t=${t}`; never writes

// app/unsubscribe/actions.ts ('use server')
export async function confirmUnsubscribe(token: string): Promise<'done' | 'invalid'>   // → unsubscribe(sub, 'link')
```
- `/unsubscribe` page: `ConfirmPage` with `t('unsub.title')`, the email in `<bdi>`, one button. No write on render.

**Needs first:** D2-1, D2-12 (`ConfirmPage`), A-5.

**Blocks:** D2-14.

**Tests to write:**
- `audience.test.ts`:
  - profile `Ali@x.com` opted in + signup `ali@x.com` → `'ali@x.com'` appears exactly once.
  - an email in `email_unsubscribes` that is also in `signups` → not in the audience.
  - profile opted out, no signup → not in the audience.
  - profile opted out **with** a signup for the same email and no unsubscribe row → **not** in the audience (the account decides).
  - a signup with no account and no unsubscribe row → in the audience.
  - an unsubscribe row for `u@x.com`, then `newsletter_signup('U@x.com')` → the unsubscribe row is still present and `u@x.com` is **not** in the audience (A-5's `newsletter_signup` never reverses an unsubscribe).
  - profile opted in, no signup, no unsubscribe row → in the audience.
- `unsubscribe.test.ts`:
  - `GET /api/unsubscribe?t=<valid>` → status `307`, `Location` ends with `/unsubscribe?t=<valid>`; `email_unsubscribes` unchanged.
  - `POST /api/unsubscribe?t=<valid for a@x.com>` with body `List-Unsubscribe=One-Click` → status `200`, empty body; row `{ email: 'a@x.com', source: 'header' }` exists; the matching profile has `announcements_opt_in = false`.
  - `POST` with a tampered token → status `400`; no row.
  - `confirmUnsubscribe(<valid>)` → `'done'`; row `source = 'link'`.
  - Rendering `/unsubscribe` with a valid token → no row written.

**Done when:** `npm run db:reset && npm run test:db -- tests/db/audience.test.ts tests/db/unsubscribe.test.ts` passes.

---

## D2-14 · Announcement sending (plan T15)

**Date:** Thu 26 Nov.

**Build:** Sending announcements, cancellation notices and change notices in batches of up to 100, with idempotency keys so a retry never double-sends. Includes progress counts, "resend to failed only", and re-checking unsubscribes before each batch.

**Files:**
- `lib/email/announce.ts`
- `tests/db/announce.test.ts`

**Interfaces — produces:**
```ts
export type NoticeKind = 'announcement' | 'event_cancelled' | 'event_changed'
export const BATCH_SIZE = 100
export function batchKey(kind: NoticeKind, eventId: number, run: number, batch: number): string
  // `${kind}-event-${eventId}-run-${run}-batch-${batch}`
export async function startAnnouncement(eventId: number, kind: NoticeKind): Promise<{ total: number }>
export async function continueAnnouncement(eventId: number, kind: NoticeKind, opts: { failedOnly: boolean }):
  Promise<{ sent: number; failed: number; remaining: number }>
export async function announcementProgress(eventId: number, kind: NoticeKind):
  Promise<{ total: number; sent: number; failed: number; queued: number }>   // total includes skipped
```
- `startAnnouncement`:
  - `announcement`: if `events.announcement_started_at` is not null → `throw new Error('already_started')`; else set it to `now()`; recipients = `announcementAudience()`.
  - `event_cancelled`: recipients = profiles of rows with `status in ('registered','waitlisted')`.
  - `event_changed`: recipients = profiles of rows with `status = 'registered'`.
  - For `event_cancelled`/`event_changed`, if `queued` rows of that kind already exist for the event → `throw new Error('in_progress')`.
  - Insert one `queued` row per recipient (`event_id`, `kind`, `email`, and `registration_id` for the two notice kinds). Return `{ total }`.
- `continueAnnouncement`:
  - Run number `r`: `1` for the first run; with `failedOnly: true`, `r = <highest run in this event+kind's batch_keys> + 1`, and the `failed` rows are set back to `queued` first.
  - Repeat up to 20 batches per call: take up to `BATCH_SIZE` `queued` rows ordered by `id`. For `announcement` only, mark rows whose email is now in `email_unsubscribes` as `skipped`. Render the rest with `renderDelivery` (its announcement branch already sets the unsubscribe headers; D2-8). Call `sendBatch(ms, batchKey(kind, eventId, r, n))` with up to 3 attempts reusing **the same key**. Success → rows `sent` with ids; failure after 3 attempts → rows `failed` with the error. Store `batch_key` on each row. `n` starts at 1 per run and continues across calls in the same run.
  - `remaining` = `queued` rows left after this call.

**Needs first:** D2-8, D2-13.

**Blocks:** D2-15.

**Tests to write** (`sendBatch` mocked):
- 250 audience emails → `startAnnouncement` returns `{ total: 250 }`; `continueAnnouncement(..., { failedOnly: false })` calls `sendBatch` 3 times with keys `announcement-event-<id>-run-1-batch-1`, `-batch-2`, `-batch-3` and sizes `100, 100, 50`.
- Every email passed for `announcement` has `headers['List-Unsubscribe']` matching `/^<.+\/api\/unsubscribe\?t=.+>$/` and `headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click'`.
- `sendBatch` rejects once, then resolves → the second call uses the **same** key as the first.
- `sendBatch` rejects 3 times for batch 2 → those 100 rows `failed`; then `continueAnnouncement(..., { failedOnly: true })` → the keys contain `run-2`, and only the 100 previously failed emails are sent.
- `startAnnouncement(e, 'announcement')` twice → the second rejects with `'already_started'`.
- An email unsubscribed after `startAnnouncement` and before `continueAnnouncement` → its row is `skipped` and it is not in any `sendBatch` call.
- `event_cancelled` with 2 registered, 1 waitlisted, 1 cancelled → `{ total: 3 }`.
- After sending all 250: `announcementProgress` → `{ total: 250, sent: 250, failed: 0, queued: 0 }`.

**Done when:** `npm run test:db -- tests/db/announce.test.ts` passes.

---

## D2-15 · Admin notice actions and panel (plan T18)

**Date:** Fri 27 Nov.

**Build:** The admin controls that send emails: send announcement (preview → recipient count → confirm → live progress → resend to failed only), cancel & notify, and notify registrants of a change. Replace Abdulrahman's announcement-status stub and enable the "notify registrants" button.

**Files:**
- Modify `app/admin/actions.ts` (add a `// notices` group; Abdulrahman's `// events` group stays as is)
- `components/admin/NoticePanel.tsx`
- Modify `app/admin/page.tsx` (announcement status column → `announcementProgress`), `components/admin/WarningBanners.tsx` (enable the notify button)
- `tests/db/admin-notices.test.ts`, `tests/unit/notice-panel.test.tsx`

**Interfaces — produces** (`'use server'`; every function calls `requireAdmin()` first):
```ts
export async function previewNotice(eventId: number, kind: NoticeKind): Promise<{ subject: string; html: string; recipients: number }>
export async function sendAnnouncementAction(eventId: number): Promise<{ total: number } | { error: 'already_started' }>
export async function continueAction(eventId: number, kind: NoticeKind, failedOnly: boolean):
  Promise<{ sent: number; failed: number; remaining: number }>
export async function cancelAndNotifyAction(eventId: number): Promise<{ ok: true; total: number } | { ok: false; reason: string }>
  // setStatus(eventId, 'cancelled') (Abdulrahman, D1-15) → startAnnouncement(eventId, 'event_cancelled')
export async function notifyChangeAction(eventId: number): Promise<{ total: number }>
  // startAnnouncement(eventId, 'event_changed')
```
- `NoticePanel` flow: preview (subject, rendered html in a sandboxed `<iframe srcDoc>`, recipient count) → `ConfirmDialog` → start → call `continueAction` in a loop while `remaining > 0`, showing `t('admin.progress', { sent, total })` → when `failed > 0`, a «resend to failed only» button that calls `continueAction(…, true)`. All buttons are disabled while a call is pending.
- Admin list column: `announcementProgress(id, 'announcement')` → "not sent" / "sending" / `sent of total` / "complete".

**Needs first:** D2-14, D1-13, D1-15.

**Blocks:** D2-16.

**Tests to write:**
- `tests/db/admin-notices.test.ts`:
  - as a non-admin, `sendAnnouncementAction` → `redirect` called (mocked); nothing inserted.
  - as admin, `sendAnnouncementAction` twice → the second returns `{ error: 'already_started' }`.
  - as admin, an event with 2 registered and 1 waitlisted → `cancelAndNotifyAction` returns `{ ok: true, total: 3 }` and the event `status = 'cancelled'`.
  - `previewNotice(e, 'announcement').recipients` equals `(await announcementAudience()).length`.
- `tests/unit/notice-panel.test.tsx`: after confirm, with `continueAction` mocked as a never-resolving promise, the confirm and resend buttons are `disabled`.

**Done when:** `npm test -- tests/unit/notice-panel.test.tsx && npm run test:db -- tests/db/admin-notices.test.ts` passes.

---

## D2-16 · End-to-end tests (plan T22)

**Date:** Sat 28 Nov.

**Build:** Three Playwright journeys from spec §15 that run against a production build and local Supabase, reading sign-in codes and emails from the local mail catcher.

**Files:**
- `playwright.config.ts` (`webServer: { command: 'npm run build && npm start', port: 3000 }`, `use.baseURL: 'http://localhost:3000'`, one worker)
- `tests/e2e/helpers/mail.ts`
- `tests/e2e/journey.spec.ts`, `tests/e2e/waitlist.spec.ts`, `tests/e2e/talent-closed.spec.ts`, `tests/e2e/talent-open.spec.ts`

**Interfaces — produces:**
```ts
// tests/e2e/helpers/mail.ts — Mailpit API at MAIL_CATCHER_URL (from `supabase status`)
export async function latestCodeFor(email: string): Promise<string>   // newest message to `email`; first /\b\d{6}\b/ in its text
export async function waitForEmail(email: string, subjectIncludes: string, timeoutMs = 15_000): Promise<{ html: string; text: string }>
// GET {MAIL_CATCHER_URL}/api/v1/search?query=to:"{email}" → newest ID → GET /api/v1/message/{ID} → { HTML, Text, Subject }
// If `supabase status` shows Inbucket instead of Mailpit, upgrade the Supabase CLI.
```
- The test app runs with `EMAIL_TRANSPORT=smtp` (local mail catcher) and `TOKEN_SECRET`, `CRON_SECRET` set in the CI env file.

**Journeys (each a `test()`; emails unique per run, e.g. `e2e-${Date.now()}@test.local`):**
- `journey.spec.ts`: visit `/events/<SEED.events.open>` → click register → redirected to `/sign-in?returnTo=…` → enter email → read code with `latestCodeFor` → enter code → back on the event page → click register → profile overlay → fill name, choose major `OTHER` + text, level, gender (checkbox left unticked) → save → **without a second click**, the button shows registered → `waitForEmail(email, <confirmation subject>)` → take the cancel link from its html → `page.goto(link)` → the registration is still active (the event page still shows registered in a second tab) → click confirm → result shows cancelled → the event page shows the register button again.
- `waitlist.spec.ts`: user A registers for an event created with capacity 1; user B opens it → sees «اكتملت المقاعد» and join waitlist → joins → sees position 1; A cancels from `/account` → B receives the "you have a seat" email (`waitForEmail`) → B's event page shows registered.
- `talent-closed.spec.ts`, tag `@talent-closed`, **run 1** (form closed: `TALENT_FORM_OPEN=false`, placeholder consent): `/talent` signed out and signed in both show `t('talent.opensSoon')` and no `<form>`.
- `talent-open.spec.ts`, tag `@talent-open`, **run 2** (form open: `TALENT_FORM_OPEN=true` with the fixture consent file; see A-7): sign in a new user with a **non-university** address (`e2e-<timestamp>@gmail.test`), complete the profile, fill every field in `talentFields`, tick consent, submit → success screen contains the English name typed → `/account` shows `t('talent.status.submitted', …)`. This also proves there is no email-domain gate.
- Tags use Playwright's `test('…', { tag: '@talent-open' }, async ({ page }) => …)`. Run 1 command: `npm run test:e2e -- --grep-invert @talent-open`. Run 2 command: `TALENT_FORM_OPEN=true npm run test:e2e -- --grep @talent-open`.

**Needs first:** everything above; A-7 (the CI `e2e` job).

**Blocks:** launch (Abdulaziz's checklist).

**Tests to write:** the three journeys above.

**Done when:** both runs pass locally — run 1 as above; run 2 after `cp tests/fixtures/talent-consent-final.md content/talent-consent/v1.md` (restore afterwards with `git checkout content/talent-consent/v1.md`; never commit the copy) — and both runs of the `e2e` job are green on the PR.

---

## Sun 29 – Mon 30 Nov · Bug bash and fixes

- **Sun 29:** whole-team bug bash on the private production address. Every bug becomes a GitHub issue labelled `launch`.
- **Mon 30:** fix `launch` issues assigned to you; one PR per issue.

---

**If you're stuck:** after 30 minutes on the same problem, push a draft PR with what you have and the question in its description, post the link in the WhatsApp group for Abdulaziz (or Abdulrahman for anything in their area), and move to the next task marked ⇄ or whose "Needs first" is met. Pushing a draft branch early always beats waiting.
