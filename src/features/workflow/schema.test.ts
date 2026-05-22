/**
 * iter1102 basics: `workflow/schema.ts` の zod schema test を追加。
 *
 * Workflow (n8n 風 DAG) の schema (NodeType / WorkflowNode / Edge / Graph /
 * Trigger discriminatedUnion + Create/Update input)。8 node 種別 + 4 trigger
 * kind (manual/cron/item-event/webhook) + Update の「最低 1 件 patch」 refine
 * を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  CreateWorkflowInputSchema,
  NodeTypeSchema,
  UpdateWorkflowInputSchema,
  WorkflowEdgeSchema,
  WorkflowGraphSchema,
  WorkflowNodeSchema,
  WorkflowTriggerSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('NodeTypeSchema (8 種別)', () => {
  it('8 種類すべてを accept', () => {
    const types = ['noop', 'http', 'ai', 'slack', 'email', 'script', 'branch', 'parallel'] as const
    for (const t of types) {
      expect(NodeTypeSchema.parse(t)).toBe(t)
    }
  })

  it('未知 type を reject', () => {
    expect(() => NodeTypeSchema.parse('webhook')).toThrow()
  })
})

describe('WorkflowNodeSchema', () => {
  it('id + type のみ最小入力、config default は空 record', () => {
    const parsed = WorkflowNodeSchema.parse({ id: 'n1', type: 'noop' })
    expect(parsed.config).toEqual({})
  })

  it('id 空文字 / 64 文字超過で reject', () => {
    expect(() => WorkflowNodeSchema.parse({ id: '', type: 'noop' })).toThrow()
    expect(() => WorkflowNodeSchema.parse({ id: 'x'.repeat(65), type: 'noop' })).toThrow()
  })
})

describe('WorkflowEdgeSchema', () => {
  it('from + to で accept', () => {
    expect(() => WorkflowEdgeSchema.parse({ from: 'n1', to: 'n2' })).not.toThrow()
  })

  it('from / to 空文字で reject', () => {
    expect(() => WorkflowEdgeSchema.parse({ from: '', to: 'n2' })).toThrow()
    expect(() => WorkflowEdgeSchema.parse({ from: 'n1', to: '' })).toThrow()
  })
})

describe('WorkflowGraphSchema', () => {
  it('空グラフ (nodes / edges 省略) で accept', () => {
    const parsed = WorkflowGraphSchema.parse({})
    expect(parsed.nodes).toEqual([])
    expect(parsed.edges).toEqual([])
  })
})

describe('WorkflowTriggerSchema (4 kind discriminatedUnion)', () => {
  it('manual で accept', () => {
    expect(() => WorkflowTriggerSchema.parse({ kind: 'manual' })).not.toThrow()
  })

  it('cron で accept、cron 空文字を reject', () => {
    expect(() => WorkflowTriggerSchema.parse({ kind: 'cron', cron: '0 9 * * *' })).not.toThrow()
    expect(() => WorkflowTriggerSchema.parse({ kind: 'cron', cron: '' })).toThrow()
  })

  it('item-event は event enum + filter default 空 record', () => {
    const parsed = WorkflowTriggerSchema.parse({ kind: 'item-event', event: 'create' })
    expect((parsed as { filter: Record<string, unknown> }).filter).toEqual({})
    // 不正 event は reject
    expect(() =>
      WorkflowTriggerSchema.parse({ kind: 'item-event', event: 'unknown-event' }),
    ).toThrow()
  })

  it('webhook secret min 8 / max 128', () => {
    expect(() => WorkflowTriggerSchema.parse({ kind: 'webhook', secret: '1234567' })).toThrow() // 7 文字 NG
    expect(() => WorkflowTriggerSchema.parse({ kind: 'webhook', secret: '12345678' })).not.toThrow()
    expect(() =>
      WorkflowTriggerSchema.parse({ kind: 'webhook', secret: 'x'.repeat(129) }),
    ).toThrow()
  })

  it('kind 不明だと reject', () => {
    expect(() => WorkflowTriggerSchema.parse({ kind: 'invalid' })).toThrow()
  })
})

describe('CreateWorkflowInputSchema', () => {
  it('name のみ最小入力で accept (graph/trigger は default)', () => {
    const parsed = CreateWorkflowInputSchema.parse({
      workspaceId: VALID_UUID,
      name: 'My Workflow',
    })
    expect(parsed.description).toBe('')
    expect(parsed.graph).toEqual({ nodes: [], edges: [] })
    expect(parsed.trigger).toEqual({ kind: 'manual' })
  })

  it('name 空文字 / 200 文字超過で reject', () => {
    expect(() => CreateWorkflowInputSchema.parse({ workspaceId: VALID_UUID, name: '' })).toThrow()
    expect(() =>
      CreateWorkflowInputSchema.parse({
        workspaceId: VALID_UUID,
        name: 'x'.repeat(201),
      }),
    ).toThrow()
  })
})

describe('UpdateWorkflowInputSchema', () => {
  it('enabled トグルのみ patch で accept', () => {
    expect(() =>
      UpdateWorkflowInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { enabled: true },
      }),
    ).not.toThrow()
  })

  it('patch 空オブジェクトを reject', () => {
    expect(() =>
      UpdateWorkflowInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: {},
      }),
    ).toThrow()
  })
})
