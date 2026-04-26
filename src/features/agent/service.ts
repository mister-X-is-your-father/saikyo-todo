import 'server-only'

import { invokeModel } from '@/lib/ai/invoke'
import { calculateCostUsd } from '@/lib/ai/pricing'
import { recordAudit } from '@/lib/audit'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { adminDb, withUserDb } from '@/lib/db/scoped-client'
import { ExternalServiceError, NotFoundError, ValidationError } from '@/lib/errors'
import { enqueueJob } from '@/lib/jobs/queue'
import { err, ok, type Result } from '@/lib/result'

import { agentInvocationRepository, agentRepository } from './repository'
import {
  type Agent,
  type AgentInvocation,
  type AgentRole,
  EnqueueInvocationInputSchema,
  type InvocationPrompt,
} from './schema'

const NOT_FOUND = 'AgentInvocation が見つかりません'

const DEFAULT_DISPLAY_NAMES: Record<AgentRole, string> = {
  pm: 'PM Agent',
  researcher: 'Researcher Agent',
  engineer: 'Engineer Agent',
  reviewer: 'Reviewer Agent',
}

export const agentService = {
  /**
   * (workspaceId, role) の agent を返す。無ければ作る (idempotent)。
   * agents テーブルは system 管理なので service_role (adminDb) で扱う。
   */
  async ensureAgent(workspaceId: string, role: AgentRole): Promise<Agent> {
    return await adminDb.transaction(async (tx) => {
      const existing = await agentRepository.findByRole(tx, workspaceId, role)
      if (existing) return existing
      return await agentRepository.insert(tx, {
        workspaceId,
        role,
        displayName: DEFAULT_DISPLAY_NAMES[role],
        systemPromptVersion: 1,
      })
    })
  },

  /**
   * queued 状態の invocation を作成し、pg-boss に 'agent-run' ジョブを送信する。
   * worker プロセスが pickup して runInvocation を呼ぶ。
   * idempotencyKey が既存ならそれを返し、ジョブは送信しない (重複投入防止)。
   */
  async enqueue(input: unknown): Promise<Result<AgentInvocation>> {
    const parsed = EnqueueInvocationInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, role, model, prompt, targetItemId, idempotencyKey } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'member')

    const agent = await agentService.ensureAgent(workspaceId, role)

    const txResult = await withUserDb(
      user.id,
      async (tx): Promise<Result<{ row: AgentInvocation; isNew: boolean }>> => {
        const existing = await agentInvocationRepository.findByIdempotencyKey(tx, idempotencyKey)
        if (existing) {
          if (existing.workspaceId !== workspaceId) {
            return err(new ValidationError('idempotency_key は他 workspace で使用済み'))
          }
          return ok({ row: existing, isNew: false })
        }
        const row = await agentInvocationRepository.insert(tx, {
          agentId: agent.id,
          workspaceId,
          targetItemId: targetItemId ?? null,
          status: 'queued',
          input: prompt as never,
          model,
          idempotencyKey,
        })
        await recordAudit(tx, {
          workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'agent_invocation',
          targetId: row.id,
          action: 'enqueue',
          after: { status: row.status, model: row.model, role },
        })
        return ok({ row, isNew: true })
      },
    )
    if (!txResult.ok) return txResult
    // 新規 INSERT 時のみジョブ送信 (既存 row の再送は pickup 済の可能性あり)。
    // DB commit 後に送るため、send 失敗時は stranded な queued が残る (sweeper は post-MVP)。
    if (txResult.value.isNew) {
      await enqueueJob('agent-run', { invocationId: txResult.value.row.id })
    }
    return ok(txResult.value.row)
  },

  /**
   * queued な invocation を 1 件実行し、completed / failed に遷移させる。
   * worker から呼ばれる想定 (Day 15 P2 で pg-boss 経由)。
   * 現時点では Server Action からも同期呼び出し可能 (invokeSync)。
   * adminDb で動かす (UPDATE の RLS policy を付けていない → 将来 worker が唯一のライターとなる前提)。
   */
  async runInvocation(id: string): Promise<Result<AgentInvocation>> {
    const before = await adminDb.transaction((tx) => agentInvocationRepository.findById(tx, id))
    if (!before) return err(new NotFoundError(NOT_FOUND))
    if (before.status !== 'queued') {
      return err(new ValidationError(`invocation status は ${before.status} (queued 期待)`))
    }

    await adminDb.transaction(async (tx) => {
      await agentInvocationRepository.update(tx, id, {
        status: 'running',
        startedAt: new Date(),
      })
    })

    const prompt = before.input as InvocationPrompt

    try {
      const result = await invokeModel({
        model: before.model,
        ...(prompt.system ? { system: prompt.system } : {}),
        messages: prompt.messages,
        maxTokens: prompt.maxTokens,
      })
      const cost = calculateCostUsd(before.model, result.usage)

      return await adminDb.transaction(async (tx) => {
        const updated = await agentInvocationRepository.update(tx, id, {
          status: 'completed',
          output: {
            text: result.text,
            toolUses: result.toolUses,
            stopReason: result.stopReason,
          } as never,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          cacheCreationTokens: result.usage.cacheCreationTokens ?? null,
          cacheReadTokens: result.usage.cacheReadTokens ?? null,
          costUsd: cost.toFixed(6),
          finishedAt: new Date(),
        })
        if (!updated) return err(new NotFoundError(NOT_FOUND))
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'agent',
          actorId: before.agentId,
          targetType: 'agent_invocation',
          targetId: id,
          action: 'complete',
          after: {
            status: updated.status,
            costUsd: updated.costUsd,
            inputTokens: updated.inputTokens,
            outputTokens: updated.outputTokens,
          },
        })
        return ok(updated)
      })
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      const errorMessage = raw.slice(0, 2000)
      await adminDb.transaction(async (tx) => {
        await agentInvocationRepository.update(tx, id, {
          status: 'failed',
          errorMessage,
          finishedAt: new Date(),
        })
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'agent',
          actorId: before.agentId,
          targetType: 'agent_invocation',
          targetId: id,
          action: 'fail',
          after: { status: 'failed', errorMessage },
        })
      })
      // 元の外部エラーをラップして返す
      return err(e instanceof ExternalServiceError ? e : new ExternalServiceError('Anthropic', e))
    }
  },

  /**
   * enqueue → runInvocation を一括実行 (P1 便利メソッド / PoC 用)。
   * Server Action ではこれを使って構わないが、長時間処理になる場合は P2 で enqueue のみに切替える。
   */
  async invokeSync(input: unknown): Promise<Result<AgentInvocation>> {
    const enqueued = await agentService.enqueue(input)
    if (!enqueued.ok) return enqueued
    return await agentService.runInvocation(enqueued.value.id)
  },
}
