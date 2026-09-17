"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ENGINE_VERSION, generateStrategy } from "@/domain/strategy/engine";
import { PLAYBOOKS } from "@/domain/strategy/playbooks";
import type { StrategyResult } from "@/domain/strategy/types";
import { getProvider, ProviderRefusal } from "@/lib/ai/adapter";
import { requireSession } from "@/lib/auth";
import { buildSnapshot, loadCase } from "@/lib/case-assembler";
import { dueFromForm, errorMessage, oneOf, opt, str } from "@/lib/form";

const RESULTS = ["advanced", "objection", "delayed", "failed", "unknown"] as const;
const LOG_TYPES = ["call", "message", "meeting", "visit"] as const;

/** Rule-based run. Always available; labeled as rules in the saved record. */
export async function generateRules(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const id = str(fd, "opportunity_id");
  try {
    const loaded = await loadCase(supabase, id);
    if (!loaded) throw new Error("Opportunity not found.");
    const snapshot = buildSnapshot(loaded);
    const result = generateStrategy(snapshot);
    const { error } = await supabase.from("strategy_runs").insert({
      workspace_id: workspaceId,
      opportunity_id: id,
      created_by: userId,
      generation_mode: "rules",
      engine_version: ENGINE_VERSION,
      input_snapshot: snapshot,
      result,
      status: "valid",
      latest_activity_id: snapshot.latestActivityId,
    });
    if (error) throw error;
  } catch (e) {
    redirect(`/opportunities/${id}?error=${encodeURIComponent(errorMessage(e))}#strategy`);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}#strategy`);
}

/** Full-case model run through the server-side adapter. Failure keeps the previous valid run and records a failed run row. */
export async function generateWithModel(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const id = str(fd, "opportunity_id");
  let message: string | null = null;
  try {
    const provider = await getProvider();
    if (!provider) throw new Error("AI analysis is not configured (ANTHROPIC_API_KEY missing). Rule-based strategy remains available.");
    const loaded = await loadCase(supabase, id);
    if (!loaded) throw new Error("Opportunity not found.");
    const snapshot = buildSnapshot(loaded);
    try {
      const out = await provider.generate(snapshot);
      const { error } = await supabase.from("strategy_runs").insert({
        workspace_id: workspaceId,
        opportunity_id: id,
        created_by: userId,
        generation_mode: "model",
        engine_version: ENGINE_VERSION,
        model_id: out.modelId,
        prompt_version: out.promptVersion,
        input_snapshot: snapshot,
        result: out.result,
        status: "valid",
        latest_activity_id: snapshot.latestActivityId,
      });
      if (error) throw error;
    } catch (inner) {
      // Record the failure without touching earlier valid runs; the UI keeps showing the last valid one.
      const msg = inner instanceof ProviderRefusal ? inner.message : errorMessage(inner);
      await supabase.from("strategy_runs").insert({
        workspace_id: workspaceId,
        opportunity_id: id,
        created_by: userId,
        generation_mode: "model",
        engine_version: ENGINE_VERSION,
        model_id: process.env.STRATEGY_MODEL || null,
        input_snapshot: snapshot,
        result: null,
        status: "failed",
        error: msg,
        latest_activity_id: snapshot.latestActivityId,
      });
      message = `Model analysis failed: ${msg}`;
    }
  } catch (e) {
    message = errorMessage(e);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(message ? `/opportunities/${id}?error=${encodeURIComponent(message)}#strategy` : `/opportunities/${id}#strategy`);
}

type RunLookup = { result: StrategyResult; customerId: string | null };

async function loadRun(supabase: Awaited<ReturnType<typeof requireSession>>["supabase"], workspaceId: string, runId: string): Promise<RunLookup> {
  const { data: run } = await supabase.from("strategy_runs").select("result, opportunities(customer_id)").eq("id", runId).eq("workspace_id", workspaceId).single();
  const result = run?.result as StrategyResult | null;
  if (!result) throw new Error("Run has no result.");
  const customer = run?.opportunities as unknown as { customer_id: string } | { customer_id: string }[] | null;
  const customerId = Array.isArray(customer) ? (customer[0]?.customer_id ?? null) : (customer?.customer_id ?? null);
  return { result, customerId };
}

/**
 * Turns the recommended next move (or the fallback) of a run into a saved task. Nothing is sent to the customer.
 * A due time is always set: the form's datetime, else the run's `dueInDays` (0 = today) at 10:00 in the assumed workspace time zone.
 */
export async function taskFromRun(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const id = str(fd, "opportunity_id");
  try {
    const runId = str(fd, "run_id");
    const which = str(fd, "which") === "fallback" ? "fallback" : "next";
    const { result, customerId } = await loadRun(supabase, workspaceId, runId);
    const fallbackDays = Number.isFinite(result.nextMove.dueInDays) ? Math.max(0, result.nextMove.dueInDays) : 1;
    const due = dueFromForm(fd, fallbackDays);
    const action = which === "fallback" ? result.fallback.action : result.nextMove.action;
    const purpose = which === "fallback" ? `Fallback. Ask: ${result.fallback.customerAsk}` : `${result.nextMove.purpose} Ask: ${result.nextMove.customerCommitment}`;
    const { error } = await supabase.from("tasks").insert({ workspace_id: workspaceId, opportunity_id: id, customer_id: customerId, owner_id: userId, action, purpose, due_at: due, source_run_id: runId });
    if (error) throw error;
  } catch (e) {
    redirect(`/opportunities/${id}?error=${encodeURIComponent(errorMessage(e))}#strategy`);
  }
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/tasks");
  redirect(`/opportunities/${id}?saved=1#tasks`);
}

/**
 * Records that the salesperson sent the run's customer draft through their own channel. The CRM sends nothing itself.
 * Creates an activity of type `draft_sent` whose narrative is the draft text, with the ask recorded and its response pending.
 */
export async function markDraftSent(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const id = str(fd, "opportunity_id");
  try {
    const runId = str(fd, "run_id");
    const { result, customerId } = await loadRun(supabase, workspaceId, runId);
    if (!customerId) throw new Error("Opportunity has no customer.");
    const text = result.customerDraft.text?.trim();
    if (!text) throw new Error("This run has no customer draft to mark as sent.");
    const { error } = await supabase.from("activities").insert({
      workspace_id: workspaceId,
      opportunity_id: id,
      customer_id: customerId,
      occurred_at: new Date().toISOString(),
      type: "draft_sent",
      author_id: userId,
      narrative: text,
      ask_made: result.nextMove.customerCommitment || null,
      ask_response: "pending",
      behaviors: [],
    });
    if (error) throw error;
  } catch (e) {
    redirect(`/opportunities/${id}?error=${encodeURIComponent(errorMessage(e))}#strategy`);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}?saved=1#activity`);
}

/** Maps the salesperson's classification of an attempt to the recorded answer to the ask. A delay is a non-answer, not a no. */
function askResponseFor(result: (typeof RESULTS)[number]): "pending" | "yes" | "no" | "partial" {
  if (result === "advanced") return "yes";
  if (result === "objection" || result === "failed") return "no";
  return "pending";
}

/**
 * Records that an angle was actually used and how the customer responded. This is the evidence base; nothing "learns" automatically.
 * With "also log as activity" ticked, the wording used becomes a call/message activity so the next snapshot sees the touch and the ask.
 */
export async function recordAttempt(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const id = str(fd, "opportunity_id");
  let result: (typeof RESULTS)[number] = "unknown";
  try {
    const angleId = str(fd, "angle_id");
    if (!angleId) throw new Error("Angle is required.");
    const runId = opt(fd, "run_id");
    result = oneOf(fd, "result", RESULTS, "unknown");
    const wording = opt(fd, "wording_used");
    const customerResponse = opt(fd, "customer_response");

    let angleTitle = opt(fd, "angle_title");
    let askMade: string | null = null;
    let customerId: string | null = opt(fd, "customer_id");
    if (runId) {
      try {
        const run = await loadRun(supabase, workspaceId, runId);
        const angle = run.result.angles.find((a) => a.id === angleId);
        angleTitle = angleTitle ?? angle?.title ?? null;
        askMade = angle?.directAsk ?? run.result.nextMove.customerCommitment ?? null;
        customerId = customerId ?? run.customerId;
      } catch {
        // A missing run must not block recording the attempt.
      }
    }
    angleTitle = angleTitle ?? (angleId === "primary_move" ? "Primary move" : PLAYBOOKS[angleId]?.title) ?? angleId;

    const { error } = await supabase.from("strategy_attempts").insert({
      workspace_id: workspaceId,
      opportunity_id: id,
      strategy_run_id: runId,
      angle_id: angleId,
      angle_title: angleTitle,
      wording_used: wording,
      customer_response: customerResponse,
      result,
      created_by: userId,
    });
    if (error) throw error;

    if (str(fd, "log_activity") === "1") {
      if (!customerId) {
        const { data: opp } = await supabase.from("opportunities").select("customer_id").eq("id", id).eq("workspace_id", workspaceId).single();
        customerId = opp?.customer_id ?? null;
      }
      if (!customerId) throw new Error("Attempt recorded, but the activity could not be logged: opportunity has no customer.");
      const { error: actErr } = await supabase.from("activities").insert({
        workspace_id: workspaceId,
        opportunity_id: id,
        customer_id: customerId,
        occurred_at: new Date().toISOString(),
        type: oneOf(fd, "activity_type", LOG_TYPES, "call"),
        author_id: userId,
        narrative: wording ?? `Tried angle: ${angleTitle}`,
        observation: customerResponse ? `Customer response (as recorded by the salesperson): ${customerResponse}` : null,
        behaviors: [],
        ask_made: askMade,
        ask_response: askResponseFor(result),
      });
      if (actErr) throw actErr;
    }
  } catch (e) {
    redirect(`/opportunities/${id}?error=${encodeURIComponent(errorMessage(e))}#strategy`);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(result === "advanced" ? `/opportunities/${id}?saved=1&advanced=1#stage` : `/opportunities/${id}?saved=1#attempts`);
}
