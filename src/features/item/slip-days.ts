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

import { dueDateEndOfDayMs, MS_PER_DAY, parseDateOrNull } from '@/lib/date/iso'
import { formatTitleDaysListJa } from '@/lib/format-list'

import { bucketByPriorityWith, formatPriorityBuckets, type PriorityKey } from './priority'

export interface SlipDaysFields {
  doneAt: Date | string | null | undefined
  /** 'YYYY-MM-DD' ISO date */
  dueDate: string | null | undefined
}

export interface SlipDaysByPriorityFields extends SlipDaysFields {
  priority: number | null | undefined
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

/**
 * iter387 ai-automation: priority 別の `SlipDaysStats` を計算する pure helper。
 *
 * iter344 due-hit-rate / iter362 dod-coverage / iter364 due-date-coverage /
 * iter372 combined-hygiene / iter382 hygiene-debt と並ぶ「× priority」軸 6 弾目。
 * AI brief / pm-agent / dashboard が「P1 が一番遅延、最大 14 日 / P3 平均 2 日」の
 * ように 高優先タスクの遅延を分離して可視化できる substrate。
 *
 * options.since は全 priority 共通で適用 (caller が「直近 30 日」 window を切る用)。
 */
export type SlipDaysByPriority = Record<PriorityKey, SlipDaysStats>

export function computeSlipDaysByPriority<T extends SlipDaysByPriorityFields>(
  items: readonly T[],
  options: ComputeSlipDaysOptions = {},
): SlipDaysByPriority {
  return bucketByPriorityWith(items, (group) => computeSlipDays(group, options))
}

/**
 * AI prompt 用 1 行サマリ (priority 別):
 *   `'遅延: P1 3 件 (最大 14日) / P3 2 件 (最大 5日)'`
 *
 * count=0 の priority は省略。全 priority count=0 → `'遅延 0 件'`。
 */
export function formatSlipDaysByPriorityJa(byPriority: SlipDaysByPriority): string {
  const body = formatPriorityBuckets(
    byPriority,
    (k, s) =>
      s.count === 0 || s.maxDays === null ? null : `P${k} ${s.count} 件 (最大 ${s.maxDays}日)`,
    '遅延 0 件',
  )
  return body === '遅延 0 件' ? body : `遅延: ${body}`
}

/** pickSlipDaysItems の戻り単 entry。item + 何日 遅延完了したか。 */
export interface SlipDaysEntry<T extends SlipDaysFields> {
  item: T
  /** doneAt - dueDateEnd を ceil(/MS_PER_DAY) で整数日数化、最低 1 日 */
  slipDays: number
}

/**
 * iter407 ai-automation: doneAt が dueDate を超えた items を実際に抽出して slipDays
 * desc で返す pure helper。iter379 (pickMustOverdueItems) / iter382
 * (pickOverdueActiveItems) と同シリーズ — slip-days 軸の "具体名 + 遅延日数" 取出 helper。
 *
 * computeSlipDays は stats (count / avg / median / max) のみだったが、AI 回顧 brief や
 * dashboard tooltip / pm-agent 学習 prompt で「具体的にどのタスクが何日 slip した」を
 * 見せたい時は items 一覧が必要。本 helper はその gap を埋める。
 *
 * 仕様 (computeSlipDays と filter ロジック互換):
 *   - doneAt 設定済 + dueDate valid ISO + doneAt > dueDateEnd
 *   - options.since: doneAt >= since の item のみ集計 (window 指定)
 *   - 並び: slipDays 降順 (= 最も遅延が大きい)、tie で元配列順 stable
 */
export function pickSlipDaysItems<T extends SlipDaysFields>(
  items: readonly T[],
  options: ComputeSlipDaysOptions = {},
): SlipDaysEntry<T>[] {
  const sinceParsed = options.since !== undefined ? parseDateOrNull(options.since) : null
  const sinceMs = sinceParsed ? sinceParsed.getTime() : null

  const enriched: { entry: SlipDaysEntry<T>; index: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it) continue
    const done = parseDateOrNull(it.doneAt)
    if (!done) continue
    if (sinceMs !== null && done.getTime() < sinceMs) continue
    if (!it.dueDate) continue
    const dueEnd = dueDateEndOfDayMs(it.dueDate)
    if (dueEnd === null) continue
    if (done.getTime() <= dueEnd) continue
    const slipDays = Math.ceil((done.getTime() - dueEnd) / MS_PER_DAY)
    enriched.push({ entry: { item: it, slipDays }, index: i })
  }
  enriched.sort((a, b) => {
    if (b.entry.slipDays !== a.entry.slipDays) return b.entry.slipDays - a.entry.slipDays
    return a.index - b.index
  })
  return enriched.map((e) => e.entry)
}

/** caller の slip item に title が含まれる場合の structural subset。 */
export type SlipDaysWithTitle = SlipDaysFields & { title?: string | null }

/**
 * AI 回顧 brief / dashboard tooltip 用 1 行サマリ (title list 付き):
 *   `'遅延完了: 提出書類 14日 / 報告 5日 / 他 1 件'`
 *   `'遅延完了 0 件'`
 *
 * iter379 formatMustOverdueTitlesJa / iter382 formatOverdueActiveTitlesJa と同
 * vocabulary、prefix を '遅延完了' に差し替え (= 過去形 = retrospective 軸)。
 */
export function formatSlipDaysTitlesJa<T extends SlipDaysWithTitle>(
  entries: readonly SlipDaysEntry<T>[],
  limit: number = 3,
): string {
  return formatTitleDaysListJa(entries, (e) => e.slipDays, '遅延完了', limit)
}
