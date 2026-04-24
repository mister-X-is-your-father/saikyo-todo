import 'server-only'

import { and, eq } from 'drizzle-orm'

import { agentInvocations, agents } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Agent, AgentInvocation } from './schema'

export const agentRepository = {
  async findByRole(tx: Tx, workspaceId: string, role: string): Promise<Agent | null> {
    const [row] = await tx
      .select()
      .from(agents)
      .where(and(eq(agents.workspaceId, workspaceId), eq(agents.role, role)))
      .limit(1)
    return (row ?? null) as Agent | null
  },

  async insert(tx: Tx, values: typeof agents.$inferInsert): Promise<Agent> {
    const [row] = await tx.insert(agents).values(values).returning()
    if (!row) throw new Error('insert agents returned no row')
    return row as Agent
  },
}

export const agentInvocationRepository = {
  async findByIdempotencyKey(tx: Tx, key: string): Promise<AgentInvocation | null> {
    const [row] = await tx
      .select()
      .from(agentInvocations)
      .where(eq(agentInvocations.idempotencyKey, key))
      .limit(1)
    return (row ?? null) as AgentInvocation | null
  },

  async findById(tx: Tx, id: string): Promise<AgentInvocation | null> {
    const [row] = await tx
      .select()
      .from(agentInvocations)
      .where(eq(agentInvocations.id, id))
      .limit(1)
    return (row ?? null) as AgentInvocation | null
  },

  async insert(tx: Tx, values: typeof agentInvocations.$inferInsert): Promise<AgentInvocation> {
    const [row] = await tx.insert(agentInvocations).values(values).returning()
    if (!row) throw new Error('insert agent_invocations returned no row')
    return row as AgentInvocation
  },

  async update(
    tx: Tx,
    id: string,
    patch: Partial<typeof agentInvocations.$inferInsert>,
  ): Promise<AgentInvocation | null> {
    const [row] = await tx
      .update(agentInvocations)
      .set(patch)
      .where(eq(agentInvocations.id, id))
      .returning()
    return (row ?? null) as AgentInvocation | null
  },
}
