/**
 * researcherService.run integration test.
 * executeToolLoop の invoker を DI で差し替え、Anthropic と embedding を mock。
 * 実 Supabase で agent_memories / agent_invocations / audit_log / items / comments を検証。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

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
  QUEUE_NAMES: ['agent-run'],
}))

import { agentMemoryService } from './memory-service'
import {
  buildDecomposeUserMessage,
  buildResearchUserMessage,
  researcherService,
} from './researcher-service'
import { agentService } from './service'

function buildInvokeResult(overrides: Partial<InvokeModelOutput> = {}): InvokeModelOutput {
  return {
    text: '',
    toolUses: [],
    usage: { inputTokens: 100, outputTokens: 50 },
    stopReason: 'end_turn',
    model: 'claude-sonnet-4-6',
    rawMessage: { content: [] } as unknown as InvokeModelOutput['rawMessage'],
    ...overrides,
  }
}

describe('researcherService.run', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('researcher-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(() => {
    // 各テストで新 agent を作らずに済ます (Researcher は workspace ごとに 1 体 idempotent)
  })

  describe('happy path (no tools)', () => {
    it('tool を呼ばない応答で agent_invocations=completed、memory に user/assistant が残る', async () => {
      const invoker = vi.fn(async () =>
        buildInvokeResult({ text: 'なるほど、調査します', stopReason: 'end_turn' }),
      )

      const r = await researcherService.run({
        workspaceId: wsId,
        userMessage: 'この workspace の進捗を要約して',
        idempotencyKey: randomUUID(),
        invoker,
      })

      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.text).toBe('なるほど、調査します')
      expect(r.value.toolCalls).toHaveLength(0)
      expect(r.value.iterations).toBe(1)
      expect(r.value.usage.inputTokens).toBe(100)

      // invocation の永続化確認
      const ac = adminClient()
      const { data: inv } = await ac
        .from('agent_invocations')
        .select('status, input_tokens, output_tokens, cost_usd, model')
        .eq('id', r.value.invocationId)
        .single()
      expect(inv?.status).toBe('completed')
      expect(inv?.model).toBe('claude-sonnet-4-6')
      // sonnet pricing: 100/1M * 3 + 50/1M * 15 = 0.0003 + 0.00075 = 0.00105
      expect(Number(inv?.cost_usd)).toBeCloseTo(0.00105, 6)

      // agent_memories に user + assistant が入る
      const { data: mem } = await ac
        .from('agent_memories')
        .select('role, content')
        .eq('agent_id', r.value.agentId)
        .order('created_at', { ascending: true })
      const roles = (mem ?? []).map((m) => m.role)
      expect(roles).toContain('user')
      expect(roles).toContain('assistant')
      const last = (mem ?? []).filter((m) => m.role === 'assistant').pop()
      expect(last?.content).toBe('なるほど、調査します')
    })
  })

  describe('tool use path', () => {
    it('read_items を 1 回呼んで結果を受けて最終応答、memory に tool_call / tool_result が残る', async () => {
      // 予め item を 1 つ入れておく
      const ac = adminClient()
      const { data: itemRow } = await ac
        .from('items')
        .insert({
          workspace_id: wsId,
          title: 'preexisting item',
          description: '',
          status: 'todo',
          is_must: false,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        })
        .select('id')
        .single()
      expect(itemRow?.id).toBeTruthy()

      // 1st: tool_use を返す
      // 2nd: 最終応答を返す
      const invoker = vi
        .fn()
        .mockResolvedValueOnce(
          buildInvokeResult({
            stopReason: 'tool_use',
            toolUses: [{ id: 'tu1', name: 'read_items', input: {} }],
            rawMessage: {
              content: [{ type: 'tool_use', id: 'tu1', name: 'read_items', input: {} }],
            } as unknown as InvokeModelOutput['rawMessage'],
            usage: { inputTokens: 200, outputTokens: 30 },
          }),
        )
        .mockResolvedValueOnce(
          buildInvokeResult({
            text: 'Item を 1 件以上確認しました',
            stopReason: 'end_turn',
            usage: { inputTokens: 150, outputTokens: 20 },
          }),
        )

      const r = await researcherService.run({
        workspaceId: wsId,
        userMessage: '何が残ってる?',
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.toolCalls).toHaveLength(1)
      expect(r.value.toolCalls[0]!.name).toBe('read_items')
      expect(r.value.iterations).toBe(2)
      // usage は累積
      expect(r.value.usage.inputTokens).toBe(350)
      expect(r.value.usage.outputTokens).toBe(50)

      // memory: user → (tool_call + tool_result) → assistant の順で少なくとも存在
      const { data: mem } = await ac
        .from('agent_memories')
        .select('role, content, tool_calls')
        .eq('agent_id', r.value.agentId)
        .order('created_at', { ascending: true })
      const roles = (mem ?? []).map((m) => m.role)
      expect(roles).toContain('tool_call')
      expect(roles).toContain('tool_result')
      const toolCall = (mem ?? []).find((m) => m.role === 'tool_call')
      expect(toolCall?.content).toBe('read_items')
    })

    it('tool 呼び出し時に create_item で作った Item は agent actor として残る', async () => {
      const invoker = vi
        .fn()
        .mockResolvedValueOnce(
          buildInvokeResult({
            stopReason: 'tool_use',
            toolUses: [
              {
                id: 'tu-ci',
                name: 'create_item',
                input: { title: 'researcher が作ったタスク', description: '' },
              },
            ],
            rawMessage: {
              content: [
                {
                  type: 'tool_use',
                  id: 'tu-ci',
                  name: 'create_item',
                  input: { title: 'researcher が作ったタスク' },
                },
              ],
            } as unknown as InvokeModelOutput['rawMessage'],
            usage: { inputTokens: 80, outputTokens: 40 },
          }),
        )
        .mockResolvedValueOnce(
          buildInvokeResult({
            text: '子タスクを 1 件作成しました',
            stopReason: 'end_turn',
            usage: { inputTokens: 60, outputTokens: 15 },
          }),
        )

      const r = await researcherService.run({
        workspaceId: wsId,
        userMessage: '調査結果の子タスクを作って',
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return

      const ac = adminClient()
      const { data: rows } = await ac
        .from('items')
        .select('id, title, created_by_actor_type, created_by_actor_id')
        .eq('workspace_id', wsId)
        .eq('title', 'researcher が作ったタスク')
      expect(rows?.length).toBeGreaterThan(0)
      const first = rows?.[0]
      expect(first?.created_by_actor_type).toBe('agent')
      expect(first?.created_by_actor_id).toBe(r.value.agentId)
    })
  })

  describe('failure path', () => {
    it('Anthropic が throw したら failed に遷移し ExternalServiceError', async () => {
      const invoker = vi.fn(async () => {
        throw new Error('anthropic boom')
      })
      const r = await researcherService.run({
        workspaceId: wsId,
        userMessage: 'fail pls',
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(r.ok).toBe(false)
      if (r.ok) return
      expect(r.error.code).toBe('EXTERNAL')

      // failed に遷移、errorMessage が入る
      const ac = adminClient()
      const agent = await agentService.ensureAgent(wsId, 'researcher')
      const { data: invs } = await ac
        .from('agent_invocations')
        .select('status, error_message, idempotency_key')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(5)
      const failed = invs?.find((i) => i.status === 'failed')
      expect(failed).toBeTruthy()
      expect(failed?.error_message).toContain('anthropic boom')
    })

    it('空 userMessage は ValidationError (モデル呼び出し前に弾く)', async () => {
      const invoker = vi.fn()
      const r = await researcherService.run({
        workspaceId: wsId,
        userMessage: '',
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
      expect(invoker).not.toHaveBeenCalled()
    })
  })

  describe('memory continuity', () => {
    it('2 回 run すると 1 回目の assistant が 2 回目の messages に混ざる', async () => {
      // 1 回目
      const invoker1 = vi.fn(async () =>
        buildInvokeResult({ text: '1 回目の応答', stopReason: 'end_turn' }),
      )
      await researcherService.run({
        workspaceId: wsId,
        userMessage: 'round 1',
        idempotencyKey: randomUUID(),
        invoker: invoker1,
      })

      // 2 回目 - invoker の messages に 1 回目の user/assistant が含まれるか検証
      const invoker2 = vi.fn(
        async (args: { messages: Array<{ role: string; content: unknown }> }) => {
          const userContents = args.messages
            .filter((m) => m.role === 'user')
            .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
          expect(userContents).toContain('round 1')
          expect(userContents).toContain('round 2')
          return buildInvokeResult({ text: '2 回目の応答', stopReason: 'end_turn' })
        },
      )

      const r2 = await researcherService.run({
        workspaceId: wsId,
        userMessage: 'round 2',
        idempotencyKey: randomUUID(),
        invoker: invoker2,
      })
      expect(r2.ok).toBe(true)
      expect(invoker2).toHaveBeenCalledTimes(1)
    })
  })

  describe('memory limit', () => {
    it('loadRecent で limit 以上の過去は切られる (memoryLimit を尊重)', async () => {
      // 別 workspace で独立検証
      const fx = await createTestUserAndWorkspace('researcher-limit')
      await mockAuthGuards(fx.userId, fx.email)
      const agent = await agentService.ensureAgent(fx.wsId, 'researcher')
      // 30 件の user メモリを入れる
      for (let i = 0; i < 30; i++) {
        await agentMemoryService.append({
          agentId: agent.id,
          role: 'user',
          content: `old msg ${i}`,
        })
      }

      let receivedUserCount = 0
      const invoker = vi.fn(async (args: { messages: Array<{ role: string }> }) => {
        receivedUserCount = args.messages.filter((m) => m.role === 'user').length
        return buildInvokeResult({ text: 'ok', stopReason: 'end_turn' })
      })
      await researcherService.run({
        workspaceId: fx.wsId,
        userMessage: 'today',
        idempotencyKey: randomUUID(),
        invoker,
      })
      // memoryLimit=20 で過去 + 現在 (重複 append 前の loadRecent なので 20 + 今回 1 = 21)
      expect(receivedUserCount).toBe(21)
      // 元の mockAuthGuards を戻す
      await mockAuthGuards(userId, email)
      await fx.cleanup()
    })
  })

  describe('decomposeItem', () => {
    it('対象 Item を引いて parentItemId 付き prompt を組み立て、run に委譲する', async () => {
      // 親 Item を作成
      const ac = adminClient()
      const { data: parentRow } = await ac
        .from('items')
        .insert({
          workspace_id: wsId,
          title: 'API 認証基盤を刷新',
          description: '既存 JWT を OIDC に置き換える',
          status: 'todo',
          is_must: false,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        })
        .select('id')
        .single()
      const parentId = parentRow!.id as string

      let seenPrompt = ''
      const invoker = vi.fn(
        async (args: { messages: Array<{ role: string; content: unknown }> }) => {
          const lastUser = args.messages.filter((m) => m.role === 'user').pop()
          if (typeof lastUser?.content === 'string') seenPrompt = lastUser.content
          return buildInvokeResult({ text: '子タスク 3 件を作成しました', stopReason: 'end_turn' })
        },
      )

      const r = await researcherService.decomposeItem({
        workspaceId: wsId,
        itemId: parentId,
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return

      // prompt に parentItemId として渡す id、タイトル、description が含まれる
      expect(seenPrompt).toContain(parentId)
      expect(seenPrompt).toContain('API 認証基盤を刷新')
      expect(seenPrompt).toContain('OIDC')
      expect(seenPrompt).toMatch(/parentItemId/)

      // invocation.target_item_id に parentId がセットされる
      const { data: inv } = await ac
        .from('agent_invocations')
        .select('target_item_id, status')
        .eq('id', r.value.invocationId)
        .single()
      expect(inv?.target_item_id).toBe(parentId)
      expect(inv?.status).toBe('completed')
    })

    it('別 workspace の Item を渡すと ValidationError', async () => {
      const other = await createTestUserAndWorkspace('researcher-decomp-other')
      const ac = adminClient()
      const { data: otherItem } = await ac
        .from('items')
        .insert({
          workspace_id: other.wsId,
          title: 'other-ws-item',
          description: '',
          status: 'todo',
          is_must: false,
          created_by_actor_type: 'user',
          created_by_actor_id: other.userId,
        })
        .select('id')
        .single()
      const r = await researcherService.decomposeItem({
        workspaceId: wsId,
        itemId: otherItem!.id as string,
        idempotencyKey: randomUUID(),
        invoker: vi.fn(),
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
      await other.cleanup()
    })

    it('存在しない itemId は NotFoundError', async () => {
      const r = await researcherService.decomposeItem({
        workspaceId: wsId,
        itemId: randomUUID(),
        idempotencyKey: randomUUID(),
        invoker: vi.fn(),
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('NOT_FOUND')
    })
  })

  describe('buildDecomposeUserMessage (pure)', () => {
    it('必須情報を含む', () => {
      const msg = buildDecomposeUserMessage({
        itemId: 'abc-123',
        title: 'my task',
        description: 'detail here',
        isMust: true,
        dod: 'DoD text',
      })
      expect(msg).toContain('abc-123')
      expect(msg).toContain('my task')
      expect(msg).toContain('detail here')
      expect(msg).toContain('MUST')
      expect(msg).toContain('DoD text')
      expect(msg).toMatch(/3.?5/)
    })

    it('description 空や dod null でもクラッシュしない', () => {
      const msg = buildDecomposeUserMessage({
        itemId: 'id',
        title: 't',
        description: '',
        isMust: false,
        dod: null,
      })
      expect(msg).toContain('id')
      expect(msg).toContain('t')
    })

    it('extraHint があれば追記される', () => {
      const msg = buildDecomposeUserMessage({
        itemId: 'id',
        title: 't',
        description: '',
        isMust: false,
        dod: null,
        extraHint: 'フロントエンドから先に着手',
      })
      expect(msg).toContain('フロントエンドから先に着手')
    })
  })

  describe('researchItem', () => {
    it('対象 Item を引いて調査用 prompt で run を呼ぶ', async () => {
      const ac = adminClient()
      const { data: parentRow } = await ac
        .from('items')
        .insert({
          workspace_id: wsId,
          title: '競合分析を行う',
          description: '類似 SaaS の料金体系と機能差を調べる',
          status: 'todo',
          is_must: false,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        })
        .select('id')
        .single()
      const targetId = parentRow!.id as string

      let seen = ''
      const invoker = vi.fn(
        async (args: { messages: Array<{ role: string; content: unknown }> }) => {
          const last = args.messages.filter((m) => m.role === 'user').pop()
          if (typeof last?.content === 'string') seen = last.content
          return buildInvokeResult({ text: 'Doc を作成しました', stopReason: 'end_turn' })
        },
      )

      const r = await researcherService.researchItem({
        workspaceId: wsId,
        itemId: targetId,
        idempotencyKey: randomUUID(),
        invoker,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return

      expect(seen).toContain(targetId)
      expect(seen).toContain('競合分析を行う')
      expect(seen).toContain('類似 SaaS')
      expect(seen).toMatch(/search_docs/)
      expect(seen).toMatch(/create_doc/)

      const { data: inv } = await ac
        .from('agent_invocations')
        .select('target_item_id, status')
        .eq('id', r.value.invocationId)
        .single()
      expect(inv?.target_item_id).toBe(targetId)
      expect(inv?.status).toBe('completed')
    })

    it('他 workspace の Item は ValidationError', async () => {
      const other = await createTestUserAndWorkspace('researcher-research-other')
      const ac = adminClient()
      const { data: otherItem } = await ac
        .from('items')
        .insert({
          workspace_id: other.wsId,
          title: 'other',
          description: '',
          status: 'todo',
          is_must: false,
          created_by_actor_type: 'user',
          created_by_actor_id: other.userId,
        })
        .select('id')
        .single()
      const r = await researcherService.researchItem({
        workspaceId: wsId,
        itemId: otherItem!.id as string,
        idempotencyKey: randomUUID(),
        invoker: vi.fn(),
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
      await other.cleanup()
    })
  })

  describe('buildResearchUserMessage (pure)', () => {
    it('search_docs と create_doc を手順に含む', () => {
      const msg = buildResearchUserMessage({
        itemId: 'id',
        title: 't',
        description: 'desc',
      })
      expect(msg).toContain('id')
      expect(msg).toContain('t')
      expect(msg).toContain('desc')
      expect(msg).toContain('search_docs')
      expect(msg).toContain('create_doc')
    })
  })
})
