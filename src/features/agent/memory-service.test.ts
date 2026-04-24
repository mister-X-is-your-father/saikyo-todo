/**
 * agentMemoryService integration test.
 * 実 Supabase + RLS を通す。auth guard だけ mock (他テストとの共通パターン)。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

vi.mock('@/lib/jobs/queue', () => ({
  enqueueJob: vi.fn().mockResolvedValue('mock'),
  QUEUE_NAMES: ['agent-run'],
}))

import { agentMemoryService } from './memory-service'
import { agentService } from './service'

describe('agentMemoryService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>
  let agentId: string

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('agent-mem')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
    const agent = await agentService.ensureAgent(wsId, 'researcher')
    agentId = agent.id
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('append', () => {
    it('1 件 append → row が返る', async () => {
      const r = await agentMemoryService.append({
        agentId,
        role: 'user',
        content: 'hello researcher',
      })
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.agentId).toBe(agentId)
        expect(r.value.role).toBe('user')
        expect(r.value.content).toBe('hello researcher')
      }
    })

    it('toolCalls payload を jsonb に保存できる', async () => {
      const payload = { name: 'search_docs', input: { query: 'foo' } }
      const r = await agentMemoryService.append({
        agentId,
        role: 'tool_call',
        content: 'search_docs',
        toolCalls: payload,
      })
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.toolCalls).toEqual(payload)
      }
    })

    it('invalid role は ValidationError', async () => {
      const r = await agentMemoryService.append({
        agentId,
        role: 'nope' as never,
        content: 'x',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })
  })

  describe('loadRecent', () => {
    it('古い順で最新 N 件を返す', async () => {
      // 新 agent で汚染回避
      const fresh = await agentService.ensureAgent(wsId, 'pm')
      await agentMemoryService.append({ agentId: fresh.id, role: 'user', content: 'a' })
      await agentMemoryService.append({ agentId: fresh.id, role: 'assistant', content: 'b' })
      await agentMemoryService.append({ agentId: fresh.id, role: 'user', content: 'c' })
      const rows = await agentMemoryService.loadRecent(fresh.id, 10)
      expect(rows.map((r) => r.content)).toEqual(['a', 'b', 'c'])
    })

    it('limit で最新 N 件だけ返す (古い分は落とす)', async () => {
      const fresh = await agentService.ensureAgent(wsId, 'pm')
      for (const c of ['x1', 'x2', 'x3', 'x4', 'x5']) {
        await agentMemoryService.append({ agentId: fresh.id, role: 'user', content: c })
      }
      const rows = await agentMemoryService.loadRecent(fresh.id, 2)
      // 最新 2 件 (x4, x5) が古い順で返る
      expect(rows.map((r) => r.content)).toEqual(['x4', 'x5'])
    })
  })
})
