'use server'

import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { BurndownPoint, GetBurndownInput, MustSummary } from './schema'
import { dashboardService } from './service'

export async function getMustSummaryAction(workspaceId: string): Promise<Result<MustSummary>> {
  try {
    const summary = await dashboardService.getMustSummary(workspaceId)
    return ok(summary)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function getBurndownAction(input: GetBurndownInput): Promise<Result<BurndownPoint[]>> {
  try {
    const points = await dashboardService.getBurndown(input)
    return ok(points)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
