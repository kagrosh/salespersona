import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseSnapshot } from "@/domain/strategy/types";
import { OBJECTION_ALIASES } from "@/domain/vocabulary";
import type { ActivityRow, AnswerRow, AttemptRow, BudgetRow, CustomerRow, EvidenceRow, InventoryRow, OpportunityRow, OptionRow, ProjectRow, StrategyRunRow, TaskRow } from "./types";

export type OptionJoined = OptionRow & { inventory_items: (InventoryRow & { projects: ProjectRow | null }) | null };

export type LoadedCase = {
  opportunity: OpportunityRow;
  customer: CustomerRow;
  options: OptionJoined[];
  budgets: BudgetRow[];
  activities: ActivityRow[];
  answers: AnswerRow[]; // latest per question
  evidence: EvidenceRow[];
  attempts: AttemptRow[];
  runs: StrategyRunRow[];
  tasks: TaskRow[];
  lostAt: string | null;
};

/** Loads everything the opportunity workspace and the strategy engine need. RLS scopes every query. */
export async function loadCase(supabase: SupabaseClient, opportunityId: string): Promise<LoadedCase | null> {
  const { data: opportunity } = await supabase.from("opportunities").select("*").eq("id", opportunityId).maybeSingle();
  if (!opportunity) return null;
  const opp = opportunity as OpportunityRow;

  const [customer, options, budgets, activities, answers, attempts, runs, tasks, lostHistory] = await Promise.all([
    supabase.from("customers").select("*").eq("id", opp.customer_id).maybeSingle(),
    supabase.from("opportunity_options").select("*, inventory_items(*, projects(*))").eq("opportunity_id", opportunityId).order("created_at"),
    supabase.from("budget_contexts").select("*").eq("opportunity_id", opportunityId).order("recorded_at", { ascending: false }),
    supabase.from("activities").select("*").eq("opportunity_id", opportunityId).order("occurred_at", { ascending: false }),
    supabase.from("assessment_answers").select("*").eq("opportunity_id", opportunityId).is("superseded_by", null).order("recorded_at", { ascending: false }),
    supabase.from("strategy_attempts").select("*").eq("opportunity_id", opportunityId).order("attempted_at", { ascending: false }),
    supabase.from("strategy_runs").select("*").eq("opportunity_id", opportunityId).order("created_at", { ascending: false }).limit(20),
    supabase.from("tasks").select("*").eq("opportunity_id", opportunityId).order("state").order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("stage_history").select("changed_at").eq("opportunity_id", opportunityId).eq("to_stage", "lost").order("changed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  // A customer from another workspace (or a deleted one) makes the case unloadable rather than crashing the page.
  if (!customer.data) return null;
  const opts = (options.data ?? []) as OptionJoined[];
  const projectIds = [...new Set(opts.map((o) => o.inventory_items?.project_id).filter(Boolean))] as string[];
  const evidence = projectIds.length ? ((await supabase.from("evidence_claims").select("*").in("project_id", projectIds)).data ?? []) : [];

  // Latest answer per question wins; older ones stay in the table as history.
  const seen = new Set<string>();
  const latestAnswers = ((answers.data ?? []) as AnswerRow[]).filter((a) => (seen.has(a.question_key) ? false : (seen.add(a.question_key), true)));

  return {
    opportunity: opp,
    customer: customer.data as CustomerRow,
    options: opts,
    budgets: (budgets.data ?? []) as BudgetRow[],
    activities: (activities.data ?? []) as ActivityRow[],
    answers: latestAnswers,
    evidence: evidence as EvidenceRow[],
    attempts: (attempts.data ?? []) as AttemptRow[],
    runs: (runs.data ?? []) as StrategyRunRow[],
    tasks: (tasks.data ?? []) as TaskRow[],
    lostAt: (lostHistory.data as { changed_at: string } | null)?.changed_at ?? (opp.stage === "lost" ? opp.updated_at : null),
  };
}

export function preferredOption(options: OptionJoined[]): OptionJoined | null {
  return options.find((o) => o.status === "preferred") ?? options.find((o) => o.status === "candidate") ?? null;
}

/** Builds the immutable as-of snapshot the strategy engine (rules or model) works from. */
export function buildSnapshot(c: LoadedCase, asOf = new Date().toISOString()): CaseSnapshot {
  const o = c.opportunity;
  const offer = preferredOption(c.options);
  const inv = offer?.inventory_items ?? null;
  const project = inv?.projects ?? null;
  const budget = c.budgets[0] ?? null;
  const previous = c.runs.find((r) => r.status !== "failed") ?? null;

  const answers: Record<string, string> = {};
  for (const a of c.answers) if (a.answer_key) answers[a.question_key] = a.answer_key;

  const behaviors = [...new Set(c.activities.flatMap((a) => a.behaviors ?? []))];
  const alternatives = c.options
    .filter((x) => x.id !== offer?.id && (x.status === "candidate" || x.status === "preferred") && x.inventory_items?.availability === "available")
    .map((x) => ({
      optionId: x.id,
      reference: x.inventory_items!.reference,
      projectName: x.inventory_items!.projects?.name ?? "project",
      projectId: x.inventory_items!.project_id ?? null,
      projectStage: x.inventory_items!.projects?.stage ?? null,
      priceMinor: x.quoted_price_minor ?? x.inventory_items!.asking_price_minor,
      currency: x.quoted_currency ?? x.inventory_items!.currency,
      characteristics: x.inventory_items!.characteristics,
      checkedAt: x.inventory_items!.checked_at ?? null,
      createdAt: x.created_at,
    }));

  const responded = c.activities.find((a) => a.type === "customer_response" || a.direct_quote || (a.ask_response && a.ask_response !== "pending"));
  const objectionRaw = o.current_objection;
  const objection = objectionRaw ? (OBJECTION_ALIASES[objectionRaw] ?? objectionRaw) : null;

  return {
    asOf,
    opportunityId: o.id,
    customer: {
      id: c.customer.id,
      name: c.customer.full_name,
      market: c.customer.customer_market,
      language: c.customer.preferred_language,
      logistics: c.customer.purchase_logistics,
      experience: c.customer.investment_experience,
    },
    track: o.track,
    pipelineStage: o.stage,
    project: project
      ? {
          id: project.id,
          name: project.name,
          category: project.category,
          stage: project.stage,
          location: project.location,
          developer: project.developer,
          permittedUseStatus: project.permitted_use_status ?? (project.documented_permitted_use ? "documented" : "undocumented"),
          milestonesStatus: project.milestones_status ?? (project.documented_milestones ? "documented" : "undocumented"),
          sellingPoints: project.selling_points,
          limitations: project.limitations,
        }
      : null,
    offer:
      offer && inv
        ? {
            optionId: offer.id,
            inventoryItemId: inv.id,
            reference: inv.reference,
            characteristics: inv.characteristics,
            priceMinor: offer.quoted_price_minor ?? inv.asking_price_minor,
            currency: offer.quoted_currency ?? inv.currency,
            costsMinor: offer.quoted_costs_minor ?? inv.other_costs_minor,
            availability: offer.status === "unavailable" ? "sold" : inv.availability,
            availabilityCount: inv.availability_count ?? null,
            availabilitySource: inv.availability_source ?? null,
            checkedAt: inv.checked_at,
            validUntil: offer.quote_valid_until,
            termsSource: offer.terms_source ?? null,
            priceValidUntil: inv.price_valid_until ?? null,
            priceChangeNote: inv.price_change_note ?? null,
            stagePaymentNote: inv.stage_payment_note ?? null,
          }
        : null,
    alternatives,
    budget: budget
      ? {
          id: budget.id,
          amountMinor: budget.amount_minor,
          amountMaxMinor: budget.amount_max_minor,
          currency: budget.currency,
          scope: budget.scope,
          firmness: budget.firmness,
          recordedAt: budget.recorded_at,
          fx: budget.fx_rate && budget.fx_to_currency && budget.fx_rate_date ? { rate: Number(budget.fx_rate), toCurrency: budget.fx_to_currency, date: budget.fx_rate_date, source: budget.fx_source } : null,
        }
      : null,
    funding: o.funding_status,
    fundingSource: o.funding_source ?? null,
    fundingTiming: o.funding_timing ?? null,
    readiness: o.readiness,
    objection,
    resolvedObjections: o.resolved_objections ?? [],
    negotiation: {
      room: o.negotiation_room,
      authorizedRoomMinor: o.authorized_room_minor ?? null,
      authorizedTerms: o.authorized_terms ?? null,
      concessionsGiven: o.concessions_given ?? null,
      counterOfferMinor: o.counter_offer_minor ?? null,
      counterOfferCurrency: o.counter_offer_currency ?? null,
    },
    qualification: {
      targetDecisionDate: o.target_decision_date ?? null,
      targetTiming: o.target_timing,
      whyNow: o.why_now ?? null,
      mustHaves: o.must_haves ?? null,
      niceToHaves: o.nice_to_haves ?? null,
      competingOptions: o.competing_options ?? null,
      proceedCondition: o.proceed_condition ?? null,
      decisionParticipants: o.decision_participants,
      coDeciderStatus: o.co_decider_status ?? "unknown",
      willVisitBeforeDeciding: o.will_visit_before_deciding ?? "unknown",
      desiredOutcome: o.desired_outcome,
    },
    outcome: {
      pausedUntil: o.paused_until,
      lostAt: c.lostAt,
      lostReason: o.lost_reason ?? null,
      refusalScope: o.refusal_scope ?? "none",
      contactPreference: o.contact_preference ?? null,
      revisitCondition: o.revisit_condition ?? null,
      revisitAt: o.revisit_at ?? null,
      stageReason: o.stage_reason,
    },
    answers,
    behaviors,
    quotes: c.activities.filter((a) => a.direct_quote).map((a) => ({ id: a.id, text: a.direct_quote!, at: a.occurred_at })),
    interpretations: c.activities.filter((a) => a.interpretation).map((a) => ({ id: a.id, text: a.interpretation!, at: a.occurred_at })),
    narratives: c.activities
      .filter((a) => a.narrative || a.observation)
      .map((a) => ({ id: a.id, type: a.type, text: [a.narrative, a.observation ? `Observed: ${a.observation}` : null].filter(Boolean).join(" "), at: a.occurred_at })),
    asks: c.activities.filter((a) => a.ask_made).map((a) => ({ id: a.id, ask: a.ask_made!, response: a.ask_response ?? "pending", at: a.occurred_at })),
    evidence: c.evidence.map((e) => ({ id: e.id, statement: e.statement, status: e.status, sourceDate: e.source_date, createdAt: e.created_at })),
    attempts: c.attempts.map((a) => ({ id: a.id, angleId: a.angle_id, result: a.result, at: a.attempted_at, response: a.customer_response })),
    openTasks: c.tasks.filter((t) => t.state === "open").map((t) => ({ id: t.id, action: t.action, dueAt: t.due_at })),
    latestActivityId: c.activities[0]?.id ?? null,
    latestActivityAt: c.activities[0]?.occurred_at ?? null,
    latestActivityType: c.activities[0]?.type ?? null,
    latestCustomerResponseAt: responded?.occurred_at ?? null,
    previousRun: previous ? { id: previous.id, createdAt: previous.created_at, snapshot: previous.input_snapshot as CaseSnapshot } : null,
  };
}
