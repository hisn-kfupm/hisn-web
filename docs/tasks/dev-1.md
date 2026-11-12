# Abdulrahman — Tasks for حصن Phase 2

**Feature-complete:** Wed 25 Nov 2026 · **Launch:** Mon 30 Nov 2026 · **Deadline:** Tue 1 Dec 2026
**Your dates:** Thu 12 Nov – Mon 30 Nov
**References:** Spec `docs/superpowers/specs/2026-11-10-hisn-phase2-design.md` (§ numbers below). Plan `docs/superpowers/plans/2026-11-12-hisn-phase2.md` (T numbers below).

## Summary

**You own:** the project scaffold and team conventions (lint rules, string file, data files, basic CI); every public page (shell, homepage, department pages, calendar, event page, library, privacy, 404); the account page; the admin event pages (list, create/edit form, status rules); and the talent page UI.

**You need from others before you can start:**

| You need | From | Expected |
|---|---|---|
| The GitHub repo, with you added as a collaborator | Abdulaziz (A-1) | Thu 12 Nov, first thing in the morning |
| Six department codes, Latin slugs and Lucide icon names | Abdulaziz (A-1) | Fri 13 Nov noon. Until then use placeholders `DEPT_1`…`DEPT_6` |
| Majors list (code, Arabic, English) | Abdulaziz (A-1) | Fri 13 Nov noon. Until then use the 3-row placeholder in D1-2 |
| `supabaseProdServer()` | Abdulaziz (A-2) | Fri 13 Nov |
| Tables and seed data | Abdulaziz (A-3 to A-6) | Sat 14 – Tue 17 Nov |
| `getSession`, `signOut` | Abdullah (D2-4) | Sun 15 Nov |
| `saveProfile`, `useProfileGate`, `FieldErrors` | Abdullah (D2-6, D2-7) | Tue 17 – Wed 18 Nov |
| Registration SQL functions, then the server actions | Abdullah (D2-9, D2-10, D2-11) | Fri 20 – Mon 23 Nov |
| Talent action and field definitions | Abdulaziz (A-11) | Mon 23 Nov |

**Waiting on you:** everyone needs D1-1 (the bare app) on **Thu 12 Nov** to start branching. Abdullah and Abdulaziz need D1-2 (`t()`, data files) on Fri 13. Abdullah's admin notices (D2-15) and Abdulaziz's exports (A-14) need `requireAdmin` (D1-13) on Tue 24.

### Rules for every task

- Write the listed tests first, see them fail, implement, see them pass, open a PR. One task = one PR, opened the same day.
- All constraints in plan "Global Constraints" apply. In particular: no literal UI text in components (keys into `lib/i18n/ar.json`); no `left`/`right` CSS or Tailwind classes (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`); never name a variable `supabase`; times stored UTC, shown `Asia/Riyadh`; wrap emails, URLs and English names inside Arabic text in `<Bdi>`.
- PRs opened before 20:00 are reviewed the same evening, 21:00–22:30. Keep stacking branches while you wait; never sit idle on a review.
- Branch name: `dev1/<task-id>-<slug>`, task id zero-padded to two digits (e.g. `dev1/D1-07-time-logic`). PR title: `<task-id> · <what it does>` (e.g. `D1-07 · Riyadh time and event state logic`).
- Tests in `tests/unit/` must not need a database. Tests in `tests/db/` run against local Supabase (`supabase start`, then `npm run db:reset`) and use `tests/db/helpers.ts` from Abdulaziz (A-6): `clientAs(user)`, `anonClient()`, `pgAdmin()`, `createUser()`, `createEvent()`, `addRegistration()`. Seed ids (users, events such as `SEED.events.draft`) are in `tests/fixtures/seed.ts`. To make a server action run as a test user, mock the client: `vi.mock('@/lib/db/prod', () => ({ supabaseProdServer: async () => clientAs(SEED.admin) }))`.
- `supabaseProdServer()` is **async** (current Next.js `cookies()` is async): `const db = await supabaseProdServer()`.
- **⇄** marks a task you may do out of order or in parallel, under the stated condition.

---

## D1-1 · Bare app, layout and scripts (plan T1)

**Date:** Thu 12 Nov. **Merge the bare app (first commit) within hours** so others can branch; finish the rest the same day.

**Build:** Create the Next.js app (App Router, TypeScript, Tailwind CSS v4, ESLint) with the RTL root layout, the Arabic font and the design tokens. Set up Vitest with three projects and the npm scripts everyone else will use.

**Files:**
- Create with `npx create-next-app@latest hisn --ts --app --tailwind --eslint --src-dir=false --import-alias "@/*"`, then pin the installed `next` version exactly in `package.json`
- `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder)
- `vitest.workspace.ts`, `vitest.setup.ts`
- `.env.example`, `.nvmrc` (`20`)
- `tests/unit/layout.test.tsx`

**Interfaces — produces:**
- `<html lang="ar" dir="rtl">`. Font: `IBM_Plex_Sans_Arabic` from `next/font/google`, weights `['400','500','700']`, subsets `['arabic','latin']`, CSS variable `--font-plex`.
- Design tokens in `app/globals.css` under Tailwind v4 `@theme` (no `tailwind.config.ts`): `--color-bg`, `--color-surface`, `--color-primary` (teal), `--color-accent` (mint), `--color-text`, `--color-muted`, `--color-danger`. Copy the hex values from the teaser's stylesheet (`css/style.css` in the teaser repo).
- `package.json` scripts (exact names; other people's "done when" commands use them):

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `lint` | `eslint . && stylelint "**/*.css"` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run --project unit` |
| `test:db` | `vitest run --project db` |
| `test:scripts` | `vitest run --project scripts` |
| `test:e2e` | `playwright test` |
| `check:content` | `tsx scripts/check-content.ts` |
| `db:reset` | `supabase db reset` (Abdulaziz extends this in A-7) |

- `vitest.workspace.ts` projects: `unit` (`tests/unit/**`, environment `jsdom`), `db` (`tests/db/**`, environment `node`), `scripts` (`tests/scripts/**`, environment `node`). All with `passWithNoTests: true`.
- `.env.example` lists `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` with values blank and a comment `# fill from: supabase status`. Abdulaziz adds the remaining variables in A-2.

**Needs first:** the GitHub repo from Abdulaziz (A-1), Thu 12 Nov morning. Thursday order: Abdulaziz creates the empty repo → you push the bare app straight to `main` (the only direct push; Abdulaziz turns on branch protection right after) → Abdullah and Abdulaziz clone it.

**Blocks:** everyone (all branches start from this).

**Tests to write** (`tests/unit/layout.test.tsx`):
- Rendering `RootLayout` with `react-dom/server` `renderToStaticMarkup` produces a string containing `lang="ar"` and `dir="rtl"`.

**Done when:** `npm run lint && npm run typecheck && npm test && npm run build` passes.

---

## D1-2 · Strings, data files and labels (plan T1)

**Date:** Fri 13 Nov.

**Build:** The single strings file with a typed `t()` helper, the three data files, and label helpers that turn codes into Arabic or English names.

**Files:**
- `lib/i18n/ar.json`, `lib/i18n/t.ts`
- `data/majors.json`, `data/academic-levels.json`, `data/departments.json`
- `lib/data/labels.ts`
- `tests/unit/i18n.test.ts`, `tests/unit/labels.test.ts`

**Interfaces — produces:**

```ts
// lib/i18n/t.ts
import ar from './ar.json'
export type StringKey = keyof typeof ar
export function t(key: StringKey, vars?: Record<string, string | number>): string
```
- `ar.json` is a **flat** object with dotted keys (`{"seats.left": "تبقّى {n} مقعدًا"}`), not nested.
- Placeholders are `{name}`. A placeholder with no matching var **throws** `Error('missing var n for key seats.left')`.

```ts
// lib/data/labels.ts
export type DataFile = 'majors' | 'levels' | 'departments'
export const majors: { code: string; ar: string; en: string }[]          // last entry { code: 'OTHER', ar: 'أخرى', en: 'Other' }
export const academicLevels: { code: string; ar: string; en: string }[]  // BACHELOR / MASTER / PHD
export const departments: { code: string; slug: string; icon: string }[]
export function label(file: 'majors' | 'levels', code: string): string     // Arabic; throws Error(`unknown code ${code}`)
export function labelEn(file: 'majors' | 'levels', code: string): string   // English; same throw
```
- Department Arabic names live in `ar.json` as `dept.<CODE>.title`, not in the data file.
- `data/academic-levels.json`: `[{"code":"BACHELOR","ar":"بكالوريوس","en":"Bachelor's"},{"code":"MASTER","ar":"ماجستير","en":"Master's"},{"code":"PHD","ar":"دكتوراه","en":"Doctorate"}]`.
- `data/majors.json` placeholder until Abdulaziz's list arrives: `[{"code":"SWE","ar":"هندسة البرمجيات","en":"Software Engineering"},{"code":"EE","ar":"الهندسة الكهربائية","en":"Electrical Engineering"},{"code":"OTHER","ar":"أخرى","en":"Other"}]`. `OTHER` always stays last.
- `data/departments.json` placeholder: six entries `{"code":"DEPT_1","slug":"department-1","icon":"Shield"}` … `DEPT_6`. Replace with the real ones when A-1 sends them. Codes can change freely until launch; after launch they are append-only.

**Needs first:** D1-1. Real department and majors lists from Abdulaziz (use placeholders until then; do not wait).

**Blocks:** Abdullah (D2-3 onwards uses `t()`); Abdulaziz (A-3 check constraints copy the codes).

**Tests to write:**
- `tests/unit/i18n.test.ts`:
  - **Every `t()` key used in the code exists in `ar.json`.** Scan `app/`, `components/`, `lib/` for `t\(\s*'([^']+)'` and `labelKey:\s*'([^']+)'`; every captured key is a key of `ar.json`.
  - `t('seats.left', { n: 3 })` contains `'3'`.
  - `t('seats.left')` throws `'missing var n for key seats.left'`.
- `tests/unit/labels.test.ts`:
  - `label('majors', 'OTHER') === 'أخرى'`
  - `label('levels', 'PHD') === 'دكتوراه'`
  - `labelEn('levels', 'BACHELOR') === "Bachelor's"`
  - `label('majors', 'NOPE')` throws `'unknown code NOPE'`
  - `majors[majors.length - 1].code === 'OTHER'`
  - Department codes are unique and slugs match `/^[a-z0-9-]+$/`.

**Done when:** `npm run typecheck && npm test -- tests/unit/i18n.test.ts tests/unit/labels.test.ts` passes.

---

## D1-3 · Lint rules for the conventions (plan T1)

**Date:** Sat 14 Nov (a full day; custom ESLint rules take setting up).

**Build:** Four custom ESLint rules and a Stylelint config that turn the team conventions into build failures.

**Files:**
- `tools/eslint-rules/no-literal-text.js`, `no-supabase-name.js`, `talent-import.js`, `no-physical-classes.js`, `index.js` (plugin `hisn`)
- `eslint.config.mjs` (flat config, all four rules at `error`; ignore `tests/**`, `scripts/**`, `supabase/**`)
- `.stylelintrc.json`
- `tests/unit/lint-rules.test.ts`, `tests/unit/stylelint.test.ts`

**Interfaces — produces (rule behaviour, exact):**
- `hisn/no-literal-text`: error on any `JSXText` containing a letter (`/\p{L}/u`), and on string-literal values of JSX attributes `alt`, `title`, `placeholder`, `aria-label`.
- `hisn/no-supabase-name`: error on any binding (variable, parameter, import specifier) named exactly `supabase`.
- `hisn/talent-import`: error on any import whose source is `@/lib/db/talent` (or a relative path resolving to `lib/db/talent`) in any file other than `app/talent/actions.ts`.
- `hisn/no-physical-classes`: error when a `className` string or template literal matches `/(^|\s)-?(m[lr]|p[lr]|left|right|rounded-[lr]|border-[lr]|float-(left|right)|text-(left|right))(-|\s|$)/`.
- `.stylelintrc.json`: `"property-disallowed-list": ["margin-left","margin-right","padding-left","padding-right","left","right","border-left","border-right"]`, `"declaration-property-value-disallowed-list": {"text-align": ["left","right"], "float": ["left","right"]}`.

**Needs first:** D1-1.

**Blocks:** nobody directly; every later PR is checked by these rules.

**Tests to write:**
- `tests/unit/lint-rules.test.ts` (ESLint `RuleTester`):
  - `<p>مرحبا</p>` → 1 error (`no-literal-text`). `<p>{t('home.title')}</p>` → valid. `<img alt="شعار" />` → 1 error. `<p> </p>` → valid.
  - `const supabase = createClient()` → 1 error. `const supabaseProd = …` → valid.
  - `import { insertTalentEntry } from '@/lib/db/talent'` in `app/page.tsx` → 1 error; same import in `app/talent/actions.ts` → valid.
  - `<div className="ml-4 p-2" />` → 1 error; `<div className="ms-4" />` → valid; `<div className="text-right" />` → 1 error.
- `tests/unit/stylelint.test.ts`:
  - `stylelint.lint({ code: 'a{margin-left:1px}', config })` → `errored === true`.
  - `'a{text-align:right}'` → errored. `'a{margin-inline-start:1px}'` → not errored.

**Done when:** `npm run lint && npm test -- tests/unit/lint-rules.test.ts tests/unit/stylelint.test.ts` passes.

---

## D1-4 · Placeholder check and basic CI ⇄ (plan T1)

**Date:** Sun 15 Nov (morning). ⇄ May be done before D1-3.

**Build:** A script that fails while any placeholder text («مؤقت») remains, and the first GitHub Actions workflow for pull requests.

**Files:**
- `scripts/check-content.ts`
- `.github/workflows/pr.yml`
- `tests/unit/check-content.test.ts`, `tests/fixtures/content/{with-marker.json,clean.json}`

**Interfaces — produces:**
```ts
// scripts/check-content.ts
export function findPlaceholders(paths: string[]): { file: string; where: string }[]
// `where` = the JSON key for .json files, the line number ("line 12") for .md files.
// CLI: scans lib/i18n/ar.json and content/**/*.md; prints each hit; exit code 1 if any, 0 if none.
```
- `pr.yml` job `checks`, on `pull_request`: `actions/setup-node` with `.nvmrc`, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run check:content` with `continue-on-error: true`. Abdulaziz adds database and E2E jobs in A-7; leave the file easy to extend (one job per concern).

**Needs first:** D1-1.

**Blocks:** Abdulaziz (A-7 extends this workflow).

**Tests to write:**
- `findPlaceholders(['tests/fixtures/content/with-marker.json'])` returns `[{ file: 'tests/fixtures/content/with-marker.json', where: 'home.title' }]` where the fixture is `{"home.title":"عنوان «مؤقت»","home.sub":"نص"}`.
- `findPlaceholders(['tests/fixtures/content/clean.json'])` returns `[]`.

**Done when:** `npm test -- tests/unit/check-content.test.ts` passes and the PR shows the `checks` job green.

---

## D1-5 · Shell: header, footer, Bdi, 404 and error pages (plan T8)

**Date:** Sun 15 Nov (afternoon) – Mon 16 Nov.

**Build:** The site header and navigation from spec §6.3 (sign-in button always visible, outside the mobile menu), the footer, a `<Bdi>` component for mixed-direction values, and Arabic 404 and error pages with full navigation.

**Files:**
- `components/Header.tsx`, `components/MobileMenu.tsx`, `components/Footer.tsx`, `components/Bdi.tsx`
- `app/not-found.tsx`, `app/error.tsx`
- Modify `app/layout.tsx` (render Header and Footer)
- `tests/unit/bdi.test.tsx`, `tests/unit/header.test.tsx`

**Interfaces:**
- Produces:
```ts
export function Bdi(props: { children: React.ReactNode }): JSX.Element   // renders <bdi>{children}</bdi>
export function Header(props: { session: { email: string } | null }): JSX.Element
export function Footer(): JSX.Element   // contains <NewsletterForm/> slot (D1-6), link /privacy, mailto:Contact@Hisn-sa.org
```
- Header links: logo → `/`; الأقسام dropdown (one link per `departments` entry → `/departments/{slug}`, label `t('dept.<CODE>.title')`); الفعاليات → `/events`; المكتبة → `/library`; قاعدة المواهب → `/talent`. Signed out: button → `/sign-in`. Signed in: menu with حسابي → `/account` and تسجيل الخروج (calls `signOut`).
- The sign-in button / account menu has `data-testid="auth-entry"` and is **not** a descendant of the mobile menu element (`data-testid="mobile-menu"`).
- Consumes: `getSession(): Promise<{ userId: string; email: string } | null>` and `signOut(): Promise<void>` from `lib/auth/session.ts` (Abdullah, D2-4).

**Stub until D2-4 merges:** `app/layout.tsx` passes `session={null}` to `Header`, and the sign-out item is omitted. When D2-4 is on `main`, replace with `const session = await getSession()` and wire `signOut` (a 2-line follow-up PR).

**Needs first:** D1-2.

**Blocks:** nothing hard; all pages render inside this shell.

**Tests to write:**
- `tests/unit/bdi.test.tsx`: `render(<Bdi>ali@gmail.com</Bdi>)` → `container.querySelector('bdi')?.textContent === 'ali@gmail.com'`.
- `tests/unit/header.test.tsx`:
  - With `session={null}`: a link with `href="/sign-in"` exists inside `[data-testid="auth-entry"]`.
  - With `session={{ email: 'a@b.com' }}`: a link `href="/account"` exists; no link `href="/sign-in"`.
  - `[data-testid="auth-entry"]` is not contained in `[data-testid="mobile-menu"]`.
  - The departments dropdown contains exactly `departments.length` links, each `href` starting with `/departments/`.

**Done when:** `npm run lint && npm run typecheck && npm test -- tests/unit/bdi.test.tsx tests/unit/header.test.tsx` passes, and on the Vercel preview there is no horizontal scroll at 375 px or 1280 px.

---

## D1-6 · Newsletter form and privacy page (plan T8)

**Date:** Tue 17 Nov.

**Build:** The footer newsletter form, with a hidden spam trap, that adds an email to `signups` through Abdulaziz's database function. Also the privacy page with the exact content from spec §7.10.

**Files:**
- `components/NewsletterForm.tsx`, `app/actions/newsletter.ts`
- `app/privacy/page.tsx`
- `lib/config/retention.ts` (you create it; Abdulaziz uses it later)
- `tests/unit/newsletter.test.ts`, `tests/db/newsletter.test.ts`, `tests/unit/privacy.test.tsx`

**Interfaces:**
- Produces:
```ts
// app/actions/newsletter.ts  ('use server')
export async function subscribeNewsletter(formData: FormData): Promise<{ ok: true } | { ok: false; reason: 'invalid' }>
// honeypot field name: 'website'. If non-empty → return { ok: true } without calling the database.
// Email validated with z.string().trim().email(). Duplicate emails → { ok: true } (same message as new).
// The SQL function also rejects malformed emails with errcode '22023' → return { ok: false, reason: 'invalid' }.

// lib/config/retention.ts — exact content:
export const TALENT_RETENTION_MONTHS: number | null = null
```
- Consumes: SQL `newsletter_signup(p_email text, p_source text default 'footer') returns void` (Abdulaziz, A-5), called as `(await supabaseProdServer()).rpc('newsletter_signup', { p_email, p_source: 'footer' })`. Direct inserts into `signups` are not allowed; this function is the only way in.
- Privacy page: sections from spec §7.10. Retention paragraph: when `TALENT_RETENTION_MONTHS === null` → `t('privacy.retention.unset')`; otherwise `t('privacy.retention.set', { months: TALENT_RETENTION_MONTHS })`. Contact address `Contact@Hisn-sa.org` wrapped in `<Bdi>`.

**Stub until A-5 merges:** none needed for the unit tests (mock the client). Run the `tests/db` test once A-5 is on `main`.

**Needs first:** D1-5 (Footer), A-2 (`supabaseProdServer`), A-5 (`newsletter_signup`).

**Blocks:** nobody.

**Tests to write:**
- `tests/unit/newsletter.test.ts` (mock `supabaseProdServer`):
  - FormData `{ email: 'a@b.com', website: 'spam' }` → returns `{ ok: true }` and `rpc` was called 0 times.
  - `{ email: 'not-an-email' }` → `{ ok: false, reason: 'invalid' }`, `rpc` called 0 times.
  - `{ email: ' A@B.com ' }` → `rpc` called once with `('newsletter_signup', { p_email: 'A@B.com', p_source: 'footer' })` (trimmed; the SQL function lowercases).
  - `rpc` returns `{ error: { code: '22023' } }` for `{ email: 'a@b.c' }` → `{ ok: false, reason: 'invalid' }`.
- `tests/db/newsletter.test.ts`: calling `subscribeNewsletter` twice with `x@test.com` → both `{ ok: true }`; `select count(*) from signups where lower(email) = 'x@test.com'` = 1.
- `tests/unit/privacy.test.tsx`: rendered page text contains `'Contact@Hisn-sa.org'` and the text of `t('privacy.retention.unset')`.

**Done when:** `npm test -- tests/unit/newsletter.test.ts tests/unit/privacy.test.tsx && npm run test:db -- tests/db/newsletter.test.ts` passes.

---

## D1-7 · Time, almost-full and event state logic ⇄ (plan T10)

**Date:** Wed 18 Nov. ⇄ Pure functions with no database: can be done any time after D1-2, including while blocked on anything else.

**Build:** All the logic the calendar and event page depend on: Riyadh-time dates, the almost-full rule, the button state machine, and the shared event types.

**Files:**
- `lib/time/riyadh.ts`, `lib/events/almost-full.ts`, `lib/events/state.ts`, `lib/events/types.ts`
- `tests/unit/riyadh.test.ts`, `tests/unit/almost-full.test.ts`, `tests/unit/event-state.test.ts`

**Interfaces — produces:**
```ts
// lib/events/types.ts
export type PublicEvent = {
  id: number; title: string; description: string; departmentCode: string | null;
  startsAt: string; endsAt: string;                      // ISO UTC
  format: 'in_person' | 'online'; location: string | null; presenter: string | null;
  capacity: number | null; registrationClosesAt: string;
  status: 'published' | 'cancelled'; imageUrl: string | null; recordingUrl: string | null
}   // no meeting URL field, ever
export type RegisterResult =
  | 'registered' | 'already_registered' | 'already_waitlisted' | 'full' | 'closed' | 'cancelled' | 'not_found' | 'profile_required'
  | { needsProfile: true }
export type JoinWaitlistResult =
  | { result: 'waitlisted' | 'already_waitlisted' | 'already_registered' | 'not_full' | 'no_capacity' | 'closed' | 'cancelled' | 'not_found' | 'profile_required'; position?: number }
  | { needsProfile: true }
export type CancelResult = 'cancelled' | 'not_found' | 'started'
export type ButtonState = 'open' | 'open_almost_full' | 'registered' | 'full' | 'waitlisted' | 'closed' | 'cancelled' | 'ended'

// lib/time/riyadh.ts
export const RIYADH_LOCALE = 'ar-SA-u-ca-gregory-nu-latn'   // Gregorian calendar, Latin digits
export function riyadhDateKey(utcIso: string): string        // 'YYYY-MM-DD' in Asia/Riyadh
export function riyadhMonth(utcIso: string): string          // 'YYYY-MM'
export function formatRiyadh(utcIso: string, style: 'date' | 'time' | 'datetime'): string

// lib/events/almost-full.ts
export const ALMOST_FULL_RATIO = 0.2
export function isAlmostFull(capacity: number | null, seatsLeft: number | null): boolean
// true iff capacity !== null && seatsLeft !== null && 0 < seatsLeft && seatsLeft <= Math.max(1, Math.floor(capacity * ALMOST_FULL_RATIO))

// lib/events/state.ts
export function eventButtonState(e: PublicEvent, seatsLeft: number | null,
  mine: 'registered' | 'waitlisted' | null, now: Date): ButtonState
```
- `eventButtonState` evaluates in this exact order; the first match wins: `status === 'cancelled'` → `cancelled`; `now >= endsAt` → `ended`; `mine === 'registered'` → `registered`; `mine === 'waitlisted'` → `waitlisted`; `now >= registrationClosesAt` → `closed`; `seatsLeft === 0` → `full`; `isAlmostFull(capacity, seatsLeft)` → `open_almost_full`; otherwise `open`.
- `riyadhDateKey` uses `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' })`. `formatRiyadh` uses `RIYADH_LOCALE` with `timeZone: 'Asia/Riyadh'`.

**Needs first:** D1-2.

**Blocks:** D1-8, D1-10, D1-11 (yours); Abdullah imports `RegisterResult`, `JoinWaitlistResult`, `CancelResult` in D2-11.

**Tests to write:**
- `riyadh.test.ts`:
  - `riyadhDateKey('2026-11-30T20:30:00Z') === '2026-11-30'`
  - `riyadhDateKey('2026-11-30T21:30:00Z') === '2026-12-01'`
  - `riyadhMonth('2026-11-30T21:30:00Z') === '2026-12'`
  - `formatRiyadh('2026-11-18T15:00:00Z', 'time')` contains `'6:00'` and does not contain `'15:00'`
  - `formatRiyadh('2026-11-18T15:00:00Z', 'date')` contains `'18'` and `'2026'` and does not contain `'1448'` (guards against the Hijri calendar default)
- `almost-full.test.ts`: `isAlmostFull(30, 6) === true`; `(30, 7) === false`; `(10, 2) === true`; `(10, 0) === false`; `(4, 1) === true`; `(null, null) === false`.
- `event-state.test.ts` (fixture event: starts `2026-11-20T15:00:00Z`, ends `2026-11-20T17:00:00Z`, closes `2026-11-20T15:00:00Z`, capacity 30, status published):
  - status `cancelled`, `mine = 'registered'` → `'cancelled'`
  - `now = 2026-11-20T18:00Z` → `'ended'`
  - `now = 2026-11-20T15:30Z`, `mine = 'registered'` → `'registered'`
  - `now = 2026-11-20T15:30Z`, `mine = null` → `'closed'`
  - `now = 2026-11-19T10:00Z`, `seatsLeft = 0`, `mine = null` → `'full'`
  - same, `seatsLeft = 0`, `mine = 'waitlisted'` → `'waitlisted'`
  - same, `seatsLeft = 5` → `'open_almost_full'`
  - same, `seatsLeft = 20` → `'open'`
  - capacity `null`, `seatsLeft = null` → `'open'`

**Done when:** `npm test -- tests/unit/riyadh.test.ts tests/unit/almost-full.test.ts tests/unit/event-state.test.ts` passes.

---

## D1-8 · Homepage and event queries (plan T9)

**Date:** Thu 19 Nov.

**Build:** The homepage from spec §6.2 (hero, six department cards, next 3 events, latest 3 recordings, talent invitation, newsletter), and the read queries for public events.

**Files:**
- `app/page.tsx`
- `components/Hero.tsx`, `components/DepartmentCard.tsx`, `components/EventCard.tsx`, `components/EventImage.tsx`
- `lib/events/queries.ts`, `lib/config/content.ts`
- `tests/db/queries.test.ts`, `tests/unit/event-image.test.tsx`

**Interfaces:**
- Produces:
```ts
// lib/events/queries.ts
export const PUBLIC_EVENT_COLUMNS =
  'id,title,description,department_code,starts_at,ends_at,format,location,presenter,capacity,registration_closes_at,status,image_url,recording_url'
export async function upcomingEvents(opts: { limit: number; departmentCode?: string }): Promise<PublicEvent[]>
  // status = 'published' AND starts_at > now(), ordered starts_at ASC
export async function latestRecordings(opts: { limit: number; departmentCode?: string }): Promise<PublicEvent[]>
  // status = 'published' AND ends_at < now() AND recording_url IS NOT NULL, ordered ends_at DESC
export async function getPublicEvent(id: number): Promise<PublicEvent | null>
  // status IN ('published','cancelled'); null otherwise
export function toPublicEvent(row: Record<string, unknown>): PublicEvent   // snake_case → camelCase

// lib/config/content.ts — exact content:
export const HERO_IMAGE: { src: string } | null = null   // set to { src: '/hero.jpg' } once Abdulaziz confirms clearance
```
- `Hero`: when `HERO_IMAGE` is null, render the typographic hero on the brand gradient (`--color-primary` → `--color-accent`); quote and attribution from `t('hero.quote')`, `t('hero.attribution')`.
- `EventImage` (client component): `imageUrl` → department icon (Lucide component named in `departments.json`) → Lucide `Shield`. Falls back on `onError` too. Plain `<img>`, not `next/image`.
- Homepage: `export const revalidate = 3600` (admin saves also call `revalidatePath`).
- Consumes: `supabaseProdServer()` (A-2), tables and seed (A-3, A-6).

**Needs first:** D1-7, A-2, A-3, A-6 (seed, Tue 17).

**Blocks:** D1-9 (reuses the queries).

**Tests to write:**
- `tests/db/queries.test.ts` (against the seed):
  - `upcomingEvents({ limit: 3 })` returns ≤ 3 events, every `status === 'published'`, every `new Date(startsAt) > new Date()`.
  - No seed event with status `draft` appears in `upcomingEvents({ limit: 100 })`.
  - `upcomingEvents({ limit: 100, departmentCode: departments[0].code })` → non-empty, and every `departmentCode === departments[0].code`.
  - `Object.keys(result[0])` does not include `meetingUrl` or `meeting_url`.
  - `latestRecordings({ limit: 100 })` → every `recordingUrl !== null` and every `endsAt` in the past; includes `SEED.events.pastWithRecording`, excludes `SEED.events.pastNoRecording`.
  - `getPublicEvent(SEED.events.draft)` → `null`; `getPublicEvent(SEED.events.cancelled)` → an event with `status === 'cancelled'`.
- `tests/unit/event-image.test.tsx`:
  - `imageUrl: 'https://x/y.png'` → renders `<img src="https://x/y.png">`.
  - `imageUrl: null`, `departmentCode: 'DEPT_1'` → renders the department icon (`data-testid="dept-icon"`).
  - Firing `error` on the `<img>` → the department icon renders instead.

**Done when:** `npm test -- tests/unit/event-image.test.tsx && npm run test:db -- tests/db/queries.test.ts` passes.

---

## D1-9 · Department hub pages (plan T9)

**Date:** Fri 20 Nov.

**Build:** One static page per department (spec §6.4): title, description, example roles, upcoming events in this department, recordings in this department, and the talent invitation.

**Files:**
- `app/departments/[slug]/page.tsx`
- `tests/unit/departments.test.ts`

**Interfaces:**
- `generateStaticParams(): { slug: string }[]` from `data/departments.json`.
- Unknown slug → `notFound()` from `next/navigation`.
- Text keys: `dept.<CODE>.title`, `dept.<CODE>.summary`, `dept.<CODE>.description`, `dept.<CODE>.role1` … `dept.<CODE>.role4`. A role key whose value is an empty string is not rendered. All values start as placeholders containing «مؤقت».
- Consumes: `upcomingEvents`, `latestRecordings` (D1-8) with `departmentCode`.
- `export const revalidate = 3600`.

**Needs first:** D1-8.

**Blocks:** nobody.

**Tests to write:**
- `generateStaticParams()` returns 6 entries whose slugs equal `departments.map(d => d.slug)`.
- Rendering the page with `params = { slug: 'nope' }` calls `notFound` (mock `next/navigation`).
- For the first department, the page calls `upcomingEvents` with `{ limit: 6, departmentCode: departments[0].code }` (mock the query module).

**Done when:** `npm test -- tests/unit/departments.test.ts` passes.

---

## D1-10 · Calendar page (plan T10)

**Date:** Sat 21 Nov.

**Build:** `/events`: a month grid on desktop and a date-grouped list on mobile, with month navigation in the URL, Riyadh-time days, status badges and the "next event" banner (spec §7.3).

**Files:**
- `app/events/page.tsx`
- `components/MonthGrid.tsx`, `components/EventList.tsx`
- `lib/events/month.ts`, `lib/events/seats.ts`
- Modify `lib/events/queries.ts` (add `eventsInMonth`)
- `tests/unit/month.test.ts`, `tests/unit/seats.test.ts`

**Interfaces — produces:**
```ts
// lib/events/month.ts
export function parseMonthParam(m: string | undefined, now: Date): string   // valid 'YYYY-MM' (01–12) → itself; else current Riyadh month
export function monthRangeUtc(month: string): { from: string; to: string }  // [from, to) as ISO UTC
export function buildMonthGrid(month: string): string[]  // 'YYYY-MM-DD' cells, weeks start Sunday, whole weeks
export function nextMonth(month: string): string
export function prevMonth(month: string): string

// lib/events/queries.ts (add)
export async function eventsInMonth(month: string): Promise<PublicEvent[]>
  // status IN ('published','cancelled'), starts_at in monthRangeUtc(month), ordered starts_at ASC

// lib/events/seats.ts
export async function getSeatsLeft(eventId: number): Promise<number | null>
  // (await supabaseProdServer()).rpc('seats_left', { p_event_id: eventId }).
  // If the call errors with code '42883' (function does not exist yet) → return null. Any other error → throw.
```
- Grid shown at `md` and above (`hidden md:block`); list below `md` (`md:hidden`). Days grouped with `riyadhDateKey`.
- Badges: `t('event.badge.ended')` «انتهت» when ended; `t('event.badge.cancelled')` «أُلغيت»; `t('event.badge.almostFull')` «المقاعد شارفت على الاكتمال!» when `isAlmostFull`.
- If no event in the month has `startsAt > now`, show a banner linking to `upcomingEvents({ limit: 1 })[0]` (omit the banner if none).
- Page is dynamic (`export const dynamic = 'force-dynamic'`) because of seat counts.

**Stub until D2-9 merges:** `getSeatsLeft` returns `null` when `seats_left` does not exist (error `42883`), so no almost-full badges show yet. No code change is needed when D2-9 lands.

**Needs first:** D1-7, D1-8.

**Blocks:** nobody.

**Tests to write:**
- `month.test.ts`:
  - `monthRangeUtc('2026-11')` → `{ from: '2026-10-31T21:00:00.000Z', to: '2026-11-30T21:00:00.000Z' }`
  - `buildMonthGrid('2026-11')`: length `35`, `[0] === '2026-11-01'`, `[34] === '2026-12-05'`
  - `buildMonthGrid('2026-12')[0] === '2026-11-29'`
  - `nextMonth('2026-12') === '2027-01'`; `prevMonth('2026-01') === '2025-12'`
  - `parseMonthParam('2026-13', new Date('2026-11-12T10:00:00Z')) === '2026-11'`; `parseMonthParam('2026-11', …) === '2026-11'`; `parseMonthParam(undefined, new Date('2026-11-30T22:00:00Z')) === '2026-12'`
- `seats.test.ts` (mock client): rpc error `{ code: '42883' }` → `null`; rpc `{ data: 4 }` → `4`; rpc error `{ code: '500' }` → throws.

**Done when:** `npm test -- tests/unit/month.test.ts tests/unit/seats.test.ts` passes; on the preview, navigating Nov → Dec → Nov keeps `?m=` in the URL.

---

## D1-11 · Event page and register button (plan T10)

**Date:** Sun 22 Nov.

**Build:** `/events/[id]` with all details from spec §7.4 and a `RegisterButton` that renders each state and calls the registration actions. The actions are stubbed until Abdullah's D2-11 merges.

**Files:**
- `app/events/[id]/page.tsx`
- `components/RegisterButton.tsx`, `components/ConfirmDialog.tsx`
- `lib/events/actions-stub.ts` (temporary)
- `lib/events/mine.ts`
- `tests/unit/register-button.test.tsx`

**Interfaces:**
- Produces:
```ts
// components/RegisterButton.tsx ('use client')
export function RegisterButton(props: {
  eventId: number; state: ButtonState; position: number | null; signedIn: boolean;
  recordingUrl: string | null;
  actions: {
    register(eventId: number): Promise<RegisterResult>;
    joinWaitlist(eventId: number): Promise<JoinWaitlistResult>;
    cancel(eventId: number): Promise<CancelResult>;
  }
}): JSX.Element

// lib/events/mine.ts
export async function myStatus(eventId: number): Promise<'registered' | 'waitlisted' | null>
  // own row in registrations via supabaseProdServer (RLS returns only own rows); 'cancelled' → null
export async function myWaitlistPosition(eventId: number): Promise<number | null>
  // rpc('waitlist_position', { p_event_id }); error code '42883' → null
```
- `id` param not matching `/^\d+$/` or `getPublicEvent` returning `null` → `notFound()`.
- Not signed in: every actionable state renders a link to `/sign-in?returnTo=/events/{id}` instead of a button.
- States → UI (spec §7.4): `open` سجّل; `open_almost_full` سجّل + «المقاعد شارفت على الاكتمال!»; `registered` مسجّل ✓ + إلغاء التسجيل; `full` اكتملت المقاعد + انضم لقائمة الانتظار; `waitlisted` `t('waitlist.position', { n })` + مغادرة القائمة; `closed` أُغلق التسجيل; `cancelled` أُلغيت الفعالية; `ended` انتهت + شاهد التسجيل (link to `/library`) when `recordingUrl`.
- Cancel and leave open `ConfirmDialog` (a `<dialog>` element, never `window.confirm`).
- While an action is pending, all buttons are `disabled` (`useTransition`).
- A result of `{ needsProfile: true }` → call `useProfileGate()` (D2-7) with a function that re-runs the same action.
- Page: `export const dynamic = 'force-dynamic'`. Meeting link is never fetched on this page.

**Stub until D2-11 merges** — `lib/events/actions-stub.ts`, exact content:
```ts
'use server'
import type { RegisterResult, JoinWaitlistResult, CancelResult } from './types'
export async function registerAction(_eventId: number): Promise<RegisterResult> { return 'registered' }
export async function joinWaitlistAction(_eventId: number): Promise<JoinWaitlistResult> { return { result: 'waitlisted', position: 1 } }
export async function cancelAction(_eventId: number): Promise<CancelResult> { return 'cancelled' }
```
The page imports from this stub. Abdullah switches the import to `app/events/[id]/actions.ts` and deletes the stub in D2-11.

**Needs first:** D1-7, D1-8, D1-10 (`getSeatsLeft`), D2-7 (`useProfileGate`, merged Wed 18).

**Blocks:** Abdullah (D2-11 wires real actions into this component).

**Tests to write** (`tests/unit/register-button.test.tsx`, with mocked `actions`):
- `state='full'`, signed in → a button with text `t('waitlist.join')` exists.
- `state='waitlisted'`, `position=3` → text `t('waitlist.position', { n: 3 })` and a button `t('waitlist.leave')`.
- `state='open_almost_full'` → text «المقاعد شارفت على الاكتمال!».
- `state='open'`, `signedIn=false`, `eventId=7` → a link with `href="/sign-in?returnTo=/events/7"` and no button.
- `register` mock returns a never-resolving promise; after click, the button is `disabled`.
- `register` mock resolves `{ needsProfile: true }` → the mocked `useProfileGate` callback is called once.
- `state='ended'`, `recordingUrl='https://youtu.be/abc'` → link `t('event.watchRecording')` exists.

**Done when:** `npm test -- tests/unit/register-button.test.tsx` passes; the preview shows each state using seed events.

---

## D1-12 · Library ⇄ (plan T11)

**Date:** Mon 23 Nov. ⇄ Independent of D1-10/D1-11; can be done any time after D1-8.

**Build:** `/library`: recordings of ended events, newest first, with a department filter. Each card shows a thumbnail and plays in place on click; only one video plays at a time.

**Files:**
- `app/library/page.tsx`
- `components/VideoCard.tsx`, `components/ActiveVideoProvider.tsx`
- `lib/youtube.ts`, `lib/config/flags.ts` (you create it; Abdulaziz adds to it in A-11)
- `tests/unit/youtube.test.ts`, `tests/unit/video-card.test.tsx`

**Interfaces — produces:**
```ts
// lib/youtube.ts
export function youtubeId(url: string): string | null
// accepts youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID (http/https, with or without www); else null

// lib/config/flags.ts — initial content:
export const LIBRARY_REQUIRES_SIGN_IN = process.env.LIBRARY_REQUIRES_SIGN_IN === 'true'
```
- Thumbnail `https://i.ytimg.com/vi/{id}/hqdefault.jpg`; on click, replaced by `<iframe src="https://www.youtube-nocookie.com/embed/{id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen>`. `ActiveVideoProvider` holds one active id; activating a card deactivates the previous one.
- Filter `?d=<CODE>` (a code from `departments.json`; unknown → no filter).
- If `LIBRARY_REQUIRES_SIGN_IN` and no session → `redirect('/sign-in?returnTo=/library')`.
- Consumes: `latestRecordings({ limit: 60, departmentCode })` (D1-8).

**Needs first:** D1-8.

**Blocks:** nobody. (D1-14 uses `youtubeId` to validate recording URLs.)

**Tests to write:**
- `youtube.test.ts`: `youtubeId('https://www.youtube.com/watch?v=abc123XYZ_-') === 'abc123XYZ_-'`; `youtubeId('https://youtu.be/abc123') === 'abc123'`; `youtubeId('https://youtube.com/shorts/abc123') === 'abc123'`; `youtubeId('https://www.youtube.com/embed/abc123') === 'abc123'`; `youtubeId('https://vimeo.com/1') === null`; `youtubeId('not a url') === null`.
- `video-card.test.tsx`: before click, an `<img>` with `src="https://i.ytimg.com/vi/abc123/hqdefault.jpg"` and no iframe; after click, an `<iframe>` with `src="https://www.youtube-nocookie.com/embed/abc123?autoplay=1"`; with two cards, clicking the second removes the first iframe.

**Done when:** `npm test -- tests/unit/youtube.test.ts tests/unit/video-card.test.tsx` passes; a seed recording plays in place on the preview.

---

## D1-13 · Admin guard and events list (plan T17)

**Date:** Tue 24 Nov.

**Build:** The `/admin` area: a server-side guard that admits only profiles with `is_admin`, and the events list with registration and waitlist counts.

**Files:**
- `lib/admin/require-admin.ts`
- `app/admin/layout.tsx`, `app/admin/page.tsx`
- `lib/admin/counts.ts`
- `tests/unit/admin-guard.test.ts`, `tests/unit/admin-counts.test.ts`

**Interfaces — produces:**
```ts
// lib/admin/require-admin.ts
export async function requireAdmin(): Promise<{ userId: string }>
// no session → redirect('/sign-in?returnTo=/admin'); profile missing or is_admin false → redirect('/')

// lib/admin/counts.ts
export function summarizeCounts(rows: { event_id: number; status: 'registered' | 'waitlisted' | 'cancelled' }[]):
  Record<number, { registered: number; waitlisted: number }>
```
- Admin pages read and write events, registrations and profiles with `supabaseProdServer()`, i.e. the admin's own session (database policies grant admins access). **Do not use `supabaseProdService()` in your admin code.** (Abdullah's email functions use it internally; that is separate.)
- List columns: title, Riyadh date, status, `registered / capacity` (or `registered / ∞`), waitlist count, announcement status, edit link → `/admin/events/{id}`, "new event" → `/admin/events/new`.
- Every file under `app/admin/` calls `requireAdmin()` first (layout and each server action).

**Stub until D2-14 merges:** the announcement status column shows `t('admin.announce.notSent')` when `announcement_started_at` is null, else `t('admin.announce.started')`. Abdullah replaces this with live progress in D2-15.

**Needs first:** D2-4 (`getSession`), A-4 (`is_admin()` and admin policies).

**Blocks:** Abdullah (D2-15) and Abdulaziz (A-14) need `requireAdmin`.

**Tests to write:**
- `admin-guard.test.ts` (mock `getSession`, the client, and `next/navigation`):
  - session `null` → `redirect` called with `'/sign-in?returnTo=/admin'`.
  - session present, profile `{ is_admin: false }` → `redirect('/')`.
  - session present, no profile row → `redirect('/')`.
  - session `{ userId: 'u1' }`, profile `{ is_admin: true }` → returns `{ userId: 'u1' }`, no redirect.
- `admin-counts.test.ts`: rows `[{event_id:1,status:'registered'},{event_id:1,status:'waitlisted'},{event_id:1,status:'cancelled'},{event_id:2,status:'registered'}]` → `{ 1: { registered: 1, waitlisted: 1 }, 2: { registered: 1, waitlisted: 0 } }`.

**Done when:** `npm test -- tests/unit/admin-guard.test.ts tests/unit/admin-counts.test.ts` passes.

---

## D1-14 · Admin event form and save (plan T17)

**Date:** Wed 25 Nov.

**Build:** Create/edit form for events with Riyadh-time pickers and full validation. The save action writes the event, writes the meeting link to its private table, changes capacity through the database function (which promotes waitlisted people), and reports capacity warnings and unnotified changes.

**Files:**
- `app/admin/events/[id]/page.tsx` (`id = 'new'` for create)
- `components/admin/EventForm.tsx`
- `lib/admin/event-schema.ts`
- `app/admin/actions.ts` (event part; Abdullah adds notice actions to this file in D2-15, so keep your functions grouped under a `// events` comment)
- `tests/unit/event-schema.test.ts`, `tests/db/save-event.test.ts`

**Interfaces:**
- Produces:
```ts
// lib/admin/event-schema.ts
export type EventInput = {
  id?: number; title: string; description: string; departmentCode: string | null;
  startsAtLocal: string; endsAtLocal: string;            // 'YYYY-MM-DDTHH:mm', Riyadh wall time
  format: 'in_person' | 'online'; location: string | null; meetingUrl: string | null;
  presenter: string | null; capacity: number | null;
  registrationClosesAtLocal: string | null;              // null → same as startsAtLocal
  imageUrl: string | null; recordingUrl: string | null
}
export const eventSchema: z.ZodType<EventInput>
export function riyadhLocalToUtc(local: string): string   // fixed UTC+3; returns ISO with milliseconds

// app/admin/actions.ts
export async function saveEvent(input: EventInput): Promise<
  | { ok: true; id: number; capacityWarning?: { registered: number; capacity: number };
      changedFieldsWithRegistrants?: ('time' | 'location' | 'format' | 'meeting_url')[] }
  | { ok: false; errors: FieldErrors }>
```
- Validation errors (`FieldErrors` keys → `ar.json` keys): `endsAtLocal` not after `startsAtLocal` → `errors.endsAtLocal`; `format='online'` and empty `meetingUrl` → `errors.meetingUrl`; `format='in_person'` and empty `location` → `errors.location`; `recordingUrl` set and `youtubeId(recordingUrl) === null` → `errors.recordingUrl`; `capacity` not null and `< 1` → `errors.capacity`; `departmentCode` not null and not in `departments.json` → `errors.departmentCode`.
- Save steps, in order:
  1. `requireAdmin()`; validate.
  2. Insert: write all columns including `capacity`. Update: first read the event's current row (`capacity`, `starts_at`, `ends_at`, `location`, `format`, and `event_private.meeting_url`), then write all columns **except** `capacity`.
  3. `format='online'` → upsert `event_private (event_id, meeting_url)`; `format='in_person'` → delete the `event_private` row.
  4. Update: call `rpc('set_event_capacity', { p_event_id: id, p_capacity: capacity })` **only when** `capacity` differs from the value read in step 2 (`null` vs. a number counts as different). Unchanged → no rpc call. (The function promotes waitlisted people; Abdullah sends their emails.)
  5. `capacityWarning` when the new capacity is below the current `registered` count.
  6. `changedFieldsWithRegistrants` when `registered > 0` and any of start/end (`'time'`), `location`, `format`, meeting link changed.
  7. `revalidatePath('/')`, `revalidatePath('/events')`, `revalidatePath('/events/' + id)`, `revalidatePath('/library')`, `revalidatePath('/departments/[slug]', 'page')`.
- `recording_url` is a normal field in this form (this covers "add recording", spec §7.11).
- Consumes: `FieldErrors` from `lib/forms/types.ts` (Abdullah, D2-6); `youtubeId` (D1-12); `set_event_capacity` (Abdullah, D2-10, merged by Mon 23).

**Needs first:** D1-13, D1-12, D2-6, D2-10.

**Blocks:** D1-15.

**Tests to write:**
- `event-schema.test.ts`:
  - `riyadhLocalToUtc('2026-11-18T18:00') === '2026-11-18T15:00:00.000Z'`
  - `riyadhLocalToUtc('2026-12-01T01:30') === '2026-11-30T22:30:00.000Z'`
  - ends `2026-11-18T17:00`, starts `2026-11-18T18:00` → error on `endsAtLocal`
  - online, `meetingUrl: null` → error on `meetingUrl`
  - in_person, `location: ''` → error on `location`
  - `recordingUrl: 'https://vimeo.com/1'` → error on `recordingUrl`
  - `capacity: 0` → error on `capacity`
  - a valid in-person input parses with no errors
- `tests/db/save-event.test.ts` (signed in as the seed admin):
  - create an online event → one `event_private` row with the meeting URL; `select meeting_url` on `event_private` as a non-admin user returns 0 rows.
  - event with capacity 2, 2 registered, 1 waitlisted; `saveEvent` with capacity 3 → the waitlisted user's row becomes `registered`.
  - event with 3 registered; `saveEvent` with capacity 2 → `capacityWarning` equals `{ registered: 3, capacity: 2 }` and all 3 rows are still `registered`.
  - event with 1 registered; change `startsAtLocal` → `changedFieldsWithRegistrants` equals `['time']`.
  - event with capacity 10; save with only `title` changed (capacity still 10) → a `vi.spyOn` on the mocked client's `rpc` records no call with `'set_event_capacity'`.

**Done when:** `npm test -- tests/unit/event-schema.test.ts && npm run test:db -- tests/db/save-event.test.ts` passes.

---

## D1-15 · Admin status, delete and warnings (plan T17)

**Date:** Thu 26 Nov.

**Build:** Publish / unpublish / cancel and delete rules, the capacity warning banner, and the "registrants not notified" banner on the edit page.

**Files:**
- Modify `app/admin/actions.ts` (`// events` group), `app/admin/events/[id]/page.tsx`
- `components/admin/StatusControls.tsx`, `components/admin/WarningBanners.tsx`
- `tests/db/admin-status.test.ts`

**Interfaces — produces:**
```ts
export async function setStatus(id: number, to: 'published' | 'draft' | 'cancelled'):
  Promise<{ ok: boolean; reason?: 'has_registrations' | 'missing_meeting_url' }>
export async function deleteEvent(id: number): Promise<{ ok: boolean; reason?: 'has_registrations' }>
```
- `published`: an online event with no `event_private` row → `{ ok: false, reason: 'missing_meeting_url' }`.
- `draft`: any registration row with status `registered` or `waitlisted` → `has_registrations`.
- `cancelled`: always allowed; sets the status only. **It sends no email.** The "cancel & notify" button that admins use is built by Abdullah in D2-15 and calls this function, then sends the notices.
- `deleteEvent`: refused if **any** registration row exists for the event, in any status (records are kept).
- Banners: capacity warning text `t('admin.capacityWarning', { registered, capacity })`; when `changedFieldsWithRegistrants` is non-empty, show `t('admin.notNotified', { n: registered })` with a button slot.

**Stub until D2-15 merges:** the "notify registrants" button in the banner renders `disabled` with `t('admin.notifySoon')`. Abdullah enables it in D2-15.

**Needs first:** D1-14.

**Blocks:** Abdullah (D2-15 adds its buttons to this page).

**Tests to write** (`tests/db/admin-status.test.ts`, as the seed admin):
- `setStatus(<draft event with 1 registered>, 'draft')` → `{ ok: false, reason: 'has_registrations' }`.
- `setStatus(<event with only cancelled rows>, 'draft')` → `{ ok: true }`.
- `deleteEvent(<event with 1 cancelled row>)` → `{ ok: false, reason: 'has_registrations' }`.
- `deleteEvent(<event with no rows>)` → `{ ok: true }` and the event no longer exists.
- `setStatus(<online draft without event_private>, 'published')` → `{ ok: false, reason: 'missing_meeting_url' }`.
- As a non-admin user, `setStatus` redirects (mock `redirect`) and the row is unchanged.

**Done when:** `npm run test:db -- tests/db/admin-status.test.ts` passes.

---

## D1-16 · Account page (plan T16)

**Date:** Fri 27 Nov.

**Build:** `/account`: edit profile (email read-only), upcoming and past registrations, waitlist places with position, cancel/leave, and talent status from the submission log.

**Files:**
- `app/account/page.tsx`
- `components/account/ProfileForm.tsx`, `components/account/MyEvents.tsx`, `components/account/TalentStatus.tsx`
- `tests/unit/account.test.tsx`

**Interfaces — consumes:**
- `saveProfile(input: ProfileInput)` and `profileSchema` from `lib/profile/schema.ts` / `app/account/actions.ts` (Abdullah, D2-6).
- `cancelAction(eventId: number): Promise<CancelResult>` from `app/events/[id]/actions.ts` (Abdullah, D2-11).
- `myWaitlistPosition(eventId)` (D1-11).
- `talent_submission_log` own row (`user_id`, `submitted_at`, `withdrawn_at`) via `supabaseProdServer()`. **Never import anything from `lib/db/talent`.**
- Page requires a session (`redirect('/sign-in?returnTo=/account')`) and a profile (show the profile overlay via `useProfileGate`).
- Talent status text: `withdrawn_at` not null → `t('talent.status.withdrawn', { date })`; else `submitted_at` not null → `t('talent.status.submitted', { date })`; else `t('talent.status.none')`. Dates with `formatRiyadh(…, 'date')`.

**Needs first:** D2-6, D2-11, A-5 (the log table).

**Blocks:** nobody.

**Tests to write:**
- The email field renders as text inside `<Bdi>`, not as an `<input>`.
- A waitlisted entry with position 2 shows `t('waitlist.position', { n: 2 })`.
- Talent status: `{ submitted_at: '2026-11-20T10:00:00Z', withdrawn_at: null }` → text from `t('talent.status.submitted', …)`; `{ withdrawn_at: '2026-11-21T10:00:00Z' }` → `t('talent.status.withdrawn', …)`; no row → `t('talent.status.none')`.
- (The rule that no file except `app/talent/actions.ts` imports the talent client is already enforced by lint and by A-2's test.)

**Done when:** `npm test -- tests/unit/account.test.tsx` passes.

---

## D1-17 · Talent page and form (plan T20)

**Date:** Sat 28 Nov.

**Build:** `/talent`: the public explanation; a "opens soon" state when the form flag is off; the form generated from the field definitions, with profile values shown read-only above it; the success screen; and resubmit/withdraw for returning people.

**Files:**
- `app/talent/page.tsx`, `app/talent/TalentForm.tsx`, `app/talent/SuccessScreen.tsx`
- `tests/unit/talent-form.test.tsx`

**Interfaces — consumes** (from Abdulaziz, A-11):
```ts
// lib/talent/fields.ts
export const FIELDS_VERSION: string
export type TalentField = {
  key: string; labelKey: StringKey; exportHeader: string;
  kind: 'text' | 'textarea' | 'year' | 'url' | 'tags'; required: boolean;
  rules?: { min?: number; max?: number; minItems?: number; maxItems?: number; itemMax?: number; host?: 'github.com' }
}
export const talentFields: TalentField[]          // the form uses key, labelKey, kind, required; rules for min/max attributes
export const talentAnswersSchema: z.ZodType<Record<string, unknown>>   // server validation; also run client-side for inline errors
// lib/talent/consent.ts
export const CONSENT_VERSION: string
export const consentIsFinal: boolean
export function consentHtml(): string   // rendered from content/talent-consent/<version>.md
// lib/config/flags.ts
export const TALENT_FORM_OPEN: boolean
// app/talent/actions.ts
export async function submitTalent(answers: unknown, consent: boolean): Promise<
  { ok: true } | { ok: false; reason: 'closed' | 'needs_profile' | 'invalid' | 'failed'; errors?: FieldErrors }>
export async function withdrawTalent(): Promise<{ ok: boolean }>
```
- `TALENT_FORM_OPEN === false` → explanation + `t('talent.opensSoon')` «يفتح قريبًا»; no form element rendered.
- **No email-domain check.** Any signed-in person with a complete profile sees the form, whatever their email domain (spec §7.7).
- Inputs per `kind`: `text` → `<input type="text">`; `textarea` → `<textarea>`; `year` → `<input type="number" min="1980" max="2035">`; `url` → `<input type="url">`; `tags` → text input split on comma (`,` or `،`) into a string array.
- The form renders **only** inputs for `talentFields`; never inputs for email, name, major, level or gender (HR-2). Those show read-only above the form with an "edit in account" link to `/account`.
- Consent: a required checkbox with `consentHtml()` beside it.
- Success screen: shows the submitted values from form state (not from the server), with "copy" (`navigator.clipboard.writeText`) and "print" (`window.print()`).
- Returning person (log row present, not withdrawn): `t('talent.status.submitted', { date })` + "resubmit" (opens an empty form) + "withdraw" (`ConfirmDialog`, then `withdrawTalent()`).
- `{ ok: false, reason: 'needs_profile' }` → `useProfileGate()` and re-submit.

**Stub until A-11 merges:** create `lib/talent/__fixtures__/fields.ts` exporting the same names, with the provisional fields from spec §7.7, and import from it in tests only. The page itself waits for A-11 (merged Mon 23), so no stub is needed in app code.

**Needs first:** A-11, D2-7.

**Blocks:** nobody.

**Tests to write:**
- With 7 fixture fields, the form renders exactly 7 field inputs plus 1 consent checkbox.
- Adding an 8th field `{ key: 'linkedin', labelKey: 'talent.field.linkedin', kind: 'url', required: false }` to the fixture renders 8 inputs with no component change.
- No element has `name` in `['email','full_name_ar','major_code','academic_level_code','gender']`.
- After a mocked successful submit with `full_name_en: 'Ali Ahmed'`, the success screen contains `'Ali Ahmed'`.
- `TALENT_FORM_OPEN = false` (mock) → no `<form>` element; text `t('talent.opensSoon')` present.
- Flag open, session `{ email: 'someone@gmail.com' }` with a complete profile → the `<form>` renders.

**Done when:** `npm test -- tests/unit/talent-form.test.tsx` passes; on the preview a submission against `hisn-dev` shows the success screen.

---

## Sun 29 – Mon 30 Nov · Bug bash and fixes

- **Sun 29:** whole-team bug bash on the private production address, using the checklist Abdulaziz shares. Every bug becomes a GitHub issue labelled `launch`.
- **Mon 30:** fix `launch` issues assigned to you; one PR per issue.

---

**If you're stuck:** after 30 minutes on the same problem, push a draft PR with what you have and the question in its description, post the link in the WhatsApp group for Abdulaziz (or Abdullah for anything in their area), and start the next task marked ⇄ or the next task whose "Needs first" is met. Pushing a draft branch early always beats waiting.
