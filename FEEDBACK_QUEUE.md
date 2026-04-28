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
  - **残タスク** (別 entry にすべき):
    - [ ] Engineer worker (`engineer-runner.ts`) 側を新 runner に切替える dispatcher 配線
    - [ ] Custom e2b template (DiD + supabase CLI + playwright) で Service test / e2e
          も sandbox 内で完結
    - [ ] E2B_API_KEY を取得して `.env.local` に設定 + 本番 docker-compose に通す
    - [ ] CLAUDE.md 「autoPr 明示 opt-in」ルールと矛盾するので運用ルール更新
          (Engineer cloud sandbox は autoMergeToMain を default true にする)

### 2026-04-28 (iter238 後 — その 2)

- [ ] **TickTick 風 タスクタイマー + デスクトップアプリ風常駐ポップアップ** — 分類: 実装要望 (大)
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

### 2026-04-28 (iter238 後)

- [ ] **タスク分解の UX 設計議論** — 分類: 設計議論 → 実装要望
  - 原文: 「タスク分解は、子タスクとして分解するイメージ。一応選べる。子タスクかどうか。で許可を求める。それでタスク確定しない。」
  - 仮解釈: AI 分解の結果を即「子タスクとして create_item」しているが、
    本来は (1) staging proposal で出して、(2) ユーザが「これは子タスクとして
    取り込む / 取り込まない」を 1 件ずつ判定し、(3) 承認 click で初めて
    create_item する設計を期待。現状 `decomposeItemViaClaude` は staging を通らず直接
    create するので、ここに分岐を入れる必要がある。
  - 仮対応: `useDecomposeItem` を staging path (`useDecomposeItemViaSDK`) に
    切替えるか、CLI 経路でも propose_child_item tool を優先するよう
    Researcher の prompt を調整する。POST_MVP の二重承認と被るので scope 注意。
  - **要追加質問**: 「子タスクとしてではなく『関連する別 Item』として作りたい
    ケース」も選択肢に含めるか? Yes なら proposal row に「子 / 関連 / スキップ」
    の 3-way picker が必要。

- [ ] **他製品の楽観ロック / 同時編集 UX を深堀り** — 分類: 設計調査
  - 原文: 「他の製品とかどう工夫してるんだろ？」(iter238 banner 実装の流れで)
  - 仮対応: iter238 で Linear / Asana 風の「他の人が編集中」 banner は実装済み。
    残タスクは「field 単位 merge picker」「Realtime presence (誰が今開いている
    か avatar 表示)」「自動 retry on conflict」あたりを iter で順に。
  - **要追加質問**: 優先度どう? presence avatar は派手だが安全とは別軸。

---

## 処理済み

(空)
