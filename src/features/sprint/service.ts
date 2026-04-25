/**
 * Sprint Service:
 *   - create / update / changeStatus / list / get / assignItem
 *   - status の遷移は ChangeSprintStatusInput で受け取り、active 化は同 workspace で
 *     1 つだけという DB partial unique index に任せる (UniqueViolation を ConflictError に変換)
 *   - audit_log: create / update / changeStatus / assignItem を記録
 *   - 物理削除はしない (status='cancelled' で代替)
 */
import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { enqueueJob } from '@/lib/jobs/queue'
import { err, ok, type Result } from '@/lib/result'

import { itemRepository } from '@/features/item/repository'

import { sprintRepository } from './repository'
import {
  type AssignItemToSprintInput,
  AssignItemToSprintInputSchema,
  type ChangeSprintStatusInput,
  ChangeSprintStatusInputSchema,
  type CreateSprintInput,
  CreateSprintInputSchema,
  type Sprint,
  type UpdateSprintInput,
  UpdateSprintInputSchema,
} from './schema'

function isUniqueViolation(e: unknown): boolean {
  // drizzle が PostgresError を DrizzleQueryError でラップすることがあるので
  // cause も見る + message に sprints_active_uniq を含むかも fallback
  if (e == null) return false
  const obj = e as { code?: string; cause?: unknown; message?: string }
  if (obj.code === '23505') return true
  if (obj.cause && isUniqueViolation(obj.cause)) return true
  if (typeof obj.message === 'string' && obj.message.includes('sprints_active_uniq')) return true
  return false
}

export const sprintService = {
  async create(input: unknown): Promise<Result<Sprint>> {
    const parsed = CreateSprintInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data: CreateSprintInput = parsed.data

    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const created = await sprintRepository.insert(tx, {
        workspaceId: data.workspaceId,
        name: data.name,
        goal: data.goal ?? null,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'planning',
        createdByActorType: 'user',
        createdByActorId: user.id,
      })
      await recordAudit(tx, {
        workspaceId: data.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'sprint',
        targetId: created.id,
        action: 'create',
        after: created,
      })
      return ok(created)
    })
  },

  async update(input: unknown): Promise<Result<Sprint>> {
    const parsed = UpdateSprintInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data: UpdateSprintInput = parsed.data

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await sprintRepository.findById(tx, data.id)
      if (!before) return err(new NotFoundError('Sprint が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')

      const updated = await sprintRepository.updateWithLock(
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
        targetType: 'sprint',
        targetId: updated.id,
        action: 'update',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async changeStatus(input: unknown): Promise<Result<Sprint>> {
    const parsed = ChangeSprintStatusInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data: ChangeSprintStatusInput = parsed.data

    const user = await requireUser()
    let result: Result<Sprint>
    try {
      result = await withUserDb(user.id, async (tx) => {
        const before = await sprintRepository.findById(tx, data.id)
        if (!before) return err(new NotFoundError('Sprint が見つかりません'))
        await requireWorkspaceMember(before.workspaceId, 'member')
        const updated = await sprintRepository.updateWithLock(tx, data.id, data.expectedVersion, {
          status: data.status,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'sprint',
          targetId: updated.id,
          action: 'status_change',
          before,
          after: updated,
        })
        return ok(updated)
      })
    } catch (e) {
      // active への更新が他の active と衝突 (DB partial unique index)
      if (isUniqueViolation(e)) {
        return err(new ValidationError('このワークスペースには既に active な Sprint があります'))
      }
      throw e
    }

    // Sprint 完了 → 自動で Retro を enqueue (Phase 5.3 自動化)。
    // singletonKey で同 sprint 二重実行を抑制。失敗は致命的でないので throw せずログ。
    if (result.ok && data.status === 'completed') {
      try {
        await enqueueJob(
          'sprint-retro',
          {
            workspaceId: result.value.workspaceId,
            sprintId: result.value.id,
            triggeredAt: new Date().toISOString(),
            trigger: 'sprint-completed' as const,
          },
          { singletonKey: `sprint-retro-${result.value.id}` },
        )
      } catch (e) {
        console.error(`[sprintService] retro enqueue failed sprint=${result.value.id}`, e)
      }
    }

    return result
  },

  async list(workspaceId: string): Promise<Result<Sprint[]>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await sprintRepository.listByWorkspace(tx, workspaceId)
      return ok(rows)
    })
  },

  async getActive(workspaceId: string): Promise<Result<Sprint | null>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const sp = await sprintRepository.findActiveByWorkspace(tx, workspaceId)
      return ok(sp)
    })
  },

  /** Item を Sprint に割当 (null 解除可)。Sprint と Item の workspace 一致を保証。 */
  async assignItem(input: unknown): Promise<Result<{ itemId: string; sprintId: string | null }>> {
    const parsed = AssignItemToSprintInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data: AssignItemToSprintInput = parsed.data

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, data.itemId)
      if (!item) return err(new NotFoundError('Item が見つかりません'))
      await requireWorkspaceMember(item.workspaceId, 'member')

      if (data.sprintId) {
        const sp = await sprintRepository.findById(tx, data.sprintId)
        if (!sp) return err(new NotFoundError('Sprint が見つかりません'))
        if (sp.workspaceId !== item.workspaceId) {
          return err(new ValidationError('別 workspace の Sprint には割当できません'))
        }
      }
      const updated = await sprintRepository.assignItem(tx, data.itemId, data.sprintId)
      if (!updated) return err(new NotFoundError('Item の更新に失敗'))

      await recordAudit(tx, {
        workspaceId: item.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item',
        targetId: data.itemId,
        action: 'sprint_assign',
        before: { sprintId: item.sprintId },
        after: { sprintId: data.sprintId },
      })
      return ok({ itemId: data.itemId, sprintId: data.sprintId })
    })
  },

  async progress(sprintId: string): Promise<Result<{ total: number; done: number }>> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const sp = await sprintRepository.findById(tx, sprintId)
      if (!sp) return err(new NotFoundError('Sprint が見つかりません'))
      await requireWorkspaceMember(sp.workspaceId, 'viewer')
      const p = await sprintRepository.progress(tx, sprintId)
      return ok(p)
    })
  },
}
