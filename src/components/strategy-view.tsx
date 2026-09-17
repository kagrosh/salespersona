import { METHOD_SOURCES } from "@/domain/strategy/playbooks";
import type { CloseReadiness, StrategyResult } from "@/domain/strategy/types";
import type { StrategyRunRow } from "@/lib/types";
import { markDraftSent, recordAttempt, taskFromRun } from "@/app/actions/strategy";
import { CopyButton } from "@/components/copy-button";
import { Field, Select } from "@/components/ui";
import { localInputValue, todayAtInputValue } from "@/lib/form";

const RESULT_OPTIONS = [
  { key: "advanced", label: "Advanced the deal (customer agreed)" },
  { key: "objection", label: "Raised an objection" },
  { key: "delayed", label: "Customer delayed" },
  { key: "failed", label: "Did not work" },
  { key: "unknown", label: "Unknown yet" },
];

const READINESS_LABEL: Record<CloseReadiness, { label: string; cls: string; hint: string }> = {
  close_now: { label: "Close now", cls: "badge-good", hint: "Every check is on file: ask for the commitment step today." },
  close_conditional: { label: "Close, conditional", cls: "badge-warn", hint: "Ready customer; one or more checks still missing. Run the check today, then ask conditionally." },
  trial_close: { label: "Trial close", cls: "badge-warn", hint: "No objection stated; test whether they would proceed." },
  advance: { label: "Advance one rung", cls: "", hint: "Ask for the next concrete step on the stage ladder." },
  stopped: { label: "Stopped", cls: "badge-bad", hint: "Explicit pause or refusal on file. Respect it; only the arranged follow-up applies." },
};

function Translation({ text, label = "English translation" }: { text: string | null | undefined; label?: string }) {
  if (!text) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-neutral-500">{label}</summary>
      <div className="quote">{text}</div>
    </details>
  );
}

function Wording({ text, translation, className = "quote" }: { text: string; translation?: string | null; className?: string }) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <div className={`${className} flex-1`}>{text}</div>
        <CopyButton text={text} />
      </div>
      <Translation text={translation} />
    </div>
  );
}

export function StrategyView({ run, opportunityId, compact = false }: { run: StrategyRunRow; opportunityId: string; compact?: boolean }) {
  const r = run.result as StrategyResult | null;
  if (!r) return <div className="note-bad">This run failed: {run.error ?? "no result"}. The previous valid strategy is unaffected.</div>;
  const stale = run.status === "stale";
  const modeLabel = run.generation_mode === "model" ? `model analysis · ${run.model_id ?? "model"} · ${run.prompt_version ?? ""}` : run.generation_mode === "rules_fallback" ? `rule-based fallback · ${run.engine_version}` : `rule-based · ${run.engine_version}`;
  const sb = r.stateBasis;
  const readiness = READINESS_LABEL[sb.closeReadiness ?? "advance"] ?? READINESS_LABEL.advance;
  const move = r.nextMove;
  const primary = r.angles.find((a) => a.rank === 1) ?? r.angles[0] ?? null;
  // dueInDays 0 means today (reservation, "run the check today", silence re-ask): pre-fill later today, not tomorrow 10:00.
  const dueDays = Number.isFinite(move.dueInDays) ? Math.max(0, move.dueInDays) : 1;
  const dueDefault = dueDays === 0 ? todayAtInputValue() : localInputValue(dueDays);
  const cadence = sb.cadence ?? { touch: 0, nextTouchInDays: null, reason: "" };
  const missing = sb.missingForClose ?? [];
  const gaps = sb.qualificationGaps ?? [];
  const draft = r.customerDraft;
  const hasDraft = Boolean(draft.text && draft.text.trim());
  const angleOptions = [...r.angles.map((a) => ({ key: a.id, label: `${a.rank}. ${a.title}` })), { key: "primary_move", label: "Primary move (no angle)" }];

  return (
    <div className="space-y-4 text-sm">
      {stale && <div className="note-warn"><strong>Stale:</strong> {run.stale_reason ?? "inputs changed since this run"}. Regenerate before relying on the ask below.</div>}

      {/* ---------------- the first block: readiness, blocker, THE ASK, actions ---------------- */}
      <div className="rounded-lg border-2 border-emerald-700 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${readiness.cls}`} title={readiness.hint}>{readiness.label}</span>
          <span className="text-neutral-700"><strong>Blocker:</strong> {sb.activeBlocker}</span>
        </div>

        <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">The ask ({draft.language.toUpperCase()})</div>
        <div className="flex items-start gap-2">
          <div className="flex-1 text-lg font-semibold leading-snug">{move.customerCommitment}</div>
          <CopyButton text={move.customerCommitment} />
        </div>
        <Translation text={move.customerCommitmentTranslation} />
        {move.afterYes && <p className="mt-1 text-neutral-700"><strong>If they say yes:</strong> {move.afterYes}</p>}

        <p className="mt-3"><strong>Do:</strong> {move.action}</p>
        <p className="text-xs text-neutral-500">Purpose: {move.purpose} · Owner: {move.owner} · Due in {move.dueInDays ?? 1} day(s)</p>
        {move.prerequisites.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-xs text-neutral-700">
            {move.prerequisites.map((p, i) => <li key={i}>Before this: {p}</li>)}
          </ul>
        )}

        {(missing.length > 0 || gaps.length > 0) && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {missing.length > 0 && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
                <div className="text-xs font-semibold uppercase">Missing for close</div>
                <ul className="list-disc pl-5">{missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </div>
            )}
            {gaps.length > 0 && (
              <div className="rounded-md bg-neutral-100 px-3 py-2 text-neutral-800">
                <div className="text-xs font-semibold uppercase">Qualification gaps</div>
                <ul className="list-disc pl-5">{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
          <span><strong>Last contact:</strong> {sb.daysSinceLastContact == null ? "never recorded" : sb.daysSinceLastContact === 0 ? "today" : `${sb.daysSinceLastContact} day(s) ago`}</span>
          <span><strong>Cadence:</strong> touch {cadence.touch}{cadence.nextTouchInDays != null ? ` · next touch in ${cadence.nextTouchInDays} day(s)` : ""}{cadence.reason ? ` · reason: ${cadence.reason}` : ""}</span>
        </div>

        {!compact && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-neutral-200 pt-3">
            <form action={taskFromRun} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="opportunity_id" value={opportunityId} /><input type="hidden" name="run_id" value={run.id} /><input type="hidden" name="which" value="next" />
              <input type="hidden" name="due_days" value={dueDays} />
              <Field label="Due"><input name="due_at" type="datetime-local" className="input" defaultValue={dueDefault} /></Field>
              <button className="btn btn-sm" type="submit">Save as task</button>
            </form>
            {hasDraft && <CopyButton text={draft.text} label="Copy draft" />}
            {hasDraft && (
              <form action={markDraftSent}>
                <input type="hidden" name="opportunity_id" value={opportunityId} /><input type="hidden" name="run_id" value={run.id} />
                <button className="btn-secondary btn-sm" type="submit" title="Records that you sent the draft through your own channel. The CRM sends nothing.">Mark draft as sent</button>
              </form>
            )}
            <form action={taskFromRun}>
              <input type="hidden" name="opportunity_id" value={opportunityId} /><input type="hidden" name="run_id" value={run.id} /><input type="hidden" name="which" value="fallback" />
              <input type="hidden" name="due_days" value={dueDays} />
              <button className="btn-secondary btn-sm" type="submit">Save fallback as task</button>
            </form>
          </div>
        )}
      </div>

      {!compact && (
        <details className="rounded-md border border-neutral-200 p-3" open={sb.closeReadiness !== "stopped"}>
          <summary className="cursor-pointer font-medium">Record attempt (what you said, what they answered)</summary>
          <form action={recordAttempt} className="mt-2 grid gap-2 sm:grid-cols-4">
            <input type="hidden" name="opportunity_id" value={opportunityId} /><input type="hidden" name="run_id" value={run.id} />
            <Field label="Angle used"><Select name="angle_id" defaultValue={primary?.id ?? "primary_move"} options={angleOptions} /></Field>
            <Field label="Result"><Select name="result" defaultValue="unknown" options={RESULT_OPTIONS} /></Field>
            <Field label="Customer response (their words or a factual summary)" className="sm:col-span-2"><input name="customer_response" className="input" /></Field>
            <Field label="Wording used (edit to what you actually said)" className="sm:col-span-4"><textarea name="wording_used" className="textarea" defaultValue={primary?.suggestedWording ?? move.customerCommitment} /></Field>
            <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" name="log_activity" value="1" defaultChecked /> Also log as activity with the wording as narrative</label>
            <Field label="Activity type"><Select name="activity_type" defaultValue="call" options={["call", "message", "meeting", "visit"]} /></Field>
            <div className="flex items-end"><button className="btn-secondary btn-sm" type="submit">Record attempt</button></div>
          </form>
        </details>
      )}

      {r.fitIssues.map((f, i) => <div key={i} className="note-bad">{f}</div>)}
      <p className="text-neutral-700">{r.situation.summary}</p>
      {sb.changesSincePreviousRun.length > 0 && <p className="text-xs text-neutral-500">Since last run: {sb.changesSincePreviousRun.join("; ")}</p>}
      {sb.staleInputs.length > 0 && <p className="text-xs text-amber-800">Refresh before relying on: {sb.staleInputs.join(", ")}</p>}

      <section>
        <h3 className="font-semibold">Customer-ready draft ({draft.language.toUpperCase()}) — review before sending; nothing is sent by the CRM</h3>
        {hasDraft ? (
          <>
            <div className="flex items-start gap-2">
              <textarea readOnly rows={6} className="textarea flex-1" defaultValue={draft.text} />
              <CopyButton text={draft.text} label="Copy draft" />
            </div>
            <Translation text={draft.translation} />
          </>
        ) : (
          <p className="text-xs text-neutral-500">No customer message for this state.</p>
        )}
        {draft.callOpener && draft.callOpener.trim() && (
          <div className="mt-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Call opener (first 20 seconds)</div>
            <Wording text={draft.callOpener} />
          </div>
        )}
      </section>

      {r.angles.length > 0 && (
        <section>
          <h3 className="font-semibold">Angles (ranked)</h3>
          {r.angles.map((a) => (
            <details key={a.id} className="my-2 rounded-md border border-neutral-200 p-3" open={a.rank === 1}>
              <summary className="cursor-pointer font-medium">{a.rank}. {a.title}</summary>
              <p className="mt-1 text-xs text-neutral-500">Why now: {a.rationale}</p>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Say</div>
              <Wording text={a.suggestedWording} translation={a.suggestedWordingTranslation} />
              <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Then ask</div>
              <Wording text={a.directAsk} translation={a.directAskTranslation} className="quote font-medium" />
              <p><strong>Proof needed:</strong> {a.proofNeeded.join("; ") || "—"}</p>
              <p><strong>Test it:</strong> {a.questionToTest}</p>
              <p className="text-xs text-neutral-500">Avoid when: {a.avoidWhen}</p>
              <p className="text-xs text-neutral-500">Method: {a.methodSourceIds.map((m) => METHOD_SOURCES[m]?.title ?? m).join(" · ") || "—"}. Case evidence: {a.evidenceIds.length ? `${a.evidenceIds.length} record(s)` : "none linked"}. Method sources support the approach; they never verify a project fact.</p>
            </details>
          ))}
          {r.excludedAngles.length > 0 && <p className="text-xs text-neutral-500">Not repeated: {r.excludedAngles.map((e) => `${e.title} (${e.reason})`).join("; ")}</p>}
        </section>
      )}

      {r.hypotheses.length > 0 && (
        <section>
          <h3 className="font-semibold">Hypotheses (not facts)</h3>
          <ul className="list-disc pl-5">
            {r.hypotheses.map((h, i) => (
              <li key={i}><strong>{h.interpretation}</strong> — could also be: {h.alternatives.join(", ") || "—"}. Test: {h.questionToTest}</li>
            ))}
          </ul>
        </section>
      )}

      {r.objections.length > 0 && (
        <section>
          <h3 className="font-semibold">Objection responses (each ends in an ask)</h3>
          {r.objections.map((o, i) => (
            <div key={i} className="my-2">
              <div><strong>{o.objection}</strong> <span className="badge">{o.basis}</span></div>
              <Wording text={o.response} />
              <div className="text-xs text-neutral-500">Clarify: {o.clarifyingQuestion}</div>
              {o.closeAsk && (
                <div className="flex items-start gap-2">
                  <div className="quote flex-1 font-medium">Close: {o.closeAsk}</div>
                  <CopyButton text={o.closeAsk} />
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <section>
        <h3 className="font-semibold">Fallback</h3>
        <p>{r.fallback.action}</p>
        <p className="text-xs text-neutral-500">Prerequisite: {r.fallback.prerequisite}</p>
        <Wording text={r.fallback.customerAsk} />
      </section>

      <section>
        <h3 className="font-semibold">Response branches</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-left text-xs text-neutral-500"><tr><th className="py-1">If the customer…</th><th>Then</th><th>Say</th><th>Stop / re-check</th></tr></thead>
            <tbody className="divide-y divide-neutral-100 align-top">
              {r.responseBranches.map((b, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">{b.customerResponse}</td>
                  <td className="pr-2">{b.nextAction}</td>
                  <td className="pr-2">
                    <div className="flex items-start gap-1"><span className="flex-1">{b.suggestedWording}</span>{b.suggestedWording && <CopyButton text={b.suggestedWording} label="Copy" />}</div>
                  </td>
                  <td>{b.stopOrRecheckCondition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {r.unknowns.length > 0 && (
        <section>
          <h3 className="font-semibold">What to verify (only what changes this recommendation)</h3>
          <ul className="list-disc pl-5">
            {r.unknowns.map((u, i) => <li key={i}>{u.fact} <span className="text-xs text-neutral-500">→ {u.suggestedTask}</span></li>)}
          </ul>
        </section>
      )}

      <p className="text-xs text-neutral-500"><strong>Next review trigger:</strong> {r.nextReviewTrigger}</p>
      {r.notes.map((n, i) => <p key={i} className="text-xs text-neutral-500">{n}</p>)}

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2">
        <span className={`badge ${stale ? "badge-warn" : "badge-good"}`}>{stale ? "stale" : "current"}</span>
        <span className="badge">{modeLabel}</span>
        <span className="badge">as of {new Date(sb.asOf).toLocaleString("en-GB")}</span>
      </div>
    </div>
  );
}
