/**
 * Notification 通知ベル用 Service。
 *
 * - workspace スコープ + 自分宛 (`user_id = auth.uid()`) のみ閲覧 / 更新可能
 *   (RLS が物理的に保証 — repository は scoped Drizzle 経由)
 * - INSERT は service_role 専用 (heartbeat / mention worker 等が adminDb で行う)。
 *   この Service には作成系を置かない
 * - audit_log は通知の "閲覧" に対して取らない (大量ノイズ + value 低い)。
 *   "通知の生成" は heartbeat scan 等の生成側で audit を取れば足りる
 */
import 'server-only'

import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { notificationRepository } from './repository'
import type { Notification } from './schema'

export const notificationService = {
  /** workspace 内の自分宛通知一覧 (デフォルト 50 件、新しい順)。 */
  async list(
    workspaceId: string,
    options: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<Result<Notification[]>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await notificationRepository.listForUser(tx, user.id, workspaceId, options)
      return ok(rows)
    })
  },

  /** 未読件数 (バッジ用)。 */
  async unreadCount(workspaceId: string): Promise<Result<number>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const c = await notificationRepository.unreadCount(tx, user.id, workspaceId)
      return ok(c)
    })
  },

  /** 1 件既読化。既に既読 / 他人の通知は no-op (RLS により null 返り)。 */
  async markRead(notificationId: string): Promise<Result<Notification | null>> {
    if (!notificationId) return err(new ValidationError('notificationId 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const row = await notificationRepository.markRead(tx, user.id, notificationId)
      return ok(row)
    })
  },

  /** workspace 内の未読を全て既読化。返り値は更新件数。 */
  async markAllRead(workspaceId: string): Promise<Result<number>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const n = await notificationRepository.markAllRead(tx, user.id, workspaceId)
      return ok(n)
    })
  },
}
