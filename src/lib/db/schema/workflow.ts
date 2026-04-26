/**
 * Phase 6.15 iter112: ワークフロー (n8n 風) data 層スキーマ。
 * graph / trigger は jsonb で保持し、zod スキーマ (features/workflow/schema.ts) で型付け。
 * Engine + node 実装は次 iter。
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
  uuid,
} from 'drizzle-orm/pg-core'

import { id } from './_shared'
import { workspaces } from './workspace'

export const workflows = pgTable(
  'workflows',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    graph: jsonb('graph').notNull().default({ nodes: [], edges: [] }),
    trigger: jsonb('trigger').notNull().default({ kind: 'manual' }),
    enabled: boolean('enabled').notNull().default(true),
    createdByActorType: text('created_by_actor_type').notNull().default('user'),
    createdByActorId: uuid('created_by_actor_id').notNull(),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('workflows_workspace_idx').on(t.workspaceId),
    check('workflows_actor_check', sql`${t.createdByActorType} in ('user', 'agent')`),
    check('workflows_name_len_check', sql`length(${t.name}) between 1 and 200`),
  ],
)

export const workflowRuns = pgTable(
  'workflow_runs',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('queued'),
    triggerKind: text('trigger_kind').notNull(),
    input: jsonb('input'),
    output: jsonb('output'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('workflow_runs_workflow_idx').on(t.workflowId, t.createdAt),
    index('workflow_runs_status_idx').on(t.workspaceId, t.status),
    check(
      'workflow_runs_status_check',
      sql`${t.status} in ('queued', 'running', 'succeeded', 'failed', 'cancelled')`,
    ),
  ],
)

export const workflowNodeRuns = pgTable(
  'workflow_node_runs',
  {
    id: id(),
    workflowRunId: uuid('workflow_run_id')
      .notNull()
      .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    nodeId: text('node_id').notNull(),
    nodeType: text('node_type').notNull(),
    status: text('status').notNull().default('pending'),
    input: jsonb('input'),
    output: jsonb('output'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),
    log: text('log'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('workflow_node_runs_run_idx').on(t.workflowRunId, t.createdAt),
    check(
      'workflow_node_runs_status_check',
      sql`${t.status} in ('pending', 'running', 'succeeded', 'failed', 'skipped')`,
    ),
  ],
)

export type Workflow = typeof workflows.$inferSelect
export type WorkflowRun = typeof workflowRuns.$inferSelect
export type WorkflowNodeRun = typeof workflowNodeRuns.$inferSelect
