"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOC_STATUS } from "@/domain/vocabulary";
import { requireSession } from "@/lib/auth";
import { dateOrNull, errorMessage, intOrNull, money, oneOf, opt, str } from "@/lib/form";
import type { DocStatus } from "@/lib/types";

const TRACKS = ["home", "land"] as const;
const AVAIL = ["available", "reserved", "sold", "unknown"] as const;
const EVIDENCE_STATUS = ["supplied", "unverified", "verified", "disputed", "expired"] as const;
const DOC = DOC_STATUS.map((o) => o.key) as DocStatus[];

function projectInput(fd: FormData) {
  const name = str(fd, "name");
  if (!name) throw new Error("Project name is required.");
  const documented_permitted_use = opt(fd, "documented_permitted_use");
  const documented_milestones = opt(fd, "documented_milestones");
  const permitted_use_status = oneOf(fd, "permitted_use_status", DOC, "undocumented");
  const milestones_status = oneOf(fd, "milestones_status", DOC, "undocumented");
  if (permitted_use_status === "documented" && !documented_permitted_use) throw new Error("Permitted use marked as documented needs the documented text (what the document on file says).");
  if (milestones_status === "documented" && !documented_milestones) throw new Error("Milestones marked as documented need the documented text.");
  return {
    name,
    track: oneOf(fd, "track", TRACKS, "home"),
    category: opt(fd, "category"),
    stage: opt(fd, "stage"),
    location: opt(fd, "location"),
    jurisdiction: opt(fd, "jurisdiction"),
    developer: opt(fd, "developer"),
    description: opt(fd, "description"),
    selling_points: opt(fd, "selling_points"),
    limitations: opt(fd, "limitations"),
    marketed_use: opt(fd, "marketed_use"),
    documented_permitted_use,
    permitted_use_status,
    delivery_claims: opt(fd, "delivery_claims"),
    documented_milestones,
    milestones_status,
  };
}

export async function createProject(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  let id: string;
  try {
    const { data, error } = await supabase.from("projects").insert({ ...projectInput(fd), workspace_id: workspaceId }).select("id").single();
    if (error) throw error;
    id = data.id;
  } catch (e) {
    redirect("/projects/new?error=" + encodeURIComponent(errorMessage(e)));
  }
  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}

export async function updateProject(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const id = str(fd, "id");
  try {
    const { error } = await supabase.from("projects").update(projectInput(fd)).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
  } catch (e) {
    redirect(`/projects/${id}?error=` + encodeURIComponent(errorMessage(e)));
  }
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}?saved=1`);
}

function inventoryInput(fd: FormData) {
  const reference = str(fd, "reference");
  if (!reference) throw new Error("Unit/plot reference is required.");
  const currency = opt(fd, "currency");
  const asking_price_minor = money(fd, "asking_price", "Asking price");
  if (asking_price_minor != null && !currency) throw new Error("Currency is required when a price is entered.");
  const availability_count = intOrNull(fd, "availability_count", "Availability count");
  const availability_source = opt(fd, "availability_source");
  if (availability_count != null && !availability_source) throw new Error("An availability count needs its source (who confirmed it and when); a count without a source is not usable.");
  const price_valid_until = dateOrNull(fd, "price_valid_until", "Price valid until");
  const price_change_note = opt(fd, "price_change_note");
  const source = opt(fd, "source");
  if ((price_valid_until || price_change_note) && !source) throw new Error("Price validity / price change notes need the source of price and availability filled in.");
  return {
    reference,
    category: opt(fd, "category"),
    characteristics: opt(fd, "characteristics"),
    asking_price_minor,
    currency,
    other_costs_minor: money(fd, "other_costs", "Other costs"), // blank = unknown
    availability: oneOf(fd, "availability", AVAIL, "unknown"),
    source,
    // Only a check that actually happened touches checked_at: an ordinary edit (a note, a typo fix) must not wipe the last
    // verification date, and a posted timestamp is never accepted (it could backdate a check). Inserts default to NULL.
    ...(str(fd, "checked_now") === "1" ? { checked_at: new Date().toISOString() } : {}),
    price_valid_until,
    price_change_note,
    availability_count,
    availability_source,
    stage_payment_note: opt(fd, "stage_payment_note"),
  };
}

export async function addInventoryItem(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const projectId = str(fd, "project_id");
  try {
    const { error } = await supabase.from("inventory_items").insert({ ...inventoryInput(fd), project_id: projectId, workspace_id: workspaceId });
    if (error) throw error;
  } catch (e) {
    redirect(`/projects/${projectId}?error=` + encodeURIComponent(errorMessage(e)));
  }
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?saved=1#inventory`);
}

export async function updateInventoryItem(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const projectId = str(fd, "project_id");
  const id = str(fd, "id");
  try {
    const { error } = await supabase.from("inventory_items").update(inventoryInput(fd)).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
  } catch (e) {
    redirect(`/projects/${projectId}?error=` + encodeURIComponent(errorMessage(e)));
  }
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?saved=1#inventory`);
}

export async function addEvidence(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  const projectId = str(fd, "project_id");
  try {
    const statement = str(fd, "statement");
    if (!statement) throw new Error("Statement is required.");
    const { error } = await supabase.from("evidence_claims").insert({
      workspace_id: workspaceId,
      project_id: projectId,
      inventory_item_id: opt(fd, "inventory_item_id"),
      statement,
      source: opt(fd, "source"),
      source_date: dateOrNull(fd, "source_date", "Source date"),
      status: oneOf(fd, "status", EVIDENCE_STATUS, "supplied"),
      recorded_by: userId,
    });
    if (error) throw error;
  } catch (e) {
    redirect(`/projects/${projectId}?error=` + encodeURIComponent(errorMessage(e)));
  }
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?saved=1#evidence`);
}

export async function setEvidenceStatus(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const projectId = str(fd, "project_id");
  const { error } = await supabase.from("evidence_claims").update({ status: oneOf(fd, "status", EVIDENCE_STATUS, "unverified") }).eq("id", str(fd, "id")).eq("workspace_id", workspaceId);
  if (error) redirect(`/projects/${projectId}?error=` + encodeURIComponent(error.message));
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}#evidence`);
}
