# saikyo-todo UX 卓越憲章 (UX Excellence Charter)

> 「saikyo-todo は、なぜ存在するのか」 を **6 軸で言語化** する憲章。
> 個別 feature を作る前に必ず読む。各 iter は本書の 6 軸で **自己評価** される。

## なぜこれを書くか

ユーザ要望 (2026-04-30):
> 「圧倒的な可視化性能とグラフィカルで直観的な操作方法、認知不可の低減や作業漏れの防止、
>  やる気アップ、効率化に優れたものにするように、タスクを作ってp0に積んどいて。
>  そもそもそういうのを目指すようにプログラムしたいね。」

これは「個別 feature を足す前に、saikyo-todo の **目指す方向そのもの** を決めろ」 という指示。
6 軸を encode することで以後の iter は「これって saikyo-todo の方向性に合う?」が常に判定可能になる。

## 6 軸 (目的層)

| # | 軸 | 一言定義 | 評価観点 |
|---|---|---|---|
| 1 | **圧倒的な可視化性能** | 状態 / 量 / 関係 / 進捗 / 締切 が見て即わかる | 情報密度、グラフ・色・icon・空間配置、scan-ability |
| 2 | **グラフィカルで直観的な操作方法** | DnD / inline edit / hover / shortcut で迷わない | 直接操作、affordance、modeless、マウス・タッチ・キーボード対応 |
| 3 | **認知負荷の低減** | 1 画面に出す情報を整理、smart default、未読バッジ | 情報の取捨選択、選択肢を絞る、決断疲れを避ける |
| 4 | **作業漏れの防止** | MUST / 期限 / blocked 解消 / 依存先 done を能動通知 | proactive surfacing、隠れない、忘れない、後回し不可 |
| 5 | **やる気アップ** | 完了時 delight / 進捗バー / streak / 累積カウンタ | エモーショナル、片付いた感、進んでる感、達成感 |
| 6 | **効率化** | shortcut / quick-add / bulk / template / AI 分解 | クリック数、待ち時間、タイピング量を減らす |

> 注: 軸 3 は ユーザ原文 「認知不可」 を typo 解釈で 「認知負荷」 と表記。原意は変えない。

### 良い例 / 悪い例 (具体)

| 軸 | 良い例 (saikyo-todo 既存) | 悪い例 |
|---|---|---|
| 1 可視化 | Sprint swimlane Gantt (member × 日 grid + bar)、Kanban 列、PDCA daily bars | flat な item list (status は全部 text)、 grouping 無し |
| 2 操作 | Kanban DnD で status 変更、行 row-anywhere-click、Gantt bar drag で期間 shift | edit 用 modal を開かないと値変更不可、すべて form |
| 3 認知 | Today view (今日 due + ongoing のみ)、smart default 「今すぐ」 | 全項目 1 list 表示、status 13 種を全部選択肢に |
| 4 漏れ | MUST badge ⚠ + dashboard 集約、active-timer-panel 常駐 | 期限切れが 1 click 先の page にあるだけ |
| 5 やる気 | done 時 confetti (実装予定)、累計完了 chip (TeamCapacity)、streak (POST_MVP) | 完了しても「ありがとうございました」だけ |
| 6 効率 | QuickAdd (`Cmd+K`)、AI 分解、Template 起動、bulk select | 1 件ずつ form 入力、parent 紐付けに id を手書き |

### 軸間の緊張関係 (trade-off)

- **軸 1 (可視化) ↔ 軸 3 (認知負荷低減)**: 情報を全部出すと scan-ability ↑ (軸 1) だが decision fatigue ↑ (軸 3 ↓)。
  解: **層別 disclosure** (default は要約 chip、click で詳細)。Sprint swimlane の lane summary chip がこの好例。
- **軸 5 (やる気) ↔ 軸 6 (効率化)**: confetti / animation は 1-2 秒の delay を生む (軸 6 ↓)。
  解: **delight は async overlay** (操作 block しない)、軸 5 は「次の操作を妨げない」を制約に。
- **軸 4 (漏れ防止) ↔ 軸 3 (認知負荷)**: notification を増やすと漏れ ↓ (軸 4 ↑) だが noise ↑ (軸 3 ↓)。
  解: **smart 通知** (重要度 sort + 既読 dim + sound off default)、未読バッジは数値だけ。

### view ごとに優先軸を決める

| view | 主 (>= 必達) | 副 | 抑制 |
|---|---|---|---|
| Today | 4 漏れ防止 / 6 効率化 | 1 可視化 | 5 やる気 (1 日完了で per-item でなく日次で) |
| Inbox | 3 認知負荷低減 / 6 効率化 | 4 漏れ防止 | 1 可視化 |
| Kanban | 1 可視化 / 2 操作 | 5 やる気 | 4 漏れ防止 (MUST は別 badge) |
| Backlog | 1 可視化 / 6 効率化 (sort/filter) | 3 認知負荷 | 5 やる気 |
| Gantt | 1 可視化 / 2 操作 (drag 期間 shift) | 4 漏れ防止 | 3 認知負荷 (情報密度高) |
| Dashboard | 1 可視化 / 4 漏れ防止 (MUST) | 5 やる気 | 6 効率化 |
| ItemEditDialog | 6 効率化 / 2 操作 | 3 認知負荷 | 1 可視化 |
| Goals / Sprints | 1 可視化 (進捗) / 4 漏れ防止 (KR 期限) | 5 やる気 | 6 効率化 |

## 既存 UX 卓越基準 (a-g) との関係

a-g は **手段層** (どう実装するか)、6 軸は **目的層** (何のために作るか)。
新機能 commit は両方を念頭に置く: 6 軸 = WHY、a-g = HOW。

| a-g (手段) | 主に効く 6 軸 (目的) |
|---|---|
| a. 発見可能性 | 1 可視化 / 3 認知負荷低減 |
| b. アクセシビリティ | 2 操作 (キーボード / SR) / 3 認知負荷 |
| c. 状態網羅 (loading/empty/error/disabled) | 3 認知負荷 / 4 漏れ防止 |
| d. 速度感 | 6 効率化 / 5 やる気 (待ちは萎える) |
| e. 細部 (focus ring / animation / hover) | 5 やる気 / 2 操作 |
| f. レスポンシブ | 2 操作 (タッチ) / 3 認知負荷 |
| g. 一貫性 (shadcn / Lucide / 配色) | 3 認知負荷 / 5 やる気 |

## 各 view の 6 軸自己採点 (5 段階、2026-04-30 時点)

採点基準: 5 = 業界 top tier 並、4 = 良好、3 = 並、2 = 弱い、1 = 未着手。
根拠は 1-2 行で具体例を添える (主観 OK、ただし「次やるべき改善」を派生 P0 として queue 化)。

| view | 軸1 可視化 | 軸2 操作 | 軸3 認知 | 軸4 漏れ | 軸5 やる気 | 軸6 効率 | 弱点 |
|---|---:|---:|---:|---:|---:|---:|---|
| Today | 3 | 4 | 4 | 3 | 2 | 4 | 軸5: 1 日合計 / 残時間 / 進捗 bar が無い |
| Inbox | 2 | 3 | 4 | 2 | 2 | 3 | 軸1: グルーピングが priority のみで弱い |
| Kanban | 4 | 5 | 3 | 3 | 3 | 4 | 軸4: MUST 列なし、軸5: confetti 未実装 |
| Backlog | 4 | 3 | 3 | 3 | 1 | 4 | 軸2: inline edit 弱、軸5: 完了 affordance ほぼ無 |
| Gantt | 4 | 4 | 2 | 3 | 1 | 3 | 軸3: 情報密度高すぎ、軸2: edge resize 未対応 |
| Dashboard | 4 | 3 | 4 | 4 | 2 | 3 | 軸5: streak / 累計が無い、軸6: drill-down 弱 |
| ItemEditDialog (基本) | 3 | 4 | 4 | 3 | 2 | 4 | 軸5: 保存時 feedback 控えめ |
| ItemEditDialog (サマリ) | 4 | 3 | 4 | 4 | 3 | 3 | scope A のみ完了、AI 要約・risk score まだ |
| ItemEditDialog (subtask) | 4 | 5 | 3 | 3 | 3 | 4 | 軸3: graphical 表示で情報量増 |
| ItemEditDialog (依存) | 3 | 3 | 4 | 4 | 1 | 3 | 軸5: 依存解消 chime 等 無し |
| Goals | 3 | 3 | 4 | 3 | 2 | 3 | 軸1: KR 進捗 chart 弱い (recharts 候補) |
| Sprints | 4 | 4 | 3 | 4 | 3 | 3 | 軸5: sprint burndown chart / 完了 celebration 未 |
| Workflow Editor | 1 | 2 | 2 | 3 | 1 | 3 | 軸1-2: JSON textarea のみ (React Flow 化 P0 別) |

→ 採点 1-2 の cell は **派生 P0 候補**。queue に view × 軸 単位で投入する (本 commit の queue update で実施)。

## iter-instruction の 6 軸統合

`scripts/autonomous/iter-instruction-autonomous.md` の commit body 規約に **6 軸該当部** を 1 行ずつ追加。

```
# 既存 (a-g)
- d 速度感: TanStack Query 楽観 update で drag end 即反映
- e 細部: focus ring sm + cursor grab/grabbing

# 追加 (6 軸): 該当軸のみ 1 行、4 個以下 (a-g と同様の濃度)
- 軸2 操作: bar の中央 drag で期間 shift (キーボード代替は ←→)
- 軸6 効率化: 1 操作で start+end 同時 update、confirm 不要
```

該当しない軸は書かない (n/a も書かない)。a-g と 6 軸 を **両方** 書く運用。
4 個以下に抑える理由は a-g と同じ (commit body の noise 抑制)。

## 派生 P0 (本 commit の queue update で投入)

採点 1-2 の cell から派生する P0 entry を `FEEDBACK_QUEUE.md` に追加 (各 view × 軸 単位):

1. **Today × 軸5 (やる気)** — 今日合計 / 残時間 / 進捗 bar / 累計完了 chip
2. **Inbox × 軸1 (可視化)** — タグ別 / プロジェクト別 / due 別 grouping toggle
3. **Kanban × 軸5 (やる気)** — done drop で confetti + 累計完了 chip
4. **Backlog × 軸5 (やる気)** — checkbox click で「片付いた」 micro-animation
5. **Dashboard × 軸5 (やる気)** — 連続完了 streak (3/5/7 日 マイルストーン)
6. **Gantt × 軸3 (認知低減)** — zoom level (日/週/月) の default smart 化、密度自動調整
7. **Workflow × 軸1-2** — React Flow graphical editor (queue 既存 entry と統合)
8. **Goals × 軸1 (可視化)** — KR 進捗 recharts chart (line / area / bullet)

各 P0 は別 iter で 1 commit 単位で消化。**本 commit では plan のみ、実装はしない**。

## 運用ルール

- 新機能 commit は body に **6 軸該当部** を 1 行ずつ書く (4 個以下、該当のみ)。a-g と併記。
- 採点 5 段階は 3 ヶ月ごとに見直す (各 view が 4 以上に届いたら、該当 cell を再評価)。
- 新 view を追加したら 6 軸採点 row を本 file に追加し、弱い軸を派生 P0 で投入する。
- 6 軸の **新規軸追加 / 削除 / 表現変更** はユーザの明示指示があるまで触らない (= 憲章は安定させる)。

## 関連

- `CLAUDE.md` の冒頭に 6 軸を「プロジェクト目的」として要約掲載
- `scripts/autonomous/iter-instruction-autonomous.md` の commit body 節で参照
- `FEEDBACK_QUEUE.md` の派生 P0 entry が view × 軸 単位で並ぶ
