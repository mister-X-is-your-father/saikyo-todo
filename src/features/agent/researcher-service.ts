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

import { and, eq, isNull } from 'drizzle-orm'

import { runFlowViaClaude } from '@/lib/agent/claude-flow-runner'
import { streamingInvoker } from '@/lib/ai/invoke'
import { calculateCostUsd } from '@/lib/ai/pricing'
import { executeToolLoop, type ToolLoopInput } from '@/lib/ai/tool-loop'
import { recordAudit } from '@/lib/audit'
import { goals, keyResults, workspaceSettings } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { CancelledError, ExternalServiceError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { itemRepository } from '@/features/item/repository'

import { RESEARCHER_ROLE } from './roles/researcher'
import { checkBudget } from './cost-budget'
import { agentMemoryService } from './memory-service'
import { agentInvocationRepository } from './repository'
import { type Agent } from './schema'
import { agentService } from './service'
import { buildDecomposeTools, buildResearcherTools } from './tools'

export interface ResearcherRunInput {
  workspaceId: string
  userMessage: string
  targetItemId?: string | null
  idempotencyKey: string
  /**
   * 'researcher' = フル tool bundle (既定。自由に Item / Doc / Comment を作る)
   * 'decompose'  = staging mode (子 Item は agent_decompose_proposals に置く、commit はユーザー)
   */
  toolMode?: 'researcher' | 'decompose'
  /** toolMode='decompose' の時に必須。propose_child_item ツールが参照する。 */
  decomposeParentItemId?: string
  /** テスト用 DI: invokeModel を差し替える (executeToolLoop の invoker に流す) */
  invoker?: ToolLoopInput['invoker']
  /**
   * テスト用 DI: 中止判定を差し替える。省略時は invoker の有無で挙動が変わる:
   *   - invoker 未指定 (本番): agent_invocations.status を毎 iteration ポーリング
   *   - invoker 指定 (mock テスト): デフォルトでは abort しない
   */
  shouldAbort?: ToolLoopInput['shouldAbort']
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

    // 予算チェック (limit 設定済 + 超過なら BudgetExceededError)。
    // テストで invoker が DI されている時は skip (mock 用フローを汚さない)。
    if (!input.invoker) {
      const budget = await checkBudget(input.workspaceId)
      if (!budget.ok) return err(budget.error)
    }

    // Phase 6.15 iter146: iter142 の ANTHROPIC_API_KEY 検出 block を撤回。
    // プロジェクト方針は Claude Max OAuth + claude CLI 経由 (CLAUDE.md
    // "してはいけない" / scripts/claude-flow-runner.ts) なので env を要求
    // すること自体が誤り。本来 dev server の researcher も
    // claude-flow-runner と同じ CLI+MCP 経路で動かすべきで、その移行は
    // 別 iter で実装する (executeToolLoop / 既存 SDK 路線を残しつつ runner を
    // 切替えるアダプタを追加する想定)。

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

    // 5. tool bundle を bind (toolMode で staging / 通常 を切替)
    const toolCtx = {
      workspaceId: input.workspaceId,
      agentId: agent.id,
      agentRole: 'researcher' as const,
      agentInvocationId: invocation.id,
      ...(input.toolMode === 'decompose' && input.decomposeParentItemId
        ? { decomposeParentItemId: input.decomposeParentItemId }
        : {}),
    }
    const bundle =
      input.toolMode === 'decompose' ? buildDecomposeTools(toolCtx) : buildResearcherTools(toolCtx)

    // streaming text のための debounce 付き UPDATE。
    // テストで invoker が DI されている時は streaming しない (mock 互換のため)。
    const useStreaming = !input.invoker
    let streamBuf = ''
    let streamUpdateTimer: ReturnType<typeof setTimeout> | null = null
    const flushStreamingText = async () => {
      streamUpdateTimer = null
      if (!streamBuf) return
      const text = streamBuf
      try {
        await adminDb.transaction((tx) =>
          agentInvocationRepository.update(tx, invocation.id, {
            output: { streamingText: text } as never,
          }),
        )
      } catch (e) {
        // streaming 用の中間 UPDATE が失敗しても agent 実行自体は止めない
        console.warn('[researcher] streaming flush failed', e)
      }
    }
    const onTextDelta = (delta: string) => {
      streamBuf += delta
      if (!streamUpdateTimer) {
        streamUpdateTimer = setTimeout(() => void flushStreamingText(), 250)
      }
    }
    const invoker: ToolLoopInput['invoker'] | undefined = input.invoker
      ? input.invoker
      : useStreaming
        ? streamingInvoker(onTextDelta)
        : undefined

    /**
     * 中止判定: input.shouldAbort で DI、未指定なら invocation.status をポーリングする
     * (本番: ユーザーが cancelInvocationAction で status='cancelled' に立てたら次の
     * iteration で検知してループを抜ける)。input.invoker が DI されている mock テストで
     * shouldAbort も指定されていないときは "決して中止しない" (= undefined) を維持。
     */
    const shouldAbort: ToolLoopInput['shouldAbort'] | undefined =
      input.shouldAbort ??
      (input.invoker
        ? undefined
        : async () => {
            try {
              const row = await adminDb.transaction((tx) =>
                agentInvocationRepository.findById(tx, invocation.id),
              )
              return row?.status === 'cancelled'
            } catch (e) {
              console.warn('[researcher] shouldAbort poll failed', e)
              return false
            }
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
        ...(invoker ? { invoker } : {}),
        ...(shouldAbort ? { shouldAbort } : {}),
      })

      // streaming 完了: pending な timer をクリアして最終 flush は不要
      // (下の status='completed' UPDATE で output が上書きされるため)
      if (streamUpdateTimer) {
        clearTimeout(streamUpdateTimer)
        streamUpdateTimer = null
      }

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
      // streaming タイマがあれば畳む
      if (streamUpdateTimer) {
        clearTimeout(streamUpdateTimer)
        streamUpdateTimer = null
      }
      // CancelledError は failure ではなく "cancelled" として記録する。
      if (e instanceof CancelledError) {
        await adminDb.transaction(async (tx) => {
          // 既に cancelled (= cancelInvocationAction が status を立てた経路) のときは
          // finishedAt だけ詰めて再度上書き。currently running 状態から本関数内で
          // CancelledError を抜けたケース (ほぼ無いが defensive) でも cancelled に揃える。
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
    /**
     * staging=true (既定): 子は agent_decompose_proposals に置く (UI で承認するまで items に書かない)
     * staging=false: 旧挙動 (Researcher が直接 items に書く)。後方互換 / バッチ用
     */
    staging?: boolean
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
    const useStaging = params.staging !== false

    const userMessage = buildDecomposeUserMessage({
      itemId: item.id,
      title: item.title,
      description: item.description ?? '',
      isMust: item.isMust,
      dod: item.dod,
      extraHint: params.extraHint,
      staging: useStaging,
    })

    return await researcherService.run({
      workspaceId: params.workspaceId,
      userMessage,
      targetItemId: item.id,
      idempotencyKey: params.idempotencyKey,
      ...(useStaging ? { toolMode: 'decompose' as const, decomposeParentItemId: item.id } : {}),
      ...(params.invoker ? { invoker: params.invoker } : {}),
    })
  },

  /**
   * Phase 6.15 iter148: Claude Max OAuth + claude CLI 経由で Item を分解する。
   * `runFlowViaClaude` で MCP server に RESEARCHER_TOOLS を公開して `create_item`
   * を直接呼ばせるので、proposal staging 経路 (agent_decompose_proposals) は使わず、
   * 子 Item が直接 items テーブルに書かれる (UX 差は `via=claude-cli` で記録)。
   * env 必要なし。テストでは claude CLI 起動コストが大きいため smoke は v-acceptance に任せる。
   */
  async decomposeItemViaClaude(params: {
    workspaceId: string
    itemId: string
    extraHint?: string
    idempotencyKey: string
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
      // staging=false: claude CLI 経路は MCP の RESEARCHER_TOOLS を使うため、
      // staging mode (propose_child_item) は今のところ通らない。直接 create_item で書く。
      staging: false,
    })
    try {
      const out = await runFlowViaClaude({
        workspaceId: params.workspaceId,
        role: 'researcher',
        userMessage,
        // RESEARCHER_TOOLS の名前: 分解で必要十分な read + create_item セット
        allowedToolNames: ['read_items', 'read_docs', 'search_items', 'search_docs', 'create_item'],
        targetItemId: item.id,
        idempotencyKey: params.idempotencyKey,
      })
      return ok({
        invocationId: out.invocationId,
        agentId: out.agentId,
        text: out.finalText,
        toolCalls: [],
        iterations: out.numTurns,
        usage: {
          inputTokens: out.inputTokens,
          outputTokens: out.outputTokens,
          cacheCreationTokens: out.cacheCreationTokens,
          cacheReadTokens: out.cacheReadTokens,
        },
        costUsd: out.totalCostUsd,
      })
    } catch (e) {
      return err(new ExternalServiceError('claude-cli', e))
    }
  },

  /**
   * 対象 Item を Researcher に調査させ、結果を Doc として保存させる便利エントリ。
   * decomposeItem と同じパターン。Agent は `search_docs` → `create_doc` の順で動く。
   */
  async researchItem(params: {
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

    const userMessage = buildResearchUserMessage({
      itemId: item.id,
      title: item.title,
      description: item.description ?? '',
      ...(params.extraHint ? { extraHint: params.extraHint } : {}),
    })

    return await researcherService.run({
      workspaceId: params.workspaceId,
      userMessage,
      targetItemId: item.id,
      idempotencyKey: params.idempotencyKey,
      ...(params.invoker ? { invoker: params.invoker } : {}),
    })
  },

  /**
   * Phase 6.15 iter128: Goal を読み、KR ごとに Item を作って分解する。
   * チームコンテキスト (workspace_settings.team_context) を prompt に inject する。
   * staging は使わず、Researcher が直接 create_item で root 直下に items を作る。
   */
  async decomposeGoal(params: {
    workspaceId: string
    goalId: string
    extraHint?: string
    idempotencyKey: string
    invoker?: ToolLoopInput['invoker']
  }): Promise<Result<ResearcherRunOutput>> {
    if (!params.idempotencyKey) {
      return err(new ValidationError('idempotencyKey は必須です'))
    }
    const ctx = await adminDb.transaction(async (tx) => {
      const [goal] = await tx
        .select()
        .from(goals)
        .where(and(eq(goals.id, params.goalId), isNull(goals.deletedAt)))
        .limit(1)
      if (!goal) return null
      const krs = await tx.select().from(keyResults).where(eq(keyResults.goalId, goal.id))
      const [ws] = await tx
        .select({ teamContext: workspaceSettings.teamContext })
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, goal.workspaceId))
        .limit(1)
      return { goal, krs, teamContext: ws?.teamContext ?? '' }
    })
    if (!ctx) return err(new NotFoundError('Goal が見つかりません'))
    if (ctx.goal.workspaceId !== params.workspaceId) {
      return err(new ValidationError('Goal が指定 workspace に属していません'))
    }

    const userMessage = buildDecomposeGoalUserMessage({
      goalId: ctx.goal.id,
      title: ctx.goal.title,
      description: ctx.goal.description ?? '',
      period: ctx.goal.period,
      startDate: ctx.goal.startDate,
      endDate: ctx.goal.endDate,
      keyResults: ctx.krs.map((k) => ({ title: k.title, mode: k.progressMode })),
      teamContext: ctx.teamContext,
      ...(params.extraHint ? { extraHint: params.extraHint } : {}),
    })

    return await researcherService.run({
      workspaceId: params.workspaceId,
      userMessage,
      idempotencyKey: params.idempotencyKey,
      ...(params.invoker ? { invoker: params.invoker } : {}),
    })
  },

  /**
   * Phase 6.15 iter149: Goal を Claude Max OAuth + claude CLI 経由で分解する。
   * decomposeItemViaClaude と同じく env 不要。Goal + KR + チームコンテキストを
   * prompt に inject、MCP server に RESEARCHER_TOOLS を公開して create_item で
   * 子 Item を直接作成させる。
   */
  async decomposeGoalViaClaude(params: {
    workspaceId: string
    goalId: string
    extraHint?: string
    idempotencyKey: string
  }): Promise<Result<ResearcherRunOutput>> {
    if (!params.idempotencyKey) {
      return err(new ValidationError('idempotencyKey は必須です'))
    }
    const ctx = await adminDb.transaction(async (tx) => {
      const [goal] = await tx
        .select()
        .from(goals)
        .where(and(eq(goals.id, params.goalId), isNull(goals.deletedAt)))
        .limit(1)
      if (!goal) return null
      const krs = await tx.select().from(keyResults).where(eq(keyResults.goalId, goal.id))
      const [ws] = await tx
        .select({ teamContext: workspaceSettings.teamContext })
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, goal.workspaceId))
        .limit(1)
      return { goal, krs, teamContext: ws?.teamContext ?? '' }
    })
    if (!ctx) return err(new NotFoundError('Goal が見つかりません'))
    if (ctx.goal.workspaceId !== params.workspaceId) {
      return err(new ValidationError('Goal が指定 workspace に属していません'))
    }

    const userMessage = buildDecomposeGoalUserMessage({
      goalId: ctx.goal.id,
      title: ctx.goal.title,
      description: ctx.goal.description ?? '',
      period: ctx.goal.period,
      startDate: ctx.goal.startDate,
      endDate: ctx.goal.endDate,
      keyResults: ctx.krs.map((k) => ({ title: k.title, mode: k.progressMode })),
      teamContext: ctx.teamContext,
      ...(params.extraHint ? { extraHint: params.extraHint } : {}),
    })
    try {
      const out = await runFlowViaClaude({
        workspaceId: params.workspaceId,
        role: 'researcher',
        userMessage,
        allowedToolNames: ['read_items', 'read_docs', 'search_items', 'search_docs', 'create_item'],
        idempotencyKey: params.idempotencyKey,
      })
      return ok({
        invocationId: out.invocationId,
        agentId: out.agentId,
        text: out.finalText,
        toolCalls: [],
        iterations: out.numTurns,
        usage: {
          inputTokens: out.inputTokens,
          outputTokens: out.outputTokens,
          cacheCreationTokens: out.cacheCreationTokens,
          cacheReadTokens: out.cacheReadTokens,
        },
        costUsd: out.totalCostUsd,
      })
    } catch (e) {
      return err(new ExternalServiceError('claude-cli', e))
    }
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
  /** 省略時 true (staging mode)。 */
  staging?: boolean
}): string {
  const useStaging = params.staging !== false
  const lines: string[] = []
  lines.push('以下の Item を 3〜5 件の子タスクに分解してください。')
  lines.push('')
  lines.push(`- 親 Item の id: ${params.itemId}`)
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
  if (useStaging) {
    lines.push(
      '2. propose_child_item を 3〜5 回呼び、各子タスク候補を提案する。' +
        'parentItemId は ctx で固定なので渡す必要なし。即時 items には作成されず、' +
        'ユーザーが UI で 1 件ずつ採用 / 却下する',
    )
  } else {
    lines.push(
      `2. create_item を 3〜5 回呼び、各子タスクを作る。parentItemId は必ず ${params.itemId} を渡すこと`,
    )
  }
  lines.push('3. 親が MUST でない子は isMust=false でよい。子の dod は可能なら記載する')
  lines.push('4. 最後に作った子タスクのタイトル一覧と意図を簡潔に日本語でまとめる')
  return lines.join('\n')
}

/**
 * Phase 6.15 iter128: Goal を Item に分解する user prompt。
 * - Goal title / description / period / KR 一覧 + チームコンテキストを inject
 * - Researcher は create_item で root 直下に items を作る (parentItemId なし)
 * - KR と紐付けたい場合は description に "KR: <title>" と書くよう誘導 (現状 create_item に
 *   keyResultId 引数が無いため、ユーザが UI で後からリンクする想定)
 */
export function buildDecomposeGoalUserMessage(params: {
  goalId: string
  title: string
  description: string
  period: string
  startDate: string
  endDate: string
  keyResults: Array<{ title: string; mode: string }>
  teamContext: string
  extraHint?: string
}): string {
  const lines: string[] = []
  lines.push('以下の Goal を達成するための実行 Item を 5〜10 件に分解してください。')
  lines.push('')
  lines.push(`- Goal id: ${params.goalId}`)
  lines.push(`- Goal タイトル: ${params.title}`)
  if (params.description.trim()) {
    lines.push('- Goal 説明:')
    lines.push(params.description.trim())
  }
  lines.push(`- 期間: ${params.period} (${params.startDate} 〜 ${params.endDate})`)
  if (params.keyResults.length > 0) {
    lines.push('- Key Results:')
    for (const kr of params.keyResults) {
      lines.push(`  * ${kr.title} [mode: ${kr.mode}]`)
    }
  }
  if (params.teamContext.trim()) {
    lines.push('')
    lines.push('## チームコンテキスト (workspace 共通方針)')
    lines.push(params.teamContext.trim())
  }
  if (params.extraHint && params.extraHint.trim()) {
    lines.push('')
    lines.push('## 追加指示')
    lines.push(params.extraHint.trim())
  }
  lines.push('')
  lines.push('手順:')
  lines.push('1. 必要に応じて search_docs で過去の関連方針を確認 (要らなければ省略)')
  lines.push(
    '2. create_item を 5〜10 回呼び、各 Item を作る。parentItemId は渡さない (root 直下)。' +
      '対応する KR があれば description に "KR: <KR タイトル>" を含める',
  )
  lines.push('3. dueDate は Goal の期間内に分散させる (期日を均等に配置するイメージ)')
  lines.push('4. 重要な item は isMust=true + dod を記載する')
  lines.push('5. 最後に作った Item のタイトル一覧と分解の意図を簡潔に日本語でまとめる')
  return lines.join('\n')
}

/**
 * 調査用 user prompt。Agent に search_docs → create_doc の流れを誘導する。
 *   - 関連 Doc を hybrid 検索で引き、既知情報を整理
 *   - 不足があれば read_items で周辺タスクも確認
 *   - 最後に調査メモを create_doc で保存 (title は対象 Item タイトルを踏まえる)
 */
export function buildResearchUserMessage(params: {
  itemId: string
  title: string
  description: string
  extraHint?: string
}): string {
  const lines: string[] = []
  lines.push('以下の Item に関する調査を行い、結果を新しい Doc として保存してください。')
  lines.push('')
  lines.push(`- 対象 Item id: ${params.itemId}`)
  lines.push(`- タイトル: ${params.title}`)
  if (params.description && params.description.trim().length > 0) {
    lines.push('- 説明:')
    lines.push(params.description.trim())
  }
  if (params.extraHint && params.extraHint.trim().length > 0) {
    lines.push('')
    lines.push('追加指示:')
    lines.push(params.extraHint.trim())
  }
  lines.push('')
  lines.push('手順:')
  lines.push('1. search_docs で関連チャンクを探す (複数クエリ歓迎)')
  lines.push('2. 必要に応じて read_docs で Doc 一覧を確認 (重複調査を避ける)')
  lines.push('3. read_items / search_items で関連タスクがあれば参照')
  lines.push(
    '4. 調査結果を Markdown で整理し、create_doc で 1 本の Doc として保存する' +
      ' (title には対象 Item タイトルを含める、body は 300〜3000 文字目安)',
  )
  lines.push('5. 最後に Doc の要旨を日本語 3〜5 行でまとめて返答する')
  return lines.join('\n')
}
