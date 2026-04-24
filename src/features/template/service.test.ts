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

describe('templateService.instantiate', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('template-instantiate')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function createTemplateWithItems(
    name: string,
    items: Array<{
      title: string
      parentPath?: string
      isMust?: boolean
      dod?: string
      dueOffsetDays?: number
    }>,
  ) {
    const t = await templateService.create({
      workspaceId: wsId,
      name,
      idempotencyKey: randomUUID(),
    })
    if (!t.ok) throw new Error(t.error.message)
    for (const i of items) {
      const r = await templateItemService.add({
        templateId: t.value.id,
        title: i.title,
        parentPath: i.parentPath ?? '',
        isMust: i.isMust ?? false,
        dod: i.dod ?? null,
        dueOffsetDays: i.dueOffsetDays ?? null,
      })
      if (!r.ok) throw new Error(r.error.message)
    }
    return t.value
  }

  it('子なし template を instantiate → root item だけ生成、audit + template_instantiations 追加', async () => {
    const t = await createTemplateWithItems('Onboarding {{client}}', [])
    const r = await templateService.instantiate({
      templateId: t.id,
      variables: { client: 'Acme' },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.createdItemCount).toBe(1)
    // items テーブルを確認
    const { data: rootItem } = await adminClient()
      .from('items')
      .select('title, workspace_id, parent_path')
      .eq('id', r.value.rootItemId)
      .single()
    expect(rootItem!.title).toBe('Onboarding Acme')
    expect(rootItem!.workspace_id).toBe(wsId)
    expect(rootItem!.parent_path).toBe('')
    // template_instantiations
    const { data: inst } = await adminClient()
      .from('template_instantiations')
      .select('root_item_id, template_id')
      .eq('id', r.value.instantiationId)
      .single()
    expect(inst!.root_item_id).toBe(r.value.rootItemId)
    expect(inst!.template_id).toBe(t.id)
    // audit
    const { data: audits } = await adminClient()
      .from('audit_log')
      .select('action, target_type')
      .eq('target_id', t.id)
    expect(audits?.some((a) => a.action === 'instantiate')).toBe(true)
  })

  it('2 階層 template: root + parent + child item が生成、parent_path が繋がる', async () => {
    // template_items.parentPath に child を書く必要がある。add 時に parent の label が要るので、
    // まず空 template 作成 → parent 追加 → 返り値 label で child 追加
    const t = await templateService.create({
      workspaceId: wsId,
      name: 'Hierarchical',
      idempotencyKey: randomUUID(),
    })
    if (!t.ok) throw new Error(t.error.message)
    const parent = await templateItemService.add({
      templateId: t.value.id,
      title: 'Parent step',
    })
    if (!parent.ok) throw new Error(parent.error.message)
    const { uuidToLabel } = await import('@/lib/db/ltree-path')
    const child = await templateItemService.add({
      templateId: t.value.id,
      title: 'Child step',
      parentPath: uuidToLabel(parent.value.id),
    })
    if (!child.ok) throw new Error(child.error.message)

    const r = await templateService.instantiate({ templateId: t.value.id, variables: {} })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.createdItemCount).toBe(3)
    // 構造確認: workspace 内に Parent / Child が存在、parent_path が繋がっている
    const { data: items } = await adminClient()
      .from('items')
      .select('id, title, parent_path')
      .eq('workspace_id', wsId)
    const rootLabel = uuidToLabel(r.value.rootItemId)
    const parentItem = items?.find((i) => i.title === 'Parent step')
    const childItem = items?.find((i) => i.title === 'Child step')
    expect(parentItem?.parent_path).toBe(rootLabel)
    expect(childItem?.parent_path).toBe(`${rootLabel}.${uuidToLabel(parentItem!.id)}`)
  })

  it('cron_run_id 指定で同じ値を再展開すると ConflictError', async () => {
    const t = await createTemplateWithItems('Cron-test', [])
    // cron_run_id は workspace 横断でグローバル UNIQUE なので、parallel test 間で
    // 衝突しないように test 内でユニーク値を作る
    const runId = `daily-${randomUUID()}`
    const run1 = await templateService.instantiate({
      templateId: t.id,
      variables: {},
      cronRunId: runId,
    })
    expect(run1.ok).toBe(true)
    const run2 = await templateService.instantiate({
      templateId: t.id,
      variables: {},
      cronRunId: runId,
    })
    expect(run2.ok).toBe(false)
    if (!run2.ok) expect(run2.error.code).toBe('CONFLICT')
  })

  it('MUST + dod + dueOffsetDays の template_item は実 item に反映', async () => {
    const t = await createTemplateWithItems('MUST-test', [
      { title: 'MUST step', isMust: true, dod: 'done criteria', dueOffsetDays: 5 },
    ])
    const r = await templateService.instantiate({ templateId: t.id, variables: {} })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const { data: items } = await adminClient()
      .from('items')
      .select('title, is_must, dod, due_date')
      .eq('workspace_id', wsId)
      .eq('title', 'MUST step')
    expect(items?.[0]?.is_must).toBe(true)
    expect(items?.[0]?.dod).toBe('done criteria')
    // 今日 +5 日の ISO 日付
    const today = new Date()
    today.setUTCDate(today.getUTCDate() + 5)
    const expected = today.toISOString().slice(0, 10)
    expect(items?.[0]?.due_date).toBe(expected)
  })

  it('存在しない template は NotFoundError', async () => {
    const r = await templateService.instantiate({
      templateId: randomUUID(),
      variables: {},
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('NOT_FOUND')
  })
})
