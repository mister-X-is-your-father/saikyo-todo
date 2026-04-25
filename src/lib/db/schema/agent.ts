/**
 * AI Agent 関連: agents (actor 定義) / prompts / memories / invocations
 *   + agent_decompose_proposals (AI 分解の staging 行)。
 * agent も actor として Comment や Item を作成できる。
 */
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
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

import { agentInvocationStatus, agentMemoryRole, authUsers, id, timestamps } from './_shared'
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

/**
 * AI 分解の staging 行。Researcher が `propose_child_item` ツールを呼ぶたびに 1 行 INSERT。
 * UI で行ごとに採用 / 却下 / 編集できる。採用すると items に実 INSERT され accepted_item_id が入る。
 *
 * status_proposal:
 *   - pending: Researcher が提案、ユーザー未レビュー
 *   - accepted: items に commit 済 (accepted_item_id を辿れば実体が見える)
 *   - rejected: ユーザーが却下
 */
export const agentDecomposeProposals = pgTable(
  'agent_decompose_proposals',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    parentItemId: uuid('parent_item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    agentInvocationId: uuid('agent_invocation_id').references(() => agentInvocations.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    isMust: boolean('is_must').notNull().default(false),
    dod: text('dod'),
    statusProposal: text('status_proposal').notNull().default('pending'),
    /** accepted 後に実際に作られた item の id */
    acceptedItemId: uuid('accepted_item_id').references(() => items.id, { onDelete: 'set null' }),
    /** Agent が呼んだ順 (UI ソート用) */
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => authUsers.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('agent_decompose_proposals_parent_idx').on(t.parentItemId, t.statusProposal),
    index('agent_decompose_proposals_workspace_idx').on(t.workspaceId, t.createdAt),
    index('agent_decompose_proposals_invocation_idx').on(t.agentInvocationId),
    check(
      'agent_decompose_proposals_status_chk',
      sql`status_proposal in ('pending', 'accepted', 'rejected')`,
    ),
    check(
      'agent_decompose_proposals_must_dod_chk',
      sql`is_must = false or (dod is not null and length(trim(dod)) > 0)`,
    ),
  ],
)

export type Agent = typeof agents.$inferSelect
export type AgentPrompt = typeof agentPrompts.$inferSelect
export type AgentMemory = typeof agentMemories.$inferSelect
export type AgentInvocation = typeof agentInvocations.$inferSelect
export type NewAgentInvocation = typeof agentInvocations.$inferInsert
export type AgentDecomposeProposal = typeof agentDecomposeProposals.$inferSelect
export type NewAgentDecomposeProposal = typeof agentDecomposeProposals.$inferInsert
