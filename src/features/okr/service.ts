/**
 * OKR Service:
 *   - goal CRUD + KR CRUD + assign item to KR + progress rollup
 *   - 進捗計算は KR の progress_mode に応じて分岐:
 *       items: 紐付き items の done 比
 *       manual: current_value / target_value
 *   - Goal 進捗 = KR 進捗 weighted average
 *   - audit_log を全 mutation で記録
 */
import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { itemRepository } from '@/features/item/repository'

import { goalRepository, keyResultRepository } from './repository'
import {
  type AssignItemToKeyResultInput,
  AssignItemToKeyResultInputSchema,
  type CreateGoalInput,
  CreateGoalInputSchema,
  type CreateKeyResultInput,
  CreateKeyResultInputSchema,
  type Goal,
  type GoalProgress,
  type KeyResult,
  type UpdateGoalInput,
  UpdateGoalInputSchema,
  type UpdateKeyResultInput,
  UpdateKeyResultInputSchema,
} from './schema'

export const okrService = {
  // -------- Goal --------
  async createGoal(input: unknown): Promise<Result<Goal>> {
    const parsed = CreateGoalInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data: CreateGoalInput = parsed.data
    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'member')
    return await withUserDb(user.id, async (tx) => {
      const created = await goalRepository.insert(tx, {
        workspaceId: data.workspaceId,
        title: data.title,
        description: data.description ?? null,
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'active',
        createdByActorType: 'user',
        createdByActorId: user.id,
      })
      await recordAudit(tx, {
        workspaceId: data.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'goal',
        targetId: created.id,
        action: 'create',
        after: created,
      })
      return ok(created)
    })
  },

  async updateGoal(input: unknown): Promise<Result<Goal>> {
    const parsed = UpdateGoalInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data: UpdateGoalInput = parsed.data
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await goalRepository.findById(tx, data.id)
      if (!before) return err(new NotFoundError('Goal が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      const updated = await goalRepository.updateWithLock(
        tx,
        data.id,
        data.expectedVersion,
        data.patch,
      )
      if (!updated) return err(new ConflictError())
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'goal',
        targetId: updated.id,
        action: 'update',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async listGoals(workspaceId: string): Promise<Result<Goal[]>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await goalRepository.listByWorkspace(tx, workspaceId)
      return ok(rows)
    })
  },

  // -------- KeyResult --------
  async createKeyResult(input: unknown): Promise<Result<KeyResult>> {
    const parsed = CreateKeyResultInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data: CreateKeyResultInput = parsed.data
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const goal = await goalRepository.findById(tx, data.goalId)
      if (!goal) return err(new NotFoundError('Goal が見つかりません'))
      await requireWorkspaceMember(goal.workspaceId, 'member')
      const created = await keyResultRepository.insert(tx, {
        goalId: data.goalId,
        title: data.title,
        progressMode: data.progressMode,
        targetValue:
          data.targetValue !== null && data.targetValue !== undefined
            ? data.targetValue.toString()
            : null,
        currentValue:
          data.currentValue !== null && data.currentValue !== undefined
            ? data.currentValue.toString()
            : null,
        unit: data.unit ?? null,
        weight: data.weight,
        position: data.position,
      })
      await recordAudit(tx, {
        workspaceId: goal.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'key_result',
        targetId: created.id,
        action: 'create',
        after: created,
      })
      return ok(created)
    })
  },

  async updateKeyResult(input: unknown): Promise<Result<KeyResult>> {
    const parsed = UpdateKeyResultInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data: UpdateKeyResultInput = parsed.data
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await keyResultRepository.findById(tx, data.id)
      if (!before) return err(new NotFoundError('KeyResult が見つかりません'))
      const goal = await goalRepository.findById(tx, before.goalId)
      if (!goal) return err(new NotFoundError('親 Goal が見つかりません'))
      await requireWorkspaceMember(goal.workspaceId, 'member')
      // numeric は string 化
      const patch: Record<string, unknown> = { ...data.patch }
      if (Object.prototype.hasOwnProperty.call(patch, 'targetValue')) {
        patch.targetValue =
          patch.targetValue === null || patch.targetValue === undefined
            ? null
            : (patch.targetValue as number).toString()
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'currentValue')) {
        patch.currentValue =
          patch.currentValue === null || patch.currentValue === undefined
            ? null
            : (patch.currentValue as number).toString()
      }
      const updated = await keyResultRepository.updateWithLock(
        tx,
        data.id,
        data.expectedVersion,
        patch,
      )
      if (!updated) return err(new ConflictError())
      await recordAudit(tx, {
        workspaceId: goal.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'key_result',
        targetId: updated.id,
        action: 'update',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async listAllKeyResultsByWorkspace(
    workspaceId: string,
  ): Promise<Result<Array<KeyResult & { goalTitle: string; goalStatus: string }>>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await keyResultRepository.listByWorkspace(tx, workspaceId)
      return ok(rows)
    })
  },

  async listKeyResults(goalId: string): Promise<Result<KeyResult[]>> {
    if (!goalId) return err(new ValidationError('goalId 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const goal = await goalRepository.findById(tx, goalId)
      if (!goal) return err(new NotFoundError('Goal が見つかりません'))
      await requireWorkspaceMember(goal.workspaceId, 'viewer')
      const rows = await keyResultRepository.listByGoal(tx, goalId)
      return ok(rows)
    })
  },

  /** Item を KR に割当 (null で解除)。Item と KR が同 ws であることを保証。 */
  async assignItemToKeyResult(
    input: unknown,
  ): Promise<Result<{ itemId: string; keyResultId: string | null }>> {
    const parsed = AssignItemToKeyResultInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data: AssignItemToKeyResultInput = parsed.data
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, data.itemId)
      if (!item) return err(new NotFoundError('Item が見つかりません'))
      await requireWorkspaceMember(item.workspaceId, 'member')
      if (data.keyResultId) {
        const kr = await keyResultRepository.findById(tx, data.keyResultId)
        if (!kr) return err(new NotFoundError('KeyResult が見つかりません'))
        const goal = await goalRepository.findById(tx, kr.goalId)
        if (!goal) return err(new NotFoundError('親 Goal が見つかりません'))
        if (goal.workspaceId !== item.workspaceId) {
          return err(new ValidationError('別 workspace の KR には割当できません'))
        }
      }
      const updated = await keyResultRepository.assignItem(tx, data.itemId, data.keyResultId)
      if (!updated) return err(new NotFoundError('Item の更新に失敗'))
      await recordAudit(tx, {
        workspaceId: item.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item',
        targetId: data.itemId,
        action: 'kr_assign',
        before: { keyResultId: item.keyResultId },
        after: { keyResultId: data.keyResultId },
      })
      return ok({ itemId: data.itemId, keyResultId: data.keyResultId })
    })
  },

  /** Goal の進捗集計 (KR ごとの計算 + weighted average)。 */
  async goalProgress(goalId: string): Promise<Result<GoalProgress>> {
    if (!goalId) return err(new ValidationError('goalId 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const goal = await goalRepository.findById(tx, goalId)
      if (!goal) return err(new NotFoundError('Goal が見つかりません'))
      await requireWorkspaceMember(goal.workspaceId, 'viewer')
      const krs = await keyResultRepository.listByGoal(tx, goalId)

      const krProgress: GoalProgress['keyResults'] = []
      for (const kr of krs) {
        let pct = 0
        let total = 0
        let done = 0
        if (kr.progressMode === 'items') {
          const p = await keyResultRepository.itemProgress(tx, kr.id)
          total = p.total
          done = p.done
          pct = total === 0 ? 0 : done / total
        } else {
          const cur = kr.currentValue !== null ? Number(kr.currentValue) : 0
          const tar = kr.targetValue !== null ? Number(kr.targetValue) : 0
          pct = tar === 0 ? 0 : Math.max(0, Math.min(1, cur / tar))
        }
        krProgress.push({
          krId: kr.id,
          title: kr.title,
          pct,
          itemsTotal: total,
          itemsDone: done,
          current: kr.currentValue !== null ? Number(kr.currentValue) : null,
          target: kr.targetValue !== null ? Number(kr.targetValue) : null,
          unit: kr.unit,
          weight: kr.weight,
        })
      }
      const weightSum = krProgress.reduce((acc, k) => acc + k.weight, 0)
      const goalPct =
        weightSum === 0 ? 0 : krProgress.reduce((acc, k) => acc + k.pct * k.weight, 0) / weightSum

      return ok({ goalId, pct: goalPct, keyResults: krProgress })
    })
  },
}
