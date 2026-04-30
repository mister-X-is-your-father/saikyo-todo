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

### 2026-04-30 — Sprint 担当者 swim-lane Gantt ★ 新規 ★

- [ ] **Sprint ごとに 担当者を縦に並べる Gantt 風ビュー (誰が何を いつ するか)** — 分類: 実装要望 (中-大)
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

### 🔥 次 iter で即実装 (P0 最優先、track 判定より優先) 🔥

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
   - 仮置き判断: capacity = 8h/day 固定、見積無し item は「未見積 N 件」 chip で別表示
   - workspace home に panel 追加、avatar + 今日 chip + 今週 chip (ISO 週)
   - MUST 別カウントは scope B 以降、Slack 通知も別件

4. **Gantt DnD 期間編集** (詳細: 本ファイル下方、scope A から)
   - 仮置き判断: bar 中央 drag → 期間平行 shift のみ実装 (左右 edge / 依存連動は別 iter)
   - day 単位 snap、@dnd-kit で実装 (既導入)
   - 失敗時 ghost reset + toast、楽観ロック衝突は revert

5. **Sprint 担当者 swim-lane Gantt** (詳細: 本ファイル下方、scope A から)
   - 仮置き判断: sprint detail の inline disclosure (新 tab ではない)、未 assignee lane 表示
   - HTML/CSS grid (member × 日)、bar は `<div>` で width 計算
   - capacity 計算は workspace default 8h × N day (member 別は別件)

各 iter ルール:

- 1 commit が 30-150 行、scope A の最小実装で typecheck/lint clean
- shadcn UI (`src/components/ui/`) 編集禁止
- pure helper には test 1-2 件追加
- commit message: `feat|fix(<phase>): <一言> [iter<N> queue 1/1]` (track 名は `queue` で固定)
- 同 entry の scope A 完了後、scope B/C を **連続消化 OK** (1 entry 完遂まで他 entry に飛ばない、context 連続性のため)
- 3 連続失敗 (typecheck/lint/test 落ち) で次 entry に進む

5 件全部消化したら本 P0 section を「(空)」に戻す → track 判定に復帰。

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
