/**
 * Profiles: Supabase auth.users のミラー + 表示名 / TZ / locale 等のアプリ固有情報。
 * id は auth.users.id と一致 (FK)。
 */
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { authUsers, timestamps } from './_shared'

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  timezone: text('timezone').notNull().default('Asia/Tokyo'),
  locale: text('locale').notNull().default('ja'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  ...timestamps,
})

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
