import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { itemRepository } from './repository'
import {
  CreateItemInputSchema,
  type Item,
  SoftDeleteItemInputSchema,
  UpdateItemInputSchema,
  UpdateStatusInputSchema,
} from './schema'

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

    return await this._mutateWithGuard(parsed.data.id, async (tx, before, user) => {
      const updated = await itemRepository.updateWithLock(
        tx,
        parsed.data.id,
        parsed.data.expectedVersion,
        parsed.data.patch as Partial<Parameters<typeof itemRepository.insert>[1]>,
      )
      if (!updated) return err(new ConflictError())
      // MUST 切替時の DoD 必須チェック (post-create)
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
    })
  },

  async updateStatus(input: unknown): Promise<Result<Item>> {
    const parsed = UpdateStatusInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await this._mutateWithGuard(parsed.data.id, async (tx, before, user) => {
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
    })
  },

  async softDelete(input: unknown): Promise<Result<Item>> {
    const parsed = SoftDeleteItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await this._mutateWithGuard(parsed.data.id, async (tx, before, user) => {
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
    })
  },

  async list(workspaceId: string, filter: { status?: string; isMust?: boolean } = {}) {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await itemRepository.list(tx, { workspaceId, ...filter })
    })
  },

  /**
   * 共通: 既存 item の workspace member チェック → before 取得 → fn 実行。
   * fn は新たな mutation を行い、Result を返す。
   */
  async _mutateWithGuard(
    itemId: string,
    fn: (
      tx: Parameters<Parameters<typeof withUserDb>[1]>[0],
      before: Item,
      user: { id: string },
    ) => Promise<Result<Item>>,
  ): Promise<Result<Item>> {
    // まず service_role なしで before を引きたいが、workspace_id が分からないと
    // requireWorkspaceMember を呼べない。先に findById して workspace_id を取得 → guard。
    // でも RLS が無効な状態で findById は出来ないので、次の流れ:
    // 1. requireUser だけ済ませる
    // 2. withUserDb で before 取得 (RLS 経由 → 自分の ws のみ取得可)
    // 3. workspace member ガード (before.workspaceId)
    // 4. fn 実行
    const { requireUser } = await import('@/lib/auth/guard')
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await itemRepository.findById(tx, itemId)
      if (!before) return err(new NotFoundError('Item が見つかりません'))
      // RLS で読めた = workspace member であることは Postgres 側で確認済
      // ここで明示的な role チェック (member 以上)
      const { hasAtLeast, requireWorkspaceMember: rwm } = await import('@/lib/auth/guard')
      void hasAtLeast // 将来 role 別チェック追加用
      await rwm(before.workspaceId, 'member')
      return await fn(tx, before, user)
    })
  },
}
