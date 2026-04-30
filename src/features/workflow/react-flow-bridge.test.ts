import { describe, expect, it } from 'vitest'

import { flowToWorkflowGraph, workflowGraphToFlow } from './react-flow-bridge'
import type { WorkflowGraph } from './schema'

const empty: WorkflowGraph = { nodes: [], edges: [] }

const linear: WorkflowGraph = {
  nodes: [
    { id: 'n1', type: 'noop', label: 'start', config: {} },
    { id: 'n2', type: 'http', label: 'fetch', config: { url: 'https://x' } },
    { id: 'n3', type: 'slack', config: {} },
  ],
  edges: [
    { from: 'n1', to: 'n2' },
    { from: 'n2', to: 'n3' },
  ],
}

const diamond: WorkflowGraph = {
  nodes: [
    { id: 'a', type: 'noop', config: {} },
    { id: 'b', type: 'branch', config: {} },
    { id: 'c', type: 'http', config: {} },
    { id: 'd', type: 'noop', config: {} },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'a', to: 'c' },
    { from: 'b', to: 'd' },
    { from: 'c', to: 'd' },
  ],
}

describe('workflowGraphToFlow', () => {
  it('空 graph は空 nodes/edges', () => {
    const r = workflowGraphToFlow(empty)
    expect(r.nodes).toEqual([])
    expect(r.edges).toEqual([])
  })

  it('linear graph: 各 node に position が割当てられ、edges が source/target で出る', () => {
    const r = workflowGraphToFlow(linear)
    expect(r.nodes).toHaveLength(3)
    expect(r.edges).toHaveLength(2)
    for (const n of r.nodes) {
      expect(n.position.x).toBeGreaterThanOrEqual(0)
      expect(n.position.y).toBeGreaterThanOrEqual(0)
    }
    expect(r.edges[0]?.source).toBe('n1')
    expect(r.edges[0]?.target).toBe('n2')
  })

  it('linear graph: depth が増える順に y 座標が大きくなる', () => {
    const r = workflowGraphToFlow(linear)
    const yById = new Map(r.nodes.map((n) => [n.id, n.position.y]))
    expect(yById.get('n1')).toBeLessThan(yById.get('n2')!)
    expect(yById.get('n2')).toBeLessThan(yById.get('n3')!)
  })

  it('diamond graph: 同 depth (b/c) は同じ y、d は最深', () => {
    const r = workflowGraphToFlow(diamond)
    const y = (id: string) => r.nodes.find((n) => n.id === id)!.position.y
    expect(y('a')).toBeLessThan(y('b'))
    expect(y('b')).toBe(y('c'))
    expect(y('d')).toBeGreaterThan(y('b'))
    expect(r.edges).toHaveLength(4)
  })

  it('node data に label / nodeType / config が引き継がれる', () => {
    const r = workflowGraphToFlow(linear)
    const n2 = r.nodes.find((n) => n.id === 'n2')!
    expect(n2.data.label).toBe('fetch')
    expect(n2.data.nodeType).toBe('http')
    expect(n2.data.config).toEqual({ url: 'https://x' })
  })

  it('node の label が無ければ id を fallback として data.label に入れる', () => {
    const r = workflowGraphToFlow(linear)
    const n3 = r.nodes.find((n) => n.id === 'n3')!
    expect(n3.data.label).toBe('n3')
  })

  it('edge.condition は label として React Flow に渡る', () => {
    const g: WorkflowGraph = {
      nodes: [
        { id: 'a', type: 'noop', config: {} },
        { id: 'b', type: 'noop', config: {} },
      ],
      edges: [{ from: 'a', to: 'b', condition: 'value > 0' }],
    }
    const r = workflowGraphToFlow(g)
    expect(r.edges[0]?.label).toBe('value > 0')
  })

  it('edge id は from→to-idx で衝突しない', () => {
    const g: WorkflowGraph = {
      nodes: [
        { id: 'a', type: 'noop', config: {} },
        { id: 'b', type: 'noop', config: {} },
      ],
      // 同 from/to の edge を 2 本 (parallel)
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
      ],
    }
    const r = workflowGraphToFlow(g)
    const ids = r.edges.map((e) => e.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('cycle (a→b→a) でも crash せず全 node に座標', () => {
    const g: WorkflowGraph = {
      nodes: [
        { id: 'a', type: 'noop', config: {} },
        { id: 'b', type: 'noop', config: {} },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ],
    }
    const r = workflowGraphToFlow(g)
    expect(r.nodes).toHaveLength(2)
    for (const n of r.nodes) expect(n.position).toBeDefined()
  })
})

describe('flowToWorkflowGraph (逆変換)', () => {
  it('round-trip で nodes / edges が戻る', () => {
    const flow = workflowGraphToFlow(linear)
    const back = flowToWorkflowGraph(flow.nodes, flow.edges)
    expect(back.nodes.map((n) => n.id).sort()).toEqual(['n1', 'n2', 'n3'])
    expect(back.nodes.find((n) => n.id === 'n2')?.type).toBe('http')
    expect(back.nodes.find((n) => n.id === 'n2')?.config).toEqual({ url: 'https://x' })
    expect(back.edges).toHaveLength(2)
  })

  it('edge.label が string なら condition に復元される', () => {
    const flow = workflowGraphToFlow({
      nodes: [
        { id: 'a', type: 'noop', config: {} },
        { id: 'b', type: 'noop', config: {} },
      ],
      edges: [{ from: 'a', to: 'b', condition: 'x > 0' }],
    })
    const back = flowToWorkflowGraph(flow.nodes, flow.edges)
    expect(back.edges[0]?.condition).toBe('x > 0')
  })
})
