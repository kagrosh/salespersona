import { describe, expect, it } from "vitest";
import { OBJECTIONS } from "../vocabulary";
import { closeReadinessFor, fill, generateStrategy, qualificationGapsFor } from "./engine";
import { OBJECTION_TO_PLAYBOOK, PLAYBOOKS } from "./playbooks";
import { StrategyResultSchema, type CaseSnapshot } from "./types";

const AS_OF = "2026-09-15T10:00:00.000Z";

const ALT = { optionId: "opt-2", reference: "A-03", projectName: "Demo Residence", projectId: "proj-1", projectStage: "Under construction", priceMinor: 9_400_000, currency: "EUR", characteristics: "2+1 lower floor", checkedAt: "2026-09-14T00:00:00.000Z", createdAt: "2026-09-08T00:00:00.000Z" };

function snapshot(over: Partial<CaseSnapshot> = {}): CaseSnapshot {
  return {
    asOf: AS_OF,
    opportunityId: "opp-1",
    customer: { id: "cust-1", name: "Demo Buyer", market: "international", language: "en", logistics: "remote", experience: "some" },
    track: "home",
    pipelineStage: "qualified",
    project: { id: "proj-1", name: "Demo Residence", category: "Apartment", stage: "Under construction", location: "Demo City", developer: "Demo Dev", permittedUseStatus: "undocumented", milestonesStatus: "documented", sellingPoints: null, limitations: null },
    offer: { optionId: "opt-1", inventoryItemId: "inv-1", reference: "B-12", characteristics: "2+1", priceMinor: 11_000_000, currency: "EUR", costsMinor: 500_000, availability: "available", availabilityCount: null, availabilitySource: null, checkedAt: "2026-09-14T00:00:00.000Z", validUntil: null, termsSource: null, priceValidUntil: null, priceChangeNote: null, stagePaymentNote: null },
    alternatives: [ALT],
    budget: { id: "bud-1", amountMinor: 10_000_000, amountMaxMinor: null, currency: "EUR", scope: "purchase_total", firmness: "firm", recordedAt: "2026-09-10T00:00:00.000Z", fx: null },
    funding: "stated",
    fundingSource: null,
    fundingTiming: null,
    readiness: "evaluating",
    objection: "price",
    resolvedObjections: [],
    negotiation: { room: "unknown", authorizedRoomMinor: null, authorizedTerms: null, concessionsGiven: null, counterOfferMinor: null, counterOfferCurrency: null },
    qualification: { targetDecisionDate: null, targetTiming: null, whyNow: null, mustHaves: null, niceToHaves: null, competingOptions: null, proceedCondition: null, decisionParticipants: null, coDeciderStatus: "unknown", willVisitBeforeDeciding: "unknown", desiredOutcome: null },
    outcome: { pausedUntil: null, lostAt: null, lostReason: null, refusalScope: "none", contactPreference: null, revisitCondition: null, revisitAt: null, stageReason: null },
    answers: { goal: "income", concern: "delivery", decision: "joint" },
    behaviors: ["discount", "returns"],
    quotes: [{ id: "act-1", text: "110 is too much for me.", at: "2026-09-12T00:00:00.000Z" }],
    interpretations: [],
    narratives: [{ id: "act-1", type: "call", text: "Call about B-12", at: "2026-09-12T00:00:00.000Z" }],
    asks: [],
    evidence: [],
    attempts: [],
    openTasks: [{ id: "t1", action: "Call back", dueAt: "2026-09-16T09:00:00.000Z" }],
    latestActivityId: "act-1",
    latestActivityAt: "2026-09-12T00:00:00.000Z",
    latestActivityType: "call",
    latestCustomerResponseAt: "2026-09-12T00:00:00.000Z",
    previousRun: null,
    ...over,
  };
}

const ready = (over: Partial<CaseSnapshot> = {}) =>
  snapshot({ offer: { ...snapshot().offer!, priceMinor: 9_400_000 }, objection: null, behaviors: [], readiness: "ready", funding: "confirmed", qualification: { ...snapshot().qualification, coDeciderStatus: "aligned" }, ...over });

type R = ReturnType<typeof generateStrategy>;
const customerFacing = (r: R) => [r.nextMove.customerCommitment, r.customerDraft.text, r.customerDraft.callOpener, r.fallback.customerAsk, ...r.angles.flatMap((a) => [a.suggestedWording, a.directAsk]), ...r.objections.flatMap((o) => [o.response, o.closeAsk]), ...r.responseBranches.map((b) => b.suggestedWording)].join("\n");
const translations = (r: R) => [r.nextMove.customerCommitmentTranslation, r.customerDraft.translation, ...r.angles.flatMap((a) => [a.suggestedWordingTranslation, a.directAskTranslation])].filter(Boolean).join("\n");

describe("contract", () => {
  it("output validates against the shared schema", () => {
    const r = generateStrategy(snapshot());
    expect(() => StrategyResultSchema.parse(r)).not.toThrow();
    expect(r.angles.length).toBeLessThanOrEqual(3);
    expect(r.angles.every((a) => a.evidenceIds.every((id) => r.situation.evidenceIds.includes(id)))).toBe(true);
  });
  it("every objection key maps to an existing playbook", () => {
    for (const o of OBJECTIONS) expect(PLAYBOOKS[OBJECTION_TO_PLAYBOOK[o.key]], o.key).toBeDefined();
  });
  it("every playbook has EN and TR say/ask and a commitment-shaped ask", () => {
    for (const p of Object.values(PLAYBOOKS)) {
      expect(p.say.en.length, p.id).toBeGreaterThan(20);
      expect(p.say.tr.length, p.id).toBeGreaterThan(20);
      expect(p.directAsk.en, p.id).toMatch(/\?/);
      expect(p.directAsk.tr, p.id).toMatch(/\?/);
    }
  });
  it("fill reports missing tokens, never leaves braces, and capitalises a token at sentence start", () => {
    const f = fill("Hi {first}, {unit} at {price}. {nextStep} today?", { first: "Ada", unit: "unit B-1", price: undefined, nextStep: "reservation" });
    expect(f.text).toBe("Hi Ada, unit B-1 at …. Reservation today?");
    expect(f.missing).toEqual(["price"]);
  });
});

describe("close readiness", () => {
  it("close_now when every check is on file; no invented buyer, no 'today's check'", () => {
    const r = generateStrategy(ready());
    expect(r.stateBasis.closeReadiness).toBe("close_now");
    expect(r.angles[0].id).toBe("reservation");
    expect(r.nextMove.dueInDays).toBe(0);
    expect(r.nextMove.customerCommitment).toMatch(/reservation/i);
    expect(customerFacing(r)).not.toMatch(/nobody else|başkası almasın|today's check|bugünkü kontrol/i);
    expect(r.angles.every((a) => ["reservation", "deadline", "scarcity_documented", "price_list", "unit_swap"].includes(a.id))).toBe(true);
    expect(r.objections.every((o) => /reservation/i.test(o.closeAsk))).toBe(true);
    expect(r.nextMove.afterYes).toMatch(/commitment-step document/);
  });
  it("close_conditional on a seller check speaks a customer phrase, never the internal label", () => {
    const r = generateStrategy(ready({ offer: { ...ready().offer!, costsMinor: null } }));
    expect(r.stateBasis.closeReadiness).toBe("close_conditional");
    expect(r.stateBasis.missingForClose).toEqual(["complete cost list unknown"]);
    expect(r.angles[0].id).toBe("close_conditional");
    expect(r.nextMove.customerCommitment).toMatch(/comes back as described/);
    expect(customerFacing(r)).toMatch(/the complete cost list/);
    expect(customerFacing(r)).not.toMatch(/cost list unknown/);
  });
  it("close_conditional on funding routes to the customer's own evidence, not a seller check", () => {
    const r = generateStrategy(ready({ funding: "stated" }));
    expect(r.angles[0].id).toBe("close_funding");
    expect(customerFacing(r)).toMatch(/proof of funds/);
    expect(customerFacing(r)).not.toMatch(/not evidenced/);
  });
  it("close_conditional on the co-decider routes to the approval playbook", () => {
    const r = generateStrategy(ready({ qualification: { ...ready().qualification, coDeciderStatus: "informed" } }));
    expect(r.stateBasis.closeReadiness).toBe("close_conditional");
    expect(r.stateBasis.missingForClose).toContain("co-decider not yet aligned");
    expect(r.angles[0].id).toBe("approval");
  });
  it("a stale availability check is a missing check", () => {
    expect(closeReadinessFor(ready({ offer: { ...ready().offer!, checkedAt: "2026-08-01T00:00:00.000Z" } })).missing).toContain("availability check older than 14 days");
  });
  it("trial_close at shortlist without objection", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, pipelineStage: "shortlist", qualification: { ...snapshot().qualification, whyNow: "relocating", mustHaves: "sea view", targetTiming: "Q4" }, funding: "confirmed" }));
    expect(r.stateBasis.closeReadiness).toBe("trial_close");
  });
  it("advance with the stage ladder ask when nothing stronger applies; discovery without a budget has no unfilled token", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, pipelineStage: "discovery", readiness: "exploring", answers: { goal: "growth" } }));
    expect(r.stateBasis.closeReadiness).toBe("advance");
    expect(r.nextMove.customerCommitment).toMatch(/two options/);
    expect(r.nextMove.customerCommitment).not.toMatch(/…/);
    expect(r.responseBranches[0].nextAction).toMatch(/shortlist/);
    expect(customerFacing(r)).not.toMatch(/…/);
  });
  it("Q8 'visit' answer becomes the ask", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, answers: { goal: "growth", stage: "visit" } }));
    expect(r.nextMove.customerCommitment).toMatch(/show you unit B-12/);
  });
  it("a stale questionnaire 'pause' does not stop a ready deal in negotiation", () => {
    const r = generateStrategy(ready({ pipelineStage: "negotiation", answers: { goal: "income", stage: "pause" } }));
    expect(r.stateBasis.closeReadiness).toBe("close_now");
    expect(r.angles.some((a) => a.id === "reengage")).toBe(false);
  });
  it("a leftover revisit date does not re-engage a live deal", () => {
    const r = generateStrategy(ready({ outcome: { ...ready().outcome, revisitAt: "2026-09-01" } }));
    expect(r.angles[0].id).toBe("reservation");
  });
  it("negotiation stage without authorized terms falls back to the visit rung, never a blank promise", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, pipelineStage: "negotiation", readiness: "exploring", answers: { goal: "growth" } }));
    expect(customerFacing(r)).not.toMatch(/…/);
  });
});

describe("qualification", () => {
  it("lists the gaps and forces a qualification call at a late stage", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, pipelineStage: "visit", answers: {} }));
    expect(r.stateBasis.qualificationGaps.length).toBeGreaterThanOrEqual(4);
    expect(r.angles[0].id).toBe("qualify");
    expect(r.nextMove.prerequisites.slice(0, r.stateBasis.qualificationGaps.length)).toEqual(r.stateBasis.qualificationGaps);
  });
  it("a brand-new remote lead is qualified, not pitched remote verification", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: null, alternatives: [], pipelineStage: "new", readiness: "unknown", answers: {}, quotes: [], narratives: [], latestActivityId: null, latestActivityAt: null, latestActivityType: null, latestCustomerResponseAt: null }));
    expect(r.angles[0].id).toBe("qualify");
    expect(r.angles.some((a) => a.id === "remote")).toBe(false);
  });
  it("no gaps when the core is recorded", () => {
    const g = qualificationGapsFor(snapshot({ qualification: { ...snapshot().qualification, whyNow: "x", mustHaves: "y", targetTiming: "Q4" }, funding: "confirmed" }));
    expect(g).toEqual([]);
  });
  it("prerequisites never alias the stored missing-for-close list", () => {
    const r = generateStrategy(ready({ offer: { ...ready().offer!, costsMinor: null } }));
    expect(r.nextMove.prerequisites.some((p) => /Remote buyer/.test(p))).toBe(true);
    expect(r.stateBasis.missingForClose).toEqual(["complete cost list unknown"]);
  });
});

describe("negotiation", () => {
  it("scenario 3: firm 15,000 gap gets the number first and never concedes unilaterally", () => {
    const r = generateStrategy(snapshot());
    expect(r.stateBasis.activeBlocker).toMatch(/15,000 EUR/);
    expect(r.angles[0].id).toBe("gap");
    expect(r.nextMove.prerequisites).toContain("Customer's number recorded as counter-offer");
    expect(r.responseBranches.some((b) => /refuses to commit/.test(b.customerResponse))).toBe(true);
    expect(r.angles.some((a) => a.id === "unit_swap")).toBe(true);
  });
  it("within written authority closes on the customer's own number and never discloses the authorization or the floor", () => {
    const r = generateStrategy(snapshot({ negotiation: { ...snapshot().negotiation, room: "yes", authorizedRoomMinor: 1_500_000, counterOfferMinor: 9_800_000, counterOfferCurrency: "EUR" } }));
    expect(r.angles[0].id).toBe("close_authority");
    expect(r.nextMove.action).toMatch(/Do not reopen with the seller/);
    const cf = customerFacing(r);
    expect(cf).not.toMatch(/in writing|put in writing|yazılı olarak verdiği|authori/i);
    expect(cf).not.toMatch(/9,500,000|9\.500\.000|95,000|95\.000|1,500,000|15,000/);
    expect(r.objections.find((o) => o.basis === "stated")!.closeAsk).toMatch(/Price is agreed/);
    expect(r.nextMove.afterYes).toMatch(/commitment-step document/);
  });
  it("counter-offer below authority trades for a commitment; the floor is not revealed", () => {
    const r = generateStrategy(snapshot({ negotiation: { ...snapshot().negotiation, room: "yes", authorizedRoomMinor: 500_000, counterOfferMinor: 9_800_000, counterOfferCurrency: "EUR" } }));
    expect(r.angles[0].id).toBe("trade");
    expect(r.nextMove.customerCommitment).toMatch(/9,800,000|98,000/);
    expect(customerFacing(r)).not.toMatch(/105,000|10,500,000/);
  });
  it("price final: no trip back to the seller, the alternative reaches the draft, and the objection reply matches", () => {
    const r = generateStrategy(snapshot({ negotiation: { ...snapshot().negotiation, room: "no" } }));
    expect(r.angles[0].id).toBe("price_final");
    expect(r.nextMove.action).not.toMatch(/ask the seller/i);
    expect(r.nextMove.action).toMatch(/A-03/);
    expect(r.customerDraft.text).toMatch(/A-03/);
    expect(r.objections.find((o) => o.basis === "stated")!.response).toMatch(/answer on price is no/);
    expect(r.objections.find((o) => o.basis === "stated")!.closeAsk).not.toMatch(/take exactly that to the seller/);
  });
  it("unit swap never invents a seller refusal unless the seller said no", () => {
    const open = generateStrategy(snapshot());
    expect(customerFacing(open)).not.toMatch(/said no to/);
    const closed = generateStrategy(snapshot({ negotiation: { ...snapshot().negotiation, room: "no" } }));
    expect(closed.angles.find((a) => a.id === "unit_swap")!.suggestedWording).toMatch(/already said no/);
  });
  it("a concession already given never becomes an invented promise: rule mode holds the line without claiming a yes", () => {
    const open = generateStrategy(snapshot({ negotiation: { ...snapshot().negotiation, concessionsGiven: "furniture package" } }));
    expect(open.angles[0].id).toBe("hold_open");
    expect(customerFacing(open)).not.toMatch(/you told me that would make it a yes/);
    // A recorded yes to some other ask is not a yes to the concession: no date ties them, so still no promise.
    const anyYes = generateStrategy(snapshot({ negotiation: { ...snapshot().negotiation, concessionsGiven: "furniture package" }, asks: [{ id: "ask-1", ask: "Shall we visit Tuesday?", response: "yes", at: "2026-09-11T00:00:00.000Z" }] }));
    expect(anyYes.angles[0].id).toBe("hold_open");
    expect(customerFacing(anyYes)).not.toMatch(/you told me that would make it a yes/);
    expect(anyYes.angles[0].suggestedWording).toMatch(/furniture package/);
  });
  it("cash discount without proof of funds gates on proof", () => {
    const r = generateStrategy(snapshot({ objection: "cash_discount", behaviors: [] }));
    expect(r.angles[0].id).toBe("cash_discount");
    expect(r.nextMove.prerequisites).toContain("Proof of funds");
  });
  it("a gap against the lower amount of a stated range is not a firm gap, but unknown costs never waive it", () => {
    const known = generateStrategy(snapshot({ objection: null, behaviors: [], budget: { ...snapshot().budget!, amountMaxMinor: 12_000_000 } }));
    expect(known.stateBasis.activeBlocker).not.toMatch(/exceeds/);
    const unknownCosts = generateStrategy(snapshot({ objection: null, behaviors: [], offer: { ...snapshot().offer!, priceMinor: 10_500_000, costsMinor: null }, budget: { ...snapshot().budget!, amountMaxMinor: 10_600_000 } }));
    expect(unknownCosts.angles[0].id).toBe("gap");
    expect(unknownCosts.unknowns.some((u) => /unknown, not zero/.test(u.fact))).toBe(true);
  });
  it("currency mismatch with a recorded rate compares and labels it; stale rate is flagged", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: { ...snapshot().budget!, currency: "USD", amountMinor: 13_000_000, fx: { rate: 0.9, toCurrency: "EUR", date: "2026-09-01", source: "ECB" } } }));
    expect(r.situation.summary).toMatch(/recorded rate 0.9 on 2026-09-01/);
    expect(r.stateBasis.staleInputs).toContain("recorded exchange rate older than 7 days");
    const none = generateStrategy(snapshot({ objection: null, behaviors: [], budget: { ...snapshot().budget!, currency: "USD", fx: null } }));
    expect(none.unknowns.some((u) => /exchange-rate observation/.test(u.suggestedTask))).toBe(true);
  });
});

describe("objections", () => {
  it("every objection response carries a close ask and its playbook leads", () => {
    for (const o of OBJECTIONS) {
      const r = generateStrategy(snapshot({ objection: o.key, behaviors: [], budget: null }));
      const stated = r.objections.find((x) => x.basis === "stated");
      expect(stated, o.key).toBeDefined();
      expect(stated!.closeAsk, o.key).toMatch(/\?/);
      expect(r.angles[0].id, o.key).toBe(OBJECTION_TO_PLAYBOOK[o.key]);
    }
  });
  it("a stated non-price objection leads even with a firm gap behind it", () => {
    const r = generateStrategy(snapshot({ objection: "think_it_over", behaviors: [] }));
    expect(r.angles[0].id).toBe("think_it_over");
    expect(r.customerDraft.text).toMatch(/think it over/);
    expect(r.stateBasis.activeBlocker).toMatch(/firm gap of 15,000 EUR behind it/);
    expect(r.angles.some((a) => a.id === "gap")).toBe(true);
  });
  it("only_completed switches away from delivery and only counts completed alternatives", () => {
    const r = generateStrategy(snapshot({ objection: "only_completed", behaviors: [], budget: null }));
    expect(r.angles.some((a) => a.id === "delivery")).toBe(false);
    expect(r.objections.some((o) => /delivered/.test(o.objection))).toBe(false);
    expect(r.nextMove.action).toMatch(/Search inventory for completed units/);
    const withCompleted = generateStrategy(snapshot({ objection: "only_completed", behaviors: [], budget: null, alternatives: [{ ...ALT, projectStage: "Completed", projectName: "Sea Park", projectId: "proj-2" }] }));
    expect(withCompleted.nextMove.action).toMatch(/Present the completed alternatives \(A-03\)/);
  });
  it("legal question is routed to a licensed source, never answered", () => {
    const r = generateStrategy(snapshot({ objection: "legal_residency", behaviors: [], budget: null }));
    expect(r.nextMove.owner).toMatch(/licensed source/);
    expect(r.fitIssues.some((f) => /do not answer it yourself/.test(f))).toBe(true);
  });
  it("market_wait never forecasts", () => {
    const r = generateStrategy(snapshot({ objection: "market_wait", behaviors: [], budget: null }));
    expect(customerFacing(r)).toMatch(/won't predict the market/);
  });
  it("scenario 6: a discount request alone yields alternatives and a clarifying question, not a verdict", () => {
    const r = generateStrategy(snapshot({ objection: null, budget: null, behaviors: ["discount"] }));
    const h = r.hypotheses.find((x) => x.interpretation === "Price resistance");
    expect(h!.alternatives.length).toBeGreaterThanOrEqual(3);
    expect(r.objections.some((o) => o.basis === "hypothesized")).toBe(true);
  });
  it("resolved objections are not re-raised and turn into a close", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], resolvedObjections: ["delivery"] }));
    expect(r.objections.some((o) => /delivery.*\(resolved\)/i.test(o.objection))).toBe(true);
  });
});

describe("persistence", () => {
  it("silence after an unanswered ask forces the re-ask", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], asks: [{ id: "ask-1", ask: "Reserve B-12?", response: "pending", at: "2026-09-10T00:00:00.000Z" }], latestActivityType: "message", latestActivityAt: "2026-09-10T00:00:00.000Z", latestCustomerResponseAt: "2026-09-05T00:00:00.000Z", narratives: [{ id: "ask-1", type: "message", text: "Sent ask", at: "2026-09-10T00:00:00.000Z" }] }));
    expect(r.angles[0].id).toBe("silence");
    expect(r.stateBasis.activeBlocker).toMatch(/No answer for 5 day/);
    expect(r.nextMove.action).toMatch(/do not add urgency/);
    expect(r.customerDraft.text).toMatch(/rather ask than assume/);
    expect(r.fallback.customerAsk).not.toMatch(/in (Monday|Tuesday|Wednesday|Thursday|Friday)/);
  });
  it("cadence widens and collapses after three unanswered touches", () => {
    const touches = ["2026-09-08", "2026-09-10", "2026-09-13"].map((d, i) => ({ id: `m${i}`, type: "message", text: "touch", at: `${d}T00:00:00.000Z` }));
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], narratives: touches, latestActivityType: "message", latestActivityAt: touches[2].at, latestCustomerResponseAt: "2026-09-05T00:00:00.000Z" }));
    expect(r.stateBasis.cadence.touch).toBe(3);
    expect(r.stateBasis.cadence.reason).toMatch(/three unanswered/);
    expect(r.nextMove.action).toMatch(/Third unanswered touch/);
  });
  it("scenario 12: an active pause produces a follow-up arrangement with a real draft and no angles", () => {
    const r = generateStrategy(snapshot({ readiness: "paused", outcome: { ...snapshot().outcome, pausedUntil: "2026-10-01" } }));
    expect(r.stateBasis.closeReadiness).toBe("stopped");
    expect(r.angles).toHaveLength(0);
    expect(r.customerDraft.text).toMatch(/1 October/);
    expect(JSON.stringify(r)).not.toMatch(/last unit|competing buyer/i);
    expect(r.nextMove.dueInDays).toBe(16);
  });
  it("a pause with no date asks for the date", () => {
    const r = generateStrategy(snapshot({ readiness: "paused" }));
    expect(r.nextMove.action).toMatch(/no re-contact date/);
    expect(r.customerDraft.text).toMatch(/when/);
  });
  it("a pause whose date has passed re-engages, claiming a change only when one is recorded", () => {
    const base = snapshot({ readiness: "paused", pipelineStage: "paused", outcome: { ...snapshot().outcome, pausedUntil: "2026-09-10" } });
    const none = generateStrategy(base);
    expect(none.angles[0].id).toBe("reengage");
    expect(none.customerDraft.text).toMatch(/10 September/);
    expect(none.customerDraft.text).toMatch(/Nothing has changed on my side/);
    const changed = generateStrategy({ ...base, evidence: [{ id: "ev-1", statement: "Title deed registered", status: "verified", sourceDate: "2026-09-14", createdAt: "2026-09-14T00:00:00.000Z" }] });
    expect(changed.customerDraft.text).toMatch(/Title deed registered/);
  });
  it("lost: win-back only with a change dated after the loss; an alternative that predates the loss is not news", () => {
    const lost = (over: Partial<CaseSnapshot> = {}) => snapshot({ pipelineStage: "lost", readiness: "evaluating", objection: null, behaviors: [], outcome: { ...snapshot().outcome, lostReason: "price", lostAt: "2026-09-10T00:00:00.000Z" }, ...over });
    const stale = generateStrategy(lost()); // ALT created 2026-09-08, before the loss
    expect(stale.stateBasis.closeReadiness).toBe("stopped");
    expect(stale.nextMove.action).toMatch(/watch task/);
    const fresh = generateStrategy(lost({ alternatives: [{ ...ALT, createdAt: "2026-09-12T00:00:00.000Z" }] }));
    expect(fresh.angles[0].id).toBe("winback");
    expect(fresh.customerDraft.text).toMatch(/did not fit your budget/);
    expect(fresh.customerDraft.text).toMatch(/A-03 .*available as of the check on 14 September/);
    expect(customerFacing(fresh)).not.toMatch(/documents on file/);
    const revisitOnly = generateStrategy(lost({ outcome: { ...snapshot().outcome, lostReason: "timing", lostAt: "2026-09-01T00:00:00.000Z", revisitAt: "2026-09-14" }, alternatives: [] }));
    expect(revisitOnly.angles[0].id).toBe("winback");
    expect(revisitOnly.customerDraft.text).toMatch(/Nothing has changed on my side/);
    expect(revisitOnly.customerDraft.text).not.toMatch(/That has changed/);
  });
  it("a contact refusal stops everything, with no draft", () => {
    const stop = generateStrategy(snapshot({ pipelineStage: "lost", readiness: "refused", outcome: { ...snapshot().outcome, lostReason: "price", refusalScope: "contact" } }));
    expect(stop.stateBasis.closeReadiness).toBe("stopped");
    expect(stop.customerDraft.text).toBe("");
  });
  it("refusing a unit is not refusing contact, and the refused unit is never re-pitched (even when recorded as lost)", () => {
    const live = generateStrategy(snapshot({ readiness: "evaluating", objection: null, behaviors: [], outcome: { ...snapshot().outcome, refusalScope: "unit" } }));
    expect(live.stateBasis.closeReadiness).not.toBe("stopped");
    expect(live.angles[0].id).toBe("unit_swap");
    expect(live.angles.some((a) => ["dominant", "returns", "gap", "reservation"].includes(a.id))).toBe(false);
    expect(live.angles[0].suggestedWording).not.toMatch(/that's your unit/);
    expect(live.nextMove.customerCommitment).not.toMatch(/B-12/);
    const lost = generateStrategy(snapshot({ pipelineStage: "lost", readiness: "evaluating", objection: null, behaviors: [], outcome: { ...snapshot().outcome, refusalScope: "unit", lostReason: "product", lostAt: "2026-09-10T00:00:00.000Z" }, alternatives: [{ ...ALT, createdAt: "2026-09-12T00:00:00.000Z" }] }));
    expect(lost.angles[0].id).toBe("unit_swap");
    expect(customerFacing(lost)).not.toMatch(/owning unit B-12|straight to unit B-12/);
    const nothing = generateStrategy(snapshot({ readiness: "evaluating", objection: null, behaviors: [], alternatives: [], outcome: { ...snapshot().outcome, refusalScope: "unit" } }));
    expect(nothing.angles[0].id).toBe("search");
    expect(nothing.nextMove.customerCommitment).toMatch(/what I find/);
  });
  it("a visit without a decision produces the post-visit trial close with the visit rung after yes", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], latestActivityType: "visit", latestActivityAt: "2026-09-14T00:00:00.000Z", narratives: [{ id: "v1", type: "visit", text: "Visited B-12", at: "2026-09-14T00:00:00.000Z" }] }));
    expect(r.angles[0].id).toBe("post_visit");
    expect(r.nextMove.customerCommitment).toMatch(/yes-if|yes if/i);
    expect(r.nextMove.afterYes).toMatch(/Reconfirm availability today/);
  });
  it("a new lead agreeing to a call is not promised reservation details", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: null, alternatives: [], pipelineStage: "new", readiness: "unknown", answers: {} }));
    expect(r.responseBranches[0].suggestedWording).not.toMatch(/reservation details/);
  });
  it("no open task is called out", () => {
    const r = generateStrategy(snapshot({ openTasks: [] }));
    expect(r.notes.some((n) => /No open task/.test(n))).toBe(true);
  });
});

describe("levers and honesty", () => {
  it("scenario 21: a deadline needs a source and an available unit; expired is excluded and flagged", () => {
    const unsourced = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, validUntil: "2026-09-30" } }));
    expect(unsourced.angles.some((a) => a.id === "deadline")).toBe(false);
    expect(unsourced.unknowns.some((u) => /no recorded source/.test(u.fact))).toBe(true);
    const sourced = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, validUntil: "2026-09-30", termsSource: "written offer 12 Sep" } }));
    expect(sourced.angles.some((a) => a.id === "deadline")).toBe(true);
    expect(sourced.angles.find((a) => a.id === "deadline")!.suggestedWording).toMatch(/30 September/);
    const expired = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, validUntil: "2026-09-01", termsSource: "written offer" } }));
    expect(expired.fitIssues.some((f) => /expired/.test(f))).toBe(true);
    expect(expired.angles.some((a) => a.id === "deadline")).toBe(false);
    const sold = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, validUntil: "2026-09-30", termsSource: "written offer", availability: "sold" } }));
    expect(sold.angles.some((a) => a.id === "deadline")).toBe(false);
  });
  it("a deadline that expires today asks for today, never a slot after the date", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, validUntil: "2026-09-15", termsSource: "written offer" } }));
    const d = r.angles.find((a) => a.id === "deadline")!;
    expect(d.directAsk).toMatch(/today/);
    expect(d.directAsk).not.toMatch(/Wednesday|Thursday/);
  });
  it("documented scarcity needs count, source, an available unit and a fresh check", () => {
    const ok = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, availabilityCount: 2, availabilitySource: "developer list 14 Sep" } }));
    expect(ok.angles.some((a) => a.id === "scarcity_documented")).toBe(true);
    const stale = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, availabilityCount: 2, availabilitySource: "developer list", checkedAt: "2026-08-01T00:00:00.000Z" } }));
    expect(stale.angles.some((a) => a.id === "scarcity_documented")).toBe(false);
    const unchecked = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, availabilityCount: 2, availabilitySource: "developer list", availability: "unknown" } }));
    expect(unchecked.angles.some((a) => a.id === "scarcity_documented")).toBe(false);
    const nosrc = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, availabilityCount: 2 } }));
    expect(nosrc.angles.some((a) => a.id === "scarcity_documented")).toBe(false);
  });
  it("a documented price-list validity reaches the customer as a date, never a prediction", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, priceValidUntil: "2026-09-30", priceChangeNote: "list rises at slab completion (developer note 12 Sep)" } }));
    const p = r.angles.find((a) => a.id === "price_list")!;
    expect(p.suggestedWording).toMatch(/valid until 30 September; the seller's note says: list rises at slab completion/);
    expect(p.suggestedWording).toMatch(/can't tell you what the next list will say/);
  });
  it("scenario 7: undocumented plot use is flagged and never asserted", () => {
    const r = generateStrategy(snapshot({ track: "land", project: { ...snapshot().project!, category: "Tourism / hospitality plot", stage: "Undeveloped land", permittedUseStatus: "pending" }, answers: { goal: "develop" }, objection: null, budget: null, behaviors: [] }));
    expect(r.fitIssues.some((f) => /not documented permitted use \(pending\)/.test(f))).toBe(true);
    expect(r.angles.some((a) => a.id === "feasibility")).toBe(true);
  });
  it("a sold unit invalidates the unit-specific close and every objection closes on the alternative", () => {
    const r = generateStrategy(ready({ offer: { ...ready().offer!, availability: "sold" } }));
    expect(r.fitIssues.some((f) => /sold/.test(f))).toBe(true);
    expect(r.nextMove.action).toMatch(/no longer available/);
    expect(r.angles.every((a) => ["unit_swap", "search", "discovery", "qualify"].includes(a.id))).toBe(true);
    expect(r.objections.every((o) => !/B-12/.test(o.closeAsk))).toBe(true);
  });
  it("scenario 22: a failed angle is not repeated unless a material fact changed", () => {
    const r = generateStrategy(snapshot({ attempts: [{ id: "att-1", angleId: "gap", result: "failed", at: "2026-09-13T00:00:00.000Z", response: "Refused to move" }] }));
    expect(r.angles.some((a) => a.id === "gap")).toBe(false);
    expect(r.excludedAngles.some((e) => e.id === "gap")).toBe(true);
    const first = snapshot();
    const changed = generateStrategy(snapshot({ offer: { ...first.offer!, priceMinor: 10_000_000 }, attempts: [{ id: "att-1", angleId: "gap", result: "failed", at: "2026-09-13T00:00:00.000Z", response: "Refused" }], previousRun: { id: "run-1", createdAt: first.asOf, snapshot: first } }));
    expect(changed.angles.some((a) => a.id === "gap")).toBe(true);
    expect(changed.notes.some((n) => /revisited because a material fact changed/.test(n))).toBe(true);
  });
  it("an angle delayed twice is excluded and the direct question takes over", () => {
    const att = (i: number) => ({ id: `a${i}`, angleId: "returns", result: "delayed" as const, at: `2026-09-1${i}T00:00:00.000Z`, response: null });
    const r = generateStrategy(snapshot({ objection: null, behaviors: ["returns"], budget: null, attempts: [att(1), att(2)] }));
    expect(r.excludedAngles.some((e) => e.id === "returns" && /Delayed twice/.test(e.reason))).toBe(true);
    expect(r.angles.some((a) => a.id === "delay")).toBe(true);
  });
  it("scenario 17: new facts change the recommendation and are listed", () => {
    const first = snapshot();
    const r = generateStrategy(ready({ previousRun: { id: "run-1", createdAt: first.asOf, snapshot: first } }));
    expect(r.angles[0].id).toBe("reservation");
    expect(r.stateBasis.changesSincePreviousRun.join("\n")).toMatch(/Price: 11000000 → 9400000/);
    expect(r.stateBasis.changesSincePreviousRun.join("\n")).toMatch(/Readiness: evaluating → ready/);
  });
  it("customer-facing text never contains unfilled placeholders or ellipses on a complete case, and drafts stay short", () => {
    for (const r of [generateStrategy(ready()), generateStrategy(snapshot()), generateStrategy(snapshot({ objection: null, behaviors: [], budget: null }))]) {
      expect(customerFacing(r)).not.toMatch(/\{[a-zA-Z]+\}|\[[a-z ]+\]|…/);
      expect(r.customerDraft.text.split(/\s+/).length).toBeLessThanOrEqual(95);
    }
  });
});

describe("language", () => {
  it("scenario 9: Turkish customer gets native Turkish asks and drafts; translations are fully English", () => {
    const r = generateStrategy(snapshot({ customer: { ...snapshot().customer, name: "Ayşe Demir", language: "tr", market: "turkish" } }));
    expect(r.customerDraft.language).toBe("tr");
    expect(r.customerDraft.text).toMatch(/Merhaba Sayın Ayşe Demir/);
    expect(r.customerDraft.text).toMatch(/atacağınız rakam/);
    expect(r.customerDraft.text).not.toMatch(/clarify the next step/);
    expect(r.nextMove.customerCommitment).toMatch(/Evet mi, hayır mı/);
    expect(r.nextMove.customerCommitmentTranslation).toMatch(/Yes or no/);
    expect(r.angles[0].directAskTranslation).toBeTruthy();
    expect(r.customerDraft.translation).toMatch(/Hi Ayşe/);
    expect(translations(r)).not.toMatch(/numaralı|masraf|rezervasyon|Çarşamba|Salı|Perşembe|kira geliri/);
    expect(r.customerDraft.callOpener).toMatch(/Sayın Demir/);
  });
  it("Turkish amounts survive the sentence splitter in drafts and openers", () => {
    const r = generateStrategy(snapshot({ customer: { ...snapshot().customer, language: "tr" }, negotiation: { ...snapshot().negotiation, room: "no" } }));
    expect(r.customerDraft.text).toMatch(/110\.000 EUR/);
    expect(r.customerDraft.callOpener).toMatch(/110\.000 EUR/);
    expect(customerFacing(r)).not.toMatch(/\d\. \d{3}/);
    const ready_tr = generateStrategy(ready({ customer: { ...ready().customer, language: "tr" } }));
    expect(ready_tr.customerDraft.text).toMatch(/94\.000 EUR/);
    expect(ready_tr.angles[0].directAsk).toMatch(/Salı|Çarşamba|Perşembe|Cuma|Pazartesi/);
  });
  it("Turkish slots and unit references are grammatical", () => {
    const r = generateStrategy(snapshot({ customer: { ...snapshot().customer, language: "tr" }, objection: null, behaviors: [], latestActivityType: "visit", latestActivityAt: "2026-09-14T00:00:00.000Z", narratives: [{ id: "v1", type: "visit", text: "Ziyaret", at: "2026-09-14T00:00:00.000Z" }] }));
    expect(r.angles[0].suggestedWording).toMatch(/B-12 numaralı daireyi gördünüz/);
    expect(customerFacing(r)).not.toMatch(/\d\d:\d\d mı, .*\d\d:\d\d mi\?/);
  });
});

describe("closer review round 2", () => {
  const lostPrice = (over: Partial<CaseSnapshot> = {}) => snapshot({ pipelineStage: "lost", readiness: "evaluating", objection: null, behaviors: [], outcome: { ...snapshot().outcome, lostReason: "price", lostAt: "2026-09-10T00:00:00.000Z" }, ...over });
  it("a won deal is a stop, not a live close, and lost/paused/won never read as close-ready", () => {
    const won = generateStrategy(ready({ pipelineStage: "won" }));
    expect(won.stateBasis.closeReadiness).toBe("stopped");
    expect(won.angles).toHaveLength(0);
    expect(won.stateBasis.activeBlocker).toMatch(/won/);
    expect(won.customerDraft.text).toBe("");
    for (const stage of ["lost", "paused", "won"] as const) expect(closeReadinessFor(ready({ pipelineStage: stage })).level, stage).not.toMatch(/close_now|close_conditional/);
  });
  it("an undated price note is never 'what changed' for a lost or paused customer", () => {
    const noteOnly = generateStrategy(lostPrice({ alternatives: [], offer: { ...snapshot().offer!, priceChangeNote: "list rises at slab completion" } }));
    expect(noteOnly.stateBasis.closeReadiness).toBe("stopped");
    expect(noteOnly.angles.some((a) => a.id === "winback")).toBe(false);
    const paused = generateStrategy(snapshot({ readiness: "paused", pipelineStage: "paused", outcome: { ...snapshot().outcome, pausedUntil: "2026-09-10" }, offer: { ...snapshot().offer!, priceChangeNote: "list rises at slab completion" } }));
    expect(paused.angles[0].id).toBe("reengage");
    expect(customerFacing(paused)).not.toMatch(/slab completion/);
    expect(paused.customerDraft.text).toMatch(/Nothing has changed on my side/);
  });
  it("a revisit-date-only contact never claims news anywhere, including the angle wording", () => {
    const revisitOnly = generateStrategy(lostPrice({ outcome: { ...snapshot().outcome, lostReason: "timing", lostAt: "2026-09-01T00:00:00.000Z", revisitAt: "2026-09-14" }, alternatives: [] }));
    expect(revisitOnly.angles[0].id).toBe("winback");
    expect(revisitOnly.angles[0].suggestedWording).toMatch(/Nothing has changed on my side/);
    expect(customerFacing(revisitOnly)).not.toMatch(/That has changed|documents we can verify|documents on file/);
    const dueBack = generateStrategy(snapshot({ readiness: "paused", pipelineStage: "paused", outcome: { ...snapshot().outcome, pausedUntil: "2026-09-10" } }));
    expect(dueBack.angles[0].suggestedWording).toMatch(/Nothing has changed on my side/);
    expect(customerFacing(dueBack)).not.toMatch(/documents we can verify/);
  });
  it("a sold or reserved unit for a ready buyer: bad news first, no zero gap, honest level, and a search when nothing else fits", () => {
    const sold = generateStrategy(ready({ offer: { ...ready().offer!, availability: "sold" } }));
    expect(sold.stateBasis.closeReadiness).not.toBe("close_conditional");
    expect(sold.stateBasis.closeReadiness).not.toBe("close_now");
    expect(sold.customerDraft.text).not.toMatch(/(^|[^\d.,])0 EUR/);
    expect(customerFacing(sold)).not.toMatch(/off the table/);
    expect(sold.angles[0].id).toBe("unit_swap");
    expect(sold.angles[0].suggestedWording).toMatch(/^Unit B-12 has gone/);
    expect(sold.angles[0].suggestedWording).toMatch(/as of the check on 14 September/);
    const reserved = generateStrategy(ready({ offer: { ...ready().offer!, availability: "reserved" } }));
    expect(reserved.angles[0].suggestedWording).toMatch(/currently reserved by someone else/);
    expect(reserved.nextMove.customerCommitment).toMatch(/next in line/);
    const nothing = generateStrategy(ready({ offer: { ...ready().offer!, availability: "sold" }, alternatives: [] }));
    expect(nothing.angles[0].id).toBe("search");
    expect(nothing.angles[0].suggestedWording).toMatch(/has gone/);
    expect(nothing.nextMove.customerCommitment).toMatch(/one sentence/);
    expect(customerFacing(nothing)).not.toMatch(/…/);
  });
  it("price final with no alternative on file asks for the yes/no and the number, never offers a unit that does not exist", () => {
    const r = generateStrategy(snapshot({ negotiation: { ...snapshot().negotiation, room: "no" }, alternatives: [] }));
    expect(r.angles[0].id).toBe("price_final");
    expect(customerFacing(r)).not.toMatch(/…|A-03/);
    expect(r.angles[0].suggestedWording).toMatch(/number you'd sign at/);
    expect(r.nextMove.customerCommitment).toMatch(/yes or no/i);
    expect(r.customerDraft.text).toMatch(/is unit B-12 worth 110,000 EUR to you/);
    expect(r.customerDraft.callOpener).toMatch(/yes or no/);
    expect(r.fallback.customerAsk).toMatch(/number you'd sign at/);
  });
  it("a sourced lever keeps its own ask: the stage-ladder floor does not swallow a deadline, scarcity or price-list ask", () => {
    const deadline = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, validUntil: "2026-09-30", termsSource: "Developer letter 10 Sep" } }));
    expect(deadline.angles[0].id).toBe("deadline");
    expect(deadline.nextMove.customerCommitment).toMatch(/inside that date/);
    const scarcity = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, availabilityCount: 2, availabilitySource: "Developer list 14 Sep" } }));
    expect(scarcity.angles[0].id).toBe("scarcity_documented");
    expect(scarcity.nextMove.customerCommitment).toBe(scarcity.angles[0].directAsk);
  });
  it("a customer who wants to make an offer with no comparable budget gets the terms close, not a seller check", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, answers: { ...snapshot().answers, stage: "offer" } }));
    expect(r.stateBasis.closeReadiness).toBe("close_conditional");
    expect(r.angles[0].id).toBe("close_terms");
    expect(customerFacing(r)).not.toMatch(/budget not comparable|the total on the same basis/);
    expect(r.angles[0].suggestedWording).toMatch(/all in, and the currency/);
    expect(r.nextMove.afterYes).toBeTruthy();
    // A stale questionnaire 'offer' answer does not outrank an explicit later readiness.
    const stale = generateStrategy(snapshot({ objection: null, behaviors: [], readiness: "exploring", answers: { ...snapshot().answers, stage: "offer" } }));
    expect(stale.stateBasis.closeReadiness).not.toMatch(/close_now|close_conditional/);
  });
  it("only_completed never pitches the ongoing unit and offers a real fallback", () => {
    const r = generateStrategy(snapshot({ objection: "only_completed", behaviors: [] }));
    expect(r.angles[0].id).toBe("only_completed");
    expect(r.angles.some((a) => ["dominant", "returns", "gap", "reservation", "delivery", "location"].includes(a.id))).toBe(false);
    expect(r.fallback.customerAsk).toMatch(/completed unit that matches/);
  });
  it("within written authority still checks the all-in total against a firm budget", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], negotiation: { ...snapshot().negotiation, room: "yes", authorizedRoomMinor: 9_800_000, counterOfferMinor: 9_800_000, counterOfferCurrency: "EUR" } }));
    expect(r.angles[0].id).toBe("close_authority");
    expect(r.angles[0].suggestedWording).toMatch(/98,000 EUR for unit B-12 \+ costs 5,000 EUR/);
    expect(r.unknowns.some((u) => /exceeds the firm all-in budget 100,000 EUR/.test(u.fact))).toBe(true);
    expect(r.nextMove.prerequisites.some((p) => /price-only/.test(p))).toBe(true);
    expect(r.customerDraft.text).toMatch(/98,000 EUR \+ costs 5,000 EUR/);
  });
  it("price list: an expired validity date is never rendered; a note-only case gets the note-only script", () => {
    const expired = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, priceValidUntil: "2026-09-01", priceChangeNote: "list rises at slab completion" } }));
    const p = expired.angles.find((a) => a.id === "price_list")!;
    expect(p.suggestedWording).toMatch(/documented note on the price list says: list rises at slab completion/);
    expect(customerFacing(expired)).not.toMatch(/1 September|valid until/);
    expect(p.directAsk).toMatch(/today's documented terms/);
  });
  it("a deadline that only the first slot fits offers today or that slot, never the second slot", () => {
    // asOf is Tuesday 15 Sep: slot A = Wed 16 Sep, slot B = Thu 17 Sep.
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: { ...snapshot().offer!, validUntil: "2026-09-16", termsSource: "Developer letter 10 Sep" } }));
    const d = r.angles.find((a) => a.id === "deadline")!;
    expect(d.directAsk).toMatch(/today or Wednesday 11:00/);
    expect(d.directAsk).not.toMatch(/16:00/);
  });
  it("delivery is never pitched without a unit on the table", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: null, alternatives: [], answers: { goal: "income", concern: "delivery" } }));
    const d = r.angles.find((a) => a.id === "delivery");
    if (d) {
      expect(d.directAsk).toMatch(/pick the unit that matches them/);
      expect(d.directAsk).not.toMatch(/this unit/);
    }
    expect(r.objections.some((o) => o.basis === "hypothesized" && /delivered on time/.test(o.objection))).toBe(false);
    const noConcern = generateStrategy(snapshot({ objection: null, behaviors: [], budget: null, offer: null, alternatives: [], answers: { goal: "income" } }));
    expect(noConcern.angles.some((a) => a.id === "delivery")).toBe(false);
  });
  it("the qualification call asks only for the facts that are missing", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], pipelineStage: "shortlist", budget: null, answers: { goal: "income" }, qualification: { ...snapshot().qualification, decisionParticipants: "wife", targetDecisionDate: "2026-10-01", whyNow: "rental season" } }));
    expect(r.angles[0].id).toBe("qualify");
    expect(r.angles[0].suggestedWording).not.toMatch(/who decides with you|by when do you want to decide|why now/);
    expect(r.angles[0].suggestedWording).toMatch(/what total are you working with/);
    expect(r.angles[0].suggestedWording).not.toMatch(/five quick questions/);
  });
  it("the dominant angle without verified evidence promises the record, not the claim", () => {
    const r = generateStrategy(snapshot({ objection: null, behaviors: [], answers: { goal: "income", concern: "none" } }));
    const d = r.angles.find((a) => a.id === "dominant");
    if (d) {
      expect(d.suggestedWording).toMatch(/I won't claim it; I'll show you the record/);
      expect(d.suggestedWording).not.toMatch(/documents we can verify together/);
    }
  });
  it("Turkish: the generic call opener addresses the customer formally and the plot suffixes are grammatical", () => {
    const home = generateStrategy(snapshot({ customer: { ...snapshot().customer, name: "Ayşe Demir", language: "tr", market: "turkish" }, objection: "delivery", behaviors: [] }));
    expect(home.customerDraft.callOpener).toMatch(/^Sayın Demir, kısa bir konu\./);
    const land = generateStrategy(snapshot({ customer: { ...snapshot().customer, language: "tr" }, track: "land", project: { ...snapshot().project!, category: "Residential plot", stage: "Undeveloped land", permittedUseStatus: "documented" }, answers: { goal: "develop" }, objection: null, behaviors: [], latestActivityType: "visit", latestActivityAt: "2026-09-14T00:00:00.000Z", narratives: [{ id: "v1", type: "visit", text: "Ziyaret", at: "2026-09-14T00:00:00.000Z" }] }));
    expect(land.angles[0].suggestedWording).toMatch(/B-12 numaralı parseli gördünüz/);
    expect(customerFacing(land)).not.toMatch(/parselyi|parselye|parselnin|parselniz/);
    expect(fill("{unit} hazır.", { unit: "ıslak alanlı daire" }, "tr").text).toBe("Islak alanlı daire hazır.");
    expect(fill("{unit} ready.", { unit: "ıslak" }, "en").text).toBe("Islak ready.");
  });
  it("after yes on a close-ready case the next rung is the reservation, whatever the primary playbook is", () => {
    const r = generateStrategy(ready({ pipelineStage: "visit" }));
    expect(["close_now", "close_conditional"]).toContain(r.stateBasis.closeReadiness);
    expect(r.nextMove.afterYes).toMatch(/commitment-step/);
    expect(r.nextMove.afterYes).not.toMatch(/Reconfirm availability/);
  });
});
