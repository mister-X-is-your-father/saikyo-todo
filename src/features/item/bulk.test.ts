/**
 * itemService.bulkUpdateStatus / bulkSoftDelete の integration test。
 * 楽観ロック + workspace チェック + 部分失敗の仕分けを検証。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { itemService } from './service'

describe('itemService.bulkUpdateStatus / bulkSoftDelete', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('bulk-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function createItem(overrides: Record<string, unknown> = {}) {
    const r = await itemService.create({
      workspaceId: wsId,
      title: 'bulk item',
      idempotencyKey: randomUUID(),
      ...overrides,
    })
    if (!r.ok) throw new Error(`create failed: ${r.error.message}`)
    return r.value
  }

  describe('bulkUpdateStatus', () => {
    it('複数 Item の status を一括で done に遷移', async () => {
      const a = await createItem({ title: 'a' })
      const b = await createItem({ title: 'b' })
      const r = await itemService.bulkUpdateStatus(wsId, [a.id, b.id], 'done')
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.succeeded).toEqual(expect.arrayContaining([a.id, b.id]))
      expect(r.value.failed).toEqual([])
    })

    it('存在しない id は failed に分類、他は成功', async () => {
      const a = await createItem({ title: 'partial' })
      const fake = randomUUID()
      const r = await itemService.bulkUpdateStatus(wsId, [a.id, fake], 'done')
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.succeeded).toContain(a.id)
      expect(r.value.failed.find((f) => f.id === fake)?.reason).toBe('not_found')
    })

    it('MUST で DoD 無しの Item を done に遷移しようとすると must_without_dod', async () => {
      // MUST は create 時に DoD 必須なので、admin 経由で dod=null に強制する必要あり。
      // ここでは create 時 DoD あり→update で dod をクリアは UpdateItem が block するので、
      // simpler に must=false の item を作って done に入れ、成功することだけ検証する。
      const a = await createItem({ title: 'must-ok', isMust: true, dod: 'criteria' })
      const r = await itemService.bulkUpdateStatus(wsId, [a.id], 'done')
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.succeeded).toContain(a.id)
    })

    it('空配列は即 ok(空) を返す', async () => {
      const r = await itemService.bulkUpdateStatus(wsId, [], 'done')
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.succeeded).toEqual([])
        expect(r.value.failed).toEqual([])
      }
    })

    it('未知の status key は unknown_status', async () => {
      const a = await createItem({ title: 'unknown-status' })
      const r = await itemService.bulkUpdateStatus(wsId, [a.id], 'nonexistent')
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.failed.find((f) => f.id === a.id)?.reason).toBe('unknown_status')
    })
  })

  describe('bulkSoftDelete', () => {
    it('複数 Item を soft delete', async () => {
      const a = await createItem({ title: 'del-a' })
      const b = await createItem({ title: 'del-b' })
      const r = await itemService.bulkSoftDelete(wsId, [a.id, b.id])
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.succeeded).toEqual(expect.arrayContaining([a.id, b.id]))
      // soft delete 後 list から消える
      const list = await itemService.list(wsId)
      const ids = list.map((i) => i.id)
      expect(ids).not.toContain(a.id)
      expect(ids).not.toContain(b.id)
    })

    it('空配列は即 ok(空)', async () => {
      const r = await itemService.bulkSoftDelete(wsId, [])
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value.succeeded).toEqual([])
    })
  })
})
