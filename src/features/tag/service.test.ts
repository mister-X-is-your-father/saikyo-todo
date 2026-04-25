/**
 * tagService integration test.
 * 実 Supabase + RLS + audit_log を通す。auth guard のみ vi.mock。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { tagService } from './service'

describe('tagService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('tag-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function createTag(overrides: Record<string, unknown> = {}) {
    const res = await tagService.create({
      workspaceId: wsId,
      name: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      color: '#ff0000',
      ...overrides,
    })
    if (!res.ok) throw new Error(`tag create failed: ${res.error.message}`)
    return res.value
  }

  it('タグを作成できる', async () => {
    const tag = await createTag({ name: 'feature' })
    expect(tag.name).toBe('feature')
    expect(tag.color).toBe('#ff0000')
  })

  it('同名タグは ConflictError', async () => {
    await createTag({ name: 'dup-tag' })
    const res = await tagService.create({
      workspaceId: wsId,
      name: 'dup-tag',
      color: '#64748b',
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('CONFLICT')
  })

  it('color フォーマットエラーは ValidationError', async () => {
    const res = await tagService.create({
      workspaceId: wsId,
      name: 'bad-color',
      color: 'red',
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('VALIDATION')
  })

  it('タグ名を update できる', async () => {
    const tag = await createTag({ name: 'old-name' })
    const updated = await tagService.update({
      id: tag.id,
      patch: { name: 'new-name' },
    })
    expect(updated.ok).toBe(true)
    if (updated.ok) expect(updated.value.name).toBe('new-name')
  })

  it('delete するとリストから消える', async () => {
    const tag = await createTag({ name: 'temp-tag' })
    const del = await tagService.delete({ id: tag.id })
    expect(del.ok).toBe(true)
    const list = await tagService.listByWorkspace(wsId)
    expect(list.find((t) => t.id === tag.id)).toBeUndefined()
  })

  it('listByWorkspace は name 昇順', async () => {
    await createTag({ name: 'zzz-last' })
    await createTag({ name: 'aaa-first' })
    const list = await tagService.listByWorkspace(wsId)
    expect(list.length).toBeGreaterThanOrEqual(2)
    const first = list[0]
    const last = list[list.length - 1]
    if (!first || !last) throw new Error('list should have at least 2 items')
    expect(first.name <= last.name).toBe(true)
  })
})
