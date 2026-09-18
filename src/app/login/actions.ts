"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { signupAllowlist } from "@/lib/env";

const Credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function back(params: Record<string, string>): never {
  redirect("/login?" + new URLSearchParams(params).toString());
}

export async function signIn(formData: FormData) {
  const parsed = Credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) back({ error: parsed.error.issues[0].message });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) back({ error: error.message });
  const next = String(formData.get("next") || "/");
  // Same-origin path only: "//evil.example" (and "/\evil.example") are protocol-relative and would leave the site right after sign-in.
  redirect(/^\/(?![/\\])/.test(next) ? next : "/");
}

export async function signUp(formData: FormData) {
  const parsed = Credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) back({ error: parsed.error.issues[0].message, mode: "signup" });
  const allowlist = signupAllowlist();
  if (allowlist.length && !allowlist.includes(parsed.data.email.toLowerCase())) {
    back({ error: "Sign-up is by invitation. Ask your administrator to add your account.", mode: "signin" });
  }
  const displayName = String(formData.get("display_name") || "").trim();
  const workspaceName = String(formData.get("workspace_name") || "").trim();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { data: { display_name: displayName || undefined, workspace_name: workspaceName || undefined } },
  });
  if (error) back({ error: error.message, mode: "signup" });
  if (data.session) redirect("/");
  back({ info: "Account created. Check your email to confirm, then sign in.", mode: "signin" });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
