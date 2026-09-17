import { parseDecimalToMinor } from "@/domain/money";

/** Small helpers for reading FormData in Server Actions. */
export const str = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();
export const opt = (fd: FormData, key: string): string | null => {
  const v = str(fd, key);
  return v === "" ? null : v;
};
export const list = (fd: FormData, key: string): string[] => fd.getAll(key).map(String).filter(Boolean);

/** Parses a decimal money field into minor units. Blank → null. Throws on invalid input. */
export function money(fd: FormData, key: string, label = key): number | null {
  const v = parseDecimalToMinor(str(fd, key));
  if (Number.isNaN(v)) throw new Error(`${label}: use a non-negative amount with at most two decimals; use a dot for decimals (e.g. 95000.50).`);
  return v;
}

/** Non-negative integer field. Blank → null. Throws on invalid input. */
export function intOrNull(fd: FormData, key: string, label = key): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  if (!/^\d+$/.test(v)) throw new Error(`${label}: use a whole non-negative number.`);
  return Number(v);
}

/** Positive decimal (e.g. an exchange rate). Blank → null. Throws on invalid input. */
export function positiveDecimalOrNull(fd: FormData, key: string, label = key): number | null {
  const v = str(fd, key).replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${label}: use a positive number.`);
  return n;
}

/** ISO date (YYYY-MM-DD) field. Blank → null. Throws on invalid input. */
export function dateOrNull(fd: FormData, key: string, label = key): string | null {
  const v = str(fd, key);
  if (v === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(new Date(`${v}T00:00:00Z`).getTime())) throw new Error(`${label}: use a date (YYYY-MM-DD).`);
  return v;
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[], fallback: T): T {
  const v = str(fd, key) as T;
  return allowed.includes(v) ? v : fallback;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

// ---------------------------------------------------------------------------
// Time helpers. Labeled assumption (open decision: jurisdictions / workspace time zone):
// follow-up times are interpreted in ASSUMED_TZ (default Europe/Istanbul, override with WORKSPACE_TIMEZONE).
// These dates are the salesperson's own reminders; they are never shown to the customer as deadlines.
// ---------------------------------------------------------------------------

export const ASSUMED_TZ = process.env.WORKSPACE_TIMEZONE || "Europe/Istanbul";
export const DEFAULT_DUE_HOUR = 10;

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function zonedParts(atUtcMs: number, tz: string): Parts {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p = Object.fromEntries(dtf.formatToParts(new Date(atUtcMs)).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour === 24 ? 0 : +p.hour, minute: +p.minute, second: +p.second };
}

function tzOffsetMs(tz: string, atUtcMs: number): number {
  const p = zonedParts(atUtcMs, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - atUtcMs;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Converts a `datetime-local` value ("YYYY-MM-DDTHH:MM") or a date ("YYYY-MM-DD", at `hour`) interpreted in `tz` into an ISO timestamp. */
export function localToIso(value: string, tz = ASSUMED_TZ, hour = DEFAULT_DUE_HOUR): string {
  const [d, t] = value.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t ? t.split(":").map(Number) : [hour, 0];
  if (![y, m, day, hh, mm].every((n) => Number.isFinite(n))) throw new Error(`Invalid date/time: ${value}`);
  const guess = Date.UTC(y, m - 1, day, hh, mm);
  // Two passes handle DST boundaries well enough for reminder times.
  const first = guess - tzOffsetMs(tz, guess);
  return new Date(guess - tzOffsetMs(tz, first)).toISOString();
}

/** Today's date in `tz` as YYYY-MM-DD. */
export function todayLocal(tz = ASSUMED_TZ, now = Date.now()): string {
  const p = zonedParts(now, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Date `days` from today in `tz` as YYYY-MM-DD. */
export function dateFromNow(days: number, tz = ASSUMED_TZ, now = Date.now()): string {
  const p = zonedParts(now, tz);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** A `datetime-local` input value for `days` from today at `hour` in `tz` (default tomorrow 10:00). */
export function localInputValue(days = 1, hour = DEFAULT_DUE_HOUR, tz = ASSUMED_TZ, now = Date.now()): string {
  return `${dateFromNow(days, tz, now)}T${pad(hour)}:00`;
}

/**
 * A `datetime-local` value for a task due TODAY in `tz`: `hoursFromNow` hours ahead, no later than `latestHour` (working hours),
 * and never earlier than the next full hour so a "today" task is not born overdue.
 */
export function todayAtInputValue(hoursFromNow = 4, latestHour = 18, tz = ASSUMED_TZ, now = Date.now()): string {
  const p = zonedParts(now, tz);
  const hour = Math.min(23, Math.max(Math.min(latestHour, p.hour + hoursFromNow), p.hour + 1));
  return `${todayLocal(tz, now)}T${pad(hour)}:00`;
}

/**
 * Reads a due timestamp from a form: `due_at` (datetime-local) when present, otherwise `due_days` (integer, default `fallbackDays`)
 * at DEFAULT_DUE_HOUR in the assumed time zone. Returns an ISO timestamp; never null so that a saved task always surfaces.
 */
export function dueFromForm(fd: FormData, fallbackDays = 1): string {
  const due = opt(fd, "due_at");
  if (due) return localToIso(due);
  const raw = str(fd, "due_days");
  const days = /^\d+$/.test(raw) ? Number(raw) : fallbackDays;
  return localToIso(localInputValue(Math.max(0, days)));
}

/** Whole days between an ISO timestamp/date and now (rounded down). Null when the value is missing. */
export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / 86_400_000);
}

/** Whole days from now until an ISO date/timestamp (negative when past). Null when missing. */
export function daysUntil(iso: string | null | undefined, now = Date.now()): number | null {
  const d = daysSince(iso, now);
  return d == null ? null : -d;
}

export function truncate(s: string | null | undefined, n = 90): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
