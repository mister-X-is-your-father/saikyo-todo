/**
 * queue: REST API + MCP server 化 — api_keys table。
 *
 * 外部 client (Claude Desktop / AI Agent SDK / 自作 script) が saikyo-todo の
 * Server Action 同等の操作を Bearer token で呼ぶための auth substrate。
 *
 * 設計詳細は FEEDBACK_QUEUE.md "REST API + MCP server 化" entry。
 *
 * - 1 key = 1 workspace を scope (越境不可)
 * - 平文 key は **生成時の 1 度きり** UI に表示、保存は SHA-256 hash のみ
 * - scope は text[] (read / write / admin)
 * - last_used_at は audit / unused detection 用、軽量更新
 * - revoked_at で論理 revoke (rows は残す = audit 可能)
 */
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { authUsers, id, timestamps } from './_shared'
import { workspaces } from './workspace'

export const apiKeys = pgTable(
  'api_keys',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    /** UI 表示用ラベル (例: "Claude Desktop / dev laptop") */
    label: text('label').notNull(),
    /** SHA-256(plaintext) を hex 64 chars で保存 (生成時のみ平文を表示) */
    keyHash: text('key_hash').notNull(),
    /** プレフィックス (UI 上で「どのキーか」 識別、例: 'sk_live_AbCd...') */
    keyPrefix: text('key_prefix').notNull(),
    /** scope は text[]: 'read' / 'write' / 'admin' を含む */
    scopes: text('scopes').array().notNull().default([]),
    /** 発行者 (workspace member) */
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    /** 最終利用日時 (auth 通過のたびに 1 行 update) */
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    /** 論理 revoke。null = 有効、値 = 無効 (auth 拒否、行は残す) */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    /** 期限 (省略時は無期限)。expires_at < now() で auth 拒否 */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('api_keys_key_hash_uniq').on(t.keyHash),
    index('api_keys_workspace_idx').on(t.workspaceId),
    index('api_keys_created_by_idx').on(t.createdByUserId),
  ],
)

export type ApiKey = typeof apiKeys.$inferSelect
export type ApiKeyInsert = typeof apiKeys.$inferInsert
