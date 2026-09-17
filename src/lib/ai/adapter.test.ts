import { describe, expect, it } from "vitest";
import { StrategyResultSchema, type CaseSnapshot, type StrategyResult } from "@/domain/strategy/types";
import { closeNowShortfalls, validateModelResult } from "./adapter";

const AS_OF = "2026-09-15T10:00:00.000Z";

const ALT = { optionId: "opt-2", reference: "A-03", projectName: "Demo Residence", projectId: "proj-1", projectStage: "Under construction", priceMinor: 9_400_000, currency: "EUR", characteristics: "2+1 lower floor", checkedAt: "2026-09-14T00:00:00.000Z", createdAt: "2026-09-08T00:00:00.000Z" };

/** Same fixture shape as src/domain/strategy/engine.test.ts: price 110,000 EUR, costs 5,000 EUR, firm budget 100,000 EUR, objection price. */
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

const withRoom = (over: Partial<CaseSnapshot> = {}) => snapshot({ negotiation: { ...snapshot().negotiation, room: "yes", authorizedRoomMinor: 1_500_000 }, ...over });

/** A model output that pitches everywhere (close_now, reservation asks, a trade in the fallback, pitch branches). */
function modelResult(over: Partial<StrategyResult> = {}): StrategyResult {
  return {
    situation: { summary: "Evaluating B-12.", evidenceIds: ["act-1"] },
    hypotheses: [{ interpretation: "Price resistance", evidenceIds: ["act-1"], alternatives: ["budget", "value", "timing"], questionToTest: "If price were resolved, would anything else stop you?" }],
    angles: [
      { id: "reservation", rank: 1, title: "Reserve", rationale: "Ready.", evidenceIds: ["act-1"], suggestedWording: "Everything on unit B-12 is confirmed.", suggestedWordingTranslation: null, directAsk: "Shall we reserve unit B-12 today?", directAskTranslation: null, proofNeeded: [], questionToTest: "Is anything still open on your side?", methodSourceIds: [], avoidWhen: "" },
      { id: "unit_swap", rank: 2, title: "Alternative", rationale: "Alt.", evidenceIds: ["opt-2"], suggestedWording: "Unit A-03 is the other route.", suggestedWordingTranslation: null, directAsk: "B-12 or A-03, which?", directAskTranslation: null, proofNeeded: [], questionToTest: "What does B-12 have that A-03 does not?", methodSourceIds: [], avoidWhen: "" },
    ],
    excludedAngles: [],
    objections: [{ objection: "Price", basis: "stated", response: "The price reflects the documented terms.", clarifyingQuestion: "Is price the only thing between us?", closeAsk: "Shall we reserve unit B-12 today?" }],
    nextMove: { action: "Call and ask for the reservation.", purpose: "Close.", customerCommitment: "Shall we reserve unit B-12 today?", customerCommitmentTranslation: null, afterYes: "Send the reservation form.", prerequisites: [], owner: "salesperson", dueInDays: 0 },
    fallback: { action: "Offer A-03.", prerequisite: "A-03 available", customerAsk: "Shall we reserve unit A-03 today instead?" },
    responseBranches: [{ customerResponse: "Agrees", nextAction: "Reserve.", suggestedWording: "Great, I'll prepare the reservation now.", stopOrRecheckCondition: "—" }],
    customerDraft: { language: "en", text: "Hi Demo, everything on unit B-12 is confirmed. Shall we reserve it Wednesday?", callOpener: "Demo, quick one: shall we reserve B-12 today?", translation: null },
    unknowns: [],
    fitIssues: [],
    stateBasis: { asOf: AS_OF, latestActivityId: "act-1", activeBlocker: "None", closeReadiness: "close_now", missingForClose: [], qualificationGaps: [], daysSinceLastContact: 3, cadence: { touch: 0, nextTouchInDays: 2, reason: "direct interest check" }, changesSincePreviousRun: [], staleInputs: [] },
    nextReviewTrigger: "Customer's answer to the reservation ask.",
    notes: [],
    ...over,
  };
}

/** A pitching result with the given text placed in every customer-facing string group. */
function everywhere(text: string, over: Partial<StrategyResult> = {}): StrategyResult {
  const base = modelResult();
  return modelResult({
    angles: base.angles.map((a) => ({ ...a, suggestedWording: text, directAsk: text, questionToTest: text })),
    objections: base.objections.map((o) => ({ ...o, response: text, clarifyingQuestion: text, closeAsk: text })),
    hypotheses: base.hypotheses.map((h) => ({ ...h, questionToTest: text })),
    nextMove: { ...base.nextMove, customerCommitment: text },
    fallback: { ...base.fallback, customerAsk: text },
    responseBranches: base.responseBranches.map((b) => ({ ...b, suggestedWording: text })),
    customerDraft: { ...base.customerDraft, text, callOpener: text },
    stateBasis: { ...base.stateBasis, closeReadiness: "close_conditional", missingForClose: ["funding not confirmed"] },
    ...over,
  });
}

const customerFacing = (r: StrategyResult) =>
  [
    r.nextMove.customerCommitment,
    r.nextMove.customerCommitmentTranslation,
    r.fallback.customerAsk,
    r.customerDraft.text,
    r.customerDraft.callOpener,
    r.customerDraft.translation,
    ...r.angles.flatMap((a) => [a.suggestedWording, a.suggestedWordingTranslation, a.directAsk, a.directAskTranslation, a.questionToTest]),
    ...r.objections.flatMap((o) => [o.response, o.clarifyingQuestion, o.closeAsk]),
    ...r.hypotheses.map((h) => h.questionToTest),
    ...r.responseBranches.map((b) => b.suggestedWording),
  ]
    .filter(Boolean)
    .join("\n");

const STOP_FALLBACK = { action: "None. Persistence does not apply to an explicit stop.", prerequisite: "—", customerAsk: "—" };
const STOP_BRANCH = { customerResponse: "Customer re-engages", nextAction: "Regenerate the strategy from the new state.", suggestedWording: "—", stopOrRecheckCondition: "—" };

describe("stop pin (scenario 12 / contact refusal)", () => {
  const refused = snapshot({ pipelineStage: "lost", readiness: "refused", objection: null, behaviors: [], outcome: { ...snapshot().outcome, lostReason: "price", lostAt: "2026-09-10T00:00:00.000Z", refusalScope: "contact", contactPreference: "do not contact" } });
  const paused = (over: Partial<CaseSnapshot> = {}) => snapshot({ pipelineStage: "paused", readiness: "paused", objection: null, behaviors: [], outcome: { ...snapshot().outcome, pausedUntil: "2026-10-01" }, ...over });

  it("contact refusal: every pitch field is replaced by the stop state, nothing customer-facing survives", () => {
    const { result, warnings } = validateModelResult(modelResult(), refused);
    expect(() => StrategyResultSchema.parse(result)).not.toThrow();
    expect(result.stateBasis.closeReadiness).toBe("stopped");
    expect(result.stateBasis.missingForClose).toEqual([]);
    expect(result.angles).toEqual([]);
    expect(result.objections).toEqual([]);
    expect(result.nextMove.customerCommitment).toBe("None.");
    expect(result.nextMove.customerCommitmentTranslation).toBeNull();
    expect(result.fallback).toEqual(STOP_FALLBACK);
    expect(result.responseBranches).toEqual([STOP_BRANCH]);
    expect(result.customerDraft).toEqual({ language: "en", text: "", callOpener: "", translation: null });
    expect(customerFacing(result)).not.toMatch(/reserv|B-12|A-03/i);
    expect(warnings.some((w) => /level pinned to stopped/.test(w))).toBe(true);
    expect(warnings.some((w) => /declined contact/.test(w))).toBe(true);
    expect(result.notes).toEqual(expect.arrayContaining(warnings));
  });

  it("active pause: angles, objections, asks and branches go; a draft that confirms the agreed date stays, a pitching opener does not", () => {
    const raw = modelResult({ customerDraft: { language: "en", text: "Hi Demo, as agreed I'll come back to you on 1 October. Until then nothing from my side.", callOpener: "Demo, quick one: shall we reserve B-12 today?", translation: null } });
    const { result, warnings } = validateModelResult(raw, paused());
    expect(result.stateBasis.closeReadiness).toBe("stopped");
    expect(result.angles).toEqual([]);
    expect(result.objections).toEqual([]);
    expect(result.nextMove.customerCommitment).toBe("None before the agreed date.");
    expect(result.fallback).toEqual(STOP_FALLBACK);
    expect(result.responseBranches).toEqual([STOP_BRANCH]);
    expect(result.customerDraft.text).toMatch(/1 October/);
    expect(result.customerDraft.callOpener).toBe("");
    expect(customerFacing(result)).not.toMatch(/reserv/i);
    expect(warnings.some((w) => /Active pause until 2026-10-01/.test(w) && /call opener/.test(w))).toBe(true);
  });

  it("active pause: a draft that does not confirm the date is removed with its translation", () => {
    const { result, warnings } = validateModelResult(modelResult({ customerDraft: { language: "en", text: "Hi Demo, B-12 is still available, shall we reserve it?", callOpener: "Demo, about B-12.", translation: "x" } }), paused());
    expect(result.customerDraft).toEqual({ language: "en", text: "", callOpener: "", translation: null });
    expect(warnings.some((w) => /draft and call opener did not confirm the agreed date and were removed/.test(w))).toBe(true);
  });

  it("active pause in Turkish: the Turkish commitment, and a draft naming the date in Turkish is kept with its translation", () => {
    const tr = paused({ customer: { ...snapshot().customer, name: "Ayşe Demir", language: "tr", market: "turkish" } });
    const raw = modelResult({ customerDraft: { language: "tr", text: "Merhaba Sayın Ayşe Demir, anlaştığımız gibi 1 Ekim tarihinde size döneceğim.", callOpener: "Sayın Demir, 1 Ekim'de görüşmek üzere, uygun mu?", translation: "Hi Ayşe, as agreed I'll come back to you on 1 October." } });
    const { result } = validateModelResult(raw, tr);
    expect(result.nextMove.customerCommitment).toBe("Anlaşılan tarihten önce yok.");
    expect(result.nextMove.customerCommitmentTranslation).toBeNull();
    expect(result.customerDraft.text).toMatch(/1 Ekim/);
    expect(result.customerDraft.callOpener).toMatch(/1 Ekim/);
    expect(result.customerDraft.translation).toMatch(/1 October/);
    expect(result.angles).toEqual([]);
  });

  it("a pause with no agreed date asks for the date and removes every draft", () => {
    const { result } = validateModelResult(modelResult(), paused({ outcome: { ...snapshot().outcome, pausedUntil: null } }));
    expect(result.stateBasis.closeReadiness).toBe("stopped");
    expect(result.nextMove.customerCommitment).toMatch(/come back to you, and if so when/);
    expect(result.customerDraft.text).toBe("");
    expect(result.customerDraft.callOpener).toBe("");
    expect(result.angles).toEqual([]);
  });
});

describe("close_now guard", () => {
  it("a model close_now on a case with an open objection is downgraded to close_conditional with the deterministic shortfalls", () => {
    const { result, warnings } = validateModelResult(modelResult(), snapshot());
    expect(result.stateBasis.closeReadiness).toBe("close_conditional");
    expect(result.stateBasis.missingForClose).toContain("active objection (price) not resolved");
    expect(result.stateBasis.missingForClose).toContain("firm budget gap against the recorded ceiling");
    expect(warnings.some((w) => /downgraded to close_conditional/.test(w))).toBe(true);
  });

  it("a stale questionnaire 'offer' answer counts as ready only while readiness is evaluating", () => {
    expect(closeNowShortfalls(snapshot({ readiness: "exploring", answers: { goal: "income", stage: "offer" } }))).toContain('readiness is "exploring", not ready');
    expect(closeNowShortfalls(snapshot({ readiness: "evaluating", answers: { goal: "income", stage: "offer" } }))).not.toContain('readiness is "evaluating", not ready');
  });

  it("a model close_conditional without named conditions gets the deterministic checks", () => {
    const raw = modelResult({ stateBasis: { ...modelResult().stateBasis, closeReadiness: "close_conditional", missingForClose: [] } });
    const { result } = validateModelResult(raw, snapshot());
    expect(result.stateBasis.missingForClose.length).toBeGreaterThan(0);
  });
});

describe("floor and room guard (authorized room is salesperson-only)", () => {
  it("EN: the floor (95,000) and the room (15,000) are removed from every field, the level is capped at advance", () => {
    const floor = everywhere("We could go down to 95,000 EUR if you sign this week.");
    const { result, warnings } = validateModelResult(floor, withRoom());
    expect(customerFacing(result)).not.toMatch(/95,000|95000/);
    expect(result.customerDraft.text).toBe("");
    expect(result.angles[0].questionToTest).toBe("");
    expect(result.stateBasis.closeReadiness).toBe("advance");
    expect(warnings.some((w) => /the seller's floor \(95,000 EUR\)/.test(w) && /customerDraft\.text/.test(w) && /hypotheses\[1\]\.questionToTest/.test(w))).toBe(true);

    const room = everywhere("The seller has 15,000 EUR of room, so name your number.");
    const r2 = validateModelResult(room, withRoom());
    expect(customerFacing(r2.result)).not.toMatch(/15,000/);
    expect(r2.result.stateBasis.closeReadiness).toBe("advance");
    expect(r2.warnings.some((w) => /the authorized room \(15,000 EUR\)/.test(w))).toBe(true);
  });

  it("TR forms (95.000 / 15.000) and the bare figure are caught too", () => {
    const tr = withRoom({ customer: { ...snapshot().customer, language: "tr" } });
    for (const text of ["95.000 EUR olabilir.", "Satıcının 15.000 EUR alanı var.", "Taban 95000 EUR."]) {
      const { result, warnings } = validateModelResult(everywhere(text), tr);
      expect(customerFacing(result), text).not.toMatch(/95\.000|15\.000|95000/);
      expect(warnings.some((w) => /must never hear/.test(w)), text).toBe(true);
    }
  });

  it("a legitimately quotable number is not a leak: the price, and an alternative whose recorded price equals the floor", () => {
    const price = validateModelResult(everywhere("Unit B-12 is 110,000 EUR plus 5,000 EUR costs, 115,000 EUR all in."), withRoom());
    expect(price.result.customerDraft.text).toMatch(/110,000 EUR/);
    expect(price.result.stateBasis.closeReadiness).toBe("close_conditional");

    const alt = withRoom({ alternatives: [{ ...ALT, priceMinor: 9_500_000 }] });
    const kept = validateModelResult(everywhere("Alternatively A-03 at 95,000 EUR is a real option."), alt);
    expect(kept.result.customerDraft.text).toMatch(/A-03 at 95,000 EUR/);
    expect(kept.result.angles[0].questionToTest).toMatch(/95,000 EUR/);
    expect(kept.result.stateBasis.closeReadiness).toBe("close_conditional");
    expect(kept.warnings.some((w) => /must never hear/.test(w))).toBe(false);
    // The room itself stays secret even when the floor coincides with the alternative's price.
    const room = validateModelResult(everywhere("There is 15,000 EUR of room."), alt);
    expect(customerFacing(room.result)).not.toMatch(/15,000/);
  });

  it("the isolating questions (angles.questionToTest, objections.clarifyingQuestion, hypotheses.questionToTest) are swept", () => {
    const base = modelResult({ stateBasis: { ...modelResult().stateBasis, closeReadiness: "close_conditional", missingForClose: ["funding"] } });
    base.angles[0].questionToTest = "Would you sign at 95,000 EUR?";
    base.objections[0].clarifyingQuestion = "Is 95.000 EUR your limit?";
    base.hypotheses[0].questionToTest = "If we reached 95,000 EUR, would you proceed?";
    const { result, warnings } = validateModelResult(base, withRoom());
    expect(result.angles[0].questionToTest).toBe("");
    expect(result.objections[0].clarifyingQuestion).toBe("");
    expect(result.hypotheses[0].questionToTest).toBe("");
    expect(result.customerDraft.text).toMatch(/B-12/); // untouched fields stay
    expect(result.stateBasis.closeReadiness).toBe("advance");
    const w = warnings.find((x) => /the seller's floor/.test(x))!;
    expect(w).toMatch(/angles\[1\]\.questionToTest/);
    expect(w).toMatch(/objections\[1\]\.clarifyingQuestion/);
    expect(w).toMatch(/hypotheses\[1\]\.questionToTest/);
  });
});

describe("terms deadline guard (scenario 21)", () => {
  it("an expired deadline is stripped from every customer-facing field, in EN and TR forms", () => {
    const expired = snapshot({ offer: { ...snapshot().offer!, validUntil: "2026-09-01", termsSource: "written offer" } });
    for (const text of ["The written terms are valid until 1 September 2026, shall we reserve?", "Teklif 1 Eylül tarihine kadar geçerli, rezervasyon yapalım mı?", "Valid until 2026-09-01 or 01/09/2026."]) {
      const { result, warnings } = validateModelResult(everywhere(text), expired);
      expect(customerFacing(result), text).not.toMatch(/1 September|1 Eylül|2026-09-01|01\/09\/2026/);
      expect(result.customerDraft.text.length, text).toBeGreaterThan(0); // the sentence is kept, only the date goes
      expect(warnings.some((w) => /2026-09-01, which is expired/.test(w) && /hypotheses\[1\]\.questionToTest/.test(w)), text).toBe(true);
    }
  });

  it("an unsourced deadline is stripped; a sourced, live one is stated", () => {
    const unsourced = snapshot({ offer: { ...snapshot().offer!, validUntil: "2026-09-30", termsSource: null } });
    const u = validateModelResult(everywhere("The offer holds until 30 September."), unsourced);
    expect(customerFacing(u.result)).not.toMatch(/30 September/);
    expect(u.warnings.some((w) => /recorded without a source/.test(w))).toBe(true);

    const sourced = snapshot({ offer: { ...snapshot().offer!, validUntil: "2026-09-30", termsSource: "written offer 12 Sep" } });
    const s = validateModelResult(everywhere("The written offer is valid until 30 September."), sourced);
    expect(s.result.customerDraft.text).toMatch(/30 September/);
    expect(s.warnings.some((w) => /terms deadline/.test(w))).toBe(false);
  });
});

describe("forbidden phrases are flagged, never rewritten", () => {
  it("EN: guarantee, last unit, another buyer", () => {
    for (const text of ["I can guarantee the rental return.", "This is the last unit at this price.", "Another buyer is looking at B-12."]) {
      const { result, warnings } = validateModelResult(everywhere(text), snapshot());
      expect(result.customerDraft.text, text).toBe(text);
      const w = warnings.find((x) => /guarantee, last-unit, competing-buyer or certain-price-rise claim/.test(x));
      expect(w, text).toBeDefined();
      expect(w, text).toMatch(/customerDraft\.text/);
      expect(w, text).toMatch(/objections\[1\]\.clarifyingQuestion/);
      expect(w, text).toMatch(/angles\[1\]\.questionToTest/);
    }
  });

  it("TR: son daire, garanti, başka bir alıcı, kesinlikle artacak", () => {
    const tr = snapshot({ customer: { ...snapshot().customer, language: "tr" } });
    for (const text of ["Bu son daire.", "Garantili getiri sunuyoruz.", "Başka bir alıcı da ilgileniyor.", "Fiyat kesinlikle artacak."]) {
      const { result, warnings } = validateModelResult(everywhere(text), tr);
      expect(result.customerDraft.text, text).toBe(text);
      expect(warnings.some((w) => /competing-buyer or certain-price-rise/.test(w)), text).toBe(true);
    }
  });

  it("clean wording produces no forbidden-phrase warning", () => {
    const { warnings } = validateModelResult(everywhere("Unit B-12 is 110,000 EUR; the documents are on file for you to verify."), snapshot());
    expect(warnings.some((w) => /competing-buyer/.test(w))).toBe(false);
  });
});
