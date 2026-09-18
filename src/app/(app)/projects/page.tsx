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
      <PageHeader title="Projects and inventory" subtitle="Find a project, check its facts, and review the available units or plots." actions={<Link href="/projects/new" className="btn">New project</Link>} />
      <Card>
        {rows.length === 0 ? <Empty>No projects yet. <Link href="/projects/new" className="underline">Add a project</Link>, then record its units or plots and evidence.</Empty> : (
          <table className="responsive-table w-full text-sm">
            <thead className="text-left text-xs text-neutral-500"><tr><th scope="col" className="py-1">Project</th><th scope="col">Track</th><th scope="col">Stage</th><th scope="col">Location</th><th scope="col">Units/plots</th><th scope="col">Updated</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td data-label="Project" className="py-2"><Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link><div className="text-xs text-neutral-500">{p.category}</div></td>
                  <td data-label="Track">{p.track}</td><td data-label="Stage">{p.stage ?? "—"}</td><td data-label="Location">{p.location ?? <span className="text-neutral-400">not recorded</span>}</td><td data-label="Units / plots">{p.inventory_items?.[0]?.count ?? 0}</td><td data-label="Updated"><DateText value={p.updated_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
