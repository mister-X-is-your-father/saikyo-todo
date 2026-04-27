import 'server-only'

import { and, desc, eq, isNull } from 'drizzle-orm'

import { externalImports, externalSources } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { ExternalImport, ExternalSource } from './schema'

export const externalSourceRepository = {
  async insert(tx: Tx, values: typeof externalSources.$inferInsert): Promise<ExternalSource> {
    const [row] = await tx.insert(externalSources).values(values).returning()
    if (!row) throw new Error('insert returned no row')
    return row
  },

  async findById(tx: Tx, id: string): Promise<ExternalSource | null> {
    const rows = await tx
      .select()
      .from(externalSources)
      .where(and(eq(externalSources.id, id), isNull(externalSources.deletedAt)))
      .limit(1)
    return rows[0] ?? null
  },

  async listByWorkspace(tx: Tx, workspaceId: string): Promise<ExternalSource[]> {
    return await tx
      .select()
      .from(externalSources)
      .where(and(eq(externalSources.workspaceId, workspaceId), isNull(externalSources.deletedAt)))
      .orderBy(desc(externalSources.createdAt))
  },

  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof externalSources.$inferInsert>,
  ): Promise<ExternalSource | null> {
    const [row] = await tx
      .update(externalSources)
      .set({ ...patch, version: expectedVersion + 1 })
      .where(and(eq(externalSources.id, id), eq(externalSources.version, expectedVersion)))
      .returning()
    return row ?? null
  },

  async softDelete(tx: Tx, id: string): Promise<boolean> {
    const [row] = await tx
      .update(externalSources)
      .set({ deletedAt: new Date() })
      .where(and(eq(externalSources.id, id), isNull(externalSources.deletedAt)))
      .returning({ id: externalSources.id })
    return Boolean(row)
  },

  /** Phase 6.15 iter126: 直近 N 件の import (pull) 履歴 */
  async listRecentImports(tx: Tx, sourceId: string, limit = 5): Promise<ExternalImport[]> {
    return await tx
      .select()
      .from(externalImports)
      .where(eq(externalImports.sourceId, sourceId))
      .orderBy(desc(externalImports.createdAt))
      .limit(limit)
  },
}
