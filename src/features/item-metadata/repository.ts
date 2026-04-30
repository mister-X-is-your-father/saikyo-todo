import 'server-only'

import { and, eq, isNull, sql } from 'drizzle-orm'

import { itemIoArtifacts, itemStakeholders } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { ItemIoArtifact, ItemStakeholder } from './schema'

export const itemMetadataRepository = {
  // -------- I/O artifacts --------
  async insertArtifact(
    tx: Tx,
    values: typeof itemIoArtifacts.$inferInsert,
  ): Promise<ItemIoArtifact> {
    const [row] = await tx.insert(itemIoArtifacts).values(values).returning()
    if (!row) throw new Error('insertArtifact returned no row')
    return row as ItemIoArtifact
  },

  async findArtifactById(tx: Tx, id: string): Promise<ItemIoArtifact | null> {
    const rows = await tx
      .select()
      .from(itemIoArtifacts)
      .where(and(eq(itemIoArtifacts.id, id), isNull(itemIoArtifacts.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as ItemIoArtifact | null
  },

  async listArtifactsByItem(tx: Tx, itemId: string): Promise<ItemIoArtifact[]> {
    const rows = await tx
      .select()
      .from(itemIoArtifacts)
      .where(and(eq(itemIoArtifacts.itemId, itemId), isNull(itemIoArtifacts.deletedAt)))
    return rows as ItemIoArtifact[]
  },

  async softDeleteArtifact(
    tx: Tx,
    id: string,
    expectedVersion: number,
  ): Promise<ItemIoArtifact | null> {
    const [row] = await tx
      .update(itemIoArtifacts)
      .set({
        deletedAt: new Date(),
        version: sql`${itemIoArtifacts.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(itemIoArtifacts.id, id),
          eq(itemIoArtifacts.version, expectedVersion),
          isNull(itemIoArtifacts.deletedAt),
        ),
      )
      .returning()
    return (row ?? null) as ItemIoArtifact | null
  },

  // -------- stakeholders --------
  async addStakeholder(
    tx: Tx,
    values: typeof itemStakeholders.$inferInsert,
  ): Promise<ItemStakeholder> {
    const [row] = await tx.insert(itemStakeholders).values(values).onConflictDoNothing().returning()
    if (row) return row as ItemStakeholder
    // already exists — fetch the existing row so the action stays idempotent
    const existing = await tx
      .select()
      .from(itemStakeholders)
      .where(
        and(eq(itemStakeholders.itemId, values.itemId), eq(itemStakeholders.userId, values.userId)),
      )
      .limit(1)
    if (!existing[0]) throw new Error('addStakeholder failed and existing row not found')
    return existing[0] as ItemStakeholder
  },

  async removeStakeholder(tx: Tx, itemId: string, userId: string): Promise<boolean> {
    const rows = await tx
      .delete(itemStakeholders)
      .where(and(eq(itemStakeholders.itemId, itemId), eq(itemStakeholders.userId, userId)))
      .returning({ itemId: itemStakeholders.itemId })
    return rows.length > 0
  },

  async listStakeholdersByItem(tx: Tx, itemId: string): Promise<ItemStakeholder[]> {
    const rows = await tx.select().from(itemStakeholders).where(eq(itemStakeholders.itemId, itemId))
    return rows as ItemStakeholder[]
  },
}
