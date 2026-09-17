import { z } from "zod";
import type { BudgetScope, Minor } from "../money";
import type { Track } from "../vocabulary";

// ---------------------------------------------------------------------------
// Input: an immutable as-of snapshot of the opportunity assembled from the CRM
// ---------------------------------------------------------------------------

export type Funding = "unknown" | "stated" | "confirmed" | "financing";
export type Readiness = "unknown" | "exploring" | "evaluating" | "ready" | "paused" | "refused";
export type Availability = "available" | "reserved" | "sold" | "unknown";
export type NegotiationRoom = "unknown" | "yes" | "no";
export type AttemptResult = "advanced" | "objection" | "delayed" | "failed" | "unknown";
export type DocStatus = "undocumented" | "pending" | "documented";
export type CoDeciderStatus = "unknown" | "none" | "not_involved" | "informed" | "aligned" | "objecting";
export type RefusalScope = "none" | "unit" | "project" | "contact";

export type CaseSnapshot = {
  asOf: string; // ISO timestamp
  opportunityId: string;
  customer: {
    id: string;
    name: string;
    market: "turkish" | "international" | "unknown";
    language: string; // preferred sales language, e.g. "en", "tr"
    logistics: "local" | "remote" | "mixed" | "unknown";
    experience: "first" | "some" | "experienced" | "unknown";
  };
  track: Track;
  pipelineStage: string;
  project: {
    id: string;
    name: string;
    category: string | null;
    stage: string | null;
    location: string | null;
    developer: string | null;
    permittedUseStatus: DocStatus; // plots
    milestonesStatus: DocStatus; // ongoing homes
    sellingPoints: string | null;
    limitations: string | null;
  } | null;
  offer: {
    optionId: string;
    inventoryItemId: string;
    reference: string;
    characteristics: string | null;
    priceMinor: Minor | null;
    currency: string | null;
    costsMinor: Minor | null;
    availability: Availability;
    availabilityCount: number | null; // documented count of comparable units left
    availabilitySource: string | null;
    checkedAt: string | null;
    validUntil: string | null; // quote/terms validity (ISO date)
    termsSource: string | null; // where validUntil comes from; a deadline without a source is not usable
    priceValidUntil: string | null; // documented price-list validity
    priceChangeNote: string | null; // documented upcoming price change, with source
    stagePaymentNote: string | null; // documented stage-linked payment/price milestone
  } | null;
  /** Other candidate/preferred options that are currently available: for alternative-choice closes and unit swaps. */
  alternatives: {
    optionId: string;
    reference: string;
    projectName: string;
    projectId: string | null;
    projectStage: string | null;
    priceMinor: Minor | null;
    currency: string | null;
    characteristics: string | null;
    checkedAt: string | null; // inventory availability check date
    createdAt: string; // when the option was attached (so "new since the loss" is a recorded fact)
  }[];
  budget: {
    id: string;
    amountMinor: Minor;
    amountMaxMinor: Minor | null;
    currency: string;
    scope: BudgetScope;
    firmness: "firm" | "flexible" | "unknown";
    recordedAt: string;
    fx: { rate: number; toCurrency: string; date: string; source: string | null } | null; // recorded observation, never implicit
  } | null;
  funding: Funding;
  fundingSource: string | null;
  fundingTiming: string | null;
  readiness: Readiness;
  objection: string | null; // current explicit objection key (see vocabulary OBJECTIONS)
  resolvedObjections: string[];
  negotiation: {
    room: NegotiationRoom;
    authorizedRoomMinor: Minor | null; // written authorization from the seller; null = not confirmed
    authorizedTerms: string | null; // non-price concessions authorized
    concessionsGiven: string | null;
    counterOfferMinor: Minor | null;
    counterOfferCurrency: string | null;
  };
  qualification: {
    targetDecisionDate: string | null;
    targetTiming: string | null;
    whyNow: string | null;
    mustHaves: string | null;
    niceToHaves: string | null;
    competingOptions: string | null;
    proceedCondition: string | null; // customer's own "I'll proceed if …"
    decisionParticipants: string | null;
    coDeciderStatus: CoDeciderStatus;
    willVisitBeforeDeciding: "unknown" | "yes" | "no";
    desiredOutcome: string | null; // salesperson's desired immediate outcome
  };
  outcome: {
    pausedUntil: string | null;
    lostAt: string | null; // when the deal was moved to Lost (stage history), for "what changed since"
    lostReason: string | null;
    refusalScope: RefusalScope;
    contactPreference: string | null;
    revisitCondition: string | null;
    revisitAt: string | null;
    stageReason: string | null;
  };
  answers: Partial<Record<string, string>>;
  behaviors: string[];
  quotes: { id: string; text: string; at: string }[];
  interpretations: { id: string; text: string; at: string }[];
  narratives: { id: string; type: string; text: string; at: string }[];
  /** Commitment asks made in past touches and what the customer answered. */
  asks: { id: string; ask: string; response: "pending" | "yes" | "no" | "partial" | null; at: string }[];
  evidence: { id: string; statement: string; status: string; sourceDate: string | null; createdAt: string }[];
  attempts: { id: string; angleId: string; result: AttemptResult; at: string; response: string | null }[];
  openTasks: { id: string; action: string; dueAt: string | null }[];
  latestActivityId: string | null;
  latestActivityAt: string | null;
  latestActivityType: string | null;
  /** Last time the customer actually responded (customer_response, a quote, or an answered ask). */
  latestCustomerResponseAt: string | null;
  previousRun: { id: string; createdAt: string; snapshot: CaseSnapshot } | null;
};

// ---------------------------------------------------------------------------
// Output: the strategy result. Same shape for rule mode and model mode.
// Zod schema validates model output before it is saved or shown.
// Customer-facing text (wording, asks, draft) is in the customer's preferred language;
// the *Translation fields carry English for the salesperson when the language is not English (else null).
// ---------------------------------------------------------------------------

export const AngleSchema = z.object({
  id: z.string(),
  rank: z.number().int().min(1).max(3),
  title: z.string(),
  rationale: z.string(),
  evidenceIds: z.array(z.string()),
  suggestedWording: z.string(),
  suggestedWordingTranslation: z.string().nullable(),
  directAsk: z.string(),
  directAskTranslation: z.string().nullable(),
  proofNeeded: z.array(z.string()),
  questionToTest: z.string(),
  methodSourceIds: z.array(z.string()),
  avoidWhen: z.string(),
});

export const CloseReadinessSchema = z.enum(["close_now", "close_conditional", "trial_close", "advance", "stopped"]);

export const StrategyResultSchema = z.object({
  situation: z.object({ summary: z.string(), evidenceIds: z.array(z.string()) }),
  hypotheses: z.array(
    z.object({
      interpretation: z.string(),
      evidenceIds: z.array(z.string()),
      alternatives: z.array(z.string()),
      questionToTest: z.string(),
    }),
  ),
  angles: z.array(AngleSchema).max(3),
  excludedAngles: z.array(z.object({ id: z.string(), title: z.string(), reason: z.string() })),
  objections: z.array(
    z.object({
      objection: z.string(),
      basis: z.enum(["stated", "hypothesized"]),
      response: z.string(),
      clarifyingQuestion: z.string(),
      closeAsk: z.string(), // every objection response turns back into an ask
    }),
  ),
  nextMove: z.object({
    action: z.string(),
    purpose: z.string(),
    customerCommitment: z.string(),
    customerCommitmentTranslation: z.string().nullable(),
    afterYes: z.string(), // the next rung once the customer says yes
    prerequisites: z.array(z.string()),
    owner: z.string(),
    dueInDays: z.number().int().min(0), // suggested due for the saved task
  }),
  fallback: z.object({ action: z.string(), prerequisite: z.string(), customerAsk: z.string() }),
  responseBranches: z.array(
    z.object({
      customerResponse: z.string(),
      nextAction: z.string(),
      suggestedWording: z.string(),
      stopOrRecheckCondition: z.string(),
    }),
  ),
  customerDraft: z.object({
    language: z.string(),
    text: z.string(), // short message (WhatsApp/email), customer language
    callOpener: z.string(), // first 20 seconds of a call, customer language
    translation: z.string().nullable(),
  }),
  unknowns: z.array(z.object({ fact: z.string(), suggestedTask: z.string() })),
  fitIssues: z.array(z.string()),
  stateBasis: z.object({
    asOf: z.string(),
    latestActivityId: z.string().nullable(),
    activeBlocker: z.string(),
    closeReadiness: CloseReadinessSchema,
    missingForClose: z.array(z.string()), // the exact checks that keep this from close_now
    qualificationGaps: z.array(z.string()), // core facts a closer still lacks
    daysSinceLastContact: z.number().nullable(),
    cadence: z.object({ touch: z.number().int().min(0), nextTouchInDays: z.number().int().min(0).nullable(), reason: z.string() }),
    changesSincePreviousRun: z.array(z.string()),
    staleInputs: z.array(z.string()),
  }),
  nextReviewTrigger: z.string(),
  notes: z.array(z.string()), // engine caveats, e.g. "rule mode does not read free text"
});

export type StrategyResult = z.infer<typeof StrategyResultSchema>;
export type Angle = z.infer<typeof AngleSchema>;
export type CloseReadiness = z.infer<typeof CloseReadinessSchema>;

export type GenerationMode = "rules" | "model" | "rules_fallback";
