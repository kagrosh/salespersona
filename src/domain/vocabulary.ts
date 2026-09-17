// Structured vocabulary. Keys are stored in the database; labels are for display.
// Ported from the concept prototype and extended with what a closer needs (objections, outcomes, statuses).

export type Track = "home" | "land";

export type Option = { key: string; label: string };
export type Question = { key: QuestionKey; label: string; hint: string; options: Option[] };

export type QuestionKey = "goal" | "concern" | "horizon" | "involvement" | "uncertainty" | "evidence" | "decision" | "stage";

export const QUESTION_ORDER: QuestionKey[] = ["goal", "concern", "horizon", "involvement", "uncertainty", "evidence", "decision", "stage"];

const o = (pairs: [string, string][]): Option[] => pairs.map(([key, label]) => ({ key, label }));

const SHARED: Record<Exclude<QuestionKey, "goal" | "concern" | "involvement">, Question> = {
  horizon: {
    key: "horizon",
    label: "When might you need to sell or access this money?",
    hint: "Record the planned holding period, not the purchase date.",
    options: o([["short", "Within 2 years"], ["medium", "2–5 years"], ["long", "More than 5 years"], ["flexible", "Flexible / no target yet"]]),
  },
  uncertainty: {
    key: "uncertainty",
    label: "How do you prefer to handle uncertainty?",
    hint: "A stated preference, not a risk-capacity assessment.",
    options: o([["clarity", "Resolve key unknowns before proceeding"], ["bounded", "Consider some unknowns with clear limits"], ["open", "Explore uncertain opportunities in detail"]]),
  },
  evidence: {
    key: "evidence",
    label: "What would help you evaluate an opportunity?",
    hint: "Choose the most useful starting point.",
    options: o([["numbers", "Detailed numbers and assumptions"], ["documents", "Documents and verification"], ["independent", "An independent expert opinion"], ["visit", "A property / site visit"], ["comparison", "A short comparison of alternatives"]]),
  },
  decision: {
    key: "decision",
    label: "Who will be involved in the decision?",
    hint: "Include anyone whose input the customer wants.",
    options: o([["alone", "I decide on my own"], ["joint", "We will decide together"], ["advice", "I decide after getting advice"], ["other", "Someone else gives final approval"]]),
  },
  stage: {
    key: "stage",
    label: "What would you like to do next?",
    hint: "Use the customer's preferred pace.",
    options: o([["explore", "Explore and learn"], ["criteria", "Clarify what suits me"], ["compare", "Compare a shortlist"], ["visit", "Visit a property / site"], ["verify", "Investigate a specific opportunity"], ["offer", "Make an offer / reserve"], ["pause", "Pause for now"]]),
  },
};

const TRACK_QUESTIONS: Record<Track, Record<"goal" | "concern" | "involvement", Question>> = {
  home: {
    goal: {
      key: "goal",
      label: "What is your main reason for investing?",
      hint: "Choose the main priority; add any others in notes.",
      options: o([["income", "Rental income"], ["growth", "Long-term value growth"], ["preserve", "Preserving capital"], ["resale", "Renovation and resale"], ["mixed", "Investment plus possible personal use"], ["residency", "Residency / citizenship route (verify eligibility)"]]),
    },
    concern: {
      key: "concern",
      label: "What is your biggest concern?",
      hint: "Choose the concern most likely to delay a decision.",
      options: o([["vacancy", "Uncertain rental income / vacancy"], ["costs", "Unexpected costs or repairs"], ["management", "Tenant or management workload"], ["delivery", "Delivery timing or completion"], ["resale", "Difficulty selling when needed"], ["trust", "Property or seller information"], ["value", "Overpaying or losing value"], ["currency", "Exchange-rate / currency risk"], ["legal", "Legal, title or residency questions"], ["none", "No major concern yet"]]),
    },
    involvement: {
      key: "involvement",
      label: "How involved would you like to be?",
      hint: "Think about tenants, repairs and ongoing decisions.",
      options: o([["low", "Minimal involvement; delegate most tasks"], ["some", "Some oversight and decisions"], ["high", "Actively manage or improve the property"]]),
    },
  },
  land: {
    goal: {
      key: "goal",
      label: "What is your main reason for investing?",
      hint: "Choose the main priority; add any others in notes.",
      options: o([["growth", "Long-term value growth"], ["build", "Build for my own future use"], ["develop", "Develop and sell / lease"], ["resale", "Resell without developing"], ["hold", "Hold land for future options"]]),
    },
    concern: {
      key: "concern",
      label: "What is your biggest concern?",
      hint: "Choose the concern most likely to delay a decision.",
      options: o([["ownership", "Ownership or boundary uncertainty"], ["use", "Whether my intended use is feasible"], ["services", "Access, utilities or infrastructure"], ["delays", "Delays and ongoing holding costs"], ["resale", "Difficulty finding a future buyer"], ["trust", "Plot or seller information"], ["value", "Overpaying or losing value"], ["currency", "Exchange-rate / currency risk"], ["legal", "Legal, title or permit questions"], ["none", "No major concern yet"]]),
    },
    involvement: {
      key: "involvement",
      label: "How involved would you like to be?",
      hint: "Think about site work, approvals and project decisions.",
      options: o([["low", "Minimal involvement; hold or delegate"], ["some", "Coordinate specialists when needed"], ["high", "Actively manage a development project"]]),
    },
  },
};

export function questionsFor(track: Track): Question[] {
  const all = { ...SHARED, ...TRACK_QUESTIONS[track] } as Record<QuestionKey, Question>;
  return QUESTION_ORDER.map((k) => all[k]);
}

export function answerLabel(track: Track, key: QuestionKey, answerKey: string | null | undefined): string {
  if (!answerKey) return "not stated";
  const q = questionsFor(track).find((x) => x.key === key);
  return q?.options.find((op) => op.key === answerKey)?.label ?? answerKey;
}

export const BEHAVIORS: Option[] = o([
  ["discount", "Asks for a discount"],
  ["compare", "Compares competing projects"],
  ["documents", "Requests documents or proof"],
  ["delay", "Postpones without a clear next date"],
  ["returns", "Repeatedly asks about returns"],
  ["others", "Seeks another person's approval"],
  ["send_info", "Asks to be sent information instead of a meeting"],
  ["silent", "Went silent after an ask"],
  ["positive", "Expressed clear enthusiasm for a specific unit"],
]);

/** Explicit objections a closer must handle. Each maps to a playbook. */
export const OBJECTIONS: Option[] = o([
  ["price", "Price is too high / wants a discount"],
  ["cash_discount", "Wants a bigger discount because paying cash"],
  ["fees", "Fees, taxes or extra costs are too high"],
  ["competitor", "Competing project is cheaper / better"],
  ["market_wait", "Market will drop / wants to wait for prices"],
  ["currency_risk", "Exchange-rate / currency risk"],
  ["returns", "Returns not convincing"],
  ["resale_liquidity", "Doubts about resale / liquidity"],
  ["management", "Rental management workload / doubts"],
  ["delivery", "Delivery / completion timing"],
  ["only_completed", "Only buys completed property, no off-plan"],
  ["developer_trust", "Doesn't trust the developer / seller"],
  ["feasibility", "Intended use / feasibility of plot"],
  ["location", "Too far from city / sea / airport"],
  ["remote", "Cannot inspect / buying remotely"],
  ["legal_residency", "Legal, title, citizenship or residency questions"],
  ["approval", "Needs another person's approval"],
  ["spouse_no", "Partner / co-decider said no"],
  ["trust", "Doesn't trust the information"],
  ["think_it_over", "\"I'll think about it\""],
  ["no_hurry", "\"I'm not in a hurry\" / timing"],
  ["send_info", "\"Just send me the information\""],
  ["after_visit_home", "\"I'll decide after I'm back home\""],
]);

/** Legacy key kept for records created before 0002. */
export const OBJECTION_ALIASES: Record<string, string> = { timing: "no_hurry" };

export const LOST_REASONS: Option[] = o([
  ["price", "Price / budget"],
  ["competitor", "Chose a competitor"],
  ["timing", "Timing / not now"],
  ["financing", "Financing fell through"],
  ["trust", "Trust / information"],
  ["location", "Location"],
  ["product", "Product did not fit"],
  ["no_response", "Stopped responding"],
  ["other", "Other"],
]);

export const REFUSAL_SCOPES: Option[] = o([
  ["none", "No refusal"],
  ["unit", "Refused this unit / plot only"],
  ["project", "Refused this project"],
  ["contact", "Asked not to be contacted"],
]);

export const CO_DECIDER_STATUS: Option[] = o([
  ["unknown", "Unknown"],
  ["none", "Decides alone"],
  ["not_involved", "Co-decider exists, has seen nothing yet"],
  ["informed", "Co-decider has the information"],
  ["aligned", "Co-decider is aligned"],
  ["objecting", "Co-decider is objecting"],
]);

export const DOC_STATUS: Option[] = o([
  ["undocumented", "Not documented"],
  ["pending", "Requested / pending"],
  ["documented", "Documented on file"],
]);

export const ASK_RESPONSES: Option[] = o([
  ["pending", "No answer yet"],
  ["yes", "Yes"],
  ["partial", "Partial / conditional"],
  ["no", "No"],
]);

export const CATEGORIES: Record<Track, string[]> = {
  home: ["Apartment", "Villa", "Detached house", "Other home"],
  land: ["Residential plot", "Tourism / hospitality plot", "Commercial plot", "Mixed-use / other plot"],
};

export const PROJECT_STAGES: Record<Track, string[]> = {
  home: ["Completed", "Under construction", "Off-plan"],
  land: ["Undeveloped land", "Serviced land", "Site works ongoing"],
};

export const ONGOING_HOME_STAGES = ["Under construction", "Off-plan"];

export const PIPELINE_STAGES = ["new", "discovery", "qualified", "shortlist", "visit", "negotiation", "won", "lost", "paused"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  discovery: "Discovery",
  qualified: "Qualified",
  shortlist: "Shortlist / proposal",
  visit: "Visit / review",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  paused: "Paused",
};

export const CURRENCIES = ["EUR", "USD", "TRY", "GBP"];

export const labelOf = (options: Option[], key: string | null | undefined) => options.find((op) => op.key === key)?.label ?? (key || "—");
