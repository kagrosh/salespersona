import { Field } from "@/components/ui";
import { signupAllowlist } from "@/lib/env";
import { signIn, signUp } from "./actions";

function configured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const inviteOnly = signupAllowlist().length > 0;
  const mode = sp.mode === "signup" && !inviteOnly ? "signup" : "signin";
  const error = typeof sp.error === "string" ? sp.error : null;
  const info = typeof sp.info === "string" ? sp.info : null;
  const rawNext = typeof sp.next === "string" ? sp.next : "/";
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/"; // same-origin path only; a protocol-relative "//host" is never echoed

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold">Salesperson CRM</h1>
      <p className="mb-6 text-sm text-neutral-500">Real-estate sales strategy assistant. Sign in to your workspace.</p>
      {!configured() && (
        <div className="note-warn mb-3">
          Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code>, fill in the project URL and publishable key, apply <code>supabase/migrations/0001_init.sql</code>, then restart the dev server.
        </div>
      )}
      {error && <div className="note-bad mb-3">{error}</div>}
      {info && <div className="note-good mb-3">{info}</div>}
      <div className="card">
        <div className="mb-4 flex gap-2 text-sm">
          <a href="/login?mode=signin" className={`rounded-md px-3 py-1 ${mode === "signin" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}>
            Sign in
          </a>
          {!inviteOnly && (
            <a href="/login?mode=signup" className={`rounded-md px-3 py-1 ${mode === "signup" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}>
              Create account
            </a>
          )}
        </div>
        <form action={mode === "signup" ? signUp : signIn} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          {mode === "signup" && (
            <>
              <Field label="Your name">
                <input name="display_name" className="input" autoComplete="name" />
              </Field>
              <Field label="Workspace name" hint="For example your agency name. A personal workspace is created for you.">
                <input name="workspace_name" className="input" />
              </Field>
            </>
          )}
          <Field label="Email">
            <input name="email" type="email" className="input" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <input name="password" type="password" className="input" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </Field>
          <button className="btn w-full justify-center" type="submit" disabled={!configured()}>
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
