/**
 * Phase 6.15 iter113: Workflow 実行 engine (DAG topological 順)。
 *
 * 仕様:
 *   1. workflow.graph.nodes / edges から DAG を組む
 *   2. topological sort で順番を決める
 *   3. 各 node を順番に実行 (上流 outputs を merge して input にする)
 *   4. 失敗したら以降の依存 node は skipped、workflow_run.status = 'failed'
 *   5. 全部成功なら 'succeeded'
 *
 * 制限 (今後拡張):
 *   - 並列実行は無し (sequential のみ) — branch / parallel node は未実装
 *   - cycle 検出時は ValidationError で run failed
 *   - timeout 各 node 10s (registry 側で適用)
 *   - リトライなし
 */
import 'server-only'

import { and, eq } from 'drizzle-orm'

import { workflowNodeRuns, workflowRuns, workflows } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { getNodeExecutor } from './nodes/registry'
import { WorkflowGraphSchema } from './schema'

export interface RunWorkflowResult {
  runId: string
  status: 'succeeded' | 'failed'
  output: unknown
  error?: string
}

/**
 * Workflow を実行する。manual / cron / item-event 等の trigger から呼ばれる。
 * `actorUserId` を渡せば admin より柔らかい権限経路にもできるが、現状は adminDb 直 (worker 想定)。
 *
 * 副作用:
 *   - workflow_runs row を作成 → status を遷移させる
 *   - workflow_node_runs に各 node の I/O / status を保存
 */
export async function runWorkflow(args: {
  workflowId: string
  triggerKind: 'manual' | 'cron' | 'item-event' | 'webhook'
  input?: unknown
}): Promise<RunWorkflowResult> {
  const { workflowId, triggerKind } = args
  const input = args.input ?? null

  const wf = await adminDb.transaction(async (tx) => {
    const rows = await tx.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1)
    return rows[0] ?? null
  })
  if (!wf) throw new Error(`workflow ${workflowId} が見つかりません`)
  if (wf.deletedAt) throw new Error(`workflow ${workflowId} は削除済`)
  if (!wf.enabled) throw new Error(`workflow ${workflowId} は disabled`)

  const graphParsed = WorkflowGraphSchema.safeParse(wf.graph)
  if (!graphParsed.success) {
    throw new Error(`workflow.graph が不正: ${graphParsed.error.message}`)
  }
  const graph = graphParsed.data

  // workflow_runs 行作成
  const [runRow] = await adminDb
    .insert(workflowRuns)
    .values({
      workspaceId: wf.workspaceId,
      workflowId: wf.id,
      status: 'running',
      triggerKind,
      input,
      startedAt: new Date(),
    })
    .returning()
  if (!runRow) throw new Error('workflow_runs insert failed')
  const runId = runRow.id

  // topological sort + cycle detection (Kahn)
  const inDeg = new Map<string, number>()
  const outAdj = new Map<string, string[]>()
  for (const n of graph.nodes) inDeg.set(n.id, 0)
  for (const e of graph.edges) {
    if (!inDeg.has(e.to) || !inDeg.has(e.from)) continue
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1)
    const list = outAdj.get(e.from) ?? []
    list.push(e.to)
    outAdj.set(e.from, list)
  }
  const queue: string[] = []
  for (const [k, v] of inDeg) if (v === 0) queue.push(k)
  const order: string[] = []
  const localIn = new Map(inDeg)
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const next of outAdj.get(id) ?? []) {
      const n = (localIn.get(next) ?? 0) - 1
      localIn.set(next, n)
      if (n === 0) queue.push(next)
    }
  }
  if (order.length !== graph.nodes.length) {
    await failRun(runId, 'graph に cycle がある')
    return { runId, status: 'failed', output: null, error: 'graph cycle detected' }
  }

  // 上流の outputs を merge して各 node の input にする (predecessor の outputs を Object.assign)
  const nodeOutputs = new Map<string, unknown>()
  const nodeStatus = new Map<string, 'succeeded' | 'failed' | 'skipped'>()
  const predecessors = new Map<string, string[]>()
  for (const e of graph.edges) {
    const list = predecessors.get(e.to) ?? []
    list.push(e.from)
    predecessors.set(e.to, list)
  }

  for (const nodeId of order) {
    const node = graph.nodes.find((n) => n.id === nodeId)!
    // 上流のいずれかが failed/skipped なら skip
    const preds = predecessors.get(nodeId) ?? []
    if (preds.some((p) => nodeStatus.get(p) !== 'succeeded')) {
      await adminDb.insert(workflowNodeRuns).values({
        workflowRunId: runId,
        nodeId,
        nodeType: node.type,
        status: 'skipped',
        log: '上流 node が成功していないため skip',
      })
      nodeStatus.set(nodeId, 'skipped')
      continue
    }

    // input 構築: 上流 outputs を merge (object なら spread、それ以外は最後を採用)
    const merged: Record<string, unknown> = {}
    let nonObjectInput: unknown = preds.length === 0 ? input : null
    for (const p of preds) {
      const o = nodeOutputs.get(p)
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        Object.assign(merged, o as Record<string, unknown>)
      } else if (o !== undefined) {
        nonObjectInput = o
      }
    }
    const nodeInput =
      preds.length === 0 ? input : Object.keys(merged).length > 0 ? merged : nonObjectInput

    const [nodeRow] = await adminDb
      .insert(workflowNodeRuns)
      .values({
        workflowRunId: runId,
        nodeId,
        nodeType: node.type,
        status: 'running',
        input: nodeInput as never,
        startedAt: new Date(),
      })
      .returning()
    if (!nodeRow) throw new Error('workflow_node_runs insert failed')

    const startMs = Date.now()
    try {
      const exec = getNodeExecutor(node.type)
      const r = await exec(
        {
          workspaceId: wf.workspaceId,
          workflowRunId: runId,
          nodeId,
          input: nodeInput,
        },
        node.config,
      )
      const dur = Date.now() - startMs
      await adminDb
        .update(workflowNodeRuns)
        .set({
          status: 'succeeded',
          output: r.output as never,
          log: r.log ?? null,
          finishedAt: new Date(),
          durationMs: dur,
        })
        .where(eq(workflowNodeRuns.id, nodeRow.id))
      nodeOutputs.set(nodeId, r.output)
      nodeStatus.set(nodeId, 'succeeded')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const dur = Date.now() - startMs
      await adminDb
        .update(workflowNodeRuns)
        .set({
          status: 'failed',
          error: msg,
          finishedAt: new Date(),
          durationMs: dur,
        })
        .where(eq(workflowNodeRuns.id, nodeRow.id))
      nodeStatus.set(nodeId, 'failed')
      // 後続は loop の preds.some チェックで skipped に
    }
  }

  const anyFailed = [...nodeStatus.values()].some((s) => s === 'failed')
  // 終端 (out-edges を持たない) のうち succeeded を output にまとめる
  const sinks = graph.nodes.filter((n) => !outAdj.get(n.id)?.length)
  const finalOutput: Record<string, unknown> = {}
  for (const s of sinks) {
    if (nodeStatus.get(s.id) === 'succeeded') {
      finalOutput[s.id] = nodeOutputs.get(s.id) ?? null
    }
  }

  if (anyFailed) {
    await adminDb
      .update(workflowRuns)
      .set({
        status: 'failed',
        error: '一部 node が失敗しました (workflow_node_runs の error を確認)',
        finishedAt: new Date(),
      })
      .where(eq(workflowRuns.id, runId))
    return { runId, status: 'failed', output: finalOutput, error: 'node failure' }
  }

  await adminDb
    .update(workflowRuns)
    .set({ status: 'succeeded', output: finalOutput as never, finishedAt: new Date() })
    .where(eq(workflowRuns.id, runId))
  return { runId, status: 'succeeded', output: finalOutput }
}

async function failRun(runId: string, error: string): Promise<void> {
  await adminDb
    .update(workflowRuns)
    .set({ status: 'failed', error, finishedAt: new Date() })
    .where(and(eq(workflowRuns.id, runId)))
}
