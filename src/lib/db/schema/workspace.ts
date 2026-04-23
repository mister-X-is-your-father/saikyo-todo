/**
 * Workspace 関連テーブル: 本体 + メンバー + 設定 + status 定義 + 招待。
 */
import { type SQL, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import {
  authUsers,
  createdByActor,
  id,
  mutationMarkers,
  timestamps,
  workspaceMemberRole,
  workspaceStatusType,
} from './_shared'
import { profiles } from './profile'

// `deletedAt IS NULL` の unique index 条件式を共通化
function sqlIsNotDeleted(col: { name: string }): SQL {
  return sql`${sql.identifier(col.name)} is null`
}

export const workspaces = pgTable(
  'workspaces',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    ...createdByActor,
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [uniqueIndex('workspaces_slug_uniq').on(t.slug).where(sqlIsNotDeleted(t.deletedAt))],
)

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: workspaceMemberRole('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] })],
)

export const workspaceSettings = pgTable('workspace_settings', {
  workspaceId: uuid('workspace_id')
    .primaryKey()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('Asia/Tokyo'),
  standupCron: text('standup_cron').notNull().default('0 9 * * *'), // 毎朝 9:00
  wipLimitMust: integer('wip_limit_must').notNull().default(5),
  ...timestamps,
})

export const workspaceStatuses = pgTable(
  'workspace_statuses',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    color: text('color').notNull().default('#64748b'),
    order: integer('order').notNull().default(0),
    type: workspaceStatusType('type').notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.key] })],
)

export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: workspaceMemberRole('role').notNull().default('member'),
    token: text('token').notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revoked: boolean('revoked').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('workspace_invitations_token_uniq').on(t.token),
    index('workspace_invitations_workspace_idx').on(t.workspaceId),
  ],
)

export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert
export type WorkspaceMember = typeof workspaceMembers.$inferSelect
export type WorkspaceSettings = typeof workspaceSettings.$inferSelect
export type WorkspaceStatus = typeof workspaceStatuses.$inferSelect
export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect
