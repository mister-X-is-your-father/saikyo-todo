-- Phase 6.15 iter106: Workspace 単位の Sprint デフォルト設定。
-- ユーザ要望:「基本は曜日指定」「デフォルトが編集できたり、特例でこのスプリントだけ X月Y日から…」
--
-- - sprint_default_start_dow: 0=日, 1=月, …, 6=土 (default 1 = 月曜開始)
-- - sprint_default_length_days: Sprint 長 (default 14 = 2 週間)
--
-- Sprint 新規作成 form の startDate / endDate 初期値はこれを参照する。
-- 個別 Sprint の startDate / endDate を override (iter105) するのは引き続き可能。
alter table public.workspace_settings
  add column if not exists sprint_default_start_dow smallint not null default 1;

alter table public.workspace_settings
  add column if not exists sprint_default_length_days smallint not null default 14;

alter table public.workspace_settings
  add constraint workspace_settings_sprint_dow_range_check
  check (sprint_default_start_dow between 0 and 6);

alter table public.workspace_settings
  add constraint workspace_settings_sprint_length_range_check
  check (sprint_default_length_days between 1 and 90);
