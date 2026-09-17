import Link from "next/link";
import { Card, DateText, Empty, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import type { ProjectRow } from "@/lib/types";

export default async function ProjectsPage() {
  const { supabase, workspaceId } = await requireSession();
  const { data } = await supabase.from("projects").select("*, inventory_items(count)").eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
  const rows = (data ?? []) as (ProjectRow & { inventory_items: { count: number }[] })[];
  return (
    <>
      <PageHeader title="Projects and inventory" actions={<Link href="/projects/new" className="btn">New project</Link>} />
      <Card>
        {rows.length === 0 ? <Empty>No projects yet.</Empty> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-500"><tr><th className="py-1">Project</th><th>Track</th><th>Stage</th><th>Location</th><th>Units/plots</th><th>Updated</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="py-2"><Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link><div className="text-xs text-neutral-500">{p.category}</div></td>
                  <td>{p.track}</td><td>{p.stage ?? "—"}</td><td>{p.location ?? <span className="text-neutral-400">not recorded</span>}</td><td>{p.inventory_items?.[0]?.count ?? 0}</td><td><DateText value={p.updated_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
