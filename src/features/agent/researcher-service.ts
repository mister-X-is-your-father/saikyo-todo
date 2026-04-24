/**
 * Researcher Agent 実行エントリ。
 *
 * 流れ (single call):
 *   1. ensureAgent('researcher')
 *   2. agent_memories から過去 N 件 (user/assistant) を復元 → Anthropic messages に変換
 *   3. 新規 user メッセージを memories に append
 *   4. agent_invocations row を直接 insert (queued) → running に遷移
 *   5. buildResearcherTools(ctx) で tool bundle を bind
 *   6. executeToolLoop を回し、各 tool 呼び出しを memories に tool_call / tool_result で記録
 *   7. 最終 assistant テキストを memories に append
 *   8. invocation を completed に遷移 + tokens/cost/output 反映 + audit
 *
 * worker (pg-boss) 連携は Day 21 で実装予定。現時点では Server Action から同期起動できる
 * 形にしている。`invoker` DI によりテストでは mock 可能。
 */
import 'server-only'

import { calculateCostUsd } from '@/lib/ai/pricing'
import { executeToolLoop, type ToolLoopInput } from '@/lib/ai/tool-loop'
import { recordAudit } from '@/lib/audit'
import { adminDb } from '@/lib/db/scoped-client'
import { ExternalServiceError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { itemRepository } from '@/features/item/repository'

import { RESEARCHER_ROLE } from './roles/researcher'
import { agentMemoryService } from './memory-service'
import { agentInvocationRepository } from './repository'
import { type Agent } from './schema'
import { agentService } from './service'
import { buildResearcherTools } from './tools'

export interface ResearcherRunInput {
  workspaceId: string
  userMessage: string
  targetItemId?: string | null
  idempotencyKey: string
  /** テスト用 DI: invokeModel を差し替える (executeToolLoop の invoker に流す) */
  invoker?: ToolLoopInput['invoker']
}

export interface ResearcherRunOutput {
  invocationId: string
  agentId: string
  text: string
  toolCalls: Array<{ name: string; input: unknown; result: string }>
  iterations: number
  usage: {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens?: number | null
    cacheReadTokens?: number | null
  }
  costUsd: number
}

export const researcherService = {
  async run(input: ResearcherRunInput): Promise<Result<ResearcherRunOutput>> {
    if (!input.userMessage || input.userMessage.trim().length === 0) {
      return err(new ValidationError('userMessage を入力してください'))
    }
    if (!input.idempotencyKey) {
      return err(new ValidationError('idempotencyKey は必須です'))
    }

    const agent: Agent = await agentService.ensureAgent(input.workspaceId, 'researcher')

    // 1. 過去メモリ (user/assistant のみ) を Anthropic messages に変換
    const past = await agentMemoryService.loadRecent(agent.id, RESEARCHER_ROLE.memoryLimit)
    const historyMessages: ToolLoopInput['initialMessages'] = past
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    // 2. 今回の user メッセージを memory に append、messages にも追加
    await agentMemoryService.append({
      agentId: agent.id,
      role: 'user',
      content: input.userMessage,
    })
    const initialMessages = [
      ...historyMessages,
      { role: 'user' as const, content: input.userMessage },
    ]

    // 3. queued invocation を directly insert (adminDb)
    const invocation = await adminDb.transaction(async (tx) =>
      agentInvocationRepository.insert(tx, {
        agentId: agent.id,
        workspaceId: input.workspaceId,
        targetItemId: input.targetItemId ?? null,
        status: 'queued',
        input: {
          userMessage: input.userMessage,
          role: 'researcher',
          systemPromptVersion: RESEARCHER_ROLE.systemPromptVersion,
        } as never,
        model: RESEARCHER_ROLE.model,
        idempotencyKey: input.idempotencyKey,
      }),
    )

    // 4. running に遷移
    await adminDb.transaction((tx) =>
      agentInvocationRepository.update(tx, invocation.id, {
        status: 'running',
        startedAt: new Date(),
      }),
    )

    // 5. tool bundle を bind
    const bundle = buildResearcherTools({
      workspaceId: input.workspaceId,
      agentId: agent.id,
      agentRole: 'researcher',
    })

    try {
      const loopResult = await executeToolLoop({
        model: RESEARCHER_ROLE.model,
        system: RESEARCHER_ROLE.systemPrompt,
        initialMessages,
        tools: bundle.tools,
        handlers: bundle.handlers,
        maxIterations: RESEARCHER_ROLE.maxIterations,
        maxTokens: RESEARCHER_ROLE.maxTokens,
        ...(input.invoker ? { invoker: input.invoker } : {}),
      })

      // 6. tool_call / tool_result を memories に記録 (監査用ログ、再生はしない)
      for (const call of loopResult.toolCalls) {
        await agentMemoryService.append({
          agentId: agent.id,
          role: 'tool_call',
          content: call.name,
          toolCalls: call.input,
        })
        await agentMemoryService.append({
          agentId: agent.id,
          role: 'tool_result',
          content: call.result.slice(0, 50_000),
        })
      }

      // 7. 最終 assistant テキストを memory に append
      if (loopResult.text.length > 0) {
        await agentMemoryService.append({
          agentId: agent.id,
          role: 'assistant',
          content: loopResult.text,
        })
      }

      // 8. invocation を completed に遷移
      const cost = calculateCostUsd(RESEARCHER_ROLE.model, loopResult.usage)
      await adminDb.transaction(async (tx) => {
        const updated = await agentInvocationRepository.update(tx, invocation.id, {
          status: 'completed',
          output: {
            text: loopResult.text,
            toolCalls: loopResult.toolCalls,
            iterations: loopResult.iterations,
            stopReason: loopResult.stopReason,
          } as never,
          inputTokens: loopResult.usage.inputTokens,
          outputTokens: loopResult.usage.outputTokens,
          cacheCreationTokens: loopResult.usage.cacheCreationTokens ?? null,
          cacheReadTokens: loopResult.usage.cacheReadTokens ?? null,
          costUsd: cost.toFixed(6),
          finishedAt: new Date(),
        })
        if (updated) {
          await recordAudit(tx, {
            workspaceId: input.workspaceId,
            actorType: 'agent',
            actorId: agent.id,
            targetType: 'agent_invocation',
            targetId: invocation.id,
            action: 'complete',
            after: {
              status: updated.status,
              costUsd: updated.costUsd,
              toolCallCount: loopResult.toolCalls.length,
              iterations: loopResult.iterations,
            },
          })
        }
      })

      return ok({
        invocationId: invocation.id,
        agentId: agent.id,
        text: loopResult.text,
        toolCalls: loopResult.toolCalls,
        iterations: loopResult.iterations,
        usage: loopResult.usage,
        costUsd: cost,
      })
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      const errorMessage = raw.slice(0, 2000)
      await adminDb.transaction(async (tx) => {
        await agentInvocationRepository.update(tx, invocation.id, {
          status: 'failed',
          errorMessage,
          finishedAt: new Date(),
        })
        await recordAudit(tx, {
          workspaceId: input.workspaceId,
          actorType: 'agent',
          actorId: agent.id,
          targetType: 'agent_invocation',
          targetId: invocation.id,
          action: 'fail',
          after: { status: 'failed', errorMessage },
        })
      })
      return err(e instanceof ExternalServiceError ? e : new ExternalServiceError('Anthropic', e))
    }
  },

  /**
   * 対象 Item を Researcher に「子 Item 3-5 件」に分解させる便利エントリ。
   * 内部で `run` を呼ぶだけの薄いラッパで、以下を担う:
   *   - target Item の存在 / workspace 一致チェック
   *   - 分解向け user prompt の組み立て (parentItemId / title / description / dod)
   *   - `targetItemId` を invocation row に記録
   *
   * 実際の子 Item 生成は Agent が `create_item` ツールを parentItemId 付きで呼ぶことで行う。
   * UI / Server Action 側はこの関数だけ呼べばよい。
   */
  async decomposeItem(params: {
    workspaceId: string
    itemId: string
    extraHint?: string
    idempotencyKey: string
    invoker?: ToolLoopInput['invoker']
  }): Promise<Result<ResearcherRunOutput>> {
    if (!params.idempotencyKey) {
      return err(new ValidationError('idempotencyKey は必須です'))
    }
    const item = await adminDb.transaction((tx) => itemRepository.findById(tx, params.itemId))
    if (!item) return err(new NotFoundError('Item が見つかりません'))
    if (item.workspaceId !== params.workspaceId) {
      return err(new ValidationError('Item が指定 workspace に属していません'))
    }

    const userMessage = buildDecomposeUserMessage({
      itemId: item.id,
      title: item.title,
      description: item.description ?? '',
      isMust: item.isMust,
      dod: item.dod,
      extraHint: params.extraHint,
    })

    return await researcherService.run({
      workspaceId: params.workspaceId,
      userMessage,
      targetItemId: item.id,
      idempotencyKey: params.idempotencyKey,
      ...(params.invoker ? { invoker: params.invoker } : {}),
    })
  },
}

/**
 * 分解用 user prompt。Agent が以下を確実にするよう誘導する:
 *   - create_item を parentItemId={itemId} で呼ぶ (root 直下ではなく target の子になる)
 *   - 3-5 件に収める (過剰分割を避ける)
 *   - 各子は title + description + (必要なら isMust+dod)
 */
export function buildDecomposeUserMessage(params: {
  itemId: string
  title: string
  description: string
  isMust: boolean
  dod: string | null
  extraHint?: string
}): string {
  const lines: string[] = []
  lines.push('以下の Item を 3〜5 件の子タスクに分解してください。')
  lines.push('')
  lines.push(`- 親 Item の id (parentItemId に渡す): ${params.itemId}`)
  lines.push(`- タイトル: ${params.title}`)
  if (params.description && params.description.trim().length > 0) {
    lines.push('- 説明:')
    lines.push(params.description.trim())
  }
  if (params.isMust) {
    lines.push('- 親は MUST タスクです (DoD 必須)')
    if (params.dod && params.dod.trim().length > 0) {
      lines.push(`- 親 DoD: ${params.dod.trim()}`)
    }
  }
  if (params.extraHint && params.extraHint.trim().length > 0) {
    lines.push('')
    lines.push('追加指示:')
    lines.push(params.extraHint.trim())
  }
  lines.push('')
  lines.push('手順:')
  lines.push(
    '1. 必要に応じて read_items / search_docs で周辺コンテキストを確認する (要らなければ省略)',
  )
  lines.push(
    `2. create_item を 3〜5 回呼び、各子タスクを作る。parentItemId は必ず ${params.itemId} を渡すこと`,
  )
  lines.push('3. 親が MUST でない子は isMust=false でよい。子の dod は可能なら記載する')
  lines.push('4. 最後に作った子タスクのタイトル一覧と意図を簡潔に日本語でまとめる')
  return lines.join('\n')
}
