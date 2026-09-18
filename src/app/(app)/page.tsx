import Link from "next/link";
import { Card, DateText, DaysAgo, Empty, PageHeader, StageBadge } from "@/components/ui";
import { labelOf, LOST_REASONS } from "@/domain/vocabulary";
import { requireSession } from "@/lib/auth";
import { dateFromNow, daysSince, todayLocal, truncate } from "@/lib/form";
import type { ActivityRow, OpportunityRow, TaskRow } from "@/lib/types";

type TaskJoined = TaskRow & { opportunities: { title: string } | null; customers: { full_name: string } | null };
type OppJoined = OpportunityRow & { customers: { full_name: string } | null };
type ActJoined = ActivityRow & { customers: { full_name: string } | null; opportunities: { title: string } | null };
type OptRow = { opportunity_id: string; quote_valid_until: string | null; terms_source: string | null; status: string; inventory_items: { reference: string; price_valid_until: string | null } | { reference: string; price_valid_until: string | null }[] | null };

const STALL_DAYS = 5;
const ACTIVE = new Set(["new", "discovery", "qualified", "shortlist", "visit", "negotiation"]);

function TaskList({ rows }: { rows: TaskJoined[] }) {
  return rows.length === 0 ? (
    <Empty>No follow-ups in this group. <Link href="/tasks" className="underline">Review all tasks</Link>.</Empty>
  ) : (
    <ul className="divide-y divide-neutral-100 text-sm">
      {rows.map((t) => (
        <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
          <div>
            <div>{t.action}</div>
            <div className="text-xs text-neutral-500">
              {t.opportunities ? <Link href={`/opportunities/${t.opportunity_id}`} className="underline">{t.opportunities.title}</Link> : t.customers?.full_name}
            </div>
          </div>
          <DateText value={t.due_at} withTime />
        </li>
      ))}
    </ul>
  );
}

function OppLine({ o, children }: { o: OppJoined; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span>
        <Link href={`/opportunities/${o.id}#strategy`} className="font-medium hover:underline">{o.title}</Link>
        <span className="text-neutral-500"> · {o.customers?.full_name}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">{children}<StageBadge stage={o.stage} /></span>
    </li>
  );
}

export default async function OverviewPage() {
  const { supabase, workspaceId } = await requireSession();
  const now = new Date();
  const nowIso = now.toISOString();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const today = todayLocal();
  const soon = dateFromNow(3);
  const week = dateFromNow(7);

  const [overdue, dueToday, opps, acts, openTasks, options, recent, runs, customers] = await Promise.all([
    supabase.from("tasks").select("*, opportunities(title), customers(full_name)").eq("workspace_id", workspaceId).eq("state", "open").lt("due_at", nowIso).order("due_at").limit(20),
    supabase.from("tasks").select("*, opportunities(title), customers(full_name)").eq("workspace_id", workspaceId).eq("state", "open").gte("due_at", nowIso).lte("due_at", endOfToday.toISOString()).order("due_at").limit(20),
    supabase.from("opportunities").select("*, customers(full_name)").eq("workspace_id", workspaceId).neq("stage", "won").order("updated_at", { ascending: false }).limit(500),
    supabase.from("activities").select("opportunity_id, occurred_at").eq("workspace_id", workspaceId).not("opportunity_id", "is", null).order("occurred_at", { ascending: false }).limit(5000),
    supabase.from("tasks").select("opportunity_id, due_at, action").eq("workspace_id", workspaceId).eq("state", "open").not("opportunity_id", "is", null),
    supabase.from("opportunity_options").select("opportunity_id, quote_valid_until, terms_source, status, inventory_items(reference, price_valid_until)").eq("workspace_id", workspaceId).in("status", ["candidate", "preferred"]),
    supabase.from("activities").select("*, customers(full_name), opportunities(title)").eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }).limit(10),
    supabase.from("strategy_runs").select("id, opportunity_id, status, created_at").eq("workspace_id", workspaceId).neq("status", "failed").order("created_at", { ascending: false }).limit(2000),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);
  const isEmptyWorkspace = (customers.count ?? 0) === 0 && (opps.data ?? []).length === 0;

  const rows = (opps.data ?? []) as OppJoined[];
  // Latest activity per opportunity (rows arrive newest-first, so the first hit wins). No SQL group-by needed.
  const lastActivity = new Map<string, string>();
  for (const a of (acts.data ?? []) as { opportunity_id: string; occurred_at: string }[]) if (!lastActivity.has(a.opportunity_id)) lastActivity.set(a.opportunity_id, a.occurred_at);
  const openByOpp = new Map<string, { due_at: string | null; action: string }[]>();
  for (const t of (openTasks.data ?? []) as { opportunity_id: string; due_at: string | null; action: string }[]) openByOpp.set(t.opportunity_id, [...(openByOpp.get(t.opportunity_id) ?? []), t]);
  const days = (o: OppJoined) => daysSince(lastActivity.get(o.id) ?? null, now.getTime());

  const active = rows.filter((o) => ACTIVE.has(o.stage));
  const stalled = active.filter((o) => { const d = days(o); return d == null || d >= STALL_DAYS; }).sort((a, b) => (days(b) ?? 9999) - (days(a) ?? 9999));
  const noNextStep = active.filter((o) => !(openByOpp.get(o.id)?.length));
  const recontact = rows
    .map((o) => ({ o, date: o.stage === "paused" ? o.paused_until : o.stage === "lost" && o.refusal_scope !== "contact" ? o.revisit_at : null }))
    .filter((x): x is { o: OppJoined; date: string } => Boolean(x.date) && (x.date as string) <= soon)
    .sort((a, b) => a.date.localeCompare(b.date));
  const winback = rows.filter((o) => o.stage === "lost" && o.refusal_scope !== "contact").sort((a, b) => (a.revisit_at ?? "9999").localeCompare(b.revisit_at ?? "9999"));

  const byId = new Map(rows.map((o) => [o.id, o]));
  const expiring: { o: OppJoined; what: string; date: string; source: string | null }[] = [];
  for (const op of (options.data ?? []) as OptRow[]) {
    const o = byId.get(op.opportunity_id);
    if (!o || !ACTIVE.has(o.stage)) continue;
    const inv = Array.isArray(op.inventory_items) ? op.inventory_items[0] : op.inventory_items;
    if (op.quote_valid_until && op.quote_valid_until >= today && op.quote_valid_until <= week) expiring.push({ o, what: `quote for ${inv?.reference ?? "option"}`, date: op.quote_valid_until, source: op.terms_source });
    if (inv?.price_valid_until && inv.price_valid_until >= today && inv.price_valid_until <= week) expiring.push({ o, what: `price list for ${inv.reference}`, date: inv.price_valid_until, source: "inventory price list" });
  }
  expiring.sort((a, b) => a.date.localeCompare(b.date));
  const activeSorted = [...active].sort((a, b) => (days(b) ?? 99999) - (days(a) ?? 99999));

  const latestRuns = new Map<string, { id: string; opportunity_id: string; status: string; created_at: string }>();
  for (const run of runs.data ?? []) if (!latestRuns.has(run.opportunity_id)) latestRuns.set(run.opportunity_id, run);
  const currentStrategies = active.filter((o) => latestRuns.get(o.id)?.status === "valid");

  return (
    <>
      <PageHeader title="Today" subtitle="Follow-ups first. Derived from recorded dates only; no scores." actions={<Link href="/opportunities/new" className="btn">New opportunity</Link>} />
      {isEmptyWorkspace && (
        <Card title="Welcome. Three steps to your first strategy" className="mb-6">
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { n: 1, t: "Add a customer", d: "Name, contact and preferred language.", href: "/customers/new", a: "New customer" },
              { n: 2, t: "Add a project and a unit", d: "Price, currency, costs and availability.", href: "/projects/new", a: "New project" },
              { n: 3, t: "Open an opportunity", d: "Attach the unit, record the budget, generate.", href: "/opportunities/new", a: "New opportunity" },
            ].map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="group-number" aria-hidden="true">{s.n}</span>
                <span className="min-w-0"><span className="block font-semibold">{s.t}</span><span className="block text-sm text-neutral-700">{s.d}</span><Link href={s.href} className="mt-1 inline-block text-sm underline">{s.a}</Link></span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-neutral-700">The full guide, including how to read a strategy and what the app will never do, is under <Link href="/help" className="underline">Help</Link>.</p>
        </Card>
      )}
      <nav aria-label="Today sections" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[{id:"overdue",label:"Overdue",count:overdue.data?.length ?? 0},{id:"due-today",label:"Due today",count:dueToday.data?.length ?? 0},{id:"stalled",label:"Stalled",count:stalled.length},{id:"current-strategies",label:"Current strategies",count:currentStrategies.length}].map((item) => <a key={item.id} href={`#${item.id}`} className="card hover:border-accent-600"><span className="block text-2xl font-semibold">{item.count}</span><span className="mt-1 block text-sm text-neutral-600">{item.label}</span></a>)}
      </nav>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card id="overdue" title={`Overdue follow-ups (${overdue.data?.length ?? 0})`}>
          <TaskList rows={(overdue.data ?? []) as TaskJoined[]} />
        </Card>
        <Card id="due-today" title={`Due today (${dueToday.data?.length ?? 0})`}>
          <TaskList rows={(dueToday.data ?? []) as TaskJoined[]} />
        </Card>
        <Card id="stalled" title={`Stalled deals (${stalled.length}) — no activity for ${STALL_DAYS}+ days`}>
          {stalled.length === 0 ? <Empty>Every active deal was touched in the last {STALL_DAYS} days.</Empty> : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {stalled.slice(0, 20).map((o) => (
                <OppLine key={o.id} o={o}>
                  <DaysAgo days={days(o)} warnAfter={STALL_DAYS} never="never contacted" />
                  <Link href={`/opportunities/${o.id}#strategy`} className="underline">open the ask</Link>
                </OppLine>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`No next step (${noNextStep.length}) — active, no open task`}>
          {noNextStep.length === 0 ? <Empty>Every active deal has an open task.</Empty> : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {noNextStep.slice(0, 20).map((o) => (
                <OppLine key={o.id} o={o}>
                  <span className="font-medium text-red-700">no task</span>
                  <Link href={`/opportunities/${o.id}#strategy`} className="underline">save the ask as a task</Link>
                </OppLine>
              ))}
            </ul>
          )}
        </Card>
        <Card id="current-strategies" title={`Current strategies (${currentStrategies.length})`}>
          <p className="mb-3 text-xs text-neutral-600">Latest non-failed runs marked current. Review the recorded inputs before using a draft.</p>
          {currentStrategies.length === 0 ? <Empty>No current strategy on an active deal. <Link href="/opportunities" className="underline">Open an opportunity</Link> and generate one.</Empty> : (
            <ul className="divide-y divide-neutral-100 text-sm">{currentStrategies.map((o) => <OppLine key={o.id} o={o}><span className="badge badge-good">current</span><DateText value={latestRuns.get(o.id)?.created_at} withTime /><Link href={`/opportunities/${o.id}#strategy`} className="underline">Review the ask</Link></OppLine>)}</ul>
          )}
        </Card>
        <Card title={`Re-contact due (${recontact.length}) — agreed dates within 3 days`}>
          {recontact.length === 0 ? <Empty>No paused or lost deal reaches its agreed date in the next 3 days.</Empty> : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {recontact.map(({ o, date }) => (
                <OppLine key={o.id} o={o}>
                  <span className={date < today ? "font-medium text-red-700" : ""}>{date < today ? `was due ${date}` : `due ${date}`}</span>
                  {o.stage === "lost" && <span>{labelOf(LOST_REASONS, o.lost_reason)}</span>}
                </OppLine>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-neutral-500">These are the customer&apos;s own agreed dates. Before them, nothing prompts contact.</p>
        </Card>
        <Card title={`Expiring terms (${expiring.length}) — documented validity within 7 days`}>
          {expiring.length === 0 ? <Empty>No documented quote or price-list validity ends this week.</Empty> : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {expiring.map((x, i) => (
                <OppLine key={`${x.o.id}-${i}`} o={x.o}>
                  <span>{x.what} valid until <strong>{x.date}</strong>{x.source ? ` (${x.source})` : <span className="text-red-700"> (no source — not usable as a deadline)</span>}</span>
                </OppLine>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-neutral-500">State the documented date and its source neutrally; never as a pressure line.</p>
        </Card>
        <Card title={`Win-back list (${winback.length}) — lost, contact allowed`}>
          {winback.length === 0 ? <Empty>No lost deals open to re-contact.</Empty> : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {winback.slice(0, 20).map((o) => (
                <li key={o.id} className="py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span><Link href={`/opportunities/${o.id}#strategy`} className="font-medium hover:underline">{o.title}</Link><span className="text-neutral-500"> · {o.customers?.full_name}</span></span>
                    <span className="text-xs text-neutral-600">{labelOf(LOST_REASONS, o.lost_reason)} · revisit {o.revisit_at ?? "no date"}</span>
                  </div>
                  {o.revisit_condition && <div className="text-xs text-neutral-500">Re-open when: {truncate(o.revisit_condition, 120)}</div>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-neutral-500">A win-back needs a recorded change that addresses the lost reason, or the customer&apos;s own revisit date. Refusals of contact never appear here.</p>
        </Card>
        <Card title={`Active opportunities (${activeSorted.length}) — oldest contact first`}>
          {activeSorted.length === 0 ? (
            <Empty>
              No opportunities yet. <Link href="/customers/new" className="underline">Create a customer</Link> to start.
            </Empty>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {activeSorted.slice(0, 25).map((o) => {
                const next = (openByOpp.get(o.id) ?? []).sort((a, b) => (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999"))[0];
                return (
                  <OppLine key={o.id} o={o}>
                    <DaysAgo days={days(o)} warnAfter={STALL_DAYS} never="never" />
                    <span>{next ? <>next: {truncate(next.action, 40)} <DateText value={next.due_at} /></> : <span className="font-medium text-red-700">no next step</span>}</span>
                  </OppLine>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="Recent activity">
          {(recent.data ?? []).length === 0 ? (
            <Empty>No activity recorded.</Empty>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {((recent.data ?? []) as ActJoined[]).map((a) => (
                <li key={a.id} className="py-2">
                  <div className="flex justify-between gap-2">
                    <span>
                      <span className="badge mr-1">{a.type}</span>
                      {a.opportunities ? <Link href={`/opportunities/${a.opportunity_id}`} className="hover:underline">{a.opportunities.title}</Link> : a.customers?.full_name}
                    </span>
                    <DateText value={a.occurred_at} />
                  </div>
                  {a.narrative && <div className="text-neutral-600">{truncate(a.narrative, 160)}</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
