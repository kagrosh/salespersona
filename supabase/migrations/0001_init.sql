-- Salesperson — Customer Psychology CRM
-- Migration 0001: persistent CRM foundation (Phase 1) + strategy history (Phase 2)
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Workspaces and membership
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'salesperson' check (role in ('owner','manager','salesperson')),
  display_name  text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Membership check used by every RLS policy. SECURITY DEFINER avoids recursive RLS on workspace_members.
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.active
  );
$$;

-- Every new auth user gets a personal workspace (solo default; team support is an open decision).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  insert into public.workspaces (name)
    values (coalesce(new.raw_user_meta_data->>'workspace_name', 'My workspace'))
    returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role, display_name)
    values (ws, new.id, 'owner', coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  owner_id              uuid references auth.users(id),
  full_name             text not null,
  email                 text,
  phone                 text,
  preferred_language    text not null default 'en',          -- language for customer-facing drafts
  customer_market       text not null default 'unknown' check (customer_market in ('turkish','international','unknown')),
  purchase_logistics    text not null default 'unknown' check (purchase_logistics in ('local','remote','mixed','unknown')),
  investment_experience text not null default 'unknown' check (investment_experience in ('first','some','experienced','unknown')),
  interests             text,                                 -- free text: tracks/projects of interest
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on public.customers (workspace_id, updated_at desc);
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Projects and inventory
-- ---------------------------------------------------------------------------
create table public.projects (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references public.workspaces(id) on delete cascade,
  name                    text not null,
  track                   text not null check (track in ('home','land')),
  category                text,                               -- Apartment / Villa / Tourism plot ...
  stage                   text,                               -- Completed / Under construction / Off-plan / Undeveloped land ...
  location                text,                               -- city / country; NOT assumed
  jurisdiction            text,
  developer               text,
  description             text,
  selling_points          text,
  limitations             text,
  marketed_use            text,                               -- plots: what marketing says
  documented_permitted_use text,                              -- plots: what documents say (separate on purpose)
  delivery_claims         text,                               -- ongoing homes: what is claimed
  documented_milestones   text,                               -- ongoing homes: what is documented
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index on public.projects (workspace_id, updated_at desc);
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();

create table public.inventory_items (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  reference           text not null,                          -- unit / plot reference
  category            text,
  characteristics     text,
  asking_price_minor  bigint check (asking_price_minor is null or asking_price_minor >= 0),  -- exact minor units
  currency            char(3),
  other_costs_minor   bigint check (other_costs_minor is null or other_costs_minor >= 0),    -- NULL = unknown, never zero by default
  availability        text not null default 'unknown' check (availability in ('available','reserved','sold','unknown')),
  source              text,
  checked_at          timestamptz,                            -- when price/availability were last verified
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.inventory_items (project_id);
create trigger inventory_updated before update on public.inventory_items for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Opportunities
-- ---------------------------------------------------------------------------
create table public.opportunities (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  customer_id           uuid not null references public.customers(id) on delete cascade,
  owner_id              uuid references auth.users(id),
  title                 text not null,
  track                 text not null check (track in ('home','land')),
  stage                 text not null default 'new' check (stage in ('new','discovery','qualified','shortlist','visit','negotiation','won','lost','paused')),
  stage_reason          text,
  paused_until          date,
  target_timing         text,
  primary_goal          text,                                 -- answer key from the assessment vocabulary
  funding_status        text not null default 'unknown' check (funding_status in ('unknown','stated','confirmed','financing')),
  readiness             text not null default 'unknown' check (readiness in ('unknown','exploring','evaluating','ready','paused','refused')),
  decision_participants text,
  current_objection     text,                                 -- objection key or null
  desired_outcome       text,                                 -- salesperson's desired immediate outcome
  negotiation_room      text not null default 'unknown' check (negotiation_room in ('unknown','yes','no')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on public.opportunities (workspace_id, stage, updated_at desc);
create index on public.opportunities (customer_id);
create trigger opportunities_updated before update on public.opportunities for each row execute function public.set_updated_at();

create table public.stage_history (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  from_stage      text,
  to_stage        text not null,
  reason          text,
  changed_by      uuid references auth.users(id),
  changed_at      timestamptz not null default now()
);
create index on public.stage_history (opportunity_id, changed_at desc);

create table public.opportunity_options (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id      uuid not null references public.opportunities(id) on delete cascade,
  inventory_item_id   uuid not null references public.inventory_items(id) on delete cascade,
  status              text not null default 'candidate' check (status in ('candidate','preferred','rejected','unavailable')),
  quoted_price_minor  bigint check (quoted_price_minor is null or quoted_price_minor >= 0),
  quoted_currency     char(3),
  quoted_costs_minor  bigint check (quoted_costs_minor is null or quoted_costs_minor >= 0),
  quote_valid_until   date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.opportunity_options (opportunity_id);
create trigger options_updated before update on public.opportunity_options for each row execute function public.set_updated_at();

create table public.budget_contexts (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id    uuid not null references public.opportunities(id) on delete cascade,
  amount_minor      bigint not null check (amount_minor >= 0),
  amount_max_minor  bigint check (amount_max_minor is null or amount_max_minor >= amount_minor),
  currency          char(3) not null,
  scope             text not null check (scope in ('purchase_total','price_only','deposit','borrowing_capacity','development_total','ongoing_affordability','unknown')),
  firmness          text not null default 'unknown' check (firmness in ('firm','flexible','unknown')),
  source            text,                                     -- who said it / where
  recorded_at       timestamptz not null default now(),
  note              text
);
create index on public.budget_contexts (opportunity_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Activity, evidence, assessment answers
-- ---------------------------------------------------------------------------
create table public.activities (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id  uuid references public.opportunities(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  occurred_at     timestamptz not null default now(),
  type            text not null check (type in ('call','meeting','visit','message','quotation','note','questionnaire','customer_response')),
  author_id       uuid references auth.users(id),
  narrative       text,                                       -- what happened
  direct_quote    text,                                       -- customer's exact words
  observation     text,                                       -- observed behavior, factual
  interpretation  text,                                       -- salesperson's reading; kept separate
  behaviors       text[] not null default '{}',               -- behavior keys: discount, compare, documents, delay, returns, others
  created_at      timestamptz not null default now()
);
create index on public.activities (opportunity_id, occurred_at desc);
create index on public.activities (customer_id, occurred_at desc);

create table public.evidence_claims (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  project_id         uuid references public.projects(id) on delete cascade,
  inventory_item_id  uuid references public.inventory_items(id) on delete cascade,
  statement          text not null,
  source             text,
  source_date        date,
  recorded_by        uuid references auth.users(id),
  status             text not null default 'supplied' check (status in ('supplied','unverified','verified','disputed','expired')),
  created_at         timestamptz not null default now()
);
create index on public.evidence_claims (project_id);

create table public.assessment_answers (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  opportunity_id  uuid references public.opportunities(id) on delete cascade,
  question_key    text not null,                              -- goal, concern, horizon, involvement, uncertainty, evidence, decision, stage
  answer_key      text,
  answer_text     text,
  respondent      text not null default 'salesperson' check (respondent in ('customer','salesperson')),
  source          text,
  recorded_at     timestamptz not null default now(),
  superseded_by   uuid references public.assessment_answers(id)
);
create index on public.assessment_answers (opportunity_id, question_key, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Strategy runs, attempts, tasks
-- ---------------------------------------------------------------------------
create table public.strategy_runs (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id      uuid not null references public.opportunities(id) on delete cascade,
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  generation_mode     text not null check (generation_mode in ('rules','model','rules_fallback')),
  engine_version      text not null,
  model_id            text,
  prompt_version      text,
  input_snapshot      jsonb not null,                         -- immutable case snapshot the run used
  result              jsonb,                                  -- validated StrategyResult
  status              text not null default 'valid' check (status in ('valid','stale','failed')),
  stale_reason        text,
  error               text,
  latest_activity_id  uuid references public.activities(id)
);
create index on public.strategy_runs (opportunity_id, created_at desc);

-- Any material change to an opportunity marks its valid runs stale (the salesperson regenerates).
create or replace function public.mark_strategy_stale()
returns trigger language plpgsql security definer set search_path = public as $$
declare opp uuid; why text;
begin
  if tg_table_name = 'opportunities' then
    opp := new.id; why := 'opportunity updated';
  elsif tg_table_name = 'inventory_items' then
    update public.strategy_runs r set status = 'stale', stale_reason = 'inventory price/availability changed'
      from public.opportunity_options o
      where o.inventory_item_id = new.id and r.opportunity_id = o.opportunity_id and r.status = 'valid';
    return new;
  else
    opp := coalesce(new.opportunity_id, old.opportunity_id);
    why := tg_table_name || ' changed';
  end if;
  if opp is not null then
    update public.strategy_runs set status = 'stale', stale_reason = why
      where opportunity_id = opp and status = 'valid';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger stale_on_opportunity after update of stage, current_objection, readiness, funding_status, negotiation_room, primary_goal on public.opportunities
  for each row execute function public.mark_strategy_stale();
create trigger stale_on_option after insert or update or delete on public.opportunity_options
  for each row execute function public.mark_strategy_stale();
create trigger stale_on_budget after insert or update or delete on public.budget_contexts
  for each row execute function public.mark_strategy_stale();
create trigger stale_on_activity after insert on public.activities
  for each row execute function public.mark_strategy_stale();
create trigger stale_on_answer after insert on public.assessment_answers
  for each row execute function public.mark_strategy_stale();
create trigger stale_on_inventory after update of asking_price_minor, other_costs_minor, currency, availability on public.inventory_items
  for each row execute function public.mark_strategy_stale();

create table public.strategy_attempts (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id   uuid not null references public.opportunities(id) on delete cascade,
  strategy_run_id  uuid references public.strategy_runs(id) on delete set null,
  angle_id         text not null,                             -- playbook id (gap, discount, competitor, ...)
  angle_title      text not null,
  wording_used     text,
  attempted_at     timestamptz not null default now(),
  customer_response text,
  result           text not null default 'unknown' check (result in ('advanced','objection','delayed','failed','unknown')),
  created_by       uuid references auth.users(id)
);
create index on public.strategy_attempts (opportunity_id, attempted_at desc);
create trigger stale_on_attempt after insert on public.strategy_attempts
  for each row execute function public.mark_strategy_stale();

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id  uuid references public.opportunities(id) on delete cascade,
  customer_id     uuid references public.customers(id) on delete cascade,
  owner_id        uuid references auth.users(id),
  action          text not null,
  purpose         text,
  due_at          timestamptz,
  state           text not null default 'open' check (state in ('open','done','cancelled')),
  outcome         text,
  source_run_id   uuid references public.strategy_runs(id) on delete set null,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index on public.tasks (workspace_id, state, due_at);
create index on public.tasks (opportunity_id);

-- ---------------------------------------------------------------------------
-- Row-level security: workspace membership on every table
-- ---------------------------------------------------------------------------
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;

create policy "members read their workspaces" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "members read membership" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

do $$
declare t text;
begin
  foreach t in array array[
    'customers','projects','inventory_items','opportunities','stage_history','opportunity_options',
    'budget_contexts','activities','evidence_claims','assessment_answers','strategy_runs',
    'strategy_attempts','tasks'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "workspace select" on public.%I for select using (public.is_workspace_member(workspace_id))', t);
    execute format('create policy "workspace insert" on public.%I for insert with check (public.is_workspace_member(workspace_id))', t);
    execute format('create policy "workspace update" on public.%I for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))', t);
    execute format('create policy "workspace delete" on public.%I for delete using (public.is_workspace_member(workspace_id))', t);
  end loop;
end $$;

-- Strategy runs are immutable snapshots: only status/stale_reason may change after insert.
create or replace function public.protect_strategy_run()
returns trigger language plpgsql as $$
begin
  if new.input_snapshot is distinct from old.input_snapshot or new.result is distinct from old.result
     or new.generation_mode is distinct from old.generation_mode or new.created_at is distinct from old.created_at then
    raise exception 'strategy runs are immutable; create a new run instead';
  end if;
  return new;
end; $$;
create trigger strategy_runs_immutable before update on public.strategy_runs
  for each row execute function public.protect_strategy_run();
