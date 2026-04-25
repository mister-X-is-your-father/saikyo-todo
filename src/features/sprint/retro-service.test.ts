/**
 * retroService unit tests:
 *   - buildRetroUserMessage (pure)
 *   - runForSprint: pmService.run を mock して prompt が正しく組まれるか
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
  QUEUE_NAMES: ['pm-recovery'] as const,
}))

vi.mock('@/features/agent/pm-service', () => ({
  pmService: {
    run: vi.fn(),
  },
}))

import { err, ok } from '@/lib/result'

import { pmService } from '@/features/agent/pm-service'

import { buildRetroUserMessage, retroService } from './retro-service'
import { sprintService } from './service'

describe('buildRetroUserMessage (pure)', () => {
  it('全集計と完了率が正しく出る', () => {
    const msg = buildRetroUserMessage({
      sprintName: 'X',
      sprintGoal: '速度改善',
      startDate: '2026-04-20',
      endDate: '2026-04-26',
      itemSummaries: [
        { id: 'a', title: 'A', status: 'done', isMust: true, priority: 1, doneAt: '2026-04-22' },
        { id: 'b', title: 'B', status: 'todo', isMust: false, priority: 3, doneAt: null },
        { id: 'c', title: 'C', status: 'in_progress', isMust: true, priority: 2, doneAt: null },
        { id: 'd', title: 'D', status: 'done', isMust: false, priority: 4, doneAt: '2026-04-25' },
      ],
    })
    expect(msg).toContain('Sprint "X"')
    expect(msg).toContain('2026-04-20 〜 2026-04-26')
    expect(msg).toContain('速度改善')
    expect(msg).toContain('4 件中 2 件完了 (50%)')
    expect(msg).toContain('完了 (2 件)')
    expect(msg).toContain('進行中 (1 件)')
    expect(msg).toContain('未着手 (1 件)')
    expect(msg).toContain('MUST 落ち**: 1') // C が MUST 未完
    expect(msg).toContain('⚠ MUST 落ち')
    expect(msg).toContain('Retro - X (2026-04-26)')
  })

  it('item 0 件でも壊れない (完了率 0%)', () => {
    const msg = buildRetroUserMessage({
      sprintName: 'Empty',
      sprintGoal: null,
      startDate: '2026-04-20',
      endDate: '2026-04-26',
      itemSummaries: [],
    })
    expect(msg).toContain('0 件中 0 件完了 (0%)')
    expect(msg).toContain('完了: なし')
    expect(msg).toContain('未設定')
    expect(msg).not.toContain('⚠ MUST 落ち')
  })

  it('MUST 落ちが 0 件なら警告セクションを出さない', () => {
    const msg = buildRetroUserMessage({
      sprintName: 'OK',
      sprintGoal: null,
      startDate: '2026-04-20',
      endDate: '2026-04-26',
      itemSummaries: [
        { id: 'a', title: 'A', status: 'done', isMust: true, priority: 1, doneAt: '2026-04-22' },
      ],
    })
    expect(msg).not.toContain('⚠ MUST 落ち')
  })
})

describe('retroService.runForSprint', () => {
  let userId: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('retro')
    userId = fx.userId
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(fx.userId, fx.email)
  })
  afterAll(async () => {
    await cleanup()
  })

  it('sprint + items を集めて pmService.run に prompt を渡す', async () => {
    const sp = await sprintService.create({
      workspaceId: wsId,
      name: 'Retro Sprint',
      goal: 'goal X',
      startDate: '2026-04-20',
      endDate: '2026-04-26',
      idempotencyKey: crypto.randomUUID(),
    })
    if (!sp.ok) throw sp.error

    // sprint に紐づく item を 1 件 (status=todo)
    const ac = adminClient()
    const ins = await ac
      .from('items')
      .insert({
        workspace_id: wsId,
        title: 'retro-target',
        description: '',
        status: 'todo',
        sprint_id: sp.value.id,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (ins.error) throw ins.error

    vi.mocked(pmService.run).mockResolvedValue(
      ok({
        invocationId: 'inv-1',
        agentId: 'ag-1',
        text: '振り返り完了',
        toolCalls: [],
        iterations: 1,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheCreationTokens: null,
          cacheReadTokens: null,
        },
        costUsd: 0.001,
      }),
    )

    const r = await retroService.runForSprint({
      sprintId: sp.value.id,
      idempotencyKey: crypto.randomUUID(),
    })
    expect(r.ok).toBe(true)

    expect(pmService.run).toHaveBeenCalledTimes(1)
    const callArg = vi.mocked(pmService.run).mock.calls[0]![0]
    expect(callArg.workspaceId).toBe(wsId)
    expect(callArg.userMessage).toContain('Retro Sprint')
    expect(callArg.userMessage).toContain('goal X')
    expect(callArg.userMessage).toContain('1 件中 0 件完了')
    expect(callArg.userMessage).toContain('retro-target')
  })

  it('存在しない sprintId は NotFoundError', async () => {
    const r = await retroService.runForSprint({
      sprintId: '00000000-0000-0000-0000-000000000000',
      idempotencyKey: crypto.randomUUID(),
    })
    expect(r.ok).toBe(false)
  })

  it('sprintId / idempotencyKey 必須', async () => {
    const r1 = await retroService.runForSprint({ sprintId: '', idempotencyKey: 'x' })
    expect(r1.ok).toBe(false)
    const r2 = await retroService.runForSprint({
      sprintId: '00000000-0000-0000-0000-000000000000',
      idempotencyKey: '',
    })
    expect(r2.ok).toBe(false)
  })

  it('成功時に sprints.retro_generated_at がセットされる (weekly cron 重複防止)', async () => {
    const sp = await sprintService.create({
      workspaceId: wsId,
      name: 'Marker Sprint',
      startDate: '2026-04-20',
      endDate: '2026-04-26',
      idempotencyKey: crypto.randomUUID(),
    })
    if (!sp.ok) throw sp.error

    vi.mocked(pmService.run).mockResolvedValue(
      ok({
        invocationId: 'inv-2',
        agentId: 'ag-2',
        text: 'ok',
        toolCalls: [],
        iterations: 1,
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          cacheCreationTokens: null,
          cacheReadTokens: null,
        },
        costUsd: 0,
      }),
    )

    const r = await retroService.runForSprint({
      sprintId: sp.value.id,
      idempotencyKey: crypto.randomUUID(),
    })
    expect(r.ok).toBe(true)

    const ac = adminClient()
    const { data } = await ac
      .from('sprints')
      .select('retro_generated_at')
      .eq('id', sp.value.id)
      .single()
    expect(data?.retro_generated_at).toBeTruthy()
  })

  it('失敗時は retro_generated_at をセットしない (cron 再試行可能に)', async () => {
    const sp = await sprintService.create({
      workspaceId: wsId,
      name: 'Failed Retro Sprint',
      startDate: '2026-04-20',
      endDate: '2026-04-26',
      idempotencyKey: crypto.randomUUID(),
    })
    if (!sp.ok) throw sp.error

    vi.mocked(pmService.run).mockResolvedValue(
      err(new (await import('@/lib/errors')).ExternalServiceError('Anthropic down')),
    )
    const r = await retroService.runForSprint({
      sprintId: sp.value.id,
      idempotencyKey: crypto.randomUUID(),
    })
    expect(r.ok).toBe(false)

    const ac = adminClient()
    const { data } = await ac
      .from('sprints')
      .select('retro_generated_at')
      .eq('id', sp.value.id)
      .single()
    expect(data?.retro_generated_at).toBeNull()
  })
})

describe('handleSprintRetroTick (weekly cron)', () => {
  let userId: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('retro-tick')
    userId = fx.userId
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(fx.userId, fx.email)
  })
  afterAll(async () => {
    await cleanup()
  })

  it('completed + retro 未生成 + lookback 内 の sprint だけ enqueue する', async () => {
    const ac = adminClient()
    // 1. completed + retro 未生成 (lookback 内) → 拾われる
    const sA = await ac
      .from('sprints')
      .insert({
        workspace_id: wsId,
        name: 'A: completed pending',
        start_date: '2026-04-19',
        end_date: '2026-04-25',
        status: 'completed',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (sA.error) throw sA.error
    // 2. completed + retro 生成済 → skip
    const sB = await ac
      .from('sprints')
      .insert({
        workspace_id: wsId,
        name: 'B: completed done',
        start_date: '2026-04-12',
        end_date: '2026-04-18',
        status: 'completed',
        retro_generated_at: new Date().toISOString(),
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (sB.error) throw sB.error
    // 3. planning → skip
    const sC = await ac
      .from('sprints')
      .insert({
        workspace_id: wsId,
        name: 'C: planning',
        start_date: '2026-04-26',
        end_date: '2026-05-02',
        status: 'planning',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (sC.error) throw sC.error
    // 4. completed + retro 未生成 だが lookback (30日) より古い → skip
    const sD = await ac
      .from('sprints')
      .insert({
        workspace_id: wsId,
        name: 'D: too old',
        start_date: '2026-01-01',
        end_date: '2026-01-15',
        status: 'completed',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (sD.error) throw sD.error

    const { handleSprintRetroTick } = await import('./retro-worker')
    const { enqueueJob } = await import('@/lib/jobs/queue')
    vi.mocked(enqueueJob).mockClear()

    await handleSprintRetroTick({ now: new Date('2026-04-26T00:00:00Z'), lookbackDays: 30 })

    const calls = vi.mocked(enqueueJob).mock.calls
    const pickedIds = calls
      .filter(([name]) => name === 'sprint-retro')
      .map(([, data]) => (data as { sprintId: string }).sprintId)
    expect(pickedIds).toContain(sA.data!.id)
    expect(pickedIds).not.toContain(sB.data!.id)
    expect(pickedIds).not.toContain(sC.data!.id)
    expect(pickedIds).not.toContain(sD.data!.id)
  })
})
