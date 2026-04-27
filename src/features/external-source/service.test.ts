import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConflictError, NotFoundError } from '@/lib/errors'

import { externalSourceService } from './service'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard')

describe('externalSourceService', () => {
  let wsId: string
  let userId: string
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const fx = await createTestUserAndWorkspace('extsrc')
    wsId = fx.wsId
    userId = fx.userId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, fx.email)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanup()
  })

  it('create yamory: token 必須を満たせば作成できる', async () => {
    const r = await externalSourceService.create({
      workspaceId: wsId,
      name: 'Yamory team A',
      kind: 'yamory',
      config: { token: 'tok_xxx' },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.kind).toBe('yamory')
    expect(r.value.enabled).toBe(true)
  })

  it('create custom-rest: idPath/titlePath 必須を満たせば作成できる', async () => {
    const r = await externalSourceService.create({
      workspaceId: wsId,
      name: 'Custom REST',
      kind: 'custom-rest',
      config: {
        url: 'https://example.com/api/items',
        method: 'GET',
        idPath: 'id',
        titlePath: 'title',
      },
    })
    expect(r.ok).toBe(true)
  })

  it('create yamory: token 空でバリデーション失敗', async () => {
    const r = await externalSourceService.create({
      workspaceId: wsId,
      name: 'Bad',
      kind: 'yamory',
      config: { token: '' },
    })
    expect(r.ok).toBe(false)
  })

  it('create custom-rest: url 不正で失敗', async () => {
    const r = await externalSourceService.create({
      workspaceId: wsId,
      name: 'Bad URL',
      kind: 'custom-rest',
      config: { url: 'not-a-url', idPath: 'id', titlePath: 'title' },
    })
    expect(r.ok).toBe(false)
  })

  it('create: 未対応 kind は failsafe で reject', async () => {
    const r = await externalSourceService.create({
      workspaceId: wsId,
      name: 'X',
      kind: 'github',
      config: {},
    })
    expect(r.ok).toBe(false)
  })

  it('list: 削除済を除く', async () => {
    const a = await externalSourceService.create({
      workspaceId: wsId,
      name: 'A',
      kind: 'yamory',
      config: { token: 't' },
    })
    if (!a.ok) throw a.error
    await externalSourceService.softDelete(a.value.id)
    const b = await externalSourceService.create({
      workspaceId: wsId,
      name: 'B',
      kind: 'yamory',
      config: { token: 't' },
    })
    if (!b.ok) throw b.error
    const r = await externalSourceService.list(wsId)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const names = r.value.map((s) => s.name)
    expect(names).toContain('B')
    expect(names).not.toContain('A')
  })

  it('update: 楽観ロック衝突で ConflictError', async () => {
    const c = await externalSourceService.create({
      workspaceId: wsId,
      name: 'C',
      kind: 'yamory',
      config: { token: 't' },
    })
    if (!c.ok) throw c.error
    const r = await externalSourceService.update({
      id: c.value.id,
      expectedVersion: 999,
      patch: { name: 'D' },
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBeInstanceOf(ConflictError)
  })

  it('softDelete: 存在しない id は NotFoundError', async () => {
    const r = await externalSourceService.softDelete('00000000-0000-0000-0000-000000000000')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBeInstanceOf(NotFoundError)
  })
})
