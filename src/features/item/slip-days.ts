/**
 * iter347 ai-automation: 期限超過 (`miss`) item の **slip 日数** を集計する pure helper。
 *
 * iter342 (`due-hit-rate.ts`、hit/miss の binary) の対称軸。「miss は何件あるか」だけ
 * でなく「平均 / 中央値 / 最大で何日 遅延しているか」を 1 関数で取り出す。50% hit
 * rate でも「miss は平均 1 日 遅れ」と「miss は平均 14 日 遅れ」では緊急度が桁違い。
 *
 * 仕様:
 *   - input: items 配列 ({doneAt, dueDate} の structural subset)
 *   - 集計対象: doneAt が dueDate ローカル 23:59:59.999 を超えた item
 *   - 除外: doneAt 未設定 / 不正 / dueDate 未設定 / 不正 ISO (fail-soft)
 *   - slipDays = ceil((doneAt - dueDateEnd) / 86400000)
 *     (= 当日終端から何日 遅れたか、最低 1 日 = 翌日完了)
 *   - options.since: doneAt >= since の item のみ集計 (window 指定)
 *   - 返り値:
 *       count = miss 件数
 *       avgDays = 平均 slip (count=0 → null)、小数 1 桁丸め
 *       medianDays = 中央値 slip (count=0 → null)、整数 (偶数件は中央 2 値の avg)
 *       maxDays = 最大 slip (count=0 → null)
 */

import { dueDateEndOfDayMs, parseDateOrNull } from '@/lib/date/iso'

export interface SlipDaysFields {
  doneAt: Date | string | null | undefined
  /** 'YYYY-MM-DD' ISO date */
  dueDate: string | null | undefined
}

export interface SlipDaysStats {
  count: number
  /** 平均 slip 日数。count=0 → null。小数 1 桁丸め */
  avgDays: number | null
  /** 中央値 slip 日数。count=0 → null。偶数件は中央 2 値の avg、小数 1 桁丸め */
  medianDays: number | null
  /** 最大 slip 日数。count=0 → null */
  maxDays: number | null
}

export interface ComputeSlipDaysOptions {
  /** doneAt >= since の item のみ集計。Date | ISO 文字列、不正値で全件 */
  since?: Date | string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const EMPTY: SlipDaysStats = { count: 0, avgDays: null, medianDays: null, maxDays: null }

// iter360 refactor: dueDateEndOfDayMs は lib/date/iso.ts に集約。

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function computeSlipDays<T extends SlipDaysFields>(
  items: readonly T[],
  options: ComputeSlipDaysOptions = {},
): SlipDaysStats {
  const sinceParsed = options.since !== undefined ? parseDateOrNull(options.since) : null
  const sinceMs = sinceParsed ? sinceParsed.getTime() : null

  const slips: number[] = []
  for (const it of items) {
    const done = parseDateOrNull(it.doneAt)
    if (!done) continue
    if (sinceMs !== null && done.getTime() < sinceMs) continue
    if (!it.dueDate) continue
    const dueEnd = dueDateEndOfDayMs(it.dueDate)
    if (dueEnd === null) continue
    if (done.getTime() <= dueEnd) continue
    const days = Math.ceil((done.getTime() - dueEnd) / MS_PER_DAY)
    slips.push(days)
  }

  if (slips.length === 0) return EMPTY

  const sorted = [...slips].sort((a, b) => a - b)
  const sum = slips.reduce((s, v) => s + v, 0)
  const count = slips.length
  const avgDays = round1(sum / count)
  const maxDays = sorted[sorted.length - 1] ?? 0
  const mid = Math.floor(count / 2)
  const medianDays =
    count % 2 === 1 ? sorted[mid]! : round1(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)

  return { count, avgDays, medianDays, maxDays }
}

/**
 * iter348 basics: slip 日数の severity (重度遅延 / 中程度) を 1 関数で判定。
 *
 * dashboard chip / AI brief の配色 (red = 重度 / amber = 中程度) を割り当てる
 * のに使う。閾値: maxDays >= 7 → 'severe' (1 週間以上の遅延)、それ未満 → 'mild'。
 * count=0 / maxDays=null は 'mild' (中立、empty caller は別途 chip 非表示で
 * 受ける想定)。
 */
export type SlipSeverity = 'severe' | 'mild'

export function slipSeverity(stats: SlipDaysStats): SlipSeverity {
  if (stats.count === 0 || stats.maxDays === null) return 'mild'
  return stats.maxDays >= 7 ? 'severe' : 'mild'
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'遅延: 5 件 (平均 3.4日 / 中央値 2日 / 最大 12日)'`
 *   `'遅延: 1 件 (1日)'` — 単一 miss は短縮形
 *   `'遅延 0 件'`
 */
export function formatSlipDaysJa(stats: SlipDaysStats): string {
  if (stats.count === 0) return '遅延 0 件'
  if (stats.count === 1) {
    return `遅延: 1 件 (${stats.maxDays}日)`
  }
  return `遅延: ${stats.count} 件 (平均 ${stats.avgDays}日 / 中央値 ${stats.medianDays}日 / 最大 ${stats.maxDays}日)`
}
