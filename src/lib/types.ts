// Hand-written row types for supabase/migrations/0001_init.sql + 0002_closer_fields.sql.
// Regenerate with `supabase gen types typescript` later if the schema grows.

export type CustomerRow = {
  id: string;
  workspace_id: string;
  owner_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  preferred_language: string;
  customer_market: "turkish" | "international" | "unknown";
  purchase_logistics: "local" | "remote" | "mixed" | "unknown";
  investment_experience: "first" | "some" | "experienced" | "unknown";
  interests: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DocStatus = "undocumented" | "pending" | "documented";

export type ProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  track: "home" | "land";
  category: string | null;
  stage: string | null;
  location: string | null;
  jurisdiction: string | null;
  developer: string | null;
  description: string | null;
  selling_points: string | null;
  limitations: string | null;
  marketed_use: string | null;
  documented_permitted_use: string | null;
  permitted_use_status: DocStatus;
  delivery_claims: string | null;
  documented_milestones: string | null;
  milestones_status: DocStatus;
  created_at: string;
  updated_at: string;
};

export type InventoryRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  reference: string;
  category: string | null;
  characteristics: string | null;
  asking_price_minor: number | null;
  currency: string | null;
  other_costs_minor: number | null;
  availability: "available" | "reserved" | "sold" | "unknown";
  source: string | null;
  checked_at: string | null;
  price_valid_until: string | null;
  price_change_note: string | null;
  availability_count: number | null;
  availability_source: string | null;
  stage_payment_note: string | null;
  created_at: string;
  updated_at: string;
};

export type CoDeciderStatus = "unknown" | "none" | "not_involved" | "informed" | "aligned" | "objecting";
export type LostReason = "price" | "competitor" | "timing" | "financing" | "trust" | "location" | "product" | "no_response" | "other";
export type RefusalScope = "none" | "unit" | "project" | "contact";

export type OpportunityRow = {
  id: string;
  workspace_id: string;
  customer_id: string;
  owner_id: string | null;
  title: string;
  track: "home" | "land";
  stage: string;
  stage_reason: string | null;
  paused_until: string | null;
  target_timing: string | null;
  primary_goal: string | null;
  funding_status: "unknown" | "stated" | "confirmed" | "financing";
  readiness: "unknown" | "exploring" | "evaluating" | "ready" | "paused" | "refused";
  decision_participants: string | null;
  current_objection: string | null;
  desired_outcome: string | null;
  negotiation_room: "unknown" | "yes" | "no";
  // 0002 qualification
  target_decision_date: string | null;
  why_now: string | null;
  must_haves: string | null;
  nice_to_haves: string | null;
  competing_options: string | null;
  proceed_condition: string | null;
  co_decider_status: CoDeciderStatus;
  will_visit_before_deciding: "unknown" | "yes" | "no";
  funding_source: string | null;
  funding_timing: string | null;
  // 0002 negotiation
  counter_offer_minor: number | null;
  counter_offer_currency: string | null;
  authorized_room_minor: number | null;
  authorized_terms: string | null;
  concessions_given: string | null;
  // 0002 outcome / persistence
  lost_reason: LostReason | null;
  refusal_scope: RefusalScope;
  contact_preference: string | null;
  revisit_condition: string | null;
  revisit_at: string | null;
  resolved_objections: string[];
  created_at: string;
  updated_at: string;
};

export type OptionRow = {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  inventory_item_id: string;
  status: "candidate" | "preferred" | "rejected" | "unavailable";
  quoted_price_minor: number | null;
  quoted_currency: string | null;
  quoted_costs_minor: number | null;
  quote_valid_until: string | null;
  terms_source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetRow = {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  amount_minor: number;
  amount_max_minor: number | null;
  currency: string;
  scope: "purchase_total" | "price_only" | "deposit" | "borrowing_capacity" | "development_total" | "ongoing_affordability" | "unknown";
  firmness: "firm" | "flexible" | "unknown";
  source: string | null;
  recorded_at: string;
  note: string | null;
  fx_rate: number | null;
  fx_to_currency: string | null;
  fx_rate_date: string | null;
  fx_source: string | null;
};

export type ActivityType = "call" | "meeting" | "visit" | "message" | "quotation" | "note" | "questionnaire" | "customer_response" | "draft_sent";

export type ActivityRow = {
  id: string;
  workspace_id: string;
  opportunity_id: string | null;
  customer_id: string;
  occurred_at: string;
  type: ActivityType;
  author_id: string | null;
  narrative: string | null;
  direct_quote: string | null;
  observation: string | null;
  interpretation: string | null;
  behaviors: string[];
  ask_made: string | null;
  ask_response: "pending" | "yes" | "no" | "partial" | null;
  created_at: string;
};

export type EvidenceRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  inventory_item_id: string | null;
  statement: string;
  source: string | null;
  source_date: string | null;
  recorded_by: string | null;
  status: "supplied" | "unverified" | "verified" | "disputed" | "expired";
  created_at: string;
};

export type AnswerRow = {
  id: string;
  workspace_id: string;
  customer_id: string;
  opportunity_id: string | null;
  question_key: string;
  answer_key: string | null;
  answer_text: string | null;
  respondent: "customer" | "salesperson";
  source: string | null;
  recorded_at: string;
  superseded_by: string | null;
};

export type StrategyRunRow = {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  created_by: string | null;
  created_at: string;
  generation_mode: "rules" | "model" | "rules_fallback";
  engine_version: string;
  model_id: string | null;
  prompt_version: string | null;
  input_snapshot: unknown;
  result: unknown;
  status: "valid" | "stale" | "failed";
  stale_reason: string | null;
  error: string | null;
  latest_activity_id: string | null;
};

export type AttemptRow = {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  strategy_run_id: string | null;
  angle_id: string;
  angle_title: string;
  wording_used: string | null;
  attempted_at: string;
  customer_response: string | null;
  result: "advanced" | "objection" | "delayed" | "failed" | "unknown";
  created_by: string | null;
};

export type TaskRow = {
  id: string;
  workspace_id: string;
  opportunity_id: string | null;
  customer_id: string | null;
  owner_id: string | null;
  action: string;
  purpose: string | null;
  due_at: string | null;
  state: "open" | "done" | "cancelled";
  outcome: string | null;
  source_run_id: string | null;
  created_at: string;
  completed_at: string | null;
};
