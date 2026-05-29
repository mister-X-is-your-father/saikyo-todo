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

const TONE_CLASSES: Record<ChipTone, ChipToneClasses> = {
  danger: {
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-700',
    ringClass: 'ring-rose-300',
  },
  urgent: {
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    ringClass: 'ring-amber-300',
  },
  warn: {
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    ringClass: 'ring-amber-200',
  },
  info: {
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    ringClass: 'ring-blue-200',
  },
  idle: {
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-600',
    ringClass: 'ring-slate-200',
  },
  success: {
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    ringClass: 'ring-emerald-200',
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
 */
export function pickHighestSeverityTone(tones: ReadonlyArray<ChipTone>): ChipTone | null {
  if (tones.length === 0) return null
  let best: ChipTone = tones[0]!
  for (let i = 1; i < tones.length; i++) {
    const candidate = tones[i]!
    if (TONE_ATTENTION_RANK[candidate] > TONE_ATTENTION_RANK[best]) {
      best = candidate
    }
  }
  return best
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
