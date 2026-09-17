// Provider-neutral strategy generation adapter. The concrete provider lives in ./anthropic.ts.
// Credentials stay server-side. Missing credentials ⇒ getProvider() returns null and the UI says AI is unavailable.

import { formatMinor } from "@/domain/money";
import { StrategyResultSchema, type CaseSnapshot, type StrategyResult } from "@/domain/strategy/types";
import { closeReadinessFor, diffFromPrevious } from "@/domain/strategy/engine";

export type ProviderResult = { result: StrategyResult; modelId: string; promptVersion: string; usage?: { inputTokens: number; outputTokens: number } };

export interface StrategyProvider {
  id: string;
  generate(snapshot: CaseSnapshot): Promise<ProviderResult>;
}

export class ProviderRefusal extends Error {
  constructor(public category: string | null, explanation: string | null) {
    super(`The model declined to analyze this case${category ? ` (${category})` : ""}${explanation ? `: ${explanation}` : "."}`);
  }
}

export async function getProvider(): Promise<StrategyProvider | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const { anthropicProvider } = await import("./anthropic");
  return anthropicProvider();
}

const PLACEHOLDER = /\[[^\[\]\n]{1,60}\]/g;
const HAS_PLACEHOLDER = /\[[^\[\]\n]{1,60}\]/;

// Fabrications the house rules forbid whatever the case says: guarantees, a last unit, a competing buyer, a certain price rise.
// Built with RegExp: Turkish ı/ş/ü are outside \w (so \b would miss "kaldı" or "alıcı"), and Unicode-aware boundaries
// need lookbehind, which the ES2017 compile target rejects in a regex literal.
const FORBIDDEN_PHRASE = new RegExp(
  "(?<![\\p{L}\\p{N}])(guarantee[ds]?|garanti(?:li)?|last unit|only one left|another buyer|son daire|tek daire kaldı|başka (?:bir )?alıcı|kesinlikle (?:artacak|yükselecek))(?![\\p{L}\\p{N}])",
  "iu",
);

/**
 * The checks that keep a case from close_now, evaluated by the SAME engine helper the rule path uses
 * (closeReadinessFor), so rule mode and the model guard cannot drift. Empty ⇒ the case meets close_now.
 */
export function closeNowShortfalls(c: CaseSnapshot): string[] {
  const r = closeReadinessFor(c);
  if (r.level === "close_now") return [];
  const missing = [...r.missing];
  if (r.level === "stopped") missing.unshift("explicit pause or contact refusal on file");
  if (c.objection) missing.unshift(`active objection (${c.objection}) not resolved`);
  if (r.firmGap) missing.unshift("firm budget gap against the recorded ceiling");
  // A questionnaire "offer" answer counts as ready only while the recorded readiness is still "evaluating"; an explicit later
  // readiness (exploring/unknown/paused/refused) wins, exactly as the engine treats a stale "pause" answer.
  if (!(c.readiness === "ready" || (c.answers.stage === "offer" && c.readiness === "evaluating"))) missing.unshift(`readiness is "${c.readiness}", not ready`);
  return missing;
}

const isTurkish = (c: CaseSnapshot) => (c.customer.language ?? "").toLowerCase().startsWith("tr");

/** The stop-state values the rule engine's stopResult uses; the model path is pinned to the same ones. */
const STOP_FALLBACK = { action: "None. Persistence does not apply to an explicit stop.", prerequisite: "—", customerAsk: "—" };
const STOP_BRANCHES = [{ customerResponse: "Customer re-engages", nextAction: "Regenerate the strategy from the new state.", suggestedWording: "—", stopOrRecheckCondition: "—" }];

/** Cleans the seams left by removing a token from a sentence (double spaces, a space before punctuation). */
function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .trim();
}

/** Removes residual [placeholders] from a customer-facing string; returns the cleaned text and the tokens removed. */
function stripPlaceholders(text: string): { text: string; removed: string[] } {
  const removed = text.match(PLACEHOLDER) ?? [];
  if (!removed.length) return { text, removed: [] };
  return { text: tidy(text.replace(PLACEHOLDER, "")), removed };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Number-only renderings of an amount as a customer might read it: "98,000", "98.000", "98000" (2-decimal forms included). */
function amountForms(minor: number, currency: string | null): string[] {
  const forms = new Set<string>();
  for (const locale of ["en", "tr-TR"]) forms.add(formatMinor(minor, currency, locale).split(" ")[0]);
  if (minor % 100 === 0) forms.add(String(minor / 100));
  return [...forms];
}

/** Matches any of the forms as a whole figure (never inside a larger number such as 198,000 or 98,000.50). */
function amountPattern(forms: string[]): RegExp {
  const alts = [...forms].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return new RegExp(`(?<![\\d.,])(?:${alts})(?![\\d]|[.,]\\d)`, "u");
}

/** Renderings of an ISO date as a customer might read it: "2026-09-30", "30 September", "30 September 2026", "30 Eylül", "30/09/2026", "30.09.2026", "September 30". */
function dateForms(iso: string): string[] {
  const day = iso.slice(0, 10);
  const forms = new Set<string>([day]);
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return [...forms];
  const variants: Intl.DateTimeFormatOptions[] = [
    { day: "numeric", month: "long" },
    { day: "numeric", month: "long", year: "numeric" },
    { day: "2-digit", month: "2-digit", year: "numeric" },
  ];
  for (const locale of ["en-GB", "en-US", "tr-TR"]) {
    for (const opts of variants) forms.add(new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(d));
  }
  return [...forms];
}

/** Matches any of the date forms as a whole token. Non-global so `.test` is stateless; callers add "g" to strip. */
function datePattern(forms: string[]): RegExp {
  const alts = [...forms].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts})(?![\\p{L}\\p{N}])`, "iu");
}

type CustomerField = { path: string; get: () => string | null; set: (v: string) => void };

/**
 * Every customer-facing string in a result: the commitment asks, the fallback ask, the response branches, the draft and
 * opener, the *Translation fields, and the isolating questions (angles[].questionToTest, objections[].clarifyingQuestion,
 * hypotheses[].questionToTest) that the prompt defines as verbatim customer questions.
 */
function customerFields(r: StrategyResult): CustomerField[] {
  const fields: CustomerField[] = [
    { path: "nextMove.customerCommitment", get: () => r.nextMove.customerCommitment, set: (v) => { r.nextMove.customerCommitment = v; } },
    { path: "nextMove.customerCommitmentTranslation", get: () => r.nextMove.customerCommitmentTranslation, set: (v) => { r.nextMove.customerCommitmentTranslation = v; } },
    { path: "fallback.customerAsk", get: () => r.fallback.customerAsk, set: (v) => { r.fallback.customerAsk = v; } },
    { path: "customerDraft.text", get: () => r.customerDraft.text, set: (v) => { r.customerDraft.text = v; } },
    { path: "customerDraft.callOpener", get: () => r.customerDraft.callOpener, set: (v) => { r.customerDraft.callOpener = v; } },
    { path: "customerDraft.translation", get: () => r.customerDraft.translation, set: (v) => { r.customerDraft.translation = v; } },
  ];
  r.angles.forEach((a, i) => {
    const n = i + 1;
    fields.push(
      { path: `angles[${n}].suggestedWording`, get: () => a.suggestedWording, set: (v) => { a.suggestedWording = v; } },
      { path: `angles[${n}].suggestedWordingTranslation`, get: () => a.suggestedWordingTranslation, set: (v) => { a.suggestedWordingTranslation = v; } },
      { path: `angles[${n}].directAsk`, get: () => a.directAsk, set: (v) => { a.directAsk = v; } },
      { path: `angles[${n}].directAskTranslation`, get: () => a.directAskTranslation, set: (v) => { a.directAskTranslation = v; } },
      { path: `angles[${n}].questionToTest`, get: () => a.questionToTest, set: (v) => { a.questionToTest = v; } },
    );
  });
  r.objections.forEach((o, i) => {
    const n = i + 1;
    fields.push(
      { path: `objections[${n}].response`, get: () => o.response, set: (v) => { o.response = v; } },
      { path: `objections[${n}].clarifyingQuestion`, get: () => o.clarifyingQuestion, set: (v) => { o.clarifyingQuestion = v; } },
      { path: `objections[${n}].closeAsk`, get: () => o.closeAsk, set: (v) => { o.closeAsk = v; } },
    );
  });
  r.hypotheses.forEach((h, i) => {
    fields.push({ path: `hypotheses[${i + 1}].questionToTest`, get: () => h.questionToTest, set: (v) => { h.questionToTest = v; } });
  });
  r.responseBranches.forEach((b, i) => {
    fields.push({ path: `responseBranches[${i + 1}].suggestedWording`, get: () => b.suggestedWording, set: (v) => { b.suggestedWording = v; } });
  });
  return fields;
}

/**
 * Validates a model result against the schema and the case: unknown evidence ids are dropped (never invented), angle count
 * is capped, ranks normalized, state basis pinned to the real snapshot, residual placeholders are stripped from the draft
 * into a note, and the deterministic guards run over EVERY customer-facing string:
 * - an explicit pause or contact refusal pins the level to stopped and replaces every pitch field with the engine's stop
 *   values (no angles, no objections, "None." commitment, stop fallback and branch; contact refusal: no draft or opener;
 *   active pause: only a draft/opener that confirms the agreed date survives);
 * - close_now is allowed only when the snapshot meets the close_now conditions;
 * - the seller's floor (price − authorized room) and the room itself never reach the customer (field blanked, level capped at advance);
 * - an expired or unsourced terms deadline is stripped from customer text;
 * - guarantees, "last unit", "another buyer" and their Turkish forms are flagged.
 */
export function validateModelResult(raw: unknown, snapshot: CaseSnapshot): { result: StrategyResult; warnings: string[] } {
  const parsed = StrategyResultSchema.parse(raw);
  const known = new Set<string>([
    ...snapshot.quotes.map((q) => q.id),
    ...snapshot.narratives.map((n) => n.id),
    ...snapshot.interpretations.map((i) => i.id),
    ...snapshot.evidence.map((e) => e.id),
    ...snapshot.attempts.map((a) => a.id),
    ...snapshot.asks.map((a) => a.id),
    ...snapshot.alternatives.map((a) => a.optionId),
    ...(snapshot.budget ? [snapshot.budget.id] : []),
    ...(snapshot.offer ? [snapshot.offer.optionId, snapshot.offer.inventoryItemId] : []),
    ...(snapshot.project ? [snapshot.project.id] : []),
  ]);
  const warnings: string[] = [];
  let dropped = 0;
  const keep = (ids: string[]) => ids.filter((id) => (known.has(id) ? true : (dropped++, false)));

  // Residual placeholders never reach the customer draft or the call opener.
  const draftText = stripPlaceholders(parsed.customerDraft.text);
  const opener = stripPlaceholders(parsed.customerDraft.callOpener);
  const translation = parsed.customerDraft.translation != null ? stripPlaceholders(parsed.customerDraft.translation) : null;
  const removedTokens = Array.from(new Set([...draftText.removed, ...opener.removed, ...(translation?.removed ?? [])]));
  if (removedTokens.length) {
    warnings.push(`Draft contained a placeholder to fill and it was removed: ${removedTokens.join(", ")}. Review the wording before use.`);
  }

  const result: StrategyResult = {
    ...parsed,
    situation: { ...parsed.situation, evidenceIds: keep(parsed.situation.evidenceIds) },
    hypotheses: parsed.hypotheses.map((h) => ({ ...h, evidenceIds: keep(h.evidenceIds) })),
    angles: parsed.angles.slice(0, 3).map((a, i) => ({ ...a, rank: i + 1, evidenceIds: keep(a.evidenceIds) })),
    customerDraft: {
      ...parsed.customerDraft,
      text: draftText.text,
      callOpener: opener.text,
      translation: translation ? translation.text : parsed.customerDraft.translation,
    },
    stateBasis: {
      ...parsed.stateBasis,
      asOf: snapshot.asOf,
      latestActivityId: snapshot.latestActivityId,
      changesSincePreviousRun: parsed.stateBasis.changesSincePreviousRun.length ? parsed.stateBasis.changesSincePreviousRun : diffFromPrevious(snapshot),
    },
  };
  if (dropped) warnings.push(`${dropped} evidence reference(s) from the model did not match case records and were dropped.`);

  // Other customer-facing strings are shown, not copied verbatim: report residual placeholders rather than rewrite them.
  const fields = customerFields(result);
  const fieldsWithPlaceholders = fields.filter((f) => f.path !== "customerDraft.text" && f.path !== "customerDraft.callOpener" && f.path !== "customerDraft.translation").filter((f) => {
    const text = f.get();
    return text != null && HAS_PLACEHOLDER.test(text);
  });
  if (fieldsWithPlaceholders.length) {
    warnings.push(`Draft contains a placeholder to fill in: ${fieldsWithPlaceholders.map((f) => f.path).join(", ")}. Fill it from the case before use.`);
  }

  // ---- Close-readiness guard: the deterministic level always wins at the stop end; close_now only when the checks hold. ----
  const sb = result.stateBasis;
  const deterministic = closeReadinessFor(snapshot);
  const shortfalls = closeNowShortfalls(snapshot);
  if (deterministic.level === "stopped") {
    const contactRefused = snapshot.outcome.refusalScope === "contact" || snapshot.readiness === "refused";
    const tr = isTurkish(snapshot);
    if (sb.closeReadiness !== "stopped") warnings.push(`Model proposed ${sb.closeReadiness} but an explicit pause or refusal is on file; level pinned to stopped.`);
    sb.closeReadiness = "stopped";
    sb.missingForClose = [];
    // Every pitch field is replaced with the values the rule engine's stopResult uses, so the stored run cannot carry a
    // reservation ask in customerCommitment, a trade in fallback.customerAsk or pitch branches past an explicit stop.
    const hadPitch = result.angles.length > 0 || result.objections.length > 0 || result.customerDraft.text.trim() !== "" || result.customerDraft.callOpener.trim() !== "";
    result.angles = [];
    result.objections = [];
    result.fallback = { ...STOP_FALLBACK };
    result.responseBranches = STOP_BRANCHES.map((b) => ({ ...b }));
    if (contactRefused) {
      result.nextMove = { ...result.nextMove, customerCommitment: "None.", customerCommitmentTranslation: null };
      result.customerDraft = { ...result.customerDraft, text: "", callOpener: "", translation: null };
      if (hadPitch) warnings.push("The customer declined contact: the model's angles, objections, asks, draft and call opener were replaced by the stop state. Record the preference; no message goes out.");
    } else {
      // Active pause: the only permitted customer text is a short confirmation of the agreed date; anything else is removed.
      const pauseDate = snapshot.outcome.pausedUntil ?? snapshot.outcome.revisitAt;
      result.nextMove = {
        ...result.nextMove,
        customerCommitment: pauseDate
          ? tr ? "Anlaşılan tarihten önce yok." : "None before the agreed date."
          : tr ? "Size tekrar döneyim mi; isterseniz ne zaman?" : "Do you want me to come back to you, and if so when?",
        customerCommitmentTranslation: null,
      };
      const confirmsDate = pauseDate ? datePattern(dateForms(pauseDate)) : null;
      const keepText = !!confirmsDate && result.customerDraft.text.trim() !== "" && confirmsDate.test(result.customerDraft.text);
      const keepOpener = !!confirmsDate && result.customerDraft.callOpener.trim() !== "" && confirmsDate.test(result.customerDraft.callOpener);
      const removedDraft = !keepText && result.customerDraft.text.trim() !== "";
      const removedOpener = !keepOpener && result.customerDraft.callOpener.trim() !== "";
      result.customerDraft = {
        ...result.customerDraft,
        text: keepText ? result.customerDraft.text : "",
        callOpener: keepOpener ? result.customerDraft.callOpener : "",
        translation: keepText ? result.customerDraft.translation : null,
      };
      if (hadPitch) {
        const removed = [removedDraft ? "draft" : null, removedOpener ? "call opener" : null].filter(Boolean).join(" and ");
        warnings.push(
          `Active pause${pauseDate ? ` until ${pauseDate}` : " with no agreed date"}: the model's angles, objections, asks and branches were replaced by the stop state${removed ? `, and the ${removed} did not confirm the agreed date and ${removedDraft && removedOpener ? "were" : "was"} removed` : ""}. No pitch before the agreed date.`,
        );
      }
    }
  } else if (sb.closeReadiness === "close_now" && shortfalls.length) {
    sb.closeReadiness = "close_conditional";
    sb.missingForClose = Array.from(new Set([...sb.missingForClose, ...shortfalls]));
    warnings.push(`Model proposed close_now but the case does not meet the close_now conditions; downgraded to close_conditional. Missing: ${shortfalls.join("; ")}.`);
  } else if (sb.closeReadiness === "close_conditional" && !sb.missingForClose.length && shortfalls.length) {
    // A conditional close must name its conditions; pin them to the deterministic checks.
    sb.missingForClose = shortfalls;
  }

  // ---- Content guards over every customer-facing string (recomputed: the stop guard may have replaced angles/draft). ----
  const liveFields = customerFields(result);
  /** Applies `fix` to every customer-facing field whose text matches `hit` (null = flag only); returns the paths touched. */
  const sweep = (hit: RegExp, fix: ((text: string) => string) | null): string[] =>
    liveFields.flatMap((f) => {
      const text = f.get();
      if (!text || !hit.test(text)) return [];
      if (fix) f.set(fix(text));
      return [f.path];
    });

  // (1) The seller's floor and the authorized room are for the salesperson only. A figure that coincides with a number the
  //     customer may legitimately hear (price, recorded costs, the all-in total, an alternative's recorded price, their own
  //     counter, their budget) is not treated as a leak.
  const offer = snapshot.offer;
  const room = snapshot.negotiation.authorizedRoomMinor;
  if (offer && offer.priceMinor != null && room != null && room > 0) {
    const currency = offer.currency;
    const { counterOfferMinor: counter, counterOfferCurrency } = snapshot.negotiation;
    const budget = snapshot.budget;
    const legitimate = new Set<number>([offer.priceMinor]);
    if (offer.costsMinor != null) {
      legitimate.add(offer.costsMinor);
      legitimate.add(offer.priceMinor + offer.costsMinor);
    }
    for (const a of snapshot.alternatives) if (a.priceMinor != null && a.currency === currency) legitimate.add(a.priceMinor);
    if (counter != null && (counterOfferCurrency == null || counterOfferCurrency === currency)) legitimate.add(counter);
    if (budget && budget.currency === currency) {
      legitimate.add(budget.amountMinor);
      if (budget.amountMaxMinor != null) legitimate.add(budget.amountMaxMinor);
    }
    const secrets = [
      { label: "the seller's floor", minor: offer.priceMinor - room },
      { label: "the authorized room", minor: room },
    ].filter((s) => s.minor > 0 && !legitimate.has(s.minor));
    let leaked = false;
    for (const s of secrets) {
      const hits = sweep(amountPattern(amountForms(s.minor, currency)), () => "");
      if (hits.length) {
        leaked = true;
        warnings.push(`Output stated ${s.label} (${formatMinor(s.minor, currency)}), which the customer must never hear; the wording was removed from: ${hits.join(", ")}. Regenerate; the level is capped at advance.`);
      }
    }
    if (leaked && sb.closeReadiness !== "stopped" && sb.closeReadiness !== "advance") sb.closeReadiness = "advance";
  }

  // (2) A terms deadline exists for the customer only when it is sourced and not expired; otherwise the date is stripped.
  if (offer?.validUntil) {
    const expired = offer.validUntil.slice(0, 10) < snapshot.asOf.slice(0, 10);
    const unsourced = !offer.termsSource;
    if (expired || unsourced) {
      const pattern = datePattern(dateForms(offer.validUntil));
      const all = new RegExp(pattern.source, `${pattern.flags}g`);
      const hits = sweep(pattern, (text) => tidy(text.replace(all, "")));
      if (hits.length) {
        warnings.push(`Output quoted the terms deadline ${offer.validUntil}, which is ${expired ? "expired" : "recorded without a source"} and must not be stated; the date was removed from: ${hits.join(", ")}. Review the wording before use.`);
      }
    }
  }

  // (3) Forbidden claims are flagged, not rewritten: the salesperson reviews the named fields.
  const flagged = sweep(FORBIDDEN_PHRASE, null);
  if (flagged.length) {
    warnings.push(`Output contains a guarantee, last-unit, competing-buyer or certain-price-rise claim that no case record supports (${flagged.join(", ")}); review before use.`);
  }

  result.notes = [...result.notes, ...warnings];
  return { result, warnings };
}
