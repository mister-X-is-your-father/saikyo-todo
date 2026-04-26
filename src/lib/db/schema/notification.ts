/**
 * in-app 通知 + 通知購読設定 + Mock email outbox。
 *
 * - notifications: 通知ベル / Realtime 購読対象。in-app 表示用
 * - notification_preferences: チャネル別 ON/OFF (現状は email チャネルのみ)。
 *   1 ユーザ 1 行で 4 type 分のフラグを持つ素朴な構造 (Phase 6.6)
 * - mock_email_outbox: 「送信した体」のレコード。実 SMTP / Resend を使わない MVP 期は
 *   ここに書くだけ。Resend 等への切替は src/features/email/dispatcher.ts の差し替えで完了
 */
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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

/**
 * 1 ユーザ 1 行。チャネル別 (現状 email のみ) の 4 type 分の ON/OFF を持つ。
 * Phase 6.6 で in-app チャネルは「常時 ON」のため除外。Slack / push 等を足す段階で
 * 別 channel column を増やすか type×channel 直積テーブルに正規化する想定 (POST_MVP)。
 */
export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  emailForHeartbeat: boolean('email_for_heartbeat').notNull().default(true),
  emailForMention: boolean('email_for_mention').notNull().default(true),
  emailForInvite: boolean('email_for_invite').notNull().default(true),
  emailForSyncFailure: boolean('email_for_sync_failure').notNull().default(false),
  ...timestamps,
})

/**
 * Mock 送信記録: dispatcher は Resend / SMTP を呼ばずにこのテーブルに INSERT する。
 * 後で実配信に切り替えるときは dispatcher.ts のみを差し替える (本テーブルは保持してログ用途に
 * してもよい)。
 *
 * - dispatched_at: 送信成功時刻 (mock では INSERT と同時に now() を入れる)
 * - error: 失敗時のメッセージ (将来 retry 等で使う)
 */
export const mockEmailOutbox = pgTable(
  'mock_email_outbox',
  {
    id: id(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    toEmail: text('to_email').notNull(),
    type: text('type').notNull(), // 'heartbeat' | 'mention' | 'invite' | 'sync-failure'
    subject: text('subject').notNull(),
    htmlBody: text('html_body').notNull(),
    textBody: text('text_body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    error: text('error'),
  },
  (t) => [
    index('mock_email_outbox_user_idx').on(t.userId, t.createdAt),
    index('mock_email_outbox_workspace_idx').on(t.workspaceId, t.createdAt),
  ],
)

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type NotificationPreference = typeof notificationPreferences.$inferSelect
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert
export type MockEmailOutbox = typeof mockEmailOutbox.$inferSelect
export type NewMockEmailOutbox = typeof mockEmailOutbox.$inferInsert
