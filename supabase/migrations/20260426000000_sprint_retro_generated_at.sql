-- Phase 5.3 weekly cron 用の重複実行防止マーカー。
-- - sprint-retro worker 成功時に NOW() がセットされる
-- - sprint-retro-tick (weekly cron) は status='completed' AND retro_generated_at IS NULL の
--   sprint だけ pickup → fan-out enqueue
-- - 過去に completed したが retro 未実行の sprint があれば cron が拾い直す
alter table public.sprints
  add column if not exists retro_generated_at timestamptz;

-- cron pickup 用の partial index (completed + 未実行)
create index if not exists sprints_retro_pending_idx
  on public.sprints (workspace_id, end_date)
  where status = 'completed' and retro_generated_at is null and deleted_at is null;
