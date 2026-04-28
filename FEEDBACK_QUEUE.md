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
