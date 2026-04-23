import 'server-only'

import { and, asc, eq, isNull, sql } from 'drizzle-orm'

import { docs } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Doc } from './schema'

export interface ListDocsFilter {
  workspaceId: string
  limit?: number
}

export const docRepository = {
  async insert(tx: Tx, values: typeof docs.$inferInsert): Promise<Doc> {
    const [row] = await tx.insert(docs).values(values).returning()
    if (!row) throw new Error('insertDoc returned no row')
    return row as Doc
  },

  async findById(tx: Tx, id: string): Promise<Doc | null> {
    const rows = await tx
      .select()
      .from(docs)
      .where(and(eq(docs.id, id), isNull(docs.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as Doc | null
  },

  async list(tx: Tx, filter: ListDocsFilter): Promise<Doc[]> {
    const rows = await tx
      .select()
      .from(docs)
      .where(and(eq(docs.workspaceId, filter.workspaceId), isNull(docs.deletedAt)))
      .orderBy(asc(docs.createdAt))
      .limit(filter.limit ?? 500)
    return rows as Doc[]
  },

  /**
   * 楽観ロック: WHERE id = ? AND version = ? で更新。0 行なら衝突。
   */
  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof docs.$inferInsert>,
  ): Promise<Doc | null> {
    const [row] = await tx
      .update(docs)
      .set({
        ...patch,
        version: sql`${docs.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(docs.id, id), eq(docs.version, expectedVersion), isNull(docs.deletedAt)))
      .returning()
    return (row ?? null) as Doc | null
  },

  async softDelete(tx: Tx, id: string, expectedVersion: number): Promise<Doc | null> {
    return await this.updateWithLock(tx, id, expectedVersion, { deletedAt: new Date() })
  },
}
