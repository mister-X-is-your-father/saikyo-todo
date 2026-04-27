/**
 * Phase 6.15 iter123: external-source pull worker test。
 * 実 Supabase + RLS — fetch を vi で mock して固定 JSON を返させる。
 */
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { externalItemLinks, externalSources, items } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { pullSource } from './worker'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard')

describe('pullSource (custom-rest)', () => {
  let wsId: string
  let userId: string
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const fx = await createTestUserAndWorkspace('ext-worker')
    wsId = fx.wsId
    userId = fx.userId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, fx.email)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanup()
  })

  async function createSource(cfg: Record<string, unknown>) {
    const [row] = await adminDb
      .insert(externalSources)
      .values({
        workspaceId: wsId,
        name: 'test src',
        kind: 'custom-rest',
        config: cfg as never,
        enabled: true,
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()
    return row!
  }

  function mockFetch(body: unknown, status = 200) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    )
  }

  it('happy: 配列 root から 2 件 import → 2 created', async () => {
    const src = await createSource({
      url: 'https://example.com/items',
      idPath: 'id',
      titlePath: 'title',
    })
    mockFetch([
      { id: 'a', title: 'Item A' },
      { id: 'b', title: 'Item B' },
    ])
    const r = await pullSource(src.id, 'manual')
    expect(r.status).toBe('succeeded')
    expect(r.fetched).toBe(2)
    expect(r.created).toBe(2)
    expect(r.updated).toBe(0)

    const links = await adminDb
      .select()
      .from(externalItemLinks)
      .where(eq(externalItemLinks.sourceId, src.id))
    expect(links.length).toBe(2)
  })

  it('itemsPath 経由で nested 抽出 + 既存 link は updated', async () => {
    const src = await createSource({
      url: 'https://example.com',
      itemsPath: 'data.list',
      idPath: 'uuid',
      titlePath: 'name',
    })
    // 1 回目
    mockFetch({ data: { list: [{ uuid: 'x', name: 'X' }] } })
    const r1 = await pullSource(src.id, 'manual')
    expect(r1.created).toBe(1)
    expect(r1.updated).toBe(0)

    // 2 回目: 同 uuid → updated
    mockFetch({ data: { list: [{ uuid: 'x', name: 'X v2' }] } })
    const r2 = await pullSource(src.id, 'manual')
    expect(r2.created).toBe(0)
    expect(r2.updated).toBe(1)
  })

  it('HTTP 500 で failed', async () => {
    const src = await createSource({
      url: 'https://example.com',
      idPath: 'id',
      titlePath: 'title',
    })
    mockFetch({ error: 'down' }, 500)
    const r = await pullSource(src.id, 'manual')
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/HTTP 500/)
  })

  it('itemsPath が array でないと failed', async () => {
    const src = await createSource({
      url: 'https://example.com',
      itemsPath: 'foo',
      idPath: 'id',
      titlePath: 'title',
    })
    mockFetch({ foo: 'not array' })
    const r = await pullSource(src.id, 'manual')
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/array ではない/)
  })

  it('disabled source は throw', async () => {
    const src = await createSource({
      url: 'https://example.com',
      idPath: 'id',
      titlePath: 'title',
    })
    await adminDb
      .update(externalSources)
      .set({ enabled: false })
      .where(eq(externalSources.id, src.id))
    await expect(pullSource(src.id, 'manual')).rejects.toThrow(/disabled/)
  })

  it('yamory: projectIds 未設定で failed', async () => {
    const [src] = await adminDb
      .insert(externalSources)
      .values({
        workspaceId: wsId,
        name: 'yamory test',
        kind: 'yamory',
        config: { token: 't' } as never,
        enabled: true,
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()
    const r = await pullSource(src!.id, 'manual')
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/projectIds/)
  })

  it('yamory: token Bearer + 各 projectId を fetch して item を作成', async () => {
    const [src] = await adminDb
      .insert(externalSources)
      .values({
        workspaceId: wsId,
        name: 'yamory team',
        kind: 'yamory',
        config: {
          token: 'tok_secret',
          projectIds: ['proj1', 'proj2'],
          baseUrl: 'https://yamory.example',
        } as never,
        enabled: true,
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: 'v-1', title: 'CVE-2025-0001', due_date: '2026-05-01' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              { id: 'v-2', title: 'CVE-2025-0002' },
              { id: 'v-3', title: 'CVE-2025-0003' },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )

    const r = await pullSource(src!.id, 'manual')
    expect(r.status).toBe('succeeded')
    expect(r.fetched).toBe(3)
    expect(r.created).toBe(3)
    expect(r.updated).toBe(0)

    // URL に projectId が埋め込まれ、Authorization header が付与されている
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const [url1, init1] = fetchSpy.mock.calls[0]!
    expect(url1).toBe('https://yamory.example/v3/proj1/vulnerabilities')
    expect((init1 as RequestInit).headers as Record<string, string>).toMatchObject({
      authorization: 'Bearer tok_secret',
    })
    const [url2] = fetchSpy.mock.calls[1]!
    expect(url2).toBe('https://yamory.example/v3/proj2/vulnerabilities')

    // due_date が item に反映されている
    const created = await adminDb.select().from(items).where(eq(items.workspaceId, wsId))
    const v1 = created.find((i) => i.title === 'CVE-2025-0001')
    expect(v1).toBeDefined()
    expect(v1?.dueDate).toBe('2026-05-01')
  })

  it('yamory: 1 project が 401 → 全体 failed (token は error message に出さない)', async () => {
    const [src] = await adminDb
      .insert(externalSources)
      .values({
        workspaceId: wsId,
        name: 'yamory bad',
        kind: 'yamory',
        config: { token: 'tok_secret', projectIds: ['p1'] } as never,
        enabled: true,
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const r = await pullSource(src!.id, 'manual')
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/HTTP 401/)
    expect(r.error).not.toMatch(/tok_secret/)
  })

  it('item は workspace 内に作成される', async () => {
    const src = await createSource({
      url: 'https://example.com',
      idPath: 'id',
      titlePath: 'title',
    })
    mockFetch([{ id: '42', title: 'My Issue' }])
    await pullSource(src.id, 'manual')
    const created = await adminDb.select().from(items).where(eq(items.workspaceId, wsId))
    expect(created.find((i) => i.title === 'My Issue')).toBeDefined()
  })
})
