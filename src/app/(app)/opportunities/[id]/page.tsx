import Link from "next/link";
import { notFound } from "next/navigation";
import { addActivity, addBudget, addOption, changeStage, saveAnswers, setOptionStatus, updateNegotiation, updateOpportunityContext, updateQualification } from "@/app/actions/opportunities";
import { generateRules, generateWithModel } from "@/app/actions/strategy";
import { completeTask, createTask } from "@/app/actions/tasks";
import { StrategyView } from "@/components/strategy-view";
import { Card, Collapsible, DateText, DaysAgo, Empty, ErrorNote, Field, PageHeader, Select, StageBadge } from "@/components/ui";
import { formatMinor, minorToDecimalString } from "@/domain/money";
import { budgetCheckFor } from "@/domain/strategy/engine";
import type { StrategyResult } from "@/domain/strategy/types";
import { ASK_RESPONSES, BEHAVIORS, CO_DECIDER_STATUS, CURRENCIES, labelOf, LOST_REASONS, OBJECTIONS, PIPELINE_LABELS, PIPELINE_STAGES, questionsFor, REFUSAL_SCOPES } from "@/domain/vocabulary";
import { requireSession } from "@/lib/auth";
import { buildSnapshot, loadCase } from "@/lib/case-assembler";
import { modelConfigured } from "@/lib/env";
import { daysSince, localInputValue, todayLocal } from "@/lib/form";
import type { InventoryRow, ProjectRow, TaskRow } from "@/lib/types";

// Model analysis can take a while; allow long server actions on Vercel.
export const maxDuration = 300;

const STAGE_OPTIONS = PIPELINE_STAGES.map((s) => ({ key: s, label: PIPELINE_LABELS[s] }));
const ACTIVITY_TYPES = ["call", "meeting", "visit", "message", "quotation", "note", "customer_response", "draft_sent"];
const FUNDING_OPTIONS = [{ key: "unknown", label: "Unknown" }, { key: "stated", label: "Stated by customer, not evidenced" }, { key: "confirmed", label: "Confirmed (proof seen)" }, { key: "financing", label: "Needs financing" }];
const READINESS_OPTIONS = [{ key: "unknown", label: "Unknown" }, { key: "exploring", label: "Exploring" }, { key: "evaluating", label: "Evaluating this option" }, { key: "ready", label: "Says they are ready to proceed" }, { key: "paused", label: "Asked to pause / not now" }, { key: "refused", label: "Explicitly declined" }];
const ROOM_OPTIONS = [{ key: "unknown", label: "Not confirmed with seller" }, { key: "yes", label: "Some authorized room / terms exist" }, { key: "no", label: "No room; price is final" }];
const YNU = [{ key: "unknown", label: "Unknown" }, { key: "yes", label: "Yes" }, { key: "no", label: "No" }];

/** The next rung for a one-click stage suggestion. Won is never suggested: it needs the business's own confirmation. */
function nextStageOf(stage: string): string | null {
  const working = ["new", "discovery", "qualified", "shortlist", "visit", "negotiation"];
  const i = working.indexOf(stage);
  if (i < 0 || i === working.length - 1) return null;
  return working[i + 1];
}

export default async function OpportunityPage(props: PageProps<"/opportunities/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, workspaceId } = await requireSession();
  const c = await loadCase(supabase, id);
  if (!c || c.opportunity.workspace_id !== workspaceId) notFound();
  const o = c.opportunity;
  const snapshot = buildSnapshot(c);
  // The same helper the engine uses (recorded fx applied), so the page and the strategy run never show two different verdicts.
  const { check: budget, fxStale } = budgetCheckFor(snapshot);
  const budgetText = fxStale ? `${budget.text} (rate older than 7 days)` : budget.text;

  const inventory = await supabase.from("inventory_items").select("*, projects(name, track)").eq("workspace_id", workspaceId).order("reference");
  const inventoryRows = ((inventory.data ?? []) as (InventoryRow & { projects: Pick<ProjectRow, "name" | "track"> | null })[]).filter((i) => i.projects?.track === o.track);
  const taskRows = c.tasks as TaskRow[];
  const openTasks = taskRows.filter((t) => t.state === "open");
  const latestValid = c.runs.find((r) => r.status !== "failed") ?? null;
  const latestResult = (latestValid?.result ?? null) as StrategyResult | null;
  const answers = Object.fromEntries(c.answers.map((a) => [a.question_key, a.answer_key ?? ""]));
  const aiReady = modelConfigured();
  const lastContactDays = daysSince(snapshot.latestActivityAt);
  const advanced = sp.advanced === "1";
  const nextStage = advanced ? nextStageOf(o.stage) : null;
  const today = todayLocal();
  const nowMs = new Date().getTime();
  const isTerminal = o.stage === "won" || o.stage === "lost";
  const offerCurrency = snapshot.offer?.currency ?? "EUR";
  const attemptCounts = c.attempts.reduce<Record<string, number>>((acc, a) => ((acc[a.result] = (acc[a.result] ?? 0) + 1), acc), {});

  // A won deal has no sales move: no strategy is generated for it (the engine treats "won" as a stop as well).
  const generateButtons = o.stage === "won" ? (
    <p className="text-xs text-neutral-500">Deal is won: no sales move applies and no strategy is generated. Hand over to after-sales / completion per your business process.</p>
  ) : (
    <div className="flex gap-2">
      <form action={generateRules}><input type="hidden" name="opportunity_id" value={o.id} /><button className="btn-secondary btn-sm" type="submit">Generate (rules)</button></form>
      <form action={generateWithModel}><input type="hidden" name="opportunity_id" value={o.id} /><button className="btn btn-sm" type="submit" disabled={!aiReady} title={aiReady ? "Full-case analysis including written notes" : "Set ANTHROPIC_API_KEY on the server to enable"}>Analyze full case with AI</button></form>
    </div>
  );

  return (
    <>
      <PageHeader
        title={o.title}
        subtitle={
          <>
            <Link href={`/customers/${o.customer_id}`} className="underline">{c.customer.full_name}</Link> · {o.track} · {c.customer.preferred_language} · {c.customer.purchase_logistics}
            {" · "}last contact: <DaysAgo days={lastContactDays} warnAfter={isTerminal || o.stage === "paused" ? 10_000 : 5} />
            {" · "}open tasks: <span className={openTasks.length === 0 && !isTerminal && o.stage !== "paused" ? "font-medium text-red-700" : ""}>{openTasks.length}{openTasks.length === 0 && !isTerminal && o.stage !== "paused" ? " (no next step)" : ""}</span>
          </>
        }
        actions={<StageBadge stage={o.stage} />}
      />
      <ErrorNote message={typeof sp.error === "string" ? sp.error : null} />
      {sp.saved && <div className="note-good mb-3">Saved.</div>}

      {advanced && (
        <div className="note-warn mb-3 flex flex-wrap items-center gap-3">
          <span>Attempt recorded as <strong>advanced</strong>.</span>
          {nextStage ? (
            <form action={changeStage} className="flex items-center gap-2">
              <input type="hidden" name="id" value={o.id} /><input type="hidden" name="stage" value={nextStage} />
              <input type="hidden" name="reason" value={`Advance recorded on ${today}`} />
              <button className="btn-secondary btn-sm" type="submit">Move to {PIPELINE_LABELS[nextStage as keyof typeof PIPELINE_LABELS]}?</button>
            </form>
          ) : o.stage === "negotiation" ? (
            <span>If the sale is confirmed per your business process, set the stage to Won in the <a href="#stage" className="underline">Pipeline stage</a> section. Won is never set automatically.</span>
          ) : null}
          <Link href={`/opportunities/${o.id}#strategy`} className="text-xs underline">Dismiss</Link>
        </div>
      )}

      {o.stage === "paused" && (
        <div className="note-warn mb-3">Paused until <strong>{o.paused_until ?? "no date recorded"}</strong>{o.stage_reason ? ` — reason: ${o.stage_reason}` : ""}. No new pitch before the agreed date; the re-contact task is in the task list.</div>
      )}
      {o.stage === "lost" && (
        <div className="note-bad mb-3">
          Lost — {labelOf(LOST_REASONS, o.lost_reason)} · {labelOf(REFUSAL_SCOPES, o.refusal_scope)} · contact preference: {o.contact_preference ?? "not recorded"} · revisit when: {o.revisit_condition ?? "not recorded"}{o.revisit_at ? ` · revisit on ${o.revisit_at}` : ""}
          {o.refusal_scope === "contact" && <div className="text-xs">The customer asked not to be contacted. Only inbound contact re-opens this.</div>}
        </div>
      )}

      {/* ---------------- Strategy: full width, first ---------------- */}
      <Card id="strategy" title="Strategy" actions={generateButtons} className="mb-4">
        {!aiReady && <p className="mb-2 text-xs text-neutral-500">AI analysis is unavailable (no server credentials). Rule-based strategy works without it and is labeled as such.</p>}
        {latestValid ? (
          <StrategyView run={latestValid} opportunityId={o.id} />
        ) : (
          <div className="space-y-2 text-sm">
            {o.stage !== "won" && <p>No strategy yet. Rule mode works with what is recorded now and lists exactly what to ask first; generate, then use the unknowns as the first-call agenda.</p>}
            {generateButtons}
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* ---------------- left: case inputs (collapsed) ---------------- */}
        <div className="space-y-4 xl:col-span-3">
          <Collapsible id="stage" title="Pipeline stage" open={advanced || o.stage === "paused" || o.stage === "lost"} summaryExtra={<>{PIPELINE_LABELS[o.stage as keyof typeof PIPELINE_LABELS] ?? o.stage}</>}>
            <form action={changeStage} className="grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="id" value={o.id} />
              <Field label="Stage"><Select name="stage" defaultValue={o.stage} options={STAGE_OPTIONS} /></Field>
              <Field label="Reason (required for lost/paused)"><input name="reason" className="input" defaultValue={o.stage_reason ?? ""} /></Field>
              <Field label="Paused until (required for paused)" hint="The customer's own agreed re-contact date; a task is created for it."><input name="paused_until" type="date" className="input" defaultValue={o.paused_until ?? ""} /></Field>
              <details className="sm:col-span-3 rounded-md border border-neutral-200 p-3" open={o.stage === "lost"}>
                <summary className="cursor-pointer text-sm font-medium">Lost details (required when moving to lost)</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <Field label="Lost reason"><Select name="lost_reason" defaultValue={o.lost_reason ?? ""} blank="Choose…" options={LOST_REASONS} /></Field>
                  <Field label="What exactly was refused"><Select name="refusal_scope" defaultValue={o.refusal_scope ?? "none"} options={REFUSAL_SCOPES} /></Field>
                  <Field label="Contact preference (customer's words)" hint="'Do not contact' is respected as a hard stop."><input name="contact_preference" className="input" defaultValue={o.contact_preference ?? ""} placeholder="Only if a completed unit under 200k appears" /></Field>
                  <Field label="What would have to change (revisit condition)" className="sm:col-span-2"><input name="revisit_condition" className="input" defaultValue={o.revisit_condition ?? ""} /></Field>
                  <Field label="Revisit on" hint="Required unless the customer asked not to be contacted."><input name="revisit_at" type="date" className="input" defaultValue={o.revisit_at ?? ""} /></Field>
                </div>
              </details>
              <div className="sm:col-span-3"><button className="btn-secondary btn-sm" type="submit">Change stage</button> <span className="text-xs text-neutral-500">Won means a completed sale per your business process, not a visit or unconfirmed reservation. Leaving paused/lost resets a paused/refused readiness to evaluating.</span></div>
            </form>
          </Collapsible>

          <Collapsible id="context" title="Deal context (current state)" summaryExtra={<>{o.readiness} · {o.current_objection ? labelOf(OBJECTIONS, o.current_objection) : "no objection"} · funding {o.funding_status}</>}>
            <form action={updateOpportunityContext} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={o.id} />
              <Field label="Title" className="sm:col-span-2"><input name="title" className="input" defaultValue={o.title} /></Field>
              <Field label="Track"><Select name="track" defaultValue={o.track} options={[{ key: "home", label: "Apartment / home" }, { key: "land", label: "Plot / land" }]} /></Field>
              <Field label="Customer readiness (stated)"><Select name="readiness" defaultValue={o.readiness} options={READINESS_OPTIONS} /></Field>
              <Field label="Current explicit objection"><Select name="current_objection" defaultValue={o.current_objection ?? ""} blank="None stated" options={OBJECTIONS} /></Field>
              <Field label="Funding status"><Select name="funding_status" defaultValue={o.funding_status} options={FUNDING_OPTIONS} /></Field>
              <Field label="Decision participants"><input name="decision_participants" className="input" defaultValue={o.decision_participants ?? ""} placeholder="Spouse; family adviser" /></Field>
              <Field label="Target timing (customer's words)"><input name="target_timing" className="input" defaultValue={o.target_timing ?? ""} /></Field>
              <Field label="Your desired immediate outcome" className="sm:col-span-2"><input name="desired_outcome" className="input" defaultValue={o.desired_outcome ?? ""} /></Field>
              <fieldset className="sm:col-span-2">
                <legend className="label">Resolved objections (answered and accepted by the customer; not re-raised, used for a close attempt)</legend>
                <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                  {OBJECTIONS.map((ob) => <label key={ob.key} className="flex items-center gap-2"><input type="checkbox" name="resolved_objections" value={ob.key} defaultChecked={(o.resolved_objections ?? []).includes(ob.key)} /> {ob.label}</label>)}
                </div>
              </fieldset>
              <div className="sm:col-span-2"><button className="btn" type="submit">Save context</button></div>
            </form>
          </Collapsible>

          <Collapsible id="qualification" title="Qualification (the facts a closer needs)" summaryExtra={<>{[o.target_decision_date ? `decide by ${o.target_decision_date}` : null, o.why_now ? "why-now recorded" : "why-now missing", o.must_haves ? "must-haves recorded" : "must-haves missing"].filter(Boolean).join(" · ")}</>}>
            <form action={updateQualification} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={o.id} />
              <Field label="Target decision date (customer's)"><input name="target_decision_date" type="date" className="input" defaultValue={o.target_decision_date ?? ""} /></Field>
              <Field label="Why now (customer's stated reason)"><input name="why_now" className="input" defaultValue={o.why_now ?? ""} /></Field>
              <Field label="Must-haves (deal-breakers)"><textarea name="must_haves" className="textarea" defaultValue={o.must_haves ?? ""} /></Field>
              <Field label="Nice-to-haves"><textarea name="nice_to_haves" className="textarea" defaultValue={o.nice_to_haves ?? ""} /></Field>
              <Field label="Competing options (incl. 'do nothing' / other asset class)"><input name="competing_options" className="input" defaultValue={o.competing_options ?? ""} /></Field>
              <Field label="Customer's own 'I'll proceed if …'"><input name="proceed_condition" className="input" defaultValue={o.proceed_condition ?? ""} /></Field>
              <Field label="Co-decider status"><Select name="co_decider_status" defaultValue={o.co_decider_status ?? "unknown"} options={CO_DECIDER_STATUS} /></Field>
              <Field label="Will visit before deciding?"><Select name="will_visit_before_deciding" defaultValue={o.will_visit_before_deciding ?? "unknown"} options={YNU} /></Field>
              <Field label="Funding source (savings, sale of another property, loan…)"><input name="funding_source" className="input" defaultValue={o.funding_source ?? ""} /></Field>
              <Field label="Funding timing (when funds are available)"><input name="funding_timing" className="input" defaultValue={o.funding_timing ?? ""} /></Field>
              <div className="sm:col-span-2"><button className="btn" type="submit">Save qualification</button> <span className="text-xs text-neutral-500">Stated budget is not available funding; record what the customer said, not what you assume.</span></div>
            </form>
          </Collapsible>

          <Collapsible id="negotiation" title="Negotiation position" summaryExtra={<>{o.negotiation_room === "no" ? "price final" : o.authorized_room_minor != null ? `authorized room ${formatMinor(o.authorized_room_minor, offerCurrency)}` : "authority not confirmed"}{o.counter_offer_minor != null ? ` · counter ${formatMinor(o.counter_offer_minor, o.counter_offer_currency)}` : ""}</>}>
            <div className="mb-3 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
              Offer: {snapshot.offer?.priceMinor != null ? formatMinor(snapshot.offer.priceMinor, snapshot.offer.currency) : "no preferred option / price"} · costs {snapshot.offer?.costsMinor != null ? formatMinor(snapshot.offer.costsMinor, snapshot.offer.currency) : "unknown"} · budget: {budgetText}
            </div>
            <form action={updateNegotiation} className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="id" value={o.id} />
              <Field label="Negotiation room (per seller)"><Select name="negotiation_room" defaultValue={o.negotiation_room} options={ROOM_OPTIONS} /></Field>
              <Field label="Customer's counter-offer"><input name="counter_offer" className="input" inputMode="decimal" defaultValue={minorToDecimalString(o.counter_offer_minor)} /></Field>
              <Field label="Counter-offer currency"><Select name="counter_offer_currency" defaultValue={o.counter_offer_currency ?? offerCurrency} options={CURRENCIES} /></Field>
              <Field label={`Authorized price room (${offerCurrency}, reduction from price)`} hint="Only what the seller authorized in writing. Blank = not confirmed."><input name="authorized_room" className="input" inputMode="decimal" defaultValue={minorToDecimalString(o.authorized_room_minor)} /></Field>
              <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-2"><input type="checkbox" name="authorized_in_writing" value="1" defaultChecked={o.authorized_room_minor != null} /> I hold the seller&apos;s written authorization for this room (required to save an amount)</label>
              <Field label="Authorized non-price terms (payment plan, fee sharing, furniture, unit/floor swap — only what is listed by the seller)" className="sm:col-span-3"><textarea name="authorized_terms" className="textarea" defaultValue={o.authorized_terms ?? ""} /></Field>
              <Field label="Concessions already given to this customer (never offered twice)" className="sm:col-span-3"><textarea name="concessions_given" className="textarea" defaultValue={o.concessions_given ?? ""} /></Field>
              <div className="sm:col-span-3"><button className="btn" type="submit">Save negotiation position</button> <span className="text-xs text-neutral-500">Any concession is traded for a dated commitment, never given unilaterally.</span></div>
            </form>
          </Collapsible>

          <Collapsible id="options" title={`Candidate properties (${c.options.length})`} summaryExtra={<>{snapshot.offer ? `preferred: ${snapshot.offer.reference}` : "no preferred option"}</>}>
            {c.options.length === 0 ? <Empty>No unit or plot attached yet.</Empty> : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {c.options.map((op) => {
                  const inv = op.inventory_items;
                  const price = op.quoted_price_minor ?? inv?.asking_price_minor ?? null;
                  const cur = op.quoted_currency ?? inv?.currency ?? null;
                  const costs = op.quoted_costs_minor ?? inv?.other_costs_minor ?? null;
                  return (
                    <li key={op.id} className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge ${op.status === "preferred" ? "badge-good" : op.status === "unavailable" || op.status === "rejected" ? "badge-bad" : ""}`}>{op.status}</span>
                        <Link href={`/projects/${inv?.project_id}`} className="font-medium hover:underline">{inv?.projects?.name} · {inv?.reference}</Link>
                        <span>{price != null ? formatMinor(price, cur) : "price n/a"}</span>
                        <span className="text-neutral-500">costs {costs != null ? formatMinor(costs, cur) : "unknown"}</span>
                        <span className="badge">{inv?.availability ?? "unknown"}{inv?.availability_count != null ? ` · ${inv.availability_count} left (${inv.availability_source ?? "no source"})` : ""}</span>
                        {inv?.checked_at && <span className="text-xs text-neutral-500">checked <DateText value={inv.checked_at} /></span>}
                        {op.quote_valid_until && <span className="text-xs text-neutral-500">valid until {op.quote_valid_until}{op.terms_source ? ` (${op.terms_source})` : " (no source — not usable)"}</span>}
                        {inv?.price_valid_until && <span className="text-xs text-neutral-500">price list valid until {inv.price_valid_until}</span>}
                      </div>
                      <form action={setOptionStatus} className="mt-1 flex gap-1">
                        <input type="hidden" name="opportunity_id" value={o.id} /><input type="hidden" name="option_id" value={op.id} />
                        <Select name="status" defaultValue={op.status} options={["candidate", "preferred", "rejected", "unavailable"]} />
                        <button className="btn-secondary btn-sm" type="submit">Set</button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
            <form action={addOption} className="mt-3 grid gap-2 border-t border-neutral-100 pt-3 sm:grid-cols-3">
              <input type="hidden" name="opportunity_id" value={o.id} />
              <Field label="Unit / plot" className="sm:col-span-3">
                {inventoryRows.length === 0 ? <Empty>No inventory for this track. <Link href="/projects" className="underline">Add units/plots to a project</Link>.</Empty> : (
                  <Select name="inventory_item_id" blank="Choose…" options={inventoryRows.map((i) => ({ key: i.id, label: `${i.projects?.name} · ${i.reference} · ${i.asking_price_minor != null ? formatMinor(i.asking_price_minor, i.currency) : "price n/a"} · ${i.availability}` }))} />
                )}
              </Field>
              <Field label="Quoted price (if different)"><input name="quoted_price" className="input" inputMode="decimal" /></Field>
              <Field label="Currency"><Select name="quoted_currency" blank="Use unit's" options={CURRENCIES} /></Field>
              <Field label="Quoted costs"><input name="quoted_costs" className="input" inputMode="decimal" /></Field>
              <Field label="Quote valid until"><input name="quote_valid_until" type="date" className="input" /></Field>
              <Field label="Terms source (required with a date)" hint="Written offer, price list… A deadline without a source is never used."><input name="terms_source" className="input" placeholder="Written offer of 12 Sep" /></Field>
              <Field label="Status"><Select name="status" defaultValue="candidate" options={["candidate", "preferred"]} /></Field>
              <div className="flex items-end sm:col-span-3"><button className="btn-secondary btn-sm" type="submit">Attach option</button></div>
            </form>
          </Collapsible>

          <Collapsible id="budget" title="Budget (this opportunity)" summaryExtra={<>{snapshot.budget ? `${formatMinor(snapshot.budget.amountMinor, snapshot.budget.currency)} · ${snapshot.budget.scope.replace(/_/g, " ")}` : "not recorded"}</>}>
            <div className={`mb-2 rounded-md px-3 py-2 text-sm ${budget.status === "gap" ? "bg-amber-50 text-amber-900" : budget.status === "fits" ? "bg-emerald-50 text-emerald-900" : "bg-neutral-100 text-neutral-700"}`}>{budgetText}</div>
            {c.budgets.length > 0 && (
              <ul className="mb-3 divide-y divide-neutral-100 text-sm">
                {c.budgets.slice(0, 3).map((b, i) => (
                  <li key={b.id} className="flex flex-wrap gap-2 py-1">
                    {i === 0 && <span className="badge badge-good">current</span>}
                    <span>{formatMinor(b.amount_minor, b.currency)}{b.amount_max_minor != null ? ` – ${formatMinor(b.amount_max_minor, b.currency)}` : ""}</span>
                    <span className="text-neutral-500">{b.scope.replace(/_/g, " ")} · {b.firmness}</span>
                    <span className="text-xs text-neutral-500">{b.source} · <DateText value={b.recorded_at} /></span>
                    {b.fx_rate != null && <span className="text-xs text-neutral-500">fx: 1 {b.currency} = {b.fx_rate} {b.fx_to_currency} on {b.fx_rate_date} ({b.fx_source})</span>}
                  </li>
                ))}
              </ul>
            )}
            <form action={addBudget} className="grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="opportunity_id" value={o.id} />
              <Field label="Amount"><input name="amount" className="input" inputMode="decimal" required /></Field>
              <Field label="Upper amount (optional)"><input name="amount_max" className="input" inputMode="decimal" /></Field>
              <Field label="Currency"><Select name="currency" defaultValue={offerCurrency} options={CURRENCIES} /></Field>
              <Field label="Scope"><Select name="scope" defaultValue="purchase_total" options={[{ key: "purchase_total", label: "Total purchase incl. costs" }, { key: "price_only", label: "Price only (costs excluded)" }, { key: "deposit", label: "Deposit / down payment" }, { key: "borrowing_capacity", label: "Borrowing capacity" }, { key: "development_total", label: "Total development funding" }, { key: "ongoing_affordability", label: "Ongoing affordability" }, { key: "unknown", label: "Scope unclear" }]} /></Field>
              <Field label="Firmness"><Select name="firmness" defaultValue="unknown" options={[{ key: "unknown", label: "Unknown" }, { key: "firm", label: "Firm ceiling (stated)" }, { key: "flexible", label: "Flexible (stated)" }]} /></Field>
              <Field label="Source"><input name="source" className="input" placeholder="Customer on call 12 Sep" /></Field>
              <details className="sm:col-span-3 rounded-md border border-neutral-200 p-3">
                <summary className="cursor-pointer text-sm font-medium">Record exchange-rate observation (only when budget and offer currencies differ)</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-4">
                  <Field label="Rate (1 budget currency = ? target)"><input name="fx_rate" className="input" inputMode="decimal" placeholder="36.42" /></Field>
                  <Field label="Target currency"><Select name="fx_to_currency" blank="Choose…" options={CURRENCIES} /></Field>
                  <Field label="Rate date"><input name="fx_rate_date" type="date" className="input" /></Field>
                  <Field label="Source"><input name="fx_source" className="input" placeholder="Central bank fixing / bank quote" /></Field>
                  <p className="text-xs text-neutral-500 sm:col-span-4">A recorded observation, labeled with date and source. The assistant never predicts rates; older than 7 days is flagged stale.</p>
                </div>
              </details>
              <div className="sm:col-span-3"><button className="btn-secondary btn-sm" type="submit">Record budget</button> <span className="text-xs text-neutral-500">Each entry is kept; the latest is current.</span></div>
            </form>
          </Collapsible>

          <Collapsible id="assessment" title="Structured assessment (customer's stated answers)" summaryExtra={<>{Object.values(answers).filter(Boolean).length}/{questionsFor(o.track).length} answered</>}>
            <form action={saveAnswers} className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="opportunity_id" value={o.id} /><input type="hidden" name="customer_id" value={o.customer_id} />
              {questionsFor(o.track).map((q, i) => (
                <Field key={q.key} label={`${i + 1}. ${q.label}`} hint={q.hint}><Select name={`q_${q.key}`} defaultValue={answers[q.key] ?? ""} blank="Not yet asked / unknown" options={q.options} /></Field>
              ))}
              <div className="sm:col-span-2"><button className="btn-secondary btn-sm" type="submit">Save answers</button> <span className="text-xs text-neutral-500">Changes are versioned; earlier answers are kept.</span></div>
            </form>
          </Collapsible>

          <Collapsible id="activity" title={`Activity and evidence (${c.activities.length})`} summaryExtra={<>last: {c.activities[0] ? <>{c.activities[0].type} · <DateText value={c.activities[0].occurred_at} /></> : "none"}</>}>
            <form action={addActivity} className="mb-4 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="opportunity_id" value={o.id} /><input type="hidden" name="customer_id" value={o.customer_id} />
              <Field label="Type"><Select name="type" defaultValue="call" options={ACTIVITY_TYPES} /></Field>
              <Field label="When (blank = now)"><input name="occurred_at" type="datetime-local" className="input" /></Field>
              <Field label="What happened" className="sm:col-span-2"><textarea name="narrative" className="textarea" /></Field>
              <Field label="Customer's exact words (quote)"><textarea name="direct_quote" className="textarea" /></Field>
              <Field label="Observed behavior (factual)"><textarea name="observation" className="textarea" /></Field>
              <Field label="Your interpretation (kept separate)" className="sm:col-span-2"><textarea name="interpretation" className="textarea" /></Field>
              <Field label="The ask you made (the commitment you asked for)"><input name="ask_made" className="input" placeholder="Shall we book the visit on Thursday?" /></Field>
              <Field label="Customer's answer to the ask"><Select name="ask_response" defaultValue="pending" options={ASK_RESPONSES} /></Field>
              <div className="sm:col-span-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {BEHAVIORS.map((b) => <label key={b.key} className="flex items-center gap-2"><input type="checkbox" name="behaviors" value={b.key} /> {b.label}</label>)}
              </div>
              <div className="sm:col-span-2"><button className="btn-secondary btn-sm" type="submit">Record activity</button></div>
            </form>
            {c.activities.length === 0 ? <Empty>Nothing recorded yet.</Empty> : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {c.activities.map((a) => (
                  <li key={a.id} className="py-2">
                    <div className="flex justify-between gap-2"><span><span className="badge mr-1">{a.type}</span>{a.behaviors.length > 0 && <span className="text-xs text-neutral-500">{a.behaviors.map((b) => labelOf(BEHAVIORS, b)).join(", ")}</span>}</span><DateText value={a.occurred_at} withTime /></div>
                    {a.narrative && <div className="whitespace-pre-wrap">{a.narrative}</div>}
                    {a.direct_quote && <div className="quote">{a.direct_quote}</div>}
                    {a.observation && <div className="text-neutral-700">Observed: {a.observation}</div>}
                    {a.interpretation && <div className="text-neutral-500">Interpretation: {a.interpretation}</div>}
                    {a.ask_made && <div className="text-xs text-neutral-700"><strong>Ask:</strong> {a.ask_made} → <span className={`badge ${a.ask_response === "yes" ? "badge-good" : a.ask_response === "no" ? "badge-bad" : ""}`}>{labelOf(ASK_RESPONSES, a.ask_response)}</span></div>}
                  </li>
                ))}
              </ul>
            )}
          </Collapsible>
        </div>

        {/* ---------------- right: history, attempts, tasks ---------------- */}
        <div className="space-y-4 xl:col-span-2">
          <Card id="tasks" title={`Follow-up tasks (${openTasks.length} open)`}>
            {openTasks.length === 0 && !isTerminal && o.stage !== "paused" && <div className="note-bad mb-2">No next step on this deal. Save the ask as a task or add one below.</div>}
            {taskRows.length === 0 ? <Empty>No tasks yet.</Empty> : (
              <ul className="mb-3 divide-y divide-neutral-100 text-sm">
                {taskRows.map((t) => (
                  <li key={t.id} className="py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className={t.state !== "open" ? "text-neutral-400 line-through" : "font-medium"}>{t.action}</div>
                        {t.purpose && <div className="text-xs text-neutral-500">{t.purpose}</div>}
                        {t.outcome && <div className="text-xs text-neutral-500">Outcome: {t.outcome}</div>}
                      </div>
                      <div className={`text-xs ${t.state === "open" && t.due_at && new Date(t.due_at).getTime() < nowMs ? "font-medium text-red-700" : ""}`}><DateText value={t.due_at} withTime /></div>
                    </div>
                    {t.state === "open" && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-neutral-600">Mark done (next step required)</summary>
                        <form action={completeTask} className="mt-1 grid gap-1 sm:grid-cols-2">
                          <input type="hidden" name="id" value={t.id} /><input type="hidden" name="back" value={`/opportunities/${o.id}`} />
                          <Field label="Outcome" className="sm:col-span-2"><input name="outcome" className="input" placeholder="What happened" /></Field>
                          <Field label="Next step"><input name="next_action" className="input" defaultValue={latestResult?.fallback.action ?? ""} /></Field>
                          <Field label="Due"><input name="due_at" type="datetime-local" className="input" defaultValue={localInputValue(3)} /></Field>
                          <input type="hidden" name="due_days" value="3" />
                          <label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" name="deal_closed" value="1" /> No next step: deal closed (won/lost/paused)</label>
                          <div className="sm:col-span-2"><button className="btn-secondary btn-sm" type="submit">Done</button></div>
                        </form>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <form action={createTask} className="grid gap-2 sm:grid-cols-4">
              <input type="hidden" name="opportunity_id" value={o.id} /><input type="hidden" name="customer_id" value={o.customer_id} />
              <Field label="Action" className="sm:col-span-2"><input name="action" className="input" required /></Field>
              <Field label="Due"><input name="due_at" type="datetime-local" className="input" defaultValue={localInputValue(1)} /></Field>
              <input type="hidden" name="due_days" value="1" />
              <div className="flex items-end"><button className="btn-secondary btn-sm" type="submit">Add task</button></div>
            </form>
          </Card>

          <Card id="attempts" title={`Angles tried (${c.attempts.length})`}>
            {c.attempts.length > 0 && <p className="mb-2 text-xs text-neutral-500">{Object.entries(attemptCounts).map(([k, v]) => `${k} ×${v}`).join(" · ")}</p>}
            {c.attempts.length === 0 ? <Empty>None recorded. Record what you actually said and how the customer responded (Strategy → Record attempt); failed angles are not repeated automatically.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-neutral-500"><tr><th className="py-1">Angle</th><th>Result</th><th>Customer response</th><th>When</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100 align-top">
                    {c.attempts.map((a) => (
                      <tr key={a.id}>
                        <td className="py-1">{a.angle_title}{a.wording_used && <details><summary className="cursor-pointer text-xs text-neutral-500">wording used</summary><div className="text-xs text-neutral-600">{a.wording_used}</div></details>}</td>
                        <td><span className={`badge ${a.result === "advanced" ? "badge-good" : a.result === "failed" ? "badge-bad" : ""}`}>{a.result}</span></td>
                        <td>{a.customer_response ?? "—"}</td>
                        <td><DateText value={a.attempted_at} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {c.runs.length > 1 && (
            <Card title="Strategy history">
              <ul className="divide-y divide-neutral-100 text-sm">
                {c.runs.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 py-1">
                    <DateText value={r.created_at} withTime />
                    <span className="badge">{r.generation_mode}</span>
                    <span className={`badge ${r.status === "valid" ? "badge-good" : r.status === "failed" ? "badge-bad" : "badge-warn"}`}>{r.status}{r.stale_reason ? `: ${r.stale_reason}` : ""}</span>
                    {r.error && <span className="text-xs text-red-700">{r.error}</span>}
                    {r.result != null && <Link href={`/opportunities/${o.id}/runs/${r.id}`} className="text-xs underline">view</Link>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
