import 'server-only'

import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'

import { goals, items, keyResults } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Goal, KeyResult } from './schema'

export const goalRepository = {
  async insert(tx: Tx, values: typeof goals.$inferInsert): Promise<Goal> {
    const [row] = await tx.insert(goals).values(values).returning()
    if (!row) throw new Error('insertGoal returned no row')
    return row as Goal
  },

  async findById(tx: Tx, id: string): Promise<Goal | null> {
    const rows = await tx
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), isNull(goals.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as Goal | null
  },

  async listByWorkspace(tx: Tx, workspaceId: string, limit = 100): Promise<Goal[]> {
    const rows = await tx
      .select()
      .from(goals)
      .where(and(eq(goals.workspaceId, workspaceId), isNull(goals.deletedAt)))
      .orderBy(sql`CASE WHEN ${goals.status} = 'active' THEN 0 ELSE 1 END`, desc(goals.startDate))
      .limit(limit)
    return rows as Goal[]
  },

  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof goals.$inferInsert>,
  ): Promise<Goal | null> {
    const [row] = await tx
      .update(goals)
      .set({
        ...patch,
        version: sql`${goals.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(goals.id, id), eq(goals.version, expectedVersion), isNull(goals.deletedAt)))
      .returning()
    return (row ?? null) as Goal | null
  },
}

export const keyResultRepository = {
  async insert(tx: Tx, values: typeof keyResults.$inferInsert): Promise<KeyResult> {
    const [row] = await tx.insert(keyResults).values(values).returning()
    if (!row) throw new Error('insertKeyResult returned no row')
    return row as KeyResult
  },

  async findById(tx: Tx, id: string): Promise<KeyResult | null> {
    const rows = await tx
      .select()
      .from(keyResults)
      .where(and(eq(keyResults.id, id), isNull(keyResults.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as KeyResult | null
  },

  async listByGoal(tx: Tx, goalId: string): Promise<KeyResult[]> {
    const rows = await tx
      .select()
      .from(keyResults)
      .where(and(eq(keyResults.goalId, goalId), isNull(keyResults.deletedAt)))
      .orderBy(asc(keyResults.position), asc(keyResults.createdAt))
    return rows as KeyResult[]
  },

  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof keyResults.$inferInsert>,
  ): Promise<KeyResult | null> {
    const [row] = await tx
      .update(keyResults)
      .set({
        ...patch,
        version: sql`${keyResults.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(keyResults.id, id),
          eq(keyResults.version, expectedVersion),
          isNull(keyResults.deletedAt),
        ),
      )
      .returning()
    return (row ?? null) as KeyResult | null
  },

  /** Phase 6.15 iter141: KR の soft delete (key_results.deleted_at)。 */
  async softDeleteKeyResult(tx: Tx, id: string): Promise<KeyResult | null> {
    const [row] = await tx
      .update(keyResults)
      .set({ deletedAt: new Date() })
      .where(and(eq(keyResults.id, id), isNull(keyResults.deletedAt)))
      .returning()
    return (row ?? null) as KeyResult | null
  },

  /** KR に紐付いた items の done 比 (mode='items' 用集計)。 */
  async itemProgress(tx: Tx, keyResultId: string): Promise<{ total: number; done: number }> {
    const rows = await tx
      .select({
        total: sql<number>`count(*)::int`,
        done: sql<number>`count(*) filter (where ${items.status} = 'done')::int`,
      })
      .from(items)
      .where(and(eq(items.keyResultId, keyResultId), isNull(items.deletedAt)))
    return rows[0] ?? { total: 0, done: 0 }
  },

  /** workspace 内の全 KR (active goals に限定) を一括取得。Item 編集 picker 用。 */
  async listByWorkspace(
    tx: Tx,
    workspaceId: string,
  ): Promise<Array<KeyResult & { goalTitle: string; goalStatus: string }>> {
    const rows = await tx
      .select({
        id: keyResults.id,
        goalId: keyResults.goalId,
        title: keyResults.title,
        progressMode: keyResults.progressMode,
        targetValue: keyResults.targetValue,
        currentValue: keyResults.currentValue,
        unit: keyResults.unit,
        weight: keyResults.weight,
        position: keyResults.position,
        deletedAt: keyResults.deletedAt,
        version: keyResults.version,
        createdAt: keyResults.createdAt,
        updatedAt: keyResults.updatedAt,
        goalTitle: goals.title,
        goalStatus: goals.status,
      })
      .from(keyResults)
      .innerJoin(goals, eq(keyResults.goalId, goals.id))
      .where(
        and(
          eq(goals.workspaceId, workspaceId),
          isNull(goals.deletedAt),
          isNull(keyResults.deletedAt),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${goals.status} = 'active' THEN 0 ELSE 1 END`,
        asc(goals.startDate),
        asc(keyResults.position),
      )
    return rows as Array<KeyResult & { goalTitle: string; goalStatus: string }>
  },

  /** items.key_result_id を変更 (null で解除)。 */
  async assignItem(
    tx: Tx,
    itemId: string,
    keyResultId: string | null,
  ): Promise<{ workspaceId: string } | null> {
    const [row] = await tx
      .update(items)
      .set({ keyResultId, updatedAt: new Date() })
      .where(eq(items.id, itemId))
      .returning({ workspaceId: items.workspaceId })
    return (row as { workspaceId: string } | undefined) ?? null
  },
}
