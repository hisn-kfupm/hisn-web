# حصن (Hisn) — hisn-web

The phase 2 site for Hisn, a KFUPM initiative on defense industries: departments, events calendar with registration
and waitlist, emails, recordings library, قاعدة المواهب (talent database), admin. Next.js App Router + TypeScript, Supabase, Tailwind v4, Vercel.

Spec: `docs/superpowers/specs/2026-11-10-hisn-phase2-design.md` (§). Plan: `docs/superpowers/plans/2026-11-12-hisn-phase2.md` (T).

## Task files

Each person follows their own file in `docs/tasks/`: `abdulaziz.md` (A-n), `dev-1.md` (Abdulrahman, D1-n),
`dev-2.md` (Abdullah, D2-n). Each task gives files, interfaces, tests and a "Done when" command. Interfaces are exact;
don't rename them. Work only on the task you were asked about; check "Needs first" and use the documented stub if a dependency hasn't merged.

## Tests first, always

Write the task's listed tests → run them and see them fail → implement → run them and see them pass → open the PR.
- `tests/unit/` must not need a database. `tests/db/` runs against local Supabase and uses `tests/db/helpers.ts`; seed ids in `tests/fixtures/seed.ts`.
- `supabase/tests/*.test.sql` are pgTAP. Never skip, disable or weaken a test to get green.

## Rules (plan "Global Constraints")

- **P-1:** when protection and convenience conflict, protection wins.
- **No literal UI text** in components (HR-7). Every string is a key in `lib/i18n/ar.json` (flat, dotted keys) via `t('key', vars)`.
- **No physical left/right CSS.** Logical only: `ms-* me-* ps-* pe-* start-* end-* text-start text-end`, `margin-inline-start`.
  Never `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right`, `margin-left`, etc.
- **Banned identifier `supabase`.** Name clients `supabaseProd…` / `supabaseTalent`.
- **`supabaseProdServer()` is async:** `const db = await supabaseProdServer()`. `supabaseProdService()` (service key, server only) is sync.
- **Times:** store UTC; display `Asia/Riyadh` (`lib/time/riyadh.ts`). Saudi Arabia has no DST.
- **Mixed direction:** emails, URLs and English names inside Arabic text are wrapped in `<Bdi>`.
- **HR-1:** developers can never read talent data. Nothing but `app/talent/actions.ts` imports `lib/db/talent`
  (lint rule + test). Talent inserts request no returned row (no `.select()`). Never add a read policy. Never log talent data.
- **HR-2:** the talent form never asks for email, Arabic name, major, academic level or gender; the server copies them from the profile.
- **HR-4:** no code path writes `profiles.is_admin`.
- **HR-5:** signed links act only on POST; GET renders a confirm page.
- **HR-8:** the talent form opens only when `TALENT_FORM_OPEN=true`, and only with final consent text.
- Sign-in: 6-digit OTP, 10-minute expiry, resend after 60 s. `returnTo` accepts only same-site relative paths.
- Almost full: `ALMOST_FULL_RATIO = 0.2`; `0 < seatsLeft ≤ max(1, floor(capacity × 0.2))`.
- Announcement batches ≤ 100; idempotency key `{kind}-event-{id}-run-{r}-batch-{n}`.
- Cron `/api/cron/flush-email` every 10 min; sends rows `queued` for > 2 min.
- CSV exports start with a UTF-8 BOM and use data-file labels, not codes.
- Data-file codes (`data/*.json`) are append-only after launch; migrations' allowed codes must equal the files.
- Production migrations are expand-only. Schema changes only as migrations.
- Contact `Contact@Hisn-sa.org`. Sender `حصن <noreply@hisn-sa.org>`.
- Verbatim copy, never paraphrase: announcements checkbox «لقاءات مع قادة القطاع، وورش تقرّبك من دورك فيه، تصلك أولًا بأول على بريدك.»;
  almost-full badge «المقاعد شارفت على الاكتمال!».
- Placeholder copy carries «مؤقت»; `check:content` fails while any remain.
- No production or talent credentials in the repo, repo secrets or preview env.

## npm scripts

| Script | Runs |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `lint` | `eslint . && stylelint "**/*.css"` (includes the custom `hisn/*` rules) |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run --project unit` (`tests/unit/**`, jsdom) |
| `test:db` | `vitest run --project db` (`tests/db/**`, needs local Supabase) |
| `test:scripts` | `vitest run --project scripts` (`tests/scripts/**`) |
| `test:e2e` | `playwright test` |
| `check:content` | `tsx scripts/check-content.ts` (fails on «مؤقت») |
| `db:reset` | `supabase db reset && bash scripts/ci/apply-talent.sh` (prod migrations + seed, then talent migrations) |
| `env:local` | `bash scripts/ci/write-env.sh` (writes `.env.local` from `supabase status`) |

Local DB: `supabase start` → `npm run db:reset` → `npm run env:local`. pgTAP: `supabase test db`.
Run one file: `npm test -- tests/unit/x.test.ts`.

## Branches and PRs

- Branch: `<owner>/<task-id>-<slug>`, task id zero-padded to two digits. Owner prefix: `abdulaziz/`, `dev1/`, `dev2/`.
  e.g. `dev1/D1-07-time-logic`, `dev2/D2-09-registration-sql`, `abdulaziz/A-04-rls-core`.
- PR title: `<task-id> · <what it does>`, e.g. `D1-07 · Riyadh time and event state logic`.
- One task = one PR, opened the same day. Never push to `main`; merges need the owner's review.
