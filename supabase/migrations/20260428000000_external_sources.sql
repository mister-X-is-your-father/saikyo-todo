-- Phase 6.15 iter120: 外部 API からタスクを pull 取り込みする data 層 foundation。
-- ユーザ要望「pull型で、各APIを叩いて、タスクを取得する機能とかも欲しい。yamory。
--           そしてカスタムのやつ」「api連携機能とかもちゃんと頼むで」
--
-- 設計:
--   - external_sources: workspace 単位の取込元定義 (kind=yamory|custom-rest, config jsonb)
--   - external_imports: 1 回のポーリング run のログ (status / fetched / created)
--   - external_item_links: external_id ↔ item_id の写像 (重複取込防止 + 同期更新時のキー)
--
-- ポーリング worker / mapping 設定 / UI は次 iter で実装 (今 iter は CRUD まで)。

create table public.external_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  /** 'yamory' | 'custom-rest' (将来 'github-issues' / 'jira' 等を追加) */
  kind text not null,
  /**
   * 取得設定 (kind 別):
   *   yamory:      { token, project_ids?: string[] }
   *   custom-rest: { url, method, headers?, items_path?, id_path?, title_path?, due_path?, status_map? }
   */
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  /** cron 式 (workspace_settings.timezone 解釈)。null なら manual のみ */
  schedule_cron text,
  last_synced_at timestamptz,
  created_by_actor_type text not null default 'user',
  created_by_actor_id uuid not null,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (kind in ('yamory', 'custom-rest')),
  check (length(name) between 1 and 200),
  check (created_by_actor_type in ('user', 'agent'))
);

create index external_sources_workspace_idx on public.external_sources (workspace_id);
create index external_sources_enabled_idx
  on public.external_sources (workspace_id, enabled)
  where deleted_at is null;

-- 1 回の取込 run
create table public.external_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null references public.external_sources(id) on delete cascade,
  /** 'queued' | 'running' | 'succeeded' | 'failed' */
  status text not null default 'queued',
  /** 'manual' | 'cron' */
  trigger_kind text not null,
  fetched_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (status in ('queued', 'running', 'succeeded', 'failed')),
  check (trigger_kind in ('manual', 'cron'))
);

create index external_imports_source_idx on public.external_imports (source_id, created_at desc);

-- external_id ↔ item_id mapping (再取込時の同期更新用)
create table public.external_item_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null references public.external_sources(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  /** 外部 system 側の一意 id (Yamory finding id 等) */
  external_id text not null,
  external_url text,
  /** 直近 fetch 時の生 payload (差分検知用) */
  last_payload jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create index external_item_links_item_idx on public.external_item_links (item_id);

-- updated_at 自動更新 trigger
create or replace function public.tg_external_sources_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger external_sources_set_updated_at
  before update on public.external_sources
  for each row execute function public.tg_external_sources_set_updated_at();

-- RLS: workspace member であれば read、member 以上で modify
alter table public.external_sources enable row level security;
alter table public.external_imports enable row level security;
alter table public.external_item_links enable row level security;

create policy external_sources_select on public.external_sources
  for select to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = external_sources.workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy external_sources_modify on public.external_sources
  for all to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = external_sources.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  ) with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = external_sources.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  );

create policy external_imports_select on public.external_imports
  for select to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = external_imports.workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy external_imports_modify on public.external_imports
  for all to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = external_imports.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  ) with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = external_imports.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  );

create policy external_item_links_select on public.external_item_links
  for select to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = external_item_links.workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy external_item_links_modify on public.external_item_links
  for all to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = external_item_links.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  ) with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = external_item_links.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  );
