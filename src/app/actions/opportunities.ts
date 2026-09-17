"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CO_DECIDER_STATUS, LOST_REASONS, OBJECTIONS, PIPELINE_STAGES, QUESTION_ORDER, REFUSAL_SCOPES } from "@/domain/vocabulary";
import { requireSession } from "@/lib/auth";
import { dateOrNull, errorMessage, list, localToIso, money, oneOf, opt, positiveDecimalOrNull, str } from "@/lib/form";
import type { LostReason, RefusalScope } from "@/lib/types";

const TRACKS = ["home", "land"] as const;
const FUNDING = ["unknown", "stated", "confirmed", "financing"] as const;
const READINESS = ["unknown", "exploring", "evaluating", "ready", "paused", "refused"] as const;
const NEGOTIATION = ["unknown", "yes", "no"] as const;
const OPTION_STATUS = ["candidate", "preferred", "rejected", "unavailable"] as const;
const SCOPES = ["purchase_total", "price_only", "deposit", "borrowing_capacity", "development_total", "ongoing_affordability", "unknown"] as const;
const FIRMNESS = ["firm", "flexible", "unknown"] as const;
const ACTIVITY_TYPES = ["call", "meeting", "visit", "message", "quotation", "note", "questionnaire", "customer_response", "draft_sent"] as const;
const ASK_RESPONSE = ["pending", "yes", "no", "partial"] as const;
const YES_NO_UNKNOWN = ["unknown", "yes", "no"] as const;
const CO_DECIDER = CO_DECIDER_STATUS.map((o) => o.key) as [string, ...string[]];
const LOST = LOST_REASONS.map((o) => o.key) as LostReason[];
const REFUSAL = REFUSAL_SCOPES.map((o) => o.key) as RefusalScope[];
const OBJECTION_KEYS = new Set(OBJECTIONS.map((o) => o.key));

const fail = (path: string, e: unknown): never => redirect(`${path}?error=${encodeURIComponent(errorMessage(e))}`);

type Db = Awaited<ReturnType<typeof requireSession>>["supabase"];

/**
 * Foreign-key ids arrive from forms. RLS only checks the inserted row's workspace and Postgres FK checks bypass RLS,
 * so an id from another workspace would be accepted and the case page would later crash on a missing row.
 * Verify ownership first and fail with a clear message instead.
 */
async function assertCustomerInWorkspace(supabase: Db, workspaceId: string, customerId: string): Promise<void> {
  if (!customerId) throw new Error("Choose a customer.");
  const { data } = await supabase.from("customers").select("id").eq("id", customerId).eq("workspace_id", workspaceId).maybeSingle();
  if (!data) throw new Error("Customer not found in this workspace.");
}

async function assertInventoryItemInWorkspace(supabase: Db, workspaceId: string, inventoryItemId: string): Promise<void> {
  if (!inventoryItemId) throw new Error("Choose a unit or plot.");
  const { data } = await supabase.from("inventory_items").select("id").eq("id", inventoryItemId).eq("workspace_id", workspaceId).maybeSingle();
  if (!data) throw new Error("Unit/plot not found in this workspace.");
}

export async function createOpportunity(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const customerId = str(fd, "customer_id");
  let id: string;
  try {
    const title = str(fd, "title");
    await assertCustomerInWorkspace(supabase, workspaceId, customerId);
    if (!title) throw new Error("Title is required.");
    const { data, error } = await supabase
      .from("opportunities")
      .insert({ workspace_id: workspaceId, customer_id: customerId, owner_id: userId, title, track: oneOf(fd, "track", TRACKS, "home"), target_timing: opt(fd, "target_timing"), desired_outcome: opt(fd, "desired_outcome") })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
    await supabase.from("stage_history").insert({ workspace_id: workspaceId, opportunity_id: id, from_stage: null, to_stage: "new", changed_by: userId });
  } catch (e) {
    fail(`/opportunities/new`, e);
  }
  revalidatePath("/opportunities");
  redirect(`/opportunities/${id!}`);
}

/** Deal context: readiness, funding, current objection, resolved objections, participants. Negotiation fields live in updateNegotiation. */
export async function updateOpportunityContext(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const id = str(fd, "id");
  try {
    const objection = opt(fd, "current_objection");
    if (objection && !OBJECTION_KEYS.has(objection)) throw new Error("Unknown objection key.");
    const resolved = list(fd, "resolved_objections").filter((k) => OBJECTION_KEYS.has(k) && k !== objection);
    const { error } = await supabase
      .from("opportunities")
      .update({
        title: str(fd, "title") || undefined,
        track: oneOf(fd, "track", TRACKS, "home"),
        funding_status: oneOf(fd, "funding_status", FUNDING, "unknown"),
        readiness: oneOf(fd, "readiness", READINESS, "unknown"),
        current_objection: objection,
        resolved_objections: resolved,
        decision_participants: opt(fd, "decision_participants"),
        desired_outcome: opt(fd, "desired_outcome"),
        target_timing: opt(fd, "target_timing"),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
  } catch (e) {
    fail(`/opportunities/${id}`, e);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}?saved=1#context`);
}

/** Qualification core: the facts a closer needs before proposing a close. Nothing here is inferred. */
export async function updateQualification(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const id = str(fd, "id");
  try {
    const { error } = await supabase
      .from("opportunities")
      .update({
        target_decision_date: dateOrNull(fd, "target_decision_date", "Target decision date"),
        why_now: opt(fd, "why_now"),
        must_haves: opt(fd, "must_haves"),
        nice_to_haves: opt(fd, "nice_to_haves"),
        competing_options: opt(fd, "competing_options"),
        proceed_condition: opt(fd, "proceed_condition"),
        co_decider_status: oneOf(fd, "co_decider_status", CO_DECIDER, "unknown"),
        will_visit_before_deciding: oneOf(fd, "will_visit_before_deciding", YES_NO_UNKNOWN, "unknown"),
        funding_source: opt(fd, "funding_source"),
        funding_timing: opt(fd, "funding_timing"),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
  } catch (e) {
    fail(`/opportunities/${id}`, e);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}?saved=1#qualification`);
}

/** Negotiation position: the customer's counter-offer and what the seller authorized in writing. Never a place for invented concessions. */
export async function updateNegotiation(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const id = str(fd, "id");
  try {
    const counter = money(fd, "counter_offer", "Counter-offer");
    const counterCurrency = opt(fd, "counter_offer_currency");
    if (counter != null && !counterCurrency) throw new Error("Currency is required with a counter-offer.");
    const authorized = money(fd, "authorized_room", "Authorized room");
    if (authorized != null && str(fd, "authorized_in_writing") !== "1") throw new Error("Authorized room must be confirmed in writing by the seller before it is recorded; tick the confirmation or leave the amount blank.");
    const { error } = await supabase
      .from("opportunities")
      .update({
        negotiation_room: oneOf(fd, "negotiation_room", NEGOTIATION, "unknown"),
        counter_offer_minor: counter,
        counter_offer_currency: counter != null ? counterCurrency : null,
        authorized_room_minor: authorized,
        authorized_terms: opt(fd, "authorized_terms"),
        concessions_given: opt(fd, "concessions_given"),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
  } catch (e) {
    fail(`/opportunities/${id}`, e);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}?saved=1#negotiation`);
}

/**
 * Stage change with the outcome facts a closer needs:
 * - lost requires a structured reason, refusal scope, contact preference, revisit condition (and a revisit date unless contact was refused);
 * - paused requires paused_until and creates the "Re-contact as agreed" task on that date, owned by the current user;
 * - leaving paused/lost for an active stage resets a paused/refused readiness to evaluating and clears paused_until;
 * - refusal_scope, revisit_at and lost_reason are cleared whenever the deal leaves either stop stage for an active stage, and
 *   when it moves lost → paused (stage_history keeps the record), so a leftover refusal scope or revisit date cannot keep
 *   filtering a live deal or re-engage it;
 * - moving to lost with readiness "ready" resets readiness to evaluating (a lost deal is never close-ready);
 * - refusal_scope = contact also sets readiness = refused.
 */
export async function changeStage(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const id = str(fd, "id");
  try {
    const to = oneOf(fd, "stage", PIPELINE_STAGES, "new");
    const reason = opt(fd, "reason");
    if ((to === "lost" || to === "paused") && !reason) throw new Error(`A reason is required when moving to ${to}.`);
    const { data: current } = await supabase.from("opportunities").select("stage, readiness, customer_id, paused_until").eq("id", id).eq("workspace_id", workspaceId).single();
    if (!current) throw new Error("Opportunity not found.");

    const update: Record<string, unknown> = { stage: to, stage_reason: reason };

    if (to === "paused") {
      const pausedUntil = dateOrNull(fd, "paused_until", "Paused until");
      if (!pausedUntil) throw new Error("Paused until (the customer's agreed re-contact date) is required when pausing.");
      update.paused_until = pausedUntil;
      update.readiness = "paused";
    } else {
      update.paused_until = null;
    }

    if (to === "lost") {
      const lostReason = opt(fd, "lost_reason");
      if (!lostReason || !LOST.includes(lostReason as LostReason)) throw new Error("Lost reason is required.");
      const refusalScope = oneOf(fd, "refusal_scope", REFUSAL, "none");
      const contactPreference = opt(fd, "contact_preference");
      const revisitCondition = opt(fd, "revisit_condition");
      const revisitAt = dateOrNull(fd, "revisit_at", "Revisit date");
      if (!contactPreference) throw new Error("Contact preference (the customer's words on how/when to contact them, or 'do not contact') is required when marking lost.");
      if (!revisitCondition) throw new Error("Revisit condition (what would have to change, in the customer's words) is required when marking lost.");
      if (!revisitAt && refusalScope !== "contact") throw new Error("Revisit date is required unless the customer asked not to be contacted.");
      update.lost_reason = lostReason;
      update.refusal_scope = refusalScope;
      update.contact_preference = contactPreference;
      update.revisit_condition = revisitCondition;
      update.revisit_at = revisitAt;
      if (refusalScope === "contact") update.readiness = "refused";
      // A deal that just went lost cannot stay "ready": the engine would otherwise still read it as close-ready.
      else if (current.readiness === "ready") update.readiness = "evaluating";
    }

    const fromStop = current.stage === "paused" || current.stage === "lost";
    const leavingStop = fromStop && to !== "paused" && to !== "lost";
    if (leavingStop && (current.readiness === "paused" || current.readiness === "refused")) update.readiness = "evaluating";
    // A re-opened deal is a salesperson decision (e.g. the customer came back); the earlier refusal scope, revisit date and
    // lost reason no longer describe the state, whether the deal left lost directly or via paused. The same applies when a
    // lost deal is moved to paused. The loss itself stays on record in stage_history.
    if (leavingStop || (current.stage === "lost" && to === "paused")) {
      update.refusal_scope = "none";
      update.revisit_at = null;
      update.lost_reason = null;
    }

    const { error } = await supabase.from("opportunities").update(update).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    if (current.stage !== to) {
      await supabase.from("stage_history").insert({ workspace_id: workspaceId, opportunity_id: id, from_stage: current.stage ?? null, to_stage: to, reason, changed_by: userId });
    }

    if (to === "paused" && update.paused_until && update.paused_until !== current.paused_until) {
      const { error: taskErr } = await supabase.from("tasks").insert({
        workspace_id: workspaceId,
        opportunity_id: id,
        customer_id: current.customer_id,
        owner_id: userId,
        action: "Re-contact as agreed",
        purpose: `Customer asked to pause until ${update.paused_until}. Ask whether they want to resume; no new pitch unless they do.`,
        due_at: localToIso(String(update.paused_until)),
      });
      if (taskErr) throw taskErr;
    }
  } catch (e) {
    fail(`/opportunities/${id}`, e);
  }
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
  revalidatePath("/tasks");
  redirect(`/opportunities/${id}?saved=1#stage`);
}

export async function addOption(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const id = str(fd, "opportunity_id");
  try {
    const inventoryItemId = str(fd, "inventory_item_id");
    await assertInventoryItemInWorkspace(supabase, workspaceId, inventoryItemId);
    const quoted_currency = opt(fd, "quoted_currency");
    const quoted_price_minor = money(fd, "quoted_price", "Quoted price");
    if (quoted_price_minor != null && !quoted_currency) throw new Error("Currency is required with a quoted price.");
    const quote_valid_until = dateOrNull(fd, "quote_valid_until", "Quote valid until");
    const terms_source = opt(fd, "terms_source");
    if (quote_valid_until && !terms_source) throw new Error("A validity date needs its source (written offer, price list…). A deadline without a source is not usable.");
    const { error } = await supabase.from("opportunity_options").insert({
      workspace_id: workspaceId,
      opportunity_id: id,
      inventory_item_id: inventoryItemId,
      status: oneOf(fd, "status", OPTION_STATUS, "candidate"),
      quoted_price_minor,
      quoted_currency,
      quoted_costs_minor: money(fd, "quoted_costs", "Quoted costs"),
      quote_valid_until,
      terms_source,
      notes: opt(fd, "notes"),
    });
    if (error) throw error;
  } catch (e) {
    fail(`/opportunities/${id}`, e);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}?saved=1#options`);
}

export async function setOptionStatus(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const id = str(fd, "opportunity_id");
  const status = oneOf(fd, "status", OPTION_STATUS, "candidate");
  try {
    if (status === "preferred") {
      await supabase.from("opportunity_options").update({ status: "candidate" }).eq("opportunity_id", id).eq("status", "preferred");
    }
    const { error } = await supabase.from("opportunity_options").update({ status }).eq("id", str(fd, "option_id")).eq("workspace_id", workspaceId);
    if (error) throw error;
  } catch (e) {
    fail(`/opportunities/${id}`, e);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}#options`);
}

export async function addBudget(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const id = str(fd, "opportunity_id");
  try {
    const amount_minor = money(fd, "amount", "Budget amount");
    if (amount_minor == null) throw new Error("Budget amount is required.");
    const amount_max_minor = money(fd, "amount_max", "Upper amount");
    if (amount_max_minor != null && amount_max_minor < amount_minor) throw new Error("Upper amount must be at least the amount.");
    const currency = str(fd, "currency") || "EUR";
    const fx_rate = positiveDecimalOrNull(fd, "fx_rate", "Exchange rate");
    const fx_to_currency = opt(fd, "fx_to_currency");
    const fx_rate_date = dateOrNull(fd, "fx_rate_date", "Rate date");
    const fx_source = opt(fd, "fx_source");
    if (fx_rate != null || fx_to_currency || fx_rate_date || fx_source) {
      if (fx_rate == null || !fx_to_currency || !fx_rate_date || !fx_source) throw new Error("An exchange-rate observation needs rate, target currency, date and source together.");
      if (fx_to_currency === currency) throw new Error("Exchange-rate target currency must differ from the budget currency.");
    }
    const { error } = await supabase.from("budget_contexts").insert({
      workspace_id: workspaceId,
      opportunity_id: id,
      amount_minor,
      amount_max_minor,
      currency,
      scope: oneOf(fd, "scope", SCOPES, "unknown"),
      firmness: oneOf(fd, "firmness", FIRMNESS, "unknown"),
      source: opt(fd, "source"),
      note: opt(fd, "note"),
      fx_rate,
      fx_to_currency: fx_rate != null ? fx_to_currency : null,
      fx_rate_date: fx_rate != null ? fx_rate_date : null,
      fx_source: fx_rate != null ? fx_source : null,
    });
    if (error) throw error;
  } catch (e) {
    fail(`/opportunities/${id}`, e);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}?saved=1#budget`);
}

export async function addActivity(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const id = str(fd, "opportunity_id");
  try {
    const customerId = str(fd, "customer_id");
    await assertCustomerInWorkspace(supabase, workspaceId, customerId);
    const narrative = opt(fd, "narrative");
    const direct_quote = opt(fd, "direct_quote");
    const observation = opt(fd, "observation");
    const interpretation = opt(fd, "interpretation");
    const behaviors = list(fd, "behaviors");
    const ask_made = opt(fd, "ask_made");
    if (!narrative && !direct_quote && !observation && !interpretation && behaviors.length === 0 && !ask_made) throw new Error("Record at least one of: what happened, a quote, an observation, a behavior or the ask you made.");
    const occurred = opt(fd, "occurred_at");
    const type = oneOf(fd, "type", ACTIVITY_TYPES, "note");
    if (type === "draft_sent" && !narrative) throw new Error("A draft_sent activity needs the text that was sent in 'What happened'.");
    const { error } = await supabase.from("activities").insert({
      workspace_id: workspaceId,
      opportunity_id: id,
      customer_id: customerId,
      occurred_at: occurred ? localToIso(occurred) : new Date().toISOString(),
      type,
      author_id: userId,
      narrative,
      direct_quote,
      observation,
      interpretation,
      behaviors,
      ask_made,
      ask_response: ask_made ? oneOf(fd, "ask_response", ASK_RESPONSE, "pending") : null,
    });
    if (error) throw error;
  } catch (e) {
    fail(`/opportunities/${id}`, e);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}?saved=1#activity`);
}

/** Saves changed assessment answers. Each change inserts a new row and supersedes the previous one (history preserved). */
export async function saveAnswers(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const id = str(fd, "opportunity_id");
  try {
    const customerId = str(fd, "customer_id");
    await assertCustomerInWorkspace(supabase, workspaceId, customerId);
    const { data: existing } = await supabase.from("assessment_answers").select("id, question_key, answer_key").eq("opportunity_id", id).is("superseded_by", null);
    for (const key of QUESTION_ORDER) {
      const value = opt(fd, `q_${key}`);
      const prev = existing?.find((a) => a.question_key === key);
      if ((prev?.answer_key ?? null) === value) continue;
      const { data: inserted, error } = await supabase
        .from("assessment_answers")
        .insert({ workspace_id: workspaceId, customer_id: customerId, opportunity_id: id, question_key: key, answer_key: value, respondent: "salesperson", source: "opportunity workspace" })
        .select("id")
        .single();
      if (error) throw error;
      if (prev) await supabase.from("assessment_answers").update({ superseded_by: inserted.id }).eq("id", prev.id);
    }
  } catch (e) {
    fail(`/opportunities/${id}`, e);
  }
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}?saved=1#assessment`);
}
