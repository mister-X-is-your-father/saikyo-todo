/**
 * agentService integration test.
 * 実 Supabase + RLS + audit を通す。Anthropic SDK だけ vi.mock。
 *
 * 前提: `pnpm exec supabase start` で local Supabase が動いていること。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { InvokeModelOutput } from '@/lib/ai/invoke'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

// auth guard mock (user だけ差し替え)
vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

// Anthropic SDK (実 API を叩かない)
vi.mock('@/lib/ai/invoke', () => ({
  invokeModel: vi.fn(),
}))

// pg-boss (実ジョブ送信しない)
vi.mock('@/lib/jobs/queue', () => ({
  startBoss: vi.fn(),
  stopBoss: vi.fn(),
  enqueueJob: vi.fn().mockResolvedValue('mock-job-id'),
  registerWorker: vi.fn(),
  QUEUE_NAMES: ['agent-run'],
}))

import { invokeModel } from '@/lib/ai/invoke'
import { enqueueJob } from '@/lib/jobs/queue'

import { agentService } from './service'

const mockInvoke = vi.mocked(invokeModel)
const mockEnqueueJob = vi.mocked(enqueueJob)

function buildInvokeResult(overrides: Partial<InvokeModelOutput> = {}): InvokeModelOutput {
  return {
    text: 'こんにちは',
    toolUses: [],
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationTokens: null,
      cacheReadTokens: null,
    },
    stopReason: 'end_turn',
    model: 'claude-haiku-4-5',
    rawMessage: {} as InvokeModelOutput['rawMessage'],
    ...overrides,
  }
}

function buildEnqueueInput(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId: 'WILL_BE_SET_IN_TEST',
    role: 'pm' as const,
    model: 'claude-haiku-4-5',
    prompt: {
      messages: [{ role: 'user' as const, content: 'テストメッセージ' }],
      maxTokens: 500,
    },
    idempotencyKey: randomUUID(),
    ...overrides,
  }
}

describe('agentService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('agent-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  beforeEach(() => {
    mockInvoke.mockReset()
    mockEnqueueJob.mockReset().mockResolvedValue('mock-job-id')
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('ensureAgent', () => {
    it('初回で agent 作成、2 回目は同一 id を返す (idempotent)', async () => {
      const a = await agentService.ensureAgent(wsId, 'pm')
      const b = await agentService.ensureAgent(wsId, 'pm')
      expect(a.id).toBe(b.id)
      expect(a.workspaceId).toBe(wsId)
      expect(a.role).toBe('pm')
      expect(a.displayName).toBe('PM Agent')
    })

    it('role ごとに別 agent', async () => {
      const pm = await agentService.ensureAgent(wsId, 'pm')
      const rs = await agentService.ensureAgent(wsId, 'researcher')
      expect(pm.id).not.toBe(rs.id)
      expect(rs.role).toBe('researcher')
    })
  })

  describe('enqueue', () => {
    it('queued 状態で invocation を作成する', async () => {
      const result = await agentService.enqueue(buildEnqueueInput({ workspaceId: wsId }))
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.status).toBe('queued')
        expect(result.value.workspaceId).toBe(wsId)
        expect(result.value.model).toBe('claude-haiku-4-5')
        expect(result.value.startedAt).toBeNull()
        expect(result.value.finishedAt).toBeNull()
      }
    })

    it('audit_log に enqueue エントリが残る', async () => {
      const r = await agentService.enqueue(buildEnqueueInput({ workspaceId: wsId }))
      if (!r.ok) throw new Error('enqueue failed')
      const { data: audits } = await adminClient()
        .from('audit_log')
        .select('action, target_type, actor_type')
        .eq('target_id', r.value.id)
      expect(
        audits?.some(
          (a) =>
            a.action === 'enqueue' &&
            a.target_type === 'agent_invocation' &&
            a.actor_type === 'user',
        ),
      ).toBe(true)
    })

    it('同じ idempotencyKey を再送すると既存行を返す', async () => {
      const key = randomUUID()
      const r1 = await agentService.enqueue(
        buildEnqueueInput({ workspaceId: wsId, idempotencyKey: key }),
      )
      const r2 = await agentService.enqueue(
        buildEnqueueInput({ workspaceId: wsId, idempotencyKey: key, model: 'claude-sonnet-4-6' }),
      )
      expect(r1.ok && r2.ok).toBe(true)
      if (r1.ok && r2.ok) {
        expect(r1.value.id).toBe(r2.value.id)
        // 再送なので 2回目の model 変更は反映されない (= 1回目のモデルが残る)
        expect(r2.value.model).toBe('claude-haiku-4-5')
      }
    })

    it('新規 INSERT 時は pg-boss にジョブ送信、再送時は送信しない', async () => {
      const key = randomUUID()
      const r1 = await agentService.enqueue(
        buildEnqueueInput({ workspaceId: wsId, idempotencyKey: key }),
      )
      if (!r1.ok) throw new Error('enqueue failed')
      expect(mockEnqueueJob).toHaveBeenCalledTimes(1)
      expect(mockEnqueueJob).toHaveBeenCalledWith('agent-run', { invocationId: r1.value.id })
      // 再送時は send されない
      await agentService.enqueue(buildEnqueueInput({ workspaceId: wsId, idempotencyKey: key }))
      expect(mockEnqueueJob).toHaveBeenCalledTimes(1)
    })

    it('role enum 違反は ValidationError', async () => {
      const r = await agentService.enqueue(
        buildEnqueueInput({ workspaceId: wsId, role: 'invalid' }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })

    it('messages 空は ValidationError', async () => {
      const r = await agentService.enqueue(
        buildEnqueueInput({ workspaceId: wsId, prompt: { messages: [] } }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })
  })

  describe('runInvocation', () => {
    it('queued → running → completed に遷移し、tokens / cost / output を記録', async () => {
      mockInvoke.mockResolvedValueOnce(
        buildInvokeResult({
          text: 'タスクを 3 つに分解しました',
          usage: {
            inputTokens: 200,
            outputTokens: 100,
            cacheCreationTokens: null,
            cacheReadTokens: null,
          },
        }),
      )
      const enq = await agentService.enqueue(buildEnqueueInput({ workspaceId: wsId }))
      if (!enq.ok) throw new Error('enqueue failed')

      const run = await agentService.runInvocation(enq.value.id)
      expect(run.ok).toBe(true)
      if (run.ok) {
        expect(run.value.status).toBe('completed')
        expect(run.value.inputTokens).toBe(200)
        expect(run.value.outputTokens).toBe(100)
        // haiku: 200/1M * 1 + 100/1M * 5 = 0.0002 + 0.0005 = 0.0007
        expect(Number(run.value.costUsd)).toBeCloseTo(0.0007, 7)
        expect(run.value.startedAt).not.toBeNull()
        expect(run.value.finishedAt).not.toBeNull()
        const output = run.value.output as { text: string; stopReason: string }
        expect(output.text).toBe('タスクを 3 つに分解しました')
        expect(output.stopReason).toBe('end_turn')
      }
    })

    it('completed な invocation をもう一度 run すると ValidationError', async () => {
      mockInvoke.mockResolvedValueOnce(buildInvokeResult())
      const enq = await agentService.enqueue(buildEnqueueInput({ workspaceId: wsId }))
      if (!enq.ok) throw new Error('enqueue failed')
      await agentService.runInvocation(enq.value.id)

      const r = await agentService.runInvocation(enq.value.id)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })

    it('存在しない id は NotFoundError', async () => {
      const r = await agentService.runInvocation(randomUUID())
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('NOT_FOUND')
    })

    it('Anthropic エラー時に failed + errorMessage を記録し ExternalServiceError を返す', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('simulated API failure'))
      const enq = await agentService.enqueue(buildEnqueueInput({ workspaceId: wsId }))
      if (!enq.ok) throw new Error('enqueue failed')

      const r = await agentService.runInvocation(enq.value.id)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('EXTERNAL')

      // DB の状態を確認
      const { data: rows } = await adminClient()
        .from('agent_invocations')
        .select('status, error_message, finished_at')
        .eq('id', enq.value.id)
        .single()
      expect(rows?.status).toBe('failed')
      expect(rows?.error_message).toContain('simulated API failure')
      expect(rows?.finished_at).not.toBeNull()
    })

    it('完了時に audit_log に actor_type=agent / action=complete が残る', async () => {
      mockInvoke.mockResolvedValueOnce(buildInvokeResult())
      const enq = await agentService.enqueue(buildEnqueueInput({ workspaceId: wsId }))
      if (!enq.ok) throw new Error('enqueue failed')
      await agentService.runInvocation(enq.value.id)

      const { data: audits } = await adminClient()
        .from('audit_log')
        .select('action, actor_type')
        .eq('target_id', enq.value.id)
      expect(audits?.some((a) => a.action === 'complete' && a.actor_type === 'agent')).toBe(true)
    })
  })

  describe('invokeSync', () => {
    it('enqueue + runInvocation を一括実行 (happy path)', async () => {
      mockInvoke.mockResolvedValueOnce(buildInvokeResult({ text: 'SYNC OK' }))
      const r = await agentService.invokeSync(buildEnqueueInput({ workspaceId: wsId }))
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.status).toBe('completed')
        const output = r.value.output as { text: string }
        expect(output.text).toBe('SYNC OK')
      }
    })
  })
})
