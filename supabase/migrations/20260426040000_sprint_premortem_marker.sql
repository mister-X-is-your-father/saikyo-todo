-- Phase 6.8: Pre-mortem 重複起動抑制マーカー。
-- - premortem-worker 成功時に NOW() がセットされる
-- - sprintService.changeStatus → 'active' で premortem_generated_at IS NULL の Sprint だけ enqueue
alter table public.sprints
  add column if not exists premortem_generated_at timestamptz;

-- 起動候補 (active 化済 + 未生成) のスポット pickup 用 partial index
create index if not exists sprints_premortem_pending_idx
  on public.sprints (workspace_id, start_date)
  where status in ('active', 'planning')
    and premortem_generated_at is null
    and deleted_at is null;
