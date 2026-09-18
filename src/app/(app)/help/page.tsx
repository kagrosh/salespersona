import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { modelConfigured } from "@/lib/env";

const STEPS = [
  {
    title: "Add the customer",
    href: "/customers/new",
    action: "New customer",
    body: "Name, contact details and the preferred language for drafts. Market, language and logistics are separate fields on purpose: none of them is guessed from the other.",
  },
  {
    title: "Add the project and its units",
    href: "/projects/new",
    action: "New project",
    body: "The development or land, then each unit or plot with its price, currency, other costs and availability. Leave a cost blank when you do not know it. The app never treats blank as zero.",
  },
  {
    title: "Open an opportunity",
    href: "/opportunities/new",
    action: "New opportunity",
    body: "One opportunity is one customer considering one deal. Attach the unit or plot on the table, record the stated budget, and set the readiness, funding status and current objection.",
  },
  {
    title: "Record what the customer said and did",
    href: "/opportunities",
    action: "Opportunities",
    body: "After every call or visit add an activity. Keep the customer's own words, what you observed and your interpretation in their separate fields. Answer the assessment questions as the customer answered them.",
  },
  {
    title: "Generate the strategy",
    href: "/opportunities",
    action: "Opportunities",
    body: "Save your changes, then press Generate. You get one primary ask, a customer-ready draft, ranked angles, objection responses, a fallback and what to do after each possible reply.",
  },
  {
    title: "Act, then record the outcome",
    href: "/tasks",
    action: "Tasks",
    body: "Copy the draft into your own channel and send it yourself. Save the ask as a task so it appears on Today. After the conversation, record the attempt and what the customer answered, so a failed angle is never repeated.",
  },
];

const READINESS = [
  ["Close now", "Every check is on file. Ask for the commitment step today."],
  ["Close, conditional", "The customer is ready but a check is still missing. Run the check, then ask conditionally."],
  ["Trial close", "No objection is stated. Test whether they would proceed."],
  ["Advance one rung", "Ask for the next concrete step, not the signature yet."],
  ["Stopped", "An explicit pause or refusal is on file. Only the arranged follow-up applies."],
];

const RESULT_PARTS = [
  ["The ask", "The single sentence to say or send now. It is shown in the customer's language with a translation underneath."],
  ["Do", "What you do before or after the ask, who owns it and when it is due."],
  ["Checks and contact context", "What is still missing before a close, qualification gaps, last contact and cadence."],
  ["Customer-ready draft", "A message you can copy. Review it, then send it from your own phone or email. The app sends nothing."],
  ["Angles", "Ranked approaches with wording, the question that tests each one, and when to avoid it."],
  ["Objection responses", "One response per stated objection. Each ends in an ask."],
  ["Fallback", "What to switch to if the primary move stalls."],
  ["Response branches", "If the customer says X, then do Y and say Z. Also when to stop or re-check."],
  ["What to verify", "Only the facts that would change this recommendation, each with a task."],
];

const RULES = [
  "No invented deadlines, scarcity, returns, testimonials or approvals. A deadline is used only when its source is recorded and the unit was checked recently.",
  "The seller's authorized negotiation room is never written into customer text. It stays in the internal negotiation section.",
  "A stated budget is not confirmed funding. Money is compared only when currency and scope match.",
  "A marketed use is not a documented permitted use. An ongoing home is not a completed one.",
  "A pause or refusal is respected. A lost deal is re-contacted only after a recorded change dated after the loss, or on the agreed revisit date.",
  "Nothing about a customer is inferred from nationality.",
  "Generating a strategy or a draft never sends a message, reserves a unit, takes payment or marks a deal as won. You do every action yourself.",
  "There are no confidence scores or closing probabilities. Everything shown is derived from what you recorded.",
];

const FAQ = [
  ["The strategy says stale. Why?", "You changed something the strategy depends on after it was generated: a price, a budget, an objection, a stage. Press Generate again."],
  ["Why is there no Create account button?", "Sign-up is by invitation. Your administrator adds accounts in the database dashboard and shares the login details with you."],
  ["Why is the AI button disabled?", "Full-case analysis needs a server-side model key. Without it the app runs the rule engine only and labels every result as rule-based. The rules cover the whole workflow."],
  ["Why does it keep asking for a source?", "A deadline, a count of remaining units or a price change is used in customer text only when you record where it came from. Without a source it is not said."],
  ["Where do I see everything for one customer?", "Open Customers, then the customer. Every opportunity, activity and task for that person is listed there."],
  ["Can I use it on my phone?", "Yes. Every screen works at phone width. Sections fold so the ask and the draft stay at the top."],
];

export default async function HelpPage() {
  await requireSession();
  const ai = modelConfigured();
  return (
    <>
      <PageHeader title="How to use Salesperson" subtitle="A five-minute guide to the workflow, how to read a strategy, and what the app will never do." />

      <Card title="The workflow" className="mb-4">
        <ol className="grid gap-4 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="group-number" aria-hidden="true">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-neutral-700">{s.body}</p>
                <Link href={s.href} className="mt-2 inline-block text-sm underline">{s.action}</Link>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Your day" className="mb-4">
          <p className="text-sm text-neutral-700">
            Start on <Link href="/" className="underline">Today</Link>. It lists overdue follow-ups, tasks due today, stalled deals with no activity for five days, re-contact dates that are coming up, and quotes about to expire. Work top to bottom.
          </p>
          <p className="mt-3 text-sm text-neutral-700">
            Open a deal from any list to land on its strategy. If it says stale, regenerate. Copy the ask or the draft, act, then add an activity and a task before you leave the page.
          </p>
          <p className="mt-3 text-sm text-neutral-700">
            Fields marked <span className="key-tag">key</span> drive the strategy most. Fill those first. Every other field refines the answer and can wait until you know it.
          </p>
        </Card>

        <Card title="Reading the readiness badge" className="mb-4">
          <dl className="text-sm">
            {READINESS.map(([k, v]) => (
              <div key={k} className="border-b border-neutral-100 py-2 last:border-0">
                <dt className="font-semibold">{k}</dt>
                <dd className="text-neutral-700">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card title="What each part of a strategy means" className="mb-4">
        <dl className="grid gap-x-6 text-sm md:grid-cols-2">
          {RESULT_PARTS.map(([k, v]) => (
            <div key={k} className="border-b border-neutral-100 py-2">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-neutral-700">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-neutral-500">
          Every strategy is labeled rule-based{ai ? " or AI-analyzed" : ""}. Both follow the same rules below. Method sources support an approach. They never verify a price, a permission or an availability.
        </p>
      </Card>

      <Card title="What the app will never do" className="mb-4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {RULES.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <p className="mt-3 text-sm text-neutral-700">These are not settings. The rule engine enforces them, so a strategy that breaks one cannot be produced.</p>
      </Card>

      <Card title="Questions people ask" className="mb-4">
        {FAQ.map(([q, a]) => (
          <details key={q} className="border-b border-neutral-100 py-2 last:border-0">
            <summary className="cursor-pointer font-medium">{q}</summary>
            <p className="mt-1 text-sm text-neutral-700">{a}</p>
          </details>
        ))}
      </Card>
    </>
  );
}
