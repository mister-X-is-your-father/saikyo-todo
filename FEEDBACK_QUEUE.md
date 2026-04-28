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
