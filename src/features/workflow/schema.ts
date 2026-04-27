/**
 * Phase 6.15 iter112: Workflow zod スキーマ。
 * graph (DAG) / trigger は jsonb なので zod で厳密化する。
 * Engine + node 実装は次 iter なので、ここではノード型を minimal に列挙だけしておく。
 */
import { z } from 'zod'

import { workflowRuns, workflows } from '@/lib/db/schema'

export type Workflow = typeof workflows.$inferSelect
export type WorkflowRun = typeof workflowRuns.$inferSelect

/**
 * 実装予定 node 種別。次 iter で実装するごとに有効化していく。
 * - http: 任意 URL に fetch
 * - ai: Researcher / Engineer / カスタムプロンプトを呼ぶ
 * - slack: workspace の slack webhook へ通知
 * - email: mock outbox へ書く
 * - script: scripts/ 配下を invoke (whitelist)
 * - branch: 条件分岐 (next iter)
 * - parallel: 並列分岐 (next iter)
 */
export const NodeTypeSchema = z.enum([
  'noop',
  'http',
  'ai',
  'slack',
  'email',
  'script',
  'branch',
  'parallel',
])
export type NodeType = z.infer<typeof NodeTypeSchema>

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1).max(64),
  type: NodeTypeSchema,
  /** node 表示用 (UI editor で表示する label) */
  label: z.string().max(100).optional(),
  /** node 種別ごとの設定。各 node の executor が型を絞る (現時点は緩く record) */
  config: z.record(z.string(), z.unknown()).default({}),
})
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>

export const WorkflowEdgeSchema = z.object({
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  /** branch node 用の条件式 (将来) */
  condition: z.string().optional(),
})
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>

export const WorkflowGraphSchema = z.object({
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([]),
})
export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>

export const WorkflowTriggerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('manual') }),
  z.object({
    kind: z.literal('cron'),
    /** 5-field cron (workspace timezone で解釈) */
    cron: z.string().min(1).max(100),
  }),
  z.object({
    kind: z.literal('item-event'),
    event: z.enum(['create', 'update', 'status_change', 'complete']),
    /** filter 例: { isMust: true, status: 'todo' } */
    filter: z.record(z.string(), z.unknown()).default({}),
  }),
  z.object({
    kind: z.literal('webhook'),
    /** secret パス。/api/workflows/webhook/<secret> で受け取る */
    secret: z.string().min(8).max(128),
  }),
])
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>

export const CreateWorkflowInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  graph: WorkflowGraphSchema.default({ nodes: [], edges: [] }),
  trigger: WorkflowTriggerSchema.default({ kind: 'manual' }),
})
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowInputSchema>

export const UpdateWorkflowInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      graph: WorkflowGraphSchema.optional(),
      trigger: WorkflowTriggerSchema.optional(),
      enabled: z.boolean().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: 'patch is empty' }),
})
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowInputSchema>
