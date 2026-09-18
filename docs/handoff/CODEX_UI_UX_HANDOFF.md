# UI/UX handoff — Salesperson CRM

Repository: https://github.com/kagrosh/salespersona (branch `master`).

Paste everything below this line into Codex as the opening prompt. It assumes Codex is opened in the repository root.

---

You are working on **Salesperson** (repository https://github.com/kagrosh/salespersona, branch `master`), a real-estate CRM whose core feature is a sales-strategy assistant. A salesperson records a customer, a project/property, an opportunity, conversation evidence and observed behavior; the assistant returns a primary next move, a fallback, response branches, ranked angles, objection responses and a customer-ready draft in English or Turkish.

Your job is **UI/UX only**: make the app clearer, calmer and faster to use for a busy salesperson, without removing any field, action, hint or output. The product logic is finished and reviewed. Do not change it.

## 1. Read these first, in this order

1. `CLAUDE.md` — stack, layout, non-negotiable product rules, working conventions.
2. `node_modules/next/dist/docs/` — this is Next.js 16 and it differs from your training data (async `params`/`searchParams`/`cookies`, `proxy` instead of middleware, `PageProps<"/route">` types). Read the routing and forms guides before editing any page.
3. `prototype/salesperson-test.html` — a single-file version of the assistant. Its form was just restructured for usability and is the **reference pattern** for the work below: numbered groups, collapsible sections with plain-language subtitles and live "x of y filled" counters, "key" tags on the ten fields that matter most, a sticky action bar, a dismissible quick-start banner, and a result panel whose secondary sections collapse with counts in their headers.
4. `docs/handoff/CLAUDE_PROJECT_HANDOFF.md` §5 (primary workflow) and §6 (proposed screens) for what each screen is for.

## 2. Stack and where things live

- Next.js 16 App Router, React 19 server components with Server Actions, TypeScript, Tailwind 4. Deployed on Vercel. Supabase Postgres and Auth.
- Global styles: `src/app/globals.css` (small set of utility classes: `.input .select .textarea .label .btn .btn-secondary .btn-sm .card .card-title .badge .badge-* .quote .note-*`).
- Shared components: `src/components/ui.tsx` (`Card`, `Collapsible`, `Field`, `Select`, `Empty`, `ErrorNote`, `PageHeader`, `StageBadge`, `DateText`, `DaysAgo`, `RowLink`), `strategy-view.tsx` (renders a strategy result), `customer-form.tsx`, `project-form.tsx`, `copy-button.tsx`.
- App shell: `src/app/(app)/layout.tsx` (top nav: Overview, Opportunities, Customers, Projects, Tasks).
- Screens: `src/app/(app)/page.tsx` (overview), `customers/`, `projects/`, `opportunities/`, `tasks/`, and `src/app/login/page.tsx`.
- **The core screen** is `src/app/(app)/opportunities/[id]/page.tsx` (418 lines): strategy card at the top, then collapsibles for pipeline stage, deal context, qualification, negotiation, candidate properties, budget, structured assessment, activity and evidence, follow-up tasks, angles tried, strategy history.
- Mutations: `src/app/actions/*.ts`. Domain logic: `src/domain/`. Model adapter: `src/lib/ai/`. Schema: `supabase/migrations/`.

## 3. Hard boundaries

Do not edit anything under `src/domain/`, `src/app/actions/`, `src/lib/`, `supabase/`, or `prototype/`. Do not add, rename or remove form field `name` attributes, hidden inputs, or Server Action bindings: the actions parse `FormData` by name. Do not add dependencies without a one-line justification in the PR description; prefer Tailwind and plain React. Keep everything server-rendered unless interactivity genuinely needs a client component, and then keep that component small.

Product rules that shape the UI and must survive every change:

- **Nothing is removed.** Every field, hint, list, button and result section stays reachable. Progressive disclosure is fine; deletion is not.
- **Honest by construction.** Wording like "review before sending; nothing is sent by the CRM", "not facts", "each ends in an ask", "only what changes this recommendation" is part of the product, not decoration. Keep the meaning even if you shorten the phrasing.
- **Three things are kept visibly apart:** what the customer said, what the salesperson observed, and what the salesperson interprets. Do not merge them into one notes box.
- **Seller-side negotiation data is never shown in customer-facing text.** The authorized room and floor stay in the internal section only.
- **Generating a strategy or a draft never sends anything, reserves inventory, takes payment or moves a deal to Won.** Buttons must not imply otherwise.
- **No invented numbers.** No confidence scores, closing probabilities, progress percentages that imply likelihood of winning. A "fields filled" counter is fine; a "deal health score" is not.
- **Customer-facing text comes from the engine.** Never hard-code a customer-facing sentence in the UI.
- **Nationality is never a personality label.** Market, language and logistics are separate fields and stay that way.
- Money is shown with an explicit currency. Unknown cost is shown as unknown, never as zero.

## 4. Who uses it and how

Real-estate salespeople in Türkiye selling apartments, villas and plots to Turkish and international buyers. They work between calls and site visits, often on a phone, sometimes on a laptop in the office. English UI; customer drafts in English or Turkish. They need to answer "what do I do next with this customer, right now" in under ten seconds of looking at the screen, then copy a draft and go.

## 5. What to do, in priority order

1. **Opportunity screen.** Apply the prototype's pattern. Group the collapsibles into three or four numbered groups with plain-language subtitles. Show a completion summary on each collapsed header (the `summaryExtra` prop already exists; extend it consistently). Keep the strategy card at the top with the primary ask, "Do", and the draft always visible; collapse hypotheses, response branches and what-to-verify behind headers that show counts. Add a sticky bar with the generate buttons so the user never scrolls to find them. Make the whole page usable at 390px wide.
2. **Overview page.** Turn it into a "today" view: what is due, what is stalled, what has a fresh strategy. Keep every list it shows now.
3. **Customer, project and opportunity forms.** Consistent field order, key fields first, clarifications as small hint text rather than long labels, sensible input types and autocomplete.
4. **List pages** (opportunities, customers, projects, tasks). Scannable rows, stage and freshness at a glance, empty states that say what to do next.
5. **Shell and login.** Current-page indication in the nav, a compact mobile nav, sign-in page polish. The Create-account tab is intentionally hidden when `SIGNUP_ALLOWED_EMAILS` is set; leave that logic alone.
6. **Design tokens.** If you introduce spacing, color or type tokens, put them in `globals.css` and migrate the existing utility classes rather than duplicating them. Keep the emerald accent unless you have a reason; document any palette change.

## 6. Definition of done for every PR

- `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` all pass. Run `npx next typegen` first on a fresh clone.
- Screenshots at desktop and 390px width for every screen you touched, before and after.
- A short list in the PR of every field, button and section on the touched screens, confirming each still exists and where it moved. This is how "nothing removed" is verified.
- No new hard-coded customer-facing sentences. Grep your diff for quoted sentences addressed to a customer.
- Small PRs, one screen or one concern each, opened against `master` on https://github.com/kagrosh/salespersona. Branch names `ui/<screen>`.

## 7. Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Supabase credentials live in `.env.local` (already present locally; never commit it). If you need a quick look at the assistant without a login, open `prototype/salesperson-test.html` in a browser, press "Load demo", then "Generate strategy".

If anything in the product rules conflicts with a design improvement you want to make, stop and ask rather than choosing.
