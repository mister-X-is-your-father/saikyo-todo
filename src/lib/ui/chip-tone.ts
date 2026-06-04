/**
 * iter485 refactor: graphical 波及シリーズ (iter481/482/483) で 3 module に同 shape
 * の `TONE_CLASSES` map (5 段階 × Tailwind 3 軸) が散らばっていたのを集約。
 *
 * 散在状況 (iter485 集約直前):
 *   - `features/item/due-proximity.ts` (iter481) — DueProximityKind → 5 tone
 *   - `features/agent/cost-month-projection.ts` (iter482) — RiskLevel → 4 tone
 *   - `features/item/urgency.ts` (iter483) — UrgencyTier → 5 tone
 *
 * 全部「赤=danger / 橙強=urgent / 橙薄=warn / 青=info / 灰=idle」の 5 段階で
 * Tailwind class 値も完全に同じ (bg-rose-100/text-rose-700/ring-rose-300 等)。
 * 本 file に「ChipTone vocabulary + class map」を集約、各 caller 側は domain
 * 固有の `kind → tone` mapping だけを保持して `getChipToneClasses(tone)` に
 * 委譲する形に refactor。class 値の string 重複が 3 箇所 → 1 箇所に。
 *
 * iter360 集約方針 36 弾目 (前回 35 弾目 = iter480 MS_PER_DAY 集約)。
 *
 * 5 tone vocabulary:
 *  - 'danger' — rose、強警戒 (期限切れ / overdue / cost 超過 / urgency critical)
 *  - 'urgent' — amber 強、行動喚起 (今日 / urgency high)
 *  - 'warn'   — amber 薄、注意 (明日 / urgency medium / cost warn)
 *  - 'info'   — blue 薄、計画範囲内 (今週内 / urgency low / cost safe)
 *  - 'idle'   — slate 薄、対象外・計算不能 (期限なし / urgency none / projection idle)
 *
 * 既存 `lib/ui/trend-tone.ts` (trend chip) は polarity 切替 (up=good vs bad で配色
 * 反転) があり別軸の helper、本 file の `ChipTone` は severity 軸の絶対 token。
 */

/**
 * iter486 basics: 'success' tone を追加 (5 → 6 段階)。
 *  - severity 軸 (danger / urgent / warn / info / idle) は単調順
 *  - 'success' は **severity と直交する positive 軸** (達成 / 余裕 / 完了 / 健全)
 *  - 例: member-capacity 'free' (時間に余裕)、subtask-status 'done' (完了)、
 *    goal-progress (達成済)、sprint progress 'onTrack' 等
 */
export type ChipTone = 'danger' | 'urgent' | 'warn' | 'info' | 'idle' | 'success'

export interface ChipToneClasses {
  /** chip 背景の Tailwind class (例: `bg-rose-100`) */
  bgClass: string
  /** chip 文字色の Tailwind class (例: `text-rose-700`) */
  textClass: string
  /** ring / border の Tailwind class (focus / outline 用) */
  ringClass: string
}

// iter1531: TONE_CLASSES 6 tone × 3 軸 = 18 token は light 固定で iter1376/1493/1512-1530
// chip dark sweep からこぼれていた。central vocabulary 3 件目 (MUST iter1528 / status iter1529 /
// severity iter1530 と同 high-leverage 着地)。各 field に dark variant 併記。test (chip-tone.test.ts)
// は厳密 toBe 形式なので同 commit で expected strings を新 form に更新。
const TONE_CLASSES: Record<ChipTone, ChipToneClasses> = {
  danger: {
    bgClass: 'bg-rose-100 dark:bg-rose-950/40',
    textClass: 'text-rose-700 dark:text-rose-300',
    ringClass: 'ring-rose-300 dark:ring-rose-900/50',
  },
  urgent: {
    bgClass: 'bg-amber-100 dark:bg-amber-950/40',
    textClass: 'text-amber-800 dark:text-amber-200',
    ringClass: 'ring-amber-300 dark:ring-amber-900/50',
  },
  warn: {
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    textClass: 'text-amber-700 dark:text-amber-300',
    ringClass: 'ring-amber-200 dark:ring-amber-900/50',
  },
  info: {
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    textClass: 'text-blue-700 dark:text-blue-300',
    ringClass: 'ring-blue-200 dark:ring-blue-900/50',
  },
  idle: {
    bgClass: 'bg-slate-50 dark:bg-slate-900/30',
    textClass: 'text-slate-600 dark:text-slate-400',
    ringClass: 'ring-slate-200 dark:ring-slate-700/50',
  },
  success: {
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    ringClass: 'ring-emerald-200 dark:ring-emerald-900/50',
  },
}

/**
 * Tone token (5 段階) → Tailwind chip class 3 軸 (bg / text / ring) を 1 関数で。
 * caller domain の固有 `kind → tone` mapping を経由して呼ぶ想定:
 *
 *   import { getChipToneClasses } from '@/lib/ui/chip-tone'
 *   import { dueProximityTone } from '@/features/item/due-proximity'
 *
 *   const c = getChipToneClasses(dueProximityTone(kind))
 *   <div className={`${c.bgClass} ${c.textClass} ring-1 ${c.ringClass}`}>...</div>
 */
export function getChipToneClasses(tone: ChipTone): ChipToneClasses {
  return TONE_CLASSES[tone]
}

/**
 * iter488 basics: tone を「要対応度 (attention rank)」 数値に変換する pure helper。
 *
 * 用途: 「危ない順」「成功を最後に」 sort のための数値 key。caller が Array.sort
 * のキーとして使う想定。
 *
 * ランク (大きいほど「対応すべき」):
 *  - danger = 5 (赤、強警戒、最優先で見せる)
 *  - urgent = 4 (橙強、行動喚起)
 *  - warn   = 3 (橙薄、注意)
 *  - info   = 2 (青、計画範囲内)
 *  - idle   = 1 (灰、対象外・計算不能、UI 静か)
 *  - success = 0 (緑、達成 / 余裕、視覚で「完了」を最後に並べる)
 *
 * 注: severity 軸 (danger..idle) は単調順、success は positive 軸で「視覚的に静か」
 * だが「対応不要」の意味で最低ランクに置く (= 「要対応 sort」での一貫した最下位)。
 */
const TONE_ATTENTION_RANK: Record<ChipTone, number> = {
  danger: 5,
  urgent: 4,
  warn: 3,
  info: 2,
  idle: 1,
  success: 0,
}

export function chipToneAttentionRank(tone: ChipTone): number {
  return TONE_ATTENTION_RANK[tone]
}

/**
 * iter1761 basics: 1 tone が minTone 以上の attention rank を持つか判定する pure predicate。
 *
 * `chipToneAttentionRank(tone) >= chipToneAttentionRank(minTone)` の薄い semantic wrapper、
 * caller の手書き rank 比較を排除。`filterItemsByMinTone` (iter1698) / `someItemHasMinTone`
 * (iter1759) の内部 logic と同じ判定を「単一 tone × 単一 minTone」 で公開。
 *
 * 用途:
 *  - 1 個の signal/chip に対する gate (= 「この chip は警戒以上か?」)
 *  - JSX 条件 render (= `{isMinTone(tone, 'warn') && <Badge />}`)
 *  - tone-based 短絡条件 (= 「警戒以上なら danger color、それ以外は muted」)
 *
 * 仕様:
 *  - rank(tone) >= rank(minTone) → true、それ以外 → false
 *  - 同 tone → true (= minTone 自身は条件を満たす)
 *  - minTone='success' → 全 tone で true (= 最低 rank なので常に >=)
 *  - minTone='danger' → tone='danger' のみ true
 *
 * 既存 helper との関係:
 *  - `chipToneAttentionRank`: tone → number (= 内部 logic 公開)
 *  - `compareChipTones`: 2 tone の sort comparator (= -/+/0)
 *  - 本 helper: 単一 tone 対 minTone の boolean predicate (= 1 tone × 1 minTone gate)
 *  - `filterItemsByMinTone`: items 全体に対する filter (= N items × 1 minTone)
 *  - `someItemHasMinTone`: items 全体に対する some boolean (= 同上 short-circuit)
 */
export function isMinTone(tone: ChipTone, minTone: ChipTone): boolean {
  return TONE_ATTENTION_RANK[tone] >= TONE_ATTENTION_RANK[minTone]
}

/**
 * `Array.sort` のための comparator。a の attention rank が高い (= 危ない / 要対応) ほど
 * 前 (=index 小) に並ぶ。同 rank は元順保持 (stable sort 前提、Array.sort は ES2019+
 * 規約で stable)。
 *
 * 例: items.sort((a, b) => compareChipTones(toneOf(a), toneOf(b)))
 *     → danger > urgent > warn > info > idle > success の順で並ぶ
 */
export function compareChipTones(a: ChipTone, b: ChipTone): number {
  return TONE_ATTENTION_RANK[b] - TONE_ATTENTION_RANK[a]
}

/**
 * iter491 basics: tone を「ja-JP 1 単語ラベル」に変換する pure helper。
 *
 * 用途: SR aria-label / Slack 通知 ペイロード / AI brief 等で「(緊急対応)」
 * 「(注意)」「(達成)」のような **修飾語** を付与したい時、tone から直接ラベルが
 * 取れる (= caller の switch 文を排除)。
 *
 * 6 段階のラベル:
 *  - danger  → '緊急'  (= 即対応、強警戒)
 *  - urgent  → '要対応' (= 行動喚起、今日対応)
 *  - warn    → '注意'  (= 軽い警戒、明日対応)
 *  - info    → '通常'  (= 計画範囲内)
 *  - idle    → '対象外' (= 計算不能 / 未設定)
 *  - success → '達成'  (= 完了 / 余裕、positive 軸)
 *
 * 注: domain 固有ラベル (urgencyTier の '緊急/高/中/低/対象外'、dueProximity の
 * '期限切れ/今日/明日/今週内/今後/未設定') と衝突しないよう、本 helper は
 * **tone (= 視覚配色軸)** のラベル。caller は domain ラベルと組み合わせて使う:
 *   `${dueProximityLabel(kind)} (${chipToneLabelJa(dueProximityTone(kind))})`
 *   → '期限切れ (緊急)' / '今日 (要対応)' / '今週内 (通常)' 等
 */
const TONE_LABEL_JA: Record<ChipTone, string> = {
  danger: '緊急',
  urgent: '要対応',
  warn: '注意',
  info: '通常',
  idle: '対象外',
  success: '達成',
}

export function chipToneLabelJa(tone: ChipTone): string {
  return TONE_LABEL_JA[tone]
}

/**
 * iter493 basics: 任意 items 配列を ChipTone 別に件数集計する pure helper。
 * caller は getTone(item) で各 item の tone を返すだけ (= caller の domain 固有
 * tone helper を渡す: dueProximityTone / urgencyTierTone / memberCapacityTone 等)。
 *
 * 出力: 6 tone 全部 0 で初期化された Record (= caller は undefined check 不要、
 * Object.entries で安全にループ可)。
 */
export function countItemsByTone<T>(
  items: ReadonlyArray<T>,
  getTone: (item: T) => ChipTone,
): Record<ChipTone, number> {
  const counts: Record<ChipTone, number> = {
    danger: 0,
    urgent: 0,
    warn: 0,
    info: 0,
    idle: 0,
    success: 0,
  }
  for (const it of items) {
    counts[getTone(it)] += 1
  }
  return counts
}

const TONE_DISPLAY_ORDER: readonly ChipTone[] = [
  'danger',
  'urgent',
  'warn',
  'info',
  'idle',
  'success',
] as const

/**
 * tone counts を ja-JP 1 行 summary に整形 (chip / aria-label / AI brief 共通)。
 *  - 全部 0 → '0 件'
 *  - それ以外 → '緊急 3 / 要対応 5 / 注意 2 / 通常 8 / 達成 12' 形式 (0 件 tone は省略)
 *  - 順序: 危ない順 (danger → urgent → warn → info → idle → success)、
 *    iter488 chipToneAttentionRank と整合
 */
export function formatToneCountsJa(counts: Record<ChipTone, number>): string {
  const parts: string[] = []
  for (const tone of TONE_DISPLAY_ORDER) {
    const n = counts[tone]
    if (n > 0) parts.push(`${TONE_LABEL_JA[tone]} ${n}`)
  }
  if (parts.length === 0) return '0 件'
  return parts.join(' / ')
}

/**
 * iter496 basics: tones 配列から **最高 severity** (= 最も attention rank の高い) 1 tone を
 * 抽出する pure helper。
 *
 * 用途: 複数の domain tone を同時に持つ caller (例: 「Item は dueProximity=warn かつ
 * urgencyTier=danger」) で「カードの border tone はどれを採用するか」を一意に決めたい
 * 時、attention rank が最大 (= 最も危ない) tone を採る。
 *
 * 仕様:
 *  - 空配列 → null sentinel (= caller は chip 非表示判断)
 *  - 同 rank が複数 → 最初 (= 配列順) を採用 (stable)
 *  - rank 比較は `chipToneAttentionRank` (= danger=5 / urgent=4 / ... / success=0)
 *
 * 注: severity が高い = '対応が必要' という意味。'success' (rank=0、positive 軸)
 * と他 tone (severity 軸) が混在しても、severity 軸が常に prioritize される。
 *
 * iter1697 refactor: iter1423 で着地した `pickTopItemsByTone` (n=1) を identity getTone callback
 * で薄ラッパー化、手書き for-loop + best 更新の重複ロジックを排除。iter1425
 * `pickHighestSeveritySignal → pickTopSignalsBySeverity(n=1)` / iter1696
 * `pickWorstChecklistFinding → pickTopChecklistFindings(n=1)` 統一の chip-tone primitive 版。
 * stable sort semantics により「同 rank が複数なら入力順最初」 が `compareChipTones` (= rank 降順)
 * の stable sort で保証される (= 既存 17 test PASS で検証済)。
 */
export function pickHighestSeverityTone(tones: ReadonlyArray<ChipTone>): ChipTone | null {
  return pickTopItemsByTone(tones, (t) => t, 1)[0] ?? null
}

/**
 * iter1423 basics: 任意 items を tone 危ない順 (= attention rank 降順) で並べ替えた **新配列** を返す
 * pure helper。`countItemsByTone` (iter493) / `pickHighestSeverityTone` (iter496) と並ぶ
 * 「items × getTone callback」 pattern の sort 軸版。
 *
 * 仕様:
 *  - 入力 array を mutate せず、新配列を返す (= immutable)
 *  - 同 tone 内の元順を保持 (= stable、Array.sort ES2019+ 保証に依存)
 *  - 並び順は `compareChipTones` (= danger → urgent → warn → info → idle → success)
 *  - getTone は item ごと 1 回だけ呼ばれる (= caller が tone を memoize 済みでなくとも安全)
 *
 * 用途:
 *  - AI 朝 brief / Slack daily digest の「上位 N 件 alert」 headline 生成 (`pickTopItemsByTone` と組み合わせる)
 *  - dashboard 「危ない順」 list view (= 多数 item を tone 別 grouping せず 1 配列で並べたい)
 *  - chip 表示順を「常に danger 始まり」 で固定したい時の整列
 *
 * caller pattern:
 *   const sorted = sortItemsByTone(items, (it) => dueProximityTone(it.kind))
 *   // → sorted[0] は最も危ない item、tail に success
 *
 * `analyticsSignalsToArray` は domain 固有の表示順 (= concerningRole→costProjection→...) を
 * 採用しているため別経路。本 helper は「純粋に tone severity だけで並べる」 軸。
 */
export function sortItemsByTone<T>(items: ReadonlyArray<T>, getTone: (item: T) => ChipTone): T[] {
  return [...items].sort((a, b) => compareChipTones(getTone(a), getTone(b)))
}

/**
 * iter1423 basics: items を tone 危ない順で並べて先頭 N 件だけ抽出する pure helper。
 *
 * `sortItemsByTone` + `slice(0, n)` の薄ラッパー、caller が頻出する「top N alerts」
 * pattern を 1 関数化。
 *
 * 仕様:
 *  - n <= 0 → 空配列 (caller の defensive check 不要)
 *  - n >= items.length → 全件を sort して返す
 *  - 順序は `sortItemsByTone` と同 (= attention rank 降順、stable)
 *  - 入力 array を mutate せず、新配列を返す
 *
 * 用途:
 *  - AI 朝 brief 「上位 3 alert」 chip 列 (= analyticsSignalsToArray + 本 helper で n=3)
 *  - Slack daily digest 「最重要 3 件」 (`pickHighestSeveritySignal` は 1 件、本 helper は N 件)
 *  - dashboard 「最も危ない 5 件」 panel (= 全 item を tone 別表示せず top N で凝集)
 *
 * caller pattern:
 *   const top3 = pickTopItemsByTone(items, (it) => urgencyTierTone(it.tier), 3)
 *   // → 最も危ない 3 件を取得 (danger / urgent 優先、必要なら warn まで)
 */
export function pickTopItemsByTone<T>(
  items: ReadonlyArray<T>,
  getTone: (item: T) => ChipTone,
  n: number,
): T[] {
  if (n <= 0) return []
  return sortItemsByTone(items, getTone).slice(0, n)
}

/**
 * iter1431 basics: 任意 items を ChipTone 別の T[] に分配する pure helper。
 *
 * `countItemsByTone` (iter493) は **件数のみ** だが、本 helper は **items 自身** を
 * 6 tone 別 Record に分配。`analytics-signals.ts#groupSignalsByTone` (iter1428) の
 * AnalyticsSignals 特化版を、任意 items に generalize した chip-tone primitive。
 *
 * 仕様:
 *  - 6 tone (danger / urgent / warn / info / idle / success) すべての key を持つ Record
 *  - 該当 item 無し tone は空配列 (= caller の undefined check 不要)
 *  - 各 array 内の並び順は **入力 items の元順保持** (stable、走査順)
 *  - 入力 items を mutate しない
 *  - getTone は item ごと 1 回呼ばれる
 *
 * 用途:
 *  - dashboard 「tone 別 chip row layout」 (= 危ない行 / 注意行 / 達成行 を縦に並べる)
 *  - AI 朝 brief「重要度別 grouping」 出力
 *  - Slack daily digest「concerning / positive section 分離」
 *  - 任意 domain item の tone-faceted UI (= due-proximity item / urgency item / etc.)
 *
 * 既存 helper との関係:
 *  - `countItemsByTone`: tone 別件数 (= 集計のみ)
 *  - `sortItemsByTone`: 全 items を tone severity 順で 1 配列に (= tone は混在)
 *  - `pickTopItemsByTone`: 上位 N 件 (= severity 順 + 件数制限)
 *  - 本 helper: tone 別 **分配** (= 6 軸 grouping、UI 縦配置 / section 分離 向け)
 */
export function groupItemsByTone<T>(
  items: ReadonlyArray<T>,
  getTone: (item: T) => ChipTone,
): Record<ChipTone, T[]> {
  const grouped: Record<ChipTone, T[]> = {
    danger: [],
    urgent: [],
    warn: [],
    info: [],
    idle: [],
    success: [],
  }
  for (const it of items) {
    grouped[getTone(it)].push(it)
  }
  return grouped
}

/**
 * iter1698 basics: 任意 items を「`minTone` 以上の attention rank を持つ」 ものに filter する
 * pure helper。`analytics-signals.ts#filterSignalsByMinTone` (iter1427) の AnalyticsSignals 特化版
 * を、任意 items に generalize した chip-tone primitive。
 *
 * 仕様:
 *  - `minTone` 以上の attention rank を持つ item のみ通過 (= rank >= rank(minTone))
 *    例: minTone='warn' → danger / urgent / warn のみ通過 (info / idle / success は除外)
 *  - 並び順は **入力 items の元順保持** (stable、filter 走査順)
 *  - 入力 items を mutate しない、新配列を返す
 *  - getTone は item ごと 1 回呼ばれる
 *  - minTone='danger' → danger / urgent / warn / info / idle / success の attention rank と
 *    比較 (= success は rank=0 で最低、danger は rank=5 で最大)
 *
 * 用途:
 *  - dashboard 「警戒 item だけ」 chip 列 (= success/idle 除外で凝集表示)
 *  - AI 朝 brief 「警戒 signal だけ」 headline
 *  - Slack daily digest concerning section
 *  - 任意 domain item の「閾値以上だけ」 表示 (= due-proximity item / urgency item / etc.)
 *
 * 既存 helper との関係:
 *  - `pickTopItemsByTone`: 上位 N 件 (= severity 順、件数制限)
 *  - `sortItemsByTone`: 全 items を tone severity 順で 1 配列に
 *  - `groupItemsByTone`: tone 別 分配 (= 6 軸 grouping)
 *  - 本 helper: 閾値以上 filter (= 1 軸 threshold filter、件数制限なし)
 */
// iter1765 refactor: 手書き TONE_ATTENTION_RANK[...] >= minRank 比較を iter1761 着地
// `isMinTone(tone, minTone)` 経由に統一。tone rank 比較 logic を 1 関数 (isMinTone) に集約、
// 数値比較 boilerplate を排除 + semantic「閾値以上の tone か」 を読みやすく。
// minRank 事前計算は性能上の差が無視可 (Record lookup × N items)、iter1759 invariant test
// (= someItemHasMinTone === filterItemsByMinTone.length > 0) が継続 gate。
export function filterItemsByMinTone<T>(
  items: ReadonlyArray<T>,
  getTone: (item: T) => ChipTone,
  minTone: ChipTone,
): T[] {
  return items.filter((it) => isMinTone(getTone(it), minTone))
}

/**
 * iter1759 ai-automation: 任意 items に「`minTone` 以上の tone を持つ item が 1 個以上あるか」
 * を short-circuit boolean で返す pure helper。`filterItemsByMinTone(items, getTone, minTone).length > 0`
 * の short-circuit 最適化版 (= 配列構築コスト不要、最初の match で early return)。
 *
 * 仕様:
 *  - 1 個でも minTone 以上の item があれば true、なければ false
 *  - 入力 items を mutate しない
 *  - getTone は match するまで呼ばれる (= worst case items.length 回、best case 1 回)
 *  - 空配列入力 → false (= 「該当 item なし」)
 *
 * 用途:
 *  - UI gate (= 「警戒 chip section を render するかどうか」)
 *  - Slack notifier 「警戒 paragraph を post するかどうか」 gate
 *  - dashboard badge enabled/disabled 判定
 *
 * 既存 helper との関係:
 *  - `filterItemsByMinTone`: 全 match items を配列で返す (= 表示用)
 *  - 本 helper: 1 個以上あるか boolean (= gate 用、配列不要で perf 軽い)
 *  - `countItemsByTone`: tone 別 件数 (= 分布集計、本 helper より重い)
 */
// iter1765 refactor: 手書き rank 比較を iter1761 isMinTone primitive に統一 (filterItemsByMinTone
// と同 pattern)。short-circuit some semantics は不変、iter1759 invariant test
// (someItemHasMinTone === filterItemsByMinTone.length > 0 / iter1761 isMinTone 等価性) 継続 gate。
export function someItemHasMinTone<T>(
  items: ReadonlyArray<T>,
  getTone: (item: T) => ChipTone,
  minTone: ChipTone,
): boolean {
  return items.some((it) => isMinTone(getTone(it), minTone))
}
