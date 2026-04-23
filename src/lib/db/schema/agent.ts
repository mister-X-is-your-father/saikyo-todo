/**
 * AI Agent 関連: agents (actor 定義) / prompts / memories / invocations。
 * agent も actor として Comment や Item を作成できる。
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { agentInvocationStatus, agentMemoryRole, id, timestamps } from './_shared'
import { items } from './item'
import { workspaces } from './workspace'

export const agents = pgTable(
  'agents',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'pm' | 'researcher' | ...
    displayName: text('display_name').notNull(),
    systemPromptVersion: integer('system_prompt_version').notNull().default(1),
    ...timestamps,
  },
  (t) => [
    index('agents_workspace_role_idx').on(t.workspaceId, t.role),
    uniqueIndex('agents_workspace_role_uniq').on(t.workspaceId, t.role),
  ],
)

export const agentPrompts = pgTable(
  'agent_prompts',
  {
    id: id(),
    role: text('role').notNull(),
    version: integer('version').notNull(),
    systemPrompt: text('system_prompt').notNull(),
    active: boolean('active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('agent_prompts_role_version_uniq').on(t.role, t.version)],
)

export const agentMemories = pgTable(
  'agent_memories',
  {
    id: id(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    role: agentMemoryRole('role').notNull(),
    content: text('content').notNull(),
    toolCalls: jsonb('tool_calls'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('agent_memories_agent_idx').on(t.agentId, t.createdAt)],
)

export const agentInvocations = pgTable(
  'agent_invocations',
  {
    id: id(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    targetItemId: uuid('target_item_id').references(() => items.id, { onDelete: 'set null' }),
    status: agentInvocationStatus('status').notNull().default('queued'),
    input: jsonb('input').notNull().default({}),
    output: jsonb('output'),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    cacheCreationTokens: integer('cache_creation_tokens'),
    cacheReadTokens: integer('cache_read_tokens'),
    costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    idempotencyKey: text('idempotency_key').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('agent_invocations_idempotency_uniq').on(t.idempotencyKey),
    index('agent_invocations_status_idx').on(t.workspaceId, t.status),
  ],
)

export type Agent = typeof agents.$inferSelect
export type AgentPrompt = typeof agentPrompts.$inferSelect
export type AgentMemory = typeof agentMemories.$inferSelect
export type AgentInvocation = typeof agentInvocations.$inferSelect
export type NewAgentInvocation = typeof agentInvocations.$inferInsert
