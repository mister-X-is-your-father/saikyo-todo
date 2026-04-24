/**
 * agent_memories の書き込み/読み込みは worker / Agent 実行コンテキストからのみ行われる。
 * 書き込み policy は付けていない (CLAUDE.md 方針: worker = service_role のみライター)。
 * よって adminDb を経由する。
 *
 * 本 service が単独で audit を取らない理由:
 *   - 各 memory 行は agent_invocations と紐付いて追跡される想定 (invocation 側で audit を書く)
 *   - memory append 毎に audit を増やすとノイズが過剰
 */
import 'server-only'

import { adminDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { agentMemoryRepository } from './repository'
import { type AgentMemory, AppendMemoryInputSchema } from './schema'

export const agentMemoryService = {
  /** 1 件 append。adminDb で書き込み (RLS は worker=service_role 前提)。 */
  async append(input: unknown): Promise<Result<AgentMemory>> {
    const parsed = AppendMemoryInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const row = await adminDb.transaction((tx) =>
      agentMemoryRepository.insert(tx, {
        agentId: parsed.data.agentId,
        role: parsed.data.role,
        content: parsed.data.content,
        toolCalls: parsed.data.toolCalls ?? null,
      }),
    )
    return ok(row)
  },

  /** 直近 N 件を古い順で返す (Anthropic messages に直接 feed できる順)。 */
  async loadRecent(agentId: string, limit = 20): Promise<AgentMemory[]> {
    return await adminDb.transaction((tx) => agentMemoryRepository.listRecent(tx, agentId, limit))
  },
}
