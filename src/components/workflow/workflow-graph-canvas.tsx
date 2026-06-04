'use client'

/**
 * iter (queue: workflow graphical 段階 A): WorkflowGraph を read-only で React Flow 描画。
 *
 * 段階 A: 視覚プレビューのみ (drag/edit 不可)。次 iter で edit 化、その次で live execution
 * highlight。詳細: FEEDBACK_QUEUE.md 「Workflow 機能を graphical 化」 段階 A。
 *
 * 設計判断:
 *   - WorkflowGraph (zod) を `workflowGraphToFlow` (pure 関数、11 unit test) で React Flow
 *     形式に変換、描画
 *   - 座標は dagre 風 auto-layout (depth × type column)、graph schema は座標を持たない
 *   - shadcn / project の Tailwind と CSS 衝突しないよう本 component 内で React Flow CSS を
 *     1 度だけ import (global にしない)
 *   - height は呼出側で `h-[N]` 指定 (dialog で 320px、独立 view で 600px 等の使い分け)
 *   - `proOptions={{ hideAttribution: true }}` で xyflow attribution を抑制 (MIT、有料 plan
 *     不要、視覚 noise 削除のため。背景情報: https://reactflow.dev/learn/troubleshooting/remove-attribution)
 */
import { useMemo } from 'react'

import { Background, Controls, MiniMap, ReactFlow, type ReactFlowProps } from '@xyflow/react'

import { type FlowNodeData, workflowGraphToFlow } from '@/features/workflow/react-flow-bridge'
import type { NodeType, WorkflowGraph } from '@/features/workflow/schema'

import '@xyflow/react/dist/style.css'

interface Props {
  graph: WorkflowGraph
  /** Tailwind h-[XX] / aspect 等を呼出側で指定 (default = h-64) */
  className?: string
  /** test 識別 */
  testId?: string
}

/** node type 別配色 (背景 + border)。Tailwind palette を inline style で React Flow に渡す */
const NODE_TYPE_STYLE: Record<NodeType, { background: string; border: string; color: string }> = {
  noop: { background: '#f1f5f9', border: '#94a3b8', color: '#334155' }, // slate
  http: { background: '#dbeafe', border: '#3b82f6', color: '#1e3a8a' }, // blue
  ai: { background: '#ede9fe', border: '#8b5cf6', color: '#4c1d95' }, // purple
  slack: { background: '#fef3c7', border: '#f59e0b', color: '#78350f' }, // amber
  email: { background: '#fce7f3', border: '#ec4899', color: '#831843' }, // pink
  script: { background: '#dcfce7', border: '#22c55e', color: '#14532d' }, // green
  branch: { background: '#fef3c7', border: '#eab308', color: '#713f12' }, // yellow
  parallel: { background: '#cffafe', border: '#06b6d4', color: '#164e63' }, // cyan
}

export function WorkflowGraphCanvas({ graph, className, testId }: Props) {
  const { nodes, edges } = useMemo(() => {
    const flow = workflowGraphToFlow(graph)
    // node type 別 color を data-driven で適用
    const styledNodes = flow.nodes.map((n) => {
      const style = NODE_TYPE_STYLE[n.data.nodeType] ?? NODE_TYPE_STYLE.noop
      return {
        ...n,
        style: {
          background: style.background,
          border: `1.5px solid ${style.border}`,
          color: style.color,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          padding: 8,
          minWidth: 120,
        },
        // 表示 label は "<type>: <label>" 形式
        data: {
          ...n.data,
          label: `${n.data.nodeType}: ${(n.data as FlowNodeData).label}`,
        },
      }
    })
    return { nodes: styledNodes, edges: flow.edges }
  }, [graph])

  // SR 用に node type 別件数を 1 行 summary 化 (例: "noop 2, http 1, slack 1")
  // — React Flow は SVG canvas で内部 node を AT に expose しないため、container
  //   の aria-label に集約情報を載せて補完する。
  const nodeTypeSummary = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const n of graph.nodes) counts[n.type] = (counts[n.type] ?? 0) + 1
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, count]) => `${type} ${count}`)
      .join(', ')
  }, [graph.nodes])

  // 空 graph は EmptyState 相当 (ReactFlow は描画するが viewport が空になる)
  if (graph.nodes.length === 0) {
    // iter1316: 旧 aria-label "Workflow graph は空です" は visible "node が無いため graph は
    // 表示できません。下の JSON で node を追加してください。" と完全 divergence (SR は短い
    // aria-label のみ読み visible 詳細メッセージが伝わらない、role="status" + aria-live="polite"
    // 自動 announce 経路でも短文しか聞こえず)。aria-label を撤回し inner text を accessible name
    // とすることで SR と visible が同じ「empty state + 次 action」を共有。
    return (
      <div
        className={`bg-muted/30 text-foreground/80 flex items-center justify-center rounded border border-dashed p-6 text-xs ${className ?? 'h-64'}`}
        data-testid={testId}
        role="status"
      >
        node が無いため graph は表示できません。下の JSON で node を追加してください。
      </div>
    )
  }

  // ReactFlow は generic <Node, Edge> を持つが、`type=default` で本 component は
  // built-in renderer を使う。drag/connect は段階 A では disable。
  const props: ReactFlowProps = {
    nodes,
    edges,
    nodesDraggable: false,
    nodesConnectable: false,
    elementsSelectable: true,
    fitView: true,
    fitViewOptions: { padding: 0.15 },
    proOptions: { hideAttribution: true },
  }

  return (
    <div
      className={`overflow-hidden rounded border ${className ?? 'h-64'}`}
      data-testid={testId}
      role="img"
      /* iter1598: 旧 aria-label paren+colon convention `"Workflow graph: X nodes (Y), Z edges"` は
         iter1093-1597 sweep の em-dash 区切と divergent。区切のみ ':' / '(' → ' — ' に統一、
         closing ')' は削除。 */
      aria-label={`Workflow graph — ${graph.nodes.length} nodes — ${nodeTypeSummary}、${graph.edges.length} edges`}
      /* iter1929: graph canvas は visual で node/edge は見えるが count summary は
         visible に無く、sighted hover で integrated summary disclose
         (iter1925 cycle Lead time grid / iter1921 sprint-retro grid と同 chart 透明性 pattern)。 */
      title={`Workflow graph — ${graph.nodes.length} nodes — ${nodeTypeSummary}、${graph.edges.length} edges`}
    >
      <ReactFlow {...props}>
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
        {graph.nodes.length > 5 ? <MiniMap pannable zoomable /> : null}
      </ReactFlow>
    </div>
  )
}
