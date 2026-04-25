/**
 * AI 分解 staging service.
 *   - listPending(parentItemId): pending な提案を一覧取得
 *   - listAll(parentItemId): 履歴含む全件
 *   - accept(id):  pending → accepted。実際の Item を items に INSERT して accepted_item_id をセット
 *   - reject(id):  pending → rejected (UI から却下)
 *   - update(id, patch): pending 状態のまま title/description/isMust/dod を編集
 *   - acceptAllPending(parentItemId): pending を一括採用 (順次)
 *   - rejectAllPending(parentItemId): pending を一括却下
 *
 * accept は items への実 INSERT を伴うので、本番権限 (member 以上) + workspace 一致を担保。
 * 親が deleted の場合は accept できない (NotFoundError)。
 */
import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { fullPathOf } from '@/lib/db/ltree-path'
import { withUserDb } from '@/lib/db/scoped-client'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { itemRepository } from '@/features/item/repository'
import type { Item } from '@/features/item/schema'

import { decomposeProposalRepository } from './repository'
import {
  AcceptProposalInputSchema,
  BulkProposalActionInputSchema,
  type DecomposeProposal,
  RejectProposalInputSchema,
  UpdateProposalInputSchema,
} from './schema'

export const decomposeProposalService = {
  async listPending(parentItemId: string): Promise<Result<DecomposeProposal[]>> {
    if (!parentItemId) return err(new ValidationError('parentItemId 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const parent = await itemRepository.findById(tx, parentItemId)
      if (!parent) return err(new NotFoundError('親 Item が見つかりません'))
      await requireWorkspaceMember(parent.workspaceId, 'viewer')
      const rows = await decomposeProposalRepository.listPendingByParent(tx, parentItemId)
      return ok(rows)
    })
  },

  async listAll(parentItemId: string): Promise<Result<DecomposeProposal[]>> {
    if (!parentItemId) return err(new ValidationError('parentItemId 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const parent = await itemRepository.findById(tx, parentItemId)
      if (!parent) return err(new NotFoundError('親 Item が見つかりません'))
      await requireWorkspaceMember(parent.workspaceId, 'viewer')
      const rows = await decomposeProposalRepository.listAllByParent(tx, parentItemId)
      return ok(rows)
    })
  },

  async update(input: unknown): Promise<Result<DecomposeProposal>> {
    const parsed = UpdateProposalInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await decomposeProposalRepository.findById(tx, parsed.data.id)
      if (!before) return err(new NotFoundError('提案が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      if (before.statusProposal !== 'pending') {
        return err(new ValidationError('採用 / 却下済の提案は編集できません'))
      }
      // MUST + dod の整合 (DB CHECK にも入っているが先に明示エラーで返す)
      const nextIsMust = parsed.data.patch.isMust ?? before.isMust
      const nextDod = parsed.data.patch.dod ?? before.dod
      if (nextIsMust && (!nextDod || nextDod.trim() === '')) {
        return err(new ValidationError('MUST には DoD が必要です'))
      }
      const updated = await decomposeProposalRepository.update(
        tx,
        parsed.data.id,
        parsed.data.patch,
      )
      if (!updated) return err(new NotFoundError('更新に失敗しました'))
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'agent_decompose_proposal',
        targetId: updated.id,
        action: 'update',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async accept(input: unknown): Promise<Result<{ proposal: DecomposeProposal; item: Item }>> {
    const parsed = AcceptProposalInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await decomposeProposalRepository.findById(tx, parsed.data.id)
      if (!before) return err(new NotFoundError('提案が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      if (before.statusProposal !== 'pending') {
        return err(new ValidationError('既に採用 / 却下済です'))
      }
      const parent = await itemRepository.findById(tx, before.parentItemId)
      if (!parent) return err(new NotFoundError('親 Item が見つかりません (削除済の可能性)'))
      if (parent.workspaceId !== before.workspaceId) {
        return err(new ValidationError('親 Item の workspace が一致しません'))
      }
      const parentPath = fullPathOf({ id: parent.id, parentPath: parent.parentPath })
      const item = await itemRepository.insert(tx, {
        workspaceId: before.workspaceId,
        title: before.title,
        description: before.description,
        status: 'todo',
        parentPath,
        isMust: before.isMust,
        dod: before.dod ?? null,
        createdByActorType: 'user',
        createdByActorId: user.id,
      })
      const updated = await decomposeProposalRepository.update(tx, parsed.data.id, {
        statusProposal: 'accepted',
        acceptedItemId: item.id,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      })
      if (!updated) return err(new NotFoundError('提案の更新に失敗'))
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'agent_decompose_proposal',
        targetId: updated.id,
        action: 'accept',
        before,
        after: { ...updated, acceptedItemId: item.id },
      })
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item',
        targetId: item.id,
        action: 'create',
        after: { id: item.id, title: item.title, fromProposal: updated.id },
      })
      return ok({ proposal: updated, item })
    })
  },

  async reject(input: unknown): Promise<Result<DecomposeProposal>> {
    const parsed = RejectProposalInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await decomposeProposalRepository.findById(tx, parsed.data.id)
      if (!before) return err(new NotFoundError('提案が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      if (before.statusProposal !== 'pending') {
        return err(new ValidationError('既に採用 / 却下済です'))
      }
      const updated = await decomposeProposalRepository.update(tx, parsed.data.id, {
        statusProposal: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: user.id,
      })
      if (!updated) return err(new NotFoundError('却下に失敗'))
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'agent_decompose_proposal',
        targetId: updated.id,
        action: 'reject',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async rejectAllPending(input: unknown): Promise<Result<{ count: number }>> {
    const parsed = BulkProposalActionInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const parent = await itemRepository.findById(tx, parsed.data.parentItemId)
      if (!parent) return err(new NotFoundError('親 Item が見つかりません'))
      await requireWorkspaceMember(parent.workspaceId, 'member')
      const count = await decomposeProposalRepository.rejectAllPendingByParent(
        tx,
        parsed.data.parentItemId,
        user.id,
      )
      if (count > 0) {
        await recordAudit(tx, {
          workspaceId: parent.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'agent_decompose_proposal',
          targetId: parsed.data.parentItemId,
          action: 'reject_all',
          after: { parentItemId: parsed.data.parentItemId, count },
        })
      }
      return ok({ count })
    })
  },
}
