-- Phase 6.15 iter108: 個人の日次 / 週次 / 月次 ゴール (ユーザ要望)。
-- 「個人の週次、日次タスク、月次タスクを表示するモード。それぞれでのゴールを設定して表示」
--
-- - period: 'day' | 'week' | 'month'
-- - period_key: ISO 表記
--     day:   "2026-04-27"
--     week:  "2026-W18" (ISO 週番号)
--     month: "2026-04"
-- - text: 自由記述ゴール (max 2000 chars)
-- - PK は (workspace_id, user_id, period, period_key) — 同一ユーザは 1 期間に 1 ゴール
-- - 楽観ロック用 version (optimistic locking pattern)
-- - audit は upsert ごとに記録 (target_type='personal_period_goal')
create table public.personal_period_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('day', 'week', 'month')),
  period_key text not null,
  text text not null default '',
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, user_id, period, period_key)
);

create index personal_period_goals_lookup_idx
  on public.personal_period_goals (workspace_id, user_id, period);

-- RLS: 自分の workspace の自分の goal のみ R/W
alter table public.personal_period_goals enable row level security;

create policy personal_period_goals_select on public.personal_period_goals
  for select to authenticated using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = personal_period_goals.workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy personal_period_goals_insert on public.personal_period_goals
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = personal_period_goals.workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy personal_period_goals_update on public.personal_period_goals
  for update to authenticated using (
    user_id = (select auth.uid())
  ) with check (
    user_id = (select auth.uid())
  );

-- updated_at 自動更新 trigger (per-table function 命名で他とぶつからないように)
create or replace function public.tg_personal_period_goals_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger personal_period_goals_set_updated_at
  before update on public.personal_period_goals
  for each row execute function public.tg_personal_period_goals_set_updated_at();
