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

  it('yamory kind は未実装で failed', async () => {
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
    expect(r.error).toMatch(/yamory/)
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
