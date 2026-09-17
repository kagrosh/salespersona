import Link from "next/link";
import { Card, DateText, Empty, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import type { CustomerRow } from "@/lib/types";

export default async function CustomersPage(props: PageProps<"/customers">) {
  const { supabase, workspaceId } = await requireSession();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  let query = supabase.from("customers").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(100);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as CustomerRow[];

  return (
    <>
      <PageHeader title="Customers" actions={<Link href="/customers/new" className="btn">New customer</Link>} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email, phone" className="input max-w-sm" />
        <button className="btn-secondary" type="submit">Search</button>
      </form>
      <Card>
        {rows.length === 0 ? (
          <Empty>{q ? "No customers match." : "No customers yet."}</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-500">
              <tr><th className="py-1">Name</th><th>Market</th><th>Language</th><th>Logistics</th><th>Updated</th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="py-2"><Link href={`/customers/${c.id}`} className="font-medium hover:underline">{c.full_name}</Link><div className="text-xs text-neutral-500">{c.email} {c.phone}</div></td>
                  <td>{c.customer_market}</td><td>{c.preferred_language}</td><td>{c.purchase_logistics}</td><td><DateText value={c.updated_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
