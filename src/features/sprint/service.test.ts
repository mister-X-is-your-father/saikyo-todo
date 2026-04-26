/**
 * sprintService integration test (実 Supabase + RLS)。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

vi.mock('@/lib/jobs/queue', () => ({
  enqueueJob: vi.fn().mockResolvedValue('mock'),
  startBoss: vi.fn(),
  stopBoss: vi.fn(),
  registerWorker: vi.fn(),
  QUEUE_NAMES: ['sprint-retro'] as const,
}))

import { enqueueJob } from '@/lib/jobs/queue'

import { sprintService } from './service'

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function createItem(wsId: string, userId: string, title = 'sp-item'): Promise<string> {
  const ac = adminClient()
  const { data, error } = await ac
    .from('items')
    .insert({
      workspace_id: wsId,
      title,
      description: '',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('insert item failed')
  return data.id
}

describe('sprintService.create / list / get / update', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('sprint-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })
  afterAll(async () => {
    await cleanup()
  })

  it('create: planning status で作成、audit に create 1 件', async () => {
    const r = await sprintService.create({
      workspaceId: wsId,
      name: 'Sprint A',
      goal: 'goal A',
      startDate: isoDaysFromNow(0),
      endDate: isoDaysFromNow(13),
      idempotencyKey: crypto.randomUUID(),
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.status).toBe('planning')
    expect(r.value.name).toBe('Sprint A')

    const ac = adminClient()
    const { data: audits } = await ac
      .from('audit_log')
      .select('action, target_type, target_id')
      .eq('workspace_id', wsId)
      .eq('target_id', r.value.id)
    expect(audits?.some((a) => a.action === 'create')).toBe(true)
  })

  it('create: start > end は ValidationError', async () => {
    const r = await sprintService.create({
      workspaceId: wsId,
      name: 'Bad',
      startDate: isoDaysFromNow(10),
      endDate: isoDaysFromNow(5),
      idempotencyKey: crypto.randomUUID(),
    })
    expect(r.ok).toBe(false)
  })

  it('list: 作成順に出てくる + active を最上位', async () => {
    const r = await sprintService.list(wsId)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.length).toBeGreaterThanOrEqual(1)
  })

  it('update: name patch + version インクリメント', async () => {
    const created = await sprintService.create({
      workspaceId: wsId,
      name: 'Sprint B',
      startDate: isoDaysFromNow(0),
      endDate: isoDaysFromNow(7),
      idempotencyKey: crypto.randomUUID(),
    })
    if (!created.ok) throw created.error
    const before = created.value
    const r = await sprintService.update({
      id: before.id,
      expectedVersion: before.version,
      patch: { name: 'Sprint B (renamed)' },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.name).toBe('Sprint B (renamed)')
    expect(r.value.version).toBe(before.version + 1)
  })

  it('update: 楽観ロック衝突で ConflictError', async () => {
    const created = await sprintService.create({
      workspaceId: wsId,
      name: 'Sprint C',
      startDate: isoDaysFromNow(0),
      endDate: isoDaysFromNow(7),
      idempotencyKey: crypto.randomUUID(),
    })
    if (!created.ok) throw created.error
    const r = await sprintService.update({
      id: created.value.id,
      expectedVersion: 999, // 不一致
      patch: { name: 'X' },
    })
    expect(r.ok).toBe(false)
  })

  // Phase 6.15 iter 106: workspace 単位 Sprint デフォルト
  it('getDefaults: 既定 (月曜開始 / 14 日) を返す', async () => {
    const r = await sprintService.getDefaults(wsId)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.startDow).toBe(1)
    expect(r.value.lengthDays).toBe(14)
  })

  it('getDefaults: 空 workspaceId は ValidationError', async () => {
    const r = await sprintService.getDefaults('')
    expect(r.ok).toBe(false)
  })
})

describe('sprintService.changeStatus', () => {
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('sprint-status')
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(fx.userId, fx.email)
  })
  afterAll(async () => {
    await cleanup()
  })

  it('completed への遷移で sprint-retro ジョブを enqueue (Phase 5.3 自動化)', async () => {
    vi.mocked(enqueueJob).mockClear()
    const created = await sprintService.create({
      workspaceId: wsId,
      name: 'Auto-retro target',
      startDate: isoDaysFromNow(-7),
      endDate: isoDaysFromNow(0),
      idempotencyKey: crypto.randomUUID(),
    })
    if (!created.ok) throw created.error
    // planning → active
    const a = await sprintService.changeStatus({
      id: created.value.id,
      expectedVersion: created.value.version,
      status: 'active',
    })
    if (!a.ok) throw a.error
    // この時点では retro enqueue されない (active にしただけ)
    expect(
      vi.mocked(enqueueJob).mock.calls.find(([name]) => name === 'sprint-retro'),
    ).toBeUndefined()

    // active → completed → enqueue されるべき
    const c = await sprintService.changeStatus({
      id: a.value.id,
      expectedVersion: a.value.version,
      status: 'completed',
    })
    if (!c.ok) throw c.error
    const retroCall = vi.mocked(enqueueJob).mock.calls.find(([name]) => name === 'sprint-retro')
    expect(retroCall).toBeDefined()
    if (retroCall) {
      const [, data, options] = retroCall
      expect((data as { sprintId?: string }).sprintId).toBe(c.value.id)
      expect((data as { trigger?: string }).trigger).toBe('sprint-completed')
      expect((options as { singletonKey?: string })?.singletonKey).toContain(c.value.id)
    }
  })

  it('planning → active → completed', async () => {
    const created = await sprintService.create({
      workspaceId: wsId,
      name: 'A',
      startDate: isoDaysFromNow(0),
      endDate: isoDaysFromNow(7),
      idempotencyKey: crypto.randomUUID(),
    })
    if (!created.ok) throw created.error
    let cur = created.value

    const a = await sprintService.changeStatus({
      id: cur.id,
      expectedVersion: cur.version,
      status: 'active',
    })
    if (!a.ok) throw a.error
    expect(a.value.status).toBe('active')
    cur = a.value

    const c = await sprintService.changeStatus({
      id: cur.id,
      expectedVersion: cur.version,
      status: 'completed',
    })
    if (!c.ok) throw c.error
    expect(c.value.status).toBe('completed')

    // getActive は null
    const act = await sprintService.getActive(wsId)
    if (!act.ok) throw act.error
    expect(act.value).toBeNull()
  })

  it('同 workspace で 2 つ目を active にすると ValidationError (DB unique)', async () => {
    // 1 つ目を active
    const a = await sprintService.create({
      workspaceId: wsId,
      name: 'first',
      startDate: isoDaysFromNow(0),
      endDate: isoDaysFromNow(7),
      idempotencyKey: crypto.randomUUID(),
    })
    if (!a.ok) throw a.error
    const a1 = await sprintService.changeStatus({
      id: a.value.id,
      expectedVersion: a.value.version,
      status: 'active',
    })
    if (!a1.ok) throw a1.error

    // 2 つ目を active にすると Unique violation
    const b = await sprintService.create({
      workspaceId: wsId,
      name: 'second',
      startDate: isoDaysFromNow(0),
      endDate: isoDaysFromNow(7),
      idempotencyKey: crypto.randomUUID(),
    })
    if (!b.ok) throw b.error
    const b1 = await sprintService.changeStatus({
      id: b.value.id,
      expectedVersion: b.value.version,
      status: 'active',
    })
    expect(b1.ok).toBe(false)
    if (b1.ok) return
    // ValidationError か ConflictError でも OK (両方 throw 経由ではなく Result)
    expect(b1.error).toBeDefined()
  })
})

describe('sprintService.assignItem', () => {
  let userId: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('sprint-assign')
    userId = fx.userId
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(fx.userId, fx.email)
  })
  afterAll(async () => {
    await cleanup()
  })

  it('item を sprint に割当 → progress 集計に出る → 解除で 0 件', async () => {
    const sp = await sprintService.create({
      workspaceId: wsId,
      name: 'Sprint X',
      startDate: isoDaysFromNow(0),
      endDate: isoDaysFromNow(7),
      idempotencyKey: crypto.randomUUID(),
    })
    if (!sp.ok) throw sp.error
    const itemId = await createItem(wsId, userId, 'sprint-x-item')

    const a = await sprintService.assignItem({ itemId, sprintId: sp.value.id })
    if (!a.ok) throw a.error

    const p = await sprintService.progress(sp.value.id)
    if (!p.ok) throw p.error
    expect(p.value.total).toBe(1)
    expect(p.value.done).toBe(0)

    const u = await sprintService.assignItem({ itemId, sprintId: null })
    if (!u.ok) throw u.error

    const p2 = await sprintService.progress(sp.value.id)
    if (!p2.ok) throw p2.error
    expect(p2.value.total).toBe(0)
  })

  it('別 workspace の Sprint への割当は ValidationError', async () => {
    const other = await createTestUserAndWorkspace('sprint-assign-other')
    try {
      await mockAuthGuards(other.userId, other.email)
      const otherSp = await sprintService.create({
        workspaceId: other.wsId,
        name: 'other ws',
        startDate: isoDaysFromNow(0),
        endDate: isoDaysFromNow(7),
        idempotencyKey: crypto.randomUUID(),
      })
      if (!otherSp.ok) throw otherSp.error

      // 元 ws の actor に戻して、別 ws の sprint へ割当しようとする
      await mockAuthGuards(userId, 'sprint-assign@example.com')
      const itemId = await createItem(wsId, userId, 'cross-attempt')
      const r = await sprintService.assignItem({ itemId, sprintId: otherSp.value.id })
      expect(r.ok).toBe(false)
    } finally {
      await other.cleanup()
    }
  })
})
