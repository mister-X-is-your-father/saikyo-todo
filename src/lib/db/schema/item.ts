/**
 * Item 本体 + 関連 (assignees / tags / dependencies)。
 * - parent_path は LTREE (ツリー構造)
 * - position は text (fractional-indexing lib の base62 文字列、lex sort)
 * - is_must + dod で MUST 管理
 */
import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
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
import { keyResults } from './okr'
import { sprints } from './sprint'
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
    dueTime: time('due_time'), // HH:MM:SS (seconds = 00)。dueDate と併用
    scheduledFor: date('scheduled_for'), // Today ビュー用 "いつやる予定か" (dueDate と別軸)
    /**
     * Phase 6.15 iter 47: Gantt baseline (TeamGantt 風)。
     * Sprint 開始時 / 計画凍結時に start_date / due_date のスナップショットを取り、
     * Gantt 上で「当初計画 vs 現在」の差分を可視化する土台。
     * 両方 NULL or 両方 set の制約は DB CHECK で担保 (items_baseline_pair_check)。
     */
    baselineStartDate: date('baseline_start_date'),
    baselineEndDate: date('baseline_end_date'),
    baselineTakenAt: timestamp('baseline_taken_at', { withTimezone: true }),
    priority: smallint('priority').notNull().default(4), // 1 = highest, 4 = none
    isMust: boolean('is_must').notNull().default(false),
    dod: text('dod'), // Definition of Done (MUST は service 層でバリデーション強制)
    position: text('position').notNull().default('a0'),
    customFields: jsonb('custom_fields').notNull().default({}),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    doneAt: timestamp('done_at', { withTimezone: true }),
    /**
     * Phase 5.1: Sprint 割当 (nullable)。Sprint 削除 (cancelled) で外す方針なので
     * `set null` ではなく `restrict` 相当の意図はないが、sprints は cancelled で
     * soft delete 代替なので物理削除は cascade では起きない。`set null` で十分。
     */
    sprintId: uuid('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
    /** Phase 5.2: OKR の Key Result への紐付け (nullable) */
    keyResultId: uuid('key_result_id').references(() => keyResults.id, { onDelete: 'set null' }),
    ...createdByActor,
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [
    index('items_workspace_idx').on(t.workspaceId),
    index('items_parent_path_gist').using('gist', t.parentPath),
    index('items_must_partial').on(t.workspaceId, t.dueDate),
    index('items_status_idx').on(t.workspaceId, t.status),
    index('items_done_at_idx').on(t.workspaceId, t.doneAt),
    index('items_today_idx')
      .on(t.workspaceId, t.scheduledFor)
      .where(sql`scheduled_for is not null and deleted_at is null`),
    index('items_sprint_idx')
      .on(t.workspaceId, t.sprintId)
      .where(sql`sprint_id is not null and deleted_at is null`),
    index('items_key_result_idx')
      .on(t.keyResultId)
      .where(sql`key_result_id is not null and deleted_at is null`),
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
