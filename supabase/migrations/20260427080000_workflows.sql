-- Phase 6.15 iter112: ワークフロー (n8n 風 DAG) の data 層基盤。
-- ユーザ要望「自動化を試みるというのもほしい。各タスクに。で、それはワークフロー定義できるねん。
--           n8nみたいな。途中にプレイライト挟んだりapi挟んだり」
-- 「n8nライクでスクリプトとaiとapiと、あとなんか通知系とか繋ぐ系の自由なワークフローにして」
--
-- まず data 層のみ:
--   - workflows: ワークフロー定義 (DAG を JSON で保持、リビジョンは version で楽観ロック)
--   - workflow_runs: 1 回の実行ログ (status / started_at / finished_at / error)
--   - workflow_node_runs: 各ノード単位の実行結果 (input / output / error / duration)
-- 実行 engine (順次/並列/条件) と各 node 型 (http/ai/slack/email/script) は次 iter。
--
-- Trigger は別途 (cron / item-event / webhook):
--   - manual: UI から「実行」button
--   - cron: workspace_settings.timezone と同じ tz で起動
--   - item-event: item の status_change 等で発火 (Phase 6.16 で実装予定)

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  /**
   * DAG 定義 (JSON):
   *   {
   *     "nodes": [
   *       { "id": "n1", "type": "http", "config": {...} },
   *       { "id": "n2", "type": "ai", "config": {...} },
   *       ...
   *     ],
   *     "edges": [
   *       { "from": "n1", "to": "n2" },
   *       { "from": "n1", "to": "n3", "condition": "..." }
   *     ]
   *   }
   * 詳細スキーマは features/workflow/schema.ts (zod) で型付け。
   */
  graph jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  /**
   * trigger 設定:
   *   { "kind": "manual" }
   *   { "kind": "cron", "cron": "0 9 * * 1" }
   *   { "kind": "item-event", "event": "status_change", "filter": {...} }
   */
  trigger jsonb not null default '{"kind": "manual"}'::jsonb,
  /** false = disabled (定義はあるが起動しない) */
  enabled boolean not null default true,
  created_by_actor_type text not null default 'user',
  created_by_actor_id uuid not null,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (created_by_actor_type in ('user', 'agent')),
  check (length(name) between 1 and 200)
);

create index workflows_workspace_idx on public.workflows (workspace_id);
create index workflows_enabled_idx on public.workflows (workspace_id, enabled)
  where deleted_at is null;

-- 1 実行ログ
create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  /** 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' */
  status text not null default 'queued',
  /** 起動経路: 'manual' | 'cron' | 'item-event' | 'webhook' */
  trigger_kind text not null,
  /** 実行に渡した入力 (任意 JSON) — manual なら button 押下情報、item-event なら item */
  input jsonb,
  /** 終端 node の output (succeeded 時のみ) */
  output jsonb,
  /** 失敗時のメッセージ */
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled'))
);

create index workflow_runs_workflow_idx on public.workflow_runs (workflow_id, created_at desc);
create index workflow_runs_status_idx on public.workflow_runs (workspace_id, status);

-- 各ノードの実行結果 (debug / 再実行用)
create table public.workflow_node_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  /** workflows.graph の node id (string) */
  node_id text not null,
  node_type text not null,
  /** 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' */
  status text not null default 'pending',
  input jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  /** ログ (script / http の stdout / response 抜粋など) */
  log text,
  created_at timestamptz not null default now(),
  check (status in ('pending', 'running', 'succeeded', 'failed', 'skipped'))
);

create index workflow_node_runs_run_idx on public.workflow_node_runs (workflow_run_id, created_at);

-- updated_at 自動更新 trigger
create or replace function public.tg_workflows_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger workflows_set_updated_at
  before update on public.workflows
  for each row execute function public.tg_workflows_set_updated_at();

-- RLS: workspace member であれば自分の workspace の workflow を読み書きできる
alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_node_runs enable row level security;

create policy workflows_select on public.workflows
  for select to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workflows.workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy workflows_modify on public.workflows
  for all to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workflows.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  ) with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workflows.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  );

create policy workflow_runs_select on public.workflow_runs
  for select to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workflow_runs.workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy workflow_runs_modify on public.workflow_runs
  for all to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workflow_runs.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  ) with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workflow_runs.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  );

-- node_runs は run の子なので run の workspace 経由でチェック
create policy workflow_node_runs_select on public.workflow_node_runs
  for select to authenticated using (
    exists (
      select 1 from public.workflow_runs r
      join public.workspace_members m on m.workspace_id = r.workspace_id
      where r.id = workflow_node_runs.workflow_run_id
        and m.user_id = (select auth.uid())
    )
  );

create policy workflow_node_runs_modify on public.workflow_node_runs
  for all to authenticated using (
    exists (
      select 1 from public.workflow_runs r
      join public.workspace_members m on m.workspace_id = r.workspace_id
      where r.id = workflow_node_runs.workflow_run_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  ) with check (
    exists (
      select 1 from public.workflow_runs r
      join public.workspace_members m on m.workspace_id = r.workspace_id
      where r.id = workflow_node_runs.workflow_run_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'member')
    )
  );
