/**
 * premortemService unit tests:
 *   - buildPremortemUserMessage (pure)
 *   - runForSprint: pmService.run を mock して prompt + marker 更新を検証
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
  QUEUE_NAMES: ['sprint-premortem'] as const,
}))

vi.mock('@/features/agent/pm-service', () => ({
  pmService: {
    run: vi.fn(),
  },
}))

import { err, ok } from '@/lib/result'

import { pmService } from '@/features/agent/pm-service'

import {
  buildPremortemUserMessage,
  detectBlockedItems,
  premortemService,
} from './premortem-service'

describe('buildPremortemUserMessage (pure)', () => {
  it('期間 / MUST 数 / DoD 未設定数を集計に出す', () => {
    const msg = buildPremortemUserMessage({
      sprintName: 'Sprint Alpha',
      sprintGoal: 'API 移行',
      startDate: '2026-05-01',
      endDate: '2026-05-14',
      itemSummaries: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          title: '認証移行',
          status: 'todo',
          isMust: true,
          priority: 1,
          dueDate: '2026-05-05',
          dod: 'JWT を回帰テスト 100% PASS',
          descriptionPreview: '',
        },
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          title: 'Schema rewrite',
          status: 'todo',
          isMust: true,
          priority: 1,
          dueDate: null,
          dod: null,
          descriptionPreview: '',
        },
        {
          id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          title: 'CSS 整理',
          status: 'todo',
          isMust: false,
          priority: 4,
          dueDate: null,
          dod: null,
          descriptionPreview: '',
        },
      ],
    })
    expect(msg).toContain('Sprint "Sprint Alpha"')
    expect(msg).toContain('API 移行')
    expect(msg).toContain('14 日間')
    expect(msg).toContain('MUST**: 2 件 (うち 1 件 DoD 未設定)')
    expect(msg).toContain('Item 総数**: 3 件')
    expect(msg).toContain('⚠ MUST のみ (2 件)')
    expect(msg).toContain('Pre-mortem - Sprint Alpha (2026-05-01)')
    // DoD 未設定マーカー
    expect(msg).toContain('⚠ DoD 未設定')
    // 手順が search_docs / create_doc / create_item を含む
    expect(msg).toContain('search_docs')
    expect(msg).toContain('create_doc')
    expect(msg).toContain('create_item')
  })

  it('ゴール未設定なら自リスクとして言及する', () => {
    const msg = buildPremortemUserMessage({
      sprintName: 'X',
      sprintGoal: null,
      startDate: '2026-05-01',
      endDate: '2026-05-07',
      itemSummaries: [],
    })
    expect(msg).toContain('未設定 (← それ自体が大きなリスク)')
    expect(msg).toContain('全 Item: なし')
  })

  it('依存ブロックが検出されると prompt に専用セクションが入る', () => {
    const aId = '11111111-1111-1111-1111-111111111111'
    const bId = '22222222-2222-2222-2222-222222222222'
    const msg = buildPremortemUserMessage({
      sprintName: 'WithDeps',
      sprintGoal: 'block test',
      startDate: '2026-05-01',
      endDate: '2026-05-07',
      itemSummaries: [
        {
          id: aId,
          title: '上流タスク',
          status: 'todo',
          isMust: false,
          priority: 3,
          dueDate: null,
          dod: null,
          doneAt: null,
          descriptionPreview: '',
        },
        {
          id: bId,
          title: '下流の MUST',
          status: 'todo',
          isMust: true,
          priority: 1,
          dueDate: '2026-05-06',
          dod: 'PASS',
          doneAt: null,
          descriptionPreview: '',
        },
      ],
      dependencies: [{ fromItemId: aId, toItemId: bId }],
      externalUpstreams: [],
    })
    expect(msg).toContain('依存関係**: 1 件 (blocks)')
    expect(msg).toContain('🔴 現時点で blocked: 1 件 (MUST 1)')
    expect(msg).toContain('🔴 依存ブロック中')
    expect(msg).toContain('下流の MUST')
    expect(msg).toContain('上流タスク')
  })

  it('上流が完了済 (doneAt あり) なら blocked にならない', () => {
    const aId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const bId = '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const msg = buildPremortemUserMessage({
      sprintName: 'AllDone',
      sprintGoal: null,
      startDate: '2026-05-01',
      endDate: '2026-05-07',
      itemSummaries: [
        {
          id: aId,
          title: '上流',
          status: 'done',
          isMust: false,
          priority: 3,
          dueDate: null,
          dod: null,
          doneAt: new Date('2026-05-02'),
          descriptionPreview: '',
        },
        {
          id: bId,
          title: '下流',
          status: 'todo',
          isMust: true,
          priority: 1,
          dueDate: null,
          dod: 'PASS',
          doneAt: null,
          descriptionPreview: '',
        },
      ],
      dependencies: [{ fromItemId: aId, toItemId: bId }],
    })
    expect(msg).not.toContain('🔴 現時点で blocked')
    expect(msg).not.toContain('🔴 依存ブロック中')
  })

  it('Sprint 外の上流 Item が未完なら external として blocked 扱い', () => {
    const aId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
    const bId = '33333333-3333-3333-3333-333333333333'
    const msg = buildPremortemUserMessage({
      sprintName: 'External',
      sprintGoal: null,
      startDate: '2026-05-01',
      endDate: '2026-05-07',
      itemSummaries: [
        {
          id: bId,
          title: 'Sprint 内の MUST',
          status: 'todo',
          isMust: true,
          priority: 1,
          dueDate: null,
          dod: 'PASS',
          doneAt: null,
          descriptionPreview: '',
        },
      ],
      dependencies: [{ fromItemId: aId, toItemId: bId }],
      externalUpstreams: [{ id: aId, title: 'API 完成', status: 'in_progress', doneAt: null }],
    })
    expect(msg).toContain('API 完成 (Sprint 外)')
    expect(msg).toContain('🔴 依存ブロック中')
  })

  it('MUST が 0 件なら "MUST のみ" セクションは出さない', () => {
    const msg = buildPremortemUserMessage({
      sprintName: 'No must',
      sprintGoal: 'optional',
      startDate: '2026-05-01',
      endDate: '2026-05-07',
      itemSummaries: [
        {
          id: 'a',
          title: 'A',
          status: 'todo',
          isMust: false,
          priority: 3,
          dueDate: null,
          dod: null,
          descriptionPreview: '',
        },
      ],
    })
    expect(msg).not.toContain('⚠ MUST のみ')
    expect(msg).toContain('MUST**: 0 件 (うち 0 件 DoD 未設定)')
  })
})

describe('detectBlockedItems (pure)', () => {
  const baseSummary = {
    status: 'todo',
    isMust: false,
    priority: 3,
    dueDate: null,
    dod: null,
    doneAt: null,
    descriptionPreview: '',
  }
  it('上流が未完なら blocked', () => {
    const r = detectBlockedItems(
      [
        { ...baseSummary, id: 'a', title: 'A' },
        { ...baseSummary, id: 'b', title: 'B' },
      ],
      [{ fromItemId: 'a', toItemId: 'b' }],
      [],
    )
    expect(r).toHaveLength(1)
    expect(r[0]?.item.id).toBe('b')
    expect(r[0]?.blockedBy[0]?.id).toBe('a')
  })
  it('上流が完了 (doneAt) なら blocked 解除', () => {
    const r = detectBlockedItems(
      [
        { ...baseSummary, id: 'a', title: 'A', doneAt: new Date() },
        { ...baseSummary, id: 'b', title: 'B' },
      ],
      [{ fromItemId: 'a', toItemId: 'b' }],
      [],
    )
    expect(r).toHaveLength(0)
  })
  it('自分自身が完了済なら blocked 一覧に出ない', () => {
    const r = detectBlockedItems(
      [
        { ...baseSummary, id: 'a', title: 'A' },
        { ...baseSummary, id: 'b', title: 'B', doneAt: new Date() },
      ],
      [{ fromItemId: 'a', toItemId: 'b' }],
      [],
    )
    expect(r).toHaveLength(0)
  })
})

describe('premortemService.runForSprint', () => {
  let userId: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('premortem')
    userId = fx.userId
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, fx.email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function makePlanningSprint(): Promise<string> {
    const ac = adminClient()
    const { data } = await ac
      .from('sprints')
      .insert({
        workspace_id: wsId,
        name: 'Pre-mortem Test',
        goal: 'test',
        start_date: '2026-05-01',
        end_date: '2026-05-14',
        status: 'planning',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    return data!.id as string
  }

  it('成功時に premortem_generated_at がセットされる', async () => {
    const sprintId = await makePlanningSprint()
    vi.mocked(pmService.run).mockResolvedValueOnce(
      ok({
        invocationId: 'inv-1',
        agentId: 'agent-1',
        text: '',
        toolCalls: [],
        iterations: 1,
        usage: { inputTokens: 1, outputTokens: 1 },
        costUsd: 0,
      }),
    )
    const r = await premortemService.runForSprint({
      sprintId,
      idempotencyKey: 'idem-' + Math.random(),
    })
    expect(r.ok).toBe(true)
    const ac = adminClient()
    const { data: row } = await ac
      .from('sprints')
      .select('premortem_generated_at')
      .eq('id', sprintId)
      .single()
    expect(row?.premortem_generated_at).toBeTruthy()
  })

  it('失敗時は marker をセットしない (cron / 手動再実行が可能)', async () => {
    const sprintId = await makePlanningSprint()
    vi.mocked(pmService.run).mockResolvedValueOnce(
      err(new (await import('@/lib/errors')).ExternalServiceError('Anthropic')),
    )
    const r = await premortemService.runForSprint({
      sprintId,
      idempotencyKey: 'idem-' + Math.random(),
    })
    expect(r.ok).toBe(false)
    const ac = adminClient()
    const { data: row } = await ac
      .from('sprints')
      .select('premortem_generated_at')
      .eq('id', sprintId)
      .single()
    expect(row?.premortem_generated_at).toBeNull()
  })

  it('存在しない sprintId は NotFoundError', async () => {
    const r = await premortemService.runForSprint({
      sprintId: '00000000-0000-0000-0000-000000000000',
      idempotencyKey: 'x',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('NOT_FOUND')
  })

  it('入力 validation', async () => {
    const r1 = await premortemService.runForSprint({ sprintId: '', idempotencyKey: 'x' })
    expect(r1.ok).toBe(false)
    const r2 = await premortemService.runForSprint({
      sprintId: '00000000-0000-0000-0000-000000000000',
      idempotencyKey: '',
    })
    expect(r2.ok).toBe(false)
  })
})
