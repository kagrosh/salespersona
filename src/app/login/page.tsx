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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-700 text-xl font-semibold text-white" aria-hidden="true">S</div>
      <h1 className="text-3xl font-semibold tracking-tight text-accent-950">Salesperson CRM</h1>
      <p className="mb-6 mt-2 text-sm leading-relaxed text-neutral-600">Real-estate sales strategy assistant. Sign in to your workspace.</p>
      {!configured() && (
        <div className="note-warn mb-3">
          Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code>, fill in the project URL and publishable key, apply <code>supabase/migrations/0001_init.sql</code>, then restart the dev server.
        </div>
      )}
      {error && <div className="note-bad mb-3">{error}</div>}
      {info && <div className="note-good mb-3">{info}</div>}
      <div className="card shadow-sm">
        <div className="mb-5 flex gap-2 border-b border-neutral-100 pb-4 text-sm">
          <a href="/login?mode=signin" aria-current={mode === "signin" ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 ${mode === "signin" ? "bg-accent-700 text-white" : "hover:bg-neutral-100"}`}>
            Sign in
          </a>
          {!inviteOnly && (
            <a href="/login?mode=signup" aria-current={mode === "signup" ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 ${mode === "signup" ? "bg-accent-700 text-white" : "hover:bg-neutral-100"}`}>
              Create account
            </a>
          )}
        </div>
        <form action={mode === "signup" ? signUp : signIn} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          {mode === "signup" && (
            <>
              <Field label="Your name">
                <input name="display_name" className="input" autoComplete="name" />
              </Field>
              <Field label="Workspace name" hint="For example your agency name. A personal workspace is created for you.">
                <input name="workspace_name" autoComplete="organization" className="input" />
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
