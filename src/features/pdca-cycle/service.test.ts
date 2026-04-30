/**
 * queue: PDCA P-1 substrate — pdca_cycles service の最小 happy + failure path テスト。
 * 実 Supabase + RLS を通す (vi.mock で guard だけ stub)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pdcaCycleService } from './service'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard')

describe('pdcaCycleService', () => {
  let wsId: string
  let userId: string
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const setup = await createTestUserAndWorkspace('pdca-cycle')
    wsId = setup.wsId
    userId = setup.userId
    cleanup = setup.cleanup
    await mockAuthGuards(userId, setup.email, 'member')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanup()
  })

  it('create: workspace member が cycle を作れる, status は plan で開始', async () => {
    const r = await pdcaCycleService.create({
      workspaceId: wsId,
      title: 'Q2 リリース速度改善',
      hypothesis: 'standup を朝→昼で完了率上がる',
      targetMetric: '週次完了 item',
      targetValue: '12 → 16',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.status).toBe('plan')
    expect(r.value.title).toBe('Q2 リリース速度改善')
    expect(r.value.ownerId).toBe(userId)
    expect(r.value.planStartedAt).not.toBeNull()
  })

  it('create: title が空は ValidationError', async () => {
    const r = await pdcaCycleService.create({
      workspaceId: wsId,
      title: '',
      hypothesis: '',
      targetMetric: '',
      targetValue: '',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('VALIDATION')
  })

  it('advancePhase: plan → do は許可', async () => {
    const c = await pdcaCycleService.create({
      workspaceId: wsId,
      title: 't',
      hypothesis: '',
      targetMetric: '',
      targetValue: '',
    })
    if (!c.ok) throw c.error
    const r = await pdcaCycleService.advancePhase({
      id: c.value.id,
      expectedVersion: c.value.version,
      to: 'do',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.status).toBe('do')
    expect(r.value.doStartedAt).not.toBeNull()
    expect(r.value.planFinishedAt).not.toBeNull()
  })

  it('advancePhase: plan → act (skip) は禁止', async () => {
    const c = await pdcaCycleService.create({
      workspaceId: wsId,
      title: 't',
      hypothesis: '',
      targetMetric: '',
      targetValue: '',
    })
    if (!c.ok) throw c.error
    const r = await pdcaCycleService.advancePhase({
      id: c.value.id,
      expectedVersion: c.value.version,
      to: 'act',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('VALIDATION')
  })

  it('update: 楽観ロック衝突 で ConflictError', async () => {
    const c = await pdcaCycleService.create({
      workspaceId: wsId,
      title: 't',
      hypothesis: '',
      targetMetric: '',
      targetValue: '',
    })
    if (!c.ok) throw c.error
    const r = await pdcaCycleService.update({
      id: c.value.id,
      expectedVersion: 999,
      patch: { title: 'new' },
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('CONFLICT')
  })

  it('get: 存在しない id で NotFoundError', async () => {
    const r = await pdcaCycleService.get('00000000-0000-0000-0000-000000000000')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('NOT_FOUND')
  })
})
