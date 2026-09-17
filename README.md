# Salesperson — Customer Psychology CRM

Real-estate CRM whose core feature is a sales-strategy assistant. A salesperson records a customer, a
project/property, an opportunity, conversation evidence and observed behavior; the assistant returns
case-specific sales angles, objection responses, scripts, a primary next move, a fallback and response
branches. It serves Turkish and international buyers of apartments, villas and residential, tourism and
commercial plots. Assertive and persistent, never dishonest.

## Stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind 4 |
| Database, auth | Supabase Postgres with row-level security, Supabase Auth (email + password) |
| Hosting | Vercel |
| Domain logic | `src/domain` — plain TypeScript, unit-tested with Vitest, no framework imports |
| Model analysis | Anthropic SDK behind a provider-neutral server-side adapter (`src/lib/ai`) |

## Setup

1. Create a Supabase project. In the SQL editor, run `supabase/migrations/0001_init.sql` and then
   `0002_closer_fields.sql`, `0003_stale_project_evidence.sql` and `0004_stale_columns.sql` in order (or
   `supabase db push` with the CLI). They create all tables, RLS
   policies, the signup trigger that gives each user a workspace, and the triggers that mark strategy
   runs stale after material changes.
2. In Supabase → Authentication → Providers, enable Email. For local testing you may disable
   "Confirm email" so sign-up signs in immediately.
3. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable (anon) key.
   `ANTHROPIC_API_KEY` is optional; without it the app runs rule-based strategy only and says so.
4. Install and run:

```bash
npm install
npm run dev
```

5. Open http://localhost:3000, create an account, and follow the workflow below.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (Turbopack) |
| `npm test` | Domain unit tests (money math, strategy engine acceptance scenarios) |
| `npm run typecheck` | `tsc --noEmit` (run `npx next typegen` first on a fresh clone) |
| `npm run lint` | ESLint with the Next.js and React rules |

## Deploy to Vercel

Import the repository, set the three environment variables from `.env.example` in the project settings,
and deploy. `src/app/(app)/opportunities/[id]/page.tsx` sets `maxDuration = 300` so model analysis is not
cut off by the default function timeout. Add your Vercel URL to Supabase → Authentication → URL
configuration (site URL and redirect URLs).

## Primary workflow

1. **Customer** (`/customers/new`): contact details, preferred sales language, customer market and purchase
   logistics as separate fields. Nationality never becomes a personality label.
2. **Project and inventory** (`/projects`): reusable project facts, then individual units/plots with price,
   currency, other costs (blank = unknown, never zero), availability and check date. Plots keep marketed
   use and documented permitted use apart; ongoing homes keep delivery claims and documented milestones
   apart. Every selling point is a claim with a status (supplied → verified/disputed/expired).
3. **Opportunity** (`/opportunities/new`): the core screen. Pipeline stage with history, deal context
   (readiness, explicit objection, funding, seller's negotiation room), candidate properties, versioned
   budget with scope and firmness, the eight structured assessment questions, and the activity timeline
   where customer quotes, factual observations and the salesperson's interpretation are separate fields.
4. **Strategy**: "Generate (rules)" runs the transparent rule engine on the current snapshot. "Analyze
   full case with AI" sends the same snapshot plus written notes to the model adapter and validates the
   structured result against the same schema. Both save an immutable run with its input snapshot.
   The first thing on screen is the close-readiness level (close now / conditional / trial close /
   advance / stopped), the active blocker and **the exact ask** in the customer's language, with a copy
   button, a "save as task" default of tomorrow 10:00, and "mark draft as sent" which logs the ask.
5. **Act**: save the primary move or fallback as a task; record which angle you actually used, the
   wording, and how the customer responded (this also logs an activity and, on an advance, prompts the
   next pipeline stage). A failed angle is not repeated unless a material fact changed; an angle delayed
   twice is replaced by the direct question.
6. **Refresh**: any material change (price, availability, budget, objection, negotiation position,
   activity, answer, attempt, completed task) marks the current run stale via database triggers.
   Regenerate; the new run lists what changed.

## What the closer revision adds (engine `rules-2.2.0`)

- **Qualification gate**: goal, budget, decision-makers, decision date and why-now, funding, must-haves.
  Two or more gaps at shortlist or later make a qualification call the primary move; it asks only for the
  facts that are missing.
- **Close readiness** with the exact missing checks (availability fresh within 14 days, complete cost
  list, evidenced funding, aligned co-decider). Ready customers with one open seller check get a
  conditional close, not another discovery question; a customer who wants to make an offer without a
  comparable budget gets the terms close (all-in amount and currency). A won, lost or paused deal is
  never close-ready; a sold or reserved unit is announced first and the close moves to a real
  alternative, or to a search when none is on file.
- **Stage ladder**: every pipeline stage has a floor ask (call, two options, visit, yes/no/yes-if,
  reservation) and an "after yes" next rung. The customer's own stated next step wins when recorded.
- **Negotiation order**: defend value, isolate, get the customer's number, trade for a dated commitment,
  never a unilateral concession. Seller-authorized room and terms, concessions already given, and the
  customer's counter-offer are recorded facts; "within written authority" closes on price today (and
  checks the all-in total against a firm budget), "price final" stops trips back to the seller, and a
  fitting alternative becomes an alternative-choice close; with no alternative on file the ask is the
  yes/no and the number the customer would sign at. A concession already given is held without ever
  claiming the customer promised a yes for it. The authorized floor is never shown to the customer.
- **23 objections**, each with a native Turkish and English script, a two-sentence reply, an isolating
  question and a close ask; concern answers map to the same playbooks.
- **Persistence**: silence after an unanswered ask triggers a re-ask (yes / not yet / no); touches widen
  2, 5, 10, 20 days and collapse after three unanswered touches; a pause with a date is respected and
  re-engaged when the date passes; a lost deal is won back only with a recorded change or on the agreed
  revisit date; a contact refusal stops everything; a unit or project refusal does not.
- **Legitimate urgency only**: a terms deadline needs a recorded source (and the proposed slots stay
  inside the date), a scarcity count needs a source and a fresh check, a price-list validity is stated as
  a date, never as pressure, and an expired date is never rendered. An undated price note is a lever on a
  live deal only; it is never presented as "what changed" to a lost or paused customer.
- **Drafts** are real messages (at most 90 words) plus a call opener, written natively in Turkish when
  the customer's language is Turkish, with an English translation for the salesperson.
- **Overview alarms**: stalled deals, no next step, re-contact due, expiring terms, win-back list.

## What is implemented

- Phase 1: persistent customers, projects, inventory, opportunities, options, budgets, activities,
  assessment answers, evidence claims, tasks, stage history; authentication; workspace-scoped RLS on
  every table; work overview with overdue/today follow-ups.
- Phase 2: rule engine (`src/domain/strategy/engine.ts`) with playbooks A–J and method-source cards
  (`playbooks.ts`), current-state snapshot, primary move / fallback / response branches, hypotheses with
  alternatives, stale marking, strategy history, attempts, task-from-move.
- Phase 3: server-side model adapter with structured output, schema validation, evidence-id checking,
  refusal/timeout handling that keeps the previous valid run, and labeled unavailability without credentials.
- `prototype/salesperson-test.html`: a standalone single-file version of the strategy assistant for quick
  testing in a browser (localStorage only).

## Not implemented yet (from the handoff)

- Phase 4 customer questionnaire (scoped invitation, submission, review/merge). The `assessment_answers`
  table already supports `respondent = customer`.
- Currency conversion, financing assessment, rental-yield calculator, development appraisal.
- Export of a customer/opportunity brief; data import; team roles beyond one workspace per user
  (the schema supports members and roles, the UI does not manage them yet).
- Outbound channels (email/WhatsApp), telephony, campaigns. The CRM never sends anything.
- Source retrieval over the full Drive library; method cards cover the nine reviewed sources.

## Open decisions (see `docs/handoff/CLAUDE_PROJECT_HANDOFF.md` §14)

Solo vs team ownership, property jurisdictions and currencies, CRM interface languages, final pipeline
definition of "Won", data import, live availability, outbound channels, questionnaire sharing.
Assumptions taken here: one workspace per user; four currencies offered by default; English UI with
Turkish/English customer drafts; model provider Anthropic behind the adapter; the first commitment step
is a reservation (`COMMITMENT_STEP` in playbooks.ts); follow-up times default to Europe/Istanbul
(`WORKSPACE_TIMEZONE`).

## Verification status

- Two adversarial review rounds (honesty guard, veteran closer, code reviewer) were run on the revision.
  The 42 first-round findings (fabricated scarcity in the default close, invented "what changed" in
  win-back, refused units re-pitched, Turkish amounts split, internal labels spoken to customers, and
  others) and the 37 second-round findings (won/lost/paused deals read as close-ready, an undated price
  note sold as news, a sold unit pitched with a "0 EUR" gap, price-final offering a non-existent
  alternative, the stage ladder swallowing sourced lever asks, the model guard leaving a pitch behind a
  stop, and others) are fixed and covered by tests.
- `npm test`: 103 unit tests pass. The engine tests cover handoff acceptance scenarios 3–9, 12, 17, 19–22
  plus close readiness levels, the stage ladder, negotiation paths, all 23 objections, silence and
  cadence, pause and lost handling, sourced deadlines and scarcity, placeholder filling and Turkish
  output; the adapter tests cover the model-result guard (stop pin, close-now downgrade, floor and room
  removal in English and Turkish number forms, expired or unsourced dates, forbidden phrases).
- `npm run typecheck`, `npm run lint`, `npm run build` pass.
- End-to-end against a live Supabase project and a live model key has **not** been run by the author;
  do that on your own project before real customer use. Backup/export and archive/delete behavior are
  not yet defined.
