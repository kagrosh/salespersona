"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "salesperson:quick-start-dismissed";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; };
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

/** One-line orientation on the opportunity page. Dismissal is remembered per browser; it never blocks anything. */
export function QuickStart() {
  // Server snapshot is "dismissed" so returning users never see a flash before hydration.
  const dismissed = useSyncExternalStore(subscribe, read, () => true);
  if (dismissed) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, "1"); } catch {} listeners.forEach((cb) => cb()); };
  return (
    <aside className="quick-start">
      <div><strong>Start with what you know.</strong> Fields marked <span className="key-tag">key</span> matter most. Save your changes, generate a strategy, then review the ask and draft. Add detail as you learn more. Full guide under <Link href="/help" className="underline">Help</Link>.</div>
      <button type="button" className="btn-secondary btn-sm shrink-0" onClick={dismiss}>Got it</button>
    </aside>
  );
}
