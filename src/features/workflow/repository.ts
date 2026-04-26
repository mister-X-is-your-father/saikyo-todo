import 'server-only'

import { and, desc, eq, isNull } from 'drizzle-orm'

import { workflows } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Workflow } from './schema'

export const workflowRepository = {
  async insert(tx: Tx, values: typeof workflows.$inferInsert): Promise<Workflow> {
    const [row] = await tx.insert(workflows).values(values).returning()
    if (!row) throw new Error('insert returned no row')
    return row
  },

  async findById(tx: Tx, id: string): Promise<Workflow | null> {
    const rows = await tx
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), isNull(workflows.deletedAt)))
      .limit(1)
    return rows[0] ?? null
  },

  async listByWorkspace(tx: Tx, workspaceId: string): Promise<Workflow[]> {
    return await tx
      .select()
      .from(workflows)
      .where(and(eq(workflows.workspaceId, workspaceId), isNull(workflows.deletedAt)))
      .orderBy(desc(workflows.createdAt))
  },

  /** 楽観ロック update — 0 行なら null */
  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof workflows.$inferInsert>,
  ): Promise<Workflow | null> {
    const [row] = await tx
      .update(workflows)
      .set({ ...patch, version: expectedVersion + 1 })
      .where(and(eq(workflows.id, id), eq(workflows.version, expectedVersion)))
      .returning()
    return row ?? null
  },

  async softDelete(tx: Tx, id: string): Promise<boolean> {
    const [row] = await tx
      .update(workflows)
      .set({ deletedAt: new Date() })
      .where(and(eq(workflows.id, id), isNull(workflows.deletedAt)))
      .returning({ id: workflows.id })
    return Boolean(row)
  },
}
