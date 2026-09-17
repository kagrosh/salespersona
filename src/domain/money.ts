// Money is stored as integer minor units (cents/kuruş) with an explicit currency.
// No floating-point arithmetic is used for persisted amounts.

export type Minor = number; // integer minor units

/**
 * Parse a user-typed decimal string ("110000", "1,250.50", "95000.5") to minor units. Returns null for blank, NaN for invalid.
 * A comma is accepted only as a well-formed thousands separator. A comma decimal ("1,5", "95.000,50") is rejected rather than
 * silently misread by a factor of 100–1000; money amounts drive the gap logic and customer-facing wording.
 */
export function parseDecimalToMinor(input: string | null | undefined): Minor | null {
  if (input == null) return null;
  const s = String(input).trim().replace(/\s/g, "");
  if (s === "") return null;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) return toMinor(s.replace(/,/g, ""));
  if (/^\d+(\.\d{1,2})?$/.test(s)) return toMinor(s);
  return NaN;
}

function toMinor(plain: string): Minor {
  const [whole, frac = ""] = plain.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function formatMinor(minor: Minor, currency: string | null | undefined, locale = "en"): string {
  const value = minor / 100;
  const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  return currency ? `${formatted} ${currency}` : `${formatted} (currency unspecified)`;
}

export function minorToDecimalString(minor: Minor | null | undefined): string {
  if (minor == null) return "";
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return frac === 0 ? `${sign}${whole}` : `${sign}${whole}.${String(frac).padStart(2, "0")}`;
}

export type BudgetScope =
  | "purchase_total"
  | "price_only"
  | "deposit"
  | "borrowing_capacity"
  | "development_total"
  | "ongoing_affordability"
  | "unknown";

export type BudgetCheckInput = {
  priceMinor: Minor | null;
  costsMinor: Minor | null; // null = unknown (never assume zero)
  priceCurrency: string | null;
  budgetMinor: Minor | null;
  budgetCurrency: string | null;
  budgetScope: BudgetScope | null;
};

export type BudgetCheck =
  | { status: "unavailable"; text: string }
  | { status: "mismatch"; text: string }
  | { status: "gap"; gapMinor: Minor; currency: string; text: string; costsKnown: boolean }
  | { status: "headroom_partial"; headroomMinor: Minor; currency: string; text: string }
  | { status: "fits"; headroomMinor: Minor; currency: string; text: string };

/**
 * Compare a budget with an offer. Only compares when currency and scope match.
 * Unknown costs are reported as unknown; the result never asserts full purchase fit without them.
 */
export function budgetCheck(i: BudgetCheckInput): BudgetCheck {
  if (i.priceMinor == null || i.budgetMinor == null) {
    return { status: "unavailable", text: "Budget comparison unavailable: record both the offer price and a budget." };
  }
  if (!i.priceCurrency || !i.budgetCurrency) {
    return { status: "unavailable", text: "Budget comparison unavailable: currency missing on the price or the budget." };
  }
  if (i.priceCurrency !== i.budgetCurrency) {
    return {
      status: "mismatch",
      text: `Budget is in ${i.budgetCurrency}, price in ${i.priceCurrency}. No affordability verdict without a recorded conversion (rate, date, source).`,
    };
  }
  const scope = i.budgetScope ?? "unknown";
  if (scope === "deposit" || scope === "borrowing_capacity" || scope === "ongoing_affordability" || scope === "development_total") {
    return {
      status: "mismatch",
      text: `Budget scope is “${scope.replace("_", " ")}”; the price is a purchase total. No affordability verdict until the total purchase budget is known.`,
    };
  }
  if (scope === "unknown") {
    return { status: "mismatch", text: "Budget scope is unclear (total vs deposit). Clarify before comparing." };
  }
  const cur = i.priceCurrency;
  if (scope === "price_only" || i.costsMinor == null) {
    const diff = i.priceMinor - i.budgetMinor;
    if (diff > 0) {
      return {
        status: "gap",
        gapMinor: diff,
        currency: cur,
        costsKnown: false,
        text: `Price alone exceeds the budget by ${formatMinor(diff, cur)}.${i.costsMinor == null ? " Other costs are still unknown." : ""}`,
      };
    }
    return {
      status: "headroom_partial",
      headroomMinor: -diff,
      currency: cur,
      text: `Price leaves ${formatMinor(-diff, cur)} headroom against price only. ${
        i.costsMinor == null ? "Other costs are unknown; full purchase fit is NOT confirmed." : "Costs are excluded from this budget scope."
      }`,
    };
  }
  const total = i.priceMinor + i.costsMinor;
  const diff = total - i.budgetMinor;
  if (diff > 0) {
    return {
      status: "gap",
      gapMinor: diff,
      currency: cur,
      costsKnown: true,
      text: `Price plus known costs (${formatMinor(total, cur)}) exceeds the total budget by ${formatMinor(diff, cur)}.`,
    };
  }
  return {
    status: "fits",
    headroomMinor: -diff,
    currency: cur,
    text: `Price plus known costs (${formatMinor(total, cur)}) fits the total budget with ${formatMinor(-diff, cur)} to spare. Confirm the cost list is complete and funding is real.`,
  };
}

/**
 * Converts a budget amount into the offer currency using a RECORDED exchange-rate observation.
 * `rate` = 1 budget currency in offer currency. Never implicit: callers must pass the recorded rate.
 * Returns integer minor units (rounded half up).
 */
export function convertWithRecordedRate(amountMinor: Minor, rate: number): Minor {
  if (!(rate > 0)) throw new Error("Exchange rate must be positive.");
  return Math.round(amountMinor * rate);
}
