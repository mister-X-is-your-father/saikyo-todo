import 'server-only'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { formatUtcISO, shiftIsoDate } from '@/lib/date/iso'
import { withUserDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'

import { dashboardRepository } from './repository'
import { type BurndownPoint, GetBurndownInputSchema, type MustSummary } from './schema'

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
      const todayISO = formatUtcISO(new Date())
      const soon = shiftIsoDate(todayISO, 7)
      const yesterday = shiftIsoDate(todayISO, -1)

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
