/**
 * iter312 ai-automation: 指定期間 [start, end] に「完了した item」/「追加された item」
 * を集計する pure helper。
 *
 * Sprint retro / 週次 review / OKR 期間終了時の AI brief が「この期間で N 件完了 /
 * M 件追加 / 平均所要 K 日」を 1 関数で取り出せる substrate。今までは
 *   - retro-doc-service が SQL で集計
 *   - dashboard widget が独自 inline filter
 * と 2 系統に散らばっていた → pure 関数として固定し prompt や UI で再利用可能に。
 *
 * 仕様:
 *  - period: `{ from: 'YYYY-MM-DD' or RFC3339, to: 同 }`、両端 inclusive
 *  - itemsCompleted = `doneAt in [from, to]` の件数 (archive 済も含める = 履歴は消えない)
 *  - mustCompletedCount = うち isMust=true
 *  - itemsAdded = `createdAt in [from, to]` の件数
 *  - avgCompletionDays = `doneAt - createdAt` の平均日数 (完了 item のみ、createdAt 不正は除外)、
 *    完了 0 件なら null
 *  - 不正 ISO / 不正 doneAt/createdAt は集計から除外 (fail-soft)
 *  - from > to の場合は全 0 + null
 */
import { MS_PER_DAY, parseDateOrNull } from '@/lib/date/iso'

/** 期間集計に必要な Item の structural subset。 */
export interface PeriodCompletionFields {
  isMust?: boolean
  doneAt: Date | string | null | undefined
  createdAt: Date | string | null | undefined
  archivedAt?: Date | string | null | undefined
}

export interface PeriodCompletionInput {
  /** 'YYYY-MM-DD' or RFC3339 */
  from: string
  /** 'YYYY-MM-DD' or RFC3339 */
  to: string
}

export interface PeriodCompletionSummary {
  /** 完了 item 件数 (期間内 doneAt) */
  itemsCompleted: number
  /** うち MUST */
  mustCompletedCount: number
  /** 期間内 createdAt の item 件数 */
  itemsAdded: number
  /** 完了 item の avg(doneAt - createdAt) 日数 (round 1 桁)、0 件は null */
  avgCompletionDays: number | null
  /** 期間幅 (両端 inclusive、最低 1) */
  periodDays: number
}

export function summarizePeriodCompletion<T extends PeriodCompletionFields>(
  items: readonly T[],
  period: PeriodCompletionInput,
): PeriodCompletionSummary {
  const fromDate = parseDateOrNull(period.from)
  const toDate = parseDateOrNull(period.to)
  if (!fromDate || !toDate || fromDate.getTime() > toDate.getTime()) {
    return {
      itemsCompleted: 0,
      mustCompletedCount: 0,
      itemsAdded: 0,
      avgCompletionDays: null,
      periodDays: fromDate && toDate ? Math.max(1, daysSpan(fromDate, toDate)) : 1,
    }
  }
  // to 側は「その日の終わり (23:59:59)」まで含める
  const toEnd = new Date(toDate.getTime() + MS_PER_DAY - 1)
  const periodDays = Math.max(1, daysSpan(fromDate, toDate))

  let itemsCompleted = 0
  let mustCompletedCount = 0
  let itemsAdded = 0
  let totalCompletionMs = 0
  let completedWithCreatedCount = 0

  for (const it of items) {
    const doneAt = parseDateOrNull(it.doneAt)
    if (doneAt && doneAt.getTime() >= fromDate.getTime() && doneAt.getTime() <= toEnd.getTime()) {
      itemsCompleted += 1
      if (it.isMust) mustCompletedCount += 1
      const createdAt = parseDateOrNull(it.createdAt)
      if (createdAt && createdAt.getTime() <= doneAt.getTime()) {
        totalCompletionMs += doneAt.getTime() - createdAt.getTime()
        completedWithCreatedCount += 1
      }
    }
    const createdAt = parseDateOrNull(it.createdAt)
    if (
      createdAt &&
      createdAt.getTime() >= fromDate.getTime() &&
      createdAt.getTime() <= toEnd.getTime()
    ) {
      itemsAdded += 1
    }
  }

  const avgCompletionDays =
    completedWithCreatedCount === 0
      ? null
      : Math.round((totalCompletionMs / completedWithCreatedCount / MS_PER_DAY) * 10) / 10

  return { itemsCompleted, mustCompletedCount, itemsAdded, avgCompletionDays, periodDays }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `直近 7 日: 完了 12 件 (MUST 3) / 新規追加 5 件 / 平均所要 3.2 日`
 *   `直近 7 日: 完了 0 件 / 新規追加 2 件`
 *   `直近 0 日: (集計なし)`
 */
export function formatPeriodCompletion(s: PeriodCompletionSummary): string {
  if (s.periodDays <= 0) return '直近 0 日: (集計なし)'
  const head = `直近 ${s.periodDays} 日`
  if (s.itemsCompleted === 0 && s.itemsAdded === 0) return `${head}: 完了 0 件 / 新規追加 0 件`
  const parts: string[] = []
  if (s.itemsCompleted > 0) {
    parts.push(
      s.mustCompletedCount > 0
        ? `完了 ${s.itemsCompleted} 件 (MUST ${s.mustCompletedCount})`
        : `完了 ${s.itemsCompleted} 件`,
    )
  } else {
    parts.push(`完了 0 件`)
  }
  parts.push(`新規追加 ${s.itemsAdded} 件`)
  if (s.avgCompletionDays !== null) {
    parts.push(`平均所要 ${s.avgCompletionDays} 日`)
  }
  return `${head}: ${parts.join(' / ')}`
}

function daysSpan(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime()
  return Math.floor(diffMs / MS_PER_DAY) + 1
}
