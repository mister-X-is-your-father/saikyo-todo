/**
 * PM Agent 実行エントリ。Researcher の pattern を踏襲。
 *
 * 特徴:
 *   - model: claude-haiku-4-5 (安価)
 *   - tools: PM_TOOLS (create_item / instantiate_template 無し、stand-up 専用)
 *   - stand-up: runStandup(workspaceId) で日次サマリ生成、Doc として保存
 *
 * cron 化 (Day 25) では worker から runStandup を呼ぶ予定。MVP 現時点では Server Action
 * 経由で手動起動も可能。
 */
import 'server-only'

import { calculateCostUsd } from '@/lib/ai/pricing'
import { executeToolLoop, type ToolLoopInput } from '@/lib/ai/tool-loop'
import { recordAudit } from '@/lib/audit'
import { adminDb } from '@/lib/db/scoped-client'
import { CancelledError, ExternalServiceError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { PM_ROLE } from './roles/pm'
import { agentMemoryService } from './memory-service'
import { agentInvocationRepository } from './repository'
import { type Agent } from './schema'
import { agentService } from './service'
import { buildPmTools } from './tools'

export interface PmRunInput {
  workspaceId: string
  userMessage: string
  idempotencyKey: string
  invoker?: ToolLoopInput['invoker']
}

export interface PmRunOutput {
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

export const pmService = {
  async run(input: PmRunInput): Promise<Result<PmRunOutput>> {
    if (!input.userMessage || input.userMessage.trim().length === 0) {
      return err(new ValidationError('userMessage を入力してください'))
    }
    if (!input.idempotencyKey) {
      return err(new ValidationError('idempotencyKey は必須です'))
    }

    const agent: Agent = await agentService.ensureAgent(input.workspaceId, 'pm')

    const past = await agentMemoryService.loadRecent(agent.id, PM_ROLE.memoryLimit)
    const historyMessages: ToolLoopInput['initialMessages'] = past
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    await agentMemoryService.append({
      agentId: agent.id,
      role: 'user',
      content: input.userMessage,
    })
    const initialMessages = [
      ...historyMessages,
      { role: 'user' as const, content: input.userMessage },
    ]

    const invocation = await adminDb.transaction(async (tx) =>
      agentInvocationRepository.insert(tx, {
        agentId: agent.id,
        workspaceId: input.workspaceId,
        targetItemId: null,
        status: 'queued',
        input: {
          userMessage: input.userMessage,
          role: 'pm',
          systemPromptVersion: PM_ROLE.systemPromptVersion,
        } as never,
        model: PM_ROLE.model,
        idempotencyKey: input.idempotencyKey,
      }),
    )

    await adminDb.transaction((tx) =>
      agentInvocationRepository.update(tx, invocation.id, {
        status: 'running',
        startedAt: new Date(),
      }),
    )

    const bundle = buildPmTools({
      workspaceId: input.workspaceId,
      agentId: agent.id,
      agentRole: 'pm',
    })

    /** ユーザーが cancelInvocationAction で status='cancelled' に立てたら abort */
    const shouldAbort = input.invoker
      ? undefined
      : async () => {
          try {
            const row = await adminDb.transaction((tx) =>
              agentInvocationRepository.findById(tx, invocation.id),
            )
            return row?.status === 'cancelled'
          } catch (e) {
            console.warn('[pm] shouldAbort poll failed', e)
            return false
          }
        }

    try {
      const loopResult = await executeToolLoop({
        model: PM_ROLE.model,
        system: PM_ROLE.systemPrompt,
        initialMessages,
        tools: bundle.tools,
        handlers: bundle.handlers,
        maxIterations: PM_ROLE.maxIterations,
        maxTokens: PM_ROLE.maxTokens,
        ...(input.invoker ? { invoker: input.invoker } : {}),
        ...(shouldAbort ? { shouldAbort } : {}),
      })

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
      if (loopResult.text.length > 0) {
        await agentMemoryService.append({
          agentId: agent.id,
          role: 'assistant',
          content: loopResult.text,
        })
      }

      const cost = calculateCostUsd(PM_ROLE.model, loopResult.usage)
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
      if (e instanceof CancelledError) {
        await adminDb.transaction(async (tx) => {
          await agentInvocationRepository.update(tx, invocation.id, {
            status: 'cancelled',
            errorMessage: null,
            finishedAt: new Date(),
          })
          await recordAudit(tx, {
            workspaceId: input.workspaceId,
            actorType: 'agent',
            actorId: agent.id,
            targetType: 'agent_invocation',
            targetId: invocation.id,
            action: 'cancel',
            after: { status: 'cancelled' },
          })
        })
        return err(e)
      }
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
   * 朝 standup を 1 回実行する便利メソッド。
   * - 固定 prompt: 昨日 done / 今日 MUST / 遅延リスク / 次アクション 3-5
   * - run に委譲。返りの text をそのまま UI 表示 (Doc は Agent 自身が create_doc で作る)
   */
  async runStandup(params: {
    workspaceId: string
    idempotencyKey: string
    invoker?: ToolLoopInput['invoker']
  }): Promise<Result<PmRunOutput>> {
    const userMessage = buildStandupUserMessage({ today: new Date() })
    return await pmService.run({
      workspaceId: params.workspaceId,
      userMessage,
      idempotencyKey: params.idempotencyKey,
      ...(params.invoker ? { invoker: params.invoker } : {}),
    })
  },

  /**
   * MUST 遅延救済。stage='1d' or 'overdue' の MUST Item に対して
   * 遅延要因 / 代替案 / 代替担当候補を整理し、Item に注意喚起コメントと
   * Doc 形式の Recovery plan を残す。
   */
  async runRecovery(params: {
    workspaceId: string
    itemId: string
    stage: '1d' | 'overdue'
    idempotencyKey: string
    invoker?: ToolLoopInput['invoker']
  }): Promise<Result<PmRunOutput>> {
    const userMessage = buildRecoveryUserMessage({
      itemId: params.itemId,
      stage: params.stage,
    })
    return await pmService.run({
      workspaceId: params.workspaceId,
      userMessage,
      idempotencyKey: params.idempotencyKey,
      ...(params.invoker ? { invoker: params.invoker } : {}),
    })
  },
}

/**
 * Pure helper: MUST Recovery 用 user message を組み立てる。
 * stage によって urgency tone を切り替える (overdue の方がより強い)。
 */
export function buildRecoveryUserMessage(params: {
  itemId: string
  stage: '1d' | 'overdue'
}): string {
  const tone =
    params.stage === 'overdue'
      ? '**期限超過** の MUST です。即座に救済が必要。'
      : '**期限直前 (1 日以内)** の MUST です。落とさないための手を打ってください。'
  return [
    `MUST Item id=${params.itemId} について Recovery Plan を作成してください。`,
    '',
    tone,
    '',
    '手順:',
    `1. read_items で id=${params.itemId} の現状 (title / dueDate / DoD / assignees / description) を確認`,
    '2. search_items / read_docs で関連コンテキスト (子 Item / 過去 Doc / 類似タスク) を最大 3 件取得',
    '3. 以下の構成で Recovery Plan を作る:',
    '   - 遅延要因 3 つ (根拠/推測を明示)',
    '   - 代替案 3 つ (スコープ縮小 / 期限再交渉 / 外部依頼 等)',
    '   - 代替担当候補 2 名 (現担当の負荷 / スキルマッチ)',
    '   - 直近 24h のアクション (誰が何を)',
    `4. create_doc で保存 (title: "MUST Recovery - ${params.itemId.slice(0, 8)} - ${params.stage}")`,
    `5. write_comment で Item id=${params.itemId} に注意喚起コメントを投下 (Recovery Plan Doc への参照 + TL;DR 3 行)`,
    '6. 最後に日本語 3 行で状況と次アクションをサマリで返す',
  ].join('\n')
}

/** Pure helper: stand-up 用 user message を組み立てる (テスト可能)。 */
export function buildStandupUserMessage(params: { today: Date }): string {
  const iso = params.today.toISOString().slice(0, 10)
  return [
    `${iso} の朝の Stand-up をまとめてください。`,
    '',
    '手順:',
    '1. read_items で今週の Item 状態を確認 (MUST を優先)',
    '2. 必要なら search_items / read_docs で補足情報を取る',
    '3. Markdown で以下の構成のサマリを作る',
    '   - 昨日の done (上位 3-5 件、無ければ空欄で可)',
    '   - 今日の MUST (優先度順 3-5 件)',
    '   - 遅延リスク (期日近の停滞 Item。推測は明示)',
    '   - 次アクション 3-5 (誰が何をやるか)',
    `4. 上記を create_doc で保存 (title: "Daily Stand-up ${iso}")`,
    '5. 最後に日本語 3-5 行でサマリを返す',
  ].join('\n')
}
