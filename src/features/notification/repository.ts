import 'server-only'

import { and, desc, eq, isNull, sql } from 'drizzle-orm'

import { notifications } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Notification } from './schema'

export const notificationRepository = {
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
