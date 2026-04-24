/**
 * templateService / templateItemService integration test (実 Supabase + RLS)。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { templateItemService, templateService } from './service'

describe('templateService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('template-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function createTemplate(overrides: Record<string, unknown> = {}) {
    const r = await templateService.create({
      workspaceId: wsId,
      name: 'tmpl',
      idempotencyKey: randomUUID(),
      ...overrides,
    })
    if (!r.ok) throw new Error(`create failed: ${r.error.message}`)
    return r.value
  }

  describe('create', () => {
    it('manual kind で作成できる (scheduleCron 不要)', async () => {
      const t = await createTemplate({ name: 'manual-tmpl' })
      expect(t.kind).toBe('manual')
      expect(t.name).toBe('manual-tmpl')
      expect(t.scheduleCron).toBeNull()
      expect(t.version).toBe(0)
    })

    it('recurring kind で scheduleCron ありなら作成できる', async () => {
      const t = await createTemplate({
        name: 'cron-tmpl',
        kind: 'recurring',
        scheduleCron: '0 9 * * *',
      })
      expect(t.kind).toBe('recurring')
      expect(t.scheduleCron).toBe('0 9 * * *')
    })

    it('recurring kind で scheduleCron 無しは ValidationError', async () => {
      const r = await templateService.create({
        workspaceId: wsId,
        name: 'bad-cron',
        kind: 'recurring',
        idempotencyKey: randomUUID(),
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })

    it('audit_log に create が残る', async () => {
      const t = await createTemplate({ name: 'audit' })
      const { data: audits } = await adminClient()
        .from('audit_log')
        .select('action, target_type')
        .eq('target_id', t.id)
      expect(audits?.some((a) => a.action === 'create' && a.target_type === 'template')).toBe(true)
    })
  })

  describe('update', () => {
    it('name を更新、version インクリメント', async () => {
      const t = await createTemplate()
      const r = await templateService.update({
        id: t.id,
        expectedVersion: t.version,
        patch: { name: 'renamed' },
      })
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.name).toBe('renamed')
        expect(r.value.version).toBe(t.version + 1)
      }
    })

    it('古い expectedVersion で ConflictError', async () => {
      const t = await createTemplate()
      await templateService.update({
        id: t.id,
        expectedVersion: t.version,
        patch: { name: 'first' },
      })
      const r = await templateService.update({
        id: t.id,
        expectedVersion: t.version,
        patch: { name: 'second' },
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('CONFLICT')
    })
  })

  describe('softDelete', () => {
    it('deleted_at セット、list で除外', async () => {
      const t = await createTemplate({ name: 'to-del' })
      const r = await templateService.softDelete({ id: t.id, expectedVersion: t.version })
      expect(r.ok).toBe(true)
      const list = await templateService.list(wsId)
      expect(list.some((x) => x.id === t.id)).toBe(false)
    })
  })

  describe('list', () => {
    it('kind フィルタ', async () => {
      await createTemplate({ name: 'm1', kind: 'manual' })
      await createTemplate({
        name: 'r1',
        kind: 'recurring',
        scheduleCron: '0 9 * * *',
      })
      const manuals = await templateService.list(wsId, { kind: 'manual' })
      expect(manuals.every((t) => t.kind === 'manual')).toBe(true)
      const recs = await templateService.list(wsId, { kind: 'recurring' })
      expect(recs.every((t) => t.kind === 'recurring')).toBe(true)
    })
  })
})

describe('templateItemService', () => {
  let userId: string
  let email: string
  let wsId: string
  let templateId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('template-item-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
    const r = await templateService.create({
      workspaceId: wsId,
      name: 'tmpl-parent',
      idempotencyKey: randomUUID(),
    })
    if (!r.ok) throw new Error(r.error.message)
    templateId = r.value.id
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('add', () => {
    it('通常 item を追加できる', async () => {
      const r = await templateItemService.add({ templateId, title: 'step 1' })
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.title).toBe('step 1')
        expect(r.value.templateId).toBe(templateId)
        expect(r.value.isMust).toBe(false)
      }
    })

    it('MUST item は dod 必須', async () => {
      const bad = await templateItemService.add({ templateId, title: 'must', isMust: true })
      expect(bad.ok).toBe(false)
      if (!bad.ok) expect(bad.error.code).toBe('VALIDATION')
      const good = await templateItemService.add({
        templateId,
        title: 'must',
        isMust: true,
        dod: 'criteria',
      })
      expect(good.ok).toBe(true)
    })

    it('存在しない template に対しては NotFoundError', async () => {
      const r = await templateItemService.add({
        templateId: randomUUID(),
        title: 'orphan',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('NOT_FOUND')
    })
  })

  describe('update / remove', () => {
    it('update 後に title が変わる', async () => {
      const a = await templateItemService.add({ templateId, title: 'before' })
      if (!a.ok) throw new Error(a.error.message)
      const u = await templateItemService.update({
        id: a.value.id,
        patch: { title: 'after' },
      })
      expect(u.ok).toBe(true)
      if (u.ok) expect(u.value.title).toBe('after')
    })

    it('remove で削除', async () => {
      const a = await templateItemService.add({ templateId, title: 'to-del' })
      if (!a.ok) throw new Error(a.error.message)
      const r = await templateItemService.remove({ id: a.value.id })
      expect(r.ok).toBe(true)
      const list = await templateItemService.listByTemplate(templateId)
      expect(list.some((x) => x.id === a.value.id)).toBe(false)
    })
  })

  describe('listByTemplate', () => {
    it('template 配下の items だけ返す (別 template のは含まない)', async () => {
      // 別 template
      const other = await templateService.create({
        workspaceId: wsId,
        name: 'other',
        idempotencyKey: randomUUID(),
      })
      if (!other.ok) throw new Error(other.error.message)
      const otherItem = await templateItemService.add({
        templateId: other.value.id,
        title: 'other step',
      })
      if (!otherItem.ok) throw new Error(otherItem.error.message)

      const list = await templateItemService.listByTemplate(templateId)
      expect(list.every((i) => i.templateId === templateId)).toBe(true)
      expect(list.some((i) => i.id === otherItem.value.id)).toBe(false)
    })
  })
})
