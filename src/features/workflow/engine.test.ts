/**
 * Phase 6.15 iter113: Workflow engine (DAG topological 実行) test。
 * 実 Supabase + RLS — service.create で workflow を仕込んで engine で実行する。
 */
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { workflowNodeRuns, workflowRuns } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { runWorkflow } from './engine'
import { workflowService } from './service'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard')

describe('runWorkflow', () => {
  let wsId: string
  let userId: string
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const fx = await createTestUserAndWorkspace('wf-engine')
    wsId = fx.wsId
    userId = fx.userId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, fx.email)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanup()
  })

  it('happy path: 3 node linear noop chain → succeeded', async () => {
    const c = await workflowService.create({
      workspaceId: wsId,
      name: 'linear',
      graph: {
        nodes: [
          { id: 'n1', type: 'noop', config: {} },
          { id: 'n2', type: 'noop', config: {} },
          { id: 'n3', type: 'noop', config: {} },
        ],
        edges: [
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'n3' },
        ],
      },
    })
    if (!c.ok) throw c.error

    const r = await runWorkflow({
      workflowId: c.value.id,
      triggerKind: 'manual',
      input: { hello: 'world' },
    })
    expect(r.status).toBe('succeeded')
    // node_runs が 3 件 succeeded
    const nodeRuns = await adminDb
      .select()
      .from(workflowNodeRuns)
      .where(eq(workflowNodeRuns.workflowRunId, r.runId))
    expect(nodeRuns.length).toBe(3)
    expect(nodeRuns.every((nr) => nr.status === 'succeeded')).toBe(true)

    // workflow_runs が succeeded
    const runs = await adminDb.select().from(workflowRuns).where(eq(workflowRuns.id, r.runId))
    expect(runs[0]?.status).toBe('succeeded')
  })

  it('cycle 検出: 失敗 (run.status=failed)', async () => {
    const c = await workflowService.create({
      workspaceId: wsId,
      name: 'cycle',
      graph: {
        nodes: [
          { id: 'a', type: 'noop', config: {} },
          { id: 'b', type: 'noop', config: {} },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' }, // cycle
        ],
      },
    })
    if (!c.ok) throw c.error
    const r = await runWorkflow({ workflowId: c.value.id, triggerKind: 'manual' })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/cycle/)
  })

  it('未実装 node type: その node が failed、後続は skipped', async () => {
    const c = await workflowService.create({
      workspaceId: wsId,
      name: 'unimpl',
      graph: {
        nodes: [
          { id: 'n1', type: 'noop', config: {} },
          { id: 'n2', type: 'ai', config: {} }, // ai は未実装
          { id: 'n3', type: 'noop', config: {} },
        ],
        edges: [
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'n3' },
        ],
      },
    })
    if (!c.ok) throw c.error
    const r = await runWorkflow({ workflowId: c.value.id, triggerKind: 'manual' })
    expect(r.status).toBe('failed')
    const nodeRuns = await adminDb
      .select()
      .from(workflowNodeRuns)
      .where(eq(workflowNodeRuns.workflowRunId, r.runId))
    const byNode = new Map(nodeRuns.map((nr) => [nr.nodeId, nr.status]))
    expect(byNode.get('n1')).toBe('succeeded')
    expect(byNode.get('n2')).toBe('failed')
    expect(byNode.get('n3')).toBe('skipped')
  })

  it('disabled workflow は実行不可', async () => {
    const c = await workflowService.create({
      workspaceId: wsId,
      name: 'off',
      graph: { nodes: [{ id: 'n1', type: 'noop', config: {} }], edges: [] },
    })
    if (!c.ok) throw c.error
    await workflowService.update({
      id: c.value.id,
      expectedVersion: c.value.version,
      patch: { enabled: false },
    })
    await expect(runWorkflow({ workflowId: c.value.id, triggerKind: 'manual' })).rejects.toThrow(
      /disabled/,
    )
  })

  // Phase 6.15 iter114: slack / email node
  it('email node: mock outbox に書き込まれる', async () => {
    const c = await workflowService.create({
      workspaceId: wsId,
      name: 'email-wf',
      graph: {
        nodes: [
          {
            id: 'send',
            type: 'email',
            config: {
              toEmail: 'iter114@example.com',
              subject: 'workflow test',
              text: 'body text',
            },
          },
        ],
        edges: [],
      },
    })
    if (!c.ok) throw c.error
    const r = await runWorkflow({ workflowId: c.value.id, triggerKind: 'manual' })
    expect(r.status).toBe('succeeded')
    const out = r.output as Record<string, { id: string; toEmail: string }>
    expect(out.send?.toEmail).toBe('iter114@example.com')
    expect(out.send?.id).toMatch(/[0-9a-f-]{36}/i)
  })

  it('slack node: webhook 未設定なら mock 配信 (delivered=false)', async () => {
    const c = await workflowService.create({
      workspaceId: wsId,
      name: 'slack-wf',
      graph: {
        nodes: [{ id: 'notify', type: 'slack', config: { text: 'workflow ping' } }],
        edges: [],
      },
    })
    if (!c.ok) throw c.error
    const r = await runWorkflow({ workflowId: c.value.id, triggerKind: 'manual' })
    expect(r.status).toBe('succeeded')
    const out = r.output as Record<string, { delivered: boolean }>
    expect(out.notify?.delivered).toBe(false)
  })

  it('ai node: prompt 未指定で fail (Claude CLI 起動前にバリデーション)', async () => {
    const c = await workflowService.create({
      workspaceId: wsId,
      name: 'ai-bad',
      graph: {
        nodes: [{ id: 'a', type: 'ai', config: {} }],
        edges: [],
      },
    })
    if (!c.ok) throw c.error
    const r = await runWorkflow({ workflowId: c.value.id, triggerKind: 'manual' })
    expect(r.status).toBe('failed')
  })

  it('email node: toEmail 未指定で fail', async () => {
    const c = await workflowService.create({
      workspaceId: wsId,
      name: 'email-bad',
      graph: {
        nodes: [{ id: 'e', type: 'email', config: { subject: 'no to' } }],
        edges: [],
      },
    })
    if (!c.ok) throw c.error
    const r = await runWorkflow({ workflowId: c.value.id, triggerKind: 'manual' })
    expect(r.status).toBe('failed')
  })
})
