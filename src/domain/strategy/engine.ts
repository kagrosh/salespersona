// Rule-based strategy engine (closer revision, judged). Deterministic and pure: uses snapshot.asOf, never Date.now().
// It uses structured facts only. It does NOT interpret free text; that is the model path's job.

import { budgetCheck, convertWithRecordedRate, formatMinor, type BudgetCheck } from "../money";
import { answerLabel, labelOf, OBJECTIONS, ONGOING_HOME_STAGES } from "../vocabulary";
import {
  BUDGET_CHECK,
  CHECK_L,
  COMMITMENT_STEP,
  GAP_QUESTION_L,
  LEVER_PLAYBOOKS,
  CONCERN_EN,
  CONCERN_TO_PLAYBOOK,
  CONCERN_TR,
  GOAL_EN,
  GOAL_TR,
  LOST_REASON_L,
  OBJECTION_TO_PLAYBOOK,
  OBJECTION_TR,
  PLAYBOOKS,
  STAGE_LADDER,
  UNIT_PITCH_PLAYBOOKS,
  type L,
  type Playbook,
} from "./playbooks";
import type { Angle, CaseSnapshot, CloseReadiness, StrategyResult } from "./types";

export const ENGINE_VERSION = "rules-2.2.0";

const FRESH_DAYS = 14; // price/availability check freshness
const FX_FRESH_DAYS = 7;
const SILENCE_AFTER_ASK_DAYS = 2;
const STALL_DAYS = 5;
const CADENCE = [2, 5, 10, 20];

type Lang = "en" | "tr";
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const pick = (lang: Lang, l: L) => (lang === "tr" ? l.tr : l.en);
const daysBetween = (fromIso: string, toIso: string) => Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS);
const dateOnly = (iso: string) => iso.slice(0, 10);
const calendarDays = (fromDate: string, toDate: string) => daysBetween(`${fromDate}T00:00:00.000Z`, `${toDate}T00:00:00.000Z`);

function fmtDate(isoDate: string, lang: Lang): string {
  const d = new Date(isoDate.length === 10 ? `${isoDate}T00:00:00Z` : isoDate);
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(d);
}

function money(minor: number, currency: string | null, lang: Lang): string {
  return formatMinor(minor, currency, lang === "tr" ? "tr-TR" : "en");
}

/** Two proposed slots on the next business days after asOf (proposals, never agreed). */
function proposedSlots(asOf: string, lang: Lang): { slotA: string; slotB: string; dateA: string; dateB: string } {
  const names = lang === "tr" ? ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const next = (from: Date) => {
    const n = new Date(from.getTime());
    do n.setUTCDate(n.getUTCDate() + 1);
    while (n.getUTCDay() === 0 || n.getUTCDay() === 6);
    return n;
  };
  const a = next(new Date(asOf));
  const b = next(a);
  return { slotA: `${names[a.getUTCDay()]} 11:00`, slotB: `${names[b.getUTCDay()]} 16:00`, dateA: a.toISOString().slice(0, 10), dateB: b.toISOString().slice(0, 10) };
}

/** Sentence split that only breaks on punctuation followed by whitespace, so "110.000 EUR" survives. */
const splitSentences = (s: string) => s.split(/(?<=[.!?])\s+(?=\S)/).map((p) => p.trim()).filter(Boolean);
const sentences = (s: string, n: number) => splitSentences(s).slice(0, n).join(" ").trim();
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const strip = (s: string) => s.replace(/[“”]/g, "").replace(/[ \t]{2,}/g, " ").trim();
const capFirst = (s: string, lang: Lang) => (s ? s.charAt(0).toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en") + s.slice(1) : s);

// ---------------------------------------------------------------------------
// Template filling
// ---------------------------------------------------------------------------
type Vals = Record<string, string | undefined>;

/** Fills {tokens}; capitalises a value that starts a sentence; reports missing tokens (rendered as "…"). */
export function fill(text: string, vals: Vals, lang: Lang = "en"): { text: string; missing: string[] } {
  const missing: string[] = [];
  const out = text.replace(/\{([a-zA-Z]+)\}/g, (_m, key: string, offset: number, whole: string) => {
    const v = vals[key];
    if (v == null) {
      missing.push(key);
      return "…";
    }
    if (v === "") return ""; // optional clause tokens render as nothing
    const atStart = offset === 0 || /[.!?]\s+$/.test(whole.slice(0, offset)) || /\n\s*$/.test(whole.slice(0, offset));
    return atStart ? capFirst(v, lang) : v;
  });
  return { text: out, missing };
}

type ValCtx = { budget: BudgetCheck; fittingAlt: CaseSnapshot["alternatives"][number] | null; missingCheck: string | null; evidenceText: string | null; recontact: boolean; gaps: string[] };

function unitForms(reference: string | null, track: "home" | "land", lang: Lang) {
  if (lang === "en") {
    const w = track === "home" ? "unit" : "plot";
    const u = reference ? `${w} ${reference}` : `this ${w}`;
    return { unit: u, unitAcc: u, unitDat: u, unitGen: u, unitYours: `that's your ${w}` };
  }
  const base = track === "home" ? "daire" : "parsel";
  const suf = base === "daire" ? { acc: "yi", dat: "ye", gen: "nin", yours: "niz" } : { acc: "i", dat: "e", gen: "in", yours: "iniz" };
  const head = reference ? `${reference} numaralı ${base}` : `bu ${base}`;
  return { unit: head, unitAcc: head + suf.acc, unitDat: head + suf.dat, unitGen: head + suf.gen, unitYours: `${base}${suf.yours} bu` };
}

function buildVals(c: CaseSnapshot, lang: Lang, ctx: ValCtx): Vals {
  const name = c.customer.name?.trim() ?? "";
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const surname = parts.length > 1 ? parts[parts.length - 1] : first;
  const track = c.track;
  const cur = c.offer?.currency ?? null;
  const forms = unitForms(c.offer?.reference ?? null, track, lang);
  const goalKey = c.answers.goal;
  const goal = goalKey ? ((lang === "tr" ? GOAL_TR[goalKey] : GOAL_EN[goalKey]) ?? answerLabel(track, "goal", goalKey)) : lang === "tr" ? "sizin için önemli olan" : "what you told me matters";
  const concernKey = c.answers.concern && c.answers.concern !== "none" ? c.answers.concern : undefined;
  const concern = concernKey ? ((lang === "tr" ? CONCERN_TR[concernKey] : CONCERN_EN[concernKey]) ?? answerLabel(track, "concern", concernKey)) : lang === "tr" ? "kalan tek soru" : "the one open question";
  const price = c.offer?.priceMinor != null ? money(c.offer.priceMinor, cur, lang) : lang === "tr" ? "mevcut fiyat" : "the current price";
  const costs = c.offer?.costsMinor != null ? (lang === "tr" ? ` + ${money(c.offer.costsMinor, cur, lang)} masraf` : ` + costs ${money(c.offer.costsMinor, cur, lang)}`) : lang === "tr" ? " (diğer masraflar teyit edilecek)" : " (other costs still to be confirmed)";
  const total = c.offer?.priceMinor != null && c.offer.costsMinor != null ? money(c.offer.priceMinor + c.offer.costsMinor, cur, lang) : lang === "tr" ? "toplam" : "the total";
  const budget = c.budget
    ? c.budget.amountMaxMinor != null && c.budget.amountMaxMinor !== c.budget.amountMinor
      ? `${money(c.budget.amountMinor, c.budget.currency, lang)}–${money(c.budget.amountMaxMinor, c.budget.currency, lang)}`
      : money(c.budget.amountMinor, c.budget.currency, lang)
    : lang === "tr"
      ? "çalıştığınız toplam"
      : "the total you're working with";
  const slots = proposedSlots(c.asOf, lang);
  const alt = ctx.fittingAlt ?? c.alternatives[0] ?? null;
  const altForms = alt ? unitForms(alt.reference, track, lang) : null;
  const priceDiff = alt && alt.priceMinor != null && c.offer?.priceMinor != null ? Math.abs(c.offer.priceMinor - alt.priceMinor) : null;
  const gap = ctx.budget.status === "gap" ? money(ctx.budget.gapMinor, ctx.budget.currency, lang) : priceDiff != null && priceDiff > 0 ? money(priceDiff, cur, lang) : priceDiff === 0 ? (lang === "tr" ? "aynı fiyat" : "the same price") : lang === "tr" ? "aradaki fark" : "the difference";
  const today = dateOnly(c.asOf);
  const gapQuestions = ctx.gaps.map((g) => GAP_QUESTION_L[g]).filter(Boolean).map((q) => pick(lang, q));
  const altChecked = alt?.checkedAt ? fmtDate(alt.checkedAt, lang) : lang === "tr" ? "son kontrol" : "the last check";
  const number = c.negotiation.counterOfferMinor != null ? money(c.negotiation.counterOfferMinor, c.negotiation.counterOfferCurrency ?? cur, lang) : lang === "tr" ? "rakamınız" : "your number";
  const lostReason = c.outcome.lostReason ? pick(lang, LOST_REASON_L[c.outcome.lostReason] ?? LOST_REASON_L.other) : pick(lang, LOST_REASON_L.other);
  const pauseDate = c.outcome.pausedUntil ?? c.outcome.revisitAt;
  const participants = c.qualification.decisionParticipants ?? (lang === "tr" ? "sizinle birlikte karar verecek kişi" : c.answers.decision === "joint" ? "your co-decider" : "the other decision-maker");
  const objectionKey = c.objection;
  const priceChangeClause = c.offer?.priceChangeNote ? (lang === "tr" ? `; satıcının notu şöyle: ${c.offer.priceChangeNote}` : `; the seller's note says: ${c.offer.priceChangeNote}`) : "";
  const stagePaymentClause = c.offer?.stagePaymentNote ? (lang === "tr" ? ` (belgelenmiş ödeme şartları: ${c.offer.stagePaymentNote})` : ` (the documented payment terms: ${c.offer.stagePaymentNote})`) : "";
  return {
    first: first || (lang === "tr" ? "" : "there"),
    salutation: name ? (lang === "tr" ? `Sayın ${name}` : first) : lang === "tr" ? "Sayın müşterimiz" : "there",
    salCall: name ? (lang === "tr" ? `Sayın ${surname}` : first) : lang === "tr" ? "Sayın müşterimiz" : "there",
    project: c.project?.name ?? (lang === "tr" ? "proje" : "the project"),
    ...forms,
    reference: c.offer?.reference,
    price,
    costs,
    total,
    budget,
    goal,
    concern,
    slotA: slots.slotA,
    slotB: slots.slotB,
    validUntil: c.offer?.validUntil ? fmtDate(c.offer.validUntil, lang) : c.offer?.priceValidUntil ? fmtDate(c.offer.priceValidUntil, lang) : lang === "tr" ? "belgede yazan tarih" : "the documented date",
    validSource: c.offer?.termsSource ?? (lang === "tr" ? "yazılı şartlar" : "the written terms"),
    alt: altForms ? altForms.unit : lang === "tr" ? "başka bir seçenek" : "another option",
    altProject: alt?.projectName ?? (lang === "tr" ? "aynı proje" : "the same project"),
    altPrice: alt && alt.priceMinor != null ? money(alt.priceMinor, alt.currency, lang) : lang === "tr" ? "kayıtlı fiyatı" : "its recorded price",
    altCount: String(c.alternatives.length),
    evidence: ctx.evidenceText ?? (ctx.recontact ? (lang === "tr" ? "benim tarafımda yeni bir şey yok" : "nothing new on my side") : lang === "tr" ? "birlikte doğrulayabileceğimiz belgeler" : "the documents we can verify together"),
    nextStep: pick(lang, COMMITMENT_STEP),
    objection: objectionKey ? (lang === "tr" ? (OBJECTION_TR[objectionKey] ?? objectionKey) : labelOf(OBJECTIONS, objectionKey)) : lang === "tr" ? "bu konu" : "this point",
    number,
    authorizedTerms: c.negotiation.authorizedTerms ?? (lang === "tr" ? "konuştuğumuz şartlar" : "the terms we discussed"),
    concessions: c.negotiation.concessionsGiven ?? (lang === "tr" ? "önceki düzenleme" : "the earlier concession"),
    lostReason,
    pauseDate: pauseDate ? fmtDate(pauseDate, lang) : lang === "tr" ? "anlaştığımız tarih" : "the date we agreed",
    revisitDate: c.outcome.revisitAt ? fmtDate(c.outcome.revisitAt, lang) : lang === "tr" ? "anlaştığımız tarih" : "the date we agreed",
    targetDate: c.qualification.targetDecisionDate ? fmtDate(c.qualification.targetDecisionDate, lang) : c.qualification.targetTiming ?? (lang === "tr" ? "ihtiyaç duyduğunuz tarih" : "the date you need it"),
    participants,
    count: c.offer?.availabilityCount != null ? String(c.offer.availabilityCount) : undefined,
    countSource: c.offer?.availabilitySource ?? undefined,
    checkedDate: c.offer?.checkedAt ? fmtDate(c.offer.checkedAt, lang) : lang === "tr" ? "son kontrol" : "the last check",
    priceValidUntil: c.offer?.priceValidUntil && c.offer.priceValidUntil >= today ? fmtDate(c.offer.priceValidUntil, lang) : undefined,
    priceChange: c.offer?.priceChangeNote ?? undefined,
    altCheckedDate: altChecked,
    gapCount: String(gapQuestions.length || ctx.gaps.length),
    gapQuestions: gapQuestions.length ? gapQuestions.join("; ") : lang === "tr" ? "bu alımın sizin için ne sağlaması gerekiyor" : "what must this purchase deliver for you",
    priceChangeClause,
    stagePaymentClause,
    days: c.latestActivityAt ? String(daysBetween(c.latestActivityAt, c.asOf)) : undefined,
    gap,
    mustHaves: c.qualification.mustHaves ?? (lang === "tr" ? "söylediğiniz temel şartlar" : "the essentials you told me"),
    proceedCondition: c.qualification.proceedCondition ?? undefined,
    missingCheck: ctx.missingCheck ?? (lang === "tr" ? "son açık kontrolü" : "the last open check"),
  };
}

// ---------------------------------------------------------------------------
// Public helpers (also used by the model adapter so the two paths cannot drift)
// ---------------------------------------------------------------------------
export function budgetCheckFor(c: CaseSnapshot): { check: BudgetCheck; usedFx: boolean; fxStale: boolean } {
  const base = {
    priceMinor: c.offer?.priceMinor ?? null,
    costsMinor: c.offer?.costsMinor ?? null,
    priceCurrency: c.offer?.currency ?? null,
    budgetMinor: c.budget?.amountMinor ?? null,
    budgetCurrency: c.budget?.currency ?? null,
    budgetScope: c.budget?.scope ?? null,
  };
  const fx = c.budget?.fx ?? null;
  if (c.budget && c.offer?.currency && c.budget.currency !== c.offer.currency && fx && fx.toCurrency === c.offer.currency) {
    const converted = convertWithRecordedRate(c.budget.amountMinor, fx.rate);
    const check = budgetCheck({ ...base, budgetMinor: converted, budgetCurrency: c.offer.currency });
    const fxStale = daysBetween(fx.date, c.asOf) > FX_FRESH_DAYS;
    return { check: { ...check, text: `${check.text} (budget converted at the recorded rate ${fx.rate} on ${fx.date}${fx.source ? `, ${fx.source}` : ""})` } as BudgetCheck, usedFx: true, fxStale };
  }
  return { check: budgetCheck(base), usedFx: false, fxStale: false };
}

export function qualificationGapsFor(c: CaseSnapshot): string[] {
  const gaps: string[] = [];
  if (!c.answers.goal) gaps.push("Main purchase goal");
  if (!c.budget) gaps.push("Budget (amount, scope, firmness)");
  if (!c.answers.decision && !c.qualification.decisionParticipants && c.qualification.coDeciderStatus === "unknown") gaps.push("Who decides (participants / co-decider)");
  if (!c.qualification.targetDecisionDate && !c.qualification.targetTiming) gaps.push("Decision date / timeline");
  if (c.funding === "unknown" && !c.fundingSource) gaps.push("Funding source and timing");
  if (!c.qualification.whyNow) gaps.push("Why now");
  if (!c.qualification.mustHaves) gaps.push("Must-haves");
  return gaps;
}

export function closeReadinessFor(c: CaseSnapshot): { level: CloseReadiness; missing: string[]; firmGap: boolean } {
  const { check } = budgetCheckFor(c);
  const firmGap = isFirmGap(c, check);
  if (isContactRefusal(c) || isPauseActive(c)) return { level: "stopped", missing: [], firmGap };
  if (["lost", "paused", "won"].includes(c.pipelineStage)) return { level: "advance", missing: [`opportunity is ${c.pipelineStage}; only win-back / re-engage applies`], firmGap };
  const missing: string[] = [];
  // A questionnaire 'offer' answer counts as readiness only while the customer is evaluating; a later explicit readiness wins.
  const ready = c.readiness === "ready" || (c.answers.stage === "offer" && c.readiness === "evaluating");
  if (!c.offer) missing.push("no property option attached");
  else {
    if (c.offer.availability !== "available") missing.push(c.offer.availability === "unknown" ? "availability not checked" : `unit is ${c.offer.availability}`);
    else if (!c.offer.checkedAt || daysBetween(c.offer.checkedAt, c.asOf) > FRESH_DAYS) missing.push("availability check older than 14 days");
    if (c.offer.costsMinor == null && c.budget?.scope !== "price_only") missing.push("complete cost list unknown");
  }
  if (check.status === "unavailable" || check.status === "mismatch") missing.push(BUDGET_CHECK);
  if (c.funding === "unknown" || c.funding === "stated") missing.push(c.funding === "stated" ? "funding stated but not evidenced" : "funding unknown");
  if (c.funding === "financing" && !c.fundingTiming) missing.push("financing timing not recorded");
  const jointDecision = c.answers.decision ? c.answers.decision !== "alone" : c.qualification.coDeciderStatus !== "none";
  if (jointDecision && !["none", "aligned"].includes(c.qualification.coDeciderStatus)) missing.push(c.qualification.coDeciderStatus === "objecting" ? "co-decider is objecting" : "co-decider not yet aligned");
  if (isScopedRefusal(c)) missing.push(`customer refused this ${c.outcome.refusalScope}`);
  if (c.objection || firmGap || isScopedRefusal(c) || (c.offer && (c.offer.availability === "sold" || c.offer.availability === "reserved"))) return { level: "advance", missing, firmGap };
  if (ready) return { level: missing.length === 0 ? "close_now" : "close_conditional", missing, firmGap };
  const trial = c.readiness === "evaluating" && (["shortlist", "visit", "negotiation"].includes(c.pipelineStage) || c.latestActivityType === "visit" || c.behaviors.includes("positive"));
  return { level: trial ? "trial_close" : "advance", missing, firmGap };
}

function isFirmGap(c: CaseSnapshot, check: BudgetCheck): boolean {
  if (check.status !== "gap" || c.budget?.firmness === "flexible") return false;
  // A gap against the lower amount of a stated range is not a hard gap when the KNOWN total fits the upper amount.
  // Unknown costs are never treated as zero, so they cannot waive a gap.
  if (c.budget?.amountMaxMinor != null && c.offer?.priceMinor != null && c.offer.costsMinor != null && c.offer.currency === c.budget.currency) {
    if (c.offer.priceMinor + c.offer.costsMinor <= c.budget.amountMaxMinor) return false;
  }
  return true;
}
const isContactRefusal = (c: CaseSnapshot) => c.outcome.refusalScope === "contact" || (c.readiness === "refused" && c.outcome.refusalScope === "none");
const isScopedRefusal = (c: CaseSnapshot) => c.outcome.refusalScope === "unit" || c.outcome.refusalScope === "project";
/** The re-contact date: paused_until, or revisit_at only while the deal is actually paused/lost (a leftover date must not re-engage a live deal). */
function pauseDateOf(c: CaseSnapshot): string | null {
  return c.outcome.pausedUntil ?? (c.pipelineStage === "paused" || c.pipelineStage === "lost" ? c.outcome.revisitAt : null);
}
/** A pause is explicit state; an old questionnaire answer never overrides a later readiness statement or a live negotiation. */
function isPaused(c: CaseSnapshot): boolean {
  if (c.readiness === "paused" || c.pipelineStage === "paused") return true;
  return c.answers.stage === "pause" && !["ready", "evaluating"].includes(c.readiness) && c.pipelineStage !== "negotiation";
}
function isPauseActive(c: CaseSnapshot): boolean {
  if (!isPaused(c)) return false;
  const d = pauseDateOf(c);
  return !d || d > dateOnly(c.asOf);
}
const isPauseEnded = (c: CaseSnapshot) => isPaused(c) && !isPauseActive(c);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export function generateStrategy(c: CaseSnapshot): StrategyResult {
  const lang: Lang = c.customer.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
  const today = dateOnly(c.asOf);
  const { check: budget, usedFx, fxStale } = budgetCheckFor(c);
  const firmGap = isFirmGap(c, budget);
  const ongoing = c.track === "home" && !!c.project?.stage && ONGOING_HOME_STAGES.includes(c.project.stage);
  const b = new Set(c.behaviors);
  const evidenceIds = [...c.quotes.map((q) => q.id), ...c.narratives.map((n) => n.id), ...c.evidence.map((e) => e.id), ...c.asks.map((a) => a.id), ...(c.budget ? [c.budget.id] : []), ...(c.offer ? [c.offer.optionId] : [])];
  const quoteIds = c.quotes.map((q) => q.id);
  const verified = c.evidence.filter((e) => e.status === "verified");
  const scopedRefusal = isScopedRefusal(c);

  // Recorded changes newer than a reference point (loss, or the last customer response for re-engagement).
  const newerThan = (ref: string | null) => ({
    alts: ref ? c.alternatives.filter((a) => a.createdAt > ref) : [],
    verified: ref ? verified.filter((e) => (e.createdAt ?? e.sourceDate ?? "") > ref) : [],
  });
  const lostAt = c.outcome.lostAt;
  const sinceLoss = newerThan(lostAt);
  const sinceResponse = newerThan(c.latestCustomerResponseAt ?? c.latestActivityAt);
  const altLine = (a: CaseSnapshot["alternatives"][number], l: Lang) => {
    const u = unitForms(a.reference, c.track, l).unit;
    const price = a.priceMinor != null ? money(a.priceMinor, a.currency, l) : null;
    const checked = a.checkedAt ? fmtDate(a.checkedAt, l) : null;
    if (l === "tr") return `${a.projectName} projesinde ${u}${price ? ` (${price})` : ""}${checked ? ` ${checked} tarihli kontrole göre müsait` : " kayıtlarımıza eklendi"}`;
    return `${u} in ${a.projectName}${price ? ` at ${price}` : ""}${checked ? ` is available as of the check on ${checked}` : " has been added to your options"}`;
  };
  const changeTextFor = (l: Lang, ch: { alts: typeof c.alternatives; verified: typeof verified }): string | null => {
    const bits: string[] = [];
    if (ch.verified.length) bits.push(ch.verified.slice(0, 2).map((e) => e.statement).join("; "));
    if (ch.alts.length) bits.push(altLine(ch.alts[0], l));
    // An undated price note is never presented as "what changed"; it stays a live-deal lever only.
    return bits.length ? bits.join("; ") : null;
  };
  const generalEvidence = (): string | null => (verified.length ? verified.slice(0, 2).map((e) => e.statement).join("; ") : null);

  // Documented, sourced levers: only on an available, freshly checked unit
  const available = c.offer?.availability === "available";
  const checkFresh = !!c.offer?.checkedAt && daysBetween(c.offer.checkedAt, c.asOf) <= FRESH_DAYS;
  const deadlineLive = available && checkFresh && !!c.offer?.validUntil && !!c.offer.termsSource && c.offer.validUntil >= today;
  const deadlineExpired = !!c.offer?.validUntil && c.offer.validUntil < today;
  const deadlineUnsourced = !!c.offer?.validUntil && !c.offer.termsSource && c.offer.validUntil >= today;
  const priceListDateLive = available && !!c.offer?.priceValidUntil && c.offer.priceValidUntil >= today;
  const priceNoteLive = available && !!c.offer?.priceChangeNote;
  const priceListLive = priceListDateLive || priceNoteLive;
  const scarcityDocumented = available && checkFresh && c.offer?.availabilityCount != null && !!c.offer.availabilitySource;
  const slots = proposedSlots(c.asOf, lang);
  const deadlineFitA = !c.offer?.validUntil || slots.dateA <= c.offer.validUntil;
  const deadlineFitB = !c.offer?.validUntil || slots.dateB <= c.offer.validUntil;

  // Negotiation numbers (same currency only)
  const cur = c.offer?.currency ?? null;
  const counter = c.negotiation.counterOfferMinor != null && (c.negotiation.counterOfferCurrency ?? cur) === cur ? c.negotiation.counterOfferMinor : null;
  const floor = c.negotiation.authorizedRoomMinor != null && c.offer?.priceMinor != null ? c.offer.priceMinor - c.negotiation.authorizedRoomMinor : null;
  const withinAuthority = counter != null && floor != null && counter >= floor;
  const counterAllIn = counter != null && c.offer?.costsMinor != null ? counter + c.offer.costsMinor : null;
  const allInFits = !(c.budget?.firmness === "firm" && c.budget.scope === "purchase_total" && counterAllIn != null && counterAllIn > (c.budget.amountMaxMinor ?? c.budget.amountMinor));
  const priceObjection = c.objection === "price" || c.objection === "cash_discount";
  const priceContest = priceObjection || b.has("discount") || firmGap;
  const fittingAlt =
    c.alternatives.find((a) => {
      if (a.priceMinor == null || !c.budget || a.currency !== c.budget.currency) return false;
      return a.priceMinor <= (c.budget.amountMaxMinor ?? c.budget.amountMinor);
    }) ?? null;
  const completedAlts = c.alternatives.filter((a) => a.projectStage && !ONGOING_HOME_STAGES.includes(a.projectStage));

  // Time and contact
  const daysSinceLastContact = c.latestActivityAt ? daysBetween(c.latestActivityAt, c.asOf) : null;
  const lastResponseAt = c.latestCustomerResponseAt;
  const pendingAsk = c.asks.find((a) => (a.response === "pending" || a.response == null) && (!lastResponseAt || a.at > lastResponseAt)) ?? null;
  const daysSinceAsk = pendingAsk ? daysBetween(pendingAsk.at, c.asOf) : null;
  const touchesSinceResponse =
    c.narratives.filter((n) => ["call", "message", "quotation", "draft_sent", "meeting"].includes(n.type) && (!lastResponseAt || n.at > lastResponseAt)).length +
    c.asks.filter((a) => (!lastResponseAt || a.at > lastResponseAt) && !c.narratives.some((n) => n.id === a.id)).length;
  const outboundLast = c.latestActivityType != null && ["call", "message", "quotation", "draft_sent"].includes(c.latestActivityType) && (!lastResponseAt || (c.latestActivityAt ?? "") > lastResponseAt);
  const silent =
    !isPaused(c) &&
    c.pipelineStage !== "lost" &&
    !scopedRefusal &&
    ((pendingAsk != null && (daysSinceAsk ?? 0) >= SILENCE_AFTER_ASK_DAYS) ||
      (outboundLast && (daysSinceLastContact ?? 0) >= STALL_DAYS) ||
      (outboundLast && touchesSinceResponse >= 2 && (daysSinceLastContact ?? 0) >= SILENCE_AFTER_ASK_DAYS));
  const visitPending = c.latestActivityType === "visit" && c.readiness !== "ready" && !c.objection && (daysSinceLastContact ?? 0) <= 7 && !scopedRefusal;

  const readinessInfo = closeReadinessFor(c);
  let closeReadiness = readinessInfo.level;
  const missingForClose = [...readinessInfo.missing];
  const qualificationGaps = qualificationGapsFor(c);
  const sellerChecks = missingForClose.filter((m) => CHECK_L[m]);
  const fundingChecks = missingForClose.filter((m) => /funding|financing/.test(m));
  const coDeciderCheck = missingForClose.some((m) => /co-decider/.test(m));
  const budgetCheckMissing = missingForClose.includes(BUDGET_CHECK);

  // ---- fit issues, unknowns, stale ------------------------------------------------
  const fitIssues: string[] = [];
  const unknowns: StrategyResult["unknowns"] = [];
  const staleInputs: string[] = [];
  const notes: string[] = [];

  if (deadlineExpired) fitIssues.push(`Quote validity ${c.offer?.validUntil} has expired. Do not use it as urgency; obtain current terms.`);
  if (deadlineUnsourced) unknowns.push({ fact: `Terms validity ${c.offer?.validUntil} has no recorded source; it cannot be stated to the customer as a deadline.`, suggestedTask: "Record where the validity date comes from (written offer, price list) on the option." });
  if (c.offer?.availability === "sold") fitIssues.push("The selected unit/plot is recorded as sold. Any unit-specific close is invalid; present verified alternatives.");
  if (c.offer?.availability === "reserved") fitIssues.push("The selected unit/plot is reserved by another party. Confirm with the seller whether a backup reservation is possible before any commitment request.");
  if (scopedRefusal) fitIssues.push(`Customer refused this ${c.outcome.refusalScope}. Do not re-pitch it; present alternatives or record Lost.`);
  if (!c.offer) unknowns.push({ fact: "No candidate property is attached to this opportunity.", suggestedTask: "Attach at least one unit/plot option with its current price." });
  if (budget.status === "unavailable" || budget.status === "mismatch") unknowns.push({ fact: budget.text, suggestedTask: c.budget && c.offer?.currency && c.budget.currency !== c.offer.currency ? "Record an exchange-rate observation (rate, date, source) on the budget, or a budget in the offer currency." : "Record price, budget, currency and budget scope on the same basis." });
  if (usedFx && fxStale) staleInputs.push("recorded exchange rate older than 7 days");
  if (c.offer && c.offer.costsMinor == null && c.budget && (budget.status === "headroom_partial" || budget.status === "gap" || budget.status === "fits")) unknowns.push({ fact: "Other acquisition costs are unknown; treat them as unknown, not zero.", suggestedTask: "Get the complete cost list from the seller/notary." });
  if (c.funding === "unknown" || c.funding === "stated") {
    unknowns.push({ fact: `Funding is ${c.funding === "stated" ? "stated but not evidenced" : "unknown"}. A stated budget is not proof of available funds.`, suggestedTask: "Ask how the purchase will be funded, when funds are available, and what evidence exists." });
    if (c.funding === "stated") staleInputs.push("funding evidence");
  }
  if (c.offer && c.offer.availability === "unknown") {
    unknowns.push({ fact: "Availability of the unit/plot has not been checked.", suggestedTask: "Confirm availability with the seller and record the check date." });
    staleInputs.push("availability");
  }
  if (c.offer?.checkedAt && !checkFresh) staleInputs.push(`price/availability last checked ${daysBetween(c.offer.checkedAt, c.asOf)} days ago`);
  if (c.track === "land" && c.project && c.project.permittedUseStatus !== "documented" && (["develop", "build"].includes(c.answers.goal ?? "") || c.objection === "feasibility")) {
    fitIssues.push(`Marketed category “${c.project.category ?? "plot"}” is not documented permitted use (${c.project.permittedUseStatus}). Do not state that the intended construction is approved.`);
  }
  if (ongoing && c.project && c.project.milestonesStatus !== "documented") unknowns.push({ fact: `Ongoing project: delivery milestones are ${c.project.milestonesStatus}. Delivery claims stay unverified.`, suggestedTask: "Obtain documented milestones and delivery terms from the developer." });
  if (c.project && !c.project.location) unknowns.push({ fact: "Property location/jurisdiction not recorded; no legal, tax or residency claims can be made.", suggestedTask: "Record the property location and jurisdiction." });
  const unverified = c.evidence.filter((e) => e.status === "supplied" || e.status === "unverified" || e.status === "disputed");
  if (unverified.length) unknowns.push({ fact: `${unverified.length} project claim(s) are supplied/unverified/disputed and must not be presented as facts.`, suggestedTask: "Verify or drop the claims most relevant to this customer's concern." });
  if (c.evidence.some((e) => e.status === "expired")) staleInputs.push("expired project evidence");
  if (c.negotiation.room === "yes" && c.negotiation.authorizedRoomMinor == null && !c.negotiation.authorizedTerms) unknowns.push({ fact: "Negotiation room is recorded but nothing specific is authorized; the engine cannot propose terms it cannot cite.", suggestedTask: "Record what the seller authorized in writing: amount and/or non-price terms, with date and source." });
  if (priceContest && counter == null && c.objection !== "cash_discount") unknowns.push({ fact: "The customer has not named the number they would sign at; 'too expensive' is not a number.", suggestedTask: "Get the number and record it as the counter-offer with date." });
  if (c.objection === "cash_discount" && c.funding !== "confirmed") unknowns.push({ fact: "Cash is claimed but not evidenced.", suggestedTask: "Obtain proof of funds before trading on speed with the seller." });
  if (c.objection === "legal_residency" && !verified.some((e) => /title|tapu|residen|citizen|eligib|permit/i.test(e.statement))) fitIssues.push("Legal/residency question with no verified record: do not answer it yourself; obtain the written answer from a licensed source.");
  if (c.objection === "fees" && c.offer?.costsMinor == null) unknowns.push({ fact: "Fees are the objection and the cost list is unknown.", suggestedTask: "Obtain the complete itemised cost list today before discussing the total." });
  if (c.objection === "currency_risk" && !c.budget?.fx) unknowns.push({ fact: "Currency risk raised and no recorded rate observation exists.", suggestedTask: "Ask the seller which currency terms are authorized; record any rate used with date and source." });
  if (c.objection === "only_completed" && completedAlts.length === 0) unknowns.push({ fact: "Customer only buys completed property; no completed alternative is attached.", suggestedTask: "Search inventory for completed units meeting the essentials and attach them; if none, say so plainly." });
  if (b.has("send_info") && !c.openTasks.some((t) => t.dueAt && daysBetween(c.asOf, t.dueAt) <= 7 && daysBetween(c.asOf, t.dueAt) >= 0)) unknowns.push({ fact: "Information was requested but no review step is booked; sending it without a date is a continuation, not an advance.", suggestedTask: "Book the fifteen-minute review before sending the pack." });
  if (c.openTasks.length === 0 && !["won", "lost"].includes(c.pipelineStage)) notes.push("No open task on this deal. A strategy without a dated next step is not a plan: save the primary move as a task.");
  if (c.qualification.desiredOutcome && missingForClose.length) notes.push(`Your desired outcome “${c.qualification.desiredOutcome}” is blocked by: ${missingForClose.join("; ")}. The ask below is the step that unlocks it.`);
  if (c.qualification.proceedCondition) notes.push(`Customer's own condition to proceed: “${c.qualification.proceedCondition}”. Close on it once it is met.`);
  if (c.negotiation.authorizedRoomMinor != null) notes.push("Salesperson-only: the seller's written price authorization is on file. Never quote below it and never reveal it; the customer hears only their own number.");
  if (withinAuthority && !allInFits && counterAllIn != null) unknowns.push({ fact: `Counter ${money(counter!, cur, "en")} + recorded costs ${money(c.offer!.costsMinor!, cur, "en")} = ${money(counterAllIn, cur, "en")} exceeds the firm all-in budget ${money(c.budget!.amountMaxMinor ?? c.budget!.amountMinor, c.budget!.currency, "en")}.`, suggestedTask: "Confirm whether the customer's number is price-only (costs on top) or all-in before closing on it." });

  // ---- hard stops -----------------------------------------------------------------
  const valsFor = (l: Lang, evidenceText: string | null, missingCheck: string | null) => buildVals(c, l, { budget, fittingAlt, missingCheck, evidenceText, recontact: false, gaps: qualificationGaps });
  if (isContactRefusal(c)) {
    return stopResult(c, lang, "The customer asked not to be contacted.", {
      action: "Record the outcome and the contact preference. Move the opportunity to Lost with the reason if not already. No further contact.",
      trigger: "Only the customer contacting you reopens this.",
      draft: null,
      qualificationGaps,
      evidenceIds,
      dueInDays: 0,
    });
  }
  if (isPauseActive(c)) {
    const pd = pauseDateOf(c);
    const v = valsFor(lang, null, null);
    const draft = pd
      ? fill(pick(lang, { en: "Hi {first}, as agreed I'll step back until {pauseDate} and come back to you then on {project}. If anything changes on your side before that, you know where I am.", tr: "Merhaba {salutation}, anlaştığımız gibi {pauseDate} tarihine kadar geri çekiliyorum; {project} konusuna o zaman dönerim. Bu arada tarafınızda bir şey değişirse beni bulabilirsiniz." }), v, lang)
      : fill(pick(lang, { en: "Understood, {first}, I'll step back. So I don't guess: would you like me to check in again, and if so when? Or would you rather reach out yourself when the time is right? Either is fine.", tr: "Anladım {salutation}, geri çekiliyorum. Tahmin etmemek için soruyorum: sizinle tekrar iletişime geçmemi ister misiniz, isterseniz ne zaman? Yoksa zamanı geldiğinde siz mi ulaşmak istersiniz? İkisi de uygun." }), v, lang);
    return stopResult(c, lang, pd ? `The customer asked to pause until ${pd}.` : "The customer asked to pause; no re-contact date is recorded.", {
      action: pd ? `Respect the pause. The re-contact task is due on ${pd}; do nothing before it unless the customer reaches out.` : "The customer asked to pause but no re-contact date is recorded. Ask for the date with one message, record it in Paused until, and save the re-contact task.",
      trigger: pd ? `The agreed date ${pd}, or the customer contacting you earlier.` : "The customer's answer on a re-contact date.",
      draft: {
        text: draft.text,
        opener: pick(lang, { en: `${v.first}, one question and I'll let you go: do you want me to come back to you at some point, or leave it with you?`, tr: `${v.salCall}, tek soru sorup bırakacağım: bir ara size döneyim mi, yoksa sizde mi kalsın?` }),
        ask: pd ? pick(lang, { en: "None before the agreed date.", tr: "Anlaşılan tarihten önce yok." }) : pick(lang, { en: "Do you want me to come back to you, and if so when?", tr: "Size tekrar döneyim mi; isterseniz ne zaman?" }),
      },
      qualificationGaps,
      evidenceIds,
      dueInDays: pd ? Math.max(0, calendarDays(today, pd)) : 1,
    });
  }
  if (c.pipelineStage === "won") {
    return stopResult(c, lang, "Deal is won; no sales move applies.", {
      action: "Hand over to after-sales / completion tasks per the business process; nothing to send.",
      trigger: "Only a new opportunity for this customer.",
      draft: null,
      qualificationGaps,
      evidenceIds,
      dueInDays: 0,
    });
  }
  const revisitDue = !!c.outcome.revisitAt && c.outcome.revisitAt <= today;
  let lostChanged = false;
  if (c.pipelineStage === "lost") {
    const r = c.outcome.lostReason;
    const newFit = sinceLoss.alts.some((a) => fittingAlt?.optionId === a.optionId);
    const newOtherProject = sinceLoss.alts.some((a) => a.projectId && a.projectId !== c.project?.id);
    if (scopedRefusal) lostChanged = sinceLoss.alts.length > 0;
    else if (r === "price") lostChanged = newFit;
    else if (r === "product" || r === "location") lostChanged = newOtherProject;
    else if (r === "competitor") lostChanged = sinceLoss.verified.length > 0 || newFit;
    else if (r === "trust") lostChanged = sinceLoss.verified.length > 0;
    else lostChanged = false; // timing, financing, no_response, other: only the agreed revisit date justifies contact
    if (!lostChanged && !revisitDue) {
      return stopResult(c, lang, `Lost (${r ?? "reason not recorded"}) and no recorded change addresses it.`, {
        action: "Do not contact yet. Set a watch task: re-check inventory and seller terms, and attach any option that addresses the lost reason. Contact only with a recorded change dated after the loss, or on the agreed revisit date.",
        trigger: "A new option, a price/availability record change, verified evidence dated after the loss, or the recorded revisit date.",
        draft: null,
        qualificationGaps,
        evidenceIds,
        dueInDays: 30,
      });
    }
  }

  // ---- hypotheses -----------------------------------------------------------------
  const hypotheses: StrategyResult["hypotheses"] = [];
  const H = (interpretation: string, alternatives: string[], q: L) => hypotheses.push({ interpretation, evidenceIds: quoteIds, alternatives, questionToTest: pick(lang, q) });
  if (b.has("discount") || c.objection === "price") H("Price resistance", ["firm budget limit", "a competing offer", "doubt about value", "routine negotiation"], { en: "Is it the amount you can commit, or how this compares with alternatives?", tr: "Mesele ayırabileceğiniz tutar mı, yoksa alternatiflerle kıyaslama mı?" });
  if (b.has("delay") || c.objection === "no_hurry" || c.objection === "think_it_over") H("Postponement", ["waiting on information", "waiting on another person", "timing or funding not ready", "interest has faded"], { en: "If the open question were answered today, what would you do next?", tr: "Açık soru bugün yanıtlansaydı, sonraki adımınız ne olurdu?" });
  if (b.has("returns")) H("Return focus", ["income is the real goal", "testing the salesperson's numbers", "comparing with another asset class"], { en: "Which outcome matters most: income, resale value or the balance?", tr: "En çok hangisi önemli: gelir mi, yeniden satış değeri mi, yoksa dengesi mi?" });
  if (b.has("others") || c.objection === "approval" || (c.answers.decision && c.answers.decision !== "alone")) H("Shared decision", ["genuine co-decision", "using the other person as a delay", "the other person has different criteria"], { en: "What would they need answered to decide?", tr: "Karar vermeleri için hangi soruların cevaplanması gerekir?" });
  if (b.has("documents") || c.objection === "trust" || c.objection === "developer_trust") H("Information trust", ["normal diligence", "a specific past bad experience", "a claim that sounded too good"], { en: "Which single fact would you most want verified, and by whom?", tr: "En çok hangi tek bilginin, kim tarafından doğrulanmasını istersiniz?" });
  if (c.objection === "market_wait") H("Price expectation", ["genuine market view", "polite no", "budget not ready", "anchoring for a discount"], { en: "Is it the price level, or uncertainty about this particular property?", tr: "Mesele fiyat seviyesi mi, yoksa bu mülke dair belirsizlik mi?" });
  if (silent) H("Silence after an ask", ["busy, still interested", "waiting on someone else", "decided against, avoiding the conversation"], { en: "Yes, not yet, or no: which is it?", tr: "Evet mi, henüz değil mi, hayır mı?" });
  if (c.attempts.some((a) => a.result === "objection" && a.response)) H("Objection raised during an angle (see attempt response)", ["new constraint", "restated old objection", "negotiating tactic"], { en: "In your words, what is the one thing in the way now?", tr: "Sizin sözlerinizle, şu an yolda olan tek şey ne?" });

  // ---- candidates -----------------------------------------------------------------
  let activeBlocker = "None stated";
  const candidates: Playbook[] = [];
  const add = (id: string, ok = true) => {
    const p = PLAYBOOKS[id];
    if (ok && p && !candidates.some((x) => x.id === id)) candidates.push(p);
  };
  let forced: string | null = null;
  const firmGapText = firmGap && budget.status === "gap" ? money(budget.gapMinor, budget.currency, lang) : null;

  if (c.pipelineStage === "lost") {
    forced = scopedRefusal ? (fittingAlt || c.alternatives.length ? "unit_swap" : "search") : "winback";
    activeBlocker = scopedRefusal ? `Lost; customer refused this ${c.outcome.refusalScope}. Only alternatives are on the table.` : `Lost (${c.outcome.lostReason ?? "reason not recorded"}); ${lostChanged ? "a recorded change dated after the loss" : "the agreed revisit date"} justifies one honest contact.`;
  } else if (isPauseEnded(c)) {
    forced = "reengage";
    activeBlocker = `Agreed pause ended on ${pauseDateOf(c)}; contact is due.`;
  } else if (scopedRefusal) {
    forced = fittingAlt || c.alternatives.length ? "unit_swap" : "search";
    activeBlocker = `Customer refused this ${c.outcome.refusalScope}; only alternatives are on the table.`;
  } else if (silent) {
    forced = "silence";
    activeBlocker = pendingAsk ? `No answer for ${daysSinceAsk} day(s) to the ask: “${pendingAsk.ask}”.` : `No customer contact for ${daysSinceLastContact} day(s) after your last message.`;
  } else if (visitPending) {
    forced = "post_visit";
    activeBlocker = `Visit on ${dateOnly(c.latestActivityAt!)}; no decision or objection recorded.`;
  }
  if (forced) add(forced);

  // A stated non-price objection is answered first, even when a firm gap sits behind it.
  if (c.objection && !priceObjection) {
    const pid = OBJECTION_TO_PLAYBOOK[c.objection] ?? "delay";
    if (!OBJECTION_TO_PLAYBOOK[c.objection]) fitIssues.push(`Objection key “${c.objection}” has no playbook; ask the customer to name the specific point.`);
    add(pid);
    if (!forced) activeBlocker = labelOf(OBJECTIONS, c.objection) + (firmGapText ? `; firm gap of ${firmGapText} behind it` : "");
  }
  // Price and negotiation order: hold → within authority → final → trade/gap (+ swap)
  if (priceContest) {
    // Rule mode cannot tie a recorded yes to the concession (no concession date is recorded), so it never claims the promise.
    if (c.negotiation.concessionsGiven) add("hold_open");
    if (withinAuthority) {
      add("close_authority");
      if (!forced && activeBlocker === "None stated") activeBlocker = "Customer's number is within the seller's written authority.";
    } else if (c.negotiation.room === "no") {
      add("price_final");
      if (fittingAlt) add("unit_swap");
      if (!forced && activeBlocker === "None stated") activeBlocker = firmGapText ? `Price is final and the total exceeds the budget by ${firmGapText}` : "Price is final; customer still pushing on price.";
      if (firmGap && !fittingAlt && !c.negotiation.authorizedTerms) fitIssues.push("Firm gap against a final price with no authorized terms and no fitting alternative: this unit cannot close at this budget. Present other inventory or record Lost (price).");
    } else {
      if (c.objection === "cash_discount") add("cash_discount");
      else if (counter != null) add("trade");
      else add(firmGap ? "gap" : "discount");
      if (fittingAlt) add("unit_swap");
      if (!forced && activeBlocker === "None stated") activeBlocker = firmGapText ? `Price/total exceeds the ${c.budget?.firmness === "firm" ? "firm" : "stated"} budget by ${firmGapText}` : c.objection === "cash_discount" ? labelOf(OBJECTIONS, c.objection) : "Price contested; the customer's number is not yet recorded.";
    }
  }
  if (closeReadiness === "close_now") {
    add("reservation");
    if (!forced && !priceContest) activeBlocker = "None. Customer states readiness; every check is on file.";
  } else if (closeReadiness === "close_conditional") {
    add(sellerChecks.length ? "close_conditional" : budgetCheckMissing ? "close_terms" : fundingChecks.length ? "close_funding" : coDeciderCheck ? "approval" : "close_conditional");
    if (!forced && !priceContest) activeBlocker = `Close blocked only by: ${missingForClose.join("; ")}.`;
  }
  add("deadline", deadlineLive && !firmGap);
  add("scarcity_documented", scarcityDocumented && !firmGap && closeReadiness !== "close_now");
  add("price_list", priceListLive && !firmGap && closeReadiness !== "close_now");
  // Qualification before any pitch when the basics are missing
  const lateStage = ["shortlist", "visit", "negotiation"].includes(c.pipelineStage);
  const qualifyFirst = qualificationGaps.length >= 2 && lateStage && !c.objection && !priceContest && !forced && closeReadiness !== "close_now";
  if (qualifyFirst) {
    add("qualify");
    activeBlocker = `Deal at ${c.pipelineStage} with ${qualificationGaps.length} core facts unknown: ${qualificationGaps.join(", ")}.`;
  }
  if (!c.answers.goal || !c.offer) {
    add("qualify", qualificationGaps.length >= 2);
    add("discovery", !c.answers.goal);
  }
  // behavior- and concern-driven
  add("discount", b.has("discount") && !priceContest);
  add("competitor", b.has("compare"));
  add("returns", b.has("returns") || c.answers.goal === "income");
  add("proof", b.has("documents"));
  add("approval", b.has("others") || (!!c.answers.decision && c.answers.decision !== "alone") || ["not_involved", "informed", "objecting"].includes(c.qualification.coDeciderStatus));
  add("send_info", b.has("send_info"));
  add("delay", b.has("delay"));
  if (c.answers.concern && c.answers.concern !== "none" && c.objection !== "only_completed") add(CONCERN_TO_PLAYBOOK[c.answers.concern] ?? "");
  add("delivery", ongoing && !!c.offer && c.objection !== "only_completed");
  add("feasibility", c.track === "land" && ["develop", "build"].includes(c.answers.goal ?? ""));
  add("remote", c.customer.logistics === "remote" && !!c.offer && c.qualification.willVisitBeforeDeciding !== "yes");
  add("management", c.customer.logistics === "remote" && c.answers.goal === "income" && !!c.offer);
  add("dominant", !!c.answers.goal);
  add("discovery", !c.answers.goal);

  // Situational restrictions
  let pool = candidates;
  if (closeReadiness === "close_now") pool = pool.filter((p) => p.id === forced || ["reservation", "deadline", "scarcity_documented", "price_list", "unit_swap"].includes(p.id));
  if (c.objection === "only_completed" && ongoing) pool = pool.filter((p) => !UNIT_PITCH_PLAYBOOKS.has(p.id));
  if (c.offer && (c.offer.availability === "sold" || c.offer.availability === "reserved")) {
    pool = pool.filter((p) => ["unit_swap", "search", "discovery", "qualify", "winback", "reengage"].includes(p.id));
    if (!pool.length) pool = [PLAYBOOKS[c.alternatives.length ? "unit_swap" : "search"]];
  }
  if (scopedRefusal) pool = pool.filter((p) => !UNIT_PITCH_PLAYBOOKS.has(p.id));

  // ---- attempts: exclusions and escalation --------------------------------------------
  const materialChanged = diffFromPrevious(c).some((d) => /^(Price|Costs|Availability|Offer|Budget|Objection|Resolved objections|Counter-offer|Authorized room)/.test(d));
  const excludedAngles: StrategyResult["excludedAngles"] = [];
  const excludedIds = new Set<string>();
  let promoteDelay = false;
  const byAngle = new Map<string, CaseSnapshot["attempts"]>();
  for (const a of c.attempts) byAngle.set(a.angleId, [...(byAngle.get(a.angleId) ?? []), a]);
  for (const [id, list] of byAngle) {
    const p = PLAYBOOKS[id];
    if (!p || !pool.some((x) => x.id === id)) continue;
    const failed = list.some((a) => a.result === "failed");
    const delayedTwice = list.filter((a) => a.result === "delayed").length >= 2;
    if (failed && !materialChanged) {
      excludedIds.add(id);
      excludedAngles.push({ id, title: p.title, reason: "Tried before and recorded as failed; no material fact has changed since." });
    } else if (failed && materialChanged) {
      notes.push(`Angle “${p.title}” failed before but is revisited because a material fact changed since.`);
    }
    if (delayedTwice && !["silence", "delay"].includes(id)) {
      excludedIds.add(id);
      excludedAngles.push({ id, title: p.title, reason: "Delayed twice; a third identical attempt is a continuation, not an advance. Ask the direct question instead." });
      promoteDelay = true;
    }
  }
  const latestAttempt = c.attempts[0] ?? null;
  const advancedRecently = !!latestAttempt && latestAttempt.result === "advanced" && daysBetween(latestAttempt.at, c.asOf) <= 14;
  if (advancedRecently && closeReadiness === "advance" && !c.objection && !firmGap) closeReadiness = "trial_close";

  const ordered = promoteDelay ? [...(forced ? [PLAYBOOKS[forced]] : []), PLAYBOOKS.delay, ...pool.filter((p) => p.id !== "delay" && p.id !== forced)] : pool;
  let selected = ordered.filter((p) => !excludedIds.has(p.id)).slice(0, 3);
  if (selected.length === 0) selected = [scopedRefusal ? PLAYBOOKS.search : PLAYBOOKS.discovery];
  const primary = selected[0];
  if (activeBlocker === "None stated") activeBlocker = `No explicit objection; leading with: ${primary.title}`;

  // ---- fill values (customer language + English for translations) ----------------------------
  const isRecontact = primary.id === "winback" || primary.id === "reengage";
  const change = { en: changeTextFor("en", isRecontact && primary.id === "winback" ? sinceLoss : sinceResponse), tr: changeTextFor("tr", isRecontact && primary.id === "winback" ? sinceLoss : sinceResponse) };
  const missingCheckL = sellerChecks.length ? CHECK_L[sellerChecks[0]] : null;
  const valsFull = (l: Lang, evidenceText: string | null): Vals => {
    const base = buildVals(c, l, { budget, fittingAlt, missingCheck: null, evidenceText, recontact: isRecontact, gaps: qualificationGaps });
    if (missingCheckL) base.missingCheck = fill(pick(l, missingCheckL), base, l).text;
    return base;
  };
  const v = valsFull(lang, isRecontact ? pick(lang, { en: change.en ?? "", tr: change.tr ?? "" }) || null : generalEvidence());
  const vEn = lang === "tr" ? valsFull("en", isRecontact ? change.en : generalEvidence()) : v;
  const noEvidenceVariant = isRecontact && !(lang === "tr" ? change.tr : change.en);
  const noAlt = c.alternatives.length === 0;
  const unitGone = !!c.offer && (c.offer.availability === "sold" || c.offer.availability === "reserved");
  const ladderKey = c.pipelineStage === "negotiation" && !c.negotiation.authorizedTerms ? "visit" : c.pipelineStage;
  const ladder = STAGE_LADDER[ladderKey] ?? STAGE_LADDER.discovery;
  const placeholderNotes = new Set<string>();
  const F = (l: L | undefined, fallbackL?: L): { text: string; translation: string | null } => {
    const src = l ?? fallbackL ?? { en: "", tr: "" };
    const main = fill(pick(lang, src), v, lang);
    main.missing.forEach((m) => placeholderNotes.add(m));
    const tr = lang === "tr" ? fill(src.en, vEn, "en").text : null;
    return { text: strip(main.text), translation: tr ? strip(tr) : null };
  };

  // Script variants that depend on state
  const sayOverride: Record<string, L> = {};
  const askOverride: Record<string, L> = {};
  const questionOverride: Record<string, L> = {};
  if (scopedRefusal) {
    sayOverride.unit_swap = { en: PLAYBOOKS.unit_swap.say.en.replace(/ If not, \{unitYours\}\.$/, ""), tr: PLAYBOOKS.unit_swap.say.tr.replace(/ Etmiyorsa \{unitYours\}\.$/, "") };
    questionOverride.unit_swap = PLAYBOOKS.search.questionToTest;
  } else if (c.negotiation.room === "no") {
    sayOverride.unit_swap = { en: `${PLAYBOOKS.unit_swap.say.en} It gets you there without asking the seller for something they've already said no to.`, tr: `${PLAYBOOKS.unit_swap.say.tr} Böylece satıcıdan zaten hayır dedikleri bir şeyi istemiş olmayız.` };
  }
  if (unitGone && !scopedRefusal) {
    const gone = c.offer!.availability === "sold" ? { en: "{unit} has gone; I'd rather you hear it from me now than at the reservation.", tr: "{unit} artık yok; bunu rezervasyon aşamasında değil şimdi benden duymanızı tercih ederim." } : { en: "{unit} is currently reserved by someone else; I'd rather you hear it from me now than at the reservation.", tr: "{unit} şu anda başka biri tarafından rezerve edilmiş; bunu rezervasyon aşamasında değil şimdi benden duymanızı tercih ederim." };
    sayOverride.unit_swap = { en: `${gone.en} {alt} in {altProject} is available at {altPrice} as of the check on {altCheckedDate}. Shall I hold it under {nextStep} while you look, or is there another requirement I should search on?`, tr: `${gone.tr} {altProject} projesinde {alt}, {altCheckedDate} tarihli kontrole göre {altPrice} ile müsait. Siz bakarken {nextStep} ile tutayım mı, yoksa arama yapmam gereken başka bir şart mı var?` };
    sayOverride.search = { en: `${gone.en} Tell me in one sentence what it had to do for you and I'll search on exactly that.`, tr: `${gone.tr} Sizin için ne yapması gerektiğini tek cümleyle söyleyin, tam olarak ona göre arayayım.` };
    questionOverride.search = { en: "In one sentence, what did it have to do for you?", tr: "Tek cümleyle: sizin için ne yapması gerekiyordu?" };
  }
  if (!deadlineFitA) askOverride.deadline = { en: "That date is {validUntil}. Shall we complete the {nextStep} today, so it stays inside the written validity?", tr: "Tarih {validUntil}. {nextStep} adımını bugün tamamlayalım mı; yazılı geçerliliğin içinde kalsın?" };
  else if (!deadlineFitB) askOverride.deadline = { en: "That date is {validUntil}. Shall we complete the {nextStep} today or {slotA}, inside the written validity?", tr: "Tarih {validUntil}. {nextStep} adımını bugün ya da {slotA} saatinde, yazılı geçerliliğin içinde tamamlayalım mı?" };
  if (!priceListDateLive && priceNoteLive) {
    sayOverride.price_list = { en: "The seller's documented note on the price list says: {priceChange}. I can't tell you what the next list will say; I'm passing the note on so you decide with it.", tr: "Satıcının fiyat listesiyle ilgili belgeli notu şöyle: {priceChange}. Sonraki listenin ne diyeceğini bilemem; notu, kararınızı buna göre verin diye iletiyorum." };
    askOverride.price_list = { en: "Shall we complete the {nextStep} {slotA} or {slotB}, so you decide on today's documented terms?", tr: "{nextStep} adımını tamamlayalım mı; hangisi uygun: {slotA} ya da {slotB}? Böylece bugünün belgeli şartlarıyla karar verirsiniz." };
  }
  if (!c.offer) askOverride.delivery = { en: "If the documented milestones fit your timing, shall we pick the unit that matches them {slotA}?", tr: "Belgelenmiş aşamalar zamanlamanıza uyuyorsa {slotA} saatinde ona uyan daireyi birlikte seçelim mi?" };
  if (noAlt) {
    sayOverride.price_final = PLAYBOOKS.price_final.sayNoAlt!;
  }
  if (!verified.length || !c.answers.concern || c.answers.concern === "none") {
    sayOverride.dominant = { en: "You told me the one thing {unit} has to deliver is {goal}. I won't claim it; I'll show you the record for it. What is the one thing still open for you, so I bring exactly that?", tr: "{unit} için tek önceliğinizin {goal} olduğunu söylediniz. Bunu iddia etmeyeceğim; kaydını göstereceğim. Sizin için açıkta kalan tek konu ne, tam olarak onu getireyim?" };
  }
  for (const p of selected) if (noEvidenceVariant && p.sayNoEvidence && (p.id === "winback" || p.id === "reengage")) sayOverride[p.id] = p.sayNoEvidence;

  const angles: Angle[] = selected.map((p, i) => {
    const say = F(sayOverride[p.id] ?? p.say);
    const trade = p.tradeAsk && (c.negotiation.room === "yes" || c.negotiation.authorizedRoomMinor != null || c.negotiation.authorizedTerms) ? F(p.tradeAsk) : null;
    const ask = F(askOverride[p.id] ?? p.directAsk);
    return {
      id: p.id,
      rank: i + 1,
      title: p.title,
      rationale: rationaleFor(p.id, c, budget, { silent, daysSinceAsk, pendingAsk, advancedRecently, latestAttempt, lostChanged }),
      evidenceIds: evidenceFor(p.id, c, verified.map((e) => e.id)),
      suggestedWording: trade ? `${say.text} ${trade.text}` : say.text,
      suggestedWordingTranslation: lang === "tr" ? (trade ? `${say.translation} ${trade.translation}` : say.translation) : null,
      directAsk: ask.text,
      directAskTranslation: ask.translation,
      proofNeeded: p.proofNeeded,
      questionToTest: F(questionOverride[p.id] ?? p.questionToTest).text,
      methodSourceIds: p.methodSourceIds,
      avoidWhen: p.avoidWhen,
    };
  });

  // ---- objections ----------------------------------------------------------------------
  const objections: StrategyResult["objections"] = [];
  const closeAskFor = (p: Playbook) => (closeReadiness === "close_now" ? F(PLAYBOOKS.reservation.directAsk).text : unitGone || scopedRefusal ? F(PLAYBOOKS[c.alternatives.length ? "unit_swap" : "search"].directAsk).text : F(askOverride[p.id] ?? p.directAsk).text);
  const priceReply = withinAuthority ? PLAYBOOKS.close_authority : c.negotiation.room === "no" ? PLAYBOOKS.price_final : PLAYBOOKS.discount;
  const objFor = (key: string, basis: "stated" | "hypothesized", label: string) => {
    const p = key === "price" ? priceReply : (PLAYBOOKS[OBJECTION_TO_PLAYBOOK[key] ?? key] ?? PLAYBOOKS.delay);
    objections.push({ objection: label, basis, response: F(p.objectionReply, p.say).text, clarifyingQuestion: F(p.questionToTest).text, closeAsk: closeAskFor(p) });
  };
  if (c.objection) objFor(c.objection, "stated", labelOf(OBJECTIONS, c.objection));
  if (!c.objection && b.has("discount")) objFor("price", "hypothesized", "Price too high");
  if (b.has("compare") && c.objection !== "competitor") objFor("competitor", "hypothesized", "Another project is better value");
  if (ongoing && !!c.offer && c.objection !== "delivery" && c.objection !== "only_completed" && !scopedRefusal) objFor("delivery", "hypothesized", "Will it be delivered on time?");
  for (const r of c.resolvedObjections) {
    if (r === c.objection) continue;
    objections.push({ objection: `${labelOf(OBJECTIONS, r)} (resolved)`, basis: "stated", response: pick(lang, { en: "We resolved that point; I won't reopen it unless you do.", tr: "O noktayı çözdük; siz açmadıkça yeniden açmayacağım." }), clarifyingQuestion: pick(lang, { en: "Is anything else between you and the next step?", tr: "Sizinle bir sonraki adım arasında başka bir şey var mı?" }), closeAsk: closeReadiness === "close_now" ? F(PLAYBOOKS.reservation.directAsk).text : F(ladder.ask).text });
  }

  // ---- next move, fallback, branches ---------------------------------------------------------
  const ladderAsk = F(ladder.ask);
  const CLOSE_MOVES = new Set(["reservation", "close_authority", "close_conditional", "close_funding", "close_terms", "trade", "gap", "price_final", "unit_swap", "cash_discount", "hold", "hold_open", "deadline", "scarcity_documented", "price_list"]);
  const closing = CLOSE_MOVES.has(primary.id) || closeReadiness === "close_now" || closeReadiness === "close_conditional";
  const afterYesKey = closing ? "negotiation" : primary.id === "post_visit" ? "visit" : ["qualify", "discovery", "search"].includes(primary.id) ? "new" : ladderKey;
  const afterYes = F((STAGE_LADDER[afterYesKey] ?? STAGE_LADDER.discovery).afterYes).text;
  let action: string;
  let purpose: string;
  let ask = F(askOverride[primary.id] ?? primary.directAsk);
  let prerequisites: string[] = [];
  let dueInDays = 1;
  let owner = "salesperson";

  if (unitGone && !scopedRefusal) {
    action = c.offer!.availability === "sold" ? "Tell the customer plainly, first, that the unit is no longer available; then present verified alternatives that meet the stated priorities." : "Ask the seller today whether the existing reservation has an expiry and whether a backup reservation is possible; tell the customer only what the seller confirms, and present alternatives.";
    purpose = "Preserve the opportunity with real inventory.";
    ask = noAlt
      ? F({ en: "Tell me in one sentence what it had to do for you and I'll search on exactly that. Shall we go through what I find {slotA}?", tr: "Sizin için ne yapması gerektiğini tek cümleyle söyleyin, tam olarak ona göre arayayım. Bulduklarımı {slotA} saatinde birlikte inceleyelim mi?" })
      : c.offer!.availability === "sold"
        ? F({ en: "Shall I hold {alt} under {nextStep} while you look, or is there another requirement I should search on?", tr: "Siz bakarken {alt} için {nextStep} ile tutayım mı, yoksa arama yapmam gereken başka bir şart mı var?" })
        : F({ en: "Would you want to be next in line if {unit} frees up, or shall we look at {alt} now?", tr: "{unit} boşalırsa sırada olmak ister misiniz, yoksa şimdi {alt} seçeneğine mi bakalım?" });
    prerequisites = ["Verified alternative list"];
    dueInDays = 0;
  } else if (primary.id === "winback") {
    action = lostChanged ? "Contact with the recorded change only. Ask whether the original obstacle was the only one; if yes, move to the matching next step." : "Contact on the agreed revisit date only. Claim no change; ask whether anything changed on their side.";
    purpose = "Win back a lost deal on facts, not pressure.";
    dueInDays = 0;
  } else if (primary.id === "reengage") {
    action = "Re-open contact on the agreed date; reconfirm price and availability of the preferred option before mentioning it.";
    purpose = "Keep the promise made when the customer paused.";
    prerequisites = ["Price/availability of the preferred option reconfirmed today"];
    dueInDays = 0;
  } else if (primary.id === "search" || (primary.id === "unit_swap" && scopedRefusal)) {
    action = primary.id === "search" ? "Ask what the refused unit missed, record it as a quote, search inventory on exactly that, and attach the options." : `Present the alternative (${(fittingAlt ?? c.alternatives[0])?.reference}) and never mention the refused unit again.`;
    purpose = "Respect the refusal; keep the customer with real inventory.";
    dueInDays = 0;
  } else if (primary.id === "silence") {
    action = touchesSinceResponse >= 3 ? "Third unanswered touch: send the direct yes/not-yet/no question once, then propose a pause with a date. Do not intensify." : "Re-ask the same commitment; do not re-pitch and do not add urgency. Log the touch.";
    purpose = "Turn silence into an answer; silence is neither consent nor refusal.";
    dueInDays = 0;
  } else if (primary.id === "post_visit") {
    action = "Debrief the visit while it is fresh: get yes / no / yes-if, record the answer as readiness or objection, then ask for the commitment step.";
    purpose = "A visit without a recorded decision is a lost week.";
    prerequisites = ["Availability rechecked today"];
    dueInDays = 0;
  } else if (primary.id === "hold" || primary.id === "hold_open") {
    action = "Do not concede again. Restate the concession already given and ask for the answer on what is on the table; hear any genuinely new issue.";
    purpose = "A second concession without a new commitment teaches the customer to keep asking.";
  } else if (primary.id === "close_authority") {
    action = "Within written authority: confirm the customer's own number and ask for the reservation today. Do not reopen with the seller and never reveal the authorization.";
    purpose = "Close while the number is on the table.";
    prerequisites = ["Seller's written authorization on file (salesperson-only)", "Availability reconfirmed today", ...(allInFits ? [] : ["Customer's number confirmed as price-only (costs on top) against the firm all-in budget"])];
    dueInDays = 0;
  } else if (primary.id === "close_terms") {
    action = "Get the all-in amount and the currency the customer will pay in, record the budget with scope, then prepare the reservation on fixed terms.";
    purpose = "The customer wants to move; the missing budget basis is the only thing between them and fixed terms.";
    prerequisites = [BUDGET_CHECK, ...(fundingChecks.length ? ["Funding evidence"] : [])];
    dueInDays = 0;
  } else if (primary.id === "price_final") {
    action = fittingAlt ? `Tell the customer the price is final and offer the choice: ${c.offer?.reference} at the current price, or ${fittingAlt.reference} within their limit.` : "Tell the customer the price is final. Ask for the yes/no decision; if no, get the number they would sign at and search inventory on it, or record Lost (price).";
    purpose = "Sell the decision, not a discount that is not coming.";
    prerequisites = ["Seller's 'no room' recorded with date"];
    if (noAlt) ask = F({ en: "At {price}: yes or no? If no, what is the number you'd sign at, so I search on exactly that?", tr: "{price} ile: evet mi, hayır mı? Hayırsa imza atacağınız rakam ne; tam olarak ona göre arayayım." });
  } else if (primary.id === "trade") {
    action = `Take the recorded number (${v.number}) to the seller only with the customer's conditional commitment recorded. Report the written answer.`;
    purpose = "One trip to the seller, with a real offer.";
    prerequisites = ["Customer's 'if they accept, I sign' recorded as a quote with date"];
    dueInDays = 0;
  } else if (primary.id === "gap" || primary.id === "discount") {
    action = c.negotiation.authorizedRoomMinor != null || c.negotiation.authorizedTerms ? "Get the customer's number first. Then apply the authorized room/terms as a trade for a dated commitment; never as a unilateral concession and never below or revealing the authorization." : "Get the customer's number and their conditional commitment before any seller contact. Then ask the seller once, in writing.";
    purpose = "Close the gap with a real number, not pressure.";
    prerequisites = [...(counter == null ? ["Customer's number recorded as counter-offer"] : []), "Complete cost list", ...(c.negotiation.room === "unknown" ? ["Seller's actual position in writing (after the number)"] : [])];
  } else if (primary.id === "cash_discount") {
    action = c.funding === "confirmed" ? "Package speed and certainty: proof of funds, reservation this week, one number. Put it to the seller once." : "Obtain proof of funds before approaching the seller. Then trade speed for the authorized room only.";
    purpose = "Price the cash buyer's speed, not the request.";
    prerequisites = c.funding === "confirmed" ? ["Customer's number recorded"] : ["Proof of funds"];
  } else if (primary.id === "reservation") {
    action = "Reconfirm availability and current terms with the seller, then ask the customer for the reservation on those terms today.";
    purpose = "Convert stated readiness into a transaction step while it is current.";
    prerequisites = ["Availability reconfirmed today", "Written terms in hand"];
    dueInDays = 0;
  } else if (primary.id === "close_conditional") {
    action = `Run the missing check today: ${sellerChecks.join("; ") || missingForClose.join("; ")}. Then ask conditionally.`;
    purpose = "The customer is ready; only verification is missing.";
    prerequisites = [...missingForClose];
    dueInDays = 0;
  } else if (primary.id === "close_funding") {
    action = `Ask the customer for the funding evidence (${fundingChecks.join("; ")}); prepare the reservation the day it arrives.`;
    purpose = "A stated budget is not funding; the reservation must hold.";
    prerequisites = [...missingForClose];
    dueInDays = 0;
  } else if (primary.id === "qualify") {
    action = `One qualification call. Record: ${qualificationGaps.join(", ")}.`;
    purpose = "Nothing can be ranked reliably until the core facts are known.";
    prerequisites = [...qualificationGaps];
  } else if (primary.id === "only_completed") {
    action = completedAlts.length ? `Present the completed alternatives (${completedAlts.map((a) => a.reference).join(", ")}); do not push the ongoing project.` : "Search inventory for completed units meeting the essentials; if none exist, say so plainly and agree a re-contact trigger.";
    purpose = "Respect the stated constraint; keep the customer with real inventory.";
    if (!completedAlts.length) ask = F({ en: "I don't have a completed unit that matches {mustHaves} on file today. Give me until {slotA} to search; if I find one, shall we review it that day?", tr: "Bugün kayıtlarımda {mustHaves} ile uyumlu tamamlanmış bir daire yok. {slotA} saatine kadar arayayım; bulursam o gün birlikte inceleyelim mi?" });
  } else if (primary.id === "legal_residency") {
    action = "Obtain the written answer from the named licensed source for the specific legal point; never answer it yourself. Book the review of the written answer.";
    purpose = "Turn a legal question into a dated, sourced answer and a conditional close.";
    owner = "salesperson → licensed source";
    prerequisites = ["Property jurisdiction recorded", "Named licensed source"];
  } else {
    action = `${primary.title}: ${primary.proofNeeded.join("; ")}`;
    purpose = rationaleFor(primary.id, c, budget, { silent, daysSinceAsk, pendingAsk, advancedRecently, latestAttempt, lostChanged });
    prerequisites = unknowns.slice(0, 2).map((u) => u.suggestedTask);
    const useLadder = !forced && !priceContest && !c.objection && (closeReadiness === "advance" || closeReadiness === "trial_close") && primary.id !== "qualify" && !LEVER_PLAYBOOKS.has(primary.id);
    if (useLadder || advancedRecently) {
      // The stage ladder is the floor for the ask; the customer's own stated next step (Q8) wins when present.
      const stageAsk = stageAnswerAsk(c.answers.stage);
      ask = stageAsk ? F(stageAsk) : ladderAsk;
    }
  }
  if (c.customer.logistics === "remote" && !!c.offer && !selected.some((p) => p.id === "remote")) prerequisites.push("Remote buyer: agree what must be inspected in person and what can be verified remotely (walkthrough, documents, representative).");

  // fallback
  const fallbackFor = (): StrategyResult["fallback"] => {
    const alt = fittingAlt ?? c.alternatives[0] ?? null;
    if (primary.id === "price_final" && !alt) return { action: "Get the number the customer would sign at and search inventory on it; if nothing fits, record Lost (price).", prerequisite: "Customer's number recorded", customerAsk: F(PLAYBOOKS.price_final.fallbackAskNoAlt!).text };
    if (["gap", "discount", "trade", "price_final", "cash_discount", "hold", "hold_open"].includes(primary.id)) {
      return alt
        ? { action: `Switch to the alternative-choice close: ${alt.projectName} ${alt.reference}${alt.priceMinor != null ? ` at ${money(alt.priceMinor, alt.currency, "en")}` : ""}.`, prerequisite: "Alternative availability reconfirmed", customerAsk: F(PLAYBOOKS.unit_swap.directAsk).text }
        : { action: "No fitting alternative recorded: agree what would have to change (price, scope, timing) or record Lost (price).", prerequisite: "Inventory search by the salesperson", customerAsk: F(PLAYBOOKS.gap.fallbackAsk!).text };
    }
    if (["reservation", "close_conditional", "close_funding", "close_authority"].includes(primary.id)) return { action: "If they hesitate, isolate the single remaining issue and update the case from that answer. Do not restart the presentation.", prerequisite: "None", customerAsk: F(PLAYBOOKS.reservation.fallbackAsk!).text };
    if (primary.id === "approval") return { action: "Send the one-page brief and fix the debrief call for the day after they talk.", prerequisite: "Brief built from evidence records", customerAsk: F(PLAYBOOKS.approval.fallbackAsk!).text };
    if (primary.id === "proof" || primary.id === "developer_trust") return { action: "Offer the document that exists (not the one that does not) and book the review.", prerequisite: "Evidence record with status and date", customerAsk: F(PLAYBOOKS.proof.directAsk).text };
    if (primary.id === "silence") return { action: "If still no answer after this touch: propose a pause with a date and stop chasing.", prerequisite: "None", customerAsk: F({ en: "Shall I close your file for now and come back later? Tell me the month and I'll come back then, not before.", tr: "Dosyanızı şimdilik kapatıp sonra döneyim mi? Ayı söyleyin; ondan önce değil, o zaman dönerim." }).text };
    if (primary.fallbackAsk) return { action: `Different path, not the same pitch louder: ${primary.title}.`, prerequisite: primary.useWhen, customerAsk: F(primary.fallbackAsk).text };
    const second = selected[1];
    if (second) return { action: `Switch to: ${second.title}. ${second.proofNeeded.join("; ")}`, prerequisite: second.useWhen, customerAsk: F(second.directAsk).text };
    return { action: "Ask the direct question: a question, or the timing?", prerequisite: "None", customerAsk: F(PLAYBOOKS.delay.directAsk).text };
  };
  const fallback = fallbackFor();

  const raisedAgain = primary.fallbackAsk ? F(primary.fallbackAsk).text : fallback.customerAsk;
  const agreesWording = closing
    ? F({ en: "Good. I'll send the {nextStep} details within the hour.", tr: "Harika. {nextStep} detaylarını bir saat içinde gönderiyorum." }).text
    : F({ en: "Good. {slotA} or {slotB}, which? I'll confirm it in writing within the hour.", tr: "Harika. Hangisi uygun: {slotA} ya da {slotB}? Bir saat içinde yazılı teyit gönderiyorum." }).text;
  const responseBranches: StrategyResult["responseBranches"] = [
    { customerResponse: "Agrees", nextAction: afterYes, suggestedWording: agreesWording, stopOrRecheckCondition: "Any change in availability or terms before the step." },
    { customerResponse: "Raises the main objection again", nextAction: "Use the fallback path; do not repeat the same pitch louder.", suggestedWording: raisedAgain, stopOrRecheckCondition: pick(lang, { en: "Third time: “You've raised this three times, so I'll treat it as the real constraint. If it can't change, is there a version of this that works, or should we stop here?”", tr: "Üçüncü kez: “Bunu üçüncü kez dile getirdiniz; artık gerçek kısıt olarak alıyorum. Değişemeyecekse bunun işe yarayan bir hâli var mı, yoksa burada duralım mı?”" }) },
    { customerResponse: "Delays or adds a new constraint", nextAction: "Record the constraint as an activity, agree a concrete date or trigger for the next contact, and regenerate the strategy.", suggestedWording: F(PLAYBOOKS.delay.directAsk).text, stopOrRecheckCondition: "No agreed date after two attempts: ask directly whether interest remains." },
    { customerResponse: "Asks to pause or declines", nextAction: "Respect it. Record reason, scope (unit / project / contact) and contact preference. Set Paused with a date, or Lost.", suggestedWording: pick(lang, { en: "Understood. Would you like me to contact you at a later date, and if so when?", tr: "Anladım. İleride sizinle iletişime geçmemi ister misiniz; isterseniz ne zaman?" }), stopOrRecheckCondition: "Stop. Only the customer, the agreed date or a materially new option reopens the case." },
  ];
  if (["gap", "discount", "trade", "cash_discount"].includes(primary.id)) {
    responseBranches.splice(1, 0, { customerResponse: "Names a number but refuses to commit", nextAction: "Do not take it to the seller.", suggestedWording: F(PLAYBOOKS.trade.fallbackAsk!).text, stopOrRecheckCondition: "Take the number to the seller only once the conditional commitment is recorded." });
  }

  // ---- draft ------------------------------------------------------------------------------
  const draft = buildDraft(lang, primary, v, vEn, ask.text, ask.translation, F, placeholderNotes, noEvidenceVariant, sayOverride[primary.id], noAlt);

  // ---- cadence ----------------------------------------------------------------------------
  const touch = touchesSinceResponse;
  const spacing = CADENCE[Math.min(touch, CADENCE.length - 1)];
  const nextTouchInDays = ["won", "lost"].includes(c.pipelineStage) || isPaused(c) ? null : Math.max(0, spacing - (daysSinceLastContact ?? spacing));
  const recordedReason = sinceResponse.verified.length
    ? "verified evidence added since the customer's last response"
    : sinceResponse.alts.length
      ? `option ${sinceResponse.alts[0].reference} attached since the customer's last response`
      : deadlineLive
          ? `documented terms valid until ${c.offer?.validUntil}`
          : priceListDateLive
            ? `documented price list valid until ${c.offer?.priceValidUntil}`
            : null;
  const cadence = {
    touch,
    nextTouchInDays,
    reason: touch >= 3 ? "three unanswered touches: one direct interest check, then pause with a date; do not intensify" : (recordedReason ?? "direct interest check (no new recorded reason; obtain one: reconfirm price/availability, verify one claim, or attach an option)"),
  };

  if (placeholderNotes.size) notes.push(`Customer-facing text has values to fill before sending: ${[...placeholderNotes].join(", ")}.`);
  notes.push("Rule mode uses structured facts only. Quotes, notes and interpretations are shown but not semantically analyzed. Use model analysis to incorporate written details.");
  notes.push("Method sources support the approach; they never verify a project fact. Evidence status is shown separately.");

  const nextReviewTrigger =
    primary.id === "silence"
      ? `The customer's answer, or ${spacing} days without one (then propose a pause with a date).`
      : primary.id === "winback" || primary.id === "reengage"
        ? "The customer's answer to this one contact; if none, close the file or set the agreed revisit date."
        : primary.id === "close_authority"
          ? "Customer's answer to the reservation ask, or any change in availability/terms."
          : firmGap
        ? "Seller's answer on price/terms, or a change in the customer's stated budget."
        : closeReadiness === "close_now" || closeReadiness === "close_conditional"
          ? "Customer's answer to the reservation ask, or any change in availability/terms."
          : deadlineLive
            ? `The documented terms expiry ${c.offer?.validUntil}, or the customer's response to the ask.`
            : "The customer's response to the primary move, or any new price, availability or objection record.";

  return {
    situation: { summary: situationSummary(c, budget), evidenceIds },
    hypotheses,
    angles,
    excludedAngles,
    objections,
    nextMove: { action, purpose, customerCommitment: ask.text, customerCommitmentTranslation: ask.translation, afterYes, prerequisites, owner, dueInDays },
    fallback,
    responseBranches,
    customerDraft: draft,
    unknowns,
    fitIssues,
    stateBasis: {
      asOf: c.asOf,
      latestActivityId: c.latestActivityId,
      activeBlocker,
      closeReadiness,
      missingForClose,
      qualificationGaps,
      daysSinceLastContact,
      cadence,
      changesSincePreviousRun: diffFromPrevious(c),
      staleInputs,
    },
    nextReviewTrigger,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function stageAnswerAsk(stage: string | undefined): L | null {
  switch (stage) {
    case "visit":
      return { en: "You said you'd like to see it. I can show you {unit} {slotA} or {slotB}. Which suits?", tr: "Görmek istediğinizi söylemiştiniz. {unit} için {slotA} ya da {slotB} uygun. Hangisi?" };
    case "compare":
      return { en: "Let's put your shortlist side by side {slotA}; at the end I'll ask you to pick one to take forward. Does {slotA} work?", tr: "Kısa listenizi {slotA} saatinde yan yana koyalım; sonunda birini ilerletmek üzere seçmenizi isteyeceğim. {slotA} uygun mu?" };
    case "verify":
      return { en: "You want to investigate this one specifically. Let's fix the checks that decide it and, when they clear, go to the {nextStep}. Shall we start {slotA}?", tr: "Bu seçeneği özellikle araştırmak istiyorsunuz. Kararı belirleyen kontrolleri sabitleyelim; netleşince {nextStep} adımına geçelim. {slotA} saatinde başlayalım mı?" };
    case "offer":
      return { en: "You said you want to make an offer. Let's prepare the {nextStep} today so the terms are locked while you finish your checks. Today or {slotA}?", tr: "Teklif vermek istediğinizi söylediniz. Kontrollerinizi tamamlarken şartlar sabit kalsın diye {nextStep} adımını bugün hazırlayalım. Bugün mü, yoksa {slotA} mı?" };
    default:
      return null;
  }
}

type Extra = { silent: boolean; daysSinceAsk: number | null; pendingAsk: CaseSnapshot["asks"][number] | null; advancedRecently: boolean; latestAttempt: CaseSnapshot["attempts"][number] | null; lostChanged: boolean };

function rationaleFor(id: string, c: CaseSnapshot, budget: BudgetCheck, x: Extra): string {
  const b = new Set(c.behaviors);
  const esc = x.advancedRecently && x.latestAttempt?.angleId === id ? ` Advanced on ${dateOnly(x.latestAttempt!.at)}; ask for the next step, not the same one.` : "";
  switch (id) {
    case "gap":
      return `${budget.text} The customer's number is not recorded; get it before any seller contact.` + esc;
    case "discount":
      return (b.has("discount") ? "A discount request was observed; its reason is not established (budget limit, competing offer, value doubt, routine negotiation)." : "The stated concern is overpaying or losing value.") + esc;
    case "trade":
      return "The customer has named a number. Trade the seller's answer for a dated signature; one trip to the seller." + esc;
    case "price_final":
      return "The seller has confirmed no price room. Asking again wastes credibility; sell the decision or the alternative.";
    case "hold":
      return "A concession was already given and the customer said yes on it; another one without a new commitment teaches the customer to keep asking.";
    case "hold_open":
      return "A concession was already given with no recorded commitment; get the answer on what is on the table before anything else moves.";
    case "close_authority":
      return "The customer's number is within the seller's written authority; nothing to negotiate, only to close. The authorization itself stays with the salesperson.";
    case "cash_discount":
      return c.funding === "confirmed" ? "Funds are evidenced; speed and certainty are a real asset to trade." : "Cash is claimed but not evidenced; proof of funds comes before any trade.";
    case "competitor":
      return "The customer is comparing projects. A generic quality claim will not win; a like-for-like comparison on their top criterion can.";
    case "returns":
      return (b.has("returns") ? "The customer repeatedly asks about returns." : "Rental income is the stated goal.") + esc;
    case "proof":
      return "Proof was requested or trust is the concern. Progress depends on one or two facts becoming checkable.";
    case "delivery":
      return c.objection === "delivery" || c.answers.concern === "delivery" ? "Delivery timing is the stated concern." : "The project is not complete; timing must fit the customer's plans.";
    case "only_completed":
      return "The customer will not buy off-plan. Pushing delivery arguments loses the deal; completed alternatives keep it.";
    case "feasibility":
      return "The buyer has a development or building intention. Feasibility decides the sale.";
    case "remote":
      return "The customer is buying remotely; practical verification is the obstacle.";
    case "approval":
      return `A co-decider must approve (status: ${c.qualification.coDeciderStatus}). A joint review beats a relay.`;
    case "spouse_no":
      return "The co-decider said no; their actual objection is unknown until asked.";
    case "delay":
      return "Repeated postponement. Timing, information and interest are different problems; one question separates them.";
    case "silence":
      return x.pendingAsk ? `The ask “${x.pendingAsk.ask}” has had no answer for ${x.daysSinceAsk} day(s). Silence is neither consent nor refusal.` : "No customer contact after your last message. Ask rather than assume.";
    case "post_visit":
      return "A visit happened and no decision or objection is recorded. Debrief while it is fresh.";
    case "reservation":
      return "Readiness stated and every check on file. Another discovery question would lose momentum.";
    case "close_conditional":
      return "Readiness stated; one seller-side verification is still open. Close conditionally on it rather than waiting.";
    case "close_funding":
      return "Readiness stated; only the customer's funding evidence is missing. A stated budget is not funding.";
    case "deadline":
      return `Documented terms (${c.offer?.termsSource}) are valid until ${c.offer?.validUntil}. Stating the date is factual, not pressure.`;
    case "scarcity_documented":
      return `A documented count (${c.offer?.availabilityCount}, ${c.offer?.availabilitySource}) is on file and fresh. State it, nothing more.`;
    case "price_list":
      return "A documented price-list validity or a sourced price-change note is on file. State the date; never predict the next list.";
    case "unit_swap":
      return isScopedRefusal(c) ? "The customer refused the current unit; the alternative is the only honest pitch." : "A checked-available alternative fits the budget; trade the unit, not the price.";
    case "search":
      return "The customer refused this unit or project and no alternative is attached; find out what it missed and search on that.";
    case "qualify":
      return "Core facts are missing; the deal cannot be closed on unknowns.";
    case "dominant":
      return `The customer's stated main reason is “${answerLabel(c.track, "goal", c.answers.goal)}”. Everything else is secondary until that benefit is evidenced.` + esc;
    case "discovery":
      return "The main purchase motivation has not been recorded; nothing can be ranked reliably until it is.";
    case "winback":
      return x.lostChanged ? `Lost (${c.outcome.lostReason ?? "reason not recorded"}). A recorded change dated after the loss addresses it.` : `Lost (${c.outcome.lostReason ?? "reason not recorded"}). The agreed revisit date has arrived; nothing else is claimed.`;
    case "reengage":
      return "The agreed pause has ended; the customer expects the promised contact.";
    case "think_it_over":
      return "The customer wants to think; naming what they will weigh and dating the answer keeps it a decision.";
    case "no_hurry":
      return "No urgency on the customer's side; write the decision criteria now so the decision is ready when they are.";
    case "send_info":
      return "An information request without a booked review is a continuation, not an advance.";
    case "market_wait":
      return "The customer expects prices to fall; a written trigger turns a hope into a decision. No forecasts.";
    case "currency_risk":
      return "Funds and price are in different currencies; only authorized terms remove the exposure, not predictions.";
    case "legal_residency":
      return "A legal question can only be closed with a written answer from a licensed source.";
    case "fees":
      return "Fees are contested; only a complete itemised total can be decided on.";
    case "location":
      return "Distance is the objection; it is either a deal-breaker (show closer options) or a trade-off (price it).";
    case "resale_liquidity":
      return "Exit doubt; define the exit and test it against what is on record.";
    case "management":
      return "Remote landlord doubt; only documented management terms answer it.";
    case "developer_trust":
      return "Developer risk; three documents decide it.";
    case "after_visit_home":
      return "The decision will be made at home; fix the decision call and the brief before departure.";
    default:
      return PLAYBOOKS[id]?.useWhen ?? "";
  }
}

function evidenceFor(id: string, c: CaseSnapshot, verifiedIds: string[]): string[] {
  const ids: string[] = [];
  if (["gap", "discount", "trade", "price_final", "close_authority", "reservation", "close_conditional", "close_funding", "deadline", "unit_swap", "hold", "hold_open", "cash_discount", "price_list"].includes(id)) {
    if (c.budget) ids.push(c.budget.id);
    if (c.offer) ids.push(c.offer.optionId);
  }
  if (["dominant", "proof", "developer_trust", "winback", "reengage", "returns"].includes(id)) ids.push(...verifiedIds);
  if (id === "silence") ids.push(...c.asks.map((a) => a.id));
  ids.push(...c.quotes.map((q) => q.id));
  return [...new Set(ids)];
}

function situationSummary(c: CaseSnapshot, budget: BudgetCheck): string {
  const parts = [
    `${c.customer.name} (${c.customer.market} market, ${c.customer.logistics} logistics, ${c.customer.experience} experience)`,
    `${c.track === "home" ? "home" : "plot"} track`,
    c.project ? `${c.project.name} (${c.project.category ?? "category n/a"}, ${c.project.stage ?? "stage n/a"}, ${c.project.location ?? "location not recorded"})` : "no project attached",
    c.offer ? `offer ${c.offer.reference}: ${c.offer.priceMinor != null ? formatMinor(c.offer.priceMinor, c.offer.currency) : "price n/a"}, availability ${c.offer.availability}` : "no offer attached",
    `goal: ${answerLabel(c.track, "goal", c.answers.goal)}`,
    `concern: ${answerLabel(c.track, "concern", c.answers.concern)}`,
    `readiness: ${c.readiness}`,
    `pipeline: ${c.pipelineStage}`,
    c.negotiation.counterOfferMinor != null ? `customer's number: ${formatMinor(c.negotiation.counterOfferMinor, c.negotiation.counterOfferCurrency ?? c.offer?.currency)}` : "customer's number: not recorded",
    budget.text,
  ];
  return parts.join(". ") + ".";
}

function buildDraft(
  lang: Lang,
  primary: Playbook,
  v: Vals,
  vEn: Vals,
  askText: string,
  askTranslation: string | null,
  F: (l: L | undefined, fb?: L) => { text: string; translation: string | null },
  placeholderNotes: Set<string>,
  noEvidenceVariant: boolean,
  sayOverride?: L,
  noAlt = false,
): StrategyResult["customerDraft"] {
  const greet = pick(lang, { en: `Hi ${v.first || "there"},`, tr: `Merhaba ${v.salutation},` });
  const sign = pick(lang, { en: "Best regards", tr: "Saygılarımla" });
  const template = noEvidenceVariant ? (primary.messageNoEvidence ?? primary.message) : noAlt && primary.messageNoAlt ? primary.messageNoAlt : primary.message;
  const openerTemplate = noAlt && primary.callOpenerNoAlt ? primary.callOpenerNoAlt : primary.callOpener;
  let text: string;
  let translation: string | null;
  if (template) {
    const m = F(template);
    text = `${m.text}\n\n${sign}`;
    translation = m.translation ? `${m.translation}\n\nBest regards` : null;
  } else {
    const say = F(sayOverride ?? primary.say);
    text = `${greet}\n\n${sentences(say.text, 2)} ${askText}\n\n${sign}`;
    translation = lang === "tr" ? `Hi ${vEn.first || "there"},\n\n${sentences(say.translation ?? "", 2)} ${askTranslation ?? ""}\n\nBest regards` : null;
  }
  // Trim to ≤ 90 words by dropping middle sentences of the body, never the ask.
  if (words(text) > 90) {
    const lines = text.split("\n\n");
    const bodyIdx = lines.length === 3 ? 1 : 0;
    const s = splitSentences(lines[bodyIdx] ?? "");
    while (s.length > 2 && words([...lines.slice(0, bodyIdx), s.join(" "), ...lines.slice(bodyIdx + 1)].join("\n\n")) > 90) s.splice(1, 1);
    lines[bodyIdx] = s.join(" ");
    text = lines.join("\n\n");
  }
  const addr = lang === "tr" ? v.salCall : v.first || v.salCall;
  const lead = lang === "tr" ? "kısa bir konu." : "quick one.";
  const opener = openerTemplate ? F(openerTemplate).text : `${addr}, ${lead} ${sentences(F(sayOverride ?? primary.say).text, 1)} ${askText}`;
  for (const t of [text, opener]) if (/\{[a-zA-Z]+\}|\[[^\]]+\]/.test(t)) placeholderNotes.add("draft");
  return { language: lang, text, callOpener: opener, translation };
}

function fmtVal(v: unknown): string {
  if (v === "" || v == null) return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

export function diffFromPrevious(c: CaseSnapshot): string[] {
  const prev = c.previousRun?.snapshot;
  if (!prev) return ["First run for this opportunity."];
  const out: string[] = [];
  const cmp = (label: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) out.push(`${label}: ${fmtVal(a)} → ${fmtVal(b)}`);
  };
  cmp("Price", prev.offer?.priceMinor, c.offer?.priceMinor);
  cmp("Costs", prev.offer?.costsMinor, c.offer?.costsMinor);
  cmp("Availability", prev.offer?.availability, c.offer?.availability);
  cmp("Offer", prev.offer?.reference, c.offer?.reference);
  cmp("Budget", prev.budget?.amountMinor, c.budget?.amountMinor);
  cmp("Budget scope", prev.budget?.scope, c.budget?.scope);
  cmp("Budget firmness", prev.budget?.firmness, c.budget?.firmness);
  cmp("Objection", prev.objection, c.objection);
  cmp("Resolved objections", prev.resolvedObjections, c.resolvedObjections);
  cmp("Readiness", prev.readiness, c.readiness);
  cmp("Funding", prev.funding, c.funding);
  cmp("Pipeline stage", prev.pipelineStage, c.pipelineStage);
  cmp("Behaviors", prev.behaviors, c.behaviors);
  cmp("Goal", prev.answers.goal, c.answers.goal);
  cmp("Concern", prev.answers.concern, c.answers.concern);
  cmp("Counter-offer", prev.negotiation?.counterOfferMinor, c.negotiation.counterOfferMinor);
  cmp("Authorized room", prev.negotiation?.authorizedRoomMinor, c.negotiation.authorizedRoomMinor);
  cmp("Concessions given", prev.negotiation?.concessionsGiven, c.negotiation.concessionsGiven);
  cmp("Co-decider", prev.qualification?.coDeciderStatus, c.qualification.coDeciderStatus);
  cmp("Refusal scope", prev.outcome?.refusalScope, c.outcome.refusalScope);
  cmp("Attempts recorded", prev.attempts.length, c.attempts.length);
  cmp("Quotes recorded", prev.quotes.length, c.quotes.length);
  cmp("Activities", prev.narratives.length, c.narratives.length);
  cmp("Alternatives", prev.alternatives?.length, c.alternatives.length);
  return out.length ? out : ["No material inputs changed since the previous run."];
}

function stopResult(
  c: CaseSnapshot,
  lang: Lang,
  reading: string,
  o: { action: string; trigger: string; draft: { text: string; opener: string; ask: string } | null; qualificationGaps: string[]; evidenceIds: string[]; dueInDays: number },
): StrategyResult {
  const { check } = budgetCheckFor(c);
  return {
    situation: { summary: `${reading} ${situationSummary(c, check)}`, evidenceIds: o.evidenceIds },
    hypotheses: [],
    angles: [],
    excludedAngles: [],
    objections: [],
    nextMove: { action: o.action, purpose: "Respect the customer's explicit instruction; keep the relationship and the record accurate.", customerCommitment: o.draft?.ask ?? "None.", customerCommitmentTranslation: null, afterYes: "Regenerate the strategy from the new state.", prerequisites: [], owner: "salesperson", dueInDays: o.dueInDays },
    fallback: { action: "None. Persistence does not apply to an explicit stop.", prerequisite: "—", customerAsk: "—" },
    responseBranches: [{ customerResponse: "Customer re-engages", nextAction: "Regenerate the strategy from the new state.", suggestedWording: "—", stopOrRecheckCondition: "—" }],
    customerDraft: { language: lang, text: o.draft?.text ?? "", callOpener: o.draft?.opener ?? "", translation: null },
    unknowns: [],
    fitIssues: [],
    stateBasis: { asOf: c.asOf, latestActivityId: c.latestActivityId, activeBlocker: reading, closeReadiness: "stopped", missingForClose: [], qualificationGaps: o.qualificationGaps, daysSinceLastContact: c.latestActivityAt ? daysBetween(c.latestActivityAt, c.asOf) : null, cadence: { touch: 0, nextTouchInDays: null, reason: "stopped: explicit pause or refusal, or no recorded change" }, changesSincePreviousRun: diffFromPrevious(c), staleInputs: [] },
    nextReviewTrigger: o.trigger,
    notes: ["Rule mode. A stated pause, a contact refusal, or a lost deal with no recorded change overrides all persistence rules."],
  };
}
