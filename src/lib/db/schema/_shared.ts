/**
 * Drizzle スキーマ共通ヘルパ。全テーブルで使う列定義・enum・Supabase auth ref を集約。
 */
import { sql } from 'drizzle-orm'
import { integer, pgEnum, pgSchema, timestamp, uuid } from 'drizzle-orm/pg-core'

// --- Supabase auth schema ref (読み取り専用, Drizzle Kit は管理しない) ---
export const authSchema = pgSchema('auth')
export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
})

// --- Enums (DB ネイティブ enum 型) ---
export const workspaceMemberRole = pgEnum('workspace_member_role', [
  'owner',
  'admin',
  'member',
  'viewer',
])

export const workspaceStatusType = pgEnum('workspace_status_type', ['todo', 'in_progress', 'done'])

export const actorType = pgEnum('actor_type', ['user', 'agent'])

export const templateKind = pgEnum('template_kind', ['manual', 'recurring'])

export const itemDependencyType = pgEnum('item_dependency_type', ['blocks', 'relates_to'])

export const agentMemoryRole = pgEnum('agent_memory_role', [
  'user',
  'assistant',
  'tool_call',
  'tool_result',
])

export const agentInvocationStatus = pgEnum('agent_invocation_status', [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
])

// --- 共通カラムヘルパ ---
export const id = () => uuid('id').primaryKey().defaultRandom()

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
} as const

/** 全主要テーブルに入れる: 楽観ロック + 論理削除 */
export const mutationMarkers = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  version: integer('version').notNull().default(0),
} as const

/** created_by を actor_type + actor_id で統一表現 (user も agent も author) */
export const createdByActor = {
  createdByActorType: actorType('created_by_actor_type').notNull().default('user'),
  createdByActorId: uuid('created_by_actor_id').notNull(),
} as const

// --- Raw SQL ショートカット (頻出) ---
export const now = sql`now()`
