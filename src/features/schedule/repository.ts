import 'server-only'

import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm'

import { itemSchedules } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Schedule, ScheduleKind } from './schema'

export const scheduleRepository = {
  async insert(tx: Tx, values: typeof itemSchedules.$inferInsert): Promise<Schedule> {
    const [row] = await tx.insert(itemSchedules).values(values).returning()
    if (!row) throw new Error('insertSchedule returned no row')
    return row as Schedule
  },

  async findById(tx: Tx, id: string): Promise<Schedule | null> {
    const rows = await tx
      .select()
      .from(itemSchedules)
      .where(and(eq(itemSchedules.id, id), isNull(itemSchedules.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as Schedule | null
  },

  /**
   * 指定 workspace で startAt が [from, to) に入る (active な) schedule を返す。
   * 二車線 view は 1 日分 (00:00 〜 翌 00:00) を取る想定。
   */
  async listByDateRange(tx: Tx, workspaceId: string, from: Date, to: Date): Promise<Schedule[]> {
    const rows = await tx
      .select()
      .from(itemSchedules)
      .where(
        and(
          eq(itemSchedules.workspaceId, workspaceId),
          gte(itemSchedules.startAt, from),
          lt(itemSchedules.startAt, to),
          isNull(itemSchedules.deletedAt),
        ),
      )
    return rows as Schedule[]
  },

  /**
   * 指定 item の planned/actual を全部返す (diff 集計用)。
   */
  async listByItem(tx: Tx, itemId: string, kind?: ScheduleKind): Promise<Schedule[]> {
    const conds = [eq(itemSchedules.itemId, itemId), isNull(itemSchedules.deletedAt)]
    if (kind) conds.push(eq(itemSchedules.kind, kind))
    const rows = await tx
      .select()
      .from(itemSchedules)
      .where(and(...conds))
    return rows as Schedule[]
  },

  /**
   * 楽観ロック update。0 行更新なら衝突 (null 返却)。
   */
  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof itemSchedules.$inferInsert>,
  ): Promise<Schedule | null> {
    const [row] = await tx
      .update(itemSchedules)
      .set({
        ...patch,
        version: sql`${itemSchedules.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(itemSchedules.id, id),
          eq(itemSchedules.version, expectedVersion),
          isNull(itemSchedules.deletedAt),
        ),
      )
      .returning()
    return (row ?? null) as Schedule | null
  },

  async softDelete(tx: Tx, id: string, expectedVersion: number): Promise<Schedule | null> {
    return await this.updateWithLock(tx, id, expectedVersion, { deletedAt: new Date() })
  },
}
