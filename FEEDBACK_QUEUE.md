# FEEDBACK_QUEUE.md — ユーザ指摘・要望の処理キュー

autonomous loop 中に届いたユーザの指摘・要望・質問・思いつきを、その場で
iter を中断せずキューイングして、後続 iter で 1 件ずつ消化するための共有ノート。

**運用:**

- ユーザコメントが来たら、本ファイル末尾に新規 entry を追記 (日時 + 原文 + 分類 +
  仮の対応方針)
- 現在の iter は中断せず最後まで完了
- 次 loop iter の「ギャップ選択」 phase で本ファイルの未処理項目を最優先で消化
- 消化したら `[x]` でチェック、commit メッセージに `(queue: <短い summary>)` を含める

---

## 未処理 (新しい順)

### 2026-04-30 — Calendar 機能完成、追加 5 規望を P0 投入 (Calendar conv 由来)

- [x] **二車線 Calendar view (想定 vs 実測 timeline)** — 完了 (commit 8624154)
  - item_schedules table 新設 / features/schedule layer / 27 test pass / Realtime + 楽観ロック
  - `src/components/schedule/`, `src/features/schedule/`, plugin 登録、active-timer と接続

以下 5 件は同 conversation で連続して来た規望を分類して P0 化したもの。
**設計哲学** (memory `project_saikyo_todo_philosophy.md` 反映): 「目標達成・思考力・段取り力を鍛える道具」。各 P0 はこの軸 + 6 軸 (UX 卓越憲章) で評価。

---

### 2026-04-30 — タスク metadata 拡張 (input/output/goal/関係者/レビュー/添付) ★ P0 ★

- [ ] **各 task に input / output / goal / 関係者 (stakeholders) / 添付 (URL or file) / レビュー依頼 を設定でき、output↔input マッチで依存関係を自動推論し、関係者には Web UI 通知が届く** — 分類: 機能拡張 (P0)
  - 原文 (2026-04-30 conversation):
    - 「タスクにインプットとアウトプットを設定できる機能つけたい。それで依存関係もわかるし!!」
    - 「インプットとアウトプットは各タスクごとに設定できるように!」
    - 「タスクのゴールもね。」
    - 「関係者とかも。」
    - 「関係者にwebui上で通知行くねん」
    - 「メールのccみたいなもんや」
    - 「成果物のurlやファイルを添付や記入出来るのも頼む。」
    - 「あとレビュー依頼できる機能もね。」
  - **意図 (思考力・段取り力)**: タスクを作る時に「何が要るか / 何を出すか / 何のためか」を強制的に言語化させる。output↔input が一致したら自動で依存推論 → 段取り思考が育つ。
  - **schema 追加**:
    1. `items.goal text` 列 (達成目的、dod=完了基準とは別軸。例: goal="チームに浸透させる", dod="議事録に承認サインが入る")
    2. `item_io_artifacts (id, item_id, kind 'input'|'output', label, url, file_path, mime, created_by, created_at)` 中間テーブル
    3. `item_stakeholders (item_id, user_id, added_at)` 中間テーブル (assignees とは別軸、CC 的)
    4. `item_review_requests (id, item_id, requested_by, requested_at, status 'pending'|'approved'|'changes_requested', resolved_at, resolved_by)` テーブル
  - **service 層**:
    - `setItemIoArtifacts / setItemStakeholders / requestReview / resolveReview` を items service に追加
    - **依存推論**: pure helper `inferDependenciesFromIO(items, ioArtifacts)` で output.label が他 item の input.label と一致すれば `item_dependencies` に `blocks` を suggest (自動挿入は別 confirm UI、最初は提案のみ)
    - 関係者追加 / review request 時に **既存 notifications テーブル経由で in-app 通知** 発火 (受信者は stakeholder / requester)
  - **UI 拡張**:
    - ItemEditDialog (`src/components/workspace/item-edit-dialog.tsx`) に新タブ「I/O & ゴール」追加
    - goal 入力 (textarea) / inputs リスト / outputs リスト / 関係者 picker / レビュー依頼 button + 履歴
    - 添付: URL は text input、file は Supabase Storage upload (新規 bucket `item-artifacts`)
  - **段階実装 (commit を分ける)**:
    1. schema + migration + repo (1 commit)
    2. service + zod + test (1 commit)
    3. UI タブ (1 commit)
    4. 依存推論 helper + 提案 UI (1 commit)
    5. 関係者通知 + レビュー依頼 UI (1 commit)
    6. file upload (Supabase Storage) (1 commit、後続 iter でも OK)
  - **6 軸スコア (期待)**: 可視化 4 / 操作 3 / 認知負荷低減 4 / 作業漏れ防止 5 / やる気 3 / 効率化 4

---

### 2026-04-30 — 全員 broadcast 依頼 (この設定各 PC でやっといて 風) ★ P0 ★

- [ ] **チーム全員に同じ task を一斉配布、各人がチェックリスト的に消化、進捗を集約 view で見られる** — 分類: 機能拡張 (P0)
  - 原文 (2026-04-30): 「全員にタスク頼みたいとき (この設定各pcでやっといて) みたいなのとかも簡単にできるようにしたい!わかる?」
  - **意図 (作業漏れ防止 + 効率化)**: チーム運用で頻出する「全員これ確認して」「全員 PC でこの設定やって」を 1 click で全員に配布、誰がやった/やってないが一目で分かる。
  - **設計案 (要 plan で詳細化)**:
    - **方式 A**: 既存の item を **template 化** + workspace member 全員に template instantiate (1 task/member)。集約 view で member × 完了状態を見る
    - **方式 B**: 1 item に複数 assignee (既存 `item_assignees` で可能) + 「assignee ごとに done state」を持つ新 table `item_assignee_progress (item_id, actor_type, actor_id, done_at)`
    - 方式 B が schema 追加少ない、UI シンプル。**方式 B を採用**
  - **schema 追加**: `item_assignee_progress (item_id, actor_type, actor_id, done_at)` (PK = 3 列)
  - **UI**:
    - quick-add に「全員に頼む」option (作成と同時に全 member を assignee + progress 行 init)
    - item card / kanban tile に「3/5 完了」badge
    - 集約 view: 「broadcast 進捗」専用 tab (member × broadcast item の matrix、green/grey)
    - 各 member は自分の行で「自分の済」だけ check (他人のは disable)
  - **段階実装**:
    1. schema + repo (1 commit)
    2. quick-add に option + service (1 commit)
    3. progress badge + matrix view (1 commit)
  - **6 軸スコア**: 可視化 5 / 操作 4 / 認知負荷低減 3 / 作業漏れ防止 5 / やる気 3 / 効率化 5

---

### 2026-04-30 — Slack ワンポチでタスク化 ★ P0 ★

- [ ] **Slack message から 1 click で saikyo-todo task を作成、message link は description に自動引用** — 分類: 外部統合 (P0、Slack app 設定要)
  - 原文 (2026-04-30): 「Slackワンポチでタスク化できる機能も欲しい!!」
  - **意図 (効率化 + 作業漏れ防止)**: Slack でタスク化したいやり取りが流れる前に拾う。
  - **必要なもの**:
    1. Slack app 登録 (user 側で設定。app manifest を `docs/slack-app-manifest.yaml` に置く)
    2. OAuth flow (workspace ↔ Slack workspace の紐付け、tokens は `slack_workspace_tokens` table に AES 暗号化保存)
    3. Message Action (saikyo-todo にタスク化) ボタンを Slack 側に追加
    4. webhook 受信エンドポイント `/api/integrations/slack/actions` (signature 検証必須)
    5. Slack user → saikyo-todo user の対応表 (`slack_user_links`、初回は email match で auto link)
  - **schema 追加**:
    - `slack_workspace_tokens (workspace_id, slack_team_id, bot_token_enc, app_token_enc, installed_by, ...)`
    - `slack_user_links (workspace_id, user_id, slack_user_id, slack_team_id)`
  - **段階実装**:
    1. schema + repo + 暗号化 helper (1 commit)
    2. webhook endpoint + signature 検証 + Slash command (`/saikyo`) (1 commit)
    3. Message Action → item 作成 (1 commit)
    4. OAuth installer flow + workspace 設定 UI (1 commit)
  - **環境変数**: `SLACK_SIGNING_SECRET`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` (空なら全機能 disable)
  - **6 軸スコア**: 可視化 2 / 操作 5 / 認知負荷低減 3 / 作業漏れ防止 5 / やる気 2 / 効率化 5

---

### 2026-04-30 — 目標達成サポート + 繰り返しタスク ★ P0 ★

- [ ] **目標 (Goal) を起点に「そのために何をするか」を分解、繰り返しタスクで習慣化、達成度を可視化** — 分類: 機能拡張 (P0)
  - 原文 (2026-04-30):
    - 「目標達成もサポートできるようにしたいんだ。」
    - 「そのためには何をするのかだったり、繰り返しタスクだったりとかもやれるようにしたいし。」
  - **意図 (思考力・段取り力)**: 目標 (週次/月次) → 「そのために何をするか」を AI 補助つきで分解 → 繰り返しタスクで習慣化 → 振り返りで段取り精度向上。設計哲学の本丸。
  - **既存資産との関係**:
    - `personal_period_goals (period day/week/month, period_key, text)` 既存 — UI 強化と AI 分解 hook 追加
    - `templates` 既存 — recurring template に拡張
  - **schema 追加**:
    1. `goal_action_items (goal_id, item_id, weight, created_at)` — goal と それを実現する item を紐付ける中間テーブル (1 goal : N item)
    2. `item_recurrences (item_id, rule_rrule, next_run_at, last_run_at, paused, ...)` — RFC 5545 RRULE で表現 (`FREQ=DAILY;BYHOUR=9` 等)
    3. worker: `pg-boss` の cron job で `next_run_at <= now()` の rule を回し、template から item 生成 → next_run_at を rrule で計算
  - **UI**:
    - goals-panel (既存) に「この目標を実現する task」セクション + 「AI に分解させる」 button
    - item edit dialog に「繰り返し」タブ (rrule builder UI、daily/weekdays/weekly/monthly)
    - dashboard に「目標達成度」chart (週/月で goal x action items の done 比率)
  - **AI 分解 prompt** (Researcher / PM agent の system prompt 拡張):
    - 入力: goal text + 関連既存 item
    - 出力: action item 候補 5-10 件 (title + estimate + 期日提案)
    - 既存 `decomposeItem` パターンと同じ proposal review flow を流用
  - **段階実装**:
    1. item_recurrences schema + worker (1 commit、cron 1 件)
    2. goal_action_items schema + UI 紐付け (1 commit)
    3. 繰り返しタブ UI (rrule builder) (1 commit)
    4. AI 分解 hook (proposal review 流用) (1 commit)
    5. dashboard chart (1 commit)
  - **6 軸スコア**: 可視化 5 / 操作 4 / 認知負荷低減 3 / 作業漏れ防止 5 / やる気 5 / 効率化 5

---

### 2026-04-30 — saikyo-todo UX 卓越憲章 + iter prompt 統合 ★ P0 メタ ★

- [ ] **UX 卓越の 6 軸を「saikyo-todo の存在目的」として憲章化 + autonomous prompt に評価軸として組込み + 各 view の gap 分析と改善 P0 派生** — 分類: 設計憲章 + プロセス改善 (P0 メタ)
  - 原文 (2026-04-30): 「圧倒的な可視化性能とグラフィカルで直観的な操作方法、認知不可の低減や作業漏れの防止、やる気アップ、効率化に優れたものにするように、タスクを作ってp0に積んどいて。そもそもそういうのを目指すようにプログラムしたいね。」
  - **意図**: 個別 feature を作る前に、saikyo-todo の **目指す方向そのもの** を 6 軸で言語化し、以後すべての iter が **6 軸スコアで評価** されるよう iter prompt / CLAUDE.md に組込む。憲章ができれば「これって saikyo-todo の方向性に合う?」が常に判定できる。

  - **6 軸 (ユーザ表現を尊重 + 1 件 typo 補正済み)**:
    1. **圧倒的な可視化性能** — 状態 / 量 / 関係 / 進捗 / 締切 が 「見て即わかる」。グラフ・色・icon・空間配置で情報密度を上げる
    2. **グラフィカルで直観的な操作方法** — DnD / inline edit / keyboard shortcut / hover で即操作。マウス・タッチ・キーボード で迷わない
    3. **認知負荷の低減** (原文「認知不可」を typo 解釈) — 1 画面に出す情報を整理、smart default、不要な選択肢を出さない、未読バッジで「見るべき場所」を絞る
    4. **作業漏れの防止** — MUST / 期限近接 / blocked 解消 / 依存先 done を能動的に通知。隠れない、忘れない、後回しにできない
    5. **やる気アップ** — 完了時の delight (animation / 音 / 累積カウンタ)、進捗バー、streak、見積達成 toast、視覚的「片付いた感」
    6. **効率化** — keyboard shortcut 網羅 / quick-add / bulk 操作 / template / AI 自動分解 / 賢い default で「クリック数を減らす」

  - **deliverables (cloud agent が plan で生成する成果物)**:
    1. `docs/ux-excellence-charter.md` (150-300 行、新規)
       - 6 軸の定義 + 良い例 / 悪い例 / 既存 feature の自己採点
       - 各 view (Today / Inbox / Kanban / Backlog / Gantt / Dashboard / ItemEditDialog 各タブ / Goals / Sprints) を 6 軸で **5 段階採点** したマップ
       - 既存 UX 卓越基準 a-g (発見可能性 / アクセシビリティ / 状態網羅 / 速度感 / 細部 / レスポンシブ / 一貫性) との関係を整理 (a-g は表面層、6 軸は深層目的)
    2. `scripts/autonomous/iter-instruction-autonomous.md` (or `LOOP.md`) に **6 軸チェック** を追加
       - 各 commit body に「6 軸該当部」を 1 行ずつ書く運用 (該当なしは "n/a")
       - a-g と 6 軸 を併記、a-g は手段、6 軸は目的、と区別
    3. `CLAUDE.md` の冒頭にも 6 軸を「プロジェクト目的」として明示 (新機能を足す前に必ず読む節として)
    4. `FEEDBACK_QUEUE.md` に **各 view × 軸 の改善 P0 entry を派生** 投入
       - 例: 「Today view の 圧倒的可視化 強化 (今日の合計時間 / 残時間 / 見積累積 / 進捗グラフ)」
       - 例: 「Kanban の やる気アップ — 完了時 confetti + 累積完了数表示」
       - 例: 「Backlog の 認知負荷低減 — column 毎の重要度フィルタ default をスマートに」

  - **plan のみ、実装はしない**:
    各派生 P0 は別 iter で消化する。憲章ができた直後の iter ですぐ消化開始 OK。

  - **期待 commit (1 commit でまとめる)**:
    `docs(ux): saikyo-todo UX 卓越憲章 + iter prompt 6 軸統合 (queue: ux-excellence charter)`
    - queue update commit (本 entry を [x] + 派生 P0 を投入)

  - **既存基準との関係**:
    - a-g は **手段層** (どう実装するか)、本 6 軸は **目的層** (何のために作るか)。両方を commit body に書く運用にする。
    - 既存 「もっとグラフィカル / 意味のあるデザイン」 entry (2026-04-28) は 軸 1, 2 と重なる。憲章で吸収 + 個別 P0 派生時に既存 entry も更新。

  - **重要 (cloud agent への注意)**:
    - 軸 3 「認知負荷の低減」 はユーザの「認知不可」を typo 解釈した。憲章で「認知負荷」と表記、原文「認知不可」も注釈で残す。
    - 6 軸は **互いに緊張関係** がある (例: 可視化 ↔ 認知負荷低減、やる気アップ ↔ 効率化)。憲章で trade-off を明示し、view ごとに優先軸を決める。
    - **数値採点** は今の自分の主観で OK、ただし採点の根拠 (具体的な体験例) を 1-2 行ずつ書く。

### 2026-04-30 — TaskChute モード / GTD モード 実装プラン作成 ★ P0 plan ★

- [ ] **TaskChute (タスクシュート) と GTD の methodology モードを実装する前段の「プラン作成」タスク** — 分類: 設計プラン (P0)
  - 原文 (2026-04-30): 「タスクシュートがしやすいモードとか、GTDがしやすいモードとか、そういうのも頼むよ。プラン作ってもいいけど。そういうプランを作るタスクをp0に入れようか。」
  - **目標**: TaskChute / GTD それぞれの中核 concept を saikyo-todo の既存 feature にマップし、段階実装 phase を切る詳細プランを作成する。プラン本体を `docs/methodology-modes-plan.md` に書き、queue に [x] チェックして次の P0 (= 各 phase の実装) に渡す。

  - **TaskChute mode の中核 (要 plan で詳細化)**:
    - 1 列の **時間軸 linear timeline** (Today view を時刻順に並べる、すべて 1 列)
    - 各 task に **開始時刻 + 所要時間 (実績)** を記録
    - **ルーティン** (毎日/毎週) を template 化、自動 enqueue
    - 終了時刻 = 次 task 開始時刻、累積で「今日終わるか」可視化
    - **見積 vs 実績** の精度 を学習する (既存 `estimate.ts` + `time_entries` + iter254 variance toast 流用)
    - 既存マッピング: Today view + start-timer-button + active-timer-panel + estimate.ts + time_entries + recurring task (要新規)
    - 参考 UI: TaskChute Cloud / TaskChute Cloud 2 (公式)

  - **GTD mode の中核 (要 plan で詳細化)**:
    - 5 step flow: Inbox → Process → Organize → Review → Engage
    - 主要 list: Next Actions / Projects / Waiting For / Someday-Maybe / Reference
    - **Context tag** (@home / @office / @phone / @errands)
    - **Weekly Review** がコア習慣 (リマインダー + checklist)
    - **2-min rule** (2 分以内ならすぐやる) の UI hint
    - Project = "outcome that needs >1 step" (= parent item with subtasks)
    - 既存マッピング: Inbox view + tag-picker (context tag) + parent/subtask 階層 + notification-bell (Weekly Review reminder)

  - **プラン成果物の期待 format**:
    - `docs/methodology-modes-plan.md` を新規作成 (200-400 行、commit 1 件)
    - 構成:
      1. 各 methodology の中核 5-7 concept (上記より深掘り)
      2. 既存 feature との **マッピング表** (TaskChute / GTD x 既存 file / hook / table)
      3. **gap 分析** (新規必要 feature: recurring task / context tag / weekly review reminder / 1 列 timeline view 等)
      4. **段階実装 phase** (各 4-8 件の P0 candidate)
         - phase 1: TaskChute view skeleton (1 列 timeline、既存 today に option 追加)
         - phase 2: 開始/終了 timestamp + 累積表示
         - phase 3: 見積 vs 実績 inline display
         - phase 4: recurring task (新規 schema + worker)
         - phase 5: GTD Inbox view 強化 (5 step flow)
         - phase 6: Context tag (既存 tag を拡張 or 専用)
         - phase 7: Weekly Review (notification + checklist)
      5. **mode switch UX** (workspace settings に「default mode」option、view-switcher に TaskChute/GTD tab 追加 vs 設定で切替 のどちらか)
      6. **既存 user の影響** (mode 未選択時は今まで通り、opt-in)

  - **期待 commit**:
    - `docs(methodology): TaskChute / GTD モード 実装プラン (queue: methodology-modes plan)`
    - 加えて FEEDBACK_QUEUE.md の本 entry を [x] + 実装 phase 別の新 P0 entry を queue に追加

  - **重要**: プランだけで実装はしない。実装は plan の各 phase が個別 P0 として queue に入ってから別 iter で消化する。

  - 関連既存 feature (cloud agent が plan で参照すべき file):
    - `src/components/workspace/today-view.tsx` (TaskChute timeline の base)
    - `src/components/workspace/inbox-view.tsx` (GTD Inbox の base)
    - `src/features/item/estimate.ts` + `src/features/time-entry/*` (見積 vs 実績)
    - `src/components/workspace/start-timer-button.tsx` + `active-timer-panel.tsx` (TaskChute の start/stop)
    - `src/components/workspace/tag-picker.tsx` (GTD context tag の base)
    - `src/features/notification/*` (Weekly Review reminder の base)
    - `src/lib/db/schema/item.ts` (recurring task 追加検討、別 table or item 拡張)

### 2026-04-30 — 並び替え 根本設計 他社比較 + 改善 ★ 新規 ★

- [ ] **並び替え (DnD reorder) を Notion / Linear / Asana / Trello / TickTick と比較し根本見直し** — 分類: 設計議論 → 段階実装
  - 原文: 「並び替えが思い通りの場所に行かない / 多分ほかのタスク管理ツールの実装とかと比べた方がいい。根本的になんかおかしい」
  - **現状の問題 (a93ef84 の表面 fix では足りない可能性)**:
    - position 重複検知 + bucket rebalance は実装済 (b3f75ba)
    - sort 関数の display ↔ drag handler の不一致は fix 済 (a93ef84)
    - しかしユーザは「**根本的になんかおかしい**」と感じている → アーキテクチャ自体を疑う
  - **業界標準パターン比較** (調査タスク):
    | tool | reorder model | 同期方式 | 楽観 update |
    |---|---|---|---|
    | **Notion** | block fractional position (LSEQ-like) | sync via Yjs CRDT | optimistic |
    | **Linear** | sortOrder (float64) + auto rebalance cron | event sourcing | optimistic, rollback on conflict |
    | **Asana** | parent + before/after pointer (linked list) | optimistic + retry | server resolves order |
    | **Trello** | float position + drift correction | optimistic | rebalance on collision |
    | **TickTick** | sortOrder (long) + manual rebalance | optimistic + ack | snap to integer grid |
    | **GitHub Projects v2** | sortOrder (positionalDouble) | optimistic + auto rebalance | hidden conflict |
  - **saikyo-todo 現状**:
    - `fractional-indexing` lib (LSEQ-like) で base62 string position
    - 同期は TanStack Query invalidate (poll-based、 Realtime 未配線)
    - 楽観 update は `useOptimisticUpdate` 一部のみ
    - rebalance は collision 検出時のみ (bucket 単位)
  - **比較で見える gap**:
    - (1) **楽観 update が DnD で完全じゃない**: drag → server commit → invalidate → re-render の遅延で 「動いた」感が薄い
    - (2) **conflict resolution が unclear**: 2 user が同時 reorder で どっちが勝つか UX 不明
    - (3) **rebalance trigger が collision 時のみ**: 普段は遅延で OK だが、頻繁な reorder で fractional string が長くなる (e.g. 'a0V' → 'a0Vk' → ...)、cleanup なし
    - (4) **Realtime を使ってない**: Notion/Linear のような「他人の reorder が即見える」が無い
  - 設計案 3 scope:
    - **A (即効、1-2 commit)**: drag end 時の **immediate optimistic UI update** を強化、TanStack Query setQueryData でキャッシュを先に書換、サーバ commit 待たずに新順で render。失敗時のみ rollback + toast。
    - **B (中期、3-5 commit)**: Realtime channel 経由で reorder event を broadcast、他 user に即反映。conflict は last-write-wins で server 側 audit に残す。
    - **C (大規模)**: CRDT (Yjs / Automerge) で完全 P2P 並列編集対応 (Notion 並)。POST_MVP 寄り。
  - **要追加質問**:
    - (a) 楽観 update の rollback 動作 — 「動いて戻る」 (= drag が見えない時間あり) か 「toast だけ」 (= drag は維持、エラー通知だけ)?
    - (b) Realtime presence (誰が今 reorder してるか avatar 表示) は 必要 / POST_MVP どっち?
    - (c) fractional-indexing の長さが 16 char 超えたら自動 rebalance cron 入れる?
    - (d) 並び替え race の last-write-wins か、merge resolution UI か?

### 2026-04-30 — モバイル / スマホ表示 全面改善 (潰れ / overflow / touch UX) ★ 新規 ★

- [ ] **スマホ表示が全体的に いけてない / 潰れる箇所がある を 全 view で 棚卸し + 段階修正** — 分類: UX (大、横断的)
  - 原文: 「スマホ表示が全体的にいけてない。潰れたりもするし」
  - 仮解釈:
    - 320-414px (iPhone SE / 13/15 系) で破綻している view を **片端から探索 → 修正**
    - iter104/107/109 で Kanban / Dialog の overflow / svh fix は実施済だが、それ以降に追加された
      view (Sprint / Goal / Workflow / Integration / TimeEntry / Subtasks panel / etc) は本格的な
      モバイル audit を経ていない可能性
  - **想定不具合 (チェックリスト)**:
    - layout 潰れ:
      - flex / grid が 320px で wrap せず横スクロール
      - text の `truncate` が効かず親 width を超えて押し出す
      - table が cell を `min-w-` で固定して横スクロール
      - dialog の max-w が画面より大きい (iter104 fix の漏れ)
      - sticky header の z-index が他要素と衝突
      - bottom nav と active-timer-panel が重なる
    - touch UX:
      - click target < 44x44px (icon button が 32px などで親指タップ難)
      - hover-only のツールチップが mobile で見えない
      - DnD の長押し timeout が短い / スクロール誤発動
      - swipe 系操作が無い (TickTick は swipe で完了 / 削除)
    - 入力:
      - keyboard に inputMode hint 不足 (一部 iter で対応済、漏れ確認)
      - 仮想キーボード起動時に input が画面下に隠れる
      - IME 中 Enter で誤送信 (`IMEInput` 漏れ箇所あれば修正)
    - 視覚:
      - chip / badge の text が hyphenate せず溢れる
      - subtask 番号 + status icon + title で 320px が破綻
      - Gantt / swim-lane が横スクロール必須なのに hint 無し
  - 進め方 (1 view = 1 commit、5-30 行 fix、playwright iPhone 13 emulation で前後確認):
    - **scope A (探索 + 修正のセット iter)**: playwright trigger と統合、iPhone 13 (390x844) 専用
      script を新設、各 view で「DOM が viewport 内収まるか」「click target が 44x44 以上か」
      「overflow:hidden で text 押し出し無いか」を assert、見つけ次第 fix。
    - **scope B (横展開)**: scope A で見つけたパターンを 全 view 横展開 (例: chip text-truncate を
      全 chip に適用、table を `overflow-x-auto + min-w-0` rules に統一)
    - **scope C (リッチ化)**: bottom nav 追加 / swipe 操作 / floating action button (FAB) で
      QuickAdd 主要機能の片手アクセス
  - 既存資産:
    - playwright-iter で既に「mobile keyboard hint」「<main> tabIndex」等の a11y 改善が走っている
      (iter401-405 系) → 本件は同じ playwright trigger に **モバイル emulation 専用 iter** を
      hint として誘導すれば自然に消化される
    - iter103 の long-press DnD、iter104 の Kanban overflow、iter107 の html-body clip は基盤
  - **要追加質問** (仮置きで進める):
    - (a) primary device — iPhone 系 (390/430)? Android 系 (360/412)? → 仮: iPhone 13 (390x844)
      を主、iPhone SE (375x667) を min target
    - (b) bottom nav 追加 — 必須? 当面 hamburger menu 維持?
    - (c) FAB (浮動アクション button) を入れる? 入れるなら QuickAdd / 計測開始 / 検索 のどれ?
    - (d) swipe 操作 — 完了 (Today で swipe right) / 削除 (swipe left) / 編集 modal (swipe up)?
  - 関連既存 candidate:
    - playwright explore script (`scripts/explore-uiux-runner.ts`) は viewport 切替可能 → mobile mode 専用 script を
      `scripts/explore-uiux-mobile-<view>-iter<N>.ts` で連番作成すれば自然に検出 + commit に至る

### 2026-04-30 — 自前実装 → ライブラリお着替え 棚卸し ★ 新規 ★

- [ ] **既存自前実装を確立 ライブラリに段階的 移行 (品質 + メンテ性 向上)** — 分類: 設計議論 → 段階実装
  - 原文: 「ここいらで、ライブラリ使えるところはライブラリにお着替えしようか。きっと自前実装よりええやろ？」
  - **方針**: CLAUDE.md 「ライブラリ・モリモリ主義」 (memory:feedback_libraries_first) と整合、
    **自前小実装 → 業界標準ライブラリ** に置換するチャンス棚卸し
  - 候補 (現状 self-implemented vs 確立 lib):
    | 領域 | 現状 (自前) | 候補 lib | 採用効果 |
    |---|---|---|---|
    | DAG editor | JSON textarea (workflows-panel) | **React Flow / @xyflow/react** | drag&drop / port 結線 / minimap (本ファイル別 entry) |
    | Gantt 描画 | gantt-view.tsx 583 行 (自前 SVG bar + 線) | **frappe-gantt** / **gantt-task-react** / **dhtmlx-gantt (free)** | DnD resize / 期間 click / scroll virtualize built-in |
    | Mind map / tree | 無し | **react-d3-tree** / **react-flow** | subtask graph 視覚化 (queue 別件 graphical 波及 と協調) |
    | Markdown editor | BlockNote 既導入 | (既に 確立 lib) | n/a |
    | Date picker | 無 (HTML date input) | **react-day-picker** / **shadcn DatePicker** | 範囲選択 / locale / disabled 日付 |
    | Color picker | 無 | **react-colorful** | tag 配色 / member avatar 色 |
    | Drag & drop | @dnd-kit 導入済 | (既に 確立 lib) | n/a |
    | Toast | sonner 既導入 | (既に 確立 lib) | n/a |
    | Form | react-hook-form 既導入 | (既に 確立 lib) | n/a |
    | Table | TanStack Table 既導入 | (既に 確立 lib) | n/a |
    | Virtualization | TanStack Virtual 既導入 (一部) | 全 list view に拡張 | 大量 item で fps 維持 |
    | Charts (PDCA / dashboard) | 自前 div bar (PDCA DailyBars 等) | **recharts** / **chart.js with chartjs-react** | annotation / hover / export |
    | Calendar view | 無し (POST_MVP) | **FullCalendar** / **react-big-calendar** | 月/週/agenda の 3 view 込み |
    | i18n | 無し (現状 日本語 hardcode) | **next-intl** | EN/JP 切替 / locale-aware date |
    | a11y test runner | 自前 explore-uiux script | **axe-core** / **playwright-axe** | WCAG 違反 自動検出 |
  - 進め方 (1 候補 = 1 iter ペース、queue track):
    - iter1: 棚卸し最終確定 (本リスト のうち どこを着替えるか user 判断、不要候補は除外)
    - iter2-: 1 候補 = scope A (lib 導入 + 最小 1 view 移植) → scope B (全 view 横展開) の 2-3 commit ずつ
  - **要追加質問** (仮置きで進める):
    - (a) Gantt はどれ? frappe-gantt 軽量 / gantt-task-react 高機能 / dhtmlx 商用 free
    - (b) Charts は recharts / chart.js / d3 直接? recharts 推奨 (shadcn 親和性)
    - (c) Calendar は POST_MVP 寄り、入れる?
    - (d) i18n は社内利用 (日本語のみ) なので不要? 英語業務委託あれば必要?
    - (e) lib 追加で bundle size 大きくなるが OK? (Next.js code split で各 page 局所化)
  - 推奨着手順 (impact 大 / 工数小 から):
    1. **React Flow** (Workflow graphical、本ファイル別 entry P0 と統合) ★最大 impact
    2. **recharts** (PDCA / dashboard / member capacity 等の chart 統合)
    3. **gantt-task-react** (gantt-view.tsx 全置換、queue「Gantt DnD」と統合)
    4. **react-day-picker** (date input UX 改善、軽量)
    5. **playwright-axe** (a11y 自動検出、QA loop と統合)

### 2026-04-30 — Workflow 機能を graphical 化 (React Flow 等 ライブラリ採用 OK) ★ 新規 ★

- [ ] **Workflow editor を JSON textarea から graphical (DAG visual editor) に置き換え** — 分類: 実装要望 (大、外部ライブラリ採用前提)
  - 原文: 「ワークフロー機能をもっとグラフィカルに頼むわ。他のライブラリ使ってもいいし」
  - 仮解釈:
    - 現状 `WorkflowEditorDialog` の graph / trigger は **JSON textarea で手書き** (iter118 で実装、JSON の zod parse のみ)
    - これを **React Flow (= xyflow/react)** ベースの DAG visual editor に置換:
      - ノードを drag&drop で配置 (palette から選ぶ)
      - エッジは drag で結ぶ (1 ノード port → 別ノード port)
      - ノード type 別配色 (noop/http/ai/slack/email/script、subtask-status と同 graphical pattern)
      - ノード設定パネル (右 sidebar、選択 ノードの config を form で編集)
      - 保存時に React Flow state → 既存 `WorkflowGraphSchema` JSON へ変換
  - 既存資産 (流用):
    - `workflows-panel.tsx` (847 行、editor dialog 含む)
    - `WorkflowGraphSchema` / `WorkflowTriggerSchema` (zod)
    - workflow engine (Kahn topological sort、5 node type 実装済)
    - 自然な migration: JSON textarea を fallback に残しつつ visual を default に
  - 推奨ライブラリ:
    - **React Flow / xyflow/react** (de facto standard、TypeScript 完備、active maintenance、shadcn と相性良い)
    - 代替: `reactflow` (旧 paquete name)、`react-flow-renderer` (deprecated)
    - 不採用: `dagre-d3` (描画のみ、edit 不可)
  - 設計案 3 scope:
    - **A (最小、3-5 commit)**:
      1. `pnpm add @xyflow/react` + import + 既存 dialog 内に Canvas 配置
      2. WorkflowGraph JSON ↔ React Flow nodes/edges の bi-directional 変換 helper (pure 関数 + test)
      3. Read-only viewer mode (まずは「見る」だけ実装、editor mode は scope B)
    - **B (中、5-10 commit)**: 4. Drag&drop でノード作成 (palette toolbar + dnd-kit と統合 or React Flow native) 5. Edge drawing (port → port)、cycle detection は engine 側既製を流用 6. 右 sidebar でノード設定編集 (config を node type 別 form で) 7. 保存 button で React Flow state → JSON → action.update
    - **C (大)**: workflow run 中の execution status を Canvas 上に live highlight (pending/running/done/failed を node 色で)
  - **要追加質問** (仮置きで進める):
    - (a) JSON textarea を完全に置換? それとも tab で切替可能 (advanced 用)?
    - (b) layout — 自動配置 (dagre auto-layout)? それとも user が drag 配置?
    - (c) palette ノード type — 5 種類すべて? それとも MVP で noop+http+ai だけ?
    - (d) read-only と edit の境界 — workflow.enabled 中は edit 禁止?
  - 関連既存 candidate:
    - HANDOFF iter118 系で「次 iter で React Flow ベース graph editor」と予告あり、本件はその実現
    - subtask graphical (Sprint swim-lane) と DAG エンジンの dual concern (両方 React Flow で書ける)

### 2026-04-30 — AI 自動実行モード (assignee=AI + plan 承認 + Slack escalation) ★★★ P0 最優先 ★★★

- [x] **scope A 完了 (iter506-513、計 8 commit)** — 担当者を AI に割当 → 「Plan を生成」 button → Researcher が Plan を comment に post (🤖 marker 付き)。iter506: ai-assignee judging 6 helper / iter507: listByWorkspace + label 変換 / iter508: listAgentsAction + useWorkspaceAgents + toggle helper / iter509: AssigneePicker AI 選択肢 / iter510: agent-plan-prompt builder / iter511: researcherService.generatePlanForItem / iter512: generatePlanAction + useGeneratePlan + canGeneratePlan / iter513: ItemPlanGenerateButton + ItemEditDialog 配線。env (ANTHROPIC_API_KEY) 不要、累計 60 unit test PASS。scope B (承認/却下 button + 自動実行 cloud sandbox + Slack escalation) は別 entry。
- [ ] **担当者 = AI に割当 → plan mode で「こうやるけどええか?」と確認 → 承認後 自動実行 → 困ったら Slack 相談 / escalation** — 分類: 実装要望 (大、AI + workflow + Slack 統合の中核)
  - 原文: 「自動実行モード搭載して。モードというか。担当者をAIにできる。そしたらプランモードでこうやるけどええか？って聞かれる。エスカレーションとか相談はSlackで」
  - **ユーザ強調**: 「優先度高く実装頼む」
  - 仮解釈:
    - Item.assignee に **`'ai-engineer'` / `'ai-researcher'` の特殊値** を許可 (or `assignee_kind: 'ai' | 'user'` 列追加)
    - assignee=AI な item を pg-boss キューが拾う → Researcher Agent で **plan を生成** → comment に「実行計画 (案)」として post + 承認 button
    - 承認 click → Engineer / Researcher Agent が自動実行 (既存 Engineer service / claude CLI subprocess を流用)
    - 実行中 stuck (test fail / 仕様不明) → Slack に escalation message + ItemEditDialog の comment にも残す → 人間 reply 待ち or fallback
    - 完了 → status=done + 実行ログを comment に残す
  - 既存資産 (流用ベースが豊富):
    - Engineer Agent (`engineer-service.ts` / `engineer-worker.ts` / cloud sandbox 経由 claude CLI subprocess)
    - Researcher Agent (Anthropic SDK 直叩き、staging proposal の経験あり)
    - Slack MCP (`mcp__slack__slack_send_message` 等) + `dispatchSlack` helper
    - Workflow engine (ai / slack / email / script node、approval flow を node graph で組める)
    - Comment thread (item ごとの `comments` table、AI コメントは `actor_type='agent'`)
    - `decompose-proposals-panel.tsx` (staging UI patternの参考、承認/却下 picker 既製)
    - Cost budget (`cost-budget.ts`、AI 起動の monthly cap、暴走防止)
  - 設計案 3 scope (段階実装):
    - **A (最小、3-5 commit)**:
      1. schema: `items.assignee_kind` enum 追加 (`'user' | 'ai-researcher' | 'ai-engineer'`)、UI で assignee picker に「AI」選択肢
      2. assignee=AI な item で「Plan 生成」 button → Researcher が短い計画を生成 → comment として post (auto-implement なし、ユーザは見るだけ)
      3. comment に「✓ 承認 / ✗ 却下」 button (decompose-proposals 同パターン)
    - **B (中、5-10 commit)**: 4. 承認 → pg-boss job enqueue → Engineer service が cloud sandbox で実行 → diff を comment + main へ commit (既存 cloud-engineer-adapter 流用) 5. 失敗時 (test fail / lint fail) → Slack 通知 + comment に "stuck: <理由>"、status を blocked に 6. cost cap で月次 上限 + 1 item あたり 上限 (既存 `cost-budget` 拡張)
    - **C (大、長期)**: 7. AI 同士の会話 (Engineer ↔ Researcher で plan の妥当性議論) 8. plan diff preview (実行前に「この行を変える予定」を highlight) 9. Slack 双方向 (Slack 上で承認/却下 reply で control)
  - **段階目標 (本 P0 hoist の対象 = scope A)**:
    - iter1: schema migration `0XXX_assignee_kind.sql` + drizzle schema 同期 + zod schema 拡張 + 1 unit test
    - iter2: AssigneePicker UI に「AI Researcher / AI Engineer」選択肢追加 + repository / service の filter 対応
    - iter3: ItemEditDialog から「Plan を生成」 button (AI assignee 時のみ表示) + Researcher 起動
    - iter4: Plan を comment にレンダリング + 承認/却下 button (pure helper + small UI)
    - iter5: 承認後の Slack 通知 (まずは「Plan 承認されました」を Slack 投稿、自動実行は scope B)
  - **要追加質問** (仮置きで進める):
    - (a) AI assignee の identifier — system user として `users` に行を作る? それとも特殊文字列? → 仮: `users` に `kind='agent'` の system user 1 件 (既存パターンと整合)
    - (b) plan 承認権限 — 任意 member? それとも作成者 / admin のみ? → 仮: 作成者 + admin (Item 作成権限と同等)
    - (c) Slack channel — workspace settings に「AI escalation channel」 1 個 を保存? それとも item ごと? → 仮: workspace settings に 1 個固定
    - (d) 自動実行の cancellation — 開始後 user が「やめろ」 を送ったらどう止める? → 仮: 既存 cancellation token (engineer service にあり) を使う
    - (e) AI が依存解決できない時の 振る舞い — エスカレーション後 タイムアウトしたら? → 仮: 24h タイムアウトで status=blocked + assignee を作成者に戻す
  - 制約 (重要):
    - **Cloud env で Anthropic CCR sandbox から Engineer の cloud-sandbox が動くか未検証**。scope A は AI が plan 生成のみ (auto-implement なし) なので比較的安全
    - cost budget は既存 `cost-budget.ts` で workspace 月次キャップ (scope B 移行時に必須拡張)
    - Slack は既存 MCP / dispatchSlack で送信のみ (双方向は scope C)

### 2026-04-30 — Sprint 担当者 swim-lane Gantt ★ 新規 ★

- 🚧 **Sprint ごとに 担当者を縦に並べる Gantt 風ビュー (誰が何を いつ するか)** — 分類: 実装要望 (中-大)
  - 進行中 (iter468 で swimlane substrate 着地、次 iter で SprintCard UI 配線)
  - [x] iter468 (b8b04c5): pure helper `computeSwimlaneBarPosition` + `groupItemsByAssigneeKey<T>` (sprint 期間内 % position 計算 + clip + 未割当 lane + actorType 衝突回避) + 15 test
  - [x] iter470 (a840c91): pure helper `detectLaneConflicts` + `collectConflictedItemIds` + `formatLaneConflictsJa` (同 lane 内 時間重複検出 + UI 逆引き + chip 整形) + 16 test。これで substrate は computeSwimlaneBarPosition / groupItemsByAssigneeKey / detect / collect / format の 5 helper 揃い、UI bind は 1 commit 見込み。
  - [ ] 次: SprintCard disclosure 「担当者ビュー」 配線 (上記 5 helper を chain で呼ぶだけ)
  - 原文: 「スプリントごとに、担当者を縦に並べて何をするかをわかるような機能 (がんと的な)」
  - 仮解釈:
    - sprint detail ページに新 view 「assignee swim-lane」 を追加
    - **Y 軸**: workspace member 1 行 / 1 swim lane (avatar + 名前)、未 assignee は「未割当」 lane
    - **X 軸**: sprint 期間 (`startDate` → `endDate`、典型 14 日)
    - 各 item を 該当 assignee の lane に bar として配置 (start = scheduledFor、end = dueDate、長さ = estimateMinutes 由来)
    - 同 lane 内で時間重複があれば「conflict 警告」 (同時並行不可な場合)
    - lane の合計 estimateMinutes を 上端に表示 → capacity overflow 検知 (= queue 別件「余裕時間 一覧」と協調)
  - 既存資産:
    - `sprints-panel.tsx` (786 行、`SprintCard` で sprint 一覧)
    - `gantt-view.tsx` (583 行、bar render / SVG 線描画 / critical path)
    - `useWorkspaceMembers` (member 一覧)
    - `extractEstimateMinutes` (description から 見積分数)
    - subtask-status.ts / status-visual.ts (graphical 配色)
  - 設計案 3 scope:
    - **A (最小)**: SprintCard に新 disclosure「担当者ビュー」、HTML/CSS grid で row=member × col=日 で簡易表 (bar は `<div>` で width = duration / sprint length × 100%)
    - **B (中)**: A + sprint period 内の item を assignee で group + sort、未 assignee lane 別、status 配色 (subtask-status helper 流用)、合計 estimate vs capacity 8h × N day を chip 表示
    - **C (大)**: B + DnD で lane 間 移動 (assignee 変更) + bar resize で期間調整 (queue 別件「Gantt DnD」と統合) + click で ItemEditDialog
  - 既存制約 (考慮):
    - sprint length は workspace_settings の `sprint_default_length_days` (default 14)
    - estimate が無い item の bar 長 — 1 day default? 表示しない?
    - sprint 期間外の dueDate を持つ item — clip して表示? 別 box?
  - **要追加質問**:
    - (a) 表示 placement — sprint detail の新 tab? sprint 一覧の inline disclosure?
    - (b) capacity 計算は member 別? workspace default 8h × N day?
    - (c) 未 assignee lane を表示? 隠す (filter)?
    - (d) sprint 期間外の item の扱い (例: dueDate が sprint 終了後)
  - 関連既存 candidate:
    - `gantt-view.tsx` を「assignee 軸」モードで再利用するのが工数最小 (item × time → item × member × time)
    - `personal-period-view.tsx` の period filter ロジックは流用可能

### 2026-04-29 — Template 登録機能 (タスク + サブタスクをまとめて) ★ 新規 ★

- [x] **Template 登録機能 — タスク + サブタスクをまとめて 1 つの Template として登録、再利用** — 分類: 実装要望 (中-大)
  - **scope A 完了 (iter460 → 462、3 commit)**:
    `e75e53f` (substrate) → `fd9da3a` (service+action) → `6893fe7` (hook+UI button)。
    ItemEditDialog の「Template として保存」 ghost button から 1 click で parent +
    全子孫 (深い階層 OK) を Template 化。再利用は既存 templateService.instantiate
    で同階層に展開。scope B (drag&drop 編集 + preview) / C (AI 提案) は別 entry。
  - 原文: 「テンプレート登録機能。タスクとサブタスクをまとめて登録できる」
  - 仮解釈:
    - 既存 `templates` table (Phase MVP の Template 機能) を拡張、または UI のみ追加
    - parent task 1 件 + child subtask N 件 を 1 Template として保存
    - 「Template から create」 button で workspace に instance 化 (新 Item として子孫含めて投入)
    - 名前 / 説明 / category (PJ start / week start / etc) で管理
  - 既存資産:
    - `src/features/template/` (Phase MVP で実装済 — Template foundation)
    - `src/components/workspace/templates-panel.tsx` 等で UI ある
    - `subtasks-panel.tsx` の bulk add (`parseBulkSubtaskTitles`) は流用可能
    - ltree path `parent_path` で子孫の階層を保持できる
  - 設計案 3 scope:
    - **A (最小)**: ItemEditDialog から「この Item と subtask を Template に保存」 button → 既存 templates テーブルに JSON で {parent, children[]} を保存。create 時に bulk insert
    - **B (中)**: /<wsId>/templates 画面で Template 編集 UI (drag&drop で順序変更、subtask 追加/削除)、preview pane
    - **C (大)**: AI 提案 — 過去の似た Item 集を analyze して Template 候補を提示、ボタン 1 つで保存
  - **要追加質問**:
    - (a) 既存 Template 機能 (Phase MVP) との関係 — 拡張? それとも別 entity?
    - (b) 階層 — subtask の subtask まで再帰的に保持?
    - (c) Template 起動時 — parent + child を一気に作るか、1 件ずつ確認するか?

### 2026-04-29 — 案件の現状 + 着地プラン を 一目で分かる panel ★ 新規 ★

- [x] **「この案件、今どんな感じ？」「どう着地させるつもり？」を 1 画面で一目化** — 分類: 実装要望 (中-大、AI 寄り)
  - **scope A 完了 (iter463 → 464、2 commit)**: `6a1533d` (substrate `findLatestUpdatedAt` +
    `formatLatestActivityJa`) → `dd5513a` (ItemSummaryPanel + 新 tab「サマリ」 配線、3 chip
    既存 substrate 統合: descendants-progress / dependency-readiness / latest-activity)。
    ItemEditDialog を開いた直後 base tab の隣に「サマリ」 tab、進捗 / 依存 / 動き の 3 軸を
    1 画面で確認可能。scope B (risk score / 着地予測 / dueDate 集約) / C (AI 自動要約) は別 entry。
  - 原文: 「『この案件、今どんな感じ？』『どう着地させるつもり？』というのが一目でわかるものにしたい」
  - 仮解釈 (parent Item / プロジェクト粒度の視覚 status):
    - **現状 sec**: 進捗 % (subtask done / total)、in_progress 子の数、blocked 子の数、直近 7 日の commit/comment 件数、最終 update 時刻
    - **着地 sec**: 予定 end (子の dueDate 最遅 or critical path、ガント連携)、risk score (overdue 子比率 + blocked 比率 + 最終 update からの経過)、AI 1 段落要約 ("残 5 タスク中 3 件は X、ボトルネックは Y、来週金曜着地予定")
    - **次の動き sec**: AI が「次にやるべき 3 件」を picking + 担当者 suggest
  - 既存資産:
    - `subtask-status.ts` (status helper)
    - `formatDependencyReadiness` / `summarizeDependencyReadiness` (依存タブで実装済の readiness 集約)
    - `gantt-view.tsx` の critical path 計算 (`computeCriticalPath`)
    - `dashboard-view.tsx` (workspace 全体の bird's-eye)
    - Researcher Agent (Anthropic SDK 経由で要約生成済の経験あり)
  - 設計案 3 scope:
    - **A (最小)**: ItemEditDialog に新 tab「サマリ」を追加、subtask 進捗 + readiness + 直近 activity を pure helper で集約 (AI 不使用、即実装可能 30-50 行 / 1-2 commit)
    - **B (中)**: A + 着地予測 (critical path / 残 estimate sum / 過去 bias で校正) + risk score chip
    - **C (大)**: B + AI 自動要約 (Researcher Agent で 1 段落生成、cost 制御で週 1 更新 cron)
  - 表示 placement 案:
    - (i) ItemEditDialog の新 tab (Item 単位で見たい時)
    - (ii) Kanban カード上部の disclosure (一覧上で軽く見たい時)
    - (iii) /dashboard の「進行中案件」 panel (workspace 横断で見たい時)
    - 推奨: まず (i) から、次に (iii) に展開
  - **要追加質問**:
    - (a) 「案件」の単位は parent task か、AI 自動 cluster か、Goal/Sprint 単位か?
    - (b) 「着地予測」は date 一発? それとも信頼区間 (P50/P90)?
    - (c) AI 要約の更新頻度 — リアルタイム / on demand / 日次 cron?
    - (d) risk score の閾値 — 緑/黄/赤 の境界値はチーム判断? デフォルトプリセットあり?
  - 関連既存 candidate:
    - 「依存タブの readiness chip」(iter306 で実装済) は本機能の縮小版に近い、それを Item 全体のサマリに昇華するイメージ

### 2026-04-29 — チームメンバーの余裕時間 ぱっと一覧 ★ 新規 ★

- [ ] **各チームメンバーの今日 / 今週の余裕時間を 1 画面で 一覧表示** — 分類: 実装要望 (中)
  - 原文: 「各チームメンバーが今日、今週、どれくらい余裕な時間があるのかなども見れるようにしたい。ぱっと」
  - 仮解釈:
    - workspace の全 member を 1 画面に並べ、各 member の **今日 / 今週の利用可能時間 vs 既割当 estimateMinutes 合計** を progress bar / chip で可視化
    - 「赤=オーバー / 黄=ギリ / 緑=余裕」を色分け (graphical 波及シリーズと整合)
    - assignment / 期日変更時に即時反映 (TanStack Query で member 別に invalidate)
    - 「割り振りすぎ」検知 → 余裕ある member への移管 suggestion
  - 計算式 (案):
    - working hours = 1 日 8h (member 別に上書き可、workspace_settings に default_member_capacity_minutes を将来追加)
    - 今日の used = 今日の dueDate / scheduledFor を持つ未完了 Item の estimateMinutes 合計 (assignee=該当 member)
    - 今週の used = 今週 ISO 週内の同上 (5 営業日 × 8h = 40h)
    - 余裕 = capacity - used、負なら overload
  - 既存資産:
    - `extractEstimateMinutes` (description から 見積分数 取出、iter255 で pure 化)
    - `workspaceMemberRepository` (member 一覧)
    - `personal-period-goal` の daily/weekly view ロジック (期間 filter)
    - `time_entries` (実測値、見積精度の校正に使える)
  - 設計案 3 scope:
    - **A (最小)**: workspace home に「余裕時間」 panel、各 member 1 行 (avatar + 今日 chip + 今週 chip)、見積無し Item は計算除外
    - **B (中)**: A + 詳細 modal (member click → 今日の Item 一覧 + estimate 詳細 + 過去 N 週の actual vs estimate bias)
    - **C (大)**: B + drag&drop で他 member へ Item 移管、AI suggestion (「田中さんが overload、佐藤さんが余裕、移管しますか?」)
  - **要追加質問**:
    - (a) 見積が無い Item をどう扱うか? 「未見積」counter で別表示? AI 自動見積で穴埋め?
    - (b) capacity は 1 日 8h 固定 or member 別設定? 半休/休暇 (Calendar 連携) も考慮?
    - (c) 「今週」の境界 — ISO 週 (月-日) / 業務週 (月-金) どちらが priority?
    - (d) MUST item は別カウント? capacity から優先で引く?
    - (e) Slack 通知 — 「明日 overload です」を朝 8 時に出すか?
  - 既存に近い候補:
    - Dashboard view (`/<wsId>/dashboard`) に member 別 panel を追加するのが自然
    - Personal Period View (`/<wsId>/<period>`) は "自分用" 画面なので、team 用は新画面 `/<wsId>/team-capacity` or Dashboard 拡張

### 2026-04-29 — Gantt DnD で期間を直接編集 ★ 新規 ★

- [ ] **Gantt bar を DnD で move / resize、依存タスクごとまるまるシフト** — 分類: 実装要望 (大)
  - 原文: 「ガントチャートの期間を直接ドラッグアンドドロップで移動・スタート位置やエンドの位置を自由に変えられたり、依存タスクごとまるまるずらせたり」
  - 仮解釈 (TeamGantt / GanttPRO 並 UX):
    - (1) **bar 中央を drag** → start/end を平行 shift (期間維持)、dueDate / scheduledFor を update
    - (2) **bar 左 edge を drag** → start のみ変更 (resize)、scheduledFor だけ update
    - (3) **bar 右 edge を drag** → end のみ変更 (resize)、dueDate だけ update
    - (4) **Shift+drag (or 「依存ごと」 mode toggle) で前提/後続もまとめて shift** — `useWorkspaceBlocksDependencies` で依存 graph 取得 → 自分 + 後続 (transitive closure) を一括 update
    - (5) snap to day boundary、drop 時に楽観ロックで update mutation、競合時は toast + revert
  - 既存資産:
    - `gantt-view.tsx` (583 行、bar render は既に role=button + keyboard 対応済 iter99)
    - `GanttDependencyArrows` (SVG 線描画)
    - `useWorkspaceBlocksDependencies` (workspace 横断 dep 取得)
    - `@dnd-kit` 既導入 (subtasks / backlog で使用、Gantt bar にも適用可)
    - `itemService.update` で楽観ロック付き dueDate / scheduledFor 変更可能
  - 設計案 3 scope:
    - **A (最小)**: bar 中央 drag → 期間平行 shift だけ実装 (左右 edge / 依存連動は後)
    - **B (中)**: A + 左右 edge drag (resize) + snap to day grid + visual feedback
    - **C (大)**: B + Shift+drag で transitive closure shift + critical path 強調更新 + collision 警告
  - 既存制約 (考慮):
    - cell width は zoom level (週/月) で可変、DnD は pixel→day 変換が必要
    - 楽観ロックで version 不一致 → revert → conflict toast
    - subtask の parent shift は連動するか? (`itemService.move` か別 logic か)
  - **要追加質問**:
    - (a) Shift+drag の依存連動範囲 — 直接の後続のみ? 全 transitive? Critical path のみ?
    - (b) drag 中の visual — 半透明 ghost? 元位置に reset アニメーション (失敗時)?
    - (c) day 未満の resolution は許容? (現状 dueDate / scheduledFor は date 型なので day 単位で十分?)
    - (d) cron 範囲外への drag (= 過去日付 / 1 年先) は許容?

### ✅ 2026-04-29 完了 (旧 P0 最優先消化済)

**TickTick タイマー Scope B (Document PiP) は iter315 で実装済**:
`src/lib/browser/document-pip.ts` に pure helper 3 つ (`isDocumentPipSupported` /
`openDocumentPipWindow` / `copyStylesheetsToWindow`) + unit test 12 件、
`active-timer-panel.tsx` に PiP button (Lucide `PictureInPicture2`) +
`createPortal` で同 React tree を PiP window に render + stylesheet clone +
pagehide listener で close 検知 + `useSyncExternalStore` で SSR/hydration 安全な
capability 検出。Chrome / Edge は別 window 化 + 常に手前、Safari / Firefox は
button disabled + reason aria-label。typecheck/lint 緑 (warning baseline 1)。

### ✅ 2026-04-30 完了 (旧 P0 最優先消化済 — 5/5 entry scope A 完了)

iter460 〜 iter478 までの計 19 commit で **5 件 全 entry scope A 完了**:

1. ✅ Template 登録機能 (iter460/461/462)
2. ✅ 案件サマリ panel (iter463/464)
3. ✅ チームメンバー余裕時間 一覧 (iter465/466/469/476/477)
4. ✅ Gantt DnD 期間編集 (iter467/478)
5. ✅ Sprint 担当者 swim-lane Gantt (iter468/470/471/472/473/474/475)

各 entry の実装詳細は本 file 下方の同名 section を参照。**P0 section は「(空)」状態**、
次 iter (479) からは judge.sh の track 判定 (iter % 5 = 4 → ai-automation) に復帰。
scope B (各 entry の中規模拡張、例: Gantt DnD 左右 edge resize / 依存連動 / Template
drag&drop 編集 / 案件サマリ AI 要約 等) は別 P0 entry として up された時のみ着手。

### 🔥 次 iter で即実装 (P0 最優先、track 判定より優先) 🔥

#### 🌟 新 P0 [優先度 1] (2026-04-30): saikyo-todo UX 卓越憲章 + iter prompt 統合

- 詳細は queue 上部 `2026-04-30 — saikyo-todo UX 卓越憲章` entry 参照
- 成果物: `docs/ux-excellence-charter.md` (150-300 行) + iter-instruction / CLAUDE.md 更新 + queue 派生 P0
- 期待 commit: `docs(ux): saikyo-todo UX 卓越憲章 + iter prompt 6 軸統合 (queue: ux-excellence charter)`
- **目的層 (6 軸) を encode、以後すべての iter が 6 軸で自己評価される運用に切替**
- これを最初に消化することで、後続の TaskChute/GTD plan も 6 軸で採点される (順序が効く)

#### 🌟 新 P0 [優先度 2] (2026-04-30): TaskChute / GTD methodology モード 実装プラン作成

- 詳細は queue 上部 `2026-04-30 — TaskChute モード / GTD モード 実装プラン作成` entry 参照
- 成果物: `docs/methodology-modes-plan.md` (200-400 行)
- 期待 commit: `docs(methodology): TaskChute / GTD モード 実装プラン (queue: methodology-modes plan)`
- **plan のみ作成、実装はしない** (各 phase は別 P0 で plan 完成後に queue 投入)
- 憲章 (優先度 1) ができた後にやると、6 軸で plan が採点されてより尖る

---

**直近 P0 2 件は scope A 完了 (iter501-513 の 13 commit、2026-04-30):**

- ✅ **AI agent SDK→CLI migration (5 iter)** — pm/researcher を claude CLI 経路化、
  ANTHROPIC_API_KEY 不要化。pm-flow-adapter / researcher-flow-adapter の pure helper +
  pmService.runStandupViaClaude + runStandupAction CLI 切替で完了 (iter501-505)
- ✅ **AI 自動実行モード scope A (8 iter)** — 担当=AI 設定 → 「Plan を生成」 button →
  Researcher が Plan を comment post (🤖 marker)。AssigneePicker AI 選択肢 + 7 substrate +
  ItemPlanGenerateButton 配線で完了 (iter506-513)

次 iter からは judge.sh の track 判定 (iter % 5) に復帰。新規 P0 (ユーザ追加) が
入ったら本 section に hoist して優先消化する。

scope B 候補 (本 P0 section に **再 hoist する場合** に着手する):

- AI 自動実行モード scope B: 承認/却下 button + 自動実行 (cloud sandbox) + Slack escalation
- AI agent CLI migration 残: cron-workers / retro / premortem の pmService.run も CLI 経路化
- 並び替え 根本設計改善 (本ファイル別 entry、Notion/Linear/Asana 比較表完備)
- モバイル / スマホ表示 全面改善 (本ファイル別 entry、playwright trigger と協調)
- 自前実装 → ライブラリお着替え (本ファイル別 entry、Gantt / Workflow 等)

<details>
<summary>iter460-478 の P0 5 件消化記録 (履歴)</summary>

ユーザ指示 (2026-04-30): 「さっきのやつとか優先してやってほしいな」「最優先でできるようにして欲しい」
→ 下記 5 件 queue を **track 判定より優先して順次消化**。各 iter で 1 件 着手、scope A
(最小実装) から 1 commit + immediate push + HANDOFF.md 1 行 (`1/1` 形式)。**質問が
あれば仮置きで進める** (ユーザ確認待ちで止めない、判断は commit body に明記)。

優先順位 (上から消化):

1. **Template 登録機能** (詳細: 本ファイル下方の同名 section、scope A から)
   - ✅ scope A 完了 (iter460/461/462 で substrate + service + action + hook + UI bind、3 commit)
   - 仮置き判断: 既存 `templates` table 拡張、UI scope A は ItemEditDialog から
     「Template 保存」 button → `templates.body` JSON に `{parent:{...}, children:[{title,dod,...},...]}`
   - subtask の subtask は scope A では非対応 (フラット 2 階層のみ)
   - Template 起動時は parent + child を一気に bulk insert (1 件確認モードは scope B 以降)
   - [x] iter460 (e75e53f): pure helper `buildTemplateBlueprintFromItemTree` + 10 test —
         items 世界の uuid label → template 世界の uuid label の re-mapping + parent
         prefix 剥がし + depth 昇順 stable sort で `template_items.parent_path` を生成。
         MVP scope A では position / due_date / agent_role / tags / assignees は不保持。
   - [x] iter461 (fd9da3a): service `templateService.createFromItem` + action
         `createTemplateFromItemAction` — RLS で parent + 子孫取得 + workspace 二重防御 +
         1 Tx で bulk insert + recordAudit (action='create_from_item')。schema
         `CreateTemplateFromItemInputSchema` (itemId / name? / description?) 追加。
   - [ ] 次: ItemEditDialog (or KanbanCard 右クリック menu) に「Template に保存」 button
         を配置、`useCreateTemplateFromItem` hook + toast feedback (scope A UI bind)

2. **案件サマリ panel** (詳細: 本ファイル下方、scope A から)
   - ✅ scope A 完了 (iter463/464 で substrate + UI bind、2 commit)
   - 仮置き判断: 「案件」= parent task 単位、ItemEditDialog の新 tab「サマリ」
   - subtask 進捗 % + 既存 readiness chip + 直近 7 日の activity 件数 を pure helper で集約
   - AI 要約は scope C (今 iter は不使用)
   - risk score も scope B 以降
   - [x] iter463 (6a1533d): pure helper `findLatestUpdatedAt` + `formatLatestActivityJa`
         (parent + 子孫の最終更新時刻を ltree prefix match + deletedAt 除外で集計、
         formatRelativeTime injection で test deterministic) + 12 test
   - [ ] 次: ItemSummaryPanel + 新 tab「サマリ」 (descendants-progress + dependency-readiness +
         latest-activity の 3 substrate を 1 panel に統合、scope A UI bind)

3. **チームメンバー余裕時間 一覧** (詳細: 本ファイル下方、scope A から)
   - ✅ scope A 完了 (iter465/466/469/476/477、計 5 commit)
   - 仮置き判断: capacity = 8h/day 固定、見積無し item は「未見積 N 件」 chip で別表示
   - workspace home に panel 追加、avatar + 今日 chip + 今週 chip (ISO 週)
   - MUST 別カウントは scope B 以降、Slack 通知も別件
   - [x] iter465 (0686f5f): pure helper `computeMemberCapacityLoad` +
         `formatMemberCapacityLoadJa` (4 load status / unknown sentinel /
         未見積 chip / done 除外 / fail-soft) + 17 test
   - [x] iter466 (5fc07c3): pure helper `getIsoWeekRange` / `getDayRange` /
         `getRollingDayRange` / `isDueDateInRange` / `selectItemsByDueDateInRange<T>`
         (期間 filter substrate、generic で UI/service 横断再利用) + 18 test
   - [x] iter469 (a77bc56): orchestrator `computeTeamCapacityLoads` +
         `sortTeamCapacityLoadsByUrgency` (member×period×assignee の三軸統合、
         今日/今週 row × N member、urgency sort) + 11 test。caller は本 helper
         1 関数呼び出しで render data 揃う。
   - [x] iter476 (1ddfc4f): bulk fetch API `listAssigneesForWorkspace` +
         `useWorkspaceItemAssignees` hook (sprint 横断 N+1 query 回避)
   - [x] iter477 (0097358): workspace home に `TeamCapacityPanel` mount =
         scope A UI bind 完了 (lazy disclosure + member 別 今日/今週 chip +
         tone 配色 + 危ない member 上 sort)

4. **Gantt DnD 期間編集** (詳細: 本ファイル下方、scope A から)
   - ✅ scope A 完了 (iter467/478、計 2 commit)
   - 仮置き判断: bar 中央 drag → 期間平行 shift のみ実装 (左右 edge / 依存連動は別 iter)
   - day 単位 snap、PointerEvent + setPointerCapture (@dnd-kit Sortable は再順序用途、bar drag には合わないため使用せず)
   - 失敗時 ghost reset + toast、楽観ロック衝突は revert (TanStack Query invalidate で自動)
   - [x] iter467 (dbb6e96): pure helper `computeBarDragShift` + `computeBarLeftEdgeShift` + `computeBarRightEdgeShift` (snap to day / clamp / fail-soft 全網羅) + 14 test。scope B 左右 edge も sibling 関数として先行整備。
   - [x] iter478: gantt-view.tsx の非 milestone bar に PointerEvent 配線 = scope A UI bind 完了 (translateX で snap-to-day visual ghost + 4px threshold で click vs drag 判定 + ConflictError toast + cursor grab/grabbing 切替 + `computeSnappedDragPx` pure helper 追加 + 3 test)

5. **Sprint 担当者 swim-lane Gantt** (詳細: 本ファイル下方、scope A から)
   - ✅ scope A 完了 (iter468/470/471/472/473/474/475、計 7 commit)
   - 仮置き判断: sprint detail の inline disclosure (新 tab ではない)、未 assignee lane 表示
   - HTML/CSS grid (member × 日)、bar は `<div>` で width 計算
   - capacity 計算は workspace default 8h × N day (member 別は別件)
   - [x] iter468 (b8b04c5): pure helper `computeSwimlaneBarPosition` + `groupItemsByAssigneeKey` + 15 test
   - [x] iter470 (a840c91): pure helper `detectLaneConflicts` + `collectConflictedItemIds` + `formatLaneConflictsJa` + 16 test
   - [x] iter471 (a1825bf): pure helper `summarizeLaneLoad` + `formatLaneLoadJa` + 8 test
   - [x] iter472 (398f3ed): orchestrator `computeSprintSwimlane` で 7 helper を 1 関数連結 + 11 test
   - [x] iter473 (4411200): pure helper `summarizeSprintSwimlanePopulation` + `formatSprintSwimlanePopulationJa` + 13 test
   - [x] iter474 (3ba5efd): bulk fetch API `listAssigneesForSprintItems` + `useSprintItemAssignees` hook + `groupAssigneesByItemId` pure helper + 6 test
   - [x] iter475 (77bc549): SprintCard に `SprintSwimlaneDisclosure` mount = scope A UI bind 完了 (lane 別 bar Gantt + population summary chip + conflict 警告)

各 iter ルール:

- 1 commit が 30-150 行、scope A の最小実装で typecheck/lint clean
- shadcn UI (`src/components/ui/`) 編集禁止
- pure helper には test 1-2 件追加
- commit message: `feat|fix(<phase>): <一言> [iter<N> queue 1/1]` (track 名は `queue` で固定)
- 同 entry の scope A 完了後、scope B/C を **連続消化 OK** (1 entry 完遂まで他 entry に飛ばない、context 連続性のため)
- 3 連続失敗 (typecheck/lint/test 落ち) で次 entry に進む

5 件全部消化したら本 P0 section を「(空)」に戻す → track 判定に復帰。

</details>

<details>
<summary>iter302 で消化済の Scope B 仕様 (履歴)</summary>

ユーザ指摘 (2026-04-29): 「フローティングでウィンドウ常に手前表示のやつとかも実現してくれ」

iter247-249 で実装済の Scope A (in-page 常駐 floating panel `active-timer-panel.tsx`)
を、Document Picture-in-Picture API で **別 window 化 + 常に手前表示** に拡張する。

# 仕様

- `active-timer-panel.tsx` の右上に「PiP で取り出す」 button (Lucide `PictureInPicture2` icon)
- click で `window.documentPictureInPicture.requestWindow({width: 320, height: 140})` を呼んで別 window を生成
- React Portal (`createPortal`) で **同じ React tree を PiP window の body に render** (state は親と共有、Zustand store なので自動)
- PiP window の `<head>` に親 document の `<link rel="stylesheet">` / `<style>` を全 clone (Tailwind 等の CSS が効くように)
- PiP window が close されたら parent state に戻す (pagehide event listener で cleanup、portal target を null に)
- Chrome / Edge のみ動作。Safari / Firefox は `documentPictureInPicture` undefined → button は disabled + tooltip「Chrome / Edge で利用可能」+ aria-label に reason
- 既存 panel の Stop / Pause / Resume / 経過時間表示はそのまま (PiP window 側でも同じ button が動く)

# 実装ファイル

- `src/components/workspace/active-timer-panel.tsx` (button 追加 + portal logic、+50-100 行)
- `src/lib/browser/document-pip.ts` (pure helper for capability detection + window open + stylesheet clone、+30-50 行 + unit test 5-7 件)

# pure helper signature

```ts
export function isDocumentPipSupported(): boolean
export async function openDocumentPipWindow(opts: {
  width: number
  height: number
  sourceDoc?: Document
}): Promise<Window | null>
export function copyStylesheetsToWindow(target: Window, sourceDoc?: Document): void
```

# UX 卓越基準 (a-g 該当部)

- a 発見可能性: PiP icon button + tooltip / aria-label「常に手前表示で別 window 化 (Chrome/Edge)」
- b アクセシビリティ: button keyboard 到達可、Safari/Firefox では disabled + reason aria-label
- c 状態網羅: support 検出 / 開いてる中 / 閉じた / 失敗 (例: ユーザ拒否) の 4 状態
- d 速度感: portal でリアルタイム同期、open は async でも UI block しない
- e 細部: 開いた直後 PiP window に focus 移動、close で main panel に戻る
- f レスポンシブ: 小型 window (320×140) なので元 panel より compact 表示も検討
- g 一貫性: shadcn / Lucide / 既存 panel の配色そのまま

# 期待 commit

`feat(timer): タイマー panel を Document Picture-in-Picture で常に手前表示 window 化 (queue: TickTick タイマー Scope B)`

# 関連 reference

- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API
- chrome.com の sample: https://developer.chrome.com/docs/web-platform/document-picture-in-picture/

# 依存

- 既存 `active-timer.ts` Zustand store (iter247、`useActiveTimerStore`) はそのまま流用
- 既存 `formatElapsed` / `formatVariance` (iter254) も流用
- Document PiP API は polyfill 不要、native 機能のみ使う

</details>

### ✅ 2026-04-28 完了 (旧 P0 最優先消化済)

**subtask gap (d) インデント / アウトデント button** は iter290 で `c16d15e` として
実装済 (cloud loop)。`subtasks-panel-helpers.ts` に 3 pure helper 抽出 + button +
Alt+←/→ keyboard + DnD cross-parent toast 更新 + helper 単体 test +15 件。
これで subtask gap a-d 4/4 全消化完了。下記の "(d) インデント" entry も完了印に変更。

### 2026-04-28 (iter257 中) — サブタスク graphical 表示 ★★★ P0 最優先 ★★★

- 🚧 **サブタスクを 1, 2, 3 番号付きで graphical に、依存があれば順番表示、チャンク (まとまり) で grouped、Kanban / List メニューから開ける** — 分類: 実装要望 (大、**P0 最優先・真剣依頼**)
  - **ユーザ強調**: 「**真剣に実装頼んだ**」 — 次 iter で **本 entry を最優先消化**、ラフな実装は許容しない、main 級品質で複数 iter にわたって完遂すること
  - **進捗 (scope A 完了)**:
    - [x] `c242409`: foundation — `subtasks-panel.tsx` に番号 1, 2, 3... + status icon (Lucide) + 配色チップ + `<ol>` 化。`subtask-status.ts` pure helper + 9/9 test。
    - [x] **e2e 探索 (Playwright MCP)** — signup → workspace → parent task QuickAdd → subtasks bulk add 5 件 → 子タスク tab で表示確認。5 status (todo=slate / in_progress=blue / done=green + 未知 / blocked=amber) すべての色/icon が正しく描画。screenshot: `subtasks-panel-iter279-{foundation,multi-status,mobile}.png` (gitignored)。
    - [x] **モバイル (375px) 対応確認**: status label は `hidden sm:inline` で隠れ、icon のみで省スペース。番号 + icon + title が viewport 内に綺麗に収まる。
    - [x] done item の title が `text-muted-foreground` で muted (視覚 delight)。
    - [ ] **scope B**: React Flow ベース DAG modal (Kanban カードの「⊞ flow」 button から開く) — 4 件選択肢を提示中、ユーザ判断待ち
    - [ ] **scope C**: チャンク (auto-cluster) を含むフル graphical view — POST_MVP 寄り
    - **2026-04-28 追加 ユーザ指摘 (subtask 機能 gap)**:
      - [x] **(a) 完了 checkbox** — `a9f1a4b` で実装。各行に既存 `ItemCheckbox` 配置 + done 時 line-through
      - [x] **(b) 再帰表示 + 視覚 group** — `9ca5e46` で実装。`SubtaskTreeNode` 再帰 component + 子持ち node を slate bg + ring の group container として描画 + child count badge
      - [x] **(c) DnD 並べ替え** — `ff41695` で実装。@dnd-kit + 各深さ独立 SortableContext + 同 parent_path 内 reorder のみ (cross-parent は indent/outdent button 誘導)
      - [x] **(d) インデント (→/← button + Alt+→/←)** — `c16d15e` で実装 (iter290 P0、cloud loop)。`subtasks-panel-helpers.ts` に `compareSiblings` / `findPrevSibling` / `findGrandparentId` を抽出 + helper test +15 件、`SubtaskTreeNode` に `ArrowLeftFromLine`/`ArrowRightFromLine` button + Alt+←/→ keyboard + disabled 理由 aria-label、`SubtasksPanel` に `useMoveItem` + `handleIndent`/`handleOutdent` 配線、DnD cross-parent toast 更新。これで subtask gap a-d 4/4 完了。
        - 実装方針 (詳細):
          - `subtasks-panel.tsx` 内に `compareSiblings(a, b)` (position 同点を id で tie-break)、`findPrevSibling(item, allItems)`、`findGrandparentId(item, allItems)` の 3 helper を追加
          - `findGrandparentId` は parentPath を `.` split して 2nd-to-last segment の uuidLabel から item を逆引き、root 直下 (1 segment) は `'root'` 文字列を返す sentinel で newParentItemId=null に対応
          - `SubtaskTreeNode` props に `onIndent` / `onOutdent` callback を追加して再帰で渡す
          - 各行 header の右端に `ArrowLeftFromLine` (outdent) + `ArrowRightFromLine` (indent) button を 2 つ配置、aria-label に reason 文言、disabled 切替、Alt+←/→ keyboard も `onKeyDown` で
          - `SubtasksPanel` で `useMoveItem(workspaceId)` + `handleIndent`/`handleOutdent` を実装、`move.mutateAsync({id, newParentItemId})` で indent (前 sibling.id) / outdent (祖父 id or null)
          - DnD の cross-parent warning toast を「indent / outdent ボタンで操作してください」に更新
        - 期待 commit: `feat(item): subtask に indent/outdent button + Alt+←/→ keyboard (queue: subtask gap d/4)`
        - 関連 hook: `useMoveItem` (既存)、`uuidToLabel` (既存、`@/lib/db/ltree-path`)
      - 原文: 「サブタスクってどうやって完了するのか。並べ替えやインデントもできないし。サブタスクのサブタスクの・・・みたいな定義もできない」
      - 対応順: 完了 checkbox → 再帰表示 → DnD → indent (1 つずつ独立 commit)
  - **e2e で発見した別件 bug (修正済)**:
    - [x] **bulk add で全 child の position が `'a0'`** — `itemService.create` が position を計算せず DB default のまま insert していたバグ。`945739f` で `repository.findMaxPositionAmongSiblings` を追加し、`service.create` で `positionBetween(maxPos, null)` を計算して insert に明示渡すよう修正。test 2 件追加 (root sibling / child sibling)、30/30 PASS。`parent_path` は ltree notNull default `''` (root も空 ltree、NULL ではない) を踏まえた実装。

  - **追加要望 2026-04-28: もっとグラフィカル / シンプル / 意味のあるデザイン**:
    - 原文: 「グラフィカルにできる部分はもっとグラフィカルにしたい。シンプルかつグラフィカル」「意味のあるデザイン」
    - 解釈: subtask-panel で確立した「番号 + 配色 + icon」 graphical pattern を **app 全体に波及**。ただし装飾ではなく **状態/意味を伝える graphical** ── 見て即「何が起きてるか」が伝わるデザインに揃える。
    - 候補 (subtask-status helper を共通化して波及):
      - [ ] **Today / Inbox view**: 各 item の status badge (現状 title の隣にテキスト) を icon+色 chip に統一 (subtask-panel と同 helper 共有)
      - [ ] **Backlog table**: status 列を icon+色 chip に
      - [ ] **Kanban カード**: 完了 / blocked の視覚 hint を強化 (現状 title 文字色のみ)
      - [ ] **Goal / Sprint progress bar**: 現在 stripe 表示。残/超過/達成を色 + icon で意味付け (緑チェック / 黄黄信号 / 赤遅延)
      - [ ] **Item dependencies tab**: 依存先を visual chain (矢印付き mini DAG) で
      - [ ] **Activity log**: 操作種別 (create/update/delete/status_change) を icon で
      - [ ] **Notification bell**: 通知 type 別の色/icon
      - [ ] **MUST badge**: 現在赤テキスト badge → ⚠ icon + 強い意味 (期限近接で点滅などはやり過ぎ、静的な視覚強調)
    - 設計原則:
      - **意味があるなら graphical、無いなら text のまま** (装飾 icon 禁止)
      - **icon は aria-hidden + 視覚 + sr-only テキスト併用** (アクセシビリティ維持)
      - **配色は 5-7 色に絞る** (slate / blue / green / amber / red / zinc / muted で統一)
      - **shadcn / Lucide / 既存 priority dot pattern と整合**
    - 進め方: 1 view ずつ iter で消化 (今 iter 残り時間 → Today view、次 iter → Backlog、…)。subtask-status helper を `subtask-status.ts` から `item-visual.ts` 等に rename して app 共通化するのが自然。
  - 原文: 「サブタスクめっちゃグラフィカルに 1 2 3 みたいにして依存とかあれば順番表示して、チャンクをまとめてほしい。看板メニューやリストメニューからそういったのが表示できる。で、めっちゃグラフィカルに今の各タスクのステータスがわかる」
  - 仮解釈:
    - (1) サブタスクの **「順序付き番号 (1, 2, 3...)」** 表示。現在の subtasks-panel は flat list なので、`fractional_position` or 依存 graph topological sort 順を視覚化
    - (2) **依存** (`item_dependencies` テーブル) があれば順序ノードでつないで「親→次→次」の流れを線で表示 (mini Gantt or DAG graph)
    - (3) **チャンク (まとまり)** で grouped — 同じ DoD / 同じ tag / 同じ assignee 等で自動 cluster しつつ、子タスク群を box で囲む
    - (4) **Kanban カード / Backlog 行** から「サブタスク graph を開く」ボタンで disclosure or modal で graphical view
    - (5) 各ノードに **status (todo / doing / done / blocked)** が色 + icon で一目瞭然
  - 既存資産:
    - `item_dependencies` table + `useWorkspaceBlocksDependencies` hook (iter7-8 で Gantt に配線)
    - `gantt-view.tsx` の `GanttDependencyArrows` (SVG 線描画)
    - `subtasks-panel.tsx` (iter255 で抽出した list panel)
    - React Flow は未導入だが Workflow editor 候補で名前は出ている (HANDOFF iter112-118 系)
  - 設計案 (3 scope):
    - **A**: 既存 subtasks-panel に「順序番号 + status 色」の column を追加 (5-30 行、最小構成)
    - **B**: 新 component `SubtaskFlowView` を作って React Flow ベースの DAG 表示。Kanban カードの右上「⊞ flow」 button で modal 開く
    - **C**: チャンク (auto-cluster) を含むフル graphical view。クラスタリングロジック (tag/DoD/assignee 共通でグルーピング) + box 描画
  - **要追加質問**:
    - (a) 「依存の順番表示」は Gantt 風 (時間軸あり) と DAG 風 (時間軸無し、矢印のみ) どちら?
    - (b) 「チャンク」は AI 自動 cluster? それとも手動グルーピング (既存 tag) のみ?
    - (c) Kanban カード上の表示は **icon のみ + click で modal** か、**カード内に縮小版 graph を埋込** どちら?
    - (d) status の graphical 表現は色だけで十分? icon (○●◐) も併用?
  - スコープ: 大 (React Flow 導入 or 自前 SVG layout、依存 graph + cluster + status の 3 軸)。複数 iter で段階実装が現実的:
    - iter X: A (subtasks-panel に番号 + status 色)
    - iter X+2: B (React Flow DAG modal、Kanban カード button)
    - iter X+4: C (チャンク auto-cluster) — POST_MVP 寄り

### 2026-04-28 (iter238 後 — その 3)

- [x] **「Claude on Web (ネット上のサンドボックス)」runner 本体** — iter239-243 完了
  - 原文: 「ネット上のサンドボックスでできるクロードオンウェブにしたい」/「フル自動」
    /「リモート化今すぐ」/「main にプッシュまたはマージ毎回」
  - 確定: 解釈 (i) = 解釈 1 (Engineer/Researcher を sandbox で動かす + verify
    通ったら main 直 push)。フル自動 (α) 路線。
  - 完了 commit:
    - iter 239: skeleton (型 + signature) — `5ef5ef7`
    - iter 240: Sandbox.create + hello world + log capture — `831b236`
    - iter 241: git clone + claude CLI (Max OAuth credentials を base64 で env 注入) — `cadbc5b`
    - iter 242: verify steps (typecheck / lint / test) — `e09e0ef`
    - iter 243: autoMergeToMain で main 直 push (フル自動 α) — 本 iter
  - **残タスク**:
    - [x] iter 244: `cloud-engineer-adapter.ts` で env 解決 + runClaudeOnRepo の呼出
          を集約 (`runEngineerInCloudSandbox`)、test 4 件追加。Engineer service と
          cloud-sandbox-runner の橋渡しが揃った
    - [x] iter 245: engineer-worker.ts に dispatcher 配線完了 — `chooseEngineerRunner`
          (pure 関数、env 1 個を厳格 match) で `'cloud' | 'local'` 判定、cloud 路で
          adminDb から item 取得 → buildUserMessage → runEngineerInCloudSandbox。
          test 5 件追加 (env 値 'true' / 'TRUE' / '1' / 'false' / 未設定 を assert)
    - [x] iter 246: Custom e2b template scaffolding (`e2b/saikyo-engineer/Dockerfile` +
          `e2b.toml` + `README.md`) を追加。Node + git + pnpm + supabase CLI +
          Playwright Chromium を baked-in。`runViaCloudSandbox` / `runClaudeOnRepo`
          に `template?: string` を追加、adapter は `SAIKYO_ENGINEER_TEMPLATE` env で
          切替。残: 実 build / template_id 確定 / 動作確認 (operator 作業)
    - [ ] E2B_API_KEY を取得して `.env.local` に設定 + 本番 docker-compose に通す
    - [ ] CLAUDE.md 「autoPr 明示 opt-in」ルールと矛盾するので運用ルール更新
          (Engineer cloud sandbox は autoMergeToMain を default true にする)

### 2026-04-28 (iter238 後 — その 2)

- 🚧 **TickTick 風 タスクタイマー + デスクトップアプリ風常駐ポップアップ** — 分類: 実装要望 (大、進行中)
  - 原文: 「ticktick みたいに測れるようにして。また、そのデスクトップアプリ
    みたいに常にポップアップで表示するタイマー機能つけたい」
  - 設計案 3 scope: - **A** In-page 常駐タイマー (Zustand `activeTimer = { itemId, startedAt,
mode, pausedAt, accumulatedMs }` + 右下 fixed panel + Item 行 / Dialog
    に Start button + Stop で `time_entries` に auto insert) - **B** Document Picture-in-Picture (`documentPictureInPicture.requestWindow`
    で別 window 化、Chrome/Edge ネイティブ「常に手前」、Safari/Firefox は
    未対応 fallback toast) - **C** Pomodoro サイクル (25/5min + Notification API + 統計) — POST_MVP 寄り
  - **要追加質問**:
    - (a) Pomodoro 派 vs ストップウォッチ派、どちらを MVP に? 両対応も可能
    - (b) Scope B の PiP は Chrome/Edge only で OK? Safari は in-page floating で十分?
  - 既存 `time_entries` テーブル流用 (`durationMinutes` 整数、秒は Math.round で丸め)
  - 進捗:
    - [x] iter 247: Scope A core (Zustand store `active-timer.ts` + `formatElapsed`)。
          start/pause/resume/stop/elapsedMs を Date.now() ベースで実装、persist
          middleware で reload 跨ぎ継続、test 13 件 (585→598 全パス)。MVP は
          stopwatch path のみ (Pomodoro は Scope C で別途)
    - [x] iter 248: floating panel UI (`active-timer-panel.tsx`) + workspace page
          に mount。Pause / Resume / Stop button、Stop で `time_entries` に auto
          insert (`category='dev'`、`durationMinutes=Math.max(1, round(ms/60000))`、
          `description=「タスク: <title>」`)。1s 間隔で再 render (running 中のみ)
    - [x] iter 249: `start-timer-button.tsx` 新設 — 状態 3 way (active 無 / 自分 /
          他 Item) で出し分け、ItemEditDialog の base tab に「⏱ タスクタイマー」
          panel として mount。click → store.start で右下 panel 出現の hot path 完成
    - [x] 次 iter: Today / Backlog 行に compact 版を配置 (size='sm' の StartTimerButton) — iter250 完了
    - [ ] Scope B (Document PiP) は次の次以降

### 2026-04-28 (iter238 後)

- [x] **タスク分解の UX 設計議論** — iter251 完了
  - 原文: 「タスク分解は、子タスクとして分解するイメージ。一応選べる。子タスくかどうか。で許可を求める。それでタスク確定しない。」
  - 対応: `decomposeItemViaClaude` (CLI 経路) を `staging:true` + `propose_child_item` に切替。MCP server が `DECOMPOSE_PARENT_ITEM_ID` env を受けたら `DECOMPOSE_TOOLS` を使う staging mode で起動するよう拡張。
  - **残未決**: 「子 / 関連 / スキップ」3-way picker は設計議論が必要 (ユーザ確認待ち)。

- 🚧 **他製品の楽観ロック / 同時編集 UX を深堀り** — 分類: 設計調査 (進行中)
  - 原文: 「他の製品とかどう工夫してるんだろ？」(iter238 banner 実装の流れで)
  - 進捗:
    - [x] iter238: Linear / Asana 風「他の人が編集中」banner (externallyChanged 検出)
    - [x] iter252: 自動 retry on conflict — ConflictError 時に refetch → 最新 version で再 mutate (Linear / Notion 風)
    - [ ] field 単位 merge picker — 同一 field を両者が編集した場合の diff 表示 (設計中)
    - [ ] Realtime presence avatar — 誰が今 dialog を開いているか (設計中)
  - **要追加質問**: presence avatar は派手だが安全とは別軸。優先度どう?

---

## 処理済み

(空)
