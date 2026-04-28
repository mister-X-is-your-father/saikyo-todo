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

- [ ] **「Claude on Web (ネット上のサンドボックス)」対応** — 分類: 設計議論 (要 disambiguation)
  - 原文: 「ネット上のサンドボックスでできるクロードオンウェブにしたい」
  - 解釈 3 通り、ユーザに番号で確認待ち:
    1. **Engineer / Researcher Agent をリモートサンドボックス実行**: 現状 git
       worktree + local `claude` CLI subprocess。代わりに e2b.dev / Daytona /
       Anthropic Cloud Container 等で実行 → local PC 不要、並列容易
    2. **saikyo-todo 自体を Claude Code Web で開発できる repo 整備**:
       devcontainer.json / claude.code 設定 / cloud から `pnpm dev` できる
       env 整理、Docker Compose 前提を撤廃 or 並走
    3. **MCP server 化して claude.ai (web) から saikyo-todo を操作**: Web チャットから
       Item create / complete を叩ける MCP endpoint expose。POST_MVP 設計に近い
  - **要追加質問**: 上 3 つどれ? 合体可。実装規模が桁違いなので確定してから着手
  - 補足 (ユーザ追記「それなら落ちる心配もないし」): 主目的は「24/7 走る・local
    PC 依存しない」 robust 化。解釈 1 (cloud sandbox 実行) が本命、解釈 2 も
    延長線で同方向。順序は 1 → 2 提案 (Agent 実行が今ボトルネック)、provider
    候補は e2b.dev (Anthropic 公式 example の標準) / Daytona / Modal、解釈 3
    (MCP) は今回スコープ外で確定待ち
  - 補足 2 (ユーザ追記「リモートサンドボックスで main にプッシュまたはマージ毎回」):
    解釈さらに 2 通り、確定待ち:
    - (i) Sandbox 実行 → main へ毎回 push/merge (autonomous shipping、worktree
      でなく main 直接更新)
    - (ii) main への push/merge を trigger に sandbox で test / verify (CI 的)
    - 推測は (i)、ただし CLAUDE.md「autoPr 明示 opt-in」と矛盾。Draft PR 自動
      作成 → 人間 merge が安全側案。自己批判として要確認

### 2026-04-28 (iter238 後 — その 2)

- [ ] **TickTick 風 タスクタイマー + デスクトップアプリ風常駐ポップアップ** — 分類: 実装要望 (大)
  - 原文: 「ticktick みたいに測れるようにして。また、そのデスクトップアプリ
    みたいに常にポップアップで表示するタイマー機能つけたい」
  - 設計案 3 scope:
    - **A** In-page 常駐タイマー (Zustand `activeTimer = { itemId, startedAt,
mode, pausedAt, accumulatedMs }` + 右下 fixed panel + Item 行 / Dialog
      に Start button + Stop で `time_entries` に auto insert)
    - **B** Document Picture-in-Picture (`documentPictureInPicture.requestWindow`
      で別 window 化、Chrome/Edge ネイティブ「常に手前」、Safari/Firefox は
      未対応 fallback toast)
    - **C** Pomodoro サイクル (25/5min + Notification API + 統計) — POST_MVP 寄り
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
