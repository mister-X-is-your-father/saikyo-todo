import 'server-only'

import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'

import { items, sprints } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Sprint, SprintStatus } from './schema'

export const sprintRepository = {
  async insert(tx: Tx, values: typeof sprints.$inferInsert): Promise<Sprint> {
    const [row] = await tx.insert(sprints).values(values).returning()
    if (!row) throw new Error('insertSprint returned no row')
    return row as Sprint
  },

  async findById(tx: Tx, id: string): Promise<Sprint | null> {
    const rows = await tx
      .select()
      .from(sprints)
      .where(and(eq(sprints.id, id), isNull(sprints.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as Sprint | null
  },

  async findActiveByWorkspace(tx: Tx, workspaceId: string): Promise<Sprint | null> {
    const rows = await tx
      .select()
      .from(sprints)
      .where(
        and(
          eq(sprints.workspaceId, workspaceId),
          eq(sprints.status, 'active'),
          isNull(sprints.deletedAt),
        ),
      )
      .limit(1)
    return (rows[0] ?? null) as Sprint | null
  },

  async listByWorkspace(
    tx: Tx,
    workspaceId: string,
    options: { statuses?: SprintStatus[]; limit?: number } = {},
  ): Promise<Sprint[]> {
    const conds = [eq(sprints.workspaceId, workspaceId), isNull(sprints.deletedAt)]
    if (options.statuses?.length) {
      conds.push(sql`${sprints.status} = ANY(${options.statuses})`)
    }
    const rows = await tx
      .select()
      .from(sprints)
      .where(and(...conds))
      // active を最上位に、それ以外は startDate desc
      .orderBy(
        sql`CASE WHEN ${sprints.status} = 'active' THEN 0 ELSE 1 END`,
        desc(sprints.startDate),
        asc(sprints.name),
      )
      .limit(options.limit ?? 100)
    return rows as Sprint[]
  },

  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof sprints.$inferInsert>,
  ): Promise<Sprint | null> {
    const [row] = await tx
      .update(sprints)
      .set({
        ...patch,
        version: sql`${sprints.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(sprints.id, id), eq(sprints.version, expectedVersion), isNull(sprints.deletedAt)),
      )
      .returning()
    return (row ?? null) as Sprint | null
  },

  /** items.sprint_id を変更。NULL で割当解除。 */
  async assignItem(
    tx: Tx,
    itemId: string,
    sprintId: string | null,
  ): Promise<{ workspaceId: string } | null> {
    const [row] = await tx
      .update(items)
      .set({ sprintId, updatedAt: new Date() })
      .where(eq(items.id, itemId))
      .returning({ workspaceId: items.workspaceId })
    return (row as { workspaceId: string } | undefined) ?? null
  },

  /** Sprint の進捗集計 (total / done) — Burndown 用。 */
  async progress(tx: Tx, sprintId: string): Promise<{ total: number; done: number }> {
    const rows = await tx
      .select({
        total: sql<number>`count(*)::int`,
        done: sql<number>`count(*) filter (where ${items.status} = 'done')::int`,
      })
      .from(items)
      .where(and(eq(items.sprintId, sprintId), isNull(items.deletedAt)))
    return rows[0] ?? { total: 0, done: 0 }
  },
}
