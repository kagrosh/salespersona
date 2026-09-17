import { describe, expect, it } from "vitest";
import { budgetCheck, formatMinor, minorToDecimalString, parseDecimalToMinor } from "./money";

describe("parseDecimalToMinor", () => {
  it("parses whole and fractional amounts exactly", () => {
    expect(parseDecimalToMinor("110000")).toBe(11_000_000);
    expect(parseDecimalToMinor("95000.5")).toBe(9_500_050);
    expect(parseDecimalToMinor("1,250.05")).toBe(125_005);
    expect(parseDecimalToMinor("0.1")).toBe(10);
  });
  it("accepts a comma only as a well-formed thousands separator; a comma decimal is rejected, never misread", () => {
    expect(parseDecimalToMinor("1,250.50")).toBe(125_050);
    expect(parseDecimalToMinor("1,250,000")).toBe(125_000_000);
    expect(parseDecimalToMinor("1,5")).toBeNaN();
    expect(parseDecimalToMinor("95.000,50")).toBeNaN();
    expect(parseDecimalToMinor("12,3456")).toBeNaN();
  });
  it("treats blank as null and garbage as NaN", () => {
    expect(parseDecimalToMinor("")).toBeNull();
    expect(parseDecimalToMinor(undefined)).toBeNull();
    expect(parseDecimalToMinor("abc")).toBeNaN();
    expect(parseDecimalToMinor("1.234")).toBeNaN();
    expect(parseDecimalToMinor("-5")).toBeNaN();
  });
  it("round-trips through minorToDecimalString", () => {
    expect(minorToDecimalString(11_000_000)).toBe("110000");
    expect(minorToDecimalString(9_500_050)).toBe("95000.50");
    expect(minorToDecimalString(null)).toBe("");
  });
  it("formats with currency", () => {
    expect(formatMinor(1_500_000, "EUR")).toBe("15,000 EUR");
  });
});

describe("budgetCheck (handoff acceptance scenarios 3–5)", () => {
  const eur = { priceCurrency: "EUR", budgetCurrency: "EUR" };

  it("scenario 3: budget 100,000, price 110,000, costs 5,000 → 15,000 gap", () => {
    const r = budgetCheck({ ...eur, priceMinor: 11_000_000, costsMinor: 500_000, budgetMinor: 10_000_000, budgetScope: "purchase_total" });
    expect(r.status).toBe("gap");
    if (r.status === "gap") {
      expect(r.gapMinor).toBe(1_500_000);
      expect(r.costsKnown).toBe(true);
    }
  });

  it("scenario 4: budget 100,000, price 95,000, costs unknown → 5,000 headroom against price only, fit not confirmed", () => {
    const r = budgetCheck({ ...eur, priceMinor: 9_500_000, costsMinor: null, budgetMinor: 10_000_000, budgetScope: "purchase_total" });
    expect(r.status).toBe("headroom_partial");
    if (r.status === "headroom_partial") expect(r.headroomMinor).toBe(500_000);
    expect(r.text).toMatch(/NOT confirmed/);
  });

  it("scenario 5a: EUR budget vs USD price → no verdict", () => {
    const r = budgetCheck({ priceCurrency: "USD", budgetCurrency: "EUR", priceMinor: 11_000_000, costsMinor: 0, budgetMinor: 10_000_000, budgetScope: "purchase_total" });
    expect(r.status).toBe("mismatch");
  });

  it("scenario 5b: deposit budget vs total price → no verdict", () => {
    const r = budgetCheck({ ...eur, priceMinor: 11_000_000, costsMinor: 0, budgetMinor: 3_000_000, budgetScope: "deposit" });
    expect(r.status).toBe("mismatch");
  });

  it("known zero costs are treated as zero, not unknown", () => {
    const r = budgetCheck({ ...eur, priceMinor: 9_900_000, costsMinor: 0, budgetMinor: 10_000_000, budgetScope: "purchase_total" });
    expect(r.status).toBe("fits");
  });

  it("missing inputs are unavailable, not a verdict", () => {
    expect(budgetCheck({ ...eur, priceMinor: null, costsMinor: null, budgetMinor: 10_000_000, budgetScope: "purchase_total" }).status).toBe("unavailable");
  });
});
