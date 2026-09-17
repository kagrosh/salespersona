import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerFields } from "@/components/customer-form";
import { Card, DateText, Empty, ErrorNote, PageHeader, StageBadge } from "@/components/ui";
import { updateCustomer } from "@/app/actions/customers";
import { requireSession } from "@/lib/auth";
import type { ActivityRow, CustomerRow, OpportunityRow, TaskRow } from "@/lib/types";

export default async function CustomerPage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, workspaceId } = await requireSession();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
  if (!customer) notFound();
  const c = customer as CustomerRow;

  const [opps, acts, tasks] = await Promise.all([
    supabase.from("opportunities").select("*").eq("customer_id", id).order("updated_at", { ascending: false }),
    supabase.from("activities").select("*").eq("customer_id", id).order("occurred_at", { ascending: false }).limit(30),
    supabase.from("tasks").select("*").eq("customer_id", id).eq("state", "open").order("due_at"),
  ]);

  return (
    <>
      <PageHeader title={c.full_name} subtitle={<>{c.customer_market} · {c.preferred_language} · {c.purchase_logistics}</>} actions={<Link href={`/opportunities/new?customer=${c.id}`} className="btn">New opportunity</Link>} />
      <ErrorNote message={typeof sp.error === "string" ? sp.error : null} />
      {sp.saved && <div className="note-good mb-3">Saved.</div>}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card title="Profile">
            <form action={updateCustomer} className="space-y-4">
              <input type="hidden" name="id" value={c.id} />
              <CustomerFields c={c} />
              <button className="btn" type="submit">Save changes</button>
            </form>
          </Card>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <Card title="Opportunities">
            {(opps.data ?? []).length === 0 ? <Empty>None yet.</Empty> : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {((opps.data ?? []) as OpportunityRow[]).map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2">
                    <Link href={`/opportunities/${o.id}`} className="hover:underline">{o.title}</Link>
                    <StageBadge stage={o.stage} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Open tasks">
            {(tasks.data ?? []).length === 0 ? <Empty>None.</Empty> : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {((tasks.data ?? []) as TaskRow[]).map((t) => (
                  <li key={t.id} className="flex justify-between gap-2 py-2"><span>{t.action}</span><DateText value={t.due_at} /></li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Activity timeline">
            {(acts.data ?? []).length === 0 ? <Empty>No activity recorded.</Empty> : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {((acts.data ?? []) as ActivityRow[]).map((a) => (
                  <li key={a.id} className="py-2">
                    <div className="flex justify-between"><span className="badge">{a.type}</span><DateText value={a.occurred_at} /></div>
                    {a.narrative && <div>{a.narrative}</div>}
                    {a.direct_quote && <div className="quote">{a.direct_quote}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
