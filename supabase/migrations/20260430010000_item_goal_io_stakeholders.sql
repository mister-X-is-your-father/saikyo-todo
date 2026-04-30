-- =====================================================================
-- Task metadata 拡張 P0 (queue: 2026-04-30 task metadata 拡張):
--   1. items.goal text 列 (達成目的、dod=完了基準とは別軸)
--   2. item_io_artifacts (input/output、URL or file_path 添付可)
--   3. item_stakeholders (CC 的、assignees とは別軸の関係者)
-- 設計哲学: 目標・思考力・段取り力を鍛える道具 (memory project_saikyo_todo_philosophy)
-- =====================================================================

-- 1. items.goal 列 (NULL 可、空文字 default で UI が雑に出さない)
alter table public.items
  add column goal text;

-- 2. item_io_artifacts: 1 task : N 個の input / output 成果物
create table public.item_io_artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  kind text not null check (kind in ('input', 'output')),
  label text not null,
  url text,
  file_path text,        -- Supabase Storage の path (item-artifacts bucket、別 iter で実装)
  mime text,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index item_io_artifacts_item_kind_idx
  on public.item_io_artifacts (item_id, kind)
  where deleted_at is null;

-- output↔input マッチで依存推論する時に使う (label の lower-case 部分一致は service 側で計算)
create index item_io_artifacts_label_lower_idx
  on public.item_io_artifacts (workspace_id, lower(label))
  where deleted_at is null;

alter table public.item_io_artifacts enable row level security;

create policy "item_io_artifacts: ws members read"
  on public.item_io_artifacts for select to authenticated
  using (is_workspace_member(workspace_id));

create policy "item_io_artifacts: ws members insert"
  on public.item_io_artifacts for insert to authenticated
  with check (
    is_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

create policy "item_io_artifacts: ws members update (active rows)"
  on public.item_io_artifacts for update to authenticated
  using (
    is_workspace_member(workspace_id)
    and deleted_at is null
  )
  with check (is_workspace_member(workspace_id));

create policy "item_io_artifacts: no delete (service only)"
  on public.item_io_artifacts for delete to authenticated
  using (false);

create or replace function public.tg_item_io_artifacts_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger item_io_artifacts_set_updated_at
  before update on public.item_io_artifacts
  for each row execute function public.tg_item_io_artifacts_set_updated_at();

-- Realtime: I/O 編集を多人数で同時に見るので publication に追加
alter table public.item_io_artifacts replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.item_io_artifacts;
  exception when duplicate_object then null;
  end;
end$$;

-- 3. item_stakeholders: CC 的な関係者 (assignees とは別軸)
create table public.item_stakeholders (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index item_stakeholders_user_idx
  on public.item_stakeholders (workspace_id, user_id);

alter table public.item_stakeholders enable row level security;

create policy "item_stakeholders: ws members read"
  on public.item_stakeholders for select to authenticated
  using (is_workspace_member(workspace_id));

create policy "item_stakeholders: ws members insert"
  on public.item_stakeholders for insert to authenticated
  with check (
    is_workspace_member(workspace_id)
    and added_by = (select auth.uid())
  );

create policy "item_stakeholders: ws members delete"
  on public.item_stakeholders for delete to authenticated
  using (is_workspace_member(workspace_id));

-- Realtime: 関係者追加 → 該当 user の通知ベル即更新
alter table public.item_stakeholders replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.item_stakeholders;
  exception when duplicate_object then null;
  end;
end$$;
