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
