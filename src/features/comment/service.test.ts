/**
 * commentService integration test.
 * Item / Doc 両方のコメント、著者本人のみ編集/削除の分岐を検証。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { docService } from '@/features/doc/service'
import { itemService } from '@/features/item/service'

import { commentService } from './service'

describe('commentService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>
  let itemId: string
  let docId: string

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('comment-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)

    const itemResult = await itemService.create({
      workspaceId: wsId,
      title: 'host item',
      idempotencyKey: randomUUID(),
    })
    if (!itemResult.ok) throw new Error('item setup failed')
    itemId = itemResult.value.id

    const docResult = await docService.create({
      workspaceId: wsId,
      title: 'host doc',
      idempotencyKey: randomUUID(),
    })
    if (!docResult.ok) throw new Error('doc setup failed')
    docId = docResult.value.id
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    // 各 test 後に mock を test user に戻す (他 user に切替える test がある)
    await mockAuthGuards(userId, email)
  })

  describe('onItem', () => {
    it('create: item に自分のコメント', async () => {
      const result = await commentService.onItem.create({
        itemId,
        body: 'コメント1',
        idempotencyKey: randomUUID(),
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.body).toBe('コメント1')
        expect(result.value.authorActorId).toBe(userId)
      }
    })

    it('create: 存在しない item → NotFoundError', async () => {
      const result = await commentService.onItem.create({
        itemId: randomUUID(),
        body: 'x',
        idempotencyKey: randomUUID(),
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('update: 自分のコメントは編集可', async () => {
      const c = await commentService.onItem.create({
        itemId,
        body: 'v1',
        idempotencyKey: randomUUID(),
      })
      if (!c.ok) throw new Error('setup')
      const result = await commentService.onItem.update({
        id: c.value.id,
        expectedVersion: c.value.version,
        patch: { body: 'v2' },
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.body).toBe('v2')
    })

    it('update: 他人のコメントは ValidationError (著者本人のみ)', async () => {
      // 別ユーザを用意して同じ ws に追加、そのユーザでコメントを作らせる
      const otherUser = await createTestUserAndWorkspace('comment-other')
      try {
        // otherUser を本 ws のメンバーに追加
        await adminClient().from('workspace_members').insert({
          workspace_id: wsId,
          user_id: otherUser.userId,
          role: 'member',
        })
        // other でコメント作成
        await mockAuthGuards(otherUser.userId, otherUser.email)
        const c = await commentService.onItem.create({
          itemId,
          body: 'by other',
          idempotencyKey: randomUUID(),
        })
        if (!c.ok) throw new Error('other setup failed')

        // 本 user に戻して他人のコメントを編集しようとする
        await mockAuthGuards(userId, email)
        const result = await commentService.onItem.update({
          id: c.value.id,
          expectedVersion: c.value.version,
          patch: { body: 'hijacked' },
        })
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('VALIDATION')
      } finally {
        await otherUser.cleanup()
      }
    })

    it('softDelete: 自分のコメントは削除可、list から消える', async () => {
      const c = await commentService.onItem.create({
        itemId,
        body: '消す',
        idempotencyKey: randomUUID(),
      })
      if (!c.ok) throw new Error('setup')
      const result = await commentService.onItem.softDelete({
        id: c.value.id,
        expectedVersion: c.value.version,
      })
      expect(result.ok).toBe(true)
      const list = await commentService.onItem.list(itemId)
      expect(list.some((x) => x.id === c.value.id)).toBe(false)
    })
  })

  describe('onDoc', () => {
    it('create: doc にコメント', async () => {
      const result = await commentService.onDoc.create({
        docId,
        body: 'doc comment',
        idempotencyKey: randomUUID(),
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.docId).toBe(docId)
    })

    it('create: 存在しない doc → NotFoundError', async () => {
      const result = await commentService.onDoc.create({
        docId: randomUUID(),
        body: 'x',
        idempotencyKey: randomUUID(),
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
    })

    it('update: 自分のコメントは編集可', async () => {
      const c = await commentService.onDoc.create({
        docId,
        body: 'v1',
        idempotencyKey: randomUUID(),
      })
      if (!c.ok) throw new Error('setup')
      const result = await commentService.onDoc.update({
        id: c.value.id,
        expectedVersion: c.value.version,
        patch: { body: 'v2' },
      })
      expect(result.ok).toBe(true)
    })
  })
})
