/**
 * Researcher tool handler integration tests.
 * 実 Supabase + RLS を通す。エンコーダと auth guard は mock。
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

import { agentService } from '../service'
import { buildResearcherTools, RESEARCHER_TOOLS } from './index'
import { buildSearchDocsTool } from './read'
import type { ToolContext } from './types'

async function createItemDirect(
  wsId: string,
  title: string,
  opts: { isMust?: boolean; status?: string } = {},
): Promise<string> {
  const ac = adminClient()
  const { data, error } = await ac
    .from('items')
    .insert({
      workspace_id: wsId,
      title,
      description: '',
      status: opts.status ?? 'todo',
      is_must: opts.isMust ?? false,
      created_by_actor_type: 'user',
      created_by_actor_id: randomUUID(),
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('insert item failed')
  return data.id
}

describe('agent tools', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>
  let ctx: ToolContext

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('agent-tools')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
    const agent = await agentService.ensureAgent(wsId, 'researcher')
    ctx = { workspaceId: wsId, agentId: agent.id, agentRole: 'researcher' }
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('whitelist bundle', () => {
    it('6 個の tool を bind し name 重複なし', () => {
      const bundle = buildResearcherTools(ctx)
      expect(bundle.tools).toHaveLength(6)
      const names = bundle.tools.map((t) => t.name)
      expect(new Set(names).size).toBe(6)
      expect(names).toEqual(
        expect.arrayContaining([
          'read_items',
          'read_docs',
          'search_docs',
          'search_items',
          'create_item',
          'write_comment',
        ]),
      )
      // delete_* は入らない
      expect(names.every((n) => !n.startsWith('delete_'))).toBe(true)
    })

    it('各 handler は ctx が bind されており input → string を返す', async () => {
      const bundle = buildResearcherTools(ctx)
      for (const t of RESEARCHER_TOOLS) {
        expect(typeof bundle.handlers[t.definition.name]).toBe('function')
      }
      const out = await bundle.handlers['read_items']!({})
      expect(typeof out).toBe('string')
      JSON.parse(out) // 例外にならない
    })
  })

  describe('read_items', () => {
    it('workspace の item のみ返る (他 workspace は越境しない)', async () => {
      // 他 workspace を作成して Item を入れる → 見えないこと
      const other = await createTestUserAndWorkspace('agent-tools-other')
      await createItemDirect(other.wsId, 'leaked-title')
      const ownId = await createItemDirect(wsId, 'owned-title')

      const handler = buildResearcherTools(ctx).handlers['read_items']!
      const out = JSON.parse(await handler({})) as {
        items: Array<{ id: string; title: string }>
      }
      expect(out.items.some((i) => i.id === ownId)).toBe(true)
      expect(out.items.some((i) => i.title === 'leaked-title')).toBe(false)
      await other.cleanup()
    })

    it('status / isMust で絞り込める', async () => {
      await createItemDirect(wsId, 'must-one', { isMust: true })
      const handler = buildResearcherTools(ctx).handlers['read_items']!
      const mustOnly = JSON.parse(await handler({ isMust: true })) as {
        items: Array<{ title: string; isMust: boolean }>
      }
      expect(mustOnly.items.every((i) => i.isMust)).toBe(true)
      expect(mustOnly.items.some((i) => i.title === 'must-one')).toBe(true)
    })
  })

  describe('search_items', () => {
    it('title 部分一致でヒット、他 ws は越境しない', async () => {
      await createItemDirect(wsId, 'researcher-search-target')
      const other = await createTestUserAndWorkspace('agent-tools-search-other')
      await createItemDirect(other.wsId, 'researcher-search-target')

      const handler = buildResearcherTools(ctx).handlers['search_items']!
      const out = JSON.parse(await handler({ query: 'researcher-search' })) as {
        items: Array<{ title: string }>
      }
      expect(out.items.length).toBeGreaterThan(0)
      expect(out.items.every((i) => i.title.includes('researcher-search'))).toBe(true)
      await other.cleanup()
    })

    it('空 query はエラーを返す', async () => {
      const handler = buildResearcherTools(ctx).handlers['search_items']!
      const out = JSON.parse(await handler({ query: '' }))
      expect(out.error).toBe('query is required')
    })
  })

  describe('read_docs', () => {
    it('workspace の doc のみ返る', async () => {
      const ac = adminClient()
      await ac
        .from('docs')
        .insert({
          workspace_id: wsId,
          title: 'own-doc',
          body: 'own body',
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        })
        .throwOnError()
      const handler = buildResearcherTools(ctx).handlers['read_docs']!
      const out = JSON.parse(await handler({})) as {
        docs: Array<{ title: string }>
      }
      expect(out.docs.some((d) => d.title === 'own-doc')).toBe(true)
    })
  })

  describe('create_item', () => {
    it('Agent 作成として row が入り、audit_log に actor_type=agent が残る', async () => {
      const handler = buildResearcherTools(ctx).handlers['create_item']!
      const out = JSON.parse(
        await handler({ title: 'agent-made', description: 'by researcher' }),
      ) as { ok: boolean; itemId: string }
      expect(out.ok).toBe(true)

      const ac = adminClient()
      const { data: row } = await ac
        .from('items')
        .select('created_by_actor_type, created_by_actor_id, workspace_id')
        .eq('id', out.itemId)
        .single()
      expect(row?.created_by_actor_type).toBe('agent')
      expect(row?.created_by_actor_id).toBe(ctx.agentId)
      expect(row?.workspace_id).toBe(wsId)

      const { data: audits } = await ac
        .from('audit_log')
        .select('action, actor_type')
        .eq('target_id', out.itemId)
      expect(audits?.some((a) => a.action === 'create' && a.actor_type === 'agent')).toBe(true)
    })

    it('MUST=true で dod 欠落なら validation エラー', async () => {
      const handler = buildResearcherTools(ctx).handlers['create_item']!
      const out = JSON.parse(await handler({ title: 'must-no-dod', isMust: true }))
      expect(out.ok).toBe(false)
      expect(out.error).toBe('validation failed')
    })

    it('title 欠落は validation エラー', async () => {
      const handler = buildResearcherTools(ctx).handlers['create_item']!
      const out = JSON.parse(await handler({ description: 'no title' }))
      expect(out.ok).toBe(false)
    })
  })

  describe('write_comment', () => {
    it('対象 Item へ Agent 発言として投稿される', async () => {
      const itemId = await createItemDirect(wsId, 'comment-target')
      const handler = buildResearcherTools(ctx).handlers['write_comment']!
      const out = JSON.parse(await handler({ itemId, body: 'agent が調べた結果です' })) as {
        ok: boolean
        commentId: string
      }
      expect(out.ok).toBe(true)

      const ac = adminClient()
      const { data: row } = await ac
        .from('comments_on_items')
        .select('author_actor_type, author_actor_id, item_id, body')
        .eq('id', out.commentId)
        .single()
      expect(row?.author_actor_type).toBe('agent')
      expect(row?.author_actor_id).toBe(ctx.agentId)
      expect(row?.item_id).toBe(itemId)
    })

    it('他 workspace の Item への投稿は拒否される', async () => {
      const other = await createTestUserAndWorkspace('agent-tools-other-wc')
      const otherItem = await createItemDirect(other.wsId, 'other-item')
      const handler = buildResearcherTools(ctx).handlers['write_comment']!
      const out = JSON.parse(await handler({ itemId: otherItem, body: 'leak attempt' }))
      expect(out.ok).toBe(false)
      expect(out.error).toBe('item_not_in_workspace')
      await other.cleanup()
    })

    it('存在しない itemId は item_not_found', async () => {
      const handler = buildResearcherTools(ctx).handlers['write_comment']!
      const out = JSON.parse(await handler({ itemId: randomUUID(), body: 'x' }))
      expect(out.ok).toBe(false)
      expect(out.error).toBe('item_not_found')
    })
  })

  describe('search_docs', () => {
    it('空 query はエラー', async () => {
      const handler = buildResearcherTools(ctx).handlers['search_docs']!
      const out = JSON.parse(await handler({ query: '' }))
      expect(out.error).toBe('query is required')
    })

    it('mock encoder を DI で差し替えて hybrid RRF を通す (hits 配列が返る形)', async () => {
      const mockEncoder = vi.fn(async () => new Array(384).fill(0))
      const tool = buildSearchDocsTool({ encoder: mockEncoder })
      const handler = tool.build(ctx)
      const out = JSON.parse(await handler({ query: 'onboarding' })) as {
        count: number
        hits: unknown[]
      }
      // 対象 doc_chunks が無い workspace なので count=0、ただしクラッシュせず shape を返すこと
      expect(Array.isArray(out.hits)).toBe(true)
      expect(out.count).toBe(out.hits.length)
      expect(mockEncoder).toHaveBeenCalledWith('onboarding')
    })
  })
})
