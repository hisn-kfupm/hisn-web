# hisn-web

حصن — the Hisn website, phase 2. Team rules, scripts and branch conventions: [`CLAUDE.md`](CLAUDE.md). Task files: [`docs/tasks/`](docs/tasks/). Spec and plan: [`docs/superpowers/`](docs/superpowers/).

Next.js 16 (App Router, Turbopack, Cache Components) · TypeScript · Tailwind CSS v4 (tokens in `app/globals.css` `@theme`) · Vitest · Playwright.

Node 24 (`.nvmrc`). Every pull request runs [`.github/workflows/pr.yml`](.github/workflows/pr.yml): `npm ci`, lint, typecheck, unit tests and build must pass; `check:content` lists the «مؤقت» strings left but doesn't fail the run yet.

Design direction, briefs and the prototype stay in the design repo, [`hisn-kfupm/hisn_web_design`](https://github.com/hisn-kfupm/hisn_web_design): [`design/01-discovery.md`](https://github.com/hisn-kfupm/hisn_web_design/blob/main/design/01-discovery.md) (Direction A «لبنة») and [`design/04-revision.md`](https://github.com/hisn-kfupm/hisn_web_design/blob/main/design/04-revision.md) (the current revision brief). All the code lives here.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (with the team rules below) + Stylelint (logical properties only) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (`tests/unit`, jsdom) |
| `npm run test:db` / `test:scripts` / `test:e2e` | DB, scripts and Playwright suites |
| `npm run check:content` | Fails while any «مؤقت» draft text remains (D1-4) |

Conventions (dev-1 "Rules for every task"): no literal UI text in components — every string is a key in `lib/i18n/ar.json` read with `t()`; logical properties only (`ms-*`, `pe-*`, `text-start`); wrap English names, emails and URLs inside Arabic in `<Bdi lang="en">`; times stored UTC, shown in Asia/Riyadh. Client components receive strings as props from server components, so `ar.json` stays out of the browser bundle.

`npm run lint` enforces these through the local `hisn` ESLint plugin (`tools/eslint-rules/`) and `.stylelintrc.json`, everywhere except `tests/`, `scripts/` and `supabase/`:

| Rule | Fails on |
|---|---|
| `hisn/no-literal-text` | Letters between JSX tags or in a string in braces; any letter in `alt`, `title`, `placeholder`, `aria-label`; Arabic letters in any other prop |
| `hisn/no-supabase-name` | A variable, parameter or import named exactly `supabase` |
| `hisn/talent-import` | Importing `@/lib/db/talent` anywhere except `app/talent/actions.ts` |
| `hisn/no-physical-classes` | `ml-*`, `pr-*`, `left-*`, `text-right`, `rounded-l-*`, `rounded-tl-*`, `border-r-*`, `float-left`, `origin-right`, `bg-linear-to-r`, `scroll-ml-*` and the like, also after a variant (`lg:pl-6`), in `className` props and in `cn()` calls. Use `origin-(--start)` for a transform origin on the inline-start edge |
| Stylelint | `margin-left`, `padding-right`, `left`, `border-left` and their longhands; `left` or `right` as the value of `text-align`, `float` or `clear`; `to left`/`to right` in a background, mask or border-image gradient (write `linear-gradient(var(--to-end), …)`); `left`/`right` in `transform-origin` (write `var(--start)`) |
