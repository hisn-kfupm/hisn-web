# حصن (Hisn) — Phase 2 Design Spec

| | |
|---|---|
| Revision | 2.3 (2026-11-22). Revision 2: 2026-11-12. Revision 1: 2026-11-10 |
| Owner | Abdulaziz Alessa, head of the technical committee (accountable for delivery) |
| Status | Revision 2 applies the founder's decisions of 2026-11-12. Revision 2.3 closes D-1 (English at launch). Open decisions are listed in §20 |
| Plan | `docs/superpowers/plans/2026-11-12-hisn-phase2.md` |

### Changes in revision 2.3 (2026-11-22)

1. Hisn launches in **Arabic and English** (D-1 closed: Yes). Decided on **2026-11-22** by **the owner (Abdulaziz Alessa)**.
2. Both languages ship at launch; nothing English is future or deferred (§2, §8.7).
3. Every public page lives under `/ar/…` and `/en/…`, with a language switcher and hreflang. `/` always redirects to `/ar` (§6.6).
4. Strings in `ar.json` and `en.json` with **identical keys** (CI check); `t(locale, key, vars)` (§8.7, §13).
5. `profiles.locale`; optional `events.title_en` / `events.description_en` (Arabic fallback on `/en`); `signups.locale`; `email_deliveries.locale`; `newsletter_signup(…, p_locale)`; `talent_entries.consent_locale` (§9).
6. Every email has an Arabic and an English template, the sign-in code email included. Email language = the language the person signed up in, editable on `/account` (§10.6).
7. Token pages, privacy, 404 and error pages in both languages (§7.9, §7.10). The Arabic privacy text prevails, and the English page says so.
8. قاعدة المواهب labels and consent in both languages; the **Arabic consent is binding** and the English translation states that the Arabic text prevails (§7.7). The owner drafts the English translation; the founder approves it.
9. Admin stays **Arabic only**, at `/admin` (§7.11).
10. English copy is drafted by the developers and approved by the owner; until approved it carries «مؤقت» (§12).

### Changes in revision 2.2 (2026-11-12, evening)

1. قاعدة المواهب stays **open to everyone** (no domain check); launch checklist tests a Gmail submission.
2. Announcement audience: **the account decides.** A newsletter signup no longer counts once an account exists for that email (§10.2).
3. `signups` closed to direct inserts; `newsletter_signup()` validates the address and only inserts into `signups` (it never removes an unsubscribe or changes a profile); a Resend webhook turns hard bounces and complaints into unsubscribes.
4. `registrations.registration_version`; cancel tokens carry it, so an old cancel link can't cancel a newer registration.
5. `email_unsubscribes.email` must be stored normalized (check constraint).

### Changes in revision 2

1. Sign-in email is the student's **personal** email (decision D-2 in §20 picks how).
2. Profile adds المرحلة العلمية (dropdown) and gender. Majors gain an «أخرى» path with free text.
3. Announcement consent is an **unticked checkbox** with the founder's copy, replacing the required Yes/No.
4. قاعدة المواهب is **open to everyone**: any university, any organization, or none. The KFUPM gate is removed everywhere.
5. Talent form fields and consent text are **provisional** until the specialized committee and the founder supply them. Answers are stored as one validated JSON object so the late field list changes one file, not the database.
6. **Waitlist is in scope**, with automatic promotion and a «المقاعد شارفت على الاكتمال!» badge.
7. Retention has **no fixed period yet**. One constant; the purge script refuses to run "expired" deletion until it is set.
8. New governing principle P-1: protection wins over convenience (§3).
9. Exports carry academic level and gender. Admin gains an "all accounts" export. The reporting dashboard is **deferred**.
10. Event requests from the programs committee are **deferred** (sent to the owner directly this phase).
11. Company accounts confirmed **not needed**.
12. Schedule restarts Thu 12 Nov. Internal target Wed 25 Nov, hard deadline Tue 1 Dec.

---

## 1. Purpose and context

Hisn is a KFUPM initiative, under the Deanship of Students, that builds awareness of defense industries and connects people to them. Phase 1 is a one-page Arabic teaser at hisn-sa.org (plain HTML/CSS/JS on Vercel, one Supabase `signups` table).

Phase 2 is the **final phase**. It turns the teaser into the initiative's full site: visitors discover the six defense-sector departments, register for workshops, watch recordings, and opt into قاعدة المواهب, a talent database the owner exports to partner companies.

Phase 2 serves students and graduates of any university, people from other organizations, and people with no affiliation.

## 2. Scope

### In scope

1. Hero section with image and quote
2. Six department sections and a page per department
3. Monthly events calendar
4. Event registration with confirmation email (with `.ics`), cancellation from the site and from a signed link in the email
5. **Waitlist** with automatic promotion, and an "almost full" badge
6. Event announcements to the combined audience, with partial-send recovery
7. "Event cancelled" and "event changed" notices to registrants and waitlisted people
8. Library of recorded workshops (YouTube embeds, played in place)
9. Sign-in with email code; profile with Arabic name, major, academic level, gender, announcements checkbox, email language
10. قاعدة المواهب: opt-in form, resubmit, withdraw (fields provisional, §7.7)
11. Admin page (owner only), including per-event and all-accounts CSV exports
12. Newsletter signup, unsubscribe, privacy page, 404 and error pages
13. Owner-run scripts: `scripts/export-talent`, `scripts/purge-talent`
14. Migration from the teaser: data, domain switch, rollback
15. **Arabic and English interface** at launch: every public page, sign-in, profile, account, قاعدة المواهب, token pages, privacy, 404 and error pages, and every email (§8.7). Admin is Arabic only (D-1, revision 2.3)

### Deferred (agreed, not refused)

| Item | This phase instead |
|---|---|
| Event-request link for the programs committee, notifying the technical committee | Programs committee sends requests to the owner, who adds the event in admin |
| Reporting dashboard (breakdowns by level, major, gender) | Owner builds breakdowns from the CSV exports (§7.11) |

### Out of scope

- Company logins or any company-facing interface (confirmed not needed)
- Reminder emails (the `.ics` attachment covers reminders)
- File uploads (CV is a link; event image is a URL)
- Changing a profile's email address
- Self-service account deletion (handled on request by the owner, §9.5)
- Per-department or targeted mailing lists

## 3. Governing principle and hard requirements

**P-1. Protection wins.** Any decision that favours protecting people's data is taken, even at the cost of user experience. Where it costs experience, we reduce the impact rather than drop the protection. (Example already accepted by the founder: a talent resubmission starts from an empty form because the site can never read talent data back.)

| ID | Requirement |
|---|---|
| HR-1 | The two developers must never be able to read قاعدة المواهب: not through the site, the dashboard, environment variables, logs, monitoring or CI. |
| HR-2 | قاعدة المواهب never asks for anything collected at sign-up (email, Arabic name, major, academic level, gender). These are copied from the profile on the server. |
| HR-3 | The owner exports قاعدة المواهب and sends it to companies personally. Companies never log in. |
| HR-4 | `is_admin` is set only by the owner, in SQL, on the production database, which only the owner can reach. No page, server action, API path or script sets it. |
| HR-5 | Every signed link (unsubscribe, cancel registration, leave waitlist) acts only on an explicit POST. Opening the link (GET) never changes anything. |
| HR-6 | Nothing reaches production without the owner's review of a merge to `main`. |
| HR-7 | All interface text lives in `ar.json` and `en.json`, with identical keys. All CSS uses logical properties. Enforced in CI from day 1. |
| HR-8 | The talent form never opens without the final consent text in place (P-1). |

## 4. Schedule

| Date | Milestone |
|---|---|
| Thu 12 Nov | Day 1 (afternoon). Team works every day; owner available daily for review |
| Thu 12 Nov | Marketing delivers the content **shape** and one worked department; hero quote, attribution, source, cleared image |
| Thu 19 Nov | **Trigger day** for three external inputs (below) |
| Wed 25 Nov | Day 14. Internal target |
| 26 Nov – 1 Dec | Buffer. Not for additional scope |
| Tue 1 Dec | Hard deadline |

**Trigger day, Thu 19 Nov:**

| Input | If in hand by 19 Nov | If not |
|---|---|---|
| Final copy for all six departments | Public switch 25 Nov (plan A) | Plan B: public switch once copy is in, no later than 1 Dec |
| Talent field list (specialized committee) | Final fields built 22–23 Nov | Site launches with the talent form closed («يفتح قريبًا»); it opens once fields arrive |
| Talent consent text (founder) | Form can open at launch | Same as above (HR-8) |

The build plan is identical under every branch. Only the switch date and the talent flag change.

"Launched" is defined by the checklist in §17, not by a date.

## 5. Environments and access

### 5.1 Supabase

| Organization | Members | Project | Purpose |
|---|---|---|---|
| Hisn Dev | Owner + 2 developers | `hisn-dev` | Shared cloud development database, fake data only, including fake talent tables. Used by Vercel previews. |
| Hisn Prod | Owner only | `hisn-prod` | Production: profiles, events, registrations, signups, email tables, talent submission log |
| Hisn Talent | Owner only | `hisn-talent` | Production قاعدة المواهب |

- Local Supabase (Docker) is optional for developers and is what CI uses.
- Organization membership grants access to every project in the organization, which is why each production project sits in an owner-only organization.
- Supabase Auth lives in `hisn-prod` (and `hisn-dev` for previews). `hisn-talent` has no Auth users.

### 5.2 Vercel

- **New Vercel project** for phase 2. The teaser stays in its own project until the domain switch (§16).
- Developers have the **Developer** team role **without** the Full Production Deployment and Environment Variable Manager extended permissions. Confirm during setup that the role is available on the plan.
- Preview deployments come from Vercel's Git integration for every branch.
- **Production deployments come only from the GitHub workflow** after migrations succeed (§14). Automatic production deploys from Git are off.
- Vercel Cron runs `/api/cron/flush-email` every 10 minutes in production (§10.3).

### 5.3 GitHub

- Branch protection on `main`: pull request required, owner's review required, all CI checks required, no force pushes.
- A GitHub **environment** named `production`, usable only by workflow runs on `main`, holds production migration credentials and the Vercel deploy token. Repository-level secrets hold nothing for production.
- Developers push branches freely and are never blocked; only merges to `main` wait on the owner.
- Owner reviews in a fixed daily window. If a window is missed, developers continue on stacked branches and the owner clears the queue at the next window.

### 5.4 Secrets

| Secret | Where it lives | Who can see it |
|---|---|---|
| Prod Supabase public (anon) key, Sentry DSN | Browser | Everyone (public by design) |
| Prod Supabase service key | Vercel production env | Owner |
| Talent write key (`hisn-talent` anon key, insert-only) | Vercel production env | Owner |
| Token signing secret, Resend API key, `SITE_URL`, `CRON_SECRET`, `RESEND_WEBHOOK_SECRET` (prod) | Vercel production env | Owner |
| `TALENT_FORM_OPEN` (prod) | Vercel production env | Owner |
| Dev Supabase keys, dev token secret, preview Resend key, `EMAIL_ALLOWLIST` | Vercel preview env | All 3 |
| Prod migration credentials, Vercel deploy token | GitHub `production` environment | Owner (runs from `main` only) |
| `hisn-dev` migration credentials | GitHub repository secret | Workflows (fake data only) |
| Talent read credentials, prod connection string for scripts | Owner's machine only, git-ignored local env file | Owner |

Talent migration credentials never go into GitHub. The owner applies `hisn-talent` migrations by hand.

## 6. Information architecture

### 6.1 Structure

Every public path below exists in both languages, under `/ar` and `/en` (`[locale]`), e.g. `/ar/events` and `/en/events` (§6.6).

```
/                                  Redirects to /ar
/[locale]                          Homepage
/[locale]/departments/[slug]       One page per department (×6), Latin slugs (e.g. /ar/departments/cybersecurity)
/[locale]/events                   Calendar (?m=YYYY-MM)
/[locale]/events/[id]              Event details + register / waitlist (numeric id)
/[locale]/library                  Recorded workshops
/[locale]/talent                   What قاعدة المواهب is → form
/[locale]/account                  Profile, registrations, waitlist, talent status
/[locale]/sign-in                  Email → 6-digit code
/[locale]/unsubscribe              Signed link → confirm button
/[locale]/registrations/cancel     Signed link → confirm button (registration or waitlist place)
/[locale]/privacy                  Privacy notice
/admin                             Owner only; Arabic only, no locale prefix
/404, error page                   In the page's language, with full navigation
```

### 6.2 Homepage, top to bottom

1. Hero: image + quote + attribution. If clearance is uncertain, a typographic hero on the brand gradient.
2. Six department cards (icon, title, one-line summary) → department page
3. Next 3 upcoming published events → event page; "all events" → `/events`
4. Latest 3 recordings → `/library`
5. قاعدة المواهب invitation → `/talent`
6. Newsletter signup (email → `signups`)

### 6.3 Navigation

- Top bar (RTL on `/ar`): logo at the right; links الأقسام (dropdown of the six), الفعاليات, المكتبة, قاعدة المواهب.
- Sign-in button at the far left, always visible; becomes an account menu (حسابي, تسجيل الخروج) when signed in.
- Mobile: links collapse into a menu; the sign-in button stays outside it.
- Language switcher (العربية / English) in the top bar and in the mobile menu: opens the same page in the other language (§6.6).
- On `/en` the same bar is LTR, with English labels, so every position above mirrors.
- Footer: newsletter signup, `/privacy`, `Contact@Hisn-sa.org`, Deanship acknowledgement.

### 6.4 Department pages are hubs

Title, description, 3–4 example roles, **upcoming events in this department**, **recordings in this department**, and the قاعدة المواهب invitation, using `events.department_code`.

### 6.5 Public vs. signed-in

- **Readable without signing in:** homepage, departments, calendar, event pages, library (pending D-3), `/talent` explanation, `/privacy`, token pages.
- **Sign-in required to:** register or join a waitlist, cancel from the site, submit or withdraw from قاعدة المواهب, view `/account`.

### 6.6 Languages

- Arabic (`/ar`, RTL) and English (`/en`, LTR) at launch. Each page renders `<html lang dir>` for its language; an unknown language segment is a 404.
- `/` always redirects to `/ar`; no browser-language detection. A path without a language prefix (other than `/admin`, `/api` and static files) redirects to `/ar` + path.
- The language switcher links to the same page in the other language, query kept (`/ar/events?m=2026-12` ↔ `/en/events?m=2026-12`).
- Every public page declares hreflang alternates: `ar`, `en`, and `x-default` pointing to the Arabic page.
- Dates and times are Riyadh time in both languages; English uses the Gregorian calendar and Latin digits.
- **Admin (`/admin`) is Arabic only**: no locale prefix, no switcher.

## 7. Screens and flows

### 7.1 Sign-in

1. The person enters an email. The screen says to use a **personal email** («استخدم بريدك الشخصي — يبقى معك بعد التخرج»). If the domain ends in `.edu.sa` or `.edu`, an inline warning repeats this; it does not block.
2. Supabase sends a 6-digit code (valid 10 minutes), in the sign-in page's language (§10.6). "Resend code" after 60 seconds; the screen says to check junk.
3. Code entered → signed in → returned to the page they came from. `returnTo` accepts only same-site relative paths (`/ar/…`, `/en/…`).
4. From an event's register button, the button is ready on return; never registered automatically after the round trip.

This assumes decision D-2 option A (the sign-in email is the personal email). If D-2 picks option B, §7.1–7.2 and `profiles` change as described in §20.

**Sign-in email failure is critical:** clear error in the page's language, obvious resend, and a **high-priority** Sentry alert (§11).

### 7.2 Profile step (blocks actions, not browsing)

- A signed-in user with no `profiles` row can browse freely.
- On an action (register, join waitlist, talent form, account), a profile overlay opens on the same page, in the page's language (Arabic labels below):
  - الاسم بالعربية (required)
  - التخصص (required dropdown from `data/majors.json`; choosing «أخرى» shows a required free-text field)
  - المرحلة العلمية (required dropdown from `data/academic-levels.json`)
  - الجنس: ذكر / أنثى (required, nothing pre-selected)
  - Unticked checkbox: «لقاءات مع قادة القطاع، وورش تقرّبك من دورك فيه، تصلك أولًا بأول على بريدك.»
- On save, the profile is created and **the original action runs immediately**.
- The first save stores the page's language as the person's email language (`profiles.locale`); it is not asked in the overlay and is changed on `/account`.

### 7.3 Calendar (`/events`)

- Opens on the current month (Riyadh time); previous / next controls; month in the URL.
- Desktop: month grid, chips colored by department. Mobile: list grouped by date.
- Days are computed in Riyadh time, so a 23:30 event sits on its Riyadh date.
- If no upcoming events remain in the month, a banner links to the next one.
- Past events «انتهت»; cancelled «أُلغيت»; «المقاعد شارفت على الاكتمال!» on almost-full events. Drafts never appear.

### 7.4 Event page (`/events/[id]`)

Title, department badge, image (fallback: department icon, then Hisn default), description, Riyadh date and time, format, location (in-person) or "link sent on registration" (online), presenter, seats left when a capacity is set. The meeting link is never shown.

On `/en`, the English title and description are shown when the admin entered them; otherwise the Arabic text is shown, marked `lang="ar" dir="rtl"` (§8.7).

**Almost full:** shown when a capacity is set and `0 < seats_left ≤ max(1, floor(capacity × 0.2))`. `ALMOST_FULL_RATIO = 0.2` is one constant.

Button states:

| State | Shown |
|---|---|
| Open | سجّل |
| Open, almost full | سجّل + «المقاعد شارفت على الاكتمال!» |
| Registered | مسجّل ✓ + إلغاء التسجيل |
| Full, not on waitlist | اكتملت المقاعد + انضم لقائمة الانتظار |
| On waitlist | «أنت رقم N في قائمة الانتظار» + مغادرة القائمة |
| Registration closed | أُغلق التسجيل |
| Event cancelled | أُلغيت الفعالية |
| Ended | انتهت + شاهد التسجيل (if `recording_url`) |

Seat counts and waitlist position are fetched per request.

### 7.5 Registration, waitlist and cancellation

- **Register:** one click → inline success → confirmation email (event details, meeting link if online, `.ics`, signed cancel link).
- **Join waitlist** (only when the event has a capacity and is full): one click → «أنت رقم N» → waitlist email with a signed "leave waitlist" link. No meeting link.
- **Promotion:** whenever a seat frees (a cancellation, or the admin raising capacity), the earliest waitlisted person is promoted to registered in the same database transaction, and gets a "you have a seat" email identical in content to a confirmation. Promotion happens only while `now < registration_closes_at`; after that, freed seats stay empty.
- **Cancel / leave from the site:** event page or `/account`, with a confirm dialog → confirmation email.
- **Cancel / leave from email:** link opens `/[locale]/registrations/cancel` (the email's language), which states what will be cancelled and shows one confirm button (HR-5). Valid until the event starts.
- Re-registering or re-joining after cancelling is allowed; the person goes to the end of the waitlist if the event is full.

### 7.6 Library (`/library`)

- Ended, published events with a `recording_url`, newest first; filter by department.
- Thumbnail first; click loads the player **in place** via `youtube-nocookie.com`; one plays at a time.
- `LIBRARY_REQUIRES_SIGN_IN` (default `false`) gates the page pending decision D-3.

### 7.7 قاعدة المواهب (`/talent`)

- **Open to everyone** with a complete profile. No email-domain check anywhere.
- Public explanation: what it is, what is collected, who receives it, retention, how to withdraw, link to `/privacy`.
- `TALENT_FORM_OPEN=false` → explanation + «يفتح قريبًا». HR-8: never `true` without final consent text.
- Not signed in → sign-in button. Signed in → the form, with the profile fields (name, email, major, level, gender) shown read-only above it and an "edit in account" link.
- **Form fields are defined in one module, `lib/talent/fields.ts`**, which drives the form, the server validation and the export columns. Provisional set until the committee delivers:

  | Key | Label | Rule |
  |---|---|---|
  | `full_name_en` | «اسمك بالإنجليزية كما يظهر في وثائقك الرسمية» | required, 2–100 chars |
  | `graduation_year` | سنة التخرج (المتوقعة) | required, 1980–2035 |
  | `project_title` | عنوان مشروع | required, 3–120 chars |
  | `project_description` | وصف المشروع | required, 20–1,500 chars |
  | `skills` | المهارات | required, 1–20 items, each 1–40 chars |
  | `cv_url` | رابط السيرة الذاتية أو الأعمال | required, `https://` |
  | `github_url` | GitHub | optional, GitHub URL |

  Labels are string keys (`labelKey`) present in both `ar.json` and `en.json`; the table shows the Arabic.

- **Consent:** a required checkbox with the founder's text, stored as versioned files in both languages: `content/talent-consent/v1.ar.md` (**binding**) and `content/talent-consent/v1.en.md` (a translation drafted by the owner and approved by the founder, which must state that the Arabic text prevails). `/ar/talent` shows the Arabic text; `/en/talent` shows the English translation followed by the binding Arabic text (`lang="ar" dir="rtl"`). The submission records `consent_version` (`v1` for both) and `consent_locale` (the page's language). The consent is final only when **both** files are (HR-8).
- **Success screen:** shows the submitted answers once from browser form state, with copy and print. Nothing read back.
- **Returning person** (from `talent_submission_log`): "submitted on [date]" + resubmit (empty form) + withdraw (confirm dialog).

### 7.8 Account (`/account`)

- Profile: Arabic name, major (+ free text), academic level, gender, announcements checkbox, email language (العربية / English, saved to `profiles.locale`) (all editable). Email shown, not editable.
- Upcoming and past registrations; waitlist places with position; cancel / leave.
- Talent status from `talent_submission_log`.

### 7.9 Token pages

`/[locale]/unsubscribe` and `/[locale]/registrations/cancel`, in both languages: state exactly what will happen → one confirm button (POST) → result. Invalid, tampered or expired token → error, no change. Repeat use → "already done", no change. The link in an email opens the page in that email's language; the token itself carries no language.

### 7.10 Privacy (`/privacy`)

In Arabic and English. The Arabic text is binding: the English page is a translation and says at the top that the Arabic text prevails. States what the system does:

- Collected: profile (email, Arabic name, major, academic level, gender, announcements choice, email language), registrations and waitlist places, newsletter emails, قاعدة المواهب answers with consent time, version and language.
- **Use for reporting:** counts by academic level, major and gender are reported to the Deanship and partner organizations as **aggregate figures only**; individual records are not shared.
- قاعدة المواهب: sent by Hisn to partner companies; data already sent cannot be recalled. Withdrawal removes the person from future exports; the original submission is kept as a record.
- Retention: talent entries are kept as a record and deleted periodically. While `TALENT_RETENTION_MONTHS` is unset, the page says the schedule is set by Hisn; once set, it states the period.
- Deletion requests at any time: `Contact@Hisn-sa.org`.

### 7.11 Admin (`/admin`, owner only)

- **Arabic only**, at `/admin`: no locale prefix, no language switcher, RTL.
- Every admin route and action checks `is_admin` on the server.
- **Events list:** status, date, registered / capacity, waitlist count, announcement status.
- **Create / edit form:** two optional fields, English title and English description (when empty, `/en` shows the Arabic text); Riyadh-time pickers (stored UTC); validation (end after start; in-person requires location; online requires meeting link; recording must be a YouTube URL; capacity positive or empty).
- **Status:** publish; unpublish to draft only with no registrations or waitlist; cancel.
- **Send announcement:** preview → recipient count → confirm. Progress "N of M sent"; "resend to failed only". Cannot start a second full send.
- **Cancel & notify:** registered and waitlisted people get the cancellation notice; records kept.
- **Notify of a change:** after editing time, location, format or meeting link of an event with registrations, admin shows "N registered — not notified" → preview → confirm → change notice with updated `.ics` to registered people.
- **Capacity:** lowering below registrations is allowed with a warning ("30 registered, exceeds new capacity of 20"); nobody is removed; no new registrations; waitlist kept. Raising promotes waitlisted people up to the new capacity.
- **Delete:** only with no registrations or waitlist; otherwise cancel.
- **Registrations:** list and CSV (name, email, major, academic level, gender, status, registered at, waitlist position).
- **All accounts CSV** («عموم المسجّلين»): every profile regardless of announcement consent: name, email, major (+ free text), academic level, gender, announcements opt-in, created at.
- CSVs start with a UTF-8 BOM so Arabic opens correctly in Excel. Labels come from the data files, not codes.
- **Recording:** add `recording_url` after the event.
- Admins cannot see `talent_submission_log` or anything in `hisn-talent`.

**Reporting rule (owner practice, P-1):** figures shared outside Hisn are aggregates. Categories with fewer than 5 people are reported as "<5" so nobody is identifiable.

## 8. Technical architecture

### 8.1 Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript; every write is a server action or route handler |
| Hosting | Vercel Pro (+ Cron) |
| Database / Auth | Supabase Pro, `@supabase/ssr` cookie sessions |
| Sign-in | Supabase Auth email OTP, 6 digits, 10 min; Auth email sent through Resend SMTP |
| Email | Resend Pro + React Email (RTL Arabic, LTR English); local/CI uses the Supabase mail catcher |
| Styling | Tailwind CSS, logical utilities only; IBM Plex Sans Arabic via `next/font`; teal/mint tokens |
| Icons | Lucide |
| Strings | `ar.json` + `en.json` (identical keys) + typed `t(locale, key, vars)` |
| Validation | Zod (forms, server actions, talent fields) |
| Monitoring | Sentry |
| Migrations | Supabase CLI, SQL files in the repo |
| Tests | Vitest, pgTAP via Supabase CLI, Playwright |

### 8.2 Rendering

Public content pages are static and revalidated when the admin saves an event. Seat counts, waitlist position, registration state and anything personal are fetched per request.

### 8.3 Database clients (isolation)

- `supabaseProd` (server and browser variants). The name `supabase` is banned by lint.
- `supabaseTalent`: one server-only module, the only code that reads the talent env vars, importable only from `app/talent/actions.ts` (lint + test).
- Every insert through `supabaseTalent` requests no returned row. Adding a read policy to "fix" this violates HR-1.

### 8.4 Registration logic

Postgres functions in `hisn-prod`, `SECURITY DEFINER`, using `auth.uid()`. Each locks the event row (`FOR UPDATE`).

| Function | Granted to | Returns |
|---|---|---|
| `register_for_event(event_id)` | authenticated | `registered` / `already_registered` / `full` / `closed` / `cancelled` / `not_found` / `profile_required` |
| `join_waitlist(event_id)` | authenticated | `waitlisted` (+ position) / `already_waitlisted` / `already_registered` / `not_full` / `no_capacity` / `closed` / `cancelled` / `not_found` / `profile_required` |
| `cancel_my_registration(event_id)` | authenticated | `cancelled` / `not_found` / `started` (works for registered and waitlisted) |
| `cancel_registration_by_id(registration_id, version)` | server only | same (token flow); `not_found` when the version doesn't match |
| `promote_waitlist(event_id)` | internal | promoted registration ids |
| `seats_left(event_id)` | anon, authenticated | int or null |
| `waitlist_position(event_id)` | authenticated | int or null |

- `cancel_*` and capacity changes call `promote_waitlist` inside the same transaction.
- Every function that should produce an email inserts a `queued` row into `email_deliveries` **in the same transaction** (outbox), with the registrant's `profiles.locale` as the email's language. The calling server action sends queued rows right after; the cron sends any left behind.

### 8.5 Signed tokens

- HMAC-SHA256 with the environment's secret.
- Unsubscribe: `{kind: "unsub", sub: normalized email}`, no expiry.
- Cancel: `{kind: "cancel", sub: registration id, ver: registration_version, exp: event start}` (registrations and waitlist places). A token whose `ver` no longer matches the row does nothing.
- Verification rejects tampered, expired or wrong-kind tokens.
- Tokens carry no language; the link's path does (`/ar/…` or `/en/…`, §10.6).

### 8.6 Talent submission and withdrawal

Server action, in order:

1. Refuse if `TALENT_FORM_OPEN` is not `true`.
2. Verify the session with `hisn-prod`; read the profile server-side. The browser never supplies profile fields or `user_id`.
3. Validate answers against `lib/talent/fields.ts` and require consent; the page's language is recorded as `consent_locale`.
4. Insert into `hisn-talent` through `supabaseTalent` (no return).
5. **Then** upsert `talent_submission_log` (`submitted_at = now()`, `withdrawn_at = null`).

Withdrawal: insert a `withdrawal` row into `hisn-talent` first, then set `withdrawn_at`. The talent write always comes first: a failed log write makes the person resubmit, which the export's latest-per-person logic absorbs.

### 8.7 i18n: Arabic and English

- English ships at launch with Arabic (D-1, revision 2.3). Locales `ar` (default, RTL) and `en` (LTR), defined once in `lib/i18n/locale.ts`.
- **Strings:** every interface string in `lib/i18n/ar.json` and `lib/i18n/en.json`, flat dotted keys, **identical key sets**; data-file labels are the one exception (§9.4).
- **Lookup:** `t(locale, key, vars)`; the locale is always the first argument. Public pages pass the page's locale; admin passes `'ar'`.
- **Key parity:** a unit test compares the sorted keys of both files and names every missing key per file; it runs in CI, so a key added to one file only fails the build.
- **Routing:** public pages live under `app/[locale]/…`; the locale layout renders `<html lang dir>` and both locales are generated statically; an unknown locale is a 404. `/admin` has its own Arabic-only layout outside the locale segment; `/api` routes have no locale. The proxy (`proxy.ts`, Next 16's replacement for middleware) redirects `/` and unprefixed paths to `/ar` (§6.6). Links are built with `localePath(locale, path)`; the switcher uses `switchLocalePath`; hreflang alternates come from `alternatesFor(path)`.
- **Data-file labels:** `label(file, code, locale)` returns the Arabic or English label (§9.4).
- **Event text:** `events.title_en` and `events.description_en` are optional. On `/en`, a missing one falls back to the Arabic text, rendered with `lang="ar" dir="rtl"` (wrapped in `<bdi>` when inline).
- **Dates:** `formatRiyadh(date, style, locale)`; Arabic keeps its format, English uses `en-GB` with 12-hour time like the Arabic (`6:00 pm`), Gregorian, Latin digits; both in Riyadh time.

### 8.8 Monitoring and logging

- Sentry: no request bodies, no session replay, form fields scrubbed in `beforeSend`.
- Alerts reach the owner; sign-in code failures are high priority.
- No logging of talent data anywhere.
- Developers have Sentry access so they can debug without production data.

## 9. Data model

RLS on every table. All timestamps `timestamptz`, UTC, displayed Asia/Riyadh.

### 9.1 `hisn-prod`

**`profiles`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `email` | text not null | = verified sign-in email; not updatable |
| `full_name_ar` | text not null | 2–100 chars |
| `major_code` | text not null | check: codes in `data/majors.json` |
| `major_other` | text null | required (2–80 chars) when `major_code = 'OTHER'`, null otherwise |
| `academic_level_code` | text not null | check: codes in `data/academic-levels.json` |
| `gender` | text not null | `male` / `female` |
| `announcements_opt_in` | boolean not null default false | |
| `announcements_updated_at` | timestamptz not null | |
| `locale` | text not null default `ar` | `ar` / `en`. Email language: the page's language at the first profile save; editable on `/account`; `authenticated` may insert and update it |
| `is_admin` | boolean not null default false | HR-4 |
| `created_at`, `updated_at` | timestamptz | `updated_at` by trigger |

Access:

- Insert own row only: `id = auth.uid()` and `email = auth.jwt() ->> 'email'`.
- Column privileges remove INSERT/UPDATE on `is_admin` and UPDATE on `email` from `authenticated` (HR-4).
- Read and update own row; admin reads all.

**`events`**

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `title`, `description` | text not null | Arabic |
| `title_en`, `description_en` | text null | Optional English; on `/en` a missing one falls back to the Arabic (§8.7) |
| `department_code` | text null | check: the six codes |
| `starts_at`, `ends_at` | timestamptz not null | `ends_at > starts_at` |
| `format` | text not null | `in_person` / `online` |
| `location` | text | required when `in_person` |
| `presenter` | text null | |
| `capacity` | int null | > 0; null = unlimited (no waitlist) |
| `registration_closes_at` | timestamptz not null | form defaults to `starts_at` |
| `status` | text not null default `draft` | `draft` / `published` / `cancelled` |
| `image_url`, `recording_url` | text null | recording must be YouTube |
| `announcement_started_at` | timestamptz null | |
| `created_at`, `updated_at` | timestamptz | trigger |

Access: `anon`/`authenticated` read `published` and `cancelled` rows. Admin full access.

**`event_private`** (revision 2.1): `event_id` bigint PK → events (on delete cascade), `meeting_url` text not null. Required for an online event to be published. RLS: admin only; no access for anyone else. The meeting link sits in its own table rather than behind a column privilege, because column privileges apply to the whole `authenticated` role and would also hide the link from the admin.

**`registrations`**

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `event_id` | bigint FK | |
| `user_id` | uuid FK → profiles | |
| `status` | text not null | `registered` / `waitlisted` / `cancelled` |
| `waitlisted_at` | timestamptz null | orders the waitlist |
| `promoted_at` | timestamptz null | |
| `registration_version` | int not null default 1 | +1 each time a cancelled row is reused; cancel links carry it (§8.5) |
| `created_at`, `cancelled_at` | timestamptz | |

Unique (`event_id`, `user_id`); re-joining reuses the row. Access: user reads own rows; writes only through §8.4 functions; admin reads all.

**`signups`**: `id`, `email` (unique on `lower(trim(email))`), `source` (`teaser` / `footer` / `import`), `locale` (`ar` / `en`, default `ar`: the page's language at signup; teaser and imported rows are `ar`), `created_at`. No direct access for `anon`/`authenticated`. The only way in is `newsletter_signup(p_email, p_source, p_locale)`, which rejects malformed addresses and unknown locales (errcode `22023`); the teaser calls it too (named arguments, locale defaults to `ar`).

**`email_unsubscribes`**: `email` PK with check `email = lower(trim(email))`, `source` (`link` / `header` / `profile` / `bounce` / `complaint`), `created_at`. Server only.

**`email_deliveries`**

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `event_id` | bigint null | |
| `registration_id` | bigint null | |
| `kind` | text not null | `announcement` / `confirmation` / `promoted` / `waitlist_joined` / `cancel_confirmation` / `event_cancelled` / `event_changed` |
| `email` | text not null | |
| `locale` | text not null default `ar` | `ar` / `en`: the language the email is rendered in, snapshotted when the row is queued (§10.6) |
| `status` | text not null | `queued` / `sent` / `failed` / `skipped` (unsubscribed between snapshot and send) |
| `provider_message_id`, `batch_key`, `error` | text null | |
| `created_at`, `attempted_at` | timestamptz | |

Server only; admin sees it through admin pages.

**`talent_submission_log`**: `user_id` PK, `submitted_at`, `withdrawn_at`. No answers. User reads own row; **admin has no access**; server writes.

### 9.2 `hisn-talent`

**`talent_entries`**

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `user_id` | uuid not null | from the verified session |
| `kind` | text not null | `submission` / `withdrawal` |
| `email`, `full_name_ar`, `major_code`, `major_other`, `academic_level_code`, `gender` | text | copied server-side from the profile |
| `answers` | jsonb | committee fields, validated by `lib/talent/fields.ts`; DB check: JSON object, < 20 KB |
| `fields_version` | text | version of `lib/talent/fields.ts` |
| `consent` | boolean | |
| `consent_version` | text | e.g. `v1` |
| `consent_locale` | text | `ar` / `en`: the language the consent was shown in (the Arabic text is binding either way) |
| `consented_at`, `created_at` | timestamptz default now() | |

Checks: a `submission` requires profile columns, `answers`, `fields_version`, `consent = true`, `consent_version` and `consent_locale`. A `withdrawal` carries only `user_id`, `kind`, `created_at` (`consent_locale` null).

Access: `anon` (the site's write-only key) INSERT only. Nothing else for `anon`/`authenticated`.

**`private.talent_export`** (view): latest row per `user_id`; people whose latest row is a withdrawal are excluded. Includes `consent_locale`, exported as the consent language. Schema `private` not exposed; privileges revoked from `anon`/`authenticated`. Read by `scripts/export-talent` through the owner's direct connection.

### 9.3 Development

`hisn-dev` and CI hold both schemas with fake data. Previews point `supabaseTalent` at `hisn-dev`. Talent migrations live in their own folder; CI and `hisn-dev` apply them automatically; the owner applies them to `hisn-talent` by hand.

### 9.4 Data files

| File | Holds | Read by |
|---|---|---|
| `data/majors.json` | `code`, Arabic label, English name; general fields of study seeded from KFUPM's published programs, plus `OTHER` | profile form, exports, export-talent |
| `data/academic-levels.json` | `code`, Arabic label, English name; seeded بكالوريوس، ماجستير، دكتوراه (final list per §19) | same |
| `data/departments.json` | `code`, Latin slug, Lucide icon | site |

- Labels are used in both languages: the Arabic label on `/ar`, the English name on `/en` (`label(file, code, locale)`). Department names are strings (`dept.<CODE>.title` in `ar.json` and `en.json`). Admin CSVs use the Arabic labels; `export-talent` the English names.
- Codes are **append-only once launched**; labels can change freely.
- Both databases check codes; **a CI test fails if any migration's allowed codes differ from the files.**

### 9.5 Retention and purge

- `TALENT_RETENTION_MONTHS` in `lib/config/retention.ts`, `null` until the founder and owner set it.
- `scripts/purge-talent` (owner's machine):
  - `--expired`: refuses while the constant is `null`; otherwise deletes all rows of people whose latest row is older than the period, and their log rows.
  - `--user <email>`: deletes one person's talent rows and log row.
  - Dry run by default; `--apply` deletes.
- Full account deletion requests are handled by the owner in the Supabase dashboard.

## 10. Email

### 10.1 Senders and types

From `حصن <noreply@hisn-sa.org>`; Reply-To `Contact@Hisn-sa.org`. One template per kind per language: RTL Arabic from `ar.json`, LTR English from `en.json`. Each email is sent in the recipient's language (§10.6).

| Email | Trigger | Class |
|---|---|---|
| Sign-in code (Arabic or English, §10.6) | Supabase Auth | Critical |
| Registration confirmation (+ `.ics`, meeting link, cancel link) | Register | Transactional |
| You have a seat (same content) | Waitlist promotion | Transactional |
| Waitlist joined (position, leave link) | Join waitlist | Transactional |
| Cancellation / left waitlist confirmation | Cancel | Transactional |
| Event cancelled | Admin | Transactional (registered + waitlisted) |
| Event changed (+ updated `.ics`) | Admin | Transactional (registered) |
| Announcement | Admin | Announcement |

Transactional emails always send, regardless of unsubscribes.

### 10.2 Announcement audience

```
(emails in profiles where announcements_opt_in = true)
∪ (emails in signups that have no account)
− (emails in email_unsubscribes)
```

**The account decides:** once an account exists for an email, only its checkbox counts; an earlier newsletter signup for that email is ignored.

Deduplicated on normalized email. Unsubscribes are keyed on email. Each address comes with its email language: the profile's `locale` when an account exists for that email, otherwise `signups.locale`.

**Only a verified session reverses an unsubscribe.** `newsletter_signup` is open to `anon` and accepts any address, so it cannot prove the caller owns the email; if it removed unsubscribes or set opt-in, anyone could re-subscribe someone else by typing their address into the footer. An unsubscribed person opts back in by ticking the box in their account (P-1). An unsubscribed address with no account stays unsubscribed even if it is entered in the newsletter form again; it is resubscribed on request through `Contact@Hisn-sa.org`, or by creating an account and ticking the box.

| Action | Effect |
|---|---|
| Profile created with box ticked | opt-in true; delete email from `email_unsubscribes` |
| Profile created with box unticked | opt-in false; no change to `email_unsubscribes`. No announcements: the account decides, so an earlier newsletter signup no longer counts |
| Box ticked later in account | opt-in true; delete from `email_unsubscribes` |
| Box unticked later in account | opt-in false; upsert into `email_unsubscribes` (source `profile`) |
| Unsubscribe link or header | upsert into `email_unsubscribes`; opt-in false on a matching profile |
| New newsletter signup | insert into `signups` only. No change to `email_unsubscribes`; no change to any profile |
| Hard bounce or spam complaint (Resend webhook) | upsert into `email_unsubscribes` (source `bounce` / `complaint`) |

### 10.3 Sending

- **Outbox:** every email is first a `queued` row in `email_deliveries`, written in the same transaction as the action. The server action sends it immediately; `/api/cron/flush-email` (every 10 min, `CRON_SECRET`) sends rows queued for more than 2 minutes.
- **Announcements:** audience snapshotted into `email_deliveries` → Resend batch endpoint, up to 100 per batch, individual emails (no BCC) with their own unsubscribe headers. Idempotency key `{kind}-event-{id}-run-{r}-batch-{n}` stored in `batch_key` (unchanged by language; a batch may mix Arabic and English emails); automatic retries reuse it; `r` increases only on "resend to failed only". Unsubscribes re-checked before each batch. Confirm during setup that the batch endpoint honours idempotency keys.
- Cancelled and changed notices use the same batch mechanism.

### 10.4 Unsubscribe headers

```
List-Unsubscribe: <{SITE_URL}/api/unsubscribe?t={token}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

- `POST /api/unsubscribe` unsubscribes and returns 200 with an empty body.
- `GET /api/unsubscribe` redirects to `/unsubscribe?t=…` (confirm button; the proxy, `proxy.ts`, adds `/ar`, §6.6). Never acts (HR-5). The header URL has no language.
- Effective immediately. Resend does not add these headers for API sends; the code does, and a test asserts it.

### 10.5 Non-production email

Local/CI: mail catcher. Previews: separate Resend key, only `EMAIL_ALLOWLIST` addresses receive mail. `SITE_URL` is the private production address until the domain switch.

### 10.6 Email language

- **Source:** `profiles.locale` for anyone with an account (set from the page's language at the first profile save, editable on `/account`); for newsletter-only addresses, `signups.locale`, the page's language at signup (the newsletter form sends it).
- **Snapshot:** each `email_deliveries` row stores `locale` when queued. Registration and waitlist functions, and the cancelled and changed notices, use each registrant's `profiles.locale`; announcements use the language the audience returns (§10.2). The sender renders the template for that row's `locale`.
- **Templates:** `lib/email/templates/ar/<Kind>.tsx` and `lib/email/templates/en/<Kind>.tsx` for each of the seven kinds, each language with its own layout (`dir="rtl"` / `dir="ltr"`); subjects per kind and language.
- **Links** use the delivery's language: `{SITE_URL}/{locale}/registrations/cancel?t=…`, `{SITE_URL}/{locale}/unsubscribe?t=…`. The one-click `POST /api/unsubscribe` stays language-free (§10.4).
- **`.ics`** uses the delivery's language, with the same English-to-Arabic event-text fallback as the pages (§8.7).
- **Sign-in code:** one Supabase Auth template that switches on the user's metadata `locale` (Arabic or English body and subject). The sign-in page passes its language when requesting the code; saving the profile mirrors `profiles.locale` into the auth user's metadata whenever it changes.
- Sender stays `حصن <noreply@hisn-sa.org>` in both languages.

## 11. Edge cases and error handling

**Principle:** the database is the record; email is a notification (outbox + cron + admin resend). **Exception:** the sign-in code.

| Situation | Behaviour |
|---|---|
| Sign-in code fails / doesn't arrive | Clear error, resend after 60s, junk hint; high-priority alert |
| University email entered at sign-in | Warning, not a block |
| Two people take the last seat at once | Row lock: one `registered`, one `full` (offered the waitlist) |
| Double-click register / join | `already_*`, shown as success |
| Closed / cancelled between load and click | Message; nothing written |
| Seat frees before close | Earliest waitlisted promoted in the same transaction; "you have a seat" queued |
| Seat frees after close | Stays empty; nobody promoted |
| Several seats free at once (capacity raised) | Promote in waitlist order up to capacity |
| Promoted person's email fails | Registration stands; delivery `failed`; admin can resend |
| Capacity lowered below registrations | Allowed; warning; full; nobody removed; waitlist kept |
| Event cancelled with a waitlist | Registered and waitlisted both notified |
| Cancel / leave link reused, after start, or tampered | "Already done" / "has started" / error; no change |
| Old cancel link used after cancelling and registering again | "Already done"; the new registration is untouched (version check) |
| Malformed address on the teaser or footer form | Rejected by `newsletter_signup`; never stored |
| An address hard-bounces or reports spam | Webhook adds it to `email_unsubscribes`; never mailed again |
| Announcement fails mid-send | Progress; resend failed only; idempotent batches |
| Server dies after commit, before send | Queued row sent by the cron |
| Talent form closed (`TALENT_FORM_OPEN` false) | «يفتح قريبًا»; server action refuses |
| Talent insert fails | Error; form keeps contents; nothing logged |
| Talent log write fails after insert | Shows "not submitted"; resubmission harmless |
| `returnTo` pointing off-site | Ignored; returns to `/` |
| Delete / unpublish an event with registrations or waitlist | Not allowed; cancel instead |
| Broken image / removed video | Fallbacks |
| Unknown URL / server error | 404 / error page in the page's language |
| Unknown language segment (e.g. `/fr/events`) | 404 |
| Path without a language prefix (e.g. `/events`) | Redirect to `/ar` + path |
| Event without English title or description, viewed on `/en` | Arabic text shown, `lang="ar" dir="rtl"` |
| Newsletter spam | Honeypot; duplicates ignored silently |

Saudi Arabia has no daylight saving time.

## 12. Content

- Placeholders from day 1 carry the marker «مؤقت». `npm run check:content` fails while any remain; reported in CI during the build, required before the domain switch.
- `check:content` scans `ar.json`, `en.json` and `content/**/*.md`.
- Final copy is an edit to `ar.json` and `en.json`, possible up to launch.
- English copy is drafted by the developers and approved by the owner. Until approved it carries «مؤقت», so `check:content` fails.
- Hero fallback: typographic hero on the brand gradient.
- Icons: Lucide.

## 13. Team conventions (from day 1, enforced in CI)

1. No literal interface text in components; keys into `ar.json` and `en.json` only, with identical key sets (CI check), through `t(locale, key, vars)`. Public pages live under `app/[locale]/`; admin is Arabic only.
2. Logical CSS only; no physical `left`/`right`. Directional icons flip with text direction.
3. Clients named `supabaseProd` / `supabaseTalent`; `supabase` banned; `supabaseTalent` importable only from `app/talent/actions.ts`.
4. Schema changes only as migrations; production migrations are expand-only.
5. Never log talent data; never send request bodies to Sentry.
6. Times stored UTC, displayed Asia/Riyadh.
7. Mixed-direction values are wrapped in `<bdi>`: emails, URLs and English names inside Arabic text, and Arabic names or fallback Arabic event text inside English text.

## 14. Delivery pipeline

**Every pull request (no production secrets):** lint (§13), typecheck, unit tests (including `ar.json`/`en.json` key parity) → throwaway local Supabase with all migrations on seed data → pgTAP → script tests → production build → Playwright against the local build → majors/levels consistency → content-marker check (reported).

**Merge to `main` (after owner approval):** migrations to `hisn-dev` → in the `production` environment: migrations to `hisn-prod` → Vercel production deploy. A failed migration stops the deploy.

**Seed data:** about 30 profiles across majors (incl. «أخرى»), levels, genders and opt-in states; events in every state, including one full event with a waitlist; registrations; signups; unsubscribes; talent submissions and withdrawals.

## 15. Testing

### Database (pgTAP)

- Talent key: insert succeeds; select on `talent_entries` and `private.talent_export` denied.
- Talent insert without consent or consent version rejected; withdrawal with content rejected; non-object `answers` rejected.
- `authenticated`: cannot insert a profile with `is_admin = true` or with an email other than its verified email; cannot update `is_admin` or `email`; cannot read other profiles.
- `major_other` required exactly when `major_code = 'OTHER'`.
- `anon` and non-admin `authenticated` cannot read `event_private` or drafts.
- Last-seat race: exactly one registered.
- Waitlist: join only when full; positions ordered; cancel promotes the earliest; no promotion after close; capacity raise promotes in order; capacity lowered removes nobody.
- Every promotion and registration inserts a queued delivery in the same transaction.
- Admin cannot read `talent_submission_log`.
- `signups`: no direct insert; `newsletter_signup` rejects malformed emails; case-only duplicate rejected.
- `email_unsubscribes`: an uppercase email is rejected (`23514`).
- Re-registering bumps `registration_version`; an old-version cancel returns `not_found`.
- `talent_export`: latest per person; withdrawn excluded.
- Locale columns: defaults `ar`; values other than `ar`/`en` rejected; `authenticated` can insert and update its own `profiles.locale`; `newsletter_signup` stores `p_locale` and rejects an unknown one (`22023`), and its earlier behaviour still holds.
- Talent: a submission without `consent_locale` rejected; a withdrawal with one rejected.

### Unit (Vitest)

Tokens; announcement rules table (§10.2); audience dedup and language; Riyadh formatting and day grouping (both languages); almost-full threshold; talent field validation; `returnTo` sanitising; every `t()` key exists; `ar.json` and `en.json` have identical keys; announcement headers present; proxy (`/` → `/ar`, unprefixed path → `/ar` + path, `/admin` not redirected); `<html lang dir>` on `/ar`, `/en` and `/admin`; language switcher keeps the page and query; hreflang alternates; event-text fallback; every email kind renders in both languages (`dir`), with links carrying the language.

### Scripts

- `export-talent`: `.xlsx` opens; columns = profile columns + one per field in `lib/talent/fields.ts` + consent version, consent language (Arabic / English) and consented at; row count = latest-per-person minus withdrawals; Arabic and English round-trip; labels from data files.
- `purge-talent`: dry run changes nothing; `--expired` refuses while retention is null; `--apply` deletes only expired; `--user` only that person.

### Lint and build

No literal strings; no physical CSS; client import rule; `supabase` banned; data-file codes match migrations; content markers.

### End-to-end (Playwright)

Sign up → code from mail catcher → profile overlay (level, gender, «أخرى» major) → register (no second click) → confirmation received → cancel link GET changes nothing → confirm cancel. Second user: full event → join waitlist → first user cancels → second user promoted and emailed. Talent form (flag on) → success screen → account shows "submitted on". English journey on `/en`: sign in → English code email → profile → register → English confirmation email; language switcher opens the same page in the other language.

### Manual

Launch checklist (§17).

## 16. Migration and launch

**Day 1 (owner):** import teaser `signups` into `hisn-prod` (normalized, case-duplicates dropped); edit the teaser's `js/script.js` to the `hisn-prod` public key and redeploy; then remove the old project's insert policy.

**Preparation:** check whether Vercel's DNS target for hisn-sa.org differs between projects; Cloudflare record DNS-only; lower TTL a day before; rehearse on `rehearsal.hisn-sa.org` (teaser → new → teaser, including certificate issuance), timing each step.

**Switch:** repeat on hisn-sa.org; set `SITE_URL=https://hisn-sa.org` and redeploy; rollback = rehearsed reverse steps.

## 17. "Launched" checklist

- [ ] All §2 in-scope features working on production
- [ ] Final department content in, Arabic and English; English copy approved by the owner; `check:content` passes
- [ ] Every public page works on `/ar` and `/en`; `/` redirects to `/ar`; the language switcher keeps the page; `/admin` is Arabic only
- [ ] An account created on `/en` receives the sign-in code and the registration confirmation in English; changing the email language on `/account` switches the next email
- [ ] Token pages (cancel, unsubscribe) open in the email's language and still act only on the confirm button
- [ ] Talent form open with final fields and final consent text in both languages (the English translation states that the Arabic text prevails) — or, if inputs were late, closed with «يفتح قريبًا» (HR-8)
- [ ] Domain switched; rollback rehearsed and timed
- [ ] Emails from the verified domain (SPF, DKIM, DMARC)
- [ ] Sign-in code arrives within seconds, not in junk, at a real Gmail **and** a real `@kfupm.edu.sa` inbox
- [ ] Full end-to-end on production: account → registration → confirmation in a real inbox → cancel link → waitlist promotion → talent submission (if open)
- [ ] Gmail's unsubscribe button works on a real announcement
- [ ] A test hard bounce (`bounced@resend.dev`) lands in `email_unsubscribes` with source `bounce`
- [ ] If the talent form is open: a submission from a non-university email (e.g. Gmail) succeeds
- [ ] `export-talent` run; opened in Excel; Arabic and English display correctly
- [ ] Both admin CSVs opened in Excel; Arabic labels correct
- [ ] Talent key denied reading `talent_entries` and `private.talent_export`
- [ ] Developer accounts have no access to Hisn Prod, Hisn Talent or production env vars
- [ ] Sentry alerts reach the owner, including a high-priority sign-in alert
- [ ] Flush cron running in production
- [ ] `Contact@Hisn-sa.org` receiving mail
- [ ] `SITE_URL` = `https://hisn-sa.org`

## 18. Risks

| Risk | Mitigation |
|---|---|
| Scope grew (waitlist, fields) while the schedule lost two days | Checkpoint Wed 18 Nov with a pre-agreed order of what moves into the buffer (plan §Schedule) |
| Owner is a single point of failure | Daily review window; developers never blocked; seed data; Sentry; expand-only migrations |
| Talent inputs have no date | Fields in one module; JSON answers; flag; launch closed if late (HR-8) |
| Sign-in codes delayed or junked | Codes not links; DMARC; real inboxes tested in week 1; high-priority alert |
| Resend verification delay blocks sign-in | Checked day 1; critical path |
| Marketing copy late | Placeholders; 19 Nov trigger; plan B |
| A code path captures talent data in transit | HR-1 controls: `supabaseTalent` isolated in one server-only module, importable only from `app/talent/actions.ts` (lint rule `hisn/talent-import` and the talent-isolation test); `hisn-talent` in its own owner-only Supabase organization; Sentry scrubbing and no logging of talent data (§8.8); owner review of every merge and owner-only production deploy |
| Broken migration reaches production | Tested on every PR on seed data; deploy stops on failure |
| Conventions drift (strings, RTL CSS, client naming) | One repo, one deploy path; conventions enforced by lint and CI from day 1 (§13) |

## 19. Inputs owed

| Input | From | Due |
|---|---|---|
| Content shape + one worked department; hero quote, attribution, source, cleared image | Marketing | Thu 12 Nov |
| Majors list (seed from KFUPM programs) | Owner | Day 1 |
| Academic levels list: confirm whether دبلوم and a "graduate / professional" option are included | Founder | Before profile form merges (target 15 Nov); codes append-only after launch |
| Final copy for all six departments | Marketing | Thu 19 Nov (trigger) |
| English copy (`en.json`) | Developers draft; owner approves | Before launch (`check:content`) |
| Talent field list | Specialized committee | **No date yet.** Trigger 19 Nov |
| Talent consent text («الشروط والأحكام») | Founder | **No date yet.** Trigger 19 Nov |
| English translation of the talent consent | Owner drafts; founder approves | After the founder's Arabic text; both are needed before the form can open (HR-8) |
| Retention period | Founder + owner | No date; one constant |
| Library access (D-3) | Founder, after consulting programs head and Deanship | Before launch; one flag |

## 20. Open decisions

| ID | Decision | Default the build assumes | Impact if changed |
|---|---|---|---|
| D-1 | Build the English interface toggle now? | **Decided: Yes** (closed in revision 2.3). Decided on **2026-11-22** by **the owner (Abdulaziz Alessa)**. No default applies: Arabic and English launch together | Applied throughout this spec (§2, §6.6, §8.7, §9, §10.6); the owner manages the schedule |
| D-2 | Personal email: is it the sign-in email (A), or a second field (B)? | A | B: +1 day (second verification code, second column, rules for which address receives what) |
| D-3 | Library open to everyone or signed-in only? | Open | One flag. Note: YouTube embeds remain viewable by anyone with the video link, so a sign-in gate hides the list, not the videos |
| D-4 | Add an "institution" field (KFUPM / other university / organization / none) to the profile? | Not added | +0.25 day. Would let reports and partners see KFUPM vs. others now that the site is open to all |

**D-2 options in detail:**

- **A. Sign-in email = personal email.** The code verifies the address, so it cannot be mistyped or someone else's. One identity, one address. Cost: the sign-in screen must persuade people to use a personal email; a university address is warned, not blocked. Someone who signs in with a university email anyway and later loses it is locked out until the owner helps manually.
- **B. Any sign-in email + a second "personal email" field.**
  - **B-verified:** the second address gets its own code. Safe, but two codes at sign-up, and every email must decide which address it goes to.
  - **B-unverified:** a typo makes the record unreachable, and a person can enter someone else's address, so Hisn would email strangers and attach their address to another person's data. Fails P-1; not offered.
