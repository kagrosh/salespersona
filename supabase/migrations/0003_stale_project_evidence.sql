-- Migration 0003: project documentation status and evidence changes mark strategy runs stale.
--
-- The engine reads projects.permitted_use_status / milestones_status (land-track blocker, ongoing-home milestones) and
-- evidence_claims.status (verified evidence quoted in customer wording, win-back "what changed"). Until now no trigger
-- reached strategy_runs from those tables, so a run saying "do not state that construction is approved" stayed valid
-- after the permit was documented, and a run quoting a claim as verified stayed valid after the claim was disputed.
-- Route: projects / evidence_claims → inventory_items (project_id) → opportunity_options → strategy_runs.

create or replace function public.mark_strategy_stale()
returns trigger language plpgsql security definer set search_path = public as $$
declare opp uuid; why text; proj uuid; inv uuid;
begin
  if tg_table_name = 'opportunities' then
    opp := new.id; why := 'opportunity updated';
  elsif tg_table_name = 'inventory_items' then
    update public.strategy_runs r set status = 'stale', stale_reason = 'inventory price/availability changed'
      from public.opportunity_options o
      where o.inventory_item_id = new.id and r.opportunity_id = o.opportunity_id and r.status = 'valid';
    return new;
  elsif tg_table_name = 'projects' then
    -- Separate branches on purpose: PL/pgSQL resolves new.<field> per trigger table, so a shared CASE expression
    -- referencing new.project_id would fail to compile when the trigger fires on projects.
    proj := new.id; why := 'project documentation changed';
  elsif tg_table_name = 'evidence_claims' then
    proj := coalesce(new.project_id, old.project_id);
    inv  := coalesce(new.inventory_item_id, old.inventory_item_id);
    why  := 'project evidence changed';
  else
    opp := coalesce(new.opportunity_id, old.opportunity_id);
    why := tg_table_name || ' changed';
  end if;
  if proj is not null or inv is not null then
    update public.strategy_runs r set status = 'stale', stale_reason = why
      from public.opportunity_options o
      join public.inventory_items i on i.id = o.inventory_item_id
      where r.opportunity_id = o.opportunity_id and r.status = 'valid'
        and (i.project_id = proj or i.id = inv);
  end if;
  if opp is not null then
    update public.strategy_runs set status = 'stale', stale_reason = why
      where opportunity_id = opp and status = 'valid';
  end if;
  return coalesce(new, old);
end;
$$;

-- Project saves post every column, so fire only when a material value actually changed.
drop trigger if exists stale_on_project on public.projects;
create trigger stale_on_project after update of
  permitted_use_status, milestones_status, documented_permitted_use, documented_milestones, location, jurisdiction
  on public.projects for each row
  when (old.permitted_use_status is distinct from new.permitted_use_status
     or old.milestones_status is distinct from new.milestones_status
     or old.documented_permitted_use is distinct from new.documented_permitted_use
     or old.documented_milestones is distinct from new.documented_milestones
     or old.location is distinct from new.location
     or old.jurisdiction is distinct from new.jurisdiction)
  execute function public.mark_strategy_stale();

drop trigger if exists stale_on_evidence on public.evidence_claims;
create trigger stale_on_evidence after insert or update of status, statement, source_date or delete
  on public.evidence_claims for each row execute function public.mark_strategy_stale();
