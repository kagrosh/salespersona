# Customer Psychology CRM — sales playbooks and source notes

**Revision 2 · 15 September 2026**  
Companion to `CLAUDE_PROJECT_HANDOFF.md`. The following playbooks are proposed CRM behavior. They are original adaptations for this business; the current HTML prototype does not implement them.

## 1. Commercial direction

The user wants the assistant to work hard to win the sale: generate fresh angles, be assertive, overcome obstacles and always propose a solution based on the current situation.

The product should act like an experienced salesperson preparing the next move. Give a recommendation rather than a list of equally vague options. Explain why that move fits, provide words to use, ask for a concrete commitment, and supply a fallback if the customer objects.

Operational meaning of “aggressive” in this CRM:

- Take initiative and recommend a course of action.
- Ask direct questions about budget, value, authority, timing and readiness.
- Challenge an incomplete comparison with relevant evidence.
- Defend demonstrated value before considering a concession.
- Negotiate within actual commercial authority and offer terms that exist.
- Close directly when the opportunity is ready.
- When the preferred property cannot work, preserve the opportunity through a suitable alternative.
- Replace vague follow-up with an action, owner, purpose and agreed date or trigger.

No strategy can guarantee a sale. Persistence must use truthful claims and actual choices; fabrication, hidden material drawbacks and ignoring an explicit refusal are not implementation requirements. A source's forceful rhetoric is not permission to invent a project fact.

## 2. Resource review and limitations

[User's Drive library](https://drive.google.com/drive/folders/1MahYBJ16Nq8JGVEfK8t6VD71ZBomBPiK) was accessible. Five direct subfolders were listed: Sales, Marketing Strategies, Copywriting, Research/Reports and Digital Growth/Performance. This produced **54 direct entries: 53 PDFs and one nested folder**. Several titles appear more than once. These are file counts, not unique-work counts. The nested Boron Letters folder was not traversed.

Text was fetched for nine selected PDFs. Relevant passages were examined in seven sales/copywriting items; the opening and date context were examined in two real-estate reports. This was not a cover-to-cover review or a complete ingestion of the library. `SALES_SOURCE_CATALOG.json` records the exact IDs, URLs and review coverage.

### Selected sources and their application

| Source | Reviewed area | Application to this CRM |
| --- | --- | --- |
| [SPIN Selling — Neil Rackham](https://drive.google.com/file/d/1jXxunzyhd1O2URq797LlXeC9MyJ4hE1H/view) | Obtaining the Right Commitment, including advances versus continuations; Need-Payoff Questions. | Ask focused questions that connect a real problem to a valued result. End with an agreed action that moves the opportunity, rather than treating praise or an indefinite follow-up as progress. |
| [The Challenger Sale — Matthew Dixon and Brent Adamson](https://drive.google.com/file/d/1xuGJgYAP_XE1xTMfBDP7DPqWm5ybO6OI/view) | Combination of skills; Taking Control of the Sale. | Bring a supported insight, tailor its relevance, discuss price directly and ask for commitment. The reviewed text distinguishes assertiveness from aggression or abuse. |
| [Influence: The Psychology of Persuasion — Robert Cialdini](https://drive.google.com/file/d/16wsF-jKWKPDCGAfDDR6W0plb49TVeeax/view) | Scarcity and introductory social-proof material; supplied edition's contents. | Make genuine differentiators and verified evidence noticeable. Scarcity requires current availability/deadline evidence. A testimonial needs a real, authorized source and relevant context. |
| [The Psychology of Selling — Brian Tracy](https://drive.google.com/file/d/1qT8rr4vIitbEbz3QXTybTPDJuTAcuOMk/view) | Dominant-benefit discussion under The Hot-Button Close. | Identify the benefit the customer actually says matters most, then make the project case around evidence for that benefit. Reassess it when the customer gives new information. |
| [Predictable Revenue — Aaron Ross and Marylou Tyler](https://drive.google.com/file/d/18DsMvilKK51OuvU8dIKZocBB9pUgGyoD/view) | Qualification-call flow, next steps and ideal-customer-profile discussion. | Separate fit discovery from closing, record ownership and next action, and keep follow-up relevant. Its B2B process needs adaptation to this property business. |
| [Building a StoryBrand — Donald Miller](https://drive.google.com/file/d/1tjNQRtPXPQTxHWPZjmOOgpX44I4i43Pg/view) | Introduction and guide-versus-hero discussion. | Organize the pitch around the customer's desired outcome, the obstacle and a clear path forward. Avoid a long developer-centered feature recital. |
| [File titled The Copywriter's Handbook — Robert Bly](https://drive.google.com/file/d/1RYPchZuoZ2U21vEOR7AUa-4Z5QgivFFJ/view) | Opening, customer/benefit questions and clear-copy guidance. | Use specific benefits, plain language and one obvious action in follow-up drafts. The supplied file calls itself a summary; it is not verified as the full book or an author-published summary. |
| [2026 Real Estate Outlook](https://drive.google.com/file/d/1XS9Kq4asMAx-Q9S7ldEF-ueCs_Vj32Cj/view) | PGIM Europe cover and executive-summary date. | The document explicitly dates its views to November 2025. Use its date/scope as a freshness example; no current local or individual-property claim was established from it. |
| [2026 Commercial Real Estate Outlook](https://drive.google.com/file/d/1hs65vTpttWR_NTMLiVC51Bp3kHPKrksi/view) | Deloitte article header and opening discussion. | The article is dated 29 September 2025. Its broad industry outlook does not establish a September 2026 property price, return or permission. |

### Additional official sources checked

- [Huthwaite: SPIN Selling questions](https://www.huthwaiteinternational.com/blog/spin-selling-questions) explains the four question types and the need to use situation questions selectively. This supports focused discovery instead of repeatedly asking for facts already in the CRM.
- [Challenger: methodology overview](https://challengerinc.com/what-is-challenger-sales-methodology/) describes teaching, tailoring, taking control and constructive tension. This supports a clear recommendation and commitment request backed by a relevant insight.
- [Influence at Work: persuasion principles](https://www.influenceatwork.com/7-principles-of-persuasion/) is an official reference for persuasion mechanisms. Use it to design evidence-based messages; it does not certify these new CRM playbooks or their conversion performance.

All scripts below are newly written examples. They are not quotations from these sources. The combination and ranking of methods is a product-design proposal, not a validated psychological model.

## 3. Current-state decision loop

The engine must react to what is true **now**, not only to the original customer profile or a pipeline label.

### Snapshot required at generation

1. **Timing:** analysis timestamp/time zone, latest relevant interaction, customer-stated deadline and next agreed event.
2. **Purchase objective:** current goal and essential requirements; identify any changed priority.
3. **Offer:** selected property, actual asking/quoted price, currency, complete/unknown costs, availability and quote validity.
4. **Readiness:** budget scope, funding information, decision participants and the customer's stated willingness to proceed.
5. **Blocker:** current explicit objection; distinguish it from older objections that have been resolved.
6. **Evidence:** what supports each proposed benefit; what remains unverified, disputed or stale.
7. **History:** angles already tried, wording actually used, customer response and result.
8. **Authority:** which concessions, payment terms, holds or alternatives the salesperson is authorized to offer.

Missing fields do not all have to block analysis. Ask for the smallest missing fact that could change the recommendation; give an actionable conditional plan while it is gathered. Never fill unknown facts with plausible-sounding details.

### Resolution and selection order

- Prefer the newest explicit, relevant customer statement over an older inference. Preserve conflicting statements and request clarification if their scope is unclear.
- Confirm that the proposed offer still exists and the supporting quote/terms remain usable.
- Identify the strongest next commitment the current facts support: discovery answer, comparison decision, document review, visit, decision meeting, offer or purchase step.
- Resolve a firm price/requirements mismatch through actual alternatives or authorized negotiation.
- Select relevant method cards and construct angles tied to case evidence.
- Rank by relevance to the active blocker, strength of support, fit with current stage, practical feasibility and what has already been tried. Explain the order in words; do not invent probabilities.
- Provide a primary move, a fallback and conditional replies.
- Save the proposed strategy separately from any action the salesperson later takes.
- After a material change, create a new analysis and show what changed in the recommendation.

This is event-driven application behavior. It does not authorize a background monitor, automatic outbound messages or recurring tasks in the current handoff session.

## 4. Required sales output

Every substantive strategy should contain:

**Current reading:** “As of [time], the active blocker is [X], based on [customer statement/activity]. Since the last run, [Y] changed.”

**Primary move:** One recommended action and why it fits now.

**Angles:** Up to three genuinely distinct approaches. For each: the customer's priority, project evidence, method source, suggested wording, a direct ask and the conditions under which the approach should change.

**Fallback:** A different action or commercial path if the first approach fails. It should address the cause of the objection, not just rewrite the same pitch more loudly.

**Response branches:** At minimum, an expected agreement, the main objection, and a delay/new constraint. Include the actual next question or action.

**Next commitment:** The requested action, who should take it and when or under which trigger. Any proposed appointment must be marked proposed until agreed.

**What to verify:** Only the facts that affect this recommendation, with a task/owner suggestion. A warning without a way to resolve it is incomplete advice.

**Ready-to-use draft:** Short enough for the selected channel and in the customer's preferred language. Quotes, documents or claims inserted into it must be supported.

## 5. Original real-estate playbooks

### A. Customer likes the project and asks for a discount

**Use when:** The property appears to fit, but price is the active objection. Confirm whether the issue is a firm budget cap, a competing offer or perceived value.

**Primary move:** Isolate the decision condition and establish what an actual concession would achieve. Inspect authorized terms before promising a change.

**Say:** “If we can agree on a total price within your confirmed limit, what else would need to be resolved before you make an offer?”

**Then:** If price is the only remaining point, propose the approved negotiation path and ask for a specific conditional commitment. If another issue appears, address that issue before spending margin.

**Fallback:** Offer a verified alternative unit/plot that preserves the customer's top priority within the budget. Do not describe financing or instalments as available unless confirmed.

**Close request:** “If the seller accepts those terms and the remaining checks are satisfactory, are you ready to submit the offer?” This is a discussion prompt, not an assertion that the offer or acceptance already exists.

### B. Customer says the competing project is cheaper

**Use when:** A specific competing option and current comparable terms are available.

**Primary move:** Compare total commitment and the two or three criteria the buyer values most. Identify a meaningful, supported trade-off rather than a generic claim of higher quality.

**Say:** “Let's put both offers on the same basis. You said [priority] matters most. Here is what each option actually includes for that requirement.”

**Direct ask:** “Given that comparison, which trade-off would you prefer to make?”

**Fallback:** If the competitor wins on the customer's own essentials, suggest a better-fitting property or a genuinely available revised offer. Record the loss reason rather than pretending the evidence favors the original listing.

### C. Income investor repeatedly asks about returns

**Use when:** Income is an explicit priority and the relevant evidence is available or can be obtained.

**Primary move:** Identify the return definition the customer uses, separate evidence from assumptions, and focus on the variables affecting their decision. If the CRM does not implement a financial model, request the necessary information rather than generate a numeric yield.

**Say:** “Before comparing headline returns, let's agree what costs and vacancy assumptions belong in the calculation. Which minimum outcome would make this worth progressing?”

**Direct ask:** “If the documented numbers meet that condition, shall we move to reviewing the property and its remaining checks?”

**Fallback:** If the supported case misses their criterion, present an available alternative with a better documented fit or revisit the stated objective. Do not promise an unverified rent or guaranteed appreciation.

### D. Tourism/commercial plot buyer wants to develop

**Use when:** The buyer has described the intended use, such as a hospitality or commercial project.

**Primary move:** Turn the development ambition into a focused feasibility discussion: intended use, relevant documentation, site constraints, access/services and funding scope.

**Say:** “The right plot is the one that can support your project. Let's settle the use and site questions that determine whether this one can do that.”

**Direct ask:** “Will you join a review with your chosen specialist once we assemble the relevant records?”

**Fallback:** If a requirement fails or the necessary evidence is missing, identify an alternative plot or a specific evidence-gathering task. Keep the land purchase budget distinct from the development budget.

### E. Ongoing apartment or villa buyer worries about delivery

**Use when:** Delivery timing is material to the customer's plans.

**Primary move:** Connect documented progress and terms to the customer's actual date requirement. Ask what level of timing uncertainty they can accept.

**Say:** “Your plan depends on being able to use the property by [customer-stated date]. Let's compare that requirement with the documented milestones and the remaining dependencies.”

**Direct ask:** “If those terms fit your timing, are you ready to review the specific unit and offer?”

**Fallback:** Compare a completed property if it meets the customer's essentials. Do not turn a construction target into a guarantee.

### F. International customer needs to buy remotely

**Use when:** Remote location creates a stated practical obstacle. This is a logistics playbook, not a nationality-based personality assumption.

**Primary move:** Offer a concrete verification plan using available walkthroughs, documents, chosen representatives and a clear decision sequence.

**Say:** “Let's separate what you need to inspect personally from what we can help you verify before you travel. I suggest we start with [the available evidence relevant to the main concern].”

**Direct ask:** “Would you like to schedule that review, and who else should be included?”

**Fallback:** Prepare a focused visit or representative-led review. Verify jurisdiction-specific legal or eligibility questions through current authoritative sources when those questions arise.

### G. Customer delays without naming a blocker

**Use when:** There is no explicit stop/no-contact instruction, and previous notes do not already explain the delay.

**Primary move:** Ask one concise question that distinguishes timing, information and interest. Offer a new useful fact or a concrete choice only if available.

**Say:** “Which would be most useful now: resolving the open question, comparing another option, or agreeing on a later date?”

**If they name a blocker:** Address it and request a specific next action.

**If timing is the issue:** Agree a date or event for reconsideration.

**If interest has ended:** Record the outcome and contact preference. Do not classify silence as consent or automatically intensify contact frequency.

### H. Another person needs to approve

**Use when:** A partner, adviser or business decision-maker has an actual role.

**Primary move:** Prepare a compact case around the shared decision criteria and offer a joint review.

**Say:** “What would the other decision-maker need answered to decide? Let's put those points and the offer terms in one brief.”

**Direct ask:** “Can we arrange a review with the people whose agreement is needed?”

**Fallback:** Give the contact a factual comparison they can share, then agree when to revisit the outcome. Do not assume the contact is powerless or that bypassing them will help.

### I. Customer is ready and material questions are resolved

**Use when:** Current availability, offer terms and the customer's stated readiness support a purchase step.

**Primary move:** Recommend the actual next transaction step directly. Do not restart generic discovery.

**Say:** “We've addressed [confirmed questions], and this option meets [confirmed priorities]. Shall we prepare the offer on [actual terms]?”

**Fallback:** If they hesitate, ask which single issue remains. Update the state from that answer rather than recycling the entire presentation.

**Execution boundary:** A suggested close is not a signed offer, reservation or payment authorization. Record actual acceptance and use the business's real process.

### J. A real deadline or availability constraint exists

**Use when:** The deadline/constraint is relevant, documented, unexpired and checked recently enough for the decision.

**Primary move:** State the actual constraint and its consequence in neutral factual terms, then ask for the next decision.

**Say:** “The documented offer terms are valid until [verified date]. If you want those terms, the next required step is [actual step]. Shall we review the remaining question in time to decide?”

**Fallback:** If the deadline cannot be met, compare the next available terms or property. Do not invent a competing buyer, expiring discount or “last unit” claim.

## 6. Turning the library into reusable CRM knowledge

### Source record

Store source ID, URL/Drive ID, title, author/publisher if established, edition or actual publication date, relevant geography, access/retrieval date, content version, type (book, summary, report, official page), extraction status, review status and useful locators.

Unread metadata is not evidence. Duplicated titles are not automatically duplicate content. A Drive modification date is not a publication date. The supplied Bly file demonstrates why content type needs inspection.

### Method card

Create concise original summaries with:

- Source ID and chapter/section/page locator when established.
- The sales problem the method can help address.
- Applicable stages and customer-stated conditions.
- Questions and original script patterns.
- Required project/customer evidence.
- Conditions where another approach should be used.
- A concrete commitment request and fallback.

Store brief methods and source pointers, not large copied book passages in customer-facing outputs. Keep full source material in the authorized document store. The handoff bundle contains references and original adaptations, not copies of the books.

### Retrieval and generation

Retrieve a small set of methods relevant to the active blocker, property type and stage, then combine them with separately retrieved case evidence. Cite both types distinctly. An old framework can remain useful for a conversation method; an old market forecast needs a current relevance check before supporting a factual pitch.

If sources disagree, select by applicability and current case evidence rather than combining every technique. A committed buyer needs a clear close; an unresolved title/use question needs verification; an uninterested customer does not need a longer pitch.

### Similar accessible resources

The user permits relevant supplementary research. Prefer official method owners for methodology explanations and original, authoritative sources for current property-market, regulatory or financial facts. Do not include identifying customer notes in public search queries. Record the source, date, scope and whether the claim is an observation or forecast.

For real-time project facts, the authoritative source is normally the current inventory record, actual offer or responsible business contact—not a general sales book. Verification intervals are a configurable product decision, not a universal time limit invented in this handoff.

## 7. Example of adaptation across one deal

**Synthetic example, not an actual customer or property.** Same currency throughout.

| New information | How the recommendation changes |
| --- | --- |
| Customer's firm total purchase ceiling is 100,000. Asking price is 110,000 and known other purchase costs are 5,000. | Lead with resolving the 15,000 gap. Explore only authorized negotiation or available alternatives. Do not push a purchase commitment at the current total. |
| An actually approved alternative offer is recorded at 94,000 plus confirmed costs of 5,000. | The recorded total becomes 99,000. Retire the old gap-based angle; confirm the alternative still meets the customer's essential requirements. |
| Customer accepts the revised numbers but says a partner must review them. | Shift to a concise joint decision brief and a review with both decision-makers. Stop leading with a discount question. |
| Both confirm the fit but ask for a property visit. | Propose the visit with a checklist tied to the remaining questions; an appointment stays proposed until agreed. |
| After the visit, they confirm readiness and current terms/availability are reconfirmed. | Ask directly to prepare the actual offer. Do not restart the original eight-question assessment. |
| Before the offer is prepared, the unit becomes unavailable. | Invalidate the unit-specific close and present verified alternatives; do not continue using stale availability. |

## 8. Implementation checks added by this revision

- Every primary angle references current customer/project evidence and a method source or is clearly labeled an original rule.
- A hard blocker produces a resolution action and fallback.
- A ready-to-close case produces a direct transaction-step request.
- A changed price, unavailable property or resolved objection changes the next recommendation.
- A failed angle is not automatically repeated without a reason tied to new evidence.
- Customer-facing scripts contain no unverified price concessions, returns, scarcity, testimonials or legal claims.
- Source dates, review scope and summary-versus-full-work distinctions remain visible in the knowledge library.
- The system records what the salesperson actually tried and the customer's actual response; it does not fabricate learning outcomes.
- Method attribution is not presented as proof that the CRM is endorsed by an author or validated to increase conversion.

## 9. Instruction to Claude

Implement revision 2 as part of the opportunity workspace and strategy service. Preserve the sales objective and give concrete solutions. Start with transparent method cards and state-based rules; add authorized source retrieval and full-case model analysis behind the provider adapter. Keep an explicit distinction between current case evidence, reusable sales methods and time-sensitive market information. Do not spend the first iteration ingesting every book before a persistent end-to-end CRM workflow exists.
