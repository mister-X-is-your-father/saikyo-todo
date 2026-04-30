-- =====================================================================
-- iter520 (queue TC-2): items.started_at / completed_at
-- TaskChute mode の打刻 (▶ / ■) で「実際に着手した時刻 / 完了した時刻」 を残す。
-- 既存 done_at (status 遷移時刻) とは独立: started_at は doneAt 前に立ち、completed_at は
-- 「TaskChute UI で明示的に完了打刻したとき」に立つ (status 完了とは別軸、習慣化のため)。
-- 詳細: docs/methodology-modes-plan.md §1 T-2 + §5 TC-2
-- =====================================================================

alter table public.items
  add column started_at timestamptz,
  add column completed_at timestamptz;

comment on column public.items.started_at is
  'TaskChute mode の▶打刻時刻。doneAt とは独立 (= 着手時刻、status 遷移時刻ではない)。null = 未着手';
comment on column public.items.completed_at is
  'TaskChute mode の■打刻時刻。doneAt とは独立 (= 明示的な完了打刻、status=done 遷移とは別軸)。null = 未完了';
