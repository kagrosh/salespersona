import Link from "next/link";
import { notFound } from "next/navigation";
import { StrategyView } from "@/components/strategy-view";
import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import type { StrategyRunRow } from "@/lib/types";

/** A single immutable strategy run, kept so the salesperson can see what earlier advice was based on. Read-only: act from the opportunity page. */
export default async function RunPage(props: PageProps<"/opportunities/[id]/runs/[runId]">) {
  const { id, runId } = await props.params;
  const { supabase, workspaceId } = await requireSession();
  const { data } = await supabase.from("strategy_runs").select("*").eq("id", runId).eq("opportunity_id", id).eq("workspace_id", workspaceId).maybeSingle();
  if (!data) notFound();
  const run = data as StrategyRunRow;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Strategy run (historical)" subtitle={<><Link href={`/opportunities/${id}`} className="underline">Back to opportunity</Link> · created {new Date(run.created_at).toLocaleString("en-GB")} · this run may be stale; act from the current strategy on the opportunity page</>} />
      <Card>
        <StrategyView run={run} opportunityId={id} compact />
      </Card>
    </div>
  );
}
