-- =====================================================================
-- item_schedules: タイムライン上の "スロット" (1 task : N slot)
--   kind = 'planned' (想定) | 'actual' (実測)
--   item_id = NULL は actual の 割込み / 休憩 を表す
-- 用途: Calendar 二車線 view (左=planned / 右=actual)
-- =====================================================================

create table public.item_schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  kind text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint item_schedules_kind_valid check (kind in ('planned', 'actual')),
  constraint item_schedules_end_after_start check (end_at > start_at)
);

create index item_schedules_ws_start_idx
  on public.item_schedules (workspace_id, start_at);

create index item_schedules_item_kind_idx
  on public.item_schedules (item_id, kind)
  where item_id is not null and deleted_at is null;

-- =====================================================================
-- RLS: workspace member は SELECT / INSERT / UPDATE 可。
--   - SELECT policy には deleted_at IS NULL を入れない
--     (Postgres は UPDATE 時に new row が SELECT.using を満たすか暗黙チェックするため、
--      入れると soft-delete UPDATE が "new row violates RLS" で必ず弾かれる)
--   - DELETE は service_role のみ (= authenticated に対しては false)
-- =====================================================================
alter table public.item_schedules enable row level security;

create policy "item_schedules: ws members read"
  on public.item_schedules for select to authenticated
  using (is_workspace_member(workspace_id));

create policy "item_schedules: ws members insert"
  on public.item_schedules for insert to authenticated
  with check (
    is_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

create policy "item_schedules: ws members update (active rows)"
  on public.item_schedules for update to authenticated
  using (
    is_workspace_member(workspace_id)
    and deleted_at is null
  )
  with check (
    is_workspace_member(workspace_id)
  );

create policy "item_schedules: no delete (service only)"
  on public.item_schedules for delete to authenticated
  using (false);

-- updated_at 自動更新 trigger
create or replace function public.tg_item_schedules_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger item_schedules_set_updated_at
  before update on public.item_schedules
  for each row execute function public.tg_item_schedules_set_updated_at();

-- Realtime 配信 (二車線 view の他ユーザー反映)
alter table public.item_schedules replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.item_schedules;
  exception when duplicate_object then null;
  end;
end$$;
