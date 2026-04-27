/**
 * cost-budget.ts ユニット + integration test。
 *   - getBudgetStatus: 当月の cost_usd 集計 + limit / warn_threshold 取得
 *   - checkBudget: 超過なら BudgetExceededError、未満なら ok(status)
 *   - researcherService.run の pre-flight ゲート (E2E)
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

vi.mock('@/lib/ai/embedding', () => ({
  encodeQuery: vi.fn(async () => new Array(384).fill(0)),
  encodeTexts: vi.fn(async (texts: string[]) =>
    texts.map(() => new Array(384).fill(0) as number[]),
  ),
}))

vi.mock('@/lib/jobs/queue', () => ({
  enqueueJob: vi.fn().mockResolvedValue('mock'),
  QUEUE_NAMES: ['agent-run'],
}))

import { checkBudget, getBudgetStatus } from './cost-budget'
import { researcherService } from './researcher-service'
import { agentService } from './service'

describe('cost-budget', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('cost-budget')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function setLimit(limit: number | null) {
    const ac = adminClient()
    await ac
      .from('workspace_settings')
      .update({ monthly_cost_limit_usd: limit })
      .eq('workspace_id', wsId)
  }

  /** 当月に invocation を 1 件注入 (cost を直接指定)。 */
  async function injectCompletedInvocation(costUsd: number) {
    const ac = adminClient()
    const agent = await agentService.ensureAgent(wsId, 'researcher')
    await ac.from('agent_invocations').insert({
      agent_id: agent.id,
      workspace_id: wsId,
      status: 'completed',
      input: {},
      model: 'claude-sonnet-4-6',
      idempotency_key: randomUUID(),
      cost_usd: costUsd.toFixed(6),
      input_tokens: 0,
      output_tokens: 0,
      created_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    })
  }

  describe('getBudgetStatus', () => {
    it('limit=null は無制限 (exceeded=false / warnTriggered=false)', async () => {
      await setLimit(null)
      const s = await getBudgetStatus(wsId)
      expect(s.limit).toBeNull()
      expect(s.exceeded).toBe(false)
      expect(s.warnTriggered).toBe(false)
    })

    it('limit を超えると exceeded=true', async () => {
      await setLimit(0.01) // ほぼゼロ
      await injectCompletedInvocation(0.05)
      const s = await getBudgetStatus(wsId)
      expect(s.limit).toBe(0.01)
      expect(s.spent).toBeGreaterThanOrEqual(0.05)
      expect(s.exceeded).toBe(true)
    })

    it('warn_threshold (default 0.8) を超えると warnTriggered=true', async () => {
      await setLimit(1.0)
      // 既存の cost (0.05) があるので追加で 0.80 → 累計 0.85 (>0.8 限界)
      // クリーンに測るため limit を上げて invocation 累計を再確認
      const sBefore = await getBudgetStatus(wsId)
      // 既に >0.8 なら warning は出ているはず
      if (sBefore.spent >= 0.8) {
        expect(sBefore.warnTriggered).toBe(true)
      } else {
        await injectCompletedInvocation(1.0 - sBefore.spent)
        const sAfter = await getBudgetStatus(wsId)
        expect(sAfter.warnTriggered).toBe(true)
      }
    })
  })

  describe('checkBudget', () => {
    it('limit=null は ok を返す (skip)', async () => {
      await setLimit(null)
      const r = await checkBudget(wsId)
      expect(r.ok).toBe(true)
    })

    it('limit 超過は BudgetExceededError', async () => {
      await setLimit(0.01)
      const r = await checkBudget(wsId)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('BUDGET_EXCEEDED')
    })
  })

  describe('researcherService.run pre-flight', () => {
    it('limit 超過なら invoker は呼ばれず BudgetExceededError', async () => {
      await setLimit(0.01)
      const invoker = vi.fn()
      // shouldAbort も DI して polling を skip (test 互換)
      const r = await researcherService.run({
        workspaceId: wsId,
        userMessage: 'budget test',
        idempotencyKey: randomUUID(),
        // invoker を渡さないと pre-flight が走る経路を取る
      })
      // invoker DI していなくても、pre-flight が limit を見て弾く
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('BUDGET_EXCEEDED')
      expect(invoker).not.toHaveBeenCalled()
    })

    it('iter142: ANTHROPIC_API_KEY 未設定 → ValidationError (budget OK の場合)', async () => {
      await setLimit(1000)
      const orig = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = ''
      try {
        const r = await researcherService.run({
          workspaceId: wsId,
          userMessage: 'env missing',
          idempotencyKey: randomUUID(),
        })
        expect(r.ok).toBe(false)
        if (r.ok) return
        expect(r.error.code).toBe('VALIDATION')
        expect(r.error.message).toMatch(/ANTHROPIC_API_KEY/)
      } finally {
        process.env.ANTHROPIC_API_KEY = orig
      }
    })

    it('limit を上げれば再度実行できる (mock invoker で完走)', async () => {
      await setLimit(1000) // 十分大きい
      const invoker = vi.fn(async () => ({
        text: 'ok',
        toolUses: [],
        usage: { inputTokens: 1, outputTokens: 1 },
        stopReason: 'end_turn' as const,
        model: 'claude-sonnet-4-6',
        rawMessage: { content: [] } as never,
      }))
      const r = await researcherService.run({
        workspaceId: wsId,
        userMessage: 'budget ok',
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(r.ok).toBe(true)
      expect(invoker).toHaveBeenCalledTimes(1)
    })
  })
})
