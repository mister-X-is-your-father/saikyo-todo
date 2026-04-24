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
    it('8 個の tool を bind し name 重複なし', () => {
      const bundle = buildResearcherTools(ctx)
      expect(bundle.tools).toHaveLength(8)
      const names = bundle.tools.map((t) => t.name)
      expect(new Set(names).size).toBe(8)
      expect(names).toEqual(
        expect.arrayContaining([
          'read_items',
          'read_docs',
          'search_docs',
          'search_items',
          'create_item',
          'write_comment',
          'create_doc',
          'instantiate_template',
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

    it('parentItemId 指定時、子として parent_path が親のフル path になる', async () => {
      const parentId = await createItemDirect(wsId, 'decompose-parent')
      const handler = buildResearcherTools(ctx).handlers['create_item']!
      const out = JSON.parse(await handler({ title: 'child-1', parentItemId: parentId })) as {
        ok: boolean
        itemId: string
        parentPath: string
      }
      expect(out.ok).toBe(true)
      // parent は root なので fullPath は parent.id からハイフンを抜いた label
      expect(out.parentPath).toBe(parentId.replace(/-/g, ''))

      // DB 側でも確認
      const ac = adminClient()
      const { data: row } = await ac
        .from('items')
        .select('parent_path')
        .eq('id', out.itemId)
        .single()
      expect(row?.parent_path).toBe(parentId.replace(/-/g, ''))
    })

    it('parentItemId が他 workspace の Item なら拒否', async () => {
      const other = await createTestUserAndWorkspace('agent-tools-parent-other')
      const otherParent = await createItemDirect(other.wsId, 'other-parent')
      const handler = buildResearcherTools(ctx).handlers['create_item']!
      const out = JSON.parse(await handler({ title: 'leak-child', parentItemId: otherParent }))
      expect(out.ok).toBe(false)
      expect(out.error).toBe('parent_not_in_workspace')
      await other.cleanup()
    })

    it('parentItemId が存在しない UUID なら parent_not_found', async () => {
      const handler = buildResearcherTools(ctx).handlers['create_item']!
      const out = JSON.parse(await handler({ title: 'orphan', parentItemId: randomUUID() }))
      expect(out.ok).toBe(false)
      expect(out.error).toBe('parent_not_found')
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

  describe('create_doc', () => {
    it('Agent 作成として doc が入り、embedding ジョブが enqueue される', async () => {
      const handler = buildResearcherTools(ctx).handlers['create_doc']!
      const out = JSON.parse(
        await handler({
          title: 'agent-research-doc',
          body: '# 調査結果\n\n本プロジェクトは...',
        }),
      ) as { ok: boolean; docId: string }
      expect(out.ok).toBe(true)

      const ac = adminClient()
      const { data: row } = await ac
        .from('docs')
        .select('created_by_actor_type, created_by_actor_id, workspace_id, title')
        .eq('id', out.docId)
        .single()
      expect(row?.created_by_actor_type).toBe('agent')
      expect(row?.created_by_actor_id).toBe(ctx.agentId)
      expect(row?.workspace_id).toBe(wsId)
      expect(row?.title).toBe('agent-research-doc')

      // audit
      const { data: audits } = await ac
        .from('audit_log')
        .select('action, actor_type, target_type')
        .eq('target_id', out.docId)
      expect(
        audits?.some(
          (a) => a.action === 'create' && a.actor_type === 'agent' && a.target_type === 'doc',
        ),
      ).toBe(true)

      // enqueueJob は mock 済なので直接検証 (doc-embed キューに送られているか)
      const { enqueueJob } = await import('@/lib/jobs/queue')
      const mockedEnqueue = vi.mocked(enqueueJob)
      expect(mockedEnqueue).toHaveBeenCalledWith('doc-embed', { docId: out.docId })
    })

    it('body 欠落は validation エラー', async () => {
      const handler = buildResearcherTools(ctx).handlers['create_doc']!
      const out = JSON.parse(await handler({ title: 'no body' }))
      expect(out.ok).toBe(false)
      expect(out.error).toBe('validation failed')
    })
  })

  describe('instantiate_template', () => {
    it('workspace 内 Template を展開し、root Item id を返す', async () => {
      const ac = adminClient()
      // 最小 Template を作る
      const { data: t } = await ac
        .from('templates')
        .insert({
          workspace_id: wsId,
          name: 'mini-template',
          description: '',
          kind: 'manual',
          variables_schema: {},
          tags: [],
          created_by: userId,
        })
        .select('id')
        .single()
      const templateId = t!.id as string
      await ac
        .from('template_items')
        .insert({
          template_id: templateId,
          title: '子 1',
          description: '',
          parent_path: '',
          status_initial: 'todo',
          is_must: false,
        })
        .throwOnError()

      const handler = buildResearcherTools(ctx).handlers['instantiate_template']!
      const out = JSON.parse(await handler({ templateId })) as {
        ok: boolean
        rootItemId: string
        createdItemCount: number
      }
      expect(out.ok).toBe(true)
      expect(out.createdItemCount).toBeGreaterThanOrEqual(2) // root + 子 1

      const { data: root } = await ac
        .from('items')
        .select('created_by_actor_type, created_by_actor_id, workspace_id')
        .eq('id', out.rootItemId)
        .single()
      expect(root?.created_by_actor_type).toBe('agent')
      expect(root?.created_by_actor_id).toBe(ctx.agentId)
      expect(root?.workspace_id).toBe(wsId)
    })

    it('他 workspace の Template は拒否される (越境不可)', async () => {
      const other = await createTestUserAndWorkspace('agent-tools-inst-other')
      const ac = adminClient()
      const { data: t } = await ac
        .from('templates')
        .insert({
          workspace_id: other.wsId,
          name: 'other-t',
          description: '',
          kind: 'manual',
          variables_schema: {},
          tags: [],
          created_by: other.userId,
        })
        .select('id')
        .single()
      const handler = buildResearcherTools(ctx).handlers['instantiate_template']!
      const out = JSON.parse(await handler({ templateId: t!.id as string }))
      expect(out.ok).toBe(false)
      expect(out.error).toBe('VALIDATION')
      await other.cleanup()
    })

    it('templateId が UUID でなければ validation エラー', async () => {
      const handler = buildResearcherTools(ctx).handlers['instantiate_template']!
      const out = JSON.parse(await handler({ templateId: 'nope' }))
      expect(out.ok).toBe(false)
      expect(out.error).toBe('validation failed')
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
