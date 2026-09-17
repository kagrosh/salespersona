-- 0004: stale triggers cover every column the revised engine (rules-2.2.0) reads.
--
-- The closer revision made the engine read columns that were outside the stale_on_inventory / stale_on_opportunity
-- column lists (0002), so a valid run could survive a material change:
--   inventory_items.checked_at        → availability freshness (close_conditional "availability check older than 14 days");
--   inventory_items.price_change_note → price_list lever;  stage_payment_note → delivery clause;
--   inventory_items.availability_source → unlocks scarcity_documented;
--   opportunities.why_now / must_haves / funding_source / funding_timing / decision_participants / target_timing
--     → qualification gaps and the forced "qualify" primary;
--   opportunities.will_visit_before_deciding → gates the remote playbook;
--   opportunities.lost_reason / counter_offer_currency → win-back keying and counter comparison.
-- CLAUDE.md: triggers mark runs stale after material changes. Same shape as 0002 (fires when the column is in the SET list).

drop trigger if exists stale_on_inventory on public.inventory_items;
create trigger stale_on_inventory after update of
  asking_price_minor, other_costs_minor, currency, availability, checked_at, price_valid_until, price_change_note,
  availability_count, availability_source, stage_payment_note
  on public.inventory_items for each row execute function public.mark_strategy_stale();

drop trigger if exists stale_on_opportunity on public.opportunities;
create trigger stale_on_opportunity after update of
  stage, current_objection, readiness, funding_status, funding_source, funding_timing, negotiation_room, primary_goal,
  target_decision_date, target_timing, why_now, must_haves, decision_participants, proceed_condition, co_decider_status,
  will_visit_before_deciding, counter_offer_minor, counter_offer_currency, authorized_room_minor, authorized_terms,
  concessions_given, refusal_scope, revisit_at, lost_reason, resolved_objections, paused_until
  on public.opportunities for each row execute function public.mark_strategy_stale();
