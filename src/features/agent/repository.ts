import 'server-only'

import { and, asc, desc, eq } from 'drizzle-orm'

import { agentInvocations, agentMemories, agents } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Agent, AgentInvocation, AgentMemory, AgentMemoryRole } from './schema'

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

export const agentMemoryRepository = {
  async insert(
    tx: Tx,
    values: {
      agentId: string
      role: AgentMemoryRole
      content: string
      toolCalls?: unknown
    },
  ): Promise<AgentMemory> {
    const [row] = await tx
      .insert(agentMemories)
      .values({
        agentId: values.agentId,
        role: values.role,
        content: values.content,
        toolCalls: (values.toolCalls ?? null) as never,
      })
      .returning()
    if (!row) throw new Error('insert agent_memories returned no row')
    return row as AgentMemory
  },

  /**
   * 指定 agent の会話履歴を「古い順」で最大 limit 件返す。
   * 実装: created_at DESC で limit 件取って逆順にする (最新 N 件を時系列順で返す)。
   */
  async listRecent(tx: Tx, agentId: string, limit = 20): Promise<AgentMemory[]> {
    const rows = await tx
      .select()
      .from(agentMemories)
      .where(eq(agentMemories.agentId, agentId))
      .orderBy(desc(agentMemories.createdAt))
      .limit(limit)
    return (rows as AgentMemory[]).reverse()
  },

  /** テスト用: 指定 agent の全メモリを古い順で返す。 */
  async listAll(tx: Tx, agentId: string): Promise<AgentMemory[]> {
    const rows = await tx
      .select()
      .from(agentMemories)
      .where(eq(agentMemories.agentId, agentId))
      .orderBy(asc(agentMemories.createdAt))
    return rows as AgentMemory[]
  },

  async deleteByAgent(tx: Tx, agentId: string): Promise<void> {
    await tx.delete(agentMemories).where(eq(agentMemories.agentId, agentId))
  },
}
