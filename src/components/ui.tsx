import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ title, children, className = "", actions, id }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode; id?: string }) {
  return (
    <section id={id} className={`card scroll-mt-4 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="card-title !mb-0">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** A card whose body is collapsed by default; the browser opens it when a fragment link targets `id`. */
export function Collapsible({ title, children, open = false, id, summaryExtra, className = "" }: { title: string; children: ReactNode; open?: boolean; id?: string; summaryExtra?: ReactNode; className?: string }) {
  return (
    <details id={id} className={`card scroll-mt-4 ${className}`} open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="card-title !mb-0">{title}</span>
        {summaryExtra && <span className="text-xs text-neutral-500">{summaryExtra}</span>}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export function Select({ name, options, defaultValue, blank, required, id }: { name: string; options: { key: string; label: string }[] | string[]; defaultValue?: string | null; blank?: string; required?: boolean; id?: string }) {
  const opts = options.map((o) => (typeof o === "string" ? { key: o, label: o } : o));
  return (
    <select name={name} id={id} className="select" defaultValue={defaultValue ?? ""} required={required}>
      {blank !== undefined && <option value="">{blank}</option>}
      {opts.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm italic text-neutral-500">{children}</p>;
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return <div className="note-bad mb-3">{message}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-neutral-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  const cls = stage === "won" ? "badge-good" : stage === "lost" ? "badge-bad" : stage === "paused" || stage === "negotiation" ? "badge-warn" : "";
  return <span className={`badge ${cls}`}>{stage}</span>;
}

export function DateText({ value, withTime = false }: { value: string | null | undefined; withTime?: boolean }) {
  if (!value) return <span className="text-neutral-400">—</span>;
  const d = new Date(value);
  return <span title={d.toISOString()}>{withTime ? d.toLocaleString("en-GB") : d.toLocaleDateString("en-GB")}</span>;
}

/** "N days ago" from a timestamp; red when older than `warnAfter` days or missing. Observed timestamps only, no interpretation. */
export function DaysAgo({ days, warnAfter = 5, never = "never" }: { days: number | null; warnAfter?: number; never?: string }) {
  if (days == null) return <span className="font-medium text-red-700">{never}</span>;
  const cls = days >= warnAfter ? "font-medium text-red-700" : "";
  return <span className={cls}>{days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`}</span>;
}

export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="block rounded-md px-3 py-2 hover:bg-neutral-50">
      {children}
    </Link>
  );
}
