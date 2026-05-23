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
import { MS_PER_DAY, MS_PER_HOUR, parseDateOrNull } from '@/lib/date/iso'
import { rateToPct } from '@/lib/format-rate'
import { round1 } from '@/lib/round-decimal'

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

// iter490 refactor: parseDate 系の重複を `lib/date/iso.ts#parseDateOrNull` に集約 (38 弾目)。
// 既存の test ('parseDateLike' を import) を維持するため public alias で re-export 維持。
const parseDateLike = parseDateOrNull

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
    parseDateLike(options.cycleStartedAt) ?? new Date(cycleEnd.getTime() - 7 * MS_PER_DAY)

  const cycleDurationDays = Math.max(
    1,
    Math.round((cycleEnd.getTime() - cycleStart.getTime()) / MS_PER_DAY) + 1,
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
        // iter1145 refactor: 旧 inline `60 * 60 * 1000` を `MS_PER_HOUR` に集約
        const hours = (doneAt.getTime() - created.getTime()) / MS_PER_HOUR
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
  const completionRate = total === 0 ? 0 : rateToPct(done / total)

  let leadTimeAvgHours: number | null = null
  let leadTimeMedianHours: number | null = null
  if (leadTimes.length > 0) {
    const sum = leadTimes.reduce((a, b) => a + b, 0)
    leadTimeAvgHours = round1(sum / leadTimes.length)
    const sorted = [...leadTimes].sort((a, b) => a - b)
    const med = median(sorted)
    leadTimeMedianHours = med === null ? null : round1(med)
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

/**
 * iter547 ai-automation polish: cycle Check 完了率 → SeverityChip tone bind。
 * SprintRetro completionRateSeverity と同 thresholds (75/50/25) で揃える。
 */
export function cycleCheckSeverity(stats: CycleCheckStats): 'ok' | 'info' | 'warn' | 'danger' {
  if (stats.total === 0) return 'warn' // empty cycle = まだ何も書かれてない、注意促す
  if (stats.completionRate >= 75) return 'ok'
  if (stats.completionRate >= 50) return 'info'
  if (stats.completionRate >= 25) return 'warn'
  return 'danger'
}

/**
 * iter540 ai-automation polish: AI prompt / chip aria-label / Slack 通知用 1 行 cycle
 * Check status summary。
 *   '完了率 80% (4/5) — 平均 lead 12h / 遅延完了 1 / 期限内 active 0'
 *   '完了率 0% (0/0) — 完了 item なし'  (= total=0 / done=0)
 *
 * 詳細値 (median / cycleDurationDays / cancelled) は widget 側で別表示する想定。
 */
export function formatCycleCheckStatsJa(stats: CycleCheckStats): string {
  if (stats.total === 0) return '完了率 0% (0/0) — 完了 item なし'
  const lead = stats.leadTimeAvgHours === null ? '未計測' : `${stats.leadTimeAvgHours}h`
  return (
    `完了率 ${stats.completionRate}% (${stats.done}/${stats.total}) — ` +
    `平均 lead ${lead} / 遅延完了 ${stats.lateCompletionCount} / ` +
    `期限内 active ${stats.inFlightOverdueCount}`
  )
}

/**
 * iter1013 basics: PDCA cycle が「健全なペース」 か「危険」 か 1 行で要約する compact chip。
 *
 * 既存 `formatCycleCheckStatsJa` は詳細サマリ (= 完了率 + lead + 遅延 + active overdue) で
 * 4 軸を 1 行に並べるが、dashboard top の小型 chip では「severity ラベル + 完了率 + total」
 * の 3 軸だけで十分。本 helper は cycleCheckSeverity と `completionRate / total` を
 * 短く整形した compact 版。
 *
 * 出力例:
 *   - '進行 80% (4/5)'    (severity='ok' / 'info'、健全)
 *   - '注意 30% (3/10)'   (severity='warn'、completionRate < 50)
 *   - '危険 10% (1/10)'   (severity='danger'、completionRate < 25)
 *   - '空 cycle'           (total=0、まだ item 紐付けなし)
 *
 * 用途:
 *   - PdcaCycleCard header chip (1 chip 5 文字以内目標)
 *   - Slack daily digest 「進行中 cycle: <title> ${formatCycleCheckCompactJa}」
 *   - AI prompt 「cycle ヘルス 1 行」 context
 */
export function formatCycleCheckCompactJa(stats: CycleCheckStats): string {
  if (stats.total === 0) return '空 cycle'
  const sev = cycleCheckSeverity(stats)
  const headLabel: Record<typeof sev, string> = {
    ok: '順調',
    info: '進行',
    warn: '注意',
    danger: '危険',
  }
  return `${headLabel[sev]} ${stats.completionRate}% (${stats.done}/${stats.total})`
}

// 内部 helper を test しやすく named export
export { median, parseDateLike }
