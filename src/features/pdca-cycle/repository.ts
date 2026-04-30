/**
 * queue: PDCA P-1 substrate — pdca_cycles / pdca_cycle_items の DB アクセス。
 * RLS は scoped Drizzle (`getDb`) で効かせる前提。
 */
import 'server-only'

import { and, desc, eq, isNull } from 'drizzle-orm'

import { pdcaCycleItems, pdcaCycles } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { PdcaCycle, PdcaCycleItem, PdcaCycleStatus } from './schema'

export const pdcaCycleRepository = {
  async findById(tx: Tx, id: string): Promise<PdcaCycle | null> {
    const rows = await tx
      .select()
      .from(pdcaCycles)
      .where(and(eq(pdcaCycles.id, id), isNull(pdcaCycles.deletedAt)))
      .limit(1)
    return rows[0] ?? null
  },

  async list(
    tx: Tx,
    args: {
      workspaceId: string
      status?: PdcaCycleStatus
      ownerId?: string
      limit: number
    },
  ): Promise<PdcaCycle[]> {
    const filters = [eq(pdcaCycles.workspaceId, args.workspaceId), isNull(pdcaCycles.deletedAt)]
    if (args.status) filters.push(eq(pdcaCycles.status, args.status))
    if (args.ownerId) filters.push(eq(pdcaCycles.ownerId, args.ownerId))
    return await tx
      .select()
      .from(pdcaCycles)
      .where(and(...filters))
      .orderBy(desc(pdcaCycles.createdAt))
      .limit(args.limit)
  },

  async insert(
    tx: Tx,
    values: {
      workspaceId: string
      ownerId: string
      title: string
      hypothesis: string
      targetMetric: string
      targetValue: string
    },
  ): Promise<PdcaCycle> {
    const [row] = await tx
      .insert(pdcaCycles)
      .values({
        ...values,
        planStartedAt: new Date(),
      })
      .returning()
    if (!row) throw new Error('insert returned no row')
    return row
  },

  /** 楽観ロック update — 0 行更新なら null (= conflict) */
  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<
      Pick<
        PdcaCycle,
        | 'title'
        | 'hypothesis'
        | 'targetMetric'
        | 'targetValue'
        | 'actualValue'
        | 'checkFindings'
        | 'actDecisions'
      >
    >,
  ): Promise<PdcaCycle | null> {
    const [row] = await tx
      .update(pdcaCycles)
      .set({ ...patch, version: expectedVersion + 1 })
      .where(and(eq(pdcaCycles.id, id), eq(pdcaCycles.version, expectedVersion)))
      .returning()
    return row ?? null
  },

  async advancePhase(
    tx: Tx,
    id: string,
    expectedVersion: number,
    to: PdcaCycleStatus,
    timestamps: Partial<
      Pick<
        PdcaCycle,
        'planFinishedAt' | 'doStartedAt' | 'doFinishedAt' | 'checkStartedAt' | 'checkFinishedAt'
      >
    >,
  ): Promise<PdcaCycle | null> {
    const [row] = await tx
      .update(pdcaCycles)
      .set({ status: to, version: expectedVersion + 1, ...timestamps })
      .where(and(eq(pdcaCycles.id, id), eq(pdcaCycles.version, expectedVersion)))
      .returning()
    return row ?? null
  },

  async listItems(tx: Tx, cycleId: string): Promise<PdcaCycleItem[]> {
    return await tx
      .select()
      .from(pdcaCycleItems)
      .where(eq(pdcaCycleItems.cycleId, cycleId))
      .orderBy(pdcaCycleItems.sortKey)
  },

  async linkItem(
    tx: Tx,
    values: {
      cycleId: string
      itemId: string
      role: 'do' | 'reference'
      addedByUserId: string
      sortKey: number
    },
  ): Promise<PdcaCycleItem> {
    const [row] = await tx.insert(pdcaCycleItems).values(values).returning()
    if (!row) throw new Error('link insert returned no row')
    return row
  },

  async unlinkItem(tx: Tx, cycleId: string, itemId: string): Promise<boolean> {
    const result = await tx
      .delete(pdcaCycleItems)
      .where(and(eq(pdcaCycleItems.cycleId, cycleId), eq(pdcaCycleItems.itemId, itemId)))
      .returning()
    return result.length > 0
  },
}
