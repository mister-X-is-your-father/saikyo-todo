import 'server-only'

import { and, desc, eq, isNull, sql } from 'drizzle-orm'

import type { NotificationPreference } from '@/lib/db/schema'
import { notificationPreferences, notifications } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Notification } from './schema'

/**
 * notifications.payload は jsonb。Drizzle 型は `unknown` 互換だが、generator 側では
 * 厳密な payload interface (HeartbeatPayload / MentionPayload / ...) を渡したいので
 * ここでは緩い `Record<string, unknown>` を受け付け、insert 側で as never する。
 */
export type NotificationInsertValues = {
  userId: string
  workspaceId: string
  type: string
  payload: Record<string, unknown>
}

export const notificationRepository = {
  /**
   * 通知を 1 件 INSERT する。RLS 上 INSERT policy はないので tx は admin / service_role
   * 由来であること。created_at / id は default で埋まる。
   */
  async insert(tx: Tx, values: NotificationInsertValues): Promise<Notification> {
    const [row] = await tx
      .insert(notifications)
      .values({
        userId: values.userId,
        workspaceId: values.workspaceId,
        type: values.type,
        payload: values.payload as never,
      })
      .returning()
    if (!row) throw new Error('insertNotification returned no row')
    return row as Notification
  },

  async listForUser(
    tx: Tx,
    userId: string,
    workspaceId: string,
    options: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<Notification[]> {
    const conds = [eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId)]
    if (options.unreadOnly) conds.push(isNull(notifications.readAt))

    const rows = await tx
      .select()
      .from(notifications)
      .where(and(...conds))
      .orderBy(desc(notifications.createdAt))
      .limit(options.limit ?? 50)
    return rows as Notification[]
  },

  async unreadCount(tx: Tx, userId: string, workspaceId: string): Promise<number> {
    const rows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.workspaceId, workspaceId),
          isNull(notifications.readAt),
        ),
      )
    return rows[0]?.count ?? 0
  },

  async markRead(tx: Tx, userId: string, id: string): Promise<Notification | null> {
    const [row] = await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning()
    return (row ?? null) as Notification | null
  },

  async markAllRead(tx: Tx, userId: string, workspaceId: string): Promise<number> {
    const rows = await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.workspaceId, workspaceId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id })
    return rows.length
  },
}

// ----------------------------------------------------------------------------
// notification_preferences (1 user 1 row)
// ----------------------------------------------------------------------------

export interface NotificationPreferenceUpdate {
  emailForHeartbeat?: boolean
  emailForMention?: boolean
  emailForInvite?: boolean
  emailForSyncFailure?: boolean
}

export const notificationPreferenceRepository = {
  /** 自分の pref を返す。行がなければ null。 */
  async findByUser(tx: Tx, userId: string): Promise<NotificationPreference | null> {
    const [row] = await tx
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)
    return (row ?? null) as NotificationPreference | null
  },

  /**
   * upsert: 存在しなければ default 値で INSERT、あれば patch を ON CONFLICT で適用。
   * default は schema 側の `boolean.default(...)` に従う (heartbeat/mention/invite=true, sync-failure=false)。
   */
  async upsert(
    tx: Tx,
    userId: string,
    patch: NotificationPreferenceUpdate,
  ): Promise<NotificationPreference> {
    const [row] = await tx
      .insert(notificationPreferences)
      .values({
        userId,
        ...patch,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: patch,
      })
      .returning()
    if (!row) throw new Error('upsert returned no row')
    return row as NotificationPreference
  },
}
