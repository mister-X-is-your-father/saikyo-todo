/**
 * in-app 通知 + 通知購読設定 (MVP は in-app のみ, メール / Slack は post-MVP)。
 */
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { authUsers, id, timestamps } from './_shared'
import { workspaces } from './workspace'

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'heartbeat' | 'mention' | 'invite' | ...
    payload: jsonb('payload').notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_unread_idx').on(t.userId, t.readAt)],
)

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    channel: text('channel').notNull().default('in_app'), // 'in_app' | 'email' | 'slack'
    enabled: boolean('enabled').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('notification_preferences_uniq').on(t.userId, t.type, t.channel)],
)

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type NotificationPreference = typeof notificationPreferences.$inferSelect
