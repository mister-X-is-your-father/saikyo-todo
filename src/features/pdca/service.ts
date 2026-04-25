/**
 * PDCA dashboard (Phase 5.4):
 *   - Plan / Do / Check / Act の件数集計
 *   - Lead time (createdAt → doneAt) の avg / p50 / p95
 *   - 日次 throughput (完了件数 per day in period)
 *
 * mapping:
 *   - Plan: status='todo' (まだ着手してない)
 *   - Do: status='in_progress'
 *   - Check: status='done' で doneAt が period_to の 7 日以内
 *   - Act: status='done' で doneAt が 7 日より前 (cycle 完了済、改善実施中)
 *
 * period 既定: 過去 30 日。UI 側で from/to を変えられる。
 */
import 'server-only'

import { and, eq, gte, isNotNull, isNull, lte, sql } from 'drizzle-orm'

import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { items } from '@/lib/db/schema'
import { withUserDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

export interface PdcaSummary {
  /** 集計対象期間 (ISO YYYY-MM-DD) */
  from: string
  to: string
  /** 4 状態の件数 (todo/in_progress/done) — done は from-to 期間内に doneAt があるもののみ */
  counts: { plan: number; do: number; check: number; act: number }
  /** lead time = doneAt - createdAt の日数 (period 内に done になった item で集計) */
  leadTimeDays: { avg: number; p50: number; p95: number; n: number }
  /** 日次 throughput (period 内、各日に done になった件数) */
  daily: Array<{ date: string; done: number }>
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.ceil((p / 100) * sortedAsc.length) - 1
  return sortedAsc[Math.max(0, Math.min(sortedAsc.length - 1, idx))]!
}

function dateAddDays(d: Date, days: number): Date {
  const n = new Date(d)
  n.setUTCDate(n.getUTCDate() + days)
  return n
}

export const pdcaService = {
  async summary(
    workspaceId: string,
    options: { from?: string; to?: string; checkWindowDays?: number } = {},
  ): Promise<Result<PdcaSummary>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')

    const today = new Date()
    const to = options.to
      ? new Date(`${options.to}T00:00:00Z`)
      : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const from = options.from ? new Date(`${options.from}T00:00:00Z`) : dateAddDays(to, -29)
    if (from > to) return err(new ValidationError('from は to 以前'))
    const checkWindow = options.checkWindowDays ?? 7
    const checkBoundary = dateAddDays(to, -checkWindow + 1)

    return await withUserDb(user.id, async (tx) => {
      // 1. Plan / Do の件数 (status='todo' / 'in_progress' で active な item)
      const planDoRows = await tx
        .select({
          status: items.status,
          count: sql<number>`count(*)::int`,
        })
        .from(items)
        .where(
          and(
            eq(items.workspaceId, workspaceId),
            isNull(items.deletedAt),
            sql`${items.status} IN ('todo', 'in_progress')`,
          ),
        )
        .groupBy(items.status)
      const planDoMap = new Map(planDoRows.map((r) => [r.status, r.count]))

      // 2. Check / Act 件数 + lead time + daily throughput (period 内 done)
      const doneInPeriod = await tx
        .select({
          createdAt: items.createdAt,
          doneAt: items.doneAt,
        })
        .from(items)
        .where(
          and(
            eq(items.workspaceId, workspaceId),
            isNull(items.deletedAt),
            eq(items.status, 'done'),
            isNotNull(items.doneAt),
            gte(items.doneAt, from),
            lte(items.doneAt, dateAddDays(to, 1)), // to の 23:59:59 まで含める
          ),
        )

      let checkCount = 0
      let actCount = 0
      const leadTimes: number[] = []
      const daily = new Map<string, number>()

      for (const row of doneInPeriod) {
        if (!row.doneAt) continue
        const doneISO = toISO(row.doneAt)
        daily.set(doneISO, (daily.get(doneISO) ?? 0) + 1)
        const lead = (row.doneAt.getTime() - row.createdAt.getTime()) / (24 * 60 * 60 * 1000)
        leadTimes.push(Math.max(0, lead))
        if (row.doneAt >= checkBoundary) checkCount += 1
        else actCount += 1
      }

      const sortedLead = [...leadTimes].sort((a, b) => a - b)
      const avg =
        sortedLead.length === 0 ? 0 : sortedLead.reduce((a, b) => a + b, 0) / sortedLead.length
      const p50 = percentile(sortedLead, 50)
      const p95 = percentile(sortedLead, 95)

      // daily: from-to の連続配列を生成 (空の日も 0 で埋める)
      const dailyArr: Array<{ date: string; done: number }> = []
      for (let d = new Date(from); d <= to; d = dateAddDays(d, 1)) {
        const iso = toISO(d)
        dailyArr.push({ date: iso, done: daily.get(iso) ?? 0 })
      }

      return ok({
        from: toISO(from),
        to: toISO(to),
        counts: {
          plan: planDoMap.get('todo') ?? 0,
          do: planDoMap.get('in_progress') ?? 0,
          check: checkCount,
          act: actCount,
        },
        leadTimeDays: {
          avg: Math.round(avg * 10) / 10,
          p50: Math.round(p50 * 10) / 10,
          p95: Math.round(p95 * 10) / 10,
          n: leadTimes.length,
        },
        daily: dailyArr,
      })
    })
  },
}
