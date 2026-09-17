import { notFound } from "next/navigation";
import { ProjectFields } from "@/components/project-form";
import { Card, DateText, Empty, ErrorNote, Field, PageHeader, Select } from "@/components/ui";
import { addEvidence, addInventoryItem, setEvidenceStatus, updateInventoryItem, updateProject } from "@/app/actions/projects";
import { formatMinor, minorToDecimalString } from "@/domain/money";
import { CURRENCIES } from "@/domain/vocabulary";
import { requireSession } from "@/lib/auth";
import type { EvidenceRow, InventoryRow, ProjectRow } from "@/lib/types";

const AVAIL_OPTIONS = [
  { key: "unknown", label: "Not checked" },
  { key: "available", label: "Available (checked)" },
  { key: "reserved", label: "Reserved by another party" },
  { key: "sold", label: "Sold / unavailable" },
];
const EVIDENCE_OPTIONS = ["supplied", "unverified", "verified", "disputed", "expired"];

function InventoryFields({ item }: { item?: InventoryRow }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Reference (unit / plot)"><input name="reference" className="input" required defaultValue={item?.reference ?? ""} /></Field>
      <Field label="Category"><input name="category" className="input" defaultValue={item?.category ?? ""} /></Field>
      <Field label="Characteristics"><input name="characteristics" className="input" defaultValue={item?.characteristics ?? ""} placeholder="2+1, 95 m², sea view…" /></Field>
      <Field label="Asking price"><input name="asking_price" className="input" inputMode="decimal" defaultValue={minorToDecimalString(item?.asking_price_minor)} /></Field>
      <Field label="Currency"><Select name="currency" defaultValue={item?.currency ?? "EUR"} options={CURRENCIES} /></Field>
      <Field label="Other acquisition costs" hint="Blank = unknown (never assumed zero)."><input name="other_costs" className="input" inputMode="decimal" defaultValue={minorToDecimalString(item?.other_costs_minor)} /></Field>
      <Field label="Availability"><Select name="availability" defaultValue={item?.availability ?? "unknown"} options={AVAIL_OPTIONS} /></Field>
      <Field label="Source of price/availability"><input name="source" className="input" defaultValue={item?.source ?? ""} placeholder="Developer price list 12 Sep" /></Field>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="checked_now" value="1" /> Mark as checked now</label>
      <div className="sm:col-span-3 rounded-md border border-neutral-200 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Documented urgency evidence (used only when sourced and current; never invented)</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Price valid until" hint="Documented price-list validity."><input name="price_valid_until" type="date" className="input" defaultValue={item?.price_valid_until ?? ""} /></Field>
          <Field label="Price change note (with source)" className="sm:col-span-2" hint="e.g. 'developer list rises 3% at slab completion — price list 12 Sep'."><input name="price_change_note" className="input" defaultValue={item?.price_change_note ?? ""} /></Field>
          <Field label="Comparable units left (count)" hint="Documented count only."><input name="availability_count" className="input" inputMode="numeric" defaultValue={item?.availability_count ?? ""} /></Field>
          <Field label="Availability source (required with a count)" className="sm:col-span-2"><input name="availability_source" className="input" defaultValue={item?.availability_source ?? ""} placeholder="Seller's availability list, 14 Sep" /></Field>
          <Field label="Stage-linked payment / price milestone (documented)" className="sm:col-span-3"><input name="stage_payment_note" className="input" defaultValue={item?.stage_payment_note ?? ""} placeholder="20% at contract, 30% at roof — per payment schedule on file" /></Field>
        </div>
      </div>
    </div>
  );
}

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, workspaceId } = await requireSession();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
  if (!project) notFound();
  const p = project as ProjectRow;
  const [inv, ev] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("project_id", id).order("reference"),
    supabase.from("evidence_claims").select("*").eq("project_id", id).order("created_at", { ascending: false }),
  ]);
  const items = (inv.data ?? []) as InventoryRow[];
  const evidence = (ev.data ?? []) as EvidenceRow[];

  return (
    <>
      <PageHeader title={p.name} subtitle={<>{p.track} · {p.category ?? "category n/a"} · {p.stage ?? "stage n/a"} · {p.location ?? "location not recorded"} · permitted use: {p.permitted_use_status} · milestones: {p.milestones_status}</>} />
      <ErrorNote message={typeof sp.error === "string" ? sp.error : null} />
      {sp.saved && <div className="note-good mb-3">Saved.</div>}
      <div className="space-y-4">
        <Card title="Project facts">
          <form action={updateProject} className="space-y-4">
            <input type="hidden" name="id" value={p.id} />
            <ProjectFields p={p} />
            <button className="btn" type="submit">Save changes</button>
          </form>
        </Card>

        <Card id="inventory" title={`Units / plots (${items.length})`}>
          {items.length === 0 ? <Empty>No units or plots yet. Add the first one below.</Empty> : (
            <div className="space-y-3">
              {items.map((item) => (
                <details key={item.id} className="rounded-md border border-neutral-200 p-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium">{item.reference}</span>
                    <span>{item.asking_price_minor != null ? formatMinor(item.asking_price_minor, item.currency) : "price n/a"}</span>
                    <span className="text-neutral-500">costs: {item.other_costs_minor != null ? formatMinor(item.other_costs_minor, item.currency) : "unknown"}</span>
                    <span className={`badge ${item.availability === "available" ? "badge-good" : item.availability === "sold" ? "badge-bad" : ""}`}>{item.availability}</span>
                    {item.availability_count != null && <span className="text-xs text-neutral-500">{item.availability_count} left ({item.availability_source ?? "no source"})</span>}
                    {item.price_valid_until && <span className="text-xs text-neutral-500">price valid until {item.price_valid_until}</span>}
                    <span className="text-xs text-neutral-500">checked: <DateText value={item.checked_at} /></span>
                  </summary>
                  <form action={updateInventoryItem} className="mt-3 space-y-3">
                    <input type="hidden" name="project_id" value={p.id} />
                    <input type="hidden" name="id" value={item.id} />
                    <InventoryFields item={item} />
                    <button className="btn-secondary btn-sm" type="submit">Update unit</button>
                  </form>
                </details>
              ))}
            </div>
          )}
          <form action={addInventoryItem} className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
            <div className="text-sm font-medium">Add unit / plot</div>
            <input type="hidden" name="project_id" value={p.id} />
            <InventoryFields />
            <button className="btn" type="submit">Add</button>
          </form>
        </Card>

        <Card id="evidence" title={`Evidence and claims (${evidence.length})`}>
          <p className="mb-3 text-xs text-neutral-500">Every selling point is a supplied claim until someone verifies it. Verification requires a source and date. A sales book never verifies a project fact.</p>
          {evidence.length === 0 ? <Empty>No claims recorded.</Empty> : (
            <table className="mb-4 w-full text-sm">
              <thead className="text-left text-xs text-neutral-500"><tr><th className="py-1">Statement</th><th>Source</th><th>Date</th><th>Status</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {evidence.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2">{e.statement}</td><td>{e.source ?? "—"}</td><td><DateText value={e.source_date} /></td>
                    <td>
                      <form action={setEvidenceStatus} className="flex gap-1">
                        <input type="hidden" name="project_id" value={p.id} /><input type="hidden" name="id" value={e.id} />
                        <Select name="status" defaultValue={e.status} options={EVIDENCE_OPTIONS} />
                        <button className="btn-secondary btn-sm" type="submit">Set</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={addEvidence} className="grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="project_id" value={p.id} />
            <Field label="Statement / claim" className="sm:col-span-4"><input name="statement" className="input" required placeholder="Title deed registered in seller's name" /></Field>
            <Field label="Source"><input name="source" className="input" placeholder="Land registry extract" /></Field>
            <Field label="Source date"><input name="source_date" type="date" className="input" /></Field>
            <Field label="Status"><Select name="status" defaultValue="supplied" options={EVIDENCE_OPTIONS} /></Field>
            <Field label="Unit (optional)"><Select name="inventory_item_id" blank="Whole project" options={items.map((i) => ({ key: i.id, label: i.reference }))} /></Field>
            <div className="sm:col-span-4"><button className="btn" type="submit">Add claim</button></div>
          </form>
        </Card>
      </div>
    </>
  );
}
