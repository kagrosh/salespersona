import { ProjectFields } from "@/components/project-form";
import { Card, ErrorNote, PageHeader } from "@/components/ui";
import { createProject } from "@/app/actions/projects";

export default async function NewProjectPage(props: PageProps<"/projects/new">) {
  const sp = await props.searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New project" subtitle="Reusable project facts. Individual units/plots are added afterwards." />
      <ErrorNote message={typeof sp.error === "string" ? sp.error : null} />
      <Card>
        <form action={createProject} className="space-y-4">
          <ProjectFields />
          <button className="btn" type="submit">Save project</button>
        </form>
      </Card>
    </div>
  );
}
