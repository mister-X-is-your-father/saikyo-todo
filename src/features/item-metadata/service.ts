import 'server-only'

import { eq } from 'drizzle-orm'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { workspaceMembers } from '@/lib/db/schema'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { mutateWithGuard } from '@/lib/service-mutate'

import { itemRepository } from '@/features/item/repository'
import type { Item } from '@/features/item/schema'

import { itemMetadataRepository } from './repository'
import {
  AddItemIoArtifactInputSchema,
  AddItemStakeholderInputSchema,
  type ItemIoArtifact,
  type ItemStakeholder,
  RemoveItemIoArtifactInputSchema,
  RemoveItemStakeholderInputSchema,
  SetItemGoalInputSchema,
} from './schema'

const NOT_FOUND_ITEM = 'Item が見つかりません'
const NOT_FOUND_ARTIFACT = '成果物が見つかりません'

export const itemMetadataService = {
  /**
   * items.goal を更新。dod (完了基準) とは別軸 — 達成目的を表す。
   */
  async setGoal(input: unknown): Promise<Result<Item>> {
    const parsed = SetItemGoalInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND_ITEM,
      fn: async (tx, before, user) => {
        const updated = await itemRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          { goal: parsed.data.goal },
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'set_goal',
          before: { goal: before.goal },
          after: { goal: updated.goal },
        })
        return ok(updated)
      },
    })
  },

  /**
   * I/O 成果物を追加 (input or output)。URL or filePath は任意。
   */
  async addArtifact(input: unknown): Promise<Result<ItemIoArtifact>> {
    const parsed = AddItemIoArtifactInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, parsed.data.itemId)
      if (!item) return err(new NotFoundError(NOT_FOUND_ITEM))
      await requireWorkspaceMember(item.workspaceId, 'member')
      const created = await itemMetadataRepository.insertArtifact(tx, {
        workspaceId: item.workspaceId,
        itemId: parsed.data.itemId,
        kind: parsed.data.kind,
        label: parsed.data.label,
        url: parsed.data.url ?? null,
        filePath: parsed.data.filePath ?? null,
        mime: parsed.data.mime ?? null,
        description: parsed.data.description ?? null,
        createdBy: user.id,
      })
      await recordAudit(tx, {
        workspaceId: item.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item_io_artifact',
        targetId: created.id,
        action: 'create',
        after: created,
      })
      return ok(created)
    })
  },

  async removeArtifact(input: unknown): Promise<Result<ItemIoArtifact>> {
    const parsed = RemoveItemIoArtifactInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await itemMetadataRepository.findArtifactById(tx, parsed.data.id)
      if (!before) return err(new NotFoundError(NOT_FOUND_ARTIFACT))
      await requireWorkspaceMember(before.workspaceId, 'member')
      const deleted = await itemMetadataRepository.softDeleteArtifact(
        tx,
        parsed.data.id,
        parsed.data.expectedVersion,
      )
      if (!deleted) return err(new ConflictError())
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item_io_artifact',
        targetId: deleted.id,
        action: 'delete',
        before,
      })
      return ok(deleted)
    })
  },

  async listArtifacts(itemId: string): Promise<ItemIoArtifact[]> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, itemId)
      if (!item) return []
      await requireWorkspaceMember(item.workspaceId, 'viewer')
      return await itemMetadataRepository.listArtifactsByItem(tx, itemId)
    })
  },

  // ----- 関係者 (stakeholders) -----
  async addStakeholder(input: unknown): Promise<Result<ItemStakeholder>> {
    const parsed = AddItemStakeholderInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, parsed.data.itemId)
      if (!item) return err(new NotFoundError(NOT_FOUND_ITEM))
      await requireWorkspaceMember(item.workspaceId, 'member')
      // 追加対象 user が同 workspace の member か確認
      const memberRows = await tx
        .select({ userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, item.workspaceId))
      const memberIds = new Set(memberRows.map((r) => r.userId))
      if (!memberIds.has(parsed.data.userId)) {
        return err(new ValidationError('workspace の member ではないユーザは追加できません'))
      }
      const created = await itemMetadataRepository.addStakeholder(tx, {
        workspaceId: item.workspaceId,
        itemId: parsed.data.itemId,
        userId: parsed.data.userId,
        addedBy: user.id,
      })
      await recordAudit(tx, {
        workspaceId: item.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item_stakeholder',
        targetId: parsed.data.itemId,
        action: 'add_stakeholder',
        after: { itemId: parsed.data.itemId, userId: parsed.data.userId },
      })
      return ok(created)
    })
  },

  async removeStakeholder(input: unknown): Promise<Result<{ removed: boolean }>> {
    const parsed = RemoveItemStakeholderInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, parsed.data.itemId)
      if (!item) return err(new NotFoundError(NOT_FOUND_ITEM))
      await requireWorkspaceMember(item.workspaceId, 'member')
      const removed = await itemMetadataRepository.removeStakeholder(
        tx,
        parsed.data.itemId,
        parsed.data.userId,
      )
      if (removed) {
        await recordAudit(tx, {
          workspaceId: item.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item_stakeholder',
          targetId: parsed.data.itemId,
          action: 'remove_stakeholder',
          before: { itemId: parsed.data.itemId, userId: parsed.data.userId },
        })
      }
      return ok({ removed })
    })
  },

  async listStakeholders(itemId: string): Promise<ItemStakeholder[]> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, itemId)
      if (!item) return []
      await requireWorkspaceMember(item.workspaceId, 'viewer')
      return await itemMetadataRepository.listStakeholdersByItem(tx, itemId)
    })
  },
}
