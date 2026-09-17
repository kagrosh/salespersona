import Link from "next/link";
import { Card, DateText, Empty, Field, PageHeader } from "@/components/ui";
import { completeTask, createTask } from "@/app/actions/tasks";
import { requireSession } from "@/lib/auth";
import { localInputValue } from "@/lib/form";
import type { TaskRow } from "@/lib/types";

type Joined = TaskRow & { opportunities: { title: string } | null; customers: { full_name: string } | null };

export default async function TasksPage(props: PageProps<"/tasks">) {
  const sp = await props.searchParams;
  const { supabase, workspaceId } = await requireSession();
  const showDone = sp.done === "1";
  const { data } = await supabase.from("tasks").select("*, opportunities(title), customers(full_name)").eq("workspace_id", workspaceId).eq("state", showDone ? "done" : "open").order("due_at", { ascending: true, nullsFirst: false }).limit(200);
  const rows = (data ?? []) as Joined[];
  const now = new Date().getTime();

  return (
    <>
      <PageHeader title="Follow-up tasks" subtitle="Your own reminders; never customer-facing deadlines." actions={<Link href={showDone ? "/tasks" : "/tasks?done=1"} className="btn-secondary">{showDone ? "Show open" : "Show completed"}</Link>} />
      {typeof sp.error === "string" && <div className="note-bad mb-3">{sp.error}</div>}
      <Card id="tasks">
        {rows.length === 0 ? <Empty>No {showDone ? "completed" : "open"} tasks.</Empty> : (
          <ul className="divide-y divide-neutral-100 text-sm">
            {rows.map((t) => {
              const overdue = !showDone && t.due_at && new Date(t.due_at).getTime() < now;
              return (
                <li key={t.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{t.action}</div>
                      {t.purpose && <div className="text-neutral-600">{t.purpose}</div>}
                      <div className="text-xs text-neutral-500">
                        {t.opportunities && <Link href={`/opportunities/${t.opportunity_id}`} className="underline">{t.opportunities.title}</Link>}
                        {t.customers && <> · {t.customers.full_name}</>}
                        {t.outcome && <> · outcome: {t.outcome}</>}
                      </div>
                    </div>
                    <div className={`text-sm ${overdue ? "font-medium text-red-700" : ""}`}><DateText value={t.due_at} withTime />{overdue && " · overdue"}</div>
                  </div>
                  {!showDone && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-neutral-600">Mark done (next step required)</summary>
                      <form action={completeTask} className="mt-1 grid gap-2 sm:grid-cols-4">
                        <input type="hidden" name="id" value={t.id} /><input type="hidden" name="back" value="/tasks" />
                        <Field label="Outcome" className="sm:col-span-2"><input name="outcome" className="input" placeholder="What happened" /></Field>
                        <Field label="Next step" className="sm:col-span-2"><input name="next_action" className="input" placeholder="The next concrete action" /></Field>
                        <Field label="Due"><input name="due_at" type="datetime-local" className="input" defaultValue={localInputValue(3)} /></Field>
                        <input type="hidden" name="due_days" value="3" />
                        <label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" name="deal_closed" value="1" /> No next step: deal closed (won/lost/paused)</label>
                        <div className="flex items-end"><button className="btn-secondary btn-sm" type="submit">Done</button></div>
                      </form>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {!showDone && (
        <Card title="Add a task" className="mt-4">
          <form action={createTask} className="grid gap-3 sm:grid-cols-4">
            <Field label="Action" className="sm:col-span-2"><input name="action" className="input" required /></Field>
            <Field label="Due"><input name="due_at" type="datetime-local" className="input" defaultValue={localInputValue(1)} /></Field>
            <input type="hidden" name="due_days" value="1" />
            <div className="flex items-end"><button className="btn" type="submit">Add</button></div>
          </form>
        </Card>
      )}
    </>
  );
}
