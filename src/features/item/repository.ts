import 'server-only'

import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'

import { items, workspaceStatuses } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Item } from './schema'

export interface ListItemsFilter {
  workspaceId: string
  status?: string
  isMust?: boolean
  limit?: number
}

export const itemRepository = {
  async insert(tx: Tx, values: typeof items.$inferInsert): Promise<Item> {
    const [row] = await tx.insert(items).values(values).returning()
    if (!row) throw new Error('insertItem returned no row')
    return row as Item
  },

  async findById(tx: Tx, id: string): Promise<Item | null> {
    const rows = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, id), isNull(items.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as Item | null
  },

  async list(tx: Tx, filter: ListItemsFilter): Promise<Item[]> {
    const conds = [eq(items.workspaceId, filter.workspaceId), isNull(items.deletedAt)]
    if (filter.status) conds.push(eq(items.status, filter.status))
    if (filter.isMust !== undefined) conds.push(eq(items.isMust, filter.isMust))
    const rows = await tx
      .select()
      .from(items)
      .where(and(...conds))
      .orderBy(desc(items.isMust), asc(items.position), asc(items.createdAt))
      .limit(filter.limit ?? 500)
    return rows as Item[]
  },

  /**
   * 楽観ロック: WHERE id = ? AND version = ? で更新。0 行更新ならロック衝突。
   * 戻り値は更新後の row、衝突なら null。
   */
  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof items.$inferInsert>,
  ): Promise<Item | null> {
    const [row] = await tx
      .update(items)
      .set({
        ...patch,
        version: sql`${items.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, id), eq(items.version, expectedVersion), isNull(items.deletedAt)))
      .returning()
    return (row ?? null) as Item | null
  },

  /** Soft delete (deleted_at をセット)。楽観ロック付き。 */
  async softDelete(tx: Tx, id: string, expectedVersion: number): Promise<Item | null> {
    return await this.updateWithLock(tx, id, expectedVersion, { deletedAt: new Date() })
  },

  /** workspace_statuses.type を返す。存在しない key なら null。 */
  async findStatusType(
    tx: Tx,
    workspaceId: string,
    key: string,
  ): Promise<'todo' | 'in_progress' | 'done' | null> {
    const [row] = await tx
      .select({ type: workspaceStatuses.type })
      .from(workspaceStatuses)
      .where(and(eq(workspaceStatuses.workspaceId, workspaceId), eq(workspaceStatuses.key, key)))
      .limit(1)
    return (row?.type as 'todo' | 'in_progress' | 'done' | undefined) ?? null
  },
}
