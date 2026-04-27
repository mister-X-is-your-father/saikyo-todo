/**
 * Phase 6.15 iter112: workflowService 基本テスト。
 * 実 Supabase + RLS を通す。実行 engine は次 iter なので CRUD のみ。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConflictError, NotFoundError } from '@/lib/errors'

import { workflowService } from './service'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard')

describe('workflowService', () => {
  let wsId: string
  let userId: string
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const fx = await createTestUserAndWorkspace('wf-svc')
    wsId = fx.wsId
    userId = fx.userId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, fx.email)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanup()
  })

  it('create: 最小構成 (name のみ) で作成できる', async () => {
    const r = await workflowService.create({ workspaceId: wsId, name: 'Hello' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.name).toBe('Hello')
    expect(r.value.enabled).toBe(true)
  })

  it('create: graph + trigger を指定して作成できる', async () => {
    const r = await workflowService.create({
      workspaceId: wsId,
      name: 'WF1',
      graph: {
        nodes: [{ id: 'n1', type: 'http', config: { url: 'https://example.com' } }],
        edges: [],
      },
      trigger: { kind: 'cron', cron: '0 9 * * 1' },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((r.value.graph as { nodes: unknown[] }).nodes.length).toBe(1)
    expect((r.value.trigger as { kind: string }).kind).toBe('cron')
  })

  it('create: name 空はバリデーション失敗', async () => {
    const r = await workflowService.create({ workspaceId: wsId, name: '' })
    expect(r.ok).toBe(false)
  })

  it('create: 不正な node type はバリデーション失敗', async () => {
    const r = await workflowService.create({
      workspaceId: wsId,
      name: 'WF',
      graph: {
        nodes: [{ id: 'n1', type: 'unknown_type_xxx', config: {} }],
        edges: [],
      },
    })
    expect(r.ok).toBe(false)
  })

  it('list: 削除済を除く', async () => {
    const c = await workflowService.create({ workspaceId: wsId, name: 'A' })
    if (!c.ok) throw c.error
    await workflowService.softDelete(c.value.id)
    const c2 = await workflowService.create({ workspaceId: wsId, name: 'B' })
    if (!c2.ok) throw c2.error
    const r = await workflowService.list(wsId)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const names = r.value.map((w) => w.name)
    expect(names).toContain('B')
    expect(names).not.toContain('A')
  })

  it('update: 楽観ロック衝突で ConflictError', async () => {
    const c = await workflowService.create({ workspaceId: wsId, name: 'C' })
    if (!c.ok) throw c.error
    const r = await workflowService.update({
      id: c.value.id,
      expectedVersion: 999,
      patch: { name: 'D' },
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBeInstanceOf(ConflictError)
  })

  it('softDelete: 存在しない id は NotFoundError', async () => {
    const r = await workflowService.softDelete('00000000-0000-0000-0000-000000000000')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('listNodeRuns: 存在しない runId は NotFoundError', async () => {
    const r = await workflowService.listNodeRuns('00000000-0000-0000-0000-000000000000')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('listNodeRuns: runId 空は ValidationError', async () => {
    const r = await workflowService.listNodeRuns('')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toMatch(/runId/)
  })
})
