/**
 * Phase 6.15 iter120: 外部 API → Item 取り込み (pull) の data 層。
 * - external_sources: 取込元定義 (yamory / custom-rest)
 * - external_imports: 1 回の取込 run のログ
 * - external_item_links: external_id ↔ item_id の写像
 */
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { id } from './_shared'
import { items } from './item'
import { workspaces } from './workspace'

export const externalSources = pgTable(
  'external_sources',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    config: jsonb('config').notNull().default({}),
    enabled: boolean('enabled').notNull().default(true),
    scheduleCron: text('schedule_cron'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdByActorType: text('created_by_actor_type').notNull().default('user'),
    createdByActorId: uuid('created_by_actor_id').notNull(),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('external_sources_workspace_idx').on(t.workspaceId),
    check('external_sources_kind_check', sql`${t.kind} in ('yamory', 'custom-rest')`),
    check('external_sources_name_len_check', sql`length(${t.name}) between 1 and 200`),
    check('external_sources_actor_check', sql`${t.createdByActorType} in ('user', 'agent')`),
  ],
)

export const externalImports = pgTable(
  'external_imports',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => externalSources.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('queued'),
    triggerKind: text('trigger_kind').notNull(),
    fetchedCount: integer('fetched_count').notNull().default(0),
    createdCount: integer('created_count').notNull().default(0),
    updatedCount: integer('updated_count').notNull().default(0),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('external_imports_source_idx').on(t.sourceId, t.createdAt),
    check(
      'external_imports_status_check',
      sql`${t.status} in ('queued', 'running', 'succeeded', 'failed')`,
    ),
    check('external_imports_trigger_kind_check', sql`${t.triggerKind} in ('manual', 'cron')`),
  ],
)

export const externalItemLinks = pgTable(
  'external_item_links',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => externalSources.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    externalUrl: text('external_url'),
    lastPayload: jsonb('last_payload'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('external_item_links_uniq').on(t.sourceId, t.externalId),
    index('external_item_links_item_idx').on(t.itemId),
  ],
)

export type ExternalSource = typeof externalSources.$inferSelect
export type ExternalImport = typeof externalImports.$inferSelect
export type ExternalItemLink = typeof externalItemLinks.$inferSelect
