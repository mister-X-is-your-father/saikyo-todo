import 'server-only'

import { and, asc, eq } from 'drizzle-orm'

import { agentDecomposeProposals } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { DecomposeProposal } from './schema'

export const decomposeProposalRepository = {
  async findById(tx: Tx, id: string): Promise<DecomposeProposal | null> {
    const rows = await tx
      .select()
      .from(agentDecomposeProposals)
      .where(eq(agentDecomposeProposals.id, id))
      .limit(1)
    return (rows[0] ?? null) as DecomposeProposal | null
  },

  async listPendingByParent(tx: Tx, parentItemId: string): Promise<DecomposeProposal[]> {
    const rows = await tx
      .select()
      .from(agentDecomposeProposals)
      .where(
        and(
          eq(agentDecomposeProposals.parentItemId, parentItemId),
          eq(agentDecomposeProposals.statusProposal, 'pending'),
        ),
      )
      .orderBy(asc(agentDecomposeProposals.sortOrder), asc(agentDecomposeProposals.createdAt))
    return rows as DecomposeProposal[]
  },

  /** parent に紐づく proposal を全件 (履歴表示用、limit でページング)。 */
  async listAllByParent(tx: Tx, parentItemId: string, limit = 100): Promise<DecomposeProposal[]> {
    const rows = await tx
      .select()
      .from(agentDecomposeProposals)
      .where(eq(agentDecomposeProposals.parentItemId, parentItemId))
      .orderBy(asc(agentDecomposeProposals.sortOrder), asc(agentDecomposeProposals.createdAt))
      .limit(limit)
    return rows as DecomposeProposal[]
  },

  async update(
    tx: Tx,
    id: string,
    patch: Partial<typeof agentDecomposeProposals.$inferInsert>,
  ): Promise<DecomposeProposal | null> {
    const [row] = await tx
      .update(agentDecomposeProposals)
      .set(patch)
      .where(eq(agentDecomposeProposals.id, id))
      .returning()
    return (row ?? null) as DecomposeProposal | null
  },

  /** pending → rejected を一括更新 (parent 配下を全部却下する時)。 */
  async rejectAllPendingByParent(
    tx: Tx,
    parentItemId: string,
    reviewedBy: string,
  ): Promise<number> {
    const rows = await tx
      .update(agentDecomposeProposals)
      .set({
        statusProposal: 'rejected',
        reviewedAt: new Date(),
        reviewedBy,
      })
      .where(
        and(
          eq(agentDecomposeProposals.parentItemId, parentItemId),
          eq(agentDecomposeProposals.statusProposal, 'pending'),
        ),
      )
      .returning({ id: agentDecomposeProposals.id })
    return rows.length
  },
}
