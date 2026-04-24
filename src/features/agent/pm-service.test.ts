/**
 * pmService integration test — Researcher と同じパターン。
 * executeToolLoop は invoker DI で mock、Anthropic と embedding も mock。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { InvokeModelOutput } from '@/lib/ai/invoke'

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
  QUEUE_NAMES: ['agent-run', 'doc-embed', 'researcher-decompose'] as const,
}))

import { buildStandupUserMessage, pmService } from './pm-service'

function buildInvokeResult(overrides: Partial<InvokeModelOutput> = {}): InvokeModelOutput {
  return {
    text: '',
    toolUses: [],
    usage: { inputTokens: 50, outputTokens: 30 },
    stopReason: 'end_turn',
    model: 'claude-haiku-4-5',
    rawMessage: { content: [] } as unknown as InvokeModelOutput['rawMessage'],
    ...overrides,
  }
}

describe('pmService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('pm-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('run', () => {
    it('haiku モデルで invocation=completed、audit actor=agent', async () => {
      const invoker = vi.fn(async () =>
        buildInvokeResult({ text: '確認しました', stopReason: 'end_turn' }),
      )
      const r = await pmService.run({
        workspaceId: wsId,
        userMessage: '進捗どう?',
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.text).toBe('確認しました')

      const ac = adminClient()
      const { data: inv } = await ac
        .from('agent_invocations')
        .select('status, model')
        .eq('id', r.value.invocationId)
        .single()
      expect(inv?.model).toBe('claude-haiku-4-5')
      expect(inv?.status).toBe('completed')

      const { data: audits } = await ac
        .from('audit_log')
        .select('action, actor_type')
        .eq('target_id', r.value.invocationId)
      expect(audits?.some((a) => a.action === 'complete' && a.actor_type === 'agent')).toBe(true)
    })

    it('PM は create_item / instantiate_template を tools に持たない (whitelist 絞り込み)', async () => {
      // invoker に渡された tools.name を検査
      let seenTools: string[] = []
      const invoker = vi.fn(async (args: { tools?: Array<{ name: string }> }) => {
        seenTools = (args.tools ?? []).map((t) => t.name)
        return buildInvokeResult({ text: 'ok', stopReason: 'end_turn' })
      })
      await pmService.run({
        workspaceId: wsId,
        userMessage: 'test',
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(seenTools).not.toContain('create_item')
      expect(seenTools).not.toContain('instantiate_template')
      // 代わりに read / write_comment / create_doc はある
      expect(seenTools).toContain('read_items')
      expect(seenTools).toContain('write_comment')
      expect(seenTools).toContain('create_doc')
    })
  })

  describe('runStandup', () => {
    it('朝の stand-up prompt を組み立てて run に委譲', async () => {
      let seen = ''
      const invoker = vi.fn(
        async (args: { messages: Array<{ role: string; content: unknown }> }) => {
          const last = args.messages.filter((m) => m.role === 'user').pop()
          if (typeof last?.content === 'string') seen = last.content
          return buildInvokeResult({ text: '3 点のまとめ', stopReason: 'end_turn' })
        },
      )
      const r = await pmService.runStandup({
        workspaceId: wsId,
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(r.ok).toBe(true)
      // prompt に日付 + MUST + create_doc 誘導が含まれる
      expect(seen).toMatch(/Stand-up/)
      expect(seen).toMatch(/\d{4}-\d{2}-\d{2}/)
      expect(seen).toContain('create_doc')
      expect(seen).toContain('MUST')
    })
  })

  describe('buildStandupUserMessage (pure)', () => {
    it('タイトル組み立て + Markdown 構成指示を含む', () => {
      const msg = buildStandupUserMessage({ today: new Date('2026-04-24T00:00:00Z') })
      expect(msg).toContain('2026-04-24')
      expect(msg).toContain('Daily Stand-up 2026-04-24')
      expect(msg).toMatch(/create_doc/)
    })
  })
})
