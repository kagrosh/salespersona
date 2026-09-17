import Link from "next/link";
import { Card, DateText, DaysAgo, Empty, PageHeader, StageBadge } from "@/components/ui";
import { labelOf, LOST_REASONS, OBJECTIONS, PIPELINE_LABELS, PIPELINE_STAGES } from "@/domain/vocabulary";
import { requireSession } from "@/lib/auth";
import { daysSince, truncate } from "@/lib/form";
import type { OpportunityRow } from "@/lib/types";

type Row = OpportunityRow & { customers: { full_name: string } | null };
const STALL_DAYS = 5;
const ACTIVE = new Set(["new", "discovery", "qualified", "shortlist", "visit", "negotiation"]);

export default async function OpportunitiesPage(props: PageProps<"/opportunities">) {
  const { supabase, workspaceId } = await requireSession();
  const sp = await props.searchParams;
  const stage = typeof sp.stage === "string" ? sp.stage : "";
  const sort = sp.sort === "updated" ? "updated" : "contact";
  let q = supabase.from("opportunities").select("*, customers(full_name)").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(300);
  if (stage) q = q.eq("stage", stage);
  const [{ data }, acts, tasks, runs] = await Promise.all([
    q,
    supabase.from("activities").select("opportunity_id, occurred_at").eq("workspace_id", workspaceId).not("opportunity_id", "is", null).order("occurred_at", { ascending: false }).limit(5000),
    supabase.from("tasks").select("opportunity_id, due_at, action").eq("workspace_id", workspaceId).eq("state", "open").not("opportunity_id", "is", null).order("due_at", { ascending: true, nullsFirst: false }),
    // Only the ask of each latest non-failed run is needed; PostgREST JSON path selection keeps the payload small.
    supabase.from("strategy_runs").select("opportunity_id, created_at, ask:result->nextMove->>customerCommitment").eq("workspace_id", workspaceId).neq("status", "failed").order("created_at", { ascending: false }).limit(2000),
  ]);
  const rows = (data ?? []) as Row[];
  const now = new Date().getTime();
  const lastActivity = new Map<string, string>();
  for (const a of (acts.data ?? []) as { opportunity_id: string; occurred_at: string }[]) if (!lastActivity.has(a.opportunity_id)) lastActivity.set(a.opportunity_id, a.occurred_at);
  const nextTask = new Map<string, { due_at: string | null; action: string }>();
  for (const t of (tasks.data ?? []) as { opportunity_id: string; due_at: string | null; action: string }[]) if (!nextTask.has(t.opportunity_id)) nextTask.set(t.opportunity_id, t);
  const ask = new Map<string, string>();
  for (const r of (runs.data ?? []) as unknown as { opportunity_id: string; ask: string | null }[]) if (!ask.has(r.opportunity_id) && r.ask) ask.set(r.opportunity_id, r.ask);
  const days = (o: Row) => daysSince(lastActivity.get(o.id) ?? null, now);
  const sorted = sort === "updated" ? rows : [...rows].sort((a, b) => (days(b) ?? 99999) - (days(a) ?? 99999));

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.stage, (counts.get(r.stage) ?? 0) + 1);
  const chip = (href: string, active: boolean, label: string) => <Link href={href} className={`rounded-md px-3 py-1 ${active ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}>{label}</Link>;
  const sortQs = sort === "updated" ? "&sort=updated" : "";

  return (
    <>
      <PageHeader title="Opportunities" subtitle={sort === "contact" ? "Sorted oldest contact first, so drifting deals come up top." : "Sorted by last update."} actions={<><Link href={`/opportunities?${stage ? `stage=${stage}&` : ""}sort=${sort === "contact" ? "updated" : "contact"}`} className="btn-secondary">Sort: {sort === "contact" ? "oldest contact" : "last updated"}</Link><Link href="/opportunities/new" className="btn">New opportunity</Link></>} />
      <div className="mb-4 flex flex-wrap gap-1 text-sm">
        {chip(`/opportunities?x=1${sortQs}`, !stage, "All (incl. won/lost)")}
        {PIPELINE_STAGES.map((s) => chip(`/opportunities?stage=${s}${sortQs}`, stage === s, `${PIPELINE_LABELS[s]}${!stage && counts.get(s) ? ` (${counts.get(s)})` : ""}`))}
      </div>
      <Card>
        {sorted.length === 0 ? <Empty>No opportunities{stage ? " in this stage" : ""}.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-neutral-500"><tr><th className="py-1">Opportunity</th><th>Customer</th><th>Stage</th><th>Last contact</th><th>Next task</th><th>Current ask</th><th>Blocker / outcome</th></tr></thead>
              <tbody className="divide-y divide-neutral-100 align-top">
                {sorted.map((o) => {
                  const t = nextTask.get(o.id);
                  const active = ACTIVE.has(o.stage);
                  const overdue = t?.due_at && new Date(t.due_at).getTime() < now;
                  return (
                    <tr key={o.id}>
                      <td className="py-2"><Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">{o.title}</Link><div className="text-xs text-neutral-500">{o.track} · {o.readiness}</div></td>
                      <td><Link href={`/customers/${o.customer_id}`} className="hover:underline">{o.customers?.full_name}</Link></td>
                      <td><StageBadge stage={o.stage} /></td>
                      <td><DaysAgo days={days(o)} warnAfter={active ? STALL_DAYS : 10_000} never="never" /></td>
                      <td>{t ? <span className={overdue ? "font-medium text-red-700" : ""}>{truncate(t.action, 40)} · <DateText value={t.due_at} />{overdue ? " · overdue" : ""}</span> : active ? <span className="font-medium text-red-700">none</span> : <span className="text-neutral-400">—</span>}</td>
                      <td className="max-w-xs text-neutral-700">{ask.get(o.id) ? truncate(ask.get(o.id), 90) : <span className="text-neutral-400">no run yet</span>}</td>
                      <td className="text-xs text-neutral-600">
                        {o.stage === "lost" ? <>{labelOf(LOST_REASONS, o.lost_reason)}{o.revisit_at ? ` · revisit ${o.revisit_at}` : ""}{o.refusal_scope === "contact" ? " · do not contact" : ""}</> : o.stage === "paused" ? <>paused until {o.paused_until ?? "?"}</> : o.current_objection ? labelOf(OBJECTIONS, o.current_objection) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
