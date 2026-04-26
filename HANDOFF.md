# HANDOFF.md — 次セッション開始用ガイド

> 最終更新: 2026-04-26 (**MVP + 稼働入力 + Phase 1-5.4 + 6.1 / 6.2 / 6.3 / 6.4 + TZ 別 cron 完了**)
>
> - 進捗: MVP (8/8) → 稼働入力 → Phase 1 → 2 → 3 → 4 → 5.1 → 5.3 → 5.2 → 5.4 →
>   5.3 weekly cron → 6.1 (AI 分解 staging) → 6.2 (streaming + Realtime push) →
>   MUST Recovery 実配信検証 → **6.3 (通知 deep-link + 3 通知タイプ追加)** →
>   **6.4 (分解 fallback + 再分解 CTA)** → **TZ-aware cron** ✅
> - 次の主戦場: **PWA / Service Worker** / **Email / Push 通知** /
>   **agent_prompts 動的読込** / **POST_MVP の他項目**
> - 詳細プラン: `~/.claude/plans/todoist-ticktick-todo-ui-ux-sleepy-hamster.md`

## 0. 現状サマリ

| 指標           | 値                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 受け入れ基準   | **8/8** PASS (`scripts/verify-acceptance.ts`)                                                                                 |
| MUST Recovery  | **6/6** PASS (`scripts/verify-must-recovery.ts`、live AI / claude CLI)                                                        |
| Notif deeplink | **8/8** PASS (`scripts/verify-phase6_3-notification-deeplink.ts`)                                                             |
| Vitest         | **367** PASS / 42 files                                                                                                       |
| E2E (local)    | **14** PASS / 2 skip (bulk-action-bar / backlog-dnd: dev mode 並列で QuickAdd 連続入力が flaky — §5.16; workers=4 で他は安定) |
| pg-boss queues | **10** (+sprint-retro-tick) — tick 頻度は `*/15 * * * *` UTC + workspace 局所評価                                             |
| views          | **6** (Today / Inbox / Kanban / Backlog / Gantt / Dashboard)                                                                  |
| schema         | 32 テーブル (+agent_decompose_proposals; workspace_settings.timezone は既存)                                                  |

AI 検証は Claude Code Max OAuth + MCP 経由なので `ANTHROPIC_API_KEY` 無しでも完走:

```bash
NODE_OPTIONS="--conditions=react-server" \
  pnpm tsx --env-file=.env.local scripts/verify-acceptance.ts
```

## 1. 最初に読む順番 (5 分で把握)

1. **本書 (HANDOFF.md)** — 現在地 + 次の一手
2. `~/.claude/plans/todoist-ticktick-todo-ui-ux-sleepy-hamster.md` — Phase 1-4 の詳細プラン
3. `CLAUDE.md` — AI 向け規約 (短縮版、必読)
4. `POST_MVP.md` — やらないリスト
5. `git log --oneline | head -10` — 直近 commit

## 2. 完了済み機能 (累積)

### 2.1 MVP (2026-04-24 クローズ)

- **認証 + RLS**: Supabase Auth + workspace_members + ws-scoped policy
  (soft-delete + RLS の罠は §5.1)
- **Item**: ltree 階層 + 楽観ロック + fractional-indexing position +
  MUST/DoD 不変条件 + priority (1-4) / due_time / scheduled_for
- **Doc / Comment**: 同パターン CRUD
- **Template**: 手動 + recurring (pg-boss cron + cron_run_id 冪等) + Mustache 変数
- **AI Agent**: Researcher / PM + executeToolLoop + agent_memories + cost 集計
- **RAG**: multilingual-e5 + pgvector HNSW + pg_trgm + RRF Hybrid
- **配信**: Docker Compose (web / worker / caddy / db-backup)

### 2.2 稼働入力 (POST_MVP Phase 2 → 実装済)

- `time_entries` / `mock_timesheet_entries` テーブル
- `/w/[wsId]/time-entries` UI (作成 / 一覧 / Sync ボタン)
- `/mock-timesheet/{login,new,entries}` (Playwright ターゲット)
- Playwright driver + pg-boss worker で sync 実行 → external_ref 返し

### 2.3 Phase 1 — 基本 UX + Command Palette

- ワンクリック完了 (`itemService.toggleComplete` + `ItemCheckbox` 優先度色)
- **Today / Inbox** ビュー (plugin、既定 = today)
- 自然言語 QuickAdd (`nl-parse.ts`: 今日/明日/来週X曜/HH:MM/p1-p4/#tag/@user/MUST)
  - chip preview
- グローバルショートカット `q / ? / g t-d`
- Command Palette: 7 view 切替

### 2.4 Phase 2 — コラボ hygiene + AI 分解 CTA 昇格

- comment hooks (`useItemComments` 系) + list Server Action
- `src/features/tag/` 一式 (CRUD + uniq + color 検証 + audit)
- `itemService.setAssignees / setTags` (非 member assignee と他 ws tag を弾く)
- UI picker: `AssigneePicker` / `TagPicker` (インライン作成) / `CommentThread`
- ItemEditDialog Tab 化 (基本 / コメント) + 🧠 AI 分解 CTA 主ボタン昇格
- Kanban カード: hover で AI 分解ボタン + 子 Item 件数 badge
- Item 検索: `useSearchItems` (fuse.js) + Command Palette `?` プレフィクス
- Template instantiate 後の `agentRoleToInvoke='researcher'` chain は配線済

### 2.16 TZ-aware cron (2026-04-26)

- **背景**: `pm-standup-tick` / `sprint-retro-tick` が UTC 09:00 固定 (= JST 18:00) で
  multi-TZ 対応していなかった
- **schema**: `workspace_settings.timezone` (既存、default `'Asia/Tokyo'`) を活用 (新規 migration 不要)
- **新モジュール**: `src/features/agent/cron-tz.ts` の純粋関数 `shouldFireForWorkspace`
  ({ cronExpr, tz, now, lastFiredAt, firstRunLookbackMs })
  - cron-parser v5 (CronExpressionParser) で localized expression を評価
  - `prev()` を `now+1s` 基準で取り、firing instant も含む (epsilon hack)
  - `lastFiredAt = null` のときは 24h lookback で初回判定
- **tick 頻度**: 全 tick を `*/15 * * * *` UTC に変更。handler 内で workspace ごと localized 判定
- **handlePmStandupTick**: 各 ws の `standup_cron` (default `'0 9 * * *'`) + `timezone` で
  fire 判定 → fire する ws だけ enqueue。`lastFiredAt` は `agent_invocations` の最新 completed
  PM invocation の `created_at` を採用
- **handleSprintRetroTick**: hardcoded `'0 9 * * 1'` (毎週月曜) を ws 局所で評価
- **handlePmStandup**: 重複防止判定の `dateKey` を ws timezone で算出 (`Intl.DateTimeFormat('en-CA')`)
- **テスト**: `cron-tz.test.ts` 13 ケース (JST/EST/EDT/double-fire/lookback)
- **検証**: vitest 367/367 + lint + typecheck クリーン

### 2.15 Phase 6.4 — 分解 panel 仕上げ: fallback + 再分解 CTA (2026-04-26)

- **0 件フォールバック**: invocation completed かつ pending=0 のとき
  "提案が出ませんでした" メッセージ + 再分解ボタンを表示
- **再分解 CTA** (panel header に追加):
  - **追加分解**: 既存 pending を残したまま再 mutate (pending=0 のときは "再分解" にラベル変更)
  - **やり直し**: rejectAll → 再 mutate (既存 pending あり時のみ)
- Agent 実行中は全ボタン disabled (重複起動防止)
- Toast: 再分解完了時に提案件数を表示

### 2.14 Phase 6.3 — 通知 deep-link + mention/invite/sync-failure 通知タイプ (2026-04-26)

**通知 → Item dialog 自動 open**:

- items-board に `?item=<id>` URL param を追加 (nuqs `parseAsString`)
- `DeepLinkedItemDialog` ラッパで paletteSelected と URL 由来を統一管理
- NotificationBell click → `extractItemId(n)` で item-linked 通知だけ抽出 → `setOpenItemId(itemId)`
- ESC で URL から `item` param が消える (close → onClose で setOpenItemId(null))
- 検証: `verify-phase6_3-notification-deeplink.ts` 全項目 PASS

**3 通知タイプ追加**:

- schema: `MentionPayload` / `InvitePayload` / `SyncFailurePayload` (jsonb 形)
- `notificationRepository.insert` helper を共通化
- **mention**: `comment.create` 後に `extractMentionTokens(body)` で `@<displayName>` を抽出、
  ws member だけ resolve して通知挿入 (CJK 対応のハンドロール scanner、self-mention 除外、
  別 Tx で best-effort で comment 自体は失敗させない)
- **invite**: `workspaceService.addMember` (admin gate) で member 挿入後に invite 通知
- **sync-failure**: time-entry worker の sync 失敗時に user_id 宛に通知
- NotificationBell `formatNotification` を 3 タイプ対応 (40 文字 preview / role / reason)
- テスト: `comment/__tests__/mention-notification.test.ts` 12 ケース (parser 7 + flow 5)、
  `time-entry/worker.test.ts` に sync-failure assertion を追加

### 2.13 Phase 6.2 — Anthropic streaming + Realtime push UI (2026-04-26)

- **publication 拡張**: `agent_decompose_proposals` + `agent_invocations` を
  `supabase_realtime` に追加 (REPLICA IDENTITY FULL)。migration
  `20260426020000_realtime_decompose_proposals.sql`
- **Anthropic streaming**: `invokeModelStream` (`messages.stream` で text delta コールバック)
  - `streamingInvoker(onTextDelta)` factory。既存 `invokeModel` は据え置き
- **researcherService.run**: invoker 未指定時は streamingInvoker を採用、
  `output.streamingText` を 250ms debounce で UPDATE → Realtime に流れる
- **Realtime hooks**:
  - `useDecomposeProposalsRealtime(parentItemId)`: pending 一覧を 150ms debounce で invalidate
  - `useAgentInvocationProgressByTarget(targetItemId)`: status + streamingText を Query キャッシュに直接書き込み
    (set-state-in-effect lint 回避)
- **DecomposeProposalsPanel**:
  - Agent 実行中は "Researcher が分解中…" + 流れる streamingText を 3 行 line-clamp で表示
  - 完了 / pending=0 で自然消滅 (item-edit-dialog の他タブとの整合)
- **検証**: `scripts/verify-phase6_2-realtime.ts` 全項目 PASS
  (3 proposals が 1 件ずつ live 出現 / streamingText 反映 / completed で UI hidden)

### 2.12 Phase 6.1 — AI 分解 staging (preview / accept / reject) (2026-04-26)

- **目的**: Researcher の分解結果を即時 items に書く代わりに staging に置き、
  ユーザーが UI で行ごとに採用 / 却下 / 編集できる導線。`undo` を不要にする
- **schema**: `agent_decompose_proposals` (workspace_id / parent_item_id /
  agent_invocation_id / title / description / is_must / dod / status_proposal:
  pending|accepted|rejected / accepted_item_id / sort_order)
  - RLS (member: insert/update; all member: select)
  * migration: `20260426010000_agent_decompose_proposals.sql`
- **tool**: `propose_child_item` (decompose mode 専用、ctx.decomposeParentItemId に閉じ込め)
- **bundle**: `buildDecomposeTools` (read 系 + propose_child_item のみ。
  create_item / write_comment / create_doc は外して脱線抑制)
- **researcherService.run** に `toolMode: 'researcher' | 'decompose'` 追加
- **decomposeItem(staging=true)** が既定 (旧挙動は staging=false で残置)
- **Service**: list / accept (items に実 INSERT) / reject / update / rejectAllPending
  - accept は `mutateWithGuard` 経由ではなく withUserDb 直 (parent ws 一致 + member ガード)
- **UI**: `DecomposeProposalsPanel` を ItemEditDialog "子タスク" タブ上部に組み込む。
  pending=0 + Agent 非実行で消える / 行 click で title/description/MUST/DoD 編集
- **テスト**: `decompose-proposal/service.test.ts` 11 ケース + researcher staging 切替 2 ケース
- **検証**: `scripts/verify-phase6_1-ui.ts` (admin で proposals 直挿入し UI 動作だけ検証、
  ANTHROPIC_API_KEY 不要) 全項目 PASS

### 2.11 Phase 5.3 weekly cron — Sprint retro fallback (2026-04-26)

- **目的**: Sprint completed → 自動 enqueue trigger を取り逃したケース (worker 落ち / 手動 status
  変更 / 過去の completed sprint で trigger 配線前) の救済
- **schema**: `sprints.retro_generated_at timestamptz` 列を追加
  - partial index `(workspace_id, end_date) WHERE status='completed' AND retro_generated_at IS NULL`
  * 手書き migration `20260426000000_sprint_retro_generated_at.sql`
- **retroService.runForSprint**: pmService.run 成功時に `retro_generated_at = NOW()` を adminDb で UPDATE
  (失敗時はセットしない → 次回 cron で再試行可能)
- **handleSprintRetroTick**: status='completed' AND retro_generated_at IS NULL AND end_date >= now() - 30d
  の sprint を全件 pickup → `sprint-retro` queue に fan-out (singletonKey で重複抑制)
- **cron**: 毎週月曜 09:00 UTC (= 18:00 JST) に `sprint-retro-tick` 発火
  (`scheduleJob('sprint-retro-tick', '0 9 * * 1', {})`)
- **テスト**: 3 ケース追加 (成功時 marker 更新 / 失敗時 marker 不変 / tick の pickup 条件 4 通り)

### 2.10 Phase 5.4 — PDCA dashboard

- **新 schema 不要**: 既存 `items.status` / `items.doneAt` / `items.createdAt` から集計
- mapping: Plan=todo / Do=in_progress / Check=直近 7 日完了 / Act=それ以前完了
- service: `pdcaService.summary(workspaceId, {from?, to?, checkWindowDays?})` →
  - counts (4 状態) / leadTimeDays (avg/p50/p95/n) / daily (期間内の done 件数を 0 埋め配列で)
- UI: **専用ページ `/[wsId]/pdca`** (workspace header に link)。
  Dashboard view 同居案を試したが Server Action 連鎖が golden-path を壊したので分離 (§5.20)
- `PdcaPanel` (`src/components/workspace/pdca-panel.tsx`):
  - 4 状態カード + 1 行分布バー + lead time stats (avg/p50/p95) + 日次 throughput sparkline
  - sparkline は **pure CSS 棒** で実装 (recharts は dev compile が重く navigation を block しがち)
  - 30/90 日切替ボタン
- テスト: `pdca/service.test.ts` 4 ケース (PDCA 集計 / daily 0 埋め / 0 件耐性 / from>to ValidationError)
- 検証: `scripts/verify-phase5_4-ui.ts` で全項目 PASS

### 2.9 Phase 5.2 — OKR (Goals + Key Results) + 手動タスク分解

**OKR**:

- Schema: `goals` (Objective: title/desc/period/start/end/status) + `key_results`
  (KR: title/progress_mode/target/current/unit/weight/position) + `items.key_result_id`
  - DB CHECK: status enum / weight 1-10 / progress_mode IN ('items','manual') / start≤end
  - RLS: goals は workspace member、key_results は親 goal を辿って判定
- Service `okrService`:
  - createGoal / updateGoal / listGoals
  - createKeyResult / updateKeyResult / listKeyResults / **listAllKeyResultsByWorkspace** (Item picker 用)
  - assignItemToKeyResult (別 ws 拒否)
  - **goalProgress**: KR ごとに mode 分岐 (items: done/total / manual: current/target) →
    Goal pct は **weighted average**
  - 全 mutation で audit_log
- UI:
  - `/[wsId]/goals` ページ — `GoalsPanel` で Goal 作成 + expand で KR 一覧 + KR 追加
    (mode=items なら weight のみ、mode=manual なら target/unit 入力)
  - 進捗バー: Goal 全体 % + KR ごと %
  - ItemEditDialog 基本 Tab に **KR picker** (Sprint picker と並列)
  - workspace header に `Goals` link
- テスト: 7 ケース (CRUD + items mode 進捗 + manual mode 進捗 + weighted average + 越境 ws 弾き)

**手動タスク分解** (ItemEditDialog "子タスク" tab):

- 既存 children を `useItems` の client filter で表示 (`parentPath === fullPathOf(parent)`)
- textarea で改行区切り bulk 追加 → sequential `useCreateItem.mutateAsync`
  - parent_path 自動 (parentItemId を service.create で正しく処理)
- AI 分解 (Researcher) とは別経路 (即時、課金なし、長文 brainstorm を行内で素早く起こせる)

**既存 bug fix**: `itemService.create` が `parentItemId` を **無視していた** のを修正
(従来は parent 指定しても root に作られてた)。`parentPath = fullPathOf(parent)` を計算

- workspaceId 一致チェック。`priority` / `dueTime` / `scheduledFor` も同時に明示的に渡すよう
  変更 (今までは default に寄ってた可能性あり)。

検証: `scripts/verify-phase5_2-ui.ts` で OKR 全フロー + 子タスク bulk add (3 件) PASS。
全体 vitest 316 → **323 PASS / 38 files**、E2E 14 PASS / 2 skip 維持。

### 2.8 Phase 5.3 (手動起動部) — Sprint Retrospective

- `src/features/sprint/retro-service.ts`:
  - `runForSprint({sprintId, idempotencyKey})` — adminDb で sprint + items を集計、
    `buildRetroUserMessage` で Keep / Problem / Try 構成 prompt を組んで pmService.run に委譲
  - PM Agent が `create_doc` で Retro Doc を保存 + `create_item` で action items を投下
  - **MUST 落ち** が 1 件以上ある場合のみ "MUST 落ちの根本原因" セクションを促す
- UI: `SprintsPanel` の active / completed Sprint card に "振り返り生成" ボタン
  (Sparkles アイコン)。完了後 toast に iter / cost を表示
- テスト: `retro-service.test.ts` 6 ケース (pure helper 3 + service mock 3)
- **自動化** (2026-04-25 同セッションで追加):
  - `sprint-retro` queue (pg-boss QUEUE_NAMES に追加、9 個目)
  - `handleSprintRetro` worker (`src/features/sprint/retro-worker.ts`) を `start.ts` に登録
  - `sprintService.changeStatus(... status='completed')` で `enqueueJob('sprint-retro', ...)`、
    `singletonKey: 'sprint-retro-<sprintId>'` で同 sprint 二重実行を抑制
  - 失敗してもスループ throw せずログのみ (Sprint 完了自体は成立)
- **未実装** (次セッション):
  - **weekly cron**: 1 週間以内に completed → retro 未実行 sprint を pickup して enqueue
    (どの sprint で retro 走ったかを判定する仕組みが必要 — agent_invocations の input.userMessage
    に sprintId が入るので grep でも可、より厳密には sprints 側に `retro_invocation_id` 列追加)
  - retro Doc が出来た時に Inbox に通知 (notifications テーブル経由)

### 2.7 Phase 5.1 — Sprint

- **Schema**: `sprints` テーブル (status: planning/active/completed/cancelled)
  - `items.sprint_id` (set null on delete)
  * **DB 制約**: `start_date <= end_date` CHECK + `(workspace_id) WHERE status='active'`
    の partial unique index で「同 ws で active は 1 つだけ」を強制
  * 物理削除なし: status='cancelled' で代替 (deleted_at は使うが移行不要)
- **Service**: `create / update / changeStatus / list / getActive / assignItem / progress`
  - active 化の Unique 違反は **withUserDb の外側 try/catch** で捕捉して
    ValidationError に変換 (内側 try/catch だと postgres-js の async error を取り逃す。§5.19)
  - assignItem は別 ws の Sprint 割当を弾く
  - audit_log: create / update / status_change / sprint_assign を記録
- **UI**:
  - `/[wsId]/sprints` ページ — `SprintsPanel` で 一覧 + 新規作成 + status 操作
  - **Burndown 簡易**: progress bar に "理想ライン" 1px (期間経過 %) を重ねて
    on-track かを色で示す。本格的な daily snapshot 履歴は POST_MVP
  - **Items の Sprint 割当**: ItemEditDialog 基本 Tab に Sprint picker (active=★)
  - **filter**: items-board に `?sprint=active|none|<id>` を nuqs で追加
  - workspace header に `Sprints` link
- **検証**: `scripts/verify-phase5-ui.ts` で全項目 PASS
  (作成 / active 化 / 2 つ目 active 拒否 / 割当 / filter / 進捗 0/1)。
  vitest 9 ケース (RLS / 楽観ロック / Unique / 越境 ws)。

### 2.6 Phase 4 — Dark mode + Notification bell

- **Refactor**: `WorkspaceHeader` を抽出 (3 ページの header 重複を統一)。
  `pageActions` (ページ固有) + `utility` (Theme/Bell など全 ws ページ共通) slot
- **Dark mode**: `next-themes` 導入、`<ThemeProvider attribute="class">` を
  `app/layout.tsx` で適用 (`suppressHydrationWarning` も同時)。
  `theme-toggle.tsx` は CSS の `dark:` variant でアイコン切替 (setState 不使用 →
  `react-hooks/set-state-in-effect` lint を回避し hydration mismatch も無し)
- **Notification feature**: `src/features/notification/{schema,repository,service,actions,hooks,realtime}.ts`
  - Repository は scoped Drizzle (RLS で `user_id = auth.uid()` 強制)
  - Service: `list / unreadCount / markRead / markAllRead`
    (作成系は heartbeat / mention worker 側 — service には置かない)
  - Hooks: `useUnreadNotificationCount` は **`initialData` あり時 staleTime: Infinity + refetchOnMount: false**
    (常時 polling すると Server Action の router.refresh が他 mutation と競合 → §5.17)。
    `useNotifications` は popover open 時のみ enabled
  - Realtime: `useNotificationsRealtime` で `postgres_changes filter=user_id=eq.<uid>` 購読、
    200ms debounce で count + list を invalidate
  - **重要**: 各 workspace ページの Server Component で `notificationService.unreadCount` を
    SSR fetch して Bell の `initialUnreadCount` に渡す (client polling 廃止)
- **NotificationBell** (`src/components/workspace/notification-bell.tsx`):
  Bell icon + 未読バッジ + Popover dropdown (50 件、相対時刻、各通知 click で既読化)。
  heartbeat type の payload は `{itemId, stage, dueDate, daysUntilDue}` を日本語整形
- **Realtime setAuth** 修正 (§5.18): Supabase Realtime の RLS 評価には JWT 必要。
  subscribe 前に `supabase.realtime.setAuth(session.access_token)` を明示しないと
  `postgres_changes` イベントが届かない (SUBSCRIBED ステータスは出ても event は dropped)。
  `notification/realtime.ts` + `item/realtime.ts` 両方に適用
- **検証**: `scripts/verify-phase4-ui.ts` (one-off Playwright スクリプト)
  → login / theme toggle / bell empty / heartbeat scan → Realtime 1s で badge 反映 / mark all read
  全 PASS。スクショ `/tmp/phase4-{dark,light,bell-empty,bell-with-notif}.png`

### 2.5 Phase 3 — 生産性加速 + MUST Escalation

- **Backlog DnD**: `@dnd-kit/sortable` (position ソート時のみ有効)
- **一括選択**: Zustand `bulk-selection` store + `BulkActionBar` (固定 bottom)
- **bulk service**: `bulkUpdateStatus` / `bulkSoftDelete` (1 件ずつ楽観ロック、
  部分失敗を `{succeeded, failed[]}` で集計)
- **Activity Tab**: `src/features/audit/` (read-only) + ItemEditDialog 3 本目 Tab
  (RLS で admin 以上、それ以下は空配列 fallback)
- **MUST Escalation**: `heartbeat.scanWorkspace` に `overdue` stage (days < 0) 追加。
  1d/overdue で `pm-recovery` queue へ singletonKey (ws+item+stage+date) で enqueue。
  `handlePmRecovery` worker → `pmService.runRecovery` で PM Agent が
  Recovery Plan Doc + write_comment による注意喚起を投下
- **enqueueJob options**: `singletonKey` / `startAfter` を第 3 引数で受ける

## 3. 次セッションでやること

### A. Phase 4 残タスク (積み残し)

- **MUST Recovery 実配信検証** ✅ (2026-04-26 — `scripts/verify-must-recovery.ts` 6/6 PASS、
  claude CLI 経由で Doc 2241 chars + comment 投下 / cost \$0.038 / 45s)
- **その他 type の通知接続**: 現状は heartbeat type のみ生成。mention / invite /
  sync-failure type は hook さえ用意すれば bell に並ぶ (formatNotification を拡張)
- **通知 → Item dialog 自動 open**: 現状は通知 click で既読化のみ。`?item=<id>`
  query で item dialog を開くには items-board の selected state を URL 駆動 (nuqs) に
  リフトする必要

### B. Phase 5 — 業務/長期/個人/OKR/習慣/振り返り (工数 L)

- **5.1 Sprint** ✅ (2026-04-25)
- **5.3 振り返り (手動起動)** ✅ — `retroService.runForSprint` + Sprint card の button
- **5.3 振り返り自動化 (残)** ★次: weekly cron worker + Sprint changeStatus='completed' トリガ
  (pm-recovery worker と同じ pattern: pg-boss に `sprint-retro` queue 追加 → handler が
  retroService.runForSprint を呼ぶ。完了 Sprint はその場で enqueue、cron は workspace ごと
  最新 sprint を見る)
- **5.2 OKR**: `goals` + `key_results` + `item.goal_id` + 進捗 %
- **5.4 PDCA dashboard**: Plan/Do/Check/Act を status type にマップ + cycle time

**推奨順 (残り)**: 5.3 自動化 → 5.2 (OKR) → 5.4 (PDCA)。

### C. 積み残し (優先度低 / POST_MVP 候補)

- Anthropic streaming + Supabase Realtime push UI
- TZ 別 cron + `cron-parser` (現状 UTC 09:00 固定)
- `workspace_announcements` テーブル (PM 出力ストリーム分離)
- `agent_prompts` テーブルから system prompt 動的読込
- E2E の AI パス (real Anthropic or MSW + invokeModel DI)
- PWA / Service Worker / Email 通知 / Push 通知

## 4. 動作確認コマンド

```bash
# Supabase 起動確認 (止まっていれば pnpm db:start)
pnpm exec supabase status

# DB 再構築 (schema 変更後)
pnpm db:reset

# 検証 (commit 前に必ず通す)
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e                                   # 並列、reuse 既存 dev server

# E2E が flaky な時 (port 3001 占有 → 古い next-server を kill):
#   lsof -i :3001 → kill <pid>

# PoC 系 (実 Auth + RLS を通す)
pnpm tsx --env-file=.env.local scripts/poc-auth-workspace.ts
pnpm tsx --env-file=.env.local scripts/poc-item.ts
pnpm tsx --env-file=.env.local scripts/poc-doc-comment.ts
NODE_OPTIONS="--conditions=react-server" \
  pnpm tsx --env-file=.env.local scripts/poc-ltree.ts

# UI smoke
pnpm dev                                        # http://localhost:3001
```

## 5. 非自明な落とし穴 (規約)

### 5.1 RLS SELECT policy に `deleted_at IS NULL` を入れない (MUST)

Postgres は UPDATE 時に新行が SELECT.using を満たすか暗黙チェックするため、
soft delete (`UPDATE ... SET deleted_at = NOW()`) で必ず弾かれる。
SELECT policy は `is_workspace_member` のみ、フィルタは Repository クエリで強制。
既存 migration: `20260424120000_rls_remove_deleted_at_from_select.sql`

### 5.2 Drizzle Kit 生成時の auth schema 削除

`_shared.ts` の `pgSchema('auth') / authUsers` 宣言で、`pnpm db:generate` 出力に
`CREATE SCHEMA "auth"` と `CREATE TABLE "auth"."users"` が毎回入る。
**生成直後に手で削除**。`pnpm db:reset` でエラーなら原因はこれ。

### 5.3 dotenv の env 読み込み

`pnpm tsx scripts/X.ts` だけでは `.env.local` を読まない →
**`pnpm tsx --env-file=.env.local scripts/X.ts`** を使う。

### 5.4 ポート 3000 占有 / 3001 ゾンビ

別 docker が 3000 を使うので `pnpm dev` は **port 3001**。
E2E 失敗時、古い `next-server` プロセスが 3001 を握っていることがある →
`lsof -i :3001` で pid を確認して kill。

### 5.5 マイグレーションの順序

手書き SQL は `0XXX_*.sql` 命名で Drizzle 生成より前に実行。
ただし RLS 等のテーブル前提なら、Drizzle 生成より **後** にする必要 →
タイムスタンプを大きく (例: `20260424000000_rls_policies.sql`)。

### 5.6 PG15 LTREE `subpath` の罠

`subpath(parent_path, nlevel(oldFull))` は offset == nlevel で空 ltree を返すべきだが
PG15 は "invalid positions" エラーを投げる。`moveSubtree` の一括 UPDATE で
target / 直接の子 / 孫以降 の **3 分岐 CASE** で回避済 (`src/lib/db/ltree.ts`)。

### 5.7 `server-only` と tsx スクリプト

server-only ファイルを tsx から load すると `server-only` が throw する。
**`NODE_OPTIONS="--conditions=react-server" pnpm tsx ...`** を使う。
Pure 計算は別ファイル (例: `ltree-path.ts`) に分離してテスト可能に。

### 5.8 shadcn add の副作用

`pnpm dlx shadcn@latest add command` は `button.tsx` / `input.tsx` を再生成
(quote スタイル差分のみ、機能同一)。競合したら `--overwrite` で OK、prettier が後で整形。

### 5.9 agent_invocations の UPDATE は adminDb 経由

`agent_invocations` は **INSERT だけ** authenticated policy が付いていて、
UPDATE policy は無い (= worker / service_role 専用)。
`agentService.runInvocation` は `adminDb.transaction(...)` を使う
(CLAUDE.md の "Repository は scoped Drizzle" 例外扱い)。
`ensureAgent` も同じ理由で adminDb。

### 5.10 Anthropic SDK mock 位置

単体 test は `vi.mock('@/lib/ai/invoke', () => ({ invokeModel: vi.fn() }))`。
実 API 検証は `scripts/poc-agent.ts` に寄せる (`ANTHROPIC_API_KEY` 設定時のみ)。

### 5.11 pg-boss queue 名 / 型 / option

- queue 名は英数 + `_-./` だけ (コロン不可)。`agent:run` は ERR_ASSERTION で死ぬ
- `import { PgBoss } from 'pg-boss'` (default export 無し)
- `stop()` は graceful + timeout(ms)、`wait` option は v10 の名残で消えた
- `enqueueJob(name, data, { singletonKey, startAfter })` で重複抑制 (Phase 3 で拡張)

### 5.12 multilingual-e5-small の prefix 規約

- Document/passage は `"passage: "` 前置 (encodeTexts で自動)
- Query は `"query: "` 前置 (encodeQuery で自動)
- 省略すると similarity が大きく劣化する

### 5.13 chunk overlap 制約

`chunkText` の `overlap` は `[0, maxChars)` 範囲必須 (無限ループ防止)。
短いテストで `maxChars=10` を渡すなら `overlap=2` 等を一緒に明示。

### 5.14 embedding model の初回ダウンロード

`@huggingface/transformers` は初回 ~120MB を `~/.cache/huggingface/` に DL。
Docker は volume で永続化。Vitest は `vi.mock('@/lib/ai/embedding')` か
`embedDoc` の `encoder` DI を使う。

### 5.16 E2E 並列で QuickAdd 連続 fill が flaky (dev mode 限定)

`bulk-action-bar.spec.ts` / `backlog-dnd.spec.ts` の "QuickAdd を for loop で 3 回連続 fill+click"
パターンが、parallel mode (`workers=undefined`) の dev server で 2 回目以降の `fill` が React
state に反映されず submit ボタンが disabled のまま timeout する。**単体実行 (workers=1) では PASS**。
原因は dev mode の Server Action 競合と推測 (Phase 4 で Bell の SSR 1 query 増加が trigger)。
**ハイブリッド方針** (golden-path / smoke は keep / 機能確認は Playwright MCP) に従い、
2 spec を `test.skip` で保留中。直す時は workers=1 / build prod / Playwright trace の 3 軸で。

### 5.17 通知バッジは SSR + Realtime のみ (常時 polling しない)

`useUnreadNotificationCount` を always-on の TanStack Query で叩くと、Server Action の
暗黙 `router.refresh` が QuickAdd 連続入力を不安定化させた (§5.16 の元凶)。修正:
**SSR で初期 count を取得 → `initialData` + `staleTime: Infinity` + `refetchOnMount: false`** にして
client mount 時の Server Action 呼び出しをゼロにし、以後は Realtime 経由でのみ refetch。
他 feature でも "ヘッダ常駐 widget" には同パターン (SSR + Realtime) を推奨。

### 5.20 Dashboard view に重い client component を embed しない

Phase 5.4 で `PdcaPanel` を Dashboard view (items-board の DashboardView) に embed したら、
`pdcaSummaryAction` Server Action と recharts の dev compile が同時発火して、
**golden-path E2E が timeout** で死ぬようになった (Templates 遷移が hang)。原因は §5.17 と
同根: Dashboard 切替直後の navigation を Server Action / 重い compile が block する。

対策: 大型 panel は **専用ページに分離** する (今回は `/[wsId]/pdca` に独立)。
Dashboard view は MUST / WIP / Burndown / コスト など軽量サマリだけに留める。
**recharts の追加 chart も同じ理由で dev では navigation を遅延させる** (Phase 5.4 では
sparkline を pure CSS 棒で実装して回避)。

### 5.19 Drizzle/postgres-js: 制約違反は withUserDb の外側で catch する

postgres-js の transaction 内で起きた制約違反 (UniqueViolation 等) は、`tx` の inner
callback から throw される際に Drizzle が wrap → withUserDb の `db.transaction` の
返り Promise の reject として伝搬する。inner try/catch では捕まえられず、**外側 await
ポイントの try/catch が必要**。Phase 5.1 の `sprintService.changeStatus` で発覚:

```ts
// NG: inner try/catch では postgres エラーを取り逃す
return await withUserDb(user.id, async (tx) => {
  try { await repo.update(tx, ...) } catch (e) { /* ここに来ない */ }
})

// OK: withUserDb の外で catch
try {
  return await withUserDb(user.id, async (tx) => {
    return ok(await repo.update(tx, ...))
  })
} catch (e) {
  if (isUniqueViolation(e)) return err(new ValidationError(...))
  throw e
}
```

`isUniqueViolation` は `e.code === '23505'` だけでなく `e.cause` 再帰 +
`e.message` の constraint 名 fallback も見ること (Drizzle wrap 形式が複数ある)。

### 5.18 Supabase Realtime は subscribe 前に `setAuth` 必要

`postgres_changes` イベントは Supabase 側で RLS を評価してから配信される。subscribe 時に
JWT が realtime client に渡っていないと、ステータスは SUBSCRIBED でも event が drop される
(Phase 4 notification 検証で発覚)。`useEffect` 内で `supabase.auth.getSession()` →
`supabase.realtime.setAuth(token)` → `channel.subscribe()` の順を必ず守る。
既存 `item/realtime.ts` も同 pattern に修正済 (Phase 4 commit で同梱)。

### 5.15 pg_trgm 閾値

`pg_trgm.word_similarity_threshold` の既定は 0.6 で短いクエリに厳しすぎる。
`fullTextHits` は WHERE 内で `word_similarity(q, content) > 0.2` を直接指定。
GIN index は閾値依存なのでフル活用はできないが MVP 規模では問題なし。
ARCHITECTURE.md #U の pg_bigm は Supabase local に無く pg_trgm で代替。

## 6. Service 層を書くときの抽象

```ts
// 認証
const user = await requireUser()                                     // AuthError throw
const { user, role } = await requireWorkspaceMember(wsId, 'member')  // PermissionError throw

// DB アクセス (RLS 効かせる)
const result = await withUserDb(userId, async (tx) => {
  const item = await itemRepository.insert(tx, values)               // Repository は tx を受ける
  await recordAudit(tx, { workspaceId, actorType: 'user', actorId, ... })
  return ok(item)
})

// エラー
return err(new ValidationError('...'))     // 400 系
return err(new ConflictError())            // 楽観ロック衝突
return err(new NotFoundError('...'))
throw new AuthError()                      // ガード違反
```

## 7. 受け入れ検証 (自動化済)

`scripts/verify-acceptance.ts` 1 本で 8 項目を並列検証:

```bash
NODE_OPTIONS="--conditions=react-server" \
  pnpm tsx --env-file=.env.local scripts/verify-acceptance.ts
```

カバー: Template 自動投入 / MUST Heartbeat 冪等 (7d/3d/1d) /
AI 分解 (Researcher → 子 Item) / AI 調査 (Researcher → Doc) / PM Stand-up /
agent_invocations の cost/tokens/audit / Dashboard 月次コスト集計 /
越境 RLS (`src/test/rls-cross-workspace.test.ts` 6 ケース)。

Phase 3 で **`overdue` stage が追加** されたが verify-acceptance には
未投入 (検証は heartbeat overdue test と pm-recovery worker ログで担保)。

### 失敗時の挙動 (本番相当)

- Anthropic エラーで `agent_invocations.status=failed` + `error_message` 記録、UI は toast.error
- 期限超過 MUST は `overdue` stage で Heartbeat 通知 + pm-recovery enqueue
  (Phase 3 で追加。worker 起動中 + ANTHROPIC_API_KEY ありで Recovery Plan Doc が生成される)

## 8. その他

- 自動メモリ (`~/.claude/projects/.../memory/MEMORY.md`) は自動でロードされる
- 詳細プラン: `~/.claude/plans/todoist-ticktick-todo-ui-ux-sleepy-hamster.md`
- やらないリスト: `POST_MVP.md`
- ローカル `.env.local` は git ignored (Supabase ローカル keys 入り)

完。
