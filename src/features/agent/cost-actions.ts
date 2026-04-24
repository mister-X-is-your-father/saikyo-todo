'use server'

import { actionWrap } from '@/lib/action-wrap'
import { type Result } from '@/lib/result'

import { getMonthlyCost, type MonthlyCostRow } from './cost-aggregate'

export async function getMonthlyCostAction(
  workspaceId: string,
  months = 12,
): Promise<Result<MonthlyCostRow[]>> {
  return await actionWrap(() => getMonthlyCost(workspaceId, months))
}
