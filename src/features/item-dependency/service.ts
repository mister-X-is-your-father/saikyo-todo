/**
 * Item 間依存 (item_dependencies) のサービス層。
 *
 * - type='blocks' は有向 DAG (循環禁止)。fromItemId が toItemId の前提。
 *   = "from を完了するまで to は進められない"。
 * - type='relates_to' は無向 (循環チェックしない)。
 *
 * 権限:
 *   - both items の workspace 一致を確認 (越境依存は禁止)。
 *   - 操作者は from の workspace の member 必須。
 *
 * audit:
 *   - target_type='item_dependency'、target_id は from-to-type の合成 (PK が複合のため)。
 */
import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { itemRepository } from '@/features/item/repository'

import { itemDependencyRepository } from './repository'
import {
  AddItemDependencyInputSchema,
  type ItemDependencyGroup,
  type ItemDependencyRow,
  RemoveItemDependencyInputSchema,
} from './schema'

export const itemDependencyService = {
  async add(input: unknown): Promise<Result<ItemDependencyRow>> {
    const parsed = AddItemDependencyInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const { fromItemId, toItemId, type } = parsed.data

    const user = await requireUser()
    // 両 item を RLS 経由で読んで workspace 一致を確認 (越境依存禁止)
    const { fromItem, toItem } = await withUserDb(user.id, async (tx) => {
      const [a, b] = await Promise.all([
        itemRepository.findById(tx, fromItemId),
        itemRepository.findById(tx, toItemId),
      ])
      return { fromItem: a, toItem: b }
    })
    if (!fromItem || !toItem) return err(new NotFoundError('Item が見つかりません'))
    if (fromItem.workspaceId !== toItem.workspaceId) {
      return err(new ValidationError('別 workspace の Item と依存は作れません'))
    }

    await requireWorkspaceMember(fromItem.workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      if (type === 'blocks') {
        const cycle = await itemDependencyRepository.wouldCreateCycle(tx, fromItemId, toItemId)
        if (cycle) {
          return err(new ValidationError('依存に循環が発生するため追加できません'))
        }
      }
      const row = await itemDependencyRepository.insert(tx, { fromItemId, toItemId, type })
      await recordAudit(tx, {
        workspaceId: fromItem.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item_dependency',
        targetId: fromItemId,
        action: 'add',
        after: { fromItemId, toItemId, type },
      })
      return ok(row)
    })
  },

  async remove(input: unknown): Promise<Result<{ removed: boolean }>> {
    const parsed = RemoveItemDependencyInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const { fromItemId, toItemId, type } = parsed.data

    const user = await requireUser()
    const fromItem = await withUserDb(user.id, async (tx) =>
      itemRepository.findById(tx, fromItemId),
    )
    if (!fromItem) return err(new NotFoundError('Item が見つかりません'))

    await requireWorkspaceMember(fromItem.workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const removed = await itemDependencyRepository.remove(tx, { fromItemId, toItemId, type })
      if (removed) {
        await recordAudit(tx, {
          workspaceId: fromItem.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item_dependency',
          targetId: fromItemId,
          action: 'remove',
          before: { fromItemId, toItemId, type },
        })
      }
      return ok({ removed })
    })
  },

  /**
   * Item 1 つを起点とした依存集約 (UI 表示用)。
   *   - blockedBy: 自分が後続。前提条件 (上流) Item 一覧
   *   - blocking : 自分が前提。後続 (下流) Item 一覧
   *   - related  : relates_to 双方向
   */
  async listForItem(itemId: string): Promise<Result<ItemDependencyGroup>> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, itemId)
      if (!item) return err(new NotFoundError('Item が見つかりません'))

      const rows = await itemDependencyRepository.listForItem(tx, itemId)
      const otherIds = Array.from(
        new Set(rows.map((r) => (r.fromItemId === itemId ? r.toItemId : r.fromItemId))),
      )
      const refs = await itemDependencyRepository.fetchItemRefs(tx, otherIds)

      const result: ItemDependencyGroup = { blockedBy: [], blocking: [], related: [] }
      for (const r of rows) {
        const otherId = r.fromItemId === itemId ? r.toItemId : r.fromItemId
        const ref = refs.get(otherId)
        if (!ref) continue
        if (r.type === 'blocks') {
          if (r.toItemId === itemId) {
            result.blockedBy.push({ ref, createdAt: r.createdAt })
          } else {
            result.blocking.push({ ref, createdAt: r.createdAt })
          }
        } else {
          result.related.push({ ref, createdAt: r.createdAt })
        }
      }
      return ok(result)
    })
  },
}
