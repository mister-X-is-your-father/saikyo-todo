/**
 * getMonthlyCost 集計テスト。agent_invocations を直接 insert して集計が合うか確認。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

vi.mock('@/lib/jobs/queue', () => ({
  enqueueJob: vi.fn().mockResolvedValue('mock'),
  QUEUE_NAMES: ['agent-run', 'doc-embed', 'researcher-decompose'] as const,
}))

import { getMonthlyCost } from './cost-aggregate'
import { agentService } from './service'

describe('getMonthlyCost', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('cost-agg')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  it('role 別 × month 別で集計される (invocations / tokens / cost)', async () => {
    // PM と Researcher の agent を用意
    const pm = await agentService.ensureAgent(wsId, 'pm')
    const rs = await agentService.ensureAgent(wsId, 'researcher')

    // agent_invocations を直接 insert (pm 2件、researcher 1件、いずれも completed 相当)
    const ac = adminClient()
    const today = new Date().toISOString().slice(0, 10)
    const inserts = [
      {
        agent_id: pm.id,
        workspace_id: wsId,
        status: 'completed',
        input: {},
        model: 'claude-haiku-4-5',
        input_tokens: 100,
        output_tokens: 50,
        cost_usd: '0.000350',
        idempotency_key: crypto.randomUUID(),
      },
      {
        agent_id: pm.id,
        workspace_id: wsId,
        status: 'completed',
        input: {},
        model: 'claude-haiku-4-5',
        input_tokens: 200,
        output_tokens: 80,
        cost_usd: '0.000600',
        idempotency_key: crypto.randomUUID(),
      },
      {
        agent_id: rs.id,
        workspace_id: wsId,
        status: 'completed',
        input: {},
        model: 'claude-sonnet-4-6',
        input_tokens: 500,
        output_tokens: 150,
        cost_usd: '0.003750',
        idempotency_key: crypto.randomUUID(),
      },
    ]
    for (const row of inserts) {
      await ac.from('agent_invocations').insert(row).throwOnError()
    }

    const r = await getMonthlyCost(wsId, 12)
    expect(r.ok).toBe(true)
    if (!r.ok) return

    // 今月の PM と Researcher の行があるはず
    const month = today.slice(0, 7)
    const pmRow = r.value.find((v) => v.month === month && v.role === 'pm')
    const rsRow = r.value.find((v) => v.month === month && v.role === 'researcher')
    expect(pmRow).toBeTruthy()
    expect(rsRow).toBeTruthy()
    if (!pmRow || !rsRow) return

    expect(pmRow.invocations).toBeGreaterThanOrEqual(2)
    expect(pmRow.inputTokens).toBeGreaterThanOrEqual(300)
    expect(pmRow.outputTokens).toBeGreaterThanOrEqual(130)
    expect(pmRow.costUsd).toBeGreaterThanOrEqual(0.00095)

    expect(rsRow.invocations).toBeGreaterThanOrEqual(1)
    expect(rsRow.inputTokens).toBeGreaterThanOrEqual(500)
    expect(rsRow.costUsd).toBeGreaterThanOrEqual(0.00375)
  })

  it('別 workspace の invocations は集計に含まれない (越境遮断)', async () => {
    const other = await createTestUserAndWorkspace('cost-agg-other')
    const otherAgent = await agentService.ensureAgent(other.wsId, 'pm')
    const ac = adminClient()
    await ac
      .from('agent_invocations')
      .insert({
        agent_id: otherAgent.id,
        workspace_id: other.wsId,
        status: 'completed',
        input: {},
        model: 'claude-haiku-4-5',
        input_tokens: 9999,
        output_tokens: 9999,
        cost_usd: '999.000000',
        idempotency_key: crypto.randomUUID(),
      })
      .throwOnError()

    const r = await getMonthlyCost(wsId, 12)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // 9999 トークンの行はどの月にも含まれない
    const total = r.value.reduce((s, v) => s + v.inputTokens, 0)
    expect(total).toBeLessThan(9999)
    await other.cleanup()
  })
})
