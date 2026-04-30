/**
 * iter (queue: workflow graphical 段階 A): WorkflowGraph (zod) ↔ React Flow nodes/edges 変換。
 *
 * pure 関数で副作用なし。React Flow は UI 実装の都合で `position: {x, y}` / `data: {...}` を
 * 必須とするが、本 project の `WorkflowGraph` schema は座標を持たない (engine は topological
 * sort で実行順を決めるので位置情報は描画専用)。よって変換時に **dagre 風 auto-layout** で
 * 仮置き座標を当てる (シンプルな縦並び + node type 別 column 分け)。
 *
 * 段階 A scope: read-only viewer 用 → 保存時の往復は次 iter (段階 B)。
 *
 * 詳細: FEEDBACK_QUEUE.md 「Workflow 機能を graphical 化」 段階 A、HANDOFF iter118 で予告した
 * React Flow editor の今回着手分。
 */
import type { Edge as RfEdge, Node as RfNode } from '@xyflow/react'

import type { NodeType, WorkflowEdge, WorkflowGraph, WorkflowNode } from './schema'

/** React Flow Node の data 部分 (我々の domain 情報) */
export interface FlowNodeData extends Record<string, unknown> {
  label: string
  nodeType: NodeType
  /** 元 config の浅い view (UI で sidebar 表示する場合に消費) */
  config: Record<string, unknown>
}

/** node type ごとの column index (横並び layout 用、左 → 右) */
const COL_BY_TYPE: Record<NodeType, number> = {
  noop: 0,
  branch: 1,
  parallel: 1,
  ai: 2,
  http: 3,
  slack: 4,
  email: 5,
  script: 6,
}

const ROW_HEIGHT = 80
const COL_WIDTH = 200

/**
 * id ベースの簡易自動 layout: `from → to` の depth (= 入次数 chain 長) で y を決める。
 * 同 depth の同 type は x 軸でずらす。完全に optimum でなくても良い (read-only 表示が目的)。
 */
function computeLayout(graph: WorkflowGraph): Map<string, { x: number; y: number }> {
  const inDegree = new Map<string, number>()
  for (const n of graph.nodes) inDegree.set(n.id, 0)
  for (const e of graph.edges) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1)
  }
  const adj = new Map<string, string[]>()
  for (const n of graph.nodes) adj.set(n.id, [])
  for (const e of graph.edges) adj.get(e.from)?.push(e.to)

  // Kahn topological with rank (depth)
  const depth = new Map<string, number>()
  const queue: string[] = []
  for (const [id, d] of inDegree) {
    if (d === 0) {
      depth.set(id, 0)
      queue.push(id)
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift()!
    const curDepth = depth.get(cur) ?? 0
    for (const next of adj.get(cur) ?? []) {
      const prevDepth = depth.get(next) ?? -1
      const nextDepth = Math.max(prevDepth, curDepth + 1)
      depth.set(next, nextDepth)
      // 入次数を 1 減らして 0 になったら enqueue
      const d = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  // cycle 等で depth 未割当の node は depth=0 fallback
  for (const n of graph.nodes) {
    if (!depth.has(n.id)) depth.set(n.id, 0)
  }

  // depth ごとに lane 内で順序付け (id 順 stable)
  const byDepth = new Map<number, WorkflowNode[]>()
  for (const n of graph.nodes) {
    const d = depth.get(n.id) ?? 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(n)
  }
  for (const arr of byDepth.values()) arr.sort((a, b) => a.id.localeCompare(b.id))

  const positions = new Map<string, { x: number; y: number }>()
  for (const [d, arr] of byDepth) {
    arr.forEach((n, i) => {
      // x: type の column を base に、同 depth で重なるなら type column + i オフセット
      const baseCol = COL_BY_TYPE[n.type] ?? 0
      positions.set(n.id, {
        x: (baseCol + i * 0.5) * COL_WIDTH,
        y: d * ROW_HEIGHT,
      })
    })
  }
  return positions
}

/**
 * WorkflowGraph (domain) → React Flow `{ nodes, edges }` への変換。
 * 座標は auto-layout で仮置き (depth × type column)。
 */
export function workflowGraphToFlow(graph: WorkflowGraph): {
  nodes: RfNode<FlowNodeData>[]
  edges: RfEdge[]
} {
  const positions = computeLayout(graph)
  const nodes: RfNode<FlowNodeData>[] = graph.nodes.map((n) => ({
    id: n.id,
    type: 'default',
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      label: n.label ?? n.id,
      nodeType: n.type,
      config: n.config,
    },
  }))
  const edges: RfEdge[] = graph.edges.map((e, idx) => ({
    id: `${e.from}->${e.to}-${idx}`,
    source: e.from,
    target: e.to,
    label: e.condition,
    animated: false,
  }))
  return { nodes, edges }
}

/**
 * React Flow `{ nodes, edges }` → WorkflowGraph (domain) への逆変換。
 * 段階 B (edit mode) で消費される予定 — 段階 A は read-only なので呼出元はまだ無い。
 * config / label / type は data から復元、edge の condition は label string を採用。
 */
export function flowToWorkflowGraph(nodes: RfNode<FlowNodeData>[], edges: RfEdge[]): WorkflowGraph {
  const wfNodes: WorkflowNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.data.nodeType,
    label: n.data.label,
    config: n.data.config,
  }))
  const wfEdges: WorkflowEdge[] = edges.map((e) => ({
    from: e.source,
    to: e.target,
    condition: typeof e.label === 'string' ? e.label : undefined,
  }))
  return { nodes: wfNodes, edges: wfEdges }
}
