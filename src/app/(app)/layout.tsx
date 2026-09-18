import { AppNav } from "@/components/app-nav";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { signOut } from "../login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3 lg:grid-cols-[auto_1fr_auto]">
          <Link href="/" className="font-semibold tracking-tight text-accent-950">
            Salesperson
          </Link>
          <AppNav />
          <div className="col-start-2 row-start-1 ml-auto flex items-center gap-3 text-xs text-neutral-600 lg:col-start-3">
            <span className="hidden max-w-60 text-right sm:block">
              {session.displayName} · {session.workspaceName}
            </span>
            <details className="relative sm:hidden"><summary className="cursor-pointer py-2">Account</summary><div className="absolute right-0 top-full z-30 w-56 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">{session.displayName} · {session.workspaceName}</div></details>
            <form action={signOut}>
              <button className="btn-secondary btn-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
