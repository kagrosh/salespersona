"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Only disclosure, anchor navigation and live form counts need client behavior. */
export function Collapsible({ title, subtitle, children, open = false, id, summaryExtra, className = "", countFields = false, countLabel = "Form" }: {
  title: string; subtitle?: string; children: ReactNode; open?: boolean; id?: string;
  summaryExtra?: ReactNode; className?: string; countFields?: boolean; countLabel?: string;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const count = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    const root = details.current;
    if (!root) return;
    const revealAnchor = () => {
      let target: HTMLElement | null = null;
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
      if (target && root.contains(target)) {
        root.open = true;
        for (let parent = target.parentElement; parent; parent = parent.parentElement) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
        }
        target.scrollIntoView({ block: "start" });
      }
    };
    const updateCount = (event?: Event) => {
      if (!count.current) return;
      const fields = new Map<string, boolean>();
      for (const control of root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input[name], select[name], textarea[name]")) {
        if (control.type === "hidden" || control.disabled) continue;
        const key = `${Array.from(root.querySelectorAll('form')).indexOf(control.form!)}:${control.name}`;
        const isChoice = control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio");
        const filled = isChoice ? control.checked : !["", "unknown", "undocumented"].includes(control.value.trim());
        fields.set(key, (fields.get(key) ?? false) || filled);
      }
      count.current.textContent = `${countLabel}: ${[...fields.values()].filter(Boolean).length} of ${fields.size} filled${event ? " · unsaved edits" : ""}`;
    };
    updateCount();
    revealAnchor();
    root.addEventListener("input", updateCount);
    root.addEventListener("change", updateCount);
    window.addEventListener("hashchange", revealAnchor);
    return () => {
      root.removeEventListener("input", updateCount);
      root.removeEventListener("change", updateCount);
      window.removeEventListener("hashchange", revealAnchor);
    };
  }, [countLabel, children]);

  return (
    <details ref={details} id={id} className={`card disclosure ${className}`} open={open}>
      <summary className="disclosure-heading">
        <span className="disclosure-chevron" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-neutral-900">{title}</span>
          {subtitle && <span className="mt-1 block text-sm font-normal text-neutral-600">{subtitle}</span>}
          {summaryExtra && <span className="mt-2 block text-xs font-normal text-neutral-600">{summaryExtra}</span>}
          {countFields && <output ref={count} className="mt-2 block text-xs font-medium text-accent-800" aria-live="polite" />}
        </span>
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
