import Link from "next/link";
import { Card, Empty, ErrorNote, Field, PageHeader, Select } from "@/components/ui";
import { createOpportunity } from "@/app/actions/opportunities";
import { requireSession } from "@/lib/auth";
import type { CustomerRow } from "@/lib/types";

export default async function NewOpportunityPage(props: PageProps<"/opportunities/new">) {
  const sp = await props.searchParams;
  const { supabase, workspaceId } = await requireSession();
  const { data } = await supabase.from("customers").select("id, full_name").eq("workspace_id", workspaceId).order("full_name");
  const customers = (data ?? []) as Pick<CustomerRow, "id" | "full_name">[];
  const preselect = typeof sp.customer === "string" ? sp.customer : "";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New opportunity" subtitle="One customer can have several opportunities; each has its own budget, options and strategy." />
      <ErrorNote message={typeof sp.error === "string" ? sp.error : null} />
      <Card>
        {customers.length === 0 ? (
          <Empty>Create a <Link href="/customers/new" className="underline">customer</Link> first.</Empty>
        ) : (
          <form action={createOpportunity} className="space-y-3">
            <Field keyField label="Customer"><Select name="customer_id" defaultValue={preselect} blank="Choose…" required options={customers.map((c) => ({ key: c.id, label: c.full_name }))} /></Field>
            <Field keyField label="Title" hint="e.g. Demir family – sea-view apartment"><input name="title" className="input" required /></Field>
            <Field keyField label="Investment track"><Select name="track" defaultValue="home" options={[{ key: "home", label: "Apartment / home" }, { key: "land", label: "Plot / land" }]} /></Field>
            <Field label="Target timing" hint="In the customer’s own words."><input name="target_timing" className="input" placeholder="Wants to decide before year end" /></Field>
            <Field label="Your desired immediate outcome"><input name="desired_outcome" className="input" placeholder="Site visit booked" /></Field>
            <button className="btn" type="submit">Create opportunity</button>
          </form>
        )}
      </Card>
    </div>
  );
}
