-- queue: PDCA P-1 substrate
-- pdca_cycles + pdca_cycle_items + RLS + updated_at trigger
--
-- 設計詳細は FEEDBACK_QUEUE.md "PDCA mode 抜本再設計" entry。
-- status: plan → do → check → act → closed の 5 phase
-- pdca_cycle_items: cycle と item の M:N、role='do' (消化対象) / 'reference' (参考)

-- ---------- 1. enums ----------
create type pdca_cycle_status as enum ('plan', 'do', 'check', 'act', 'closed');
create type pdca_cycle_item_role as enum ('do', 'reference');

-- ---------- 2. pdca_cycles ----------
create table public.pdca_cycles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  hypothesis text not null default '',
  target_metric text not null default '',
  target_value text not null default '',
  actual_value text not null default '',
  check_findings text not null default '',
  act_decisions text not null default '',
  status pdca_cycle_status not null default 'plan',
  next_cycle_id uuid,
  plan_started_at timestamptz,
  plan_finished_at timestamptz,
  do_started_at timestamptz,
  do_finished_at timestamptz,
  check_started_at timestamptz,
  check_finished_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint pdca_cycles_phase_order_check check (
    (plan_finished_at is null or plan_started_at is null or plan_finished_at >= plan_started_at)
    and (do_finished_at is null or do_started_at is null or do_finished_at >= do_started_at)
    and (check_finished_at is null or check_started_at is null or check_finished_at >= check_started_at)
  )
);

create index pdca_cycles_workspace_status_idx on public.pdca_cycles (workspace_id, status);
create index pdca_cycles_owner_idx on public.pdca_cycles (workspace_id, owner_id);

-- ---------- 3. pdca_cycle_items (M:N link) ----------
create table public.pdca_cycle_items (
  cycle_id uuid not null references public.pdca_cycles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  role pdca_cycle_item_role not null default 'do',
  added_at timestamptz not null default now(),
  added_by_user_id uuid not null references auth.users(id) on delete cascade,
  sort_key integer not null default 0,
  primary key (cycle_id, item_id)
);

create index pdca_cycle_items_item_idx on public.pdca_cycle_items (item_id);
create index pdca_cycle_items_cycle_role_idx on public.pdca_cycle_items (cycle_id, role);

-- ---------- 4. RLS ----------
alter table public.pdca_cycles enable row level security;
alter table public.pdca_cycle_items enable row level security;

-- pdca_cycles: workspace member は read、member 以上は write
create policy pdca_cycles_select on public.pdca_cycles
  for select to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = pdca_cycles.workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy pdca_cycles_insert on public.pdca_cycles
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = pdca_cycles.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  );

-- update: owner 本人 or workspace admin
create policy pdca_cycles_update on public.pdca_cycles
  for update to authenticated using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.workspace_members m
      where m.workspace_id = pdca_cycles.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
    )
  );

-- pdca_cycle_items: 親 cycle が read 可能なら read、cycle owner / admin は write
create policy pdca_cycle_items_select on public.pdca_cycle_items
  for select to authenticated using (
    exists (
      select 1 from public.pdca_cycles c
      join public.workspace_members m on m.workspace_id = c.workspace_id
      where c.id = pdca_cycle_items.cycle_id
        and m.user_id = (select auth.uid())
    )
  );

create policy pdca_cycle_items_insert on public.pdca_cycle_items
  for insert to authenticated with check (
    added_by_user_id = (select auth.uid())
    and exists (
      select 1 from public.pdca_cycles c
      join public.workspace_members m on m.workspace_id = c.workspace_id
      where c.id = pdca_cycle_items.cycle_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  );

create policy pdca_cycle_items_delete on public.pdca_cycle_items
  for delete to authenticated using (
    exists (
      select 1 from public.pdca_cycles c
      join public.workspace_members m on m.workspace_id = c.workspace_id
      where c.id = pdca_cycle_items.cycle_id
        and m.user_id = (select auth.uid())
        and (
          c.owner_id = (select auth.uid())
          or m.role in ('owner', 'admin')
        )
    )
  );

-- ---------- 5. updated_at trigger ----------
create or replace function public.tg_pdca_cycles_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pdca_cycles_set_updated_at
  before update on public.pdca_cycles
  for each row execute function public.tg_pdca_cycles_set_updated_at();
