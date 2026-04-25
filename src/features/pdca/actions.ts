'use server'

import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import { pdcaService, type PdcaSummary } from './service'

export async function pdcaSummaryAction(
  workspaceId: string,
  options: { from?: string; to?: string; checkWindowDays?: number } = {},
): Promise<Result<PdcaSummary>> {
  try {
    return await pdcaService.summary(workspaceId, options)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
