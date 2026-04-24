import 'server-only'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'

import { dashboardRepository } from './repository'
import { type BurndownPoint, GetBurndownInputSchema, type MustSummary } from './schema'

function addDaysISO(base: Date, days: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const dashboardService = {
  async getMustSummary(workspaceId: string): Promise<MustSummary> {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const [items, wipLimit, wipInProgress] = await Promise.all([
        dashboardRepository.listMustItems(tx, workspaceId),
        dashboardRepository.findWipLimit(tx, workspaceId),
        dashboardRepository.countMustInProgress(tx, workspaceId),
      ])
      // today (UTC date)
      const today = new Date()
      const todayISO = today.toISOString().slice(0, 10)
      const soon = addDaysISO(today, 7)
      const yesterday = addDaysISO(today, -1)

      const [overdueCount, dueSoonCount] = await Promise.all([
        dashboardRepository.countOpenMustByDueRange(tx, workspaceId, null, yesterday),
        dashboardRepository.countOpenMustByDueRange(tx, workspaceId, todayISO, soon),
      ])
      const limit = wipLimit ?? 5
      return {
        items,
        wipLimit: limit,
        wipInProgress,
        wipExceeded: wipInProgress > limit,
        overdueCount,
        dueSoonCount,
      }
    })
  },

  async getBurndown(input: unknown): Promise<BurndownPoint[]> {
    const parsed = GetBurndownInputSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError('入力内容を確認してください', parsed.error)
    }
    const { workspaceId, days } = parsed.data
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await dashboardRepository.getBurndownSeries(tx, workspaceId, days)
    })
  },
}
