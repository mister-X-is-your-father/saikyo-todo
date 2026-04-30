/**
 * Task metadata 拡張テーブル群:
 *   - item_io_artifacts: 1 task : N 個の input / output 成果物 (URL or file 添付可)
 *   - item_stakeholders: CC 的関係者 (assignees とは別軸)
 *
 * 目的: 「目標・思考力・段取り力を鍛える道具」設計哲学。タスクに何が要るか / 何を出すか /
 * 誰が知っておくべきか を明示することで段取り思考が育つ。output↔input 一致で依存推論。
 */
import { sql } from 'drizzle-orm'
import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { authUsers, id, mutationMarkers, timestamps } from './_shared'
import { items } from './item'
import { workspaces } from './workspace'

export const itemIoArtifacts = pgTable(
  'item_io_artifacts',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['input', 'output'] }).notNull(),
    label: text('label').notNull(),
    url: text('url'),
    filePath: text('file_path'),
    mime: text('mime'),
    description: text('description'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [
    index('item_io_artifacts_item_kind_idx')
      .on(t.itemId, t.kind)
      .where(sql`deleted_at is null`),
    index('item_io_artifacts_label_lower_idx')
      .on(t.workspaceId, sql`lower(${t.label})`)
      .where(sql`deleted_at is null`),
  ],
)

export const itemStakeholders = pgTable(
  'item_stakeholders',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    addedBy: uuid('added_by')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.itemId, t.userId] }),
    index('item_stakeholders_user_idx').on(t.workspaceId, t.userId),
  ],
)

export type ItemIoArtifact = typeof itemIoArtifacts.$inferSelect
export type NewItemIoArtifact = typeof itemIoArtifacts.$inferInsert
export type ItemStakeholder = typeof itemStakeholders.$inferSelect
export type NewItemStakeholder = typeof itemStakeholders.$inferInsert
