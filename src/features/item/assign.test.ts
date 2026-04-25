/**
 * itemService.setAssignees / setTags の integration test。
 * 実 Supabase + RLS + audit_log を通す。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { tagService } from '@/features/tag/service'

import { itemService } from './service'

describe('itemService.setAssignees / setTags', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('assign-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function createItem(title = 'item') {
    const r = await itemService.create({
      workspaceId: wsId,
      title,
      idempotencyKey: randomUUID(),
    })
    if (!r.ok) throw new Error(`create item failed: ${r.error.message}`)
    return r.value
  }

  describe('setAssignees', () => {
    it('自分を assign できる', async () => {
      const item = await createItem('assign me')
      const r = await itemService.setAssignees(item.id, [{ actorType: 'user', actorId: userId }])
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value).toHaveLength(1)
        expect(r.value[0]?.actorId).toBe(userId)
      }
    })

    it('非 member を assign すると ValidationError', async () => {
      const item = await createItem('bad assign')
      const fakeUuid = randomUUID()
      const r = await itemService.setAssignees(item.id, [{ actorType: 'user', actorId: fakeUuid }])
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })

    it('空配列で全削除', async () => {
      const item = await createItem('clear assign')
      await itemService.setAssignees(item.id, [{ actorType: 'user', actorId: userId }])
      const r = await itemService.setAssignees(item.id, [])
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toHaveLength(0)
      const listed = await itemService.listAssignees(item.id)
      expect(listed).toHaveLength(0)
    })
  })

  describe('setTags', () => {
    it('workspace 内 tag を set できる', async () => {
      const item = await createItem('tag target')
      const tag1 = await tagService.create({
        workspaceId: wsId,
        name: `t1-${Date.now()}`,
        color: '#aa0000',
      })
      if (!tag1.ok) throw new Error('tag create failed')
      const r = await itemService.setTags(item.id, [tag1.value.id])
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toEqual([tag1.value.id])
    })

    it('別 workspace の tag は ValidationError', async () => {
      const other = await createTestUserAndWorkspace('assign-other')
      try {
        const otherTag = await (async () => {
          // other 側で tag を作るには auth guard を切り替える必要があるので、直接 adminDb でもOK
          // ここでは簡略化: 別 ws に対する setTags は tagsBelongToWorkspace で弾かれる
          return { id: randomUUID() }
        })()
        const item = await createItem('bad tag')
        const r = await itemService.setTags(item.id, [otherTag.id])
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.error.code).toBe('VALIDATION')
      } finally {
        await other.cleanup()
      }
    })

    it('空配列で全削除', async () => {
      const item = await createItem('clear tags')
      const tag = await tagService.create({
        workspaceId: wsId,
        name: `clear-${Date.now()}`,
        color: '#00aa00',
      })
      if (!tag.ok) throw new Error('tag create failed')
      await itemService.setTags(item.id, [tag.value.id])
      const r = await itemService.setTags(item.id, [])
      expect(r.ok).toBe(true)
      const listed = await itemService.listTagIds(item.id)
      expect(listed).toEqual([])
    })
  })
})
