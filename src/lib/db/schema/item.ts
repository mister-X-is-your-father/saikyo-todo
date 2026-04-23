/**
 * Item 本体 + 関連 (assignees / tags / dependencies)。
 * - parent_path は LTREE (ツリー構造)
 * - position は numeric (fractional indexing)
 * - is_must + dod で MUST 管理
 */
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { ltree } from '../custom-types'
import {
  actorType,
  createdByActor,
  id,
  itemDependencyType,
  mutationMarkers,
  timestamps,
} from './_shared'
import { workspaces } from './workspace'

export const items = pgTable(
  'items',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('todo'), // workspace_statuses.key への参照 (composite FK は trigger で)
    parentPath: ltree('parent_path').notNull().default(''), // root は空 ltree
    startDate: date('start_date'),
    dueDate: date('due_date'),
    isMust: boolean('is_must').notNull().default(false),
    dod: text('dod'), // Definition of Done (MUST は service 層でバリデーション強制)
    position: numeric('position', { precision: 30, scale: 15 }).notNull().default('0'),
    customFields: jsonb('custom_fields').notNull().default({}),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...createdByActor,
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [
    index('items_workspace_idx').on(t.workspaceId),
    index('items_parent_path_gist').using('gist', t.parentPath),
    index('items_must_partial').on(t.workspaceId, t.dueDate),
    index('items_status_idx').on(t.workspaceId, t.status),
  ],
)

export const itemAssignees = pgTable(
  'item_assignees',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    actorType: actorType('actor_type').notNull(),
    actorId: uuid('actor_id').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.actorType, t.actorId] })],
)

export const tags = pgTable(
  'tags',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#64748b'),
    ...timestamps,
  },
  (t) => [uniqueIndex('tags_workspace_name_uniq').on(t.workspaceId, t.name)],
)

export const itemTags = pgTable(
  'item_tags',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] })],
)

export const itemDependencies = pgTable(
  'item_dependencies',
  {
    fromItemId: uuid('from_item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    toItemId: uuid('to_item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    type: itemDependencyType('type').notNull().default('blocks'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.fromItemId, t.toItemId, t.type] })],
)

export type Item = typeof items.$inferSelect
export type NewItem = typeof items.$inferInsert
export type ItemAssignee = typeof itemAssignees.$inferSelect
export type Tag = typeof tags.$inferSelect
export type ItemTag = typeof itemTags.$inferSelect
export type ItemDependency = typeof itemDependencies.$inferSelect
