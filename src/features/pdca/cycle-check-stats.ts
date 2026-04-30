/**
 * iter534 (queue PDCA P-5 substrate): PDCA cycle Check phase の自動集計 widget の
 * pure data substrate。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 「PDCA mode 抜本再設計」 P-5):
 *   - cycle に紐付く items の lead time / 完了率 / 期日遅延 を deterministic に算出
 *   - widget は本 helper の output を直接 render、AI には Check 集計値を input として渡す
 *     (= 文章感想を AI に書かせない、actual_value 候補は人間+AI で確認)
 *   - retro-summary.ts (Sprint) と概念近いが scope が異なる:
 *     本 helper = 1 cycle の「実績集計」 (期間限定、平均 lead time 等)
 *     retro-summary = Sprint 全体の status 分布 + comparison
 *
 * 入力:
 *   - items: cycle 紐付き items (caller が pdca_cycle_items から事前 join 済を渡す)
 *   - cycleStartedAt / cycleEndedAt: cycle 期間の境界 (ISO 文字列 or Date)
 *
 * 出力:
 *   - 件数: total / done / cancelled / inProgressOrTodo
 *   - completionRate (round, total=0→0)
 *   - leadTimeAvgHours: done 済 item の 「createdAt → doneAt」 平均 (時間単位、null=計算不可)
 *   - leadTimeMedianHours: 中央値 (null=計算不可)
 *   - overdue: done 済 item で doneAt > dueDate なら late。残 active で dueDate < cycleEnd なら falling-behind
 *     - lateCompletionCount: 遅延完了
 *     - inFlightOverdueCount: 未完了で期限超過
 *   - cycleDurationDays: cycle 期間 (両端含む、最低 1)
 *
 * AI 不使用、副作用無し、依存無し。pure helper + Vitest 単体 test で網羅。
 */

export interface CycleCheckItemFields {
  id: string
  status: string | null | undefined
  /** ISO YYYY-MM-DD or null */
  dueDate?: string | null | undefined
  /** Date or string */
  createdAt: Date | string
  doneAt?: Date | string | null | undefined
}

export interface CycleCheckStats {
  total: number
  done: number
  cancelled: number
  /** todo + in_progress + blocked */
  inProgressOrTodo: number
  /** done / total *100 round、total=0→0 */
  completionRate: number
  /** done item の平均 lead time (時間)、計算不能なら null */
  leadTimeAvgHours: number | null
  /** done item の中央 lead time (時間)、計算不能なら null */
  leadTimeMedianHours: number | null
  /** done で doneAt > dueDate */
  lateCompletionCount: number
  /** active で dueDate < cycleEnd */
  inFlightOverdueCount: number
  /** cycle 期間 (両端含む、最低 1) */
  cycleDurationDays: number
}

export interface CycleCheckOptions {
  /** cycle 開始日 (ISO YYYY-MM-DD or Date)、未指定なら 1 周前を default */
  cycleStartedAt?: Date | string
  /** cycle 終了日 (ISO YYYY-MM-DD or Date)、未指定なら今日を default */
  cycleEndedAt?: Date | string
}

function parseDateLike(d: Date | string | null | undefined): Date | null {
  if (!d) return null
  if (d instanceof Date) {
    return Number.isFinite(d.getTime()) ? d : null
  }
  // ISO string、UTC midnight も許容するためそのまま new Date
  const v = new Date(d)
  return Number.isFinite(v.getTime()) ? v : null
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? null
  const a = sorted[mid - 1]
  const b = sorted[mid]
  if (a === undefined || b === undefined) return null
  return (a + b) / 2
}

export function buildCycleCheckStats(
  items: readonly CycleCheckItemFields[],
  options: CycleCheckOptions = {},
): CycleCheckStats {
  const cycleEnd = parseDateLike(options.cycleEndedAt) ?? new Date()
  const cycleStart =
    parseDateLike(options.cycleStartedAt) ?? new Date(cycleEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  const cycleDurationDays = Math.max(
    1,
    Math.round((cycleEnd.getTime() - cycleStart.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  )

  let done = 0
  let cancelled = 0
  let inProgressOrTodo = 0
  let lateCompletionCount = 0
  let inFlightOverdueCount = 0
  const leadTimes: number[] = []

  for (const it of items) {
    const status = it.status ?? ''
    if (status === 'cancelled') {
      cancelled += 1
      continue
    }
    if (status === 'done' || it.doneAt) {
      done += 1
      const created = parseDateLike(it.createdAt)
      const doneAt = parseDateLike(it.doneAt ?? null)
      if (created && doneAt) {
        const hours = (doneAt.getTime() - created.getTime()) / (60 * 60 * 1000)
        if (hours >= 0) leadTimes.push(hours)
      }
      // 遅延完了: doneAt > dueDate
      const dueDate = it.dueDate ? parseDateLike(`${it.dueDate}T23:59:59Z`) : null
      if (doneAt && dueDate && doneAt.getTime() > dueDate.getTime()) {
        lateCompletionCount += 1
      }
      continue
    }
    // active (todo / in_progress / blocked)
    inProgressOrTodo += 1
    const dueDate = it.dueDate ? parseDateLike(`${it.dueDate}T23:59:59Z`) : null
    if (dueDate && dueDate.getTime() < cycleEnd.getTime()) {
      inFlightOverdueCount += 1
    }
  }

  const total = items.length
  const completionRate = total === 0 ? 0 : Math.round((done / total) * 100)

  let leadTimeAvgHours: number | null = null
  let leadTimeMedianHours: number | null = null
  if (leadTimes.length > 0) {
    const sum = leadTimes.reduce((a, b) => a + b, 0)
    leadTimeAvgHours = Math.round((sum / leadTimes.length) * 10) / 10
    const sorted = [...leadTimes].sort((a, b) => a - b)
    const med = median(sorted)
    leadTimeMedianHours = med === null ? null : Math.round(med * 10) / 10
  }

  return {
    total,
    done,
    cancelled,
    inProgressOrTodo,
    completionRate,
    leadTimeAvgHours,
    leadTimeMedianHours,
    lateCompletionCount,
    inFlightOverdueCount,
    cycleDurationDays,
  }
}

// 内部 helper を test しやすく named export
export { median, parseDateLike }
