export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).");
  }
  return { url, key };
}

/**
 * Emails allowed to create an account through the app. Empty (unset) = open sign-up.
 * When set, the Create-account tab is hidden and the sign-up action rejects every other address.
 * Accounts added from the Supabase dashboard (Authentication → Users) are unaffected.
 */
export function signupAllowlist(): string[] {
  return (process.env.SIGNUP_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function modelConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
