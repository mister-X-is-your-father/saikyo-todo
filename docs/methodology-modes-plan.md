# TaskChute / GTD Methodology Modes — 実装プラン

> 出典: FEEDBACK_QUEUE.md 「2026-04-30 — TaskChute モード / GTD モード 実装プラン作成」 (P0、優先度 1)
>
> 関連: `docs/ux-excellence-charter.md` (6 軸、軸 5「やる気アップ」と軸 6「効率化」が methodology mode の本丸)
> 関連: `memory:project_saikyo_todo_philosophy.md` 「目標・思考力・段取り力を鍛える道具」

ユーザ要望: 「タスクシュートがしやすいモードとか、GTD がしやすいモードとか」。saikyo-todo は既にこの 2 つの methodology に必要な基盤の 80% を持っている。本 plan はそれを **mode** として束ね、欠けている 20% を段階実装で埋めるための road-map。**plan のみ、実装はしない**。各 phase は別 P0 として queue に投入し別 iter で消化。

---

## 1. TaskChute mode の中核 7 concept (深掘り)

| #   | concept                                 | 1 行説明                                                        | 既存資産との距離                                                                                                                 |
| --- | --------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| T-1 | **1 列 linear timeline**                | 今日やる task を 「今日 1 列」 に時刻昇順で並べ、すべて目に入る | Today view = グルーピング表示、1 列 timeline は 0% (新規)                                                                        |
| T-2 | **start_at / end_at の打刻**            | 各 task に開始/終了 timestamp を残し、クリックで now() を打刻   | `time_entries` で記録されているが、item.start_at は未持ち                                                                        |
| T-3 | **見積 (E) vs 実績 (A) inline 表示**    | 各行の右に `45m / 38m` のように 見積 vs 実績 を並列表示         | `estimate.ts` + `time-entry/bias-brief.ts` で素材揃い、UI 配線のみ                                                               |
| T-4 | **累積残時間 ticker**                   | 「残 5h12m / 終了予測 18:42」 を上部 sticky                     | `time-entry/daily-summary.ts` 流用、UI 新規                                                                                      |
| T-5 | **ルーティン (recurring) auto-enqueue** | 毎日朝の routine を 朝 起動時に自動投入                         | `templates.kind='recurring'` + `schedule_cron` + pg_cron で **既に動く**、UI 露出が薄いだけ                                      |
| T-6 | **見積精度学習 toast**                  | task 完了で 見積 vs 実績 variance を toast (under/on/over)      | `time-entry/bias-calibration.ts` + iter254 variance toast で **既に動く**                                                        |
| T-7 | **割込み (interrupt) の記録**           | 計画外 task は 別色で記録、後で見直す                           | Calendar の `item_schedules.kind='actual'` + `itemId=null` で **割込みは既に表現可能**、TaskChute view では 1 列 inline 化が必要 |

要するに **T-1 (1 列 timeline) と T-4 (累積 ticker) と T-5 の "UI 露出" だけが新規**。残りは既存の縫い直しで実現する。

---

## 2. GTD mode の中核 7 concept (深掘り)

| #   | concept                                                                           | 1 行説明                                      | 既存資産との距離                                                            |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| G-1 | **5 step flow (Inbox→Process→Organize→Review→Engage)**                            | Inbox に放り込み、後で分類して実行する習慣化  | Inbox view 部分実装、Process 強化 (1 click 分類 / 2-min rule prompt) が新規 |
| G-2 | **List 5 種** (Next Actions / Projects / Waiting For / Someday-Maybe / Reference) | task の「次の状態」 axis                      | 既存 `workspace_statuses` で表現可能 (status 5 個 preset 追加)              |
| G-3 | **Context tag** (@home / @office / @phone / @errands)                             | 場所/環境別に絞り込んで実行                   | 既存 `tags` table に prefix `@` 慣習を入れる + tag-picker 拡張で対応可能    |
| G-4 | **Project = parent item with subtasks**                                           | 「>1 step が必要な outcome」 を 1 task で表現 | `parent_path` (LTREE) で **既に表現可能**、UI ラベルだけ変える              |
| G-5 | **Weekly Review** リマインダー + checklist                                        | 毎週末に項目総点検                            | `pg_cron` + notification + 1 view で実現 (新規)                             |
| G-6 | **2-min rule UI hint**                                                            | 入力時に「2 分で済むなら今やる?」 prompt      | quick-add に hint 1 行 (新規)                                               |
| G-7 | **Inbox zero に届ける UX**                                                        | Inbox 0 件で celebration                      | `time-entry/daily-streak.ts` パターン流用、Inbox 専用 streak (新規)         |

GTD は **既存 Inbox + tags + parent/subtask の "再ラベル" + 1 つの Weekly Review 機構** で 70% カバー、残 30% が UI 上の hint や祝祭。

---

## 3. 既存資産 ↔ methodology concept マッピング表

| TaskChute                | 既存 file / table                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| T-1 1 列 timeline        | (新規) `src/components/workspace/taskchute-view.tsx` を Today view と並列で plugin 登録 (`plugins/core/views/taskchute.tsx`)         |
| T-2 start/end 打刻       | `src/components/workspace/start-timer-button.tsx` + `active-timer-panel.tsx` (Stop で `time_entries.duration_minutes` 確定)          |
| T-3 見積 vs 実績         | `src/features/item/estimate.ts` (`extractEstimateMinutes`) + `src/features/time-entry/item-time-summary.ts`                          |
| T-4 累積残時間           | `src/features/time-entry/daily-summary.ts` + 新規 pure helper `taskchute/cumulative-remaining.ts`                                    |
| T-5 routine auto-enqueue | `src/lib/db/schema/template.ts` (kind='recurring' + schedule_cron) + 既存 pg_cron worker                                             |
| T-6 variance toast       | `src/features/time-entry/bias-calibration.ts` + `formatVariance` (active-timer-panel 内)                                             |
| T-7 割込み               | Calendar `item_schedules.kind='actual'` + `itemId=null` (既存)、TaskChute view では「割込みとして記録」 button を 1 列 inline で出す |

| GTD               | 既存 file / table                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| G-1 5 step        | `src/components/workspace/inbox-view.tsx` (Process button 強化、3 step 分類 UI を追加)                 |
| G-2 List 5 種     | `src/lib/db/schema/workspace.ts` (`workspace_statuses` に GTD preset を 1 click で導入する API)        |
| G-3 Context tag   | `src/components/workspace/tag-picker.tsx` + 既存 `tags` table、prefix `@` 慣習で type='context' を区別 |
| G-4 Project       | `src/lib/db/schema/item.ts` (`parent_path` LTREE 既存)、UI で「Project」ラベル切替                     |
| G-5 Weekly Review | `src/features/notification/*` + 新規 notification type='weekly_review' + 新規 `WeeklyReviewView`       |
| G-6 2-min rule    | `src/components/quick-add/*` に 1 hint 行 (estimate=2 検出で「今やる?」 button)                        |
| G-7 Inbox zero    | `src/features/time-entry/daily-streak.ts` パターンを `inbox-zero-streak.ts` に複製                     |

---

## 4. Gap 分析 (新規必要 feature)

新規実装が必要な要素を並べる。各 1-2 commit で消化可能なサイズに切る:

1. **TaskChute view skeleton** (T-1) — 既存 Today を `?mode=taskchute` query で 1 列 timeline に切替 (新規 view component、~200 行)
2. **start_at 列 + 打刻 service** (T-2) — `items.started_at` `items.completed_at` を新規列 (現状は `done_at` のみ)、quick 打刻 button → service `markItemStarted/markItemCompleted`
3. **見積 vs 実績 inline display** (T-3) — TaskChute view 行 right column に `45m / 38m` chip (既存 helper 結線、~50 行)
4. **累積残 ticker** (T-4) — 上部 sticky で 「残 5h12m / 終了予測 18:42」、pure helper + 1 component
5. **routine auto-enqueue UI 露出** (T-5) — 既存 templates kind='recurring' を「ルーティン」 tab で見せる (~80 行)
6. **GTD list preset** (G-2) — workspace settings に「GTD preset を導入」 button (workspace_statuses に 5 個 insert)、1 click
7. **Context tag** (G-3) — tags table に `tag_kind text default 'normal'` 列、`@` prefix tag は kind='context' でフィルタ可能
8. **Weekly Review reminder + view** (G-5) — pg_cron 毎日曜 9:00 で notification、`/workspace/<ws>/weekly-review` page で 5 step checklist
9. **2-min rule hint** (G-6) — quick-add に 1 行 hint (estimate ≤ 2 で「今やる?」 button)
10. **Inbox zero streak** (G-7) — `inbox-zero-streak.ts` pure (累計連続日数)、Dashboard chip
11. **mode switch UX** — workspace settings に default mode (none/taskchute/gtd)、view-switcher にも tab 追加

---

## 5. 段階実装 phase (= P0 candidate、各 1 commit 30-150 行)

### TaskChute Phase (4 P0)

- **TC-1** TaskChute view skeleton (1 列 timeline) — Today view を `?mode=taskchute` で切替、行は時刻昇順、空は「ここに routine を投入」 placeholder。既存 today-view を fork、view plugin として登録
- **TC-2** start/end 打刻 — `items.started_at` `items.completed_at` を migration 追加、`markItemStarted` `markItemCompleted` service + audit + 楽観ロック、TaskChute view 各行の▶/■ button (start-timer-button 流用)
- **TC-3** 見積 vs 実績 inline + 累積 ticker — 各行 right column chip + 上部 sticky bar (`taskchute/cumulative-remaining.ts` pure helper、終了予測時刻 + 残時間)
- **TC-4** routine 露出 — workspace 設定に「ルーティン」 tab、kind='recurring' templates 一覧 + 「朝起動」 button (= 当日分 instantiate)

### GTD Phase (4 P0)

- **GT-1** GTD preset 導入 + Project ラベル — workspace settings 「GTD preset を導入」 button (workspace_statuses 5 個 insert: Next/Project/Waiting/Someday/Reference)、parent item に「Project」 badge
- **GT-2** Context tag — tags table に `tag_kind` 列、`@` prefix UI 慣習 (placeholder で hint)、tag-picker で「context だけ」フィルタ
- **GT-3** 2-min rule + Inbox 強化 — quick-add に hint 行、Inbox view に「Process」 button (1 click で status / context tag を選ばせる)
- **GT-4** Weekly Review — pg_cron 毎日曜 9:00 notification + `/weekly-review` page (5 step checklist + 各 list 件数)

### 共通 (1 P0)

- **MS-1** Mode switch UX — workspace_settings に `default_mode text not null default 'none' check (...)` 列、view-switcher に「mode」 dropdown (none / taskchute / gtd)、URL には `?mode=` query で override 可能、none 時は今まで通り (= 既存 user 影響 0)

合計 **9 P0 candidate** = 9 iter で完結。各 30-150 行、楽観 update + 既存 helper 流用で軽量。

---

## 6. Mode switch UX (詳細)

### 提案する UX

- **default**: workspace_settings.default_mode (`'none' | 'taskchute' | 'gtd'`)、none = 今まで通り
- **per-session override**: URL `?mode=taskchute` で 1 セッションだけ切替 (URL 共有も可能)
- **view 切替**: 既存 view-switcher の隣に小さな「mode: TC」 chip、click で dropdown
- **mode 別の表示変化**:
  - `taskchute`: Today view が **1 列 timeline** (TC view) に切替、quick-add は「今ここから start」 (2-min rule 出ない)
  - `gtd`: Inbox view が **5 step Process flow** 入り、quick-add に 2-min rule hint、tags は `@context` フィルタ default on
  - `none`: 既存 (Today グルーピング + Backlog + Kanban + …)

### 既存 user 影響

- **default = 'none'** にすることで既存 user は何も気づかない (opt-in)
- mode を試してみたい user は workspace 設定 1 click で切替、戻すのも 1 click
- mode 別の URL は別 view plugin として登録するので、既存 view (Today / Kanban / Gantt) はそのまま並走

---

## 7. 6 軸スコア (期待)

| mode      | 可視化                          | 操作                | 認知低減                           | 漏れ防止                           | やる気                                        | 効率化                              | 設計哲学 直結    |
| --------- | ------------------------------- | ------------------- | ---------------------------------- | ---------------------------------- | --------------------------------------------- | ----------------------------------- | ---------------- |
| TaskChute | **5** (1 列 + 累積 + 見積/実績) | 4 (▶/■ click)       | 3 (見える情報多め、慣れが要る)     | 4 (累積で「終わらない」が即見える) | **5** (打刻達成感 + variance toast + routine) | 4                                   | **段取り力 ★★★** |
| GTD       | 4                               | 4 (Process 1 click) | **5** (Inbox zero、混乱を吐き出す) | 4 (Weekly Review が網)             | 4 (Inbox zero streak)                         | **5** (2-min rule + context filter) | **思考力 ★★★**   |

**両 mode とも「目標・思考力・段取り力を鍛える道具」哲学に直結**。憲章 (iter515) の 6 軸で平均 4 以上、最高軸は 5。

---

## 8. 既存資産の活用率

- **TaskChute**: 既存資産 80% (estimate / time-entry / templates kind='recurring' / start-timer-button が揃ってる)、新規 20% (1 列 view + 累積 ticker + start/completed 列)
- **GTD**: 既存資産 70% (Inbox / tags / parent_path / notification がある)、新規 30% (preset / context kind / Weekly Review / 2-min hint)

→ **両 mode とも 4 P0 ずつで scope A 完了** が現実的。実装期間は 1-2 週間、各 iter 30-150 行、main 級 quality を保ちつつ進められる。

---

## 9. 派生 P0 entry (queue 投入予定)

下記 9 件を本 plan 完成と同 iter で `FEEDBACK_QUEUE.md` 末尾に追加投入する。各 entry は 6 軸スコア + 既存資産参照 + 期待 commit message を併記。

1. **TC-1 TaskChute view skeleton** (1 列 linear timeline)
2. **TC-2 items.started_at / completed_at + 打刻 service**
3. **TC-3 見積 vs 実績 inline + 累積残 ticker**
4. **TC-4 routine 露出 (recurring templates UI)**
5. **GT-1 GTD preset 導入 + Project ラベル**
6. **GT-2 Context tag (tag_kind)**
7. **GT-3 2-min rule + Inbox Process 強化**
8. **GT-4 Weekly Review (cron + checklist view)**
9. **MS-1 Mode switch UX (workspace_settings.default_mode + URL override)**

---

## 10. 確認事項 (実装前にユーザに聞きたいこと、仮置きあり)

- (a) **mode 切替の粒度** — workspace 単位 / user 単位 / per-view どれ? → **仮: workspace 単位 (default_mode) + URL override**
- (b) **GTD の "List 5 種" を workspace_statuses で表現する** で OK? もしくは別 axis (`gtd_list` 列を items に追加) にする? → **仮: workspace_statuses preset (柔軟、既存 RLS / Kanban が再利用)**
- (c) **Weekly Review の通知時刻** — 毎日曜 9:00 固定? workspace ごとに変えられる? → **仮: 9:00 固定 (workspace_settings.standup_cron と同じパターンで後日 customizable)**
- (d) **TaskChute の "今日終わるか" 予測** — 累積残 ≤ 残業時間 まで で判定? あくまで参考? → **仮: 18:00 を default 終了時刻にし、それ越えなら orange、deeply 越えなら red の 3 段階表示**
- (e) **2-min rule の "今やる?" button** — click で何が起きる? task を done にする? それとも timer 即 start? → **仮: timer 2 分セットで start (Pomodoro mini)、終わったら自動 stop + done 提案 toast**

---

## 11. 完了条件

本 plan を承認してから以下が満たされたら methodology mode 機能は MVP 完了:

1. workspace_settings に default_mode 列が存在し、UI で切替可能 (MS-1)
2. TaskChute mode で 1 列 timeline view が動き、start/stop で打刻され、見積 vs 実績が inline 表示される (TC-1〜TC-3)
3. GTD mode で Inbox から 1 click で Process でき、Weekly Review が日曜に届く (GT-1〜GT-4)
4. routine が朝自動投入される (TC-4)
5. 既存 user は何も変わらない (default='none')

---

## 12. 関連 file (cloud agent 実装時の起点)

- `src/components/workspace/today-view.tsx` (TaskChute timeline base)
- `src/components/workspace/inbox-view.tsx` (GTD Inbox base)
- `src/features/item/estimate.ts` (見積 parse)
- `src/features/time-entry/bias-calibration.ts` (variance 計算)
- `src/features/time-entry/daily-summary.ts` (累積)
- `src/features/time-entry/daily-streak.ts` (streak pattern)
- `src/components/workspace/start-timer-button.tsx` + `active-timer-panel.tsx` (start/stop)
- `src/components/workspace/tag-picker.tsx` (context tag)
- `src/lib/db/schema/template.ts` (kind='recurring' + schedule_cron)
- `src/lib/db/schema/workspace.ts` (workspace_settings 拡張)
- `src/features/notification/*` (Weekly Review)
- `src/plugins/core/views/today.tsx` (view plugin 登録パターン)
- `docs/ux-excellence-charter.md` (6 軸採点で plan を裁定)
