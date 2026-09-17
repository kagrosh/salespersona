import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Session = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
  workspaceId: string;
  workspaceName: string;
  displayName: string;
};

/**
 * Resolves the signed-in user and their workspace. Every Server Action and page must call this;
 * RLS enforces the boundary in the database, this just resolves the workspace to write into.
 */
export async function requireSession(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, display_name, workspaces(name)")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    // The auth trigger creates a workspace on signup; if it is missing the migration was not applied.
    throw new Error("No workspace membership found for this user. Apply supabase/migrations/0001_init.sql and sign up again.");
  }
  const ws = membership.workspaces as unknown as { name: string } | { name: string }[] | null;
  const workspaceName = Array.isArray(ws) ? ws[0]?.name : ws?.name;
  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    workspaceId: membership.workspace_id,
    workspaceName: workspaceName ?? "Workspace",
    displayName: membership.display_name ?? user.email ?? "You",
  };
}
