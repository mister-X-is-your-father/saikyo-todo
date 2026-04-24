import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { agentInvocations, agentMemories, agents } from '@/lib/db/schema'

/** MVP で稼働する Agent ロール。POST_MVP で増えたらここを拡張。 */
export const AGENT_ROLES = ['pm', 'researcher'] as const
export const AgentRoleSchema = z.enum(AGENT_ROLES)
export type AgentRole = z.infer<typeof AgentRoleSchema>

export const AgentSelectSchema = createSelectSchema(agents)
export type Agent = z.infer<typeof AgentSelectSchema>

export const AgentInvocationSelectSchema = createSelectSchema(agentInvocations)
export type AgentInvocation = z.infer<typeof AgentInvocationSelectSchema>

export const AgentMemorySelectSchema = createSelectSchema(agentMemories)
export type AgentMemory = z.infer<typeof AgentMemorySelectSchema>

/** agent_memories.role の DB enum と 1:1。Anthropic messages の role にマッピングする中間表現。 */
export const AGENT_MEMORY_ROLES = ['user', 'assistant', 'tool_call', 'tool_result'] as const
export const AgentMemoryRoleSchema = z.enum(AGENT_MEMORY_ROLES)
export type AgentMemoryRole = z.infer<typeof AgentMemoryRoleSchema>

export const AppendMemoryInputSchema = z.object({
  agentId: z.string().uuid(),
  role: AgentMemoryRoleSchema,
  content: z.string(),
  toolCalls: z.unknown().nullish(),
})
export type AppendMemoryInput = z.infer<typeof AppendMemoryInputSchema>

/** Anthropic Messages API に渡す入力を zod で定義。jsonb 列に保存される。 */
export const InvocationPromptSchema = z.object({
  system: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .min(1, 'messages は 1 件以上必要'),
  maxTokens: z.number().int().positive().max(16_384).optional(),
})
export type InvocationPrompt = z.infer<typeof InvocationPromptSchema>

export const EnqueueInvocationInputSchema = z.object({
  workspaceId: z.string().uuid(),
  role: AgentRoleSchema,
  /** Anthropic のモデル ID (例: 'claude-haiku-4-5')。pricing.ts に登録済であること。 */
  model: z.string().min(1),
  prompt: InvocationPromptSchema,
  /** 紐づく Item (分解対象など)。省略可。 */
  targetItemId: z.string().uuid().nullish(),
  idempotencyKey: z.string().uuid(),
})
export type EnqueueInvocationInput = z.infer<typeof EnqueueInvocationInputSchema>
