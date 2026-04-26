-- Phase 6.9: AI コスト workspace 月次上限。
-- - NULL = 無制限 (既存 workspace は default で NULL)
-- - 集計超過時に Agent 実行を pre-flight で弾く
-- - cost_warn_threshold_ratio: 警告通知を出す閾値 (default 0.8 = 80%)
alter table public.workspace_settings
  add column if not exists monthly_cost_limit_usd numeric(10, 2);

alter table public.workspace_settings
  add column if not exists cost_warn_threshold_ratio numeric(3, 2) not null default 0.80;
