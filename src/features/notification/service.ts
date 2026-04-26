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
import type { NotificationPreference } from '@/lib/db/schema'
import { withUserDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import {
  notificationPreferenceRepository,
  type NotificationPreferenceUpdate,
  notificationRepository,
} from './repository'
import type { Notification } from './schema'

/** 通知設定 (email チャネル) を解決した値。行が無いユーザは default 値が入る */
export interface ResolvedNotificationPreference {
  emailForHeartbeat: boolean
  emailForMention: boolean
  emailForInvite: boolean
  emailForSyncFailure: boolean
}

/** UI が想定するデフォルト値 (行が存在しないユーザに見せる初期 toggle 状態) */
export const NOTIFICATION_PREFERENCE_DEFAULTS: ResolvedNotificationPreference = {
  emailForHeartbeat: true,
  emailForMention: true,
  emailForInvite: true,
  emailForSyncFailure: false,
}

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

  /**
   * 自分の通知設定 (email チャネル ON/OFF) を返す。行が無ければ default 値を埋めて返す。
   * 行を作るかどうかは UI が「変更操作」したタイミングに任せる (lazy upsert)。
   */
  async getPreferences(): Promise<Result<ResolvedNotificationPreference>> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const row = await notificationPreferenceRepository.findByUser(tx, user.id)
      if (!row) return ok({ ...NOTIFICATION_PREFERENCE_DEFAULTS })
      return ok({
        emailForHeartbeat: row.emailForHeartbeat,
        emailForMention: row.emailForMention,
        emailForInvite: row.emailForInvite,
        emailForSyncFailure: row.emailForSyncFailure,
      })
    })
  },

  /**
   * 自分の通知設定を更新 (upsert)。少なくとも 1 フィールドが更新対象。
   *
   * 監査ログは取らない (個人設定で本人のみ閲覧、頻度高、過去 audit_log 方針との整合)。
   */
  async updatePreferences(
    patch: NotificationPreferenceUpdate,
  ): Promise<Result<NotificationPreference>> {
    const keys = Object.keys(patch).filter(
      (k) => patch[k as keyof NotificationPreferenceUpdate] !== undefined,
    )
    if (keys.length === 0) return err(new ValidationError('更新対象のフィールドがありません'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const row = await notificationPreferenceRepository.upsert(tx, user.id, patch)
      return ok(row)
    })
  },
}
