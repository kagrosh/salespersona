"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { errorMessage, oneOf, opt, str } from "@/lib/form";

const MARKETS = ["turkish", "international", "unknown"] as const;
const LOGISTICS = ["local", "remote", "mixed", "unknown"] as const;
const EXPERIENCE = ["first", "some", "experienced", "unknown"] as const;

function customerInput(fd: FormData) {
  const full_name = str(fd, "full_name");
  if (!full_name) throw new Error("Name is required.");
  return {
    full_name,
    email: opt(fd, "email"),
    phone: opt(fd, "phone"),
    preferred_language: str(fd, "preferred_language") || "en",
    customer_market: oneOf(fd, "customer_market", MARKETS, "unknown"),
    purchase_logistics: oneOf(fd, "purchase_logistics", LOGISTICS, "unknown"),
    investment_experience: oneOf(fd, "investment_experience", EXPERIENCE, "unknown"),
    interests: opt(fd, "interests"),
    notes: opt(fd, "notes"),
  };
}

export async function createCustomer(fd: FormData) {
  const { supabase, workspaceId, userId } = await requireSession();
  let id: string;
  try {
    const { data, error } = await supabase.from("customers").insert({ ...customerInput(fd), workspace_id: workspaceId, owner_id: userId }).select("id").single();
    if (error) throw error;
    id = data.id;
  } catch (e) {
    redirect("/customers/new?error=" + encodeURIComponent(errorMessage(e)));
  }
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export async function updateCustomer(fd: FormData) {
  const { supabase, workspaceId } = await requireSession();
  const id = str(fd, "id");
  try {
    const { error } = await supabase.from("customers").update(customerInput(fd)).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
  } catch (e) {
    redirect(`/customers/${id}?error=` + encodeURIComponent(errorMessage(e)));
  }
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}?saved=1`);
}
