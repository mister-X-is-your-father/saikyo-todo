/**
 * Phase 6.15 iter112: Workflow zod スキーマ。
 * graph (DAG) / trigger は jsonb なので zod で厳密化する。
 * Engine + node 実装は次 iter なので、ここではノード型を minimal に列挙だけしておく。
 */
import { z } from 'zod'

import { workflowNodeRuns, workflowRuns, workflows } from '@/lib/db/schema'

export type Workflow = typeof workflows.$inferSelect
export type WorkflowRun = typeof workflowRuns.$inferSelect
export type WorkflowNodeRun = typeof workflowNodeRuns.$inferSelect

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

// iter1141: WorkflowNode/Edge id/label / cron / webhook secret の max/min に ja message 付与
// (iter1086/1092/1126-1140 sweep)。これらは JSON editor 経由で user に直接 error が出るため
// 日本語化が必要 (旧 zod default 英語が露出していた)。
export const WorkflowNodeSchema = z.object({
  id: z
    .string()
    .min(1, 'node id を入力してください')
    .max(64, 'node id は 64 文字以内で入力してください'),
  type: NodeTypeSchema,
  /** node 表示用 (UI editor で表示する label) */
  label: z.string().max(100, 'node label は 100 文字以内で入力してください').optional(),
  /** node 種別ごとの設定。各 node の executor が型を絞る (現時点は緩く record) */
  config: z.record(z.string(), z.unknown()).default({}),
})
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>

export const WorkflowEdgeSchema = z.object({
  from: z
    .string()
    .min(1, 'edge from を入力してください')
    .max(64, 'edge from は 64 文字以内で入力してください'),
  to: z
    .string()
    .min(1, 'edge to を入力してください')
    .max(64, 'edge to は 64 文字以内で入力してください'),
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
    cron: z
      .string()
      .min(1, 'cron 式を入力してください')
      .max(100, 'cron 式は 100 文字以内で入力してください'),
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
    secret: z
      .string()
      .min(8, 'webhook secret は 8 文字以上で入力してください')
      .max(128, 'webhook secret は 128 文字以内で入力してください'),
  }),
])
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>

// iter1131: name.max(200) / description.max(2000) / "patch is empty" には ja message が無く
// zod default 英語が露出。iter1086/1092/1126-1130 ja convention で全 message 日本語化。
export const CreateWorkflowInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Workflow 名を入力してください')
    .max(200, 'Workflow 名は 200 文字以内で入力してください'),
  description: z.string().max(2000, '説明は 2000 文字以内で入力してください').default(''),
  graph: WorkflowGraphSchema.default({ nodes: [], edges: [] }),
  trigger: WorkflowTriggerSchema.default({ kind: 'manual' }),
})
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowInputSchema>

export const UpdateWorkflowInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      name: z
        .string()
        .min(1, 'Workflow 名を入力してください')
        .max(200, 'Workflow 名は 200 文字以内で入力してください')
        .optional(),
      description: z.string().max(2000, '説明は 2000 文字以内で入力してください').optional(),
      graph: WorkflowGraphSchema.optional(),
      trigger: WorkflowTriggerSchema.optional(),
      enabled: z.boolean().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新する項目がありません' }),
})
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowInputSchema>
