'use server'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { actionWrap } from '@/lib/action-wrap'
import { recordAudit } from '@/lib/audit'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { workspaceSettings } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { getMonthlyCost, type MonthlyCostRow } from './cost-aggregate'
import { type BudgetStatus, getBudgetStatus } from './cost-budget'

export async function getMonthlyCostAction(
  workspaceId: string,
  months = 12,
): Promise<Result<MonthlyCostRow[]>> {
  return await actionWrap(() => getMonthlyCost(workspaceId, months))
}

export async function getBudgetStatusAction(workspaceId: string): Promise<Result<BudgetStatus>> {
  return await actionWrap<BudgetStatus>(async () => {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    await requireWorkspaceMember(workspaceId, 'viewer')
    const status = await getBudgetStatus(workspaceId)
    return ok(status)
  })
}

const UpdateMonthlyCostLimitInputSchema = z.object({
  workspaceId: z.string().uuid(),
  /** USD。null で無制限化 */
  monthlyCostLimitUsd: z.number().nonnegative().nullable(),
  /** 0..1。default は変更しない */
  costWarnThresholdRatio: z.number().min(0).max(1).optional(),
})

/**
 * 月次コスト上限を更新する。member 以上で操作可。
 * audit_log に before / after を残す。
 */
export async function updateMonthlyCostLimitAction(
  input: unknown,
): Promise<Result<{ workspaceId: string }>> {
  return await actionWrap<{ workspaceId: string }>(async () => {
    const parsed = UpdateMonthlyCostLimitInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const { workspaceId, monthlyCostLimitUsd, costWarnThresholdRatio } = parsed.data
    const { user } = await requireWorkspaceMember(workspaceId, 'member')

    await adminDb.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, workspaceId))
      const patch: Record<string, unknown> = {
        monthlyCostLimitUsd: monthlyCostLimitUsd === null ? null : monthlyCostLimitUsd.toFixed(2),
      }
      if (costWarnThresholdRatio !== undefined) {
        patch.costWarnThresholdRatio = costWarnThresholdRatio.toFixed(2)
      }
      await tx
        .update(workspaceSettings)
        .set(patch)
        .where(eq(workspaceSettings.workspaceId, workspaceId))
      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'workspace_settings',
        targetId: workspaceId,
        action: 'cost_limit_update',
        before: {
          monthlyCostLimitUsd: before?.monthlyCostLimitUsd ?? null,
          costWarnThresholdRatio: before?.costWarnThresholdRatio ?? null,
        },
        after: { monthlyCostLimitUsd, costWarnThresholdRatio },
      })
    })
    return ok({ workspaceId })
  })
}
