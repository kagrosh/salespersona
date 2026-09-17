"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { dueFromForm, errorMessage, opt, str } from "@/lib/form";

/** Creates a follow-up task. A due time is always set (form value, else `due_days` at 10:00, default tomorrow) so the task surfaces on the overview. */
export async function createTask(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const opportunityId = opt(fd, "opportunity_id");
  const back = opportunityId ? `/opportunities/${opportunityId}` : "/tasks";
  try {
    const action = str(fd, "action");
    if (!action) throw new Error("Task action is required.");
    const { error } = await supabase.from("tasks").insert({
      workspace_id: workspaceId,
      opportunity_id: opportunityId,
      customer_id: opt(fd, "customer_id"),
      owner_id: userId,
      action,
      purpose: opt(fd, "purpose"),
      due_at: dueFromForm(fd, 1),
      source_run_id: opt(fd, "source_run_id"),
    });
    if (error) throw error;
  } catch (e) {
    redirect(`${back}?error=${encodeURIComponent(errorMessage(e))}`);
  }
  revalidatePath(back);
  revalidatePath("/tasks");
  redirect(`${back}?saved=1#tasks`);
}

/**
 * Completes (or cancels) a task. Completing demands the next step: either `next_action` (+ due, default +3 days) is given,
 * or `deal_closed` is ticked because the deal is won/lost/paused and must not carry a chase task.
 */
export async function completeTask(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const id = str(fd, "id");
  const back = opt(fd, "back") ?? "/tasks";
  const state = str(fd, "state") === "cancelled" ? "cancelled" : "done";
  try {
    const nextAction = opt(fd, "next_action");
    const dealClosed = str(fd, "deal_closed") === "1";
    if (state === "done" && !nextAction && !dealClosed) throw new Error("Set the next step (action + due) or tick 'deal closed / no next step'.");
    const { data: task } = await supabase.from("tasks").select("opportunity_id, customer_id, source_run_id").eq("id", id).eq("workspace_id", workspaceId).single();
    if (!task) throw new Error("Task not found.");
    const { error } = await supabase.from("tasks").update({ state, outcome: opt(fd, "outcome"), completed_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    if (state === "done" && nextAction) {
      const { error: nextErr } = await supabase.from("tasks").insert({
        workspace_id: workspaceId,
        opportunity_id: task.opportunity_id,
        customer_id: task.customer_id,
        owner_id: userId,
        action: nextAction,
        purpose: opt(fd, "next_purpose"),
        due_at: dueFromForm(fd, 3),
        source_run_id: task.source_run_id,
      });
      if (nextErr) throw nextErr;
    }
  } catch (e) {
    redirect(`${back}?error=${encodeURIComponent(errorMessage(e))}#tasks`);
  }
  revalidatePath(back);
  revalidatePath("/tasks");
  revalidatePath("/");
  redirect(`${back}#tasks`);
}
