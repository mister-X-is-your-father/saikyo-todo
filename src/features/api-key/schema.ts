/**
 * queue: REST API + MCP server 化 substrate — api_keys の zod schema 一次定義。
 * 詳細は FEEDBACK_QUEUE.md "REST API + MCP server 化" entry。
 */
import { z } from 'zod'

import type { apiKeys } from '@/lib/db/schema'

export type ApiKey = typeof apiKeys.$inferSelect
export type ApiKeyInsert = typeof apiKeys.$inferInsert

/**
 * scope:
 *   - read: 全 read part 実行可
 *   - write: read + write part (item 作成 / 状態変更 等)
 *   - admin: read + write + workspace 設定変更 (POST_MVP の admin 操作)
 */
export const ApiKeyScopeSchema = z.enum(['read', 'write', 'admin'])
export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>

export const CreateApiKeyInputSchema = z.object({
  workspaceId: z.string().uuid(),
  label: z.string().min(1).max(120),
  scopes: z.array(ApiKeyScopeSchema).min(1).max(3),
  expiresAt: z.string().datetime().nullish(),
})
export type CreateApiKeyInput = z.infer<typeof CreateApiKeyInputSchema>

export const RevokeApiKeyInputSchema = z.object({
  id: z.string().uuid(),
})
export type RevokeApiKeyInput = z.infer<typeof RevokeApiKeyInputSchema>

export const ListApiKeysInputSchema = z.object({
  workspaceId: z.string().uuid(),
  includeRevoked: z.boolean().default(false),
})
export type ListApiKeysInput = z.infer<typeof ListApiKeysInputSchema>

/**
 * verify 結果: 認証成功時に呼出側が `withApiKeyContext(scope ⇒ ...)` で利用する。
 */
export interface ApiKeyVerifyResult {
  apiKeyId: string
  workspaceId: string
  scopes: ApiKeyScope[]
  createdByUserId: string
}
