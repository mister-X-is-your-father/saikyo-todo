import 'server-only'

import { and, desc, eq, isNull } from 'drizzle-orm'

import { apiKeys } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { ApiKey } from './schema'

export const apiKeyRepository = {
  async findByHash(tx: Tx, keyHash: string): Promise<ApiKey | null> {
    const rows = await tx.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1)
    return rows[0] ?? null
  },

  async findById(tx: Tx, id: string): Promise<ApiKey | null> {
    const rows = await tx.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1)
    return rows[0] ?? null
  },

  async list(tx: Tx, args: { workspaceId: string; includeRevoked: boolean }): Promise<ApiKey[]> {
    const filters = [eq(apiKeys.workspaceId, args.workspaceId)]
    if (!args.includeRevoked) filters.push(isNull(apiKeys.revokedAt))
    return await tx
      .select()
      .from(apiKeys)
      .where(and(...filters))
      .orderBy(desc(apiKeys.createdAt))
  },

  async insert(
    tx: Tx,
    values: {
      workspaceId: string
      label: string
      keyHash: string
      keyPrefix: string
      scopes: string[]
      createdByUserId: string
      expiresAt: Date | null
    },
  ): Promise<ApiKey> {
    const [row] = await tx.insert(apiKeys).values(values).returning()
    if (!row) throw new Error('api_keys insert returned no row')
    return row
  },

  async revoke(tx: Tx, id: string): Promise<ApiKey | null> {
    const [row] = await tx
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
      .returning()
    return row ?? null
  },

  /**
   * 認証通過後の touch (last_used_at 更新)。auth 高速化のため別 Tx で best-effort
   * 実行する想定 (本 repo では直接実行を見せるだけ)。
   */
  async touch(tx: Tx, id: string): Promise<void> {
    await tx.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id))
  },
}
