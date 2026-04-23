/**
 * Template (ワークパッケージ): Item ツリー + Doc + 変数スキーマ + AI 指示をバンドル。
 * 展開 (instantiate) 時に実 Item / Doc を生成する。
 * recurring は pg_cron + cron_run_id UNIQUE で重複展開防止。
 */
import { type SQL, sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { ltree } from '../custom-types'
import { id, mutationMarkers, templateKind, timestamps } from './_shared'
import { items } from './item'
import { workspaces } from './workspace'

function sqlEmptyTextArray(): SQL {
  return sql`'{}'::text[]`
}

export const templates = pgTable('templates', {
  id: id(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  kind: templateKind('kind').notNull().default('manual'),
  scheduleCron: text('schedule_cron'), // recurring のみ必須
  variablesSchema: jsonb('variables_schema').notNull().default({}), // zod-json
  tags: text('tags').array().notNull().default(sqlEmptyTextArray()),
  createdBy: uuid('created_by').notNull(),
  ...mutationMarkers,
  ...timestamps,
})

export const templateItems = pgTable('template_items', {
  id: id(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  parentPath: ltree('parent_path').notNull().default(''),
  title: text('title').notNull(), // Mustache 変数展開可
  description: text('description').notNull().default(''),
  statusInitial: text('status_initial').notNull().default('todo'),
  dueOffsetDays: integer('due_offset_days'), // 展開日からの日数
  isMust: boolean('is_must').notNull().default(false),
  dod: text('dod'),
  defaultAssignees: jsonb('default_assignees').notNull().default([]), // [{actorType, actorId}]
  agentRoleToInvoke: text('agent_role_to_invoke'), // 展開と同時に起動する Agent role
  ...timestamps,
})

export const templateDocs = pgTable('template_docs', {
  id: id(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  ...timestamps,
})

export const templateInstantiations = pgTable(
  'template_instantiations',
  {
    id: id(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    variables: jsonb('variables').notNull().default({}),
    instantiatedAt: timestamp('instantiated_at', { withTimezone: true }).notNull().defaultNow(),
    instantiatedBy: uuid('instantiated_by').notNull(),
    rootItemId: uuid('root_item_id').references(() => items.id, { onDelete: 'set null' }),
    cronRunId: text('cron_run_id'), // recurring の重複防止 (UNIQUE)
    ...timestamps,
  },
  (t) => [uniqueIndex('template_instantiations_cron_run_uniq').on(t.cronRunId)],
)

export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type TemplateItem = typeof templateItems.$inferSelect
export type TemplateDoc = typeof templateDocs.$inferSelect
export type TemplateInstantiation = typeof templateInstantiations.$inferSelect
