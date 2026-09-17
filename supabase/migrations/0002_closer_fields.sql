-- Migration 0002: fields a closer needs — qualification, negotiation, outcome/persistence, legitimate urgency evidence.
-- Every new field is optional; nothing here is inferred. Unknown stays unknown.

-- ---------------------------------------------------------------------------
-- Opportunities: qualification core, negotiation position, outcome and re-contact
-- ---------------------------------------------------------------------------
alter table public.opportunities
  -- qualification
  add column target_decision_date date,                       -- when the customer says they want to decide
  add column why_now              text,                       -- customer's stated reason for buying now
  add column must_haves           text,                       -- essentials (deal-breakers)
  add column nice_to_haves        text,
  add column competing_options    text,                       -- named alternatives incl. "do nothing" / other asset class
  add column proceed_condition    text,                       -- customer's own "I'll proceed if …"
  add column co_decider_status    text not null default 'unknown'
    check (co_decider_status in ('unknown','none','not_involved','informed','aligned','objecting')),
  add column will_visit_before_deciding text not null default 'unknown'
    check (will_visit_before_deciding in ('unknown','yes','no')),
  add column funding_source       text,                       -- savings, sale of another property, loan, company funds…
  add column funding_timing       text,                       -- when funds are available
  -- negotiation position
  add column counter_offer_minor    bigint check (counter_offer_minor is null or counter_offer_minor >= 0),
  add column counter_offer_currency char(3),
  add column authorized_room_minor  bigint check (authorized_room_minor is null or authorized_room_minor >= 0), -- price reduction the seller authorized in writing; NULL = not confirmed
  add column authorized_terms       text,                     -- non-price concessions authorized (payment plan, furniture, fee sharing, unit swap)
  add column concessions_given      text,                     -- what has already been conceded to this customer
  -- outcome and persistence
  add column lost_reason          text check (lost_reason is null or lost_reason in ('price','competitor','timing','financing','trust','location','product','no_response','other')),
  add column refusal_scope        text not null default 'none' check (refusal_scope in ('none','unit','project','contact')), -- what exactly the customer refused
  add column contact_preference   text,                       -- how/when the customer wants to be contacted (or "do not contact")
  add column revisit_condition    text,                       -- what would make it worth re-opening (customer's words)
  add column revisit_at           date,                       -- agreed re-contact date for paused/lost
  add column resolved_objections  text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Projects: documented status as enums instead of coerced free text
-- ---------------------------------------------------------------------------
alter table public.projects
  add column permitted_use_status text not null default 'undocumented' check (permitted_use_status in ('undocumented','pending','documented')),
  add column milestones_status    text not null default 'undocumented' check (milestones_status in ('undocumented','pending','documented'));

update public.projects set permitted_use_status = 'documented' where coalesce(documented_permitted_use, '') <> '';
update public.projects set milestones_status    = 'documented' where coalesce(documented_milestones, '') <> '';

-- ---------------------------------------------------------------------------
-- Inventory: legitimate, sourced urgency evidence
-- ---------------------------------------------------------------------------
alter table public.inventory_items
  add column price_valid_until    date,                       -- documented price-list validity
  add column price_change_note    text,                       -- e.g. "developer price list rises 3% at slab completion" with source
  add column availability_count   integer check (availability_count is null or availability_count >= 0), -- documented count of comparable units left
  add column availability_source  text,
  add column stage_payment_note   text;                       -- documented stage-linked payment/price milestone

alter table public.opportunity_options
  add column terms_source text;                               -- where quote_valid_until comes from (written offer, price list…)

-- ---------------------------------------------------------------------------
-- Budget: recorded exchange-rate observation (never an implicit conversion)
-- ---------------------------------------------------------------------------
alter table public.budget_contexts
  add column fx_rate        numeric(18,8) check (fx_rate is null or fx_rate > 0), -- 1 budget currency = fx_rate offer currency
  add column fx_to_currency char(3),
  add column fx_rate_date   date,
  add column fx_source      text;

-- ---------------------------------------------------------------------------
-- Activities: the ask that was made and what the customer answered
-- ---------------------------------------------------------------------------
alter table public.activities
  add column ask_made     text,                               -- the commitment asked for in this touch
  add column ask_response text check (ask_response is null or ask_response in ('pending','yes','no','partial'));

alter table public.activities drop constraint if exists activities_type_check;
alter table public.activities add constraint activities_type_check
  check (type in ('call','meeting','visit','message','quotation','note','questionnaire','customer_response','draft_sent'));

-- ---------------------------------------------------------------------------
-- Stale marking must also fire on the new material columns
-- ---------------------------------------------------------------------------
drop trigger if exists stale_on_opportunity on public.opportunities;
create trigger stale_on_opportunity after update of
  stage, current_objection, readiness, funding_status, negotiation_room, primary_goal,
  target_decision_date, proceed_condition, co_decider_status, counter_offer_minor, authorized_room_minor,
  authorized_terms, concessions_given, refusal_scope, revisit_at, resolved_objections, paused_until
  on public.opportunities for each row execute function public.mark_strategy_stale();

drop trigger if exists stale_on_inventory on public.inventory_items;
create trigger stale_on_inventory after update of
  asking_price_minor, other_costs_minor, currency, availability, price_valid_until, availability_count
  on public.inventory_items for each row execute function public.mark_strategy_stale();

-- Tasks completed with an outcome are material too (an answered ask changes the next move).
create trigger stale_on_task_done after update of state on public.tasks
  for each row when (new.state <> 'open') execute function public.mark_strategy_stale();
