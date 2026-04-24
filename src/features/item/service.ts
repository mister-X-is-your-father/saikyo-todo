import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { positionBetween } from '@/lib/db/fractional-position'
import { moveSubtree } from '@/lib/db/ltree'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { mutateWithGuard } from '@/lib/service-mutate'

import { itemRepository } from './repository'
import {
  CreateItemInputSchema,
  type Item,
  MoveItemInputSchema,
  ReorderItemInputSchema,
  SoftDeleteItemInputSchema,
  UpdateItemInputSchema,
  UpdateStatusInputSchema,
} from './schema'

const NOT_FOUND = 'Item が見つかりません'

export const itemService = {
  async create(input: unknown): Promise<Result<Item>> {
    const parsed = CreateItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, ...rest } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.insert(tx, {
        workspaceId,
        title: rest.title,
        description: rest.description,
        status: rest.status,
        startDate: rest.startDate ?? null,
        dueDate: rest.dueDate ?? null,
        isMust: rest.isMust,
        dod: rest.dod ?? null,
        createdByActorType: 'user',
        createdByActorId: user.id,
      })
      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item',
        targetId: item.id,
        action: 'create',
        after: item,
      })
      return ok(item)
    })
  },

  async update(input: unknown): Promise<Result<Item>> {
    const parsed = UpdateItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const updated = await itemRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          parsed.data.patch as Partial<Parameters<typeof itemRepository.insert>[1]>,
        )
        if (!updated) return err(new ConflictError())
        if (updated.isMust && (!updated.dod || updated.dod.trim() === '')) {
          return err(new ValidationError('MUST には DoD が必要です'))
        }
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'update',
          before,
          after: updated,
        })
        return ok(updated)
      },
    })
  },

  async updateStatus(input: unknown): Promise<Result<Item>> {
    const parsed = UpdateStatusInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        // DoD 最終化: MUST を done type の status に遷移する時は DoD 必須。
        // 通常は create/update の invariant で満たされるが、admin 直接更新や
        // schema 変更に対する二重防御 (belt-and-suspenders)。
        const newType = await itemRepository.findStatusType(
          tx,
          before.workspaceId,
          parsed.data.status,
        )
        if (newType === 'done' && before.isMust && (!before.dod || before.dod.trim() === '')) {
          return err(new ValidationError('MUST を done にするには DoD が必要です'))
        }

        const patch: Partial<Parameters<typeof itemRepository.insert>[1]> = {
          status: parsed.data.status,
        }
        if (parsed.data.position) patch.position = parsed.data.position
        const updated = await itemRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          patch,
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'status_change',
          before: { status: before.status, position: before.position },
          after: { status: updated.status, position: updated.position },
        })
        return ok(updated)
      },
    })
  },

  /**
   * ワンクリック完了 / 未完了トグル。workspace の type='done' status に遷移。
   * MUST+DoD invariant は updateStatus 側で保証。
   */
  async toggleComplete(input: {
    id: string
    expectedVersion: number
    complete: boolean
  }): Promise<Result<Item>> {
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const targetKey = input.complete
          ? await itemRepository.findDoneStatusKey(tx, before.workspaceId)
          : await itemRepository.findTodoStatusKey(tx, before.workspaceId)
        if (!targetKey) return err(new ValidationError('遷移先 status が見つかりません'))
        if (input.complete && before.isMust && (!before.dod || before.dod.trim() === '')) {
          return err(new ValidationError('MUST を done にするには DoD が必要です'))
        }
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          status: targetKey,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: input.complete ? 'complete' : 'uncomplete',
          before: { status: before.status },
          after: { status: updated.status },
        })
        return ok(updated)
      },
    })
  },

  async move(input: unknown): Promise<Result<Item>> {
    const parsed = MoveItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        // 別 workspace への移動を拒否 (Alice が複数 ws に居る場合、RLS だけでは防げない)
        if (parsed.data.newParentItemId !== null) {
          const newParent = await itemRepository.findById(tx, parsed.data.newParentItemId)
          if (!newParent) return err(new NotFoundError('新 parent Item が見つかりません'))
          if (newParent.workspaceId !== before.workspaceId) {
            return err(new ValidationError('別 workspace の item には移動できません'))
          }
        }
        // moveSubtree が throw した場合は Tx が rollback される (NotFoundError / ValidationError)
        await moveSubtree(tx, before.id, parsed.data.newParentItemId)
        const updated = await itemRepository.findById(tx, before.id)
        if (!updated) return err(new NotFoundError('移動後の Item が見つかりません'))
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'move',
          before: { parentPath: before.parentPath },
          after: { parentPath: updated.parentPath },
        })
        return ok(updated)
      },
    })
  },

  async reorder(input: unknown): Promise<Result<Item>> {
    const parsed = ReorderItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    if (parsed.data.prevSiblingId === null && parsed.data.nextSiblingId === null) {
      return err(new ValidationError('prev / next のどちらかは必要です'))
    }

    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const [prev, next] = await Promise.all([
          parsed.data.prevSiblingId
            ? itemRepository.findById(tx, parsed.data.prevSiblingId)
            : Promise.resolve(null),
          parsed.data.nextSiblingId
            ? itemRepository.findById(tx, parsed.data.nextSiblingId)
            : Promise.resolve(null),
        ])
        if (parsed.data.prevSiblingId && !prev)
          return err(new NotFoundError('prev sibling が見つかりません'))
        if (parsed.data.nextSiblingId && !next)
          return err(new NotFoundError('next sibling が見つかりません'))
        for (const sib of [prev, next]) {
          if (!sib) continue
          if (sib.workspaceId !== before.workspaceId) {
            return err(new ValidationError('別 workspace の sibling は指定できません'))
          }
          if (sib.parentPath !== before.parentPath) {
            return err(new ValidationError('同じ親の下の sibling のみ指定できます'))
          }
          if (sib.id === before.id) {
            return err(new ValidationError('自分自身を sibling 指定できません'))
          }
        }

        let newPosition: string
        try {
          newPosition = positionBetween(prev?.position ?? null, next?.position ?? null)
        } catch (e) {
          return err(new ValidationError(`position 計算に失敗: ${(e as Error).message}`))
        }

        const updated = await itemRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          { position: newPosition },
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'reorder',
          before: { position: before.position },
          after: { position: updated.position },
        })
        return ok(updated)
      },
    })
  },

  async softDelete(input: unknown): Promise<Result<Item>> {
    const parsed = SoftDeleteItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const updated = await itemRepository.softDelete(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'delete',
          before,
        })
        return ok(updated)
      },
    })
  },

  async list(workspaceId: string, filter: { status?: string; isMust?: boolean } = {}) {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await itemRepository.list(tx, { workspaceId, ...filter })
    })
  },
}
