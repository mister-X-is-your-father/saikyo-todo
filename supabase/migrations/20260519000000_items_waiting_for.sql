-- queue: 連絡待ちモード WT-1 — items.waiting_for jsonb
-- 詳細: FEEDBACK_QUEUE.md "連絡待ちモード" entry / ~/.claude/plans/saikyo-waiting-mode-plan.md §2.1
--
-- GTD Waiting For を時間軸 + 通知 channel 統合で独立 feature 化する substrate。
-- jsonb で柔軟性確保 (専用 table 化は次フェーズ)。
-- WaitingForState shape: {kind: 'internal'|'external', targetUserId?, targetContactId?,
--   targetLabel: string, requestedAt: ts, reminderCadenceDays?: number, lastRemindedAt?: ts,
--   slackChannelId?: string, note?: string}

alter table public.items
  add column if not exists waiting_for jsonb;

-- リマインド worker (WT-4) の対象抽出用 partial index
-- `waiting_for IS NOT NULL` 行のみ index、cadence 経過 item の SELECT を加速。
create index if not exists items_waiting_for_active_idx
  on public.items ((waiting_for is not null))
  where waiting_for is not null and deleted_at is null;

comment on column public.items.waiting_for is
  '連絡待ちモード state (WaitingForState jsonb)。null = 待ちでない。詳細: WT-1';
