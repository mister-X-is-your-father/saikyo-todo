/**
 * Phase 6.15 iter108: 個人 (user 単位) の Daily / Weekly / Monthly ゴール。
 * - workspace_member であれば誰でも自分の goal を読み書きできる
 * - 同一 (workspace, user, period, periodKey) は 1 行 (DB unique constraint)
 * - 楽観ロック: 既存があれば expectedVersion 一致で更新、無ければ insert
 */
import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { personalPeriodGoalRepository } from './repository'
import { GetGoalInputSchema, type PersonalPeriodGoal, UpsertGoalInputSchema } from './schema'

export const personalPeriodGoalService = {
  async get(input: unknown): Promise<Result<PersonalPeriodGoal | null>> {
    const parsed = GetGoalInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const row = await personalPeriodGoalRepository.findOne(tx, {
        workspaceId: data.workspaceId,
        userId: user.id,
        period: data.period,
        periodKey: data.periodKey,
      })
      return ok(row)
    })
  },

  async upsert(input: unknown): Promise<Result<PersonalPeriodGoal>> {
    const parsed = UpsertGoalInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'viewer')

    return await withUserDb(user.id, async (tx) => {
      const existing = await personalPeriodGoalRepository.findOne(tx, {
        workspaceId: data.workspaceId,
        userId: user.id,
        period: data.period,
        periodKey: data.periodKey,
      })

      if (!existing) {
        if (data.expectedVersion !== 0) return err(new ConflictError())
        const row = await personalPeriodGoalRepository.insert(tx, {
          workspaceId: data.workspaceId,
          userId: user.id,
          period: data.period,
          periodKey: data.periodKey,
          text: data.text,
        })
        await recordAudit(tx, {
          workspaceId: data.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'personal_period_goal',
          targetId: row.id,
          action: 'create',
          after: row,
        })
        return ok(row)
      }

      const updated = await personalPeriodGoalRepository.updateWithLock(
        tx,
        existing.id,
        data.expectedVersion,
        data.text,
      )
      if (!updated) return err(new ConflictError())
      await recordAudit(tx, {
        workspaceId: data.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'personal_period_goal',
        targetId: updated.id,
        action: 'update',
        before: existing,
        after: updated,
      })
      return ok(updated)
    })
  },
}
