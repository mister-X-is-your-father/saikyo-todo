import 'server-only'

import { and, asc, desc, eq, isNull } from 'drizzle-orm'

import { workflowNodeRuns, workflowRuns, workflows } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Workflow, WorkflowNodeRun, WorkflowRun } from './schema'

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

  /** Phase 6.15 iter120: 直近 N 件の run を作成日降順で */
  async listRecentRuns(tx: Tx, workflowId: string, limit = 5): Promise<WorkflowRun[]> {
    return await tx
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.workflowId, workflowId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(limit)
  },

  /** Phase 6.15 iter137: 1 run の node_runs を作成順 (engine の topological 実行順) で */
  async findRunById(tx: Tx, runId: string): Promise<WorkflowRun | null> {
    const rows = await tx.select().from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1)
    return rows[0] ?? null
  },

  async listNodeRuns(tx: Tx, runId: string): Promise<WorkflowNodeRun[]> {
    return await tx
      .select()
      .from(workflowNodeRuns)
      .where(eq(workflowNodeRuns.workflowRunId, runId))
      .orderBy(asc(workflowNodeRuns.createdAt))
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
