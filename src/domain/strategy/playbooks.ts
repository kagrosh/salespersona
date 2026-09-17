// Playbook library (closer revision). Original adaptations; scripts are examples, not quotations from the sources.
// A method source supports a conversation approach; it never verifies a project fact.
//
// Templates use {tokens} filled by the engine from the case snapshot (see engine.ts `buildVals`):
// {first} {salutation} {salCall} {project} {unit} {unitAcc} {unitDat} {unitGen} {unitYours} {reference} {price} {costs} {total}
// {budget} {goal} {concern} {slotA} {slotB} {validUntil} {validSource} {alt} {altProject} {altPrice} {altCount} {evidence}
// {nextStep} {objection} {number} {authorizedTerms} {concessions} {lostReason} {pauseDate} {revisitDate} {targetDate}
// {participants} {count} {countSource} {checkedDate} {priceValidUntil} {priceChangeClause} {stagePaymentClause} {days}
// {gap} {mustHaves} {proceedCondition} {missingCheck}
// Every token has an honest fallback in the engine; a template must never depend on a value that may be missing.

export type L = { en: string; tr: string };

export type MethodSource = {
  id: string;
  title: string;
  attribution: string;
  reviewStatus: string;
  locator: string;
  applies: string;
};

export const METHOD_SOURCES: Record<string, MethodSource> = {
  spin: {
    id: "spin",
    title: "SPIN Selling",
    attribution: "Neil Rackham (Drive file 1jXxunzyhd1O2URq797LlXeC9MyJ4hE1H)",
    reviewStatus: "selected passages reviewed",
    locator: "Obtaining the Right Commitment (advances vs continuations); Need-Payoff Questions",
    applies: "End every conversation with an agreed action that moves the deal; ask focused questions that connect a real problem to a valued result.",
  },
  challenger: {
    id: "challenger",
    title: "The Challenger Sale",
    attribution: "Matthew Dixon & Brent Adamson (Drive file 1xuGJgYAP_XE1xTMfBDP7DPqWm5ybO6OI)",
    reviewStatus: "selected passages reviewed",
    locator: "Combination of skills; Taking Control of the Sale",
    applies: "Bring a supported insight, discuss price directly, ask for commitment. Assertive, not aggressive.",
  },
  cialdini: {
    id: "cialdini",
    title: "Influence: The Psychology of Persuasion",
    attribution: "Robert Cialdini (Drive file 16wsF-jKWKPDCGAfDDR6W0plb49TVeeax)",
    reviewStatus: "selected passages reviewed",
    locator: "Scarcity; introductory social-proof material",
    applies: "Scarcity only with current availability/deadline evidence; testimonials need a real, authorized source.",
  },
  tracy: {
    id: "tracy",
    title: "The Psychology of Selling",
    attribution: "Brian Tracy (Drive file 1qT8rr4vIitbEbz3QXTybTPDJuTAcuOMk)",
    reviewStatus: "selected passages reviewed",
    locator: "The Hot-Button Close",
    applies: "Build the case around the benefit the customer says matters most; reassess when new information arrives.",
  },
  storybrand: {
    id: "storybrand",
    title: "Building a StoryBrand",
    attribution: "Donald Miller (Drive file 1tjNQRtPXPQTxHWPZjmOOgpX44I4i43Pg)",
    reviewStatus: "selected passages reviewed",
    locator: "Introduction; guide-versus-hero discussion",
    applies: "Organize the pitch around the customer's desired outcome, the obstacle and a clear path forward.",
  },
  bly: {
    id: "bly",
    title: "The Copywriter's Handbook (supplied file is a summary)",
    attribution: "Robert Bly (Drive file 1RYPchZuoZ2U21vEOR7AUa-4Z5QgivFFJ)",
    reviewStatus: "selected passages reviewed; file self-describes as a summary",
    locator: "Opening; customer/benefit questions; clear-copy guidance",
    applies: "Specific benefits, plain language and one obvious action in follow-up drafts.",
  },
  predictable: {
    id: "predictable",
    title: "Predictable Revenue",
    attribution: "Aaron Ross & Marylou Tyler (Drive file 18DsMvilKK51OuvU8dIKZocBB9pUgGyoD)",
    reviewStatus: "selected passages reviewed",
    locator: "Qualification-call flow and next steps; ideal customer profile",
    applies: "Separate fit discovery from closing; record ownership and the next action.",
  },
  rule: {
    id: "rule",
    title: "Original CRM rule",
    attribution: "Salesperson CRM handoff, revision 2 + closer revision",
    reviewStatus: "n/a",
    locator: "SALES_PLAYBOOK_AND_SOURCES.md §5; panel review 2026-09-16/17",
    applies: "Original adaptation with no external source.",
  },
};

export type Playbook = {
  id: string;
  title: string;
  methodSourceIds: string[];
  useWhen: string;
  avoidWhen: string;
  say: L;
  directAsk: L;
  questionToTest: L;
  proofNeeded: string[];
  /** Two-sentence reply used in the objections section (falls back to `say`). */
  objectionReply?: L;
  /** What to say when the customer pushes back on this angle (a different path, not the same pitch louder). */
  fallbackAsk?: L;
  /** Concession-for-commitment sentence, used only when a real concession exists. */
  tradeAsk?: L;
  /** Message-shaped draft (≤ 90 words) if the generic composer is not good enough. */
  message?: L;
  /** Message variant when no new recorded fact exists (never claims a change). */
  messageNoEvidence?: L;
  /** Say variant when no new recorded fact exists (never claims a change). */
  sayNoEvidence?: L;
  /** Variants when no alternative property is on file (never offer to reserve something that does not exist). */
  sayNoAlt?: L;
  messageNoAlt?: L;
  callOpenerNoAlt?: L;
  fallbackAskNoAlt?: L;
  callOpener?: L;
};

// ---------------------------------------------------------------------------
// Turkish and English labels for vocabulary keys used inside customer-facing text
// ---------------------------------------------------------------------------
export const GOAL_TR: Record<string, string> = {
  income: "kira geliri",
  growth: "uzun vadeli değer artışı",
  preserve: "sermayeyi korumak",
  resale: "yenileyip satmak",
  mixed: "yatırım artı kendi kullanımınız",
  residency: "oturma izni / vatandaşlık yolu",
  build: "kendi kullanımınız için inşa etmek",
  develop: "geliştirip satmak veya kiralamak",
  hold: "ileride değerlendirmek üzere tutmak",
};
export const GOAL_EN: Record<string, string> = {
  income: "rental income",
  growth: "long-term value growth",
  preserve: "preserving your capital",
  resale: "renovation and resale",
  mixed: "investment plus your own use",
  residency: "the residency / citizenship route",
  build: "building for your own use",
  develop: "developing to sell or lease",
  hold: "holding for future options",
};
export const CONCERN_TR: Record<string, string> = {
  vacancy: "boş kalma riski",
  costs: "beklenmedik masraflar",
  management: "kiracı ve yönetim yükü",
  delivery: "teslim tarihi",
  resale: "gerektiğinde satamamak",
  trust: "proje ve satıcı bilgisine güven",
  value: "fazla ödeme veya değer kaybı",
  currency: "kur riski",
  legal: "tapu ve hukuki sorular",
  ownership: "tapu ve sınır belirsizliği",
  use: "imar ve kullanım uygunluğu",
  services: "yol, altyapı ve hizmetler",
  delays: "gecikme ve bekleme maliyeti",
};
export const CONCERN_EN: Record<string, string> = {
  vacancy: "empty months",
  costs: "unexpected costs",
  management: "the management workload",
  delivery: "delivery timing",
  resale: "being able to sell when needed",
  trust: "trusting the project information",
  value: "overpaying",
  currency: "the exchange rate",
  legal: "the legal and title questions",
  ownership: "the title and boundary questions",
  use: "whether your intended use is feasible",
  services: "access and services",
  delays: "delays and holding costs",
};
export const OBJECTION_TR: Record<string, string> = {
  price: "fiyat",
  cash_discount: "nakit indirimi",
  fees: "masraflar",
  competitor: "rakip proje",
  market_wait: "piyasayı bekleme",
  currency_risk: "kur riski",
  returns: "getiri",
  resale_liquidity: "yeniden satış",
  management: "kiracı yönetimi",
  delivery: "teslim tarihi",
  only_completed: "yalnızca tamamlanmış",
  developer_trust: "geliştiriciye güven",
  feasibility: "imar uygunluğu",
  location: "konum",
  remote: "uzaktan alım",
  legal_residency: "hukuki ve oturma izni soruları",
  approval: "ortak karar",
  spouse_no: "karar ortağının itirazı",
  trust: "bilgiye güven",
  think_it_over: "düşünme süresi",
  no_hurry: "acele yok",
  send_info: "bilgi gönderme",
  after_visit_home: "eve dönüşte karar",
};
export const LOST_REASON_L: Record<string, L> = {
  price: { en: "the price did not fit your budget", tr: "fiyat bütçenize uymadı" },
  competitor: { en: "you chose another project", tr: "başka bir projeyi tercih ettiniz" },
  timing: { en: "the timing was not right", tr: "zamanlama uygun değildi" },
  financing: { en: "the financing did not come together", tr: "finansman tamamlanamadı" },
  trust: { en: "you were not comfortable with the information", tr: "bilgilerden emin olamadınız" },
  location: { en: "the location did not work for you", tr: "konum size uymadı" },
  product: { en: "the property did not fit", tr: "mülk ihtiyacınıza uymadı" },
  no_response: { en: "we lost touch", tr: "iletişim koptu" },
  other: { en: "it did not work out", tr: "olmadı" },
};
/** Customer-facing phrasing of the internal "missing for close" checks (never speak the internal label). */
export const CHECK_L: Record<string, L> = {
  "availability not checked": { en: "the availability of {unit}", tr: "{unitGen} müsaitliğini" },
  "availability check older than 14 days": { en: "the availability of {unit}", tr: "{unitGen} müsaitliğini" },
  "complete cost list unknown": { en: "the complete cost list", tr: "kalem kalem masraf listesini" },
};
export const BUDGET_CHECK = "budget not comparable (missing, scope or currency)";

// ---------------------------------------------------------------------------
// Stage ladder: the floor for the commitment ask when no stronger close applies
// ---------------------------------------------------------------------------
export const STAGE_LADDER: Record<string, { ask: L; afterYes: L; next: string }> = {
  new: {
    ask: { en: "Let's do a 20-minute call to pin down exactly what this purchase must deliver for you. {slotA} or {slotB}?", tr: "Bu yatırımın sizin için tam olarak ne sağlaması gerektiğini netleştirmek üzere 20 dakikalık bir görüşme yapalım. Hangisi uygun: {slotA} ya da {slotB}?" },
    afterYes: { en: "Book the call; in it record goal, concern, budget, funding timing and who decides.", tr: "Görüşmeyi ayarlayın; hedef, endişe, bütçe, fon zamanlaması ve karar vericileri kaydedin." },
    next: "discovery",
  },
  discovery: {
    ask: { en: "Based on what you've told me I'll bring two options that fit {goal} within {budget}. Shall we go through them together {slotA}?", tr: "Anlattıklarınıza göre {goal} için {budget} içinde kalan iki seçenek getireceğim. {slotA} saatinde birlikte inceleyelim mi?" },
    afterYes: { en: "Attach the two options, move to shortlist, book the review.", tr: "İki seçeneği ekleyin, kısa listeye geçin, incelemeyi ayarlayın." },
    next: "shortlist",
  },
  qualified: {
    ask: { en: "Shall we see {unit} {slotA} or {slotB}? If you'd rather see another one first, tell me which.", tr: "{unitAcc} {slotA} ya da {slotB} saatinde görelim mi? Önce başka birini görmek isterseniz söyleyin." },
    afterYes: { en: "Book the visit (or the remote walkthrough) with the open-question checklist attached.", tr: "Ziyareti (veya uzaktan turu) açık soru listesiyle birlikte ayarlayın." },
    next: "visit",
  },
  shortlist: {
    ask: { en: "Shall we see {unit} {slotA} or {slotB}? If you'd rather see another one first, tell me which.", tr: "{unitAcc} {slotA} ya da {slotB} saatinde görelim mi? Önce başka birini görmek isterseniz söyleyin." },
    afterYes: { en: "Book the visit (or the remote walkthrough) with the open-question checklist attached.", tr: "Ziyareti (veya uzaktan turu) açık soru listesiyle birlikte ayarlayın." },
    next: "visit",
  },
  visit: {
    ask: { en: "You've seen {unit}. If it's the one, I'll reconfirm availability today and we put it under {nextStep} {slotA}. Yes, no, or yes-if?", tr: "{unitAcc} gördünüz. Sizin için o ise bugün müsaitliği yeniden teyit edip {slotA} saatinde {nextStep} ile ayıralım. Evet mi, hayır mı, yoksa 'şu olursa evet' mi?" },
    afterYes: { en: "Reconfirm availability today, then prepare the reservation step per the business process.", tr: "Bugün müsaitliği yeniden teyit edin, ardından rezervasyon adımını iş sürecine göre hazırlayın." },
    next: "negotiation",
  },
  negotiation: {
    ask: { en: "If the seller confirms {authorizedTerms} in writing, will you sign the {nextStep} by {slotA}?", tr: "Satıcı {authorizedTerms} konusunu yazılı olarak teyit ederse {slotA} saatine kadar {nextStep} adımını imzalar mısınız?" },
    afterYes: { en: "Prepare the commitment-step document per the business process; Won only when the business confirms.", tr: "Taahhüt adımı belgesini iş sürecine göre hazırlayın; Kazanıldı yalnızca iş süreci teyit edince." },
    next: "won",
  },
};

// ---------------------------------------------------------------------------
// Playbooks
// ---------------------------------------------------------------------------
export const PLAYBOOKS: Record<string, Playbook> = {
  // ---- qualification and discovery -------------------------------------------------
  qualify: {
    id: "qualify",
    title: "Qualify hard: five facts in one call",
    methodSourceIds: ["spin", "predictable"],
    useWhen: "Two or more core facts are missing (goal, budget, decision-makers, decision date / why now, funding, must-haves).",
    avoidWhen: "The core facts are recorded; do not re-run discovery on a qualified deal.",
    say: {
      en: "Before I bring you options I want to be sure I bring the right ones, so {gapCount} quick questions: {gapQuestions}.",
      tr: "Size yanlış seçenekler getirmemek için {gapCount} kısa soru: {gapQuestions}.",
    },
    directAsk: { en: "Give me those and I'll bring two options that fit {slotA}. Does that work?", tr: "Bunları verin; {slotA} için size uyan iki seçenekle geleyim. Uygun mu?" },
    questionToTest: { en: "If you don't buy in the next three months, what happens to the money?", tr: "Önümüzdeki üç ayda almazsanız bu para ne olur?" },
    proofNeeded: ["Goal, budget with scope, decision participants, decision date and why now, funding source and timing, must-haves recorded with dates"],
    fallbackAsk: { en: "Then tell me just one: what would make you buy something this month?", tr: "O zaman yalnızca birini söyleyin: bu ay bir şey almanızı ne sağlar?" },
  },
  discovery: {
    id: "discovery",
    title: "Establish the strongest reason to buy",
    methodSourceIds: ["spin", "tracy"],
    useWhen: "The main purchase motivation has not been recorded.",
    avoidWhen: "The goal is already stated; do not re-run discovery.",
    say: {
      en: "One question decides everything else: what does owning the right property have to do for you, and what would have to be true for you to proceed?",
      tr: "Diğer her şeyi tek bir soru belirler: doğru mülkün sahibi olmak sizin için ne yapmalı ve ilerlemeniz için nelerin doğru olması gerekir?",
    },
    directAsk: { en: "Once that's clear, I'll bring the two options that fit it. Shall we review them together {slotA}?", tr: "Bu netleşince ona uyan iki seçeneği getireceğim. {slotA} saatinde birlikte inceleyelim mi?" },
    questionToTest: { en: "If we could establish only one benefit, which would matter most?", tr: "Tek bir fayda kanıtlayabilseydik, en çok hangisi önemli olurdu?" },
    proofNeeded: ["The customer's stated goal and concern, recorded with date"],
  },
  search: {
    id: "search",
    title: "The refused unit is off the table: search on what it missed",
    methodSourceIds: ["spin", "rule"],
    useWhen: "The customer refused this unit or project (not contact) and no fitting alternative is attached yet.",
    avoidWhen: "Never bring the refused unit back. If the customer refused contact, stop.",
    say: {
      en: "Understood, {unit} is off the table and I won't bring it back. What did it miss? Tell me in one sentence and I'll search on exactly that.",
      tr: "Anlaşıldı, {unit} gündemden çıktı; onu tekrar önermeyeceğim. Neyi karşılamadı? Tek cümleyle söyleyin, tam olarak ona göre arayayım.",
    },
    directAsk: { en: "Shall we go through what I find {slotA}?", tr: "Bulduklarımı {slotA} saatinde birlikte inceleyelim mi?" },
    questionToTest: { en: "In one sentence, what did it miss?", tr: "Tek cümleyle: neyi karşılamadı?" },
    proofNeeded: ["The customer's stated reason recorded as a quote", "An inventory search on that requirement"],
  },
  dominant: {
    id: "dominant",
    title: "Build the case on the customer's stated dominant benefit",
    methodSourceIds: ["tracy", "storybrand"],
    useWhen: "A main goal is stated and no blocker dominates.",
    avoidWhen: "The main goal has not been stated; ask for it first.",
    say: {
      en: "You told me the one thing {unit} has to deliver is {goal}. What we can show for that today is {evidence}. The only thing still open is {concern}.",
      tr: "{unit} için tek önceliğinizin {goal} olduğunu söylediniz. Bugün bunun için gösterebildiğimiz: {evidence}. Açıkta kalan tek konu {concern}.",
    },
    directAsk: { en: "If that one point is answered to your satisfaction, shall we go to the {nextStep}? {slotA} or {slotB}?", tr: "Bu tek nokta sizi tatmin edecek şekilde yanıtlanırsa {nextStep} adımına geçelim; hangisi uygun: {slotA} ya da {slotB}?" },
    questionToTest: { en: "If we could establish only one benefit, which would matter most?", tr: "Tek bir fayda kanıtlayabilseydik, en çok hangisi önemli olurdu?" },
    proofNeeded: ["A verified project record that directly supports the stated benefit"],
    fallbackAsk: { en: "Then I've misread what matters. Tell me in one sentence what {unit} has to do for you and I'll re-check it against that.", tr: "O zaman önemli olanı yanlış anlamışım. {unit} sizin için ne yapmalı, tek cümleyle söyleyin, ona göre tekrar bakayım." },
    message: {
      en: "Hi {first}, quick one on {project}, {unit}. You told me the one thing this has to deliver is {goal}. I have {evidence} ready to walk you through; the only thing still open is {concern}. Can I call you {slotA} or {slotB} to go through both? Which suits?",
      tr: "Merhaba {salutation}, {project} {unit} için kısa bir not. Bu yatırımın sizin için tek önceliği {goal} demiştiniz. Elimde {evidence} hazır; açıkta kalan tek konu {concern}. İkisini birlikte netleştirmek için arayayım; hangisi uygun: {slotA} ya da {slotB}?",
    },
    callOpener: {
      en: "{first}, it's about {project}. Two minutes: you said {goal} is what this has to do. I've got {evidence} on that, and one open question on {concern}. Is now a good time to go through both?",
      tr: "{salCall}, {project} için arıyorum. İki dakika: {goal} sizin için ana konu demiştiniz. Elimde {evidence} var; bir de {concern} ile ilgili açık bir soru. Şimdi ikisine bakmak için uygun musunuz?",
    },
  },

  // ---- closing ----------------------------------------------------------------------
  reservation: {
    id: "reservation",
    title: "Ask for the reservation on actual terms",
    methodSourceIds: ["challenger", "spin"],
    useWhen: "Material questions resolved, customer states readiness, availability and terms reconfirmed.",
    avoidWhen: "Any material blocker, unknown availability or stale terms remain. Never imply another buyer.",
    say: {
      en: "We've resolved what was open, and {unit} meets {goal}. The terms are {price}{costs}. Let's put it under {nextStep} today; that is the next step, and I'll reconfirm availability with the seller before we do it.",
      tr: "Açık olan her şeyi çözdük ve {unit} {goal} hedefinizi karşılıyor. Şartlar {price}{costs}. Bugün {nextStep} ile ayıralım; sonraki adım bu ve öncesinde müsaitliği satıcıyla yeniden teyit edeceğim.",
    },
    directAsk: { en: "Shall we do the {nextStep} today, or {slotA} at the latest?", tr: "Bugün {nextStep} yapalım mı, en geç {slotA}?" },
    questionToTest: { en: "Is there any single issue that would stop you from doing this today?", tr: "Bunu bugün yapmanızı engelleyecek tek bir konu var mı?" },
    proofNeeded: ["Reconfirmed availability (today)", "Current price and terms in writing", "The customer's stated readiness"],
    fallbackAsk: { en: "What is the one thing that would need to be true for you to proceed?", tr: "İlerlemeniz için doğru olması gereken tek şey ne?" },
    message: {
      en: "Hi {first}, on {project}, {unit}: we've resolved what was open and it meets {goal}. Terms as agreed: {price}{costs}. I'll reconfirm availability with the seller and can prepare the {nextStep} today or {slotA}. Which do you prefer?",
      tr: "Merhaba {salutation}, {project} {unit}: açık konuları çözdük ve {goal} hedefinizi karşılıyor. Şartlar konuştuğumuz gibi: {price}{costs}. Müsaitliği satıcıyla yeniden teyit edip {nextStep} adımını bugün ya da {slotA} saatinde hazırlayabilirim. Hangisini tercih edersiniz?",
    },
    callOpener: { en: "{first}, good news and one question. Everything we needed on {unit} is confirmed. Do we prepare the {nextStep} today?", tr: "{salCall}, iyi haber ve tek soru. {unit} için gereken her şey teyit edildi. {nextStep} adımını bugün hazırlıyor muyuz?" },
  },
  close_conditional: {
    id: "close_conditional",
    title: "Close conditionally on the one check still running",
    methodSourceIds: ["spin", "challenger"],
    useWhen: "The customer says they are ready but one seller-side verification (availability, cost list) is still open.",
    avoidWhen: "The check has failed; then present alternatives instead. Funding evidence is the customer's check, not the seller's.",
    say: {
      en: "I'm confirming {missingCheck} with the seller today; you'll have my answer the same day.",
      tr: "{missingCheck} bugün satıcıyla teyit ediyorum; cevabı aynı gün size iletirim.",
    },
    directAsk: { en: "If it comes back as described, shall we prepare the {nextStep} {slotA}?", tr: "Anlattığım gibi gelirse {slotA} için {nextStep} hazırlayalım mı?" },
    questionToTest: { en: "Apart from that check, is anything else between you and the {nextStep}?", tr: "Bu kontrol dışında sizinle {nextStep} arasında başka bir şey var mı?" },
    proofNeeded: ["The named check completed today with source and date"],
    fallbackAsk: { en: "What is the one thing that would need to be true for you to proceed?", tr: "İlerlemeniz için doğru olması gereken tek şey ne?" },
  },
  close_funding: {
    id: "close_funding",
    title: "Close conditionally on the customer's own funding evidence",
    methodSourceIds: ["spin", "challenger"],
    useWhen: "The customer says they are ready and only funding evidence (or financing timing) is missing.",
    avoidWhen: "Never present a stated budget as funding.",
    say: {
      en: "For the {nextStep} to hold, the seller will want to see the funds are in place. Once you send me the proof of funds, I'll prepare the {nextStep} the same day.",
      tr: "{nextStep} adımının geçerli olması için satıcı fonların hazır olduğunu görmek isteyecek. Fon belgesini bana ilettiğinizde aynı gün {nextStep} hazırlıyorum.",
    },
    directAsk: { en: "Can you have it to me by {slotA}? Then we do the {nextStep} the same day.", tr: "{slotA} saatine kadar bana iletebilir misiniz? O zaman aynı gün {nextStep} yapıyoruz." },
    questionToTest: { en: "When are the funds actually available, and who else needs to sign?", tr: "Fonlar fiilen ne zaman hazır ve başka kimin imzası gerekiyor?" },
    proofNeeded: ["Proof of funds or written financing approval with its timing"],
    fallbackAsk: { en: "If the funds are not ready yet, give me the date they will be and we'll book the {nextStep} for that week.", tr: "Fonlar henüz hazır değilse hazır olacağı tarihi söyleyin; {nextStep} adımını o haftaya ayarlayalım." },
  },
  close_terms: {
    id: "close_terms",
    title: "Lock the terms: get the all-in amount and the currency before the reservation",
    methodSourceIds: ["spin", "challenger"],
    useWhen: "The customer wants to make an offer (or is ready) but the budget is missing or not comparable (scope or currency).",
    avoidWhen: "A firm gap or an open objection exists; those come first.",
    say: {
      en: "You want to move, so let's lock it: the total is {price}{costs}. Give me the amount you're working with, all in, and the currency you'll pay in, and I'll prepare the {nextStep} today so the terms are fixed while you finish your checks.",
      tr: "İlerlemek istiyorsunuz; o zaman sabitleyelim: toplam {price}{costs}. Masraflar dahil çalıştığınız tutarı ve ödemeyi hangi para biriminde yapacağınızı söyleyin; kontrollerinizi tamamlarken şartlar sabit kalsın diye {nextStep} adımını bugün hazırlayayım.",
    },
    directAsk: { en: "Today or {slotA}? Give me the all-in amount and the currency, and I'll prepare it.", tr: "Bugün mü, yoksa {slotA} mı? Masraflar dahil tutarı ve para birimini söyleyin, hazırlayayım." },
    questionToTest: { en: "Is that amount the total including costs, and in which currency will you pay?", tr: "Bu tutar masraflar dahil toplam mı ve ödemeyi hangi para biriminde yapacaksınız?" },
    proofNeeded: ["Budget recorded with scope and currency", "Funding source and timing"],
    fallbackAsk: { en: "If you'd rather not name a figure yet, tell me what would need to be true for you to proceed and I'll work to that.", tr: "Henüz bir rakam vermek istemiyorsanız, ilerlemeniz için nelerin doğru olması gerektiğini söyleyin; ona göre çalışayım." },
  },
  close_authority: {
    id: "close_authority",
    title: "Within written authority: confirm the customer's number and close today",
    methodSourceIds: ["challenger", "rule"],
    useWhen: "The customer's number is within the seller's written price authorization.",
    avoidWhen: "No written authorization is recorded. Never reveal the authorized floor or that a written room exists.",
    say: {
      en: "I can confirm {number} for {unit}{costs}. Price is agreed, so we're done on price.",
      tr: "{unit} için {number}{costs} rakamını teyit edebilirim. Fiyatta anlaştık; fiyat konusu kapandı.",
    },
    directAsk: { en: "Price is agreed. Shall we do the {nextStep} today, or {slotA} at the latest?", tr: "Fiyatta anlaştık. Bugün {nextStep} yapalım mı, en geç {slotA}?" },
    questionToTest: { en: "With the price agreed, is there anything that would stop you completing?", tr: "Fiyat anlaşıldığına göre tamamlamanızı engelleyecek bir şey var mı?" },
    proofNeeded: ["Seller's written authorization on file (amount, date, source); salesperson-only", "Customer's number recorded as a quote with date"],
    message: {
      en: "Hi {first}, done: {number}{costs} for {unit} is agreed. I can prepare the {nextStep} today or {slotA} at the latest. Which?",
      tr: "Merhaba {salutation}, tamam: {unit} için {number}{costs} rakamında anlaştık. {nextStep} adımını bugün ya da en geç {slotA} saatinde hazırlayabilirim. Hangisi?",
    },
    callOpener: { en: "{first}, good news: {number}{costs} is agreed. Do we do the {nextStep} today?", tr: "{salCall}, iyi haber: {number}{costs} rakamında anlaştık. {nextStep} adımını bugün mü yapıyoruz?" },
  },
  post_visit: {
    id: "post_visit",
    title: "Trial close after the visit",
    methodSourceIds: ["spin", "challenger"],
    useWhen: "A visit took place and no decision, objection or next step is recorded.",
    avoidWhen: "An objection is already recorded (use its playbook) or the customer stated readiness (close).",
    say: {
      en: "You've seen {unit} now, so I'll ask you straight: is it the one, or not? If yes, let's talk terms today. If no, tell me what was missing and I'll find you the one that has it.",
      tr: "{unitAcc} gördünüz; net soruyorum: sizin için o mu, değil mi? Evetse şartları bugün konuşalım. Hayırsa neyin eksik olduğunu söyleyin, onu taşıyan seçeneği bulayım.",
    },
    directAsk: { en: "Yes, no, or 'yes if…'. Which is it?", tr: "Evet mi, hayır mı, yoksa 'şu olursa evet' mi? Hangisi?" },
    questionToTest: { en: "What did you notice on the visit that you hadn't expected, good or bad?", tr: "Ziyarette beklemediğiniz ne dikkatinizi çekti, iyi ya da kötü?" },
    proofNeeded: ["Availability rechecked today", "Customer's stated answer recorded as readiness or objection"],
    fallbackAsk: { en: "Then which one would you want to see instead, {alt}? I can arrange it {slotA}.", tr: "O zaman onun yerine hangisini görmek istersiniz, {alt}? {slotA} saatinde ayarlayabilirim." },
    message: {
      en: "Hi {first}, thanks for coming to {project}. Straight question: is {unit} the one? Yes, no, or yes-if. Reply with whichever and I'll act on it today.",
      tr: "Merhaba {salutation}, {project} ziyareti için teşekkürler. Net soru: {unit} sizin için o mu? Evet, hayır ya da 'şu olursa evet'. Hangisiyse yazın, bugün gereğini yapayım.",
    },
    callOpener: { en: "{first}, thirty seconds on {unit}. You've seen it. Is it the one, or not?", tr: "{salCall}, {unit} için otuz saniye. Gördünüz. Sizin için o mu, değil mi?" },
  },
  unit_swap: {
    id: "unit_swap",
    title: "Alternative-choice close between two real units",
    methodSourceIds: ["challenger", "rule"],
    useWhen: "A checked-available alternative fits the budget or the customer's essentials.",
    avoidWhen: "Alternative availability is unchecked or stale. Never say the seller refused unless it is recorded.",
    say: {
      en: "Here is another route to your number: {alt} in {altProject} at {altPrice}. The difference is what you'd be giving up; the question is whether that difference is worth {gap} to you. If not, {unitYours}.",
      tr: "Rakamınıza ulaşmanın başka bir yolu var: {altProject} projesinde {alt}, {altPrice}. Fark, vazgeçeceğiniz şey; soru şu: bu fark sizin için {gap} eder mi? Etmiyorsa {unitYours}.",
    },
    directAsk: { en: "Shall we reserve {alt} today, or is the difference worth the extra to you?", tr: "{alt} için bugün rezervasyon yapalım mı, yoksa fark sizin için fazlasına değer mi?" },
    questionToTest: { en: "In your words, what does {unit} have that {alt} does not?", tr: "Sizin sözlerinizle: {unitGen} {alt} seçeneğinde olmayan nesi var?" },
    proofNeeded: ["Alternative availability checked", "Recorded differences between the two units", "Alternative's total on the same cost basis"],
  },
  deadline: {
    id: "deadline",
    title: "State the documented deadline neutrally",
    methodSourceIds: ["cialdini"],
    useWhen: "A documented, sourced, unexpired terms deadline exists and the unit is available.",
    avoidWhen: "The date is expired, unsourced or invented. Never claim a competing buyer or last unit without a record.",
    say: {
      en: "The terms I have in writing ({validSource}) are valid until {validUntil}. I'm not adding pressure; I'm telling you the date so you decide with it, not against it.",
      tr: "Elimdeki yazılı şartlar ({validSource}) {validUntil} tarihine kadar geçerli. Baskı yapmıyorum; tarihi söylüyorum ki kararınızı buna göre verin.",
    },
    directAsk: { en: "Shall we complete the {nextStep} {slotA} or {slotB}, both inside that date?", tr: "{nextStep} adımını tamamlayalım mı; hangisi uygun: {slotA} ya da {slotB}? İkisi de o tarihin içinde." },
    questionToTest: { en: "Does that date work with the other people involved?", tr: "Bu tarih karara katılan diğer kişiler için uygun mu?" },
    proofNeeded: ["The written terms, their source and expiry date"],
  },
  scarcity_documented: {
    id: "scarcity_documented",
    title: "State the documented availability count, nothing more",
    methodSourceIds: ["cialdini"],
    useWhen: "A documented count of comparable units and its source are on file, the unit is available and the check is fresh.",
    avoidWhen: "No count or source recorded, availability unchecked, or the check older than 14 days.",
    say: {
      en: "As of the seller's list ({countSource}, checked {checkedDate}), there are {count} units like {unit} left. That is a fact I can show you; what you do with it is your call.",
      tr: "Satıcının listesine göre ({countSource}, {checkedDate} tarihli kontrol) {unit} gibi {count} daire kaldı. Bu size gösterebileceğim bir gerçek; ne yapacağınız sizin kararınız.",
    },
    directAsk: { en: "Do you want me to hold one of them under {nextStep} while you finish your checks?", tr: "Kontrollerinizi tamamlarken birini {nextStep} ile tutmamı ister misiniz?" },
    questionToTest: { en: "If it were gone next week, would that matter to you?", tr: "Gelecek hafta kalmasaydı sizin için fark eder miydi?" },
    proofNeeded: ["Availability count with source and check date ≤ 14 days"],
  },
  price_list: {
    id: "price_list",
    title: "State the documented price-list validity as a date",
    methodSourceIds: ["cialdini", "rule"],
    useWhen: "A documented price-list validity date or a sourced price-change note is on file and the unit is available.",
    avoidWhen: "Never predict the next list; state only the documented date and the seller's own note.",
    say: {
      en: "The price list I have is documented as valid until {priceValidUntil}{priceChangeClause}. I can't tell you what the next list will say; I'm giving you the date so you decide with it.",
      tr: "Elimdeki fiyat listesi belgeye göre {priceValidUntil} tarihine kadar geçerli{priceChangeClause}. Sonraki listenin ne diyeceğini bilemem; tarihi kararınızı buna göre verin diye söylüyorum.",
    },
    directAsk: { en: "Shall we complete the {nextStep} inside that validity, {slotA} or {slotB}?", tr: "{nextStep} adımını bu geçerlilik içinde tamamlayalım mı; hangisi uygun: {slotA} ya da {slotB}?" },
    questionToTest: { en: "Does deciding inside that date work for you and anyone else involved?", tr: "O tarihin içinde karar vermek sizin ve karara katılanlar için uygun mu?" },
    proofNeeded: ["Documented price-list validity and/or the seller's dated price-change note"],
  },

  // ---- price and negotiation ----------------------------------------------------------
  gap: {
    id: "gap",
    title: "Resolve the price gap: get the number first, then go to the seller once",
    methodSourceIds: ["challenger", "spin"],
    useWhen: "A firm or unconfirmed purchase ceiling is below the known total.",
    avoidWhen: "The customer has stated the budget is flexible, or scope/currency do not match.",
    say: {
      en: "The total today is {price}{costs}, above the {budget} you gave me. Before I go to the seller I need to know exactly what you would sign at, because I go once. Not a wish: the number you'd sign at tomorrow.",
      tr: "Bugünkü toplam {price}{costs}; bana verdiğiniz {budget} sınırının üzerinde. Satıcıya gitmeden önce tam olarak hangi rakamda imza atacağınızı bilmem gerekiyor, çünkü bir kez giderim. Dilek değil: yarın imza atacağınız rakam.",
    },
    directAsk: { en: "If the seller accepts your number in writing, you sign. Yes or no?", tr: "Satıcı rakamınızı yazılı olarak kabul ederse imzalıyorsunuz. Evet mi, hayır mı?" },
    questionToTest: { en: "Is the amount a firm ceiling, and does it include purchase costs?", tr: "Bu tutar kesin bir üst sınır mı ve satın alma masraflarını içeriyor mu?" },
    proofNeeded: ["Customer's number recorded as a quote with date", "Complete cost list", "Seller's written position, obtained after the number is recorded"],
    tradeAsk: {
      en: "Here's what I'll do: I'll go to the seller today and ask them to come to {budget} all-in. I'm not promising it. But I can only push hard if I can tell them you're ready to reserve {unit} the moment they agree. Can I tell them that?",
      tr: "Şöyle yapalım: bugün satıcıya gidip masraflar dahil {budget} rakamına gelmelerini isteyeceğim. Söz vermiyorum. Ama ancak kabul ettikleri anda {unit} için kaporayı yatırmaya hazır olduğunuzu söyleyebilirsem gerçekten bastırabilirim. Bunu söyleyebilir miyim?",
    },
    fallbackAsk: { en: "If nothing within your limit fits, which requirement would you relax first?", tr: "Sınırınıza uyan hiçbir şey çıkmazsa ilk hangi şarttan vazgeçersiniz?" },
    message: {
      en: "Hi {first}, on {unit}: the total today is {price}{costs}, above the {budget} you gave me. I'll take one number to the seller and I'm not promising the answer. Tell me the number you would sign at, and if they accept it in writing, you reserve. Yes?",
      tr: "Merhaba {salutation}, {unit} için bugünkü toplam {price}{costs}; bana verdiğiniz {budget} sınırının üzerinde. Satıcıya tek bir rakam götüreceğim ve cevaba söz vermiyorum. İmza atacağınız rakamı söyleyin; yazılı kabul ederlerse rezervasyon yapıyorsunuz. Olur mu?",
    },
    callOpener: { en: "{first}, one number and I'll let you go: the total is {price}{costs}, above your {budget}. What is the number you'd sign at tomorrow?", tr: "{salCall}, tek rakam soracağım: toplam {price}{costs}, {budget} sınırınızın üzerinde. Yarın imza atacağınız rakam ne?" },
  },
  discount: {
    id: "discount",
    title: "Separate affordability from perceived value, then get the number",
    methodSourceIds: ["challenger", "spin"],
    useWhen: "A discount request or value concern with no established reason.",
    avoidWhen: "A firm budget gap is already established (use the gap playbook).",
    say: {
      en: "Let me ask you straight, because it changes what I do next: is it that {price} is more than you want to commit, or that you're not sure {unit} is worth {price}? Both are fair; they need different answers.",
      tr: "Açık sorayım, çünkü bir sonraki adımımı belirliyor: mesele {price} rakamının ayırmak istediğinizden fazla olması mı, yoksa {unit} bu fiyata değer mi diye düşünmeniz mi? İkisi de anlaşılır; ama cevapları farklı.",
    },
    directAsk: { en: "If price is the only remaining point, tell me the number you would sign at and I will take exactly that to the seller. What is it?", tr: "Geriye yalnızca fiyat kaldıysa, imza atacağınız rakamı söyleyin; tam olarak onu satıcıya götüreyim. Rakam ne?" },
    questionToTest: { en: "Which alternative are you comparing this price with?", tr: "Bu fiyatı hangi alternatifle karşılaştırıyorsunuz?" },
    proofNeeded: ["Comparable options and total purchase costs", "The customer's number recorded as a quote"],
    objectionReply: { en: "Understood. 'Too expensive' isn't a number I can work with; the number you would sign at is.", tr: "Anladım. 'Çok pahalı' çalışabileceğim bir rakam değil; imza atacağınız rakam öyle." },
    tradeAsk: { en: "Before I ask the seller for anything: if they meet you on price, is that the end of the conversation and we reserve, or is there something else? I need to know what I'm negotiating for.", tr: "Satıcıdan bir şey istemeden önce: fiyatta size gelirlerse konu bitiyor ve rezervasyon yapıyor muyuz, yoksa başka bir şey daha mı var? Neyin pazarlığını yaptığımı bilmem lazım." },
    fallbackAsk: { en: "Then price isn't the real point. What is?", tr: "O zaman asıl mesele fiyat değil. Ne?" },
  },
  trade: {
    id: "trade",
    title: "Trade the concession for a dated commitment",
    methodSourceIds: ["challenger", "rule"],
    useWhen: "The customer has named a number and the seller's answer is not yet obtained.",
    avoidWhen: "The customer has not named a number: get it first. Never present a seller answer before the customer's conditional commitment is recorded.",
    say: {
      en: "I can go to the seller once, and I want to go with something real. Your number is {number}. If they say yes in writing, you sign. If it's not a yes at that number, tell me now so I don't spend your credibility with them.",
      tr: "Satıcıya bir kez gidebilirim ve elimde somut bir şeyle gitmek istiyorum. Rakamınız {number}. Yazılı evet derlerse siz imzalıyorsunuz. O rakamda evet değilse şimdi söyleyin ki güvenilirliğinizi onların gözünde harcamayayım.",
    },
    directAsk: { en: "If they accept {number} in writing, you sign. Yes or no?", tr: "{number} rakamını yazılı kabul ederlerse imzalıyorsunuz. Evet mi, hayır mı?" },
    questionToTest: { en: "Is there anything other than price that would stop you signing if they accept?", tr: "Kabul ederlerse fiyat dışında imzalamanızı engelleyecek bir şey var mı?" },
    proofNeeded: ["Customer's conditional offer recorded verbatim with date", "Seller's written answer, afterwards"],
    fallbackAsk: { en: "Then it isn't an offer yet, it's a question. When it is an offer, I'll move on it the same day.", tr: "O zaman bu henüz bir teklif değil, bir soru. Teklif olduğunda aynı gün harekete geçerim." },
    callOpener: { en: "{first}, straight to it: your number is {number}. If the seller says yes in writing, do you sign?", tr: "{salCall}, doğrudan konuya: rakamınız {number}. Satıcı yazılı evet derse imzalıyor musunuz?" },
  },
  price_final: {
    id: "price_final",
    title: "Hold the final price; sell the decision, not the discount",
    methodSourceIds: ["challenger", "rule"],
    useWhen: "The seller has confirmed there is no price room and the customer keeps pushing on price.",
    avoidWhen: "Room is unknown: confirm with the seller first. Never say 'final' as a tactic.",
    say: {
      en: "I asked, and the answer on price is no: it's {price}. I'd rather tell you that straight than keep you waiting for a discount that isn't coming. So the real question is whether {unit} is worth {price} to you for {goal}. If it is, let's do it. If not, I'll show you {alt} instead of wasting your time.",
      tr: "Sordum; fiyat konusunda cevap hayır: {price}. Gelmeyecek bir indirim için sizi bekletmektense bunu açıkça söylemeyi tercih ederim. Asıl soru şu: {unit}, {goal} için size {price} eder mi? Ediyorsa yapalım. Etmiyorsa vaktinizi harcamak yerine {alt} seçeneğini göstereyim.",
    },
    directAsk: { en: "At {price}: yes or no? Either answer helps us both.", tr: "{price} ile: evet mi, hayır mı? İki cevap da ikimize yardımcı olur." },
    questionToTest: { en: "If the price were what you wanted, would there be anything else in the way?", tr: "Fiyat istediğiniz gibi olsaydı, yolda başka bir şey kalır mıydı?" },
    proofNeeded: ["Seller's 'no room' recorded with date and source", "Authorized non-price terms, if any, recorded"],
    objectionReply: { en: "I asked, and the answer on price is no. The question now is whether {unit} is worth {price} to you.", tr: "Sordum; fiyat konusunda cevap hayır. Şimdi soru şu: {unit} sizin için {price} eder mi?" },
    fallbackAsk: { en: "Then let's look at {alt} at {altPrice}. Shall I arrange it {slotA}?", tr: "O zaman {altPrice} ile {alt} seçeneğine bakalım. {slotA} saatinde ayarlayayım mı?" },
    message: {
      en: "Hi {first}, I asked and the answer on price is no: {unit} stays at {price}. I'd rather say it straight than keep you waiting for a discount that isn't coming. So: {unit} at {price}, or {alt} at {altPrice}? Tell me which and I'll reserve it today.",
      tr: "Merhaba {salutation}, sordum; fiyatta cevap hayır: {unit} {price} olarak kalıyor. Gelmeyecek bir indirim için sizi bekletmektense açık söylüyorum. Yani: {price} ile {unit} mi, {altPrice} ile {alt} mi? Hangisi olduğunu yazın, bugün ayırtayım.",
    },
    callOpener: { en: "{first}, straight answer on price: it's no, {price} stands. So it's {unit} at {price} or {alt} at {altPrice}. Which?", tr: "{salCall}, fiyatta net cevap: hayır, {price} sabit. Yani {price} ile {unit} mi, {altPrice} ile {alt} mi? Hangisi?" },
    sayNoAlt: {
      en: "I asked, and the answer on price is no: it's {price}. I'd rather tell you that straight than keep you waiting for a discount that isn't coming. So the real question is whether {unit} is worth {price} to you for {goal}. If it is, let's do it. If not, tell me the number you'd sign at within your limit and I'll search for exactly that, and I'll say so plainly if nothing fits.",
      tr: "Sordum; fiyat konusunda cevap hayır: {price}. Gelmeyecek bir indirim için sizi bekletmektense bunu açıkça söylemeyi tercih ederim. Asıl soru şu: {unit}, {goal} için size {price} eder mi? Ediyorsa yapalım. Etmiyorsa sınırınız içinde imza atacağınız rakamı söyleyin, tam olarak ona göre arayayım; uyan bir şey yoksa bunu da açıkça söylerim.",
    },
    messageNoAlt: {
      en: "Hi {first}, I asked and the answer on price is no: {unit} stays at {price}. I'd rather say it straight than keep you waiting for a discount that isn't coming. So: is {unit} worth {price} to you, yes or no? If no, tell me the number you'd sign at and I'll search on exactly that.",
      tr: "Merhaba {salutation}, sordum; fiyatta cevap hayır: {unit} {price} olarak kalıyor. Gelmeyecek bir indirim için sizi bekletmektense açık söylüyorum. Yani: {unit} sizin için {price} eder mi, evet mi hayır mı? Hayırsa imza atacağınız rakamı söyleyin, tam olarak ona göre arayayım.",
    },
    callOpenerNoAlt: { en: "{first}, straight answer on price: it's no, {price} stands. Is {unit} worth that to you, yes or no?", tr: "{salCall}, fiyatta net cevap: hayır, {price} sabit. {unit} sizin için buna değer mi, evet mi hayır mı?" },
    fallbackAskNoAlt: { en: "Then give me the number you'd sign at, and I'll search on exactly that. If nothing fits, I'll tell you plainly.", tr: "O zaman imza atacağınız rakamı söyleyin; tam olarak ona göre arayayım. Uyan bir şey yoksa açıkça söylerim." },
  },
  hold: {
    id: "hold",
    title: "No second concession without a new commitment",
    methodSourceIds: ["challenger", "rule"],
    useWhen: "A concession has already been given, the customer said yes on it, and now asks for more.",
    avoidWhen: "Use hold_open when no commitment was recorded against the concession.",
    say: {
      en: "We already moved on {concessions}, and you told me that would make it a yes. What changed? If something new is stopping you, tell me and I'll deal with it. If nothing changed, I need you to keep your side.",
      tr: "{concessions} konusunda zaten hareket ettik ve bunun 'evet' anlamına geleceğini söylemiştiniz. Ne değişti? Sizi durduran yeni bir şey varsa söyleyin, ilgileneyim. Hiçbir şey değişmediyse sizden tarafınızı tutmanızı istiyorum.",
    },
    directAsk: { en: "Are we signing on what we agreed, or is there a new issue I need to hear?", tr: "Anlaştığımız üzere imzalıyor muyuz, yoksa duymam gereken yeni bir konu mu var?" },
    questionToTest: { en: "Is this about the price, or has something else come up since we agreed?", tr: "Bu fiyatla mı ilgili, yoksa anlaştığımızdan beri başka bir şey mi çıktı?" },
    proofNeeded: ["The concession record and the customer's recorded yes it was traded for"],
  },
  hold_open: {
    id: "hold_open",
    title: "A concession was given without a recorded commitment: get the answer now",
    methodSourceIds: ["challenger", "rule"],
    useWhen: "A concession has already been given, no commitment was recorded against it, and the customer asks for more.",
    avoidWhen: "Never claim the customer promised something that is not recorded.",
    say: {
      en: "We already moved on {concessions}. What has changed since? If something new is stopping you, tell me and I'll deal with it. If nothing has changed, I need your answer on what's on the table.",
      tr: "{concessions} konusunda zaten hareket ettik. O zamandan beri ne değişti? Sizi durduran yeni bir şey varsa söyleyin, ilgileneyim. Hiçbir şey değişmediyse masadaki teklif için cevabınızı istiyorum.",
    },
    directAsk: { en: "On what's on the table: yes or no?", tr: "Masadaki teklif için: evet mi, hayır mı?" },
    questionToTest: { en: "Is this about the price, or has something else come up?", tr: "Bu fiyatla mı ilgili, yoksa başka bir şey mi çıktı?" },
    proofNeeded: ["The concession record; record the customer's answer as an ask response"],
  },
  cash_discount: {
    id: "cash_discount",
    title: "Price the cash buyer's speed, not the request",
    methodSourceIds: ["challenger", "rule"],
    useWhen: "The customer asks for a bigger discount because they pay cash.",
    avoidWhen: "Funding is only stated: do not trade on speed until proof of funds is seen. Never say cash earns a discount.",
    say: {
      en: "Cash matters to a seller for two reasons: speed and certainty. A cash buyer who wants to think about it is worth the same to them as anyone else. So let's make it worth something: proof of funds, {nextStep} this week, no further conditions, one number. I'll put that package to the seller. I can't promise their answer.",
      tr: "Nakit satıcı için iki nedenle önemlidir: hız ve kesinlik. 'Düşünmek isteyen' nakit alıcı onlar için herkesle aynı değerdedir. O yüzden bunu bir değere dönüştürelim: fon belgesi, bu hafta {nextStep}, başka şart yok, tek rakam. Bu paketi satıcıya sunarım. Cevaplarına söz veremem.",
    },
    directAsk: { en: "Proof of funds and your number by {slotA}, and if the seller says yes we sign at that number. Agreed?", tr: "{slotA} saatine kadar fon belgesi ve rakamınız; satıcı evet derse o rakamdan imzalıyoruz. Anlaştık mı?" },
    questionToTest: { en: "If the seller says no to any adjustment, is this still the property you want at the current terms?", tr: "Satıcı hiçbir düzenlemeye evet demezse, mevcut şartlarla yine de istediğiniz mülk bu mu?" },
    proofNeeded: ["Funding status confirmed (proof seen), not stated", "Customer's number recorded as a quote", "Seller's written position for the stated payment timing"],
    objectionReply: { en: "Cash can matter to a seller and I will ask. I can only trade it for something real: proof of funds and your number.", tr: "Nakit satıcı için önemli olabilir ve soracağım. Karşılığında gerçek bir şey almalıyım: fon belgesi ve rakamınız." },
  },
  fees: {
    id: "fees",
    title: "Close on the complete, itemised total",
    methodSourceIds: ["bly", "spin"],
    useWhen: "Fees, taxes or extra costs are the objection.",
    avoidWhen: "The cost list is unknown: obtain it before discussing the total.",
    say: {
      en: "Let's put every cost on one page: price, taxes, notary, agency, project fees, with who receives each. Then we compare that total with what you'd pay elsewhere on the same basis.",
      tr: "Tüm masrafları tek sayfaya koyalım: fiyat, vergiler, noter, aracılık, proje ücretleri; her birini kim alıyor. Sonra bu toplamı başka yerde aynı temelde ödeyeceğinizle karşılaştıralım.",
    },
    directAsk: { en: "I'll have the itemised total to you by {slotA}. If the total is the only open point, will you decide on the total?", tr: "Kalem kalem toplamı {slotA} saatine kadar size ulaştırırım. Açık kalan tek nokta toplam ise, toplam üzerinden karar verir misiniz?" },
    questionToTest: { en: "Is it the amount of the fee, or that you didn't expect it?", tr: "Mesele ücretin tutarı mı, yoksa beklememiş olmanız mı?" },
    proofNeeded: ["Complete itemised cost list from seller/notary with dates", "Which fees, if any, the seller has authorised to adjust; recorded, not assumed"],
    objectionReply: { en: "Fair. Nobody should decide on a total they haven't seen itemised. I'll get every line on one page.", tr: "Haklısınız. Kimse kalem kalem görmediği bir toplam üzerinden karar vermemeli. Her satırı tek sayfaya alırım." },
  },

  // ---- objections -------------------------------------------------------------------
  competitor: {
    id: "competitor",
    title: "Win the comparison on the customer's own criteria",
    methodSourceIds: ["challenger", "storybrand"],
    useWhen: "A specific competing project is named.",
    avoidWhen: "No competing option is identified; ask which one first.",
    say: {
      en: "Good, compare them; I'd rather you buy the right one than buy fast. But compare the whole thing: {project} is {price}{costs}. What is theirs on the same basis, with costs? You said {goal} matters most. On that one criterion, here is what each actually gives you, including where they beat us.",
      tr: "İyi, karşılaştırın; hızlı almanızdansa doğrusunu almanızı tercih ederim. Ama bütünüyle karşılaştırın: {project} {price}{costs}. Onlarınki aynı temelde, masraflar dahil kaç? En çok {goal} önemli demiştiniz. Sadece o kritere göre her biri gerçekte ne veriyor; bizi geçtikleri yerler dahil.",
    },
    directAsk: { en: "Side by side like that, which one do you want to make the offer on?", tr: "Böyle yan yana koyunca teklifi hangisine vermek istersiniz?" },
    questionToTest: { en: "What does the other project offer that feels missing here?", tr: "Diğer proje burada eksik hissettiğiniz neyi sunuyor?" },
    proofNeeded: ["Total commitment for both options", "Verified features, including this project's disadvantages"],
    objectionReply: { en: "Compare them, on the same basis and on your top criterion. If they win on that, I'll tell you.", tr: "Karşılaştırın; aynı temelde ve en önemli kriterinize göre. Onlar kazanıyorsa ben söylerim." },
  },
  market_wait: {
    id: "market_wait",
    title: "Turn the wait into a written trigger, not a hope",
    methodSourceIds: ["spin", "rule"],
    useWhen: "The customer expects prices to fall or wants to wait the market.",
    avoidWhen: "Never cite a forecast, report or price-rise claim unless it is a verified evidence record with a source date.",
    say: {
      en: "Fair point, and I won't predict the market for you; nobody can honestly. Let's make the wait a decision instead of a hope: what price or change would make you act, and how would you know it happened? If it happens I'll tell you. If it doesn't, what do you do?",
      tr: "Haklı bir nokta; piyasayı tahmin etmeyeceğim, kimse dürüstçe yapamaz. Beklemeyi umut değil karar yapalım: hangi fiyat ya da değişiklik sizi harekete geçirir ve bunu nasıl anlarsınız? Olursa haber veririm. Olmazsa ne yaparsınız?",
    },
    directAsk: { en: "Shall we write your trigger and a review date down now, and I'll confirm today's documented terms so you decide with real numbers?", tr: "Tetikleyicinizi ve bir inceleme tarihini şimdi yazalım mı? Ben de bugünkü belgeli şartları teyit edeyim ki gerçek rakamlarla karar verin." },
    questionToTest: { en: "Is it the price level, or uncertainty about this particular property?", tr: "Mesele fiyat seviyesi mi, yoksa bu mülke dair belirsizlik mi?" },
    proofNeeded: ["Customer's stated trigger (price or event), recorded with date", "Current documented price/terms and their validity; nothing else"],
    objectionReply: { en: "I won't predict the market. Let's make your wait a written trigger so it's a decision, not a hope.", tr: "Piyasayı tahmin etmeyeceğim. Beklemenizi yazılı bir tetikleyiciye bağlayalım ki umut değil karar olsun." },
  },
  currency_risk: {
    id: "currency_risk",
    title: "Remove the exposure with authorized terms, not predictions",
    methodSourceIds: ["spin", "rule"],
    useWhen: "The customer's funds and the price are in different currencies and the rate worries them.",
    avoidWhen: "Never predict rates. Only terms the seller has authorized in writing may be mentioned.",
    say: {
      en: "Your money and the price are in different currencies, so the rate matters and I can't predict it. What I can do is ask the seller what is actually authorized: whether the contract can be in your currency, or the amount fixed at signing, and bring you the answer in writing.",
      tr: "Paranız ile fiyat farklı para birimlerinde; kur önemli ve ben kuru tahmin edemem. Yapabileceğim şu: satıcıya gerçekten neyin onaylı olduğunu, sözleşmenin sizin para biriminizde yapılıp yapılamayacağını ya da tutarın imzada sabitlenip sabitlenemeyeceğini sorup yazılı cevabı getirmek.",
    },
    directAsk: { en: "If the seller confirms a term that removes the exposure, will you proceed on that basis?", tr: "Satıcı riski ortadan kaldıran bir şartı yazılı teyit ederse bu temelde ilerler misiniz?" },
    questionToTest: { en: "Is the worry the rate moving before signing, or holding the asset in that currency afterwards?", tr: "Endişe imzadan önce kurun oynaması mı, yoksa sonrasında varlığı o para biriminde tutmak mı?" },
    proofNeeded: ["Which currency the funds and the customer's liabilities are in", "Seller's written position on currency terms", "A recorded rate observation (rate, date, source) if any comparison is made"],
    objectionReply: { en: "The rate is real and I won't predict it. I'll ask the seller what currency terms are actually authorized.", tr: "Kur gerçek bir konu ve tahmin etmeyeceğim. Satıcıya hangi kur şartlarının gerçekten onaylı olduğunu soracağım." },
  },
  returns: {
    id: "returns",
    title: "Lead with supported economics and explicit assumptions",
    methodSourceIds: ["tracy", "spin"],
    useWhen: "Income is a stated priority or returns are repeatedly questioned.",
    avoidWhen: "No rent or cost evidence exists; gather it rather than quote a yield.",
    say: {
      en: "Anyone can show you a headline yield. Before I show you ours, let's agree what goes in: management, maintenance, empty months, taxes. Then the number means something. What's the minimum this has to make for you to go ahead?",
      tr: "Brüt getiriyi herkes gösterir. Bizimkini göstermeden önce hesaba nelerin gireceğinde anlaşalım: yönetim, bakım, boş kalan aylar, vergiler. O zaman rakam bir anlam taşır. Devam etmeniz için bu yatırımın en az ne getirmesi gerekir?",
    },
    directAsk: { en: "If the documented rent and costs clear that bar, do we go straight to {unit} and the {nextStep}?", tr: "Belgeli kira ve masraflar o çıtayı geçerse doğrudan {unitDat} ve {nextStep} adımına geçiyor muyuz?" },
    questionToTest: { en: "Which outcome matters most: ongoing income, resale value, or the balance?", tr: "En çok hangisi önemli: düzenli gelir mi, yeniden satış değeri mi, yoksa dengesi mi?" },
    proofNeeded: ["Rent evidence", "Vacancy assumptions", "Fees, repairs and operating costs (no yield figure is generated by the CRM)"],
    objectionReply: { en: "A headline yield proves nothing. Let's agree what goes into the number, then judge the documented one.", tr: "Brüt getiri hiçbir şey kanıtlamaz. Hesaba nelerin gireceğinde anlaşalım, sonra belgeli rakamı değerlendirelim." },
  },
  resale_liquidity: {
    id: "resale_liquidity",
    title: "Define the exit and test it against the record",
    methodSourceIds: ["spin", "rule"],
    useWhen: "The customer doubts they can sell when needed.",
    avoidWhen: "Never quote resale figures that are not evidence records.",
    say: {
      en: "You want to be sure you can get out. Let's define the exit: when, to whom, and on what documented basis. I'll bring what is actually on record about resales in this project, and if nothing is on record I'll say so.",
      tr: "Çıkabileceğinizden emin olmak istiyorsunuz. Çıkışı tanımlayalım: ne zaman, kime ve hangi belgelenmiş temelde. Bu projedeki satışlarla ilgili kayıtta gerçekten ne varsa getiririm; yoksa yok derim.",
    },
    directAsk: { en: "If the recorded resale facts hold up against your exit plan, shall we move to the {nextStep}?", tr: "Kayıtlı yeniden satış verileri çıkış planınızı karşılıyorsa {nextStep} adımına geçelim mi?" },
    questionToTest: { en: "Is it finding a buyer, or the price you'd get?", tr: "Mesele alıcı bulmak mı, yoksa alacağınız fiyat mı?" },
    proofNeeded: ["Evidence records on resales in this project, with dates", "The customer's stated holding period"],
  },
  management: {
    id: "management",
    title: "Show the management terms that actually exist",
    methodSourceIds: ["spin", "rule"],
    useWhen: "The customer does not want to be a remote landlord.",
    avoidWhen: "No documented management arrangement exists; do not describe one.",
    say: {
      en: "You don't want to run a property from a distance. Let's look at the management terms that actually exist for {unit}: who does what, at what cost, under what contract, and what is not covered.",
      tr: "Mülkü uzaktan yönetmek istemiyorsunuz. {unit} için gerçekten var olan yönetim şartlarına bakalım: kim ne yapıyor, hangi ücretle, hangi sözleşmeyle ve neyin kapsam dışı olduğuna.",
    },
    directAsk: { en: "Shall I get the management contract terms in writing for {slotA}, and we decide on them?", tr: "Yönetim sözleşmesi şartlarını {slotA} için yazılı alayım mı; onlara göre karar verelim?" },
    questionToTest: { en: "Which task must someone else handle: tenants, repairs, payments, or all three?", tr: "Hangi işi başkası üstlenmeli: kiracılar mı, tamirler mi, ödemeler mi, yoksa üçü de mi?" },
    proofNeeded: ["Documented management contract terms and costs"],
  },
  delivery: {
    id: "delivery",
    title: "Make the delivery plan concrete",
    methodSourceIds: ["storybrand", "spin"],
    useWhen: "The home is not completed and timing matters.",
    avoidWhen: "No documented milestones exist; do not turn a construction target into a guarantee.",
    say: {
      en: "Your plan depends on when you can actually use the property. Let's put your date next to the documented milestones and see what still depends on future delivery, and what the payment terms protect{stagePaymentClause}.",
      tr: "Planınız mülkü fiilen ne zaman kullanabileceğinize bağlı. Tarihinizi belgelenmiş aşamaların yanına koyalım; neyin gelecekteki teslimata bağlı kaldığını ve ödeme şartlarının neyi koruduğunu görelim{stagePaymentClause}.",
    },
    directAsk: { en: "If the documented terms fit your timing, are you ready to review {unit} and the offer {slotA}?", tr: "Belgelenmiş şartlar zamanlamanıza uyuyorsa {slotA} saatinde {unitAcc} ve teklifi birlikte incelemeye hazır mısınız?" },
    questionToTest: { en: "Which timing commitment matters most to your plans?", tr: "Planlarınız için en çok hangi zamanlama taahhüdü önemli?" },
    proofNeeded: ["Documented progress and delivery terms", "Payment milestones", "Open dependencies"],
    objectionReply: { en: "Timing is a fair worry on an unfinished building. Let's judge it on documented milestones, not on promises.", tr: "Bitmemiş bir binada zamanlama haklı bir endişe. Sözlerle değil belgelenmiş aşamalarla değerlendirelim." },
  },
  only_completed: {
    id: "only_completed",
    title: "Switch to completed alternatives; do not push off-plan",
    methodSourceIds: ["spin", "rule"],
    useWhen: "The customer will only buy a completed property.",
    avoidWhen: "Do not argue the customer into an unfinished building.",
    say: {
      en: "Understood: you want to buy something that exists today, and I won't argue you into an unfinished building. Two paths: I show you completed units that match {mustHaves}, or, only if you'd still consider {project}, we look at exactly what the documented terms protect. Which first?",
      tr: "Anlaşıldı: bugün var olan bir şey almak istiyorsunuz; sizi bitmemiş bir binaya ikna etmeye çalışmayacağım. İki yol var: {mustHaves} ile uyumlu tamamlanmış daireleri göstereyim; ya da yalnızca {project} projesini hâlâ düşünüyorsanız, belgelenmiş şartların tam olarak neyi koruduğuna bakalım. Hangisiyle başlayalım?",
    },
    directAsk: { en: "Shall we review the completed options {slotA}?", tr: "Tamamlanmış seçenekleri {slotA} saatinde inceleyelim mi?" },
    questionToTest: { en: "Is it the waiting, the risk of non-delivery, or having been burned before?", tr: "Mesele bekleme mi, teslim edilmeme riski mi, yoksa daha önce yaşanmış kötü bir deneyim mi?" },
    proofNeeded: ["Completed units in inventory that match the essentials"],
    fallbackAsk: { en: "If I can't find a completed unit that matches, is {project} still worth a look on the documented terms, or shall I close the file? Either answer is fine.", tr: "Uyan tamamlanmış bir daire bulamazsam {project} belgelenmiş şartlarıyla hâlâ bakmaya değer mi, yoksa dosyayı kapatayım mı? İki cevap da olur." },
  },
  developer_trust: {
    id: "developer_trust",
    title: "Make developer risk checkable in three documents",
    methodSourceIds: ["cialdini", "spin"],
    useWhen: "The customer doubts the developer or non-delivery risk.",
    avoidWhen: "Never cite delivered projects or testimonials that are not evidence records with a source.",
    say: {
      en: "Fair question, and I'd rather you check than take my word. Three things decide it: the permit and title status of this land, the payment terms tied to construction stages, and what this developer has actually delivered. Documents, not brochures. Which do you want first?",
      tr: "Haklı bir soru; bana güvenmek yerine kontrol etmenizi tercih ederim. Üç şey belirleyici: bu arsanın ruhsat ve tapu durumu, inşaat aşamalarına bağlı ödeme şartları ve bu geliştiricinin gerçekten teslim ettikleri. Broşür değil belge. Hangisiyle başlayalım?",
    },
    directAsk: { en: "Shall we book the document review for {slotA}, with your own lawyer if you prefer? If those check out, we go to the {nextStep}.", tr: "Belge incelemesini {slotA} için ayarlayalım mı; isterseniz kendi avukatınızla? Doğrulanırsa {nextStep} adımına geçeriz." },
    questionToTest: { en: "Is it this developer specifically, or off-plan risk in general?", tr: "Mesele özellikle bu geliştirici mi, yoksa genel olarak plandan satış riski mi?" },
    proofNeeded: ["Verified evidence records for permit, title and payment terms", "Delivered-projects list only as evidence records with source dates"],
    objectionReply: { en: "Don't take my word for it. Three documents decide it: permit and title, stage-linked payment terms, delivered projects.", tr: "Bana güvenmeyin. Üç belge belirler: ruhsat ve tapu, aşamaya bağlı ödeme şartları, teslim edilmiş projeler." },
  },
  feasibility: {
    id: "feasibility",
    title: "Establish intended-use feasibility",
    methodSourceIds: ["spin", "predictable"],
    useWhen: "A plot buyer wants to build or develop.",
    avoidWhen: "Permitted use is undocumented; never state that construction is approved.",
    say: {
      en: "The right plot is the one that can support your project. Let's settle the use and site questions that decide whether this one can: documented permitted use, access and services, site constraints.",
      tr: "Doğru arsa, projenizi taşıyabilecek olandır. Bunun taşıyıp taşıyamayacağını belirleyen kullanım ve saha sorularını netleştirelim: belgeli imar durumu, yol ve altyapı, saha kısıtları.",
    },
    directAsk: { en: "Will you join a review with your chosen specialist {slotA} once I have the records together? If it checks out, we go to the {nextStep}.", tr: "Kayıtları topladığımda {slotA} saatinde seçtiğiniz uzmanla bir incelemeye katılır mısınız? Doğrulanırsa {nextStep} adımına geçeriz." },
    questionToTest: { en: "What must this plot enable for your project to work?", tr: "Projenizin işlemesi için bu arsanın neyi mümkün kılması gerekir?" },
    proofNeeded: ["Documented permitted use", "Access and services", "Site constraints; keep land budget separate from development budget"],
  },
  location: {
    id: "location",
    title: "Price the distance against the stated goal",
    methodSourceIds: ["spin", "rule"],
    useWhen: "Distance from city, sea or airport is the objection.",
    avoidWhen: "Never cite planned roads or transport unless a verified evidence record exists.",
    say: {
      en: "You said it's far. Let's check that against what this purchase must do for you: {goal}. Is distance a deal-breaker, or a trade-off you'd accept for what {unit} gives you? If it's a deal-breaker I'll show you closer options on the same budget; if it's a trade-off, let's price it.",
      tr: "Uzak dediniz. Bunu alımın sizin için yapması gerekenle karşılaştıralım: {goal}. Uzaklık kesin bir engel mi, yoksa {unitGen} size sağladıkları karşılığında kabul edeceğiniz bir denge mi? Engelse aynı bütçeyle daha yakın seçenekler göstereyim; dengeyse birlikte fiyatlandıralım.",
    },
    directAsk: { en: "Shall we look at closer alternatives {slotA}, or confirm the trade-off and move to the remaining checks?", tr: "{slotA} saatinde daha yakın alternatiflere mi bakalım, yoksa dengeyi kabul edip kalan kontrollere mi geçelim?" },
    questionToTest: { en: "For {goal}, who needs to be close to what: you, a tenant, or a future buyer?", tr: "{goal} için kimin neye yakın olması gerekiyor: siz mi, kiracı mı, yoksa gelecekteki alıcı mı?" },
    proofNeeded: ["Documented distances/travel times as evidence records", "Alternatives filtered by the customer's stated essentials"],
  },
  remote: {
    id: "remote",
    title: "Reduce remote verification friction",
    methodSourceIds: ["predictable", "storybrand"],
    useWhen: "The customer is buying remotely and a property is on the table. Logistics, not nationality.",
    avoidWhen: "No property is attached yet, or the customer has said they will visit before deciding.",
    say: {
      en: "Let's separate what you need to inspect personally on {unit} from what we can verify before you travel: a live walkthrough, the documents, and a representative you choose. I suggest we start with {concern}.",
      tr: "{unit} için bizzat görmeniz gerekenlerle seyahat etmeden önce doğrulayabileceklerimizi ayıralım: canlı tur, belgeler ve seçeceğiniz bir temsilci. {concern} ile başlamayı öneriyorum.",
    },
    directAsk: { en: "Shall we schedule that review {slotA} or {slotB}, and who else should be on it?", tr: "Bu incelemeyi planlayalım mı; hangisi uygun: {slotA} ya da {slotB}? Başka kim katılmalı?" },
    questionToTest: { en: "What would you need before a remote next step felt practical?", tr: "Uzaktan atılacak bir sonraki adımın pratik gelmesi için neye ihtiyacınız var?" },
    proofNeeded: ["A current walkthrough", "Documents and clear cost information", "An agreed decision sequence"],
  },
  legal_residency: {
    id: "legal_residency",
    title: "Route the legal question to a written answer, then close on it",
    methodSourceIds: ["spin", "rule"],
    useWhen: "Title, eligibility, residency or citizenship questions are the objection.",
    avoidWhen: "Never answer the legal question yourself; never claim eligibility or residency consequences.",
    say: {
      en: "That has to be answered in writing by a licensed lawyer, notary or the land registry, not by me. Which one must be confirmed before you decide: the title and any encumbrances, your eligibility to buy here, or the residency consequences? I'll get the written answer.",
      tr: "Bunu ben değil, lisanslı bir avukat, noter ya da tapu müdürlüğü yazılı olarak cevaplamalı. Karar vermeden önce hangisi teyit edilmeli: tapu ve varsa şerhler, burada satın alma ehliyetiniz, yoksa oturma izni sonuçları mı? Yazılı cevabı alıyorum.",
    },
    directAsk: { en: "Can we book the review of that written answer for {slotA}, with your lawyer on the call if you want? If it confirms what you need, we prepare the {nextStep}.", tr: "Yazılı cevabı {slotA} saatinde birlikte inceleyelim mi; isterseniz avukatınız da katılsın? İhtiyacınızı karşılıyorsa {nextStep} adımını hazırlarız." },
    questionToTest: { en: "Which single legal point, if confirmed in writing, would let you proceed?", tr: "Hangi tek hukuki nokta yazılı teyit edilirse ilerlersiniz?" },
    proofNeeded: ["Property location/jurisdiction recorded", "A verified evidence record for the specific legal point with source and date; nothing else is presented"],
    objectionReply: { en: "I won't answer that myself; it needs a written answer from a licensed source, and I'll get it.", tr: "Bunu kendim cevaplamayacağım; lisanslı bir kaynaktan yazılı cevap gerekiyor ve onu alacağım." },
  },
  approval: {
    id: "approval",
    title: "Bring the co-decider into the room with a dated review",
    methodSourceIds: ["spin", "bly"],
    useWhen: "Another person has a real role in the decision.",
    avoidWhen: "The customer decides alone; do not invent a stakeholder.",
    say: {
      en: "What would {participants} need answered to decide? Let's put those points and the terms in one short brief, and I'd like to walk you both through it in twenty minutes rather than have it relayed.",
      tr: "{participants} karar vermek için hangi soruların yanıtlanmasına ihtiyaç duyar? Bu noktaları ve şartları kısa bir özete koyalım; iletilmesindense ikinize birlikte yirmi dakikada anlatmak isterim.",
    },
    directAsk: { en: "Can we do that twenty-minute call together {slotA} or {slotB}? If they agree with what you've seen, will you both proceed to the {nextStep} that day?", tr: "O yirmi dakikalık görüşmeyi birlikte yapalım mı; hangisi uygun: {slotA} ya da {slotB}? Onlar da gördüklerinize katılırsa, o gün birlikte {nextStep} adımına geçer misiniz?" },
    questionToTest: { en: "Would you prefer to review together, or take the information to them yourself?", tr: "Birlikte mi incelemek istersiniz, yoksa bilgiyi kendiniz mi iletirsiniz?" },
    proofNeeded: ["A one-page brief: shared priorities, total costs, open questions, offer terms"],
    fallbackAsk: { en: "Fine, take it to them yourself. When will you talk it through? I'll call you the day after so any question gets answered while it's fresh.", tr: "Tamam, siz iletin. Ne zaman konuşacaksınız? Ertesi gün sizi arayayım ki çıkan soru tazeyken yanıtlansın." },
  },
  spouse_no: {
    id: "spouse_no",
    title: "Find the co-decider's actual objection",
    methodSourceIds: ["spin", "rule"],
    useWhen: "The partner or co-decider said no.",
    avoidWhen: "The co-decider said no regardless of facts; respect that.",
    say: {
      en: "Understood. May I ask what they saw that concerned them? If it's something specific, I can address it directly with both of you in twenty minutes. If it's a no regardless, I'll respect that.",
      tr: "Anladım. Onları endişelendiren neydi, sorabilir miyim? Belirli bir konuysa ikinize birlikte yirmi dakikada doğrudan açıklayabilirim. Her koşulda hayır ise buna saygı duyarım.",
    },
    directAsk: { en: "Can we do that twenty-minute call together {slotA}?", tr: "O yirmi dakikalık görüşmeyi {slotA} saatinde birlikte yapabilir miyiz?" },
    questionToTest: { en: "In their words, what was the reason?", tr: "Onların sözleriyle sebep neydi?" },
    proofNeeded: ["The co-decider's stated reason recorded as a quote"],
  },
  proof: {
    id: "proof",
    title: "Make the decisive claim verifiable",
    methodSourceIds: ["cialdini", "spin"],
    useWhen: "Proof is requested or information trust is the concern.",
    avoidWhen: "The requested document does not exist; say so and offer what does.",
    say: {
      en: "Let's take the point that matters most to you and establish exactly what the available evidence confirms, and what still needs checking. I'd rather you verify than trust me.",
      tr: "Sizin için en önemli noktayı ele alalım ve mevcut belgelerin tam olarak neyi doğruladığını, neyin hâlâ kontrol gerektirdiğini netleştirelim. Bana güvenmenizdense doğrulamanızı tercih ederim.",
    },
    directAsk: { en: "When that document confirms what I described, will you place the {nextStep}?", tr: "O belge anlattığımı doğruladığında {nextStep} adımını atar mısınız?" },
    questionToTest: { en: "Which single unresolved fact would most change your decision?", tr: "Hangi tek açık nokta kararınızı en çok değiştirir?" },
    proofNeeded: ["The specific ownership, permit, completion, cost or seller record relevant to the concern, with its date"],
    objectionReply: { en: "Good. Don't trust me; verify. Tell me the one fact that matters most and I'll get the document.", tr: "İyi. Bana güvenmeyin, doğrulayın. En önemli tek gerçeği söyleyin, belgesini getireyim." },
  },
  think_it_over: {
    id: "think_it_over",
    title: "Name what they'll be weighing, then date the answer",
    methodSourceIds: ["spin", "challenger"],
    useWhen: "The customer says they will think about it.",
    avoidWhen: "The customer has asked for no contact; that is a pause.",
    say: {
      en: "Of course, it's a serious decision. So the thinking is useful, let's name what you'll be weighing: is it the price, the property itself, the timing, or something I haven't answered yet?",
      tr: "Elbette, ciddi bir karar. Düşünme sürecinin işe yaraması için neyi tartacağınızı netleştirelim: fiyat mı, mülkün kendisi mi, zamanlama mı, yoksa henüz yanıtlamadığım bir konu mu?",
    },
    directAsk: { en: "Let's fix {slotA} for your answer on that point; I'll have what you need ready before then. Agreed?", tr: "O konudaki cevabınız için {slotA} saatini sabitleyelim; ihtiyacınız olanı önceden hazır ederim. Anlaştık mı?" },
    questionToTest: { en: "If that one point were settled, would you proceed?", tr: "O tek nokta çözülseydi ilerler miydiniz?" },
    proofNeeded: ["The customer's named point, recorded as a quote", "The fact or document that resolves it"],
    objectionReply: { en: "Of course. Let's name what you'll be weighing so the thinking is useful, and date the answer.", tr: "Elbette. Neyi tartacağınızı netleştirelim ki düşünmek işe yarasın, cevabı da tarihe bağlayalım." },
    message: {
      en: "Hi {first}, no pressure on {unit}; you said you'd think it over. So it's useful, tell me the one thing you're weighing: price, the property, timing, or something I haven't answered. I'll have it ready and we speak {slotA}. OK?",
      tr: "Merhaba {salutation}, {unit} için baskı yok; düşüneceğinizi söylediniz. İşe yaraması için tarttığınız tek şeyi söyleyin: fiyat, mülk, zamanlama ya da henüz yanıtlamadığım bir konu. Hazır ederim ve {slotA} saatinde konuşuruz. Olur mu?",
    },
  },
  no_hurry: {
    id: "no_hurry",
    title: "Write the decision criteria now; the decision later",
    methodSourceIds: ["spin", "predictable"],
    useWhen: "The customer says there is no hurry.",
    avoidWhen: "Never manufacture urgency. Only a documented deadline may be stated.",
    say: {
      en: "Understood, there's no rush on your side and I won't create one. What would you want to be sure of before deciding, so that when you decide, the decision is already made? I'll collect those answers now while you take your time.",
      tr: "Anlaşıldı; sizin açınızdan acele yok, ben de yaratmayacağım. Karar vermeden önce nelerden emin olmak istersiniz ki karar verdiğinizde karar zaten verilmiş olsun? Siz zamanınızı kullanırken bu cevapları ben şimdi toplayayım.",
    },
    directAsk: { en: "Shall we write the decision criteria down now and put a review date in the diary, {slotA}?", tr: "Karar kriterlerini şimdi yazalım ve ajandaya bir inceleme tarihi koyalım mı; {slotA} uygun mu?" },
    questionToTest: { en: "Is it that nothing has convinced you yet, or that the money or timing isn't ready?", tr: "Mesele henüz hiçbir şeyin sizi ikna etmemesi mi, yoksa paranın veya zamanlamanın hazır olmaması mı?" },
    proofNeeded: ["The customer's decision criteria recorded", "An agreed review date"],
    objectionReply: { en: "No rush, and I won't invent one. Let's write down what you'd need to be sure of, so the decision is ready when you are.", tr: "Acele yok, ben de uydurmayacağım. Nelerden emin olmanız gerektiğini yazalım ki siz hazır olduğunuzda karar hazır olsun." },
  },
  send_info: {
    id: "send_info",
    title: "Send the answer, not a brochure, and book the review first",
    methodSourceIds: ["spin", "bly"],
    useWhen: "The customer asks for information instead of a next step.",
    avoidWhen: "Only material with a recorded evidence status goes into the pack.",
    say: {
      en: "Happy to. So it's useful rather than a brochure: which two questions should it answer? I'll send it {slotA}, and let's put fifteen minutes {slotB} to go through it. If it doesn't answer them, you tell me then.",
      tr: "Memnuniyetle. Broşür değil, işe yarar bir şey olsun: hangi iki soruya cevap vermeli? {slotA} saatinde gönderiyorum; {slotB} saatinde on beş dakika birlikte üzerinden geçelim. Cevaplamıyorsa o zaman söylersiniz.",
    },
    directAsk: { en: "Can we fix the fifteen-minute review for {slotB} now, before I send it?", tr: "Göndermeden önce on beş dakikalık incelemeyi {slotB} için şimdi sabitleyelim mi?" },
    questionToTest: { en: "Is there something in what we discussed that doesn't fit, or do you just need the details in writing?", tr: "Konuştuklarımızda uymayan bir şey mi var, yoksa sadece ayrıntıları yazılı mı istiyorsunuz?" },
    proofNeeded: ["The two questions, recorded as a quote", "Only evidence with a recorded status goes into the pack"],
    objectionReply: { en: "Happy to send it. Tell me the two questions it should answer, and let's fix the review before I send it.", tr: "Memnuniyetle gönderirim. Cevaplaması gereken iki soruyu söyleyin, göndermeden önce incelemeyi sabitleyelim." },
    message: {
      en: "Hi {first}, sending the {project} information as promised. So it answers your actual questions, tell me the two that matter most. I'll send it {slotA} and suggest fifteen minutes {slotB} to go through it. Does {slotB} work?",
      tr: "Merhaba {salutation}, söz verdiğim gibi {project} bilgilerini gönderiyorum. Gerçek sorularınıza cevap vermesi için en önemli iki soruyu söyleyin. {slotA} saatinde gönderir, {slotB} saatinde on beş dakika birlikte geçmeyi öneririm. {slotB} uygun mu?",
    },
  },
  after_visit_home: {
    id: "after_visit_home",
    title: "Fix the decision call before they fly",
    methodSourceIds: ["spin", "predictable"],
    useWhen: "The customer will decide after returning home.",
    avoidWhen: "If the customer asks for no contact until they call, treat it as a pause.",
    say: {
      en: "Good idea to decide with the family at home. Let's make the trip home productive: what will you need with you, the cost sheet, the documents, the comparison? I'll have it ready before you fly. And let's fix the call now: {slotB}, and on that call the question is one decision.",
      tr: "Kararı ailenizle evde vermeniz mantıklı. Eve dönüşü verimli yapalım: yanınızda ne olmalı; masraf tablosu, belgeler, karşılaştırma? Uçmadan önce hazır ederim. Görüşmeyi de şimdi sabitleyelim: {slotB} saatinde; o görüşmede konu tek bir karar.",
    },
    directAsk: { en: "Can we put {slotB} in both diaries now, with {participants} on the call?", tr: "{slotB} saatini şimdi iki ajandaya da yazalım mı; görüşmede {participants} de olsun?" },
    questionToTest: { en: "Who will be in the room when you decide, and what will they ask first?", tr: "Karar verirken odada kim olacak ve ilk neyi soracaklar?" },
    proofNeeded: ["Departure date recorded", "Decision participants recorded", "A one-page brief built from evidence records"],
  },
  delay: {
    id: "delay",
    title: "Ask directly: a question, or the timing?",
    methodSourceIds: ["spin", "predictable"],
    useWhen: "Repeated postponement with no named reason.",
    avoidWhen: "The customer has asked to pause; respect the pause instead.",
    say: {
      en: "I don't want to chase you without a reason, so let me ask directly: is there an open question I can resolve this week, or is the timing itself not right? If it's a question, tell me which one and I'll bring the answer {slotA}. If it's timing, give me the month and I'll come back then, not before.",
      tr: "Sizi sebepsiz yere rahatsız etmek istemiyorum, o yüzden doğrudan sorayım: bu hafta çözebileceğim açık bir soru mu var, yoksa zamanlama mı uygun değil? Soruysa hangisi olduğunu söyleyin, cevabı {slotA} saatinde getireyim. Zamanlamaysa ayı söyleyin, ondan önce değil o zaman döneyim.",
    },
    directAsk: { en: "Which is it, a question or the timing, and what date goes with it?", tr: "Hangisi: bir soru mu, zamanlama mı? Ve buna hangi tarih eşlik ediyor?" },
    questionToTest: { en: "If the open question were answered today, what would you do next?", tr: "Açık soru bugün yanıtlansaydı, sonraki adımınız ne olurdu?" },
    proofNeeded: ["The customer's answer; do not read silence as consent or refusal"],
  },
  silence: {
    id: "silence",
    title: "Re-ask after silence: yes, not yet, or no",
    methodSourceIds: ["spin", "predictable"],
    useWhen: "An ask was made and the customer has not answered for two days or more.",
    avoidWhen: "The customer asked to pause, or the last message is less than 48 hours old.",
    say: {
      en: "I haven't heard back on {unit} and I'd rather ask than assume. Is it still on the table? If yes, tell me the one thing that would move it and I'll deal with that. If no, say so and I'll stop chasing.",
      tr: "{unit} konusunda sizden haber alamadım; varsayım yapmaktansa sormayı tercih ederim. Hâlâ gündemde mi? Evetse, ilerletecek tek şeyi söyleyin, onunla ilgileneyim. Hayırsa söyleyin, sizi bir daha rahatsız etmem.",
    },
    directAsk: { en: "Yes, not yet, or no: which is it? If yes, {slotA} or {slotB}?", tr: "Evet mi, henüz değil mi, hayır mı? Evetse hangisi uygun: {slotA} ya da {slotB}?" },
    questionToTest: { en: "What changed since we last spoke?", tr: "Son konuşmamızdan bu yana ne değişti?" },
    proofNeeded: ["The customer's answer; silence is not consent or refusal"],
    message: {
      en: "Hi {first}, I haven't heard back on {project} {unit} and I'd rather ask than assume. Is it still on the table? If yes, tell me the one thing that would move it. If no, say so and I'll stop chasing, no hard feelings.",
      tr: "Merhaba {salutation}, {project} {unit} konusunda sizden haber alamadım; varsayım yapmaktansa sormayı tercih ederim. Hâlâ gündemde mi? Evetse, ilerletecek tek şeyi söyleyin. Hayırsa söyleyin, sizi bir daha rahatsız etmem.",
    },
    callOpener: { en: "{first}, thirty seconds. You went quiet on {project} and I don't read silence as a no, but I don't read it as a yes either. Which is it?", tr: "{salCall}, otuz saniye. {project} konusunda sessiz kaldınız; sessizliği hayır olarak da evet olarak da almıyorum. Hangisi?" },
  },
  reengage: {
    id: "reengage",
    title: "Come back on the agreed date, with what changed if anything did",
    methodSourceIds: ["spin", "bly"],
    useWhen: "A paused opportunity whose agreed re-contact date has arrived.",
    avoidWhen: "The agreed date has not arrived, or the customer declined contact. Never invent a change.",
    say: {
      en: "When we spoke you asked me to come back around {pauseDate}, so I'm doing exactly that. Is now the right time to pick up {project} again, and has anything changed on your side: budget, timing or requirements?",
      tr: "Konuştuğumuzda {pauseDate} civarında tekrar aramamı istemiştiniz; sözümü tutuyorum. {project} konusuna yeniden dönmek için şimdi uygun bir zaman mı; tarafınızda bütçe, zamanlama veya ihtiyaçlar açısından değişen bir şey oldu mu?",
    },
    directAsk: { en: "Shall we book twenty minutes {slotA} or {slotB} to see where things stand?", tr: "Durumu görmek için yirmi dakika ayıralım mı; hangisi uygun: {slotA} ya da {slotB}?" },
    questionToTest: { en: "Has anything changed on your side since {pauseDate}?", tr: "{pauseDate} tarihinden bu yana tarafınızda değişen bir şey oldu mu?" },
    proofNeeded: ["The recorded pause date and reason", "Reconfirmed price/availability of the previously preferred option before mentioning it"],
    sayNoEvidence: {
      en: "When we spoke you asked me to come back around {pauseDate}, so I'm doing exactly that. Nothing has changed on my side; I'm only asking whether anything has on yours: budget, timing or requirements.",
      tr: "Konuştuğumuzda {pauseDate} civarında tekrar aramamı istemiştiniz; sözümü tutuyorum. Benim tarafımda değişen bir şey yok; yalnızca sizin tarafınızda değişen bir şey var mı diye soruyorum: bütçe, zamanlama ya da ihtiyaçlar.",
    },
    message: {
      en: "Hi {first}, you asked me to come back around {pauseDate}, so here I am. Since then, on my side: {evidence}. Is now the right time to pick up {project} again? Twenty minutes {slotA} or {slotB}?",
      tr: "Merhaba {salutation}, {pauseDate} civarında dönmemi istemiştiniz; işte buradayım. O zamandan bu yana benim tarafımda: {evidence}. {project} konusuna dönmek için şimdi uygun mu? Yirmi dakika; hangisi uygun: {slotA} ya da {slotB}?",
    },
    messageNoEvidence: {
      en: "Hi {first}, you asked me to come back around {pauseDate}, so here I am. Nothing has changed on my side; I'm only asking whether anything has on yours. Is now the right time to pick up {project} again? Twenty minutes {slotA} or {slotB}?",
      tr: "Merhaba {salutation}, {pauseDate} civarında dönmemi istemiştiniz; işte buradayım. Benim tarafımda değişen bir şey yok; yalnızca sizin tarafınızda değişen bir şey var mı diye soruyorum. {project} konusuna dönmek için şimdi uygun mu? Yirmi dakika; hangisi uygun: {slotA} ya da {slotB}?",
    },
  },
  winback: {
    id: "winback",
    title: "Win back a lost deal with what changed",
    methodSourceIds: ["spin", "rule"],
    useWhen: "A lost opportunity that was not a contact refusal, with a dated recorded change that addresses the lost reason, or the agreed revisit date.",
    avoidWhen: "The customer asked not to be contacted, or nothing recorded has changed and no revisit date was agreed. Never invent a change.",
    say: {
      en: "When we last spoke, {project} didn't work because {lostReason}. I noted it and stopped. One thing has changed since, on record: {evidence}. I'm not assuming you're still looking. If you are, it's worth ten minutes.",
      tr: "Son konuştuğumuzda {project} olmamıştı, çünkü {lostReason}. Not aldım ve bıraktım. O zamandan bu yana kayıtlı bir şey değişti: {evidence}. Hâlâ baktığınızı varsaymıyorum. Bakıyorsanız on dakikaya değer.",
    },
    directAsk: { en: "Still looking, or has that chapter closed? If still looking: {slotA} or {slotB} for a quick call?", tr: "Hâlâ bakıyor musunuz, yoksa o dosya kapandı mı? Bakıyorsanız kısa bir görüşme için hangisi uygun: {slotA} ya da {slotB}?" },
    questionToTest: { en: "What would have to be different this time for it to work?", tr: "Bu sefer olması için neyin farklı olması gerekir?" },
    proofNeeded: ["The recorded lost reason", "A dated record of what changed (availability, new option, verified evidence) newer than the loss"],
    sayNoEvidence: {
      en: "When we last spoke, {project} didn't work because {lostReason}, and you asked me to check back around {revisitDate}. Nothing has changed on my side; I'm only asking whether anything has on yours.",
      tr: "Son konuştuğumuzda {project} olmamıştı, çünkü {lostReason}; {revisitDate} civarında tekrar sormamı istemiştiniz. Benim tarafımda değişen bir şey yok; yalnızca sizin tarafınızda değişen bir şey var mı diye soruyorum.",
    },
    fallbackAsk: { en: "Understood, that chapter's closed. Shall I close the file for good, or is there one requirement you'd want me to watch for?", tr: "Anladım, o dosya kapandı. Dosyayı tamamen kapatayım mı, yoksa takip etmemi istediğiniz tek bir şart var mı?" },
    message: {
      en: "Hi {first}, when we closed your file on {project} the reason was that {lostReason}. That has changed, on record: {evidence}. I'm not assuming you're still looking, but if you are, ten minutes {slotA} or {slotB}?",
      tr: "Merhaba {salutation}, {project} dosyanızı kapattığımızda sebep şuydu: {lostReason}. Kayıtlı bir şey değişti: {evidence}. Hâlâ baktığınızı varsaymıyorum; ama bakıyorsanız on dakika; hangisi uygun: {slotA} ya da {slotB}?",
    },
    messageNoEvidence: {
      en: "Hi {first}, when we last spoke {project} didn't work because {lostReason}, and you asked me to check back around {revisitDate}. Nothing has changed on my side; I'm only asking whether anything has on yours. Still looking, or has that chapter closed?",
      tr: "Merhaba {salutation}, son konuştuğumuzda {project} olmamıştı, çünkü {lostReason}; {revisitDate} civarında tekrar sormamı istemiştiniz. Benim tarafımda değişen bir şey yok; yalnızca sizin tarafınızda değişen bir şey var mı diye soruyorum. Hâlâ bakıyor musunuz, yoksa o dosya kapandı mı?",
    },
  },
};

// Objection key → playbook id (all 23 keys covered; legacy 'timing' handled via OBJECTION_ALIASES in vocabulary)
export const OBJECTION_TO_PLAYBOOK: Record<string, string> = {
  price: "discount",
  cash_discount: "cash_discount",
  fees: "fees",
  competitor: "competitor",
  market_wait: "market_wait",
  currency_risk: "currency_risk",
  returns: "returns",
  resale_liquidity: "resale_liquidity",
  management: "management",
  delivery: "delivery",
  only_completed: "only_completed",
  developer_trust: "developer_trust",
  feasibility: "feasibility",
  location: "location",
  remote: "remote",
  legal_residency: "legal_residency",
  approval: "approval",
  spouse_no: "spouse_no",
  trust: "proof",
  think_it_over: "think_it_over",
  no_hurry: "no_hurry",
  send_info: "send_info",
  after_visit_home: "after_visit_home",
};

// Concern answer key → playbook id
export const CONCERN_TO_PLAYBOOK: Record<string, string> = {
  value: "discount",
  trust: "proof",
  ownership: "proof",
  delivery: "delivery",
  use: "feasibility",
  services: "feasibility",
  currency: "currency_risk",
  legal: "legal_residency",
  resale: "resale_liquidity",
  management: "management",
  vacancy: "returns",
  costs: "fees",
  delays: "delivery",
};

/** Playbooks whose scripts pitch the current unit; excluded when the customer has refused that unit/project. */
export const UNIT_PITCH_PLAYBOOKS = new Set(["dominant", "returns", "gap", "discount", "trade", "deadline", "scarcity_documented", "price_list", "reservation", "close_conditional", "close_funding", "close_terms", "close_authority", "post_visit", "price_final", "hold", "hold_open", "cash_discount", "management", "delivery", "location", "remote"]);
/** Playbooks whose ask must survive the stage-ladder floor (their ask is the point). */
export const LEVER_PLAYBOOKS = new Set(["deadline", "scarcity_documented", "price_list"]);
/** Customer-facing question for each qualification gap (EN/TR). */
export const GAP_QUESTION_L: Record<string, L> = {
  "Main purchase goal": { en: "what must this purchase deliver for you", tr: "bu alımın sizin için ne sağlaması gerekiyor" },
  "Budget (amount, scope, firmness)": { en: "what total are you working with, all in, and when are the funds available", tr: "masraflar dahil hangi toplamla çalışıyorsunuz ve fonlar ne zaman hazır" },
  "Who decides (participants / co-decider)": { en: "who decides with you", tr: "kararı sizinle birlikte kim veriyor" },
  "Decision date / timeline": { en: "by when do you want to decide", tr: "ne zamana kadar karar vermek istiyorsunuz" },
  "Funding source and timing": { en: "how it will be funded and when the funds are available", tr: "nasıl fonlanacak ve fonlar ne zaman hazır" },
  "Why now": { en: "why now", tr: "neden şimdi" },
  "Must-haves": { en: "what it must have", tr: "olmazsa olmazlarınız neler" },
};

/** The first commitment step the business uses. Labeled assumption: reservation. */
export const COMMITMENT_STEP: L = { en: "reservation", tr: "rezervasyon" };
