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

import { buildPremortemUserMessage, premortemService } from './premortem-service'

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
