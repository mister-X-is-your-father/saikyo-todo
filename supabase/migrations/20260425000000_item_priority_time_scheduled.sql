-- =====================================================================
-- items に priority / due_time / scheduled_for を追加
-- =====================================================================
-- 目的:
--   - Todoist / TickTick 相当の UX (p1-p4、時刻付き期限、今日やる予定)
--   - Today ビュー (workspace_id, scheduled_for) 用の部分 idx
-- =====================================================================

alter table public.items
  add column priority smallint not null default 4
    check (priority between 1 and 4);

alter table public.items
  add column due_time time;

alter table public.items
  add column scheduled_for date;

create index items_today_idx
  on public.items (workspace_id, scheduled_for)
  where scheduled_for is not null and deleted_at is null;
