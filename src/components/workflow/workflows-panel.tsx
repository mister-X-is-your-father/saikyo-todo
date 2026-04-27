'use client'

/**
 * Phase 6.15 iter117: ワークフロー一覧 + 作成 + 手動 trigger UI (最小)。
 * - 一覧: name / description / enabled / 「実行」/「無効化」/「削除」
 * - 作成: name + description + 空 graph
 * - 手動 trigger: 押下で sync 実行 → 結果 (status / output) を toast に
 *
 * graph 編集 UI (React Flow ベース DAG editor) は次 iter。今は graph は API 経由で更新する。
 */
import { useState } from 'react'

import { ChevronDown, ChevronRight, Pencil, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useTriggerWorkflow,
  useUpdateWorkflow,
  useWorkflowNodeRuns,
  useWorkflowRuns,
  useWorkflows,
} from '@/features/workflow/hooks'
import type { Workflow, WorkflowRun } from '@/features/workflow/schema'
import { WorkflowGraphSchema, WorkflowTriggerSchema } from '@/features/workflow/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  workspaceId: string
}

export function WorkflowsPanel({ workspaceId }: Props) {
  const list = useWorkflows(workspaceId)
  const create = useCreateWorkflow(workspaceId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function handleCreate() {
    const n = name.trim()
    if (!n) return
    try {
      await create.mutateAsync({
        workspaceId,
        name: n,
        description: description.trim(),
        graph: { nodes: [], edges: [] },
        trigger: { kind: 'manual' },
      })
      setName('')
      setDescription('')
      toast.success('Workflow を作成しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗')
    }
  }

  return (
    <section
      className="space-y-6"
      data-testid="workflows-panel"
      aria-label="Workflow 一覧と新規作成"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新規 Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="wf-name">名前</Label>
              <IMEInput
                id="wf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 朝の Slack 通知"
                required
                aria-required="true"
                minLength={1}
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wf-desc">説明 (任意)</Label>
              <Textarea
                id="wf-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="この workflow が何を自動化するか"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!name.trim() || create.isPending}
                data-testid="wf-create-btn"
              >
                {create.isPending ? '作成中…' : '作成'}
              </Button>
            </div>
          </form>
          <p className="text-muted-foreground mt-2 text-[11px]">
            graph (nodes / edges) の編集 UI は次 iter で React Flow を実装予定。 現状は空 graph
            で作成し、API 経由で更新できる。
          </p>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState
          message={isAppError(list.error) ? list.error.message : '一覧取得に失敗'}
          onRetry={() => void list.refetch()}
        />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="Workflow がありません" description="上のフォームから作成してください" />
      ) : (
        <ul className="space-y-3" data-testid="workflows-list">
          {list.data!.map((wf) => (
            <li key={wf.id}>
              <WorkflowCard workspaceId={workspaceId} wf={wf} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function WorkflowCard({ workspaceId, wf }: { workspaceId: string; wf: Workflow }) {
  const update = useUpdateWorkflow(workspaceId)
  const del = useDeleteWorkflow(workspaceId)
  const trigger = useTriggerWorkflow()
  const nodeCount = (wf.graph as { nodes?: unknown[] }).nodes?.length ?? 0
  const triggerKind = (wf.trigger as { kind?: string }).kind ?? 'manual'
  const [editorOpen, setEditorOpen] = useState(false)
  const [runsOpen, setRunsOpen] = useState(false)

  async function toggleEnabled() {
    try {
      await update.mutateAsync({
        id: wf.id,
        expectedVersion: wf.version,
        patch: { enabled: !wf.enabled },
      })
      toast.success(wf.enabled ? '無効化しました' : '有効化しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '更新に失敗')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Workflow「${wf.name}」を削除しますか?`)) return
    try {
      await del.mutateAsync(wf.id)
      toast.success('削除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '削除に失敗')
    }
  }

  async function handleTrigger() {
    if (nodeCount === 0) {
      toast.error('node が無い workflow は実行できません')
      return
    }
    try {
      const r = await trigger.mutateAsync({ workflowId: wf.id })
      if (r.status === 'succeeded') {
        toast.success(`実行成功 (run ${r.runId.slice(0, 8)})`)
      } else {
        toast.error(`実行失敗: ${r.error ?? 'unknown'}`)
      }
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '実行に失敗')
    }
  }

  return (
    <Card data-testid={`wf-card-${wf.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{wf.name}</CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">
              trigger: {triggerKind} · nodes: {nodeCount} · {wf.enabled ? '有効' : '無効'}
            </p>
            {wf.description && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{wf.description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleTrigger()}
            disabled={!wf.enabled || trigger.isPending}
            data-testid={`wf-run-${wf.id}`}
            title={
              nodeCount === 0
                ? 'node が無い workflow は実行不可'
                : '手動で sync 実行 (各 node 10-60s timeout)'
            }
          >
            <Play className="mr-1 h-3.5 w-3.5" />
            {trigger.isPending ? '実行中…' : '実行'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditorOpen(true)}
            data-testid={`wf-edit-${wf.id}`}
            aria-label={`Workflow「${wf.name}」の graph / trigger を編集`}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            編集
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void toggleEnabled()}
            disabled={update.isPending}
            data-testid={`wf-toggle-${wf.id}`}
          >
            {wf.enabled ? '無効化' : '有効化'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRunsOpen((v) => !v)}
            aria-expanded={runsOpen}
            aria-controls={`wf-runs-${wf.id}`}
            data-testid={`wf-runs-toggle-${wf.id}`}
          >
            {runsOpen ? (
              <ChevronDown className="mr-1 h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="mr-1 h-3.5 w-3.5" />
            )}
            履歴
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleDelete()}
            disabled={del.isPending}
            data-testid={`wf-delete-${wf.id}`}
            aria-label={`Workflow「${wf.name}」を削除`}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
        {runsOpen && (
          <div id={`wf-runs-${wf.id}`} className="mt-3" data-testid={`wf-runs-${wf.id}`}>
            <WorkflowRunHistory workflowId={wf.id} />
          </div>
        )}
      </CardContent>
      <WorkflowEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        wf={wf}
        onSave={async (graph, triggerVal) => {
          await update.mutateAsync({
            id: wf.id,
            expectedVersion: wf.version,
            patch: { graph, trigger: triggerVal },
          })
        }}
      />
    </Card>
  )
}

interface EditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wf: Workflow
  onSave: (
    graph: ReturnType<typeof WorkflowGraphSchema.parse>,
    trigger: ReturnType<typeof WorkflowTriggerSchema.parse>,
  ) => Promise<void>
}

function WorkflowEditorDialog({ open, onOpenChange, wf, onSave }: EditorProps) {
  const [graphText, setGraphText] = useState(() => JSON.stringify(wf.graph, null, 2))
  const [triggerText, setTriggerText] = useState(() => JSON.stringify(wf.trigger, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // dialog が再 open されたら最新 wf 値で初期化 (前回の編集中値を残さない)
  if (open && wf.updatedAt) {
    // no-op — 初期値は useState の lazy init で設定済。再 open 時は意図的に保持する。
  }

  async function handleSave() {
    setError(null)
    let graph
    let triggerVal
    try {
      graph = WorkflowGraphSchema.parse(JSON.parse(graphText))
    } catch (e) {
      setError(`graph JSON 不正: ${e instanceof Error ? e.message : String(e)}`)
      return
    }
    try {
      triggerVal = WorkflowTriggerSchema.parse(JSON.parse(triggerText))
    } catch (e) {
      setError(`trigger JSON 不正: ${e instanceof Error ? e.message : String(e)}`)
      return
    }
    setSaving(true)
    try {
      await onSave(graph, triggerVal)
      toast.success('Workflow を保存しました')
      onOpenChange(false)
    } catch (e) {
      const msg = isAppError(e) ? e.message : '保存に失敗'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid={`wf-editor-dialog-${wf.id}`}>
        <DialogHeader>
          <DialogTitle>Workflow 編集 — {wf.name}</DialogTitle>
          <DialogDescription>
            graph (nodes / edges) と trigger を JSON で編集。React Flow ベースの 視覚エディタは次
            iter で実装予定。zod スキーマで保存時にバリデーションする。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`wf-editor-graph-${wf.id}`}>
              graph ({'{ nodes: [...], edges: [...] }'})
            </Label>
            <Textarea
              id={`wf-editor-graph-${wf.id}`}
              value={graphText}
              onChange={(e) => setGraphText(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              data-testid={`wf-editor-graph-${wf.id}`}
              aria-label="graph JSON"
            />
            <p className="text-muted-foreground text-[10px]">
              node type: noop / http / slack / email / ai / script (詳細は registry.ts)
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`wf-editor-trigger-${wf.id}`}>
              trigger ({'{ kind: "manual" | "cron" | "item-event" | "webhook" }'})
            </Label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="trigger プリセット">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setTriggerText(JSON.stringify({ kind: 'manual' }, null, 2))}
                data-testid={`wf-trigger-preset-manual-${wf.id}`}
                title="手動 trigger 専用 (実行 button から起動)"
              >
                manual
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setTriggerText(JSON.stringify({ kind: 'cron', cron: '0 9 * * *' }, null, 2))
                }
                data-testid={`wf-trigger-preset-cron-${wf.id}`}
                title="cron trigger (例: 毎日 09:00)"
              >
                cron
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setTriggerText(
                    JSON.stringify({ kind: 'item-event', event: 'create', filter: {} }, null, 2),
                  )
                }
                data-testid={`wf-trigger-preset-item-event-${wf.id}`}
                title="item-event (create / update / status_change / complete)"
              >
                item-event
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setTriggerText(
                    JSON.stringify(
                      {
                        kind: 'webhook',
                        secret: crypto.randomUUID().replace(/-/g, '').slice(0, 24),
                      },
                      null,
                      2,
                    ),
                  )
                }
                data-testid={`wf-trigger-preset-webhook-${wf.id}`}
                title="webhook trigger (POST /api/workflows/webhook/<secret>)"
              >
                webhook
              </Button>
            </div>
            <Textarea
              id={`wf-editor-trigger-${wf.id}`}
              value={triggerText}
              onChange={(e) => setTriggerText(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              data-testid={`wf-editor-trigger-${wf.id}`}
              aria-label="trigger JSON"
            />
            <p className="text-muted-foreground text-[10px]">
              プリセット button で typical な JSON を流し込めます (cron は毎日 09:00、 webhook は
              random secret、item-event は create + 空 filter)。
            </p>
          </div>
          {error && (
            <p className="text-destructive text-xs" data-testid={`wf-editor-error-${wf.id}`}>
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            data-testid={`wf-editor-save-${wf.id}`}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Phase 6.15 iter120: Workflow の直近 5 件の run 履歴。
 * status / triggerKind / 開始時刻 / duration を tabular-nums で表示。
 *
 * Phase 6.15 iter137: 各 run 行を expander にして node_runs (input / output /
 * error / duration) を disclosure で展開表示。失敗 run の原因を画面で追える。
 */
function WorkflowRunHistory({ workflowId }: { workflowId: string }) {
  const q = useWorkflowRuns(workflowId)
  const trigger = useTriggerWorkflow()
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  if (q.isLoading) {
    return <p className="text-muted-foreground text-xs">読み込み中…</p>
  }
  if (q.error) {
    return <p className="text-destructive text-xs">履歴の取得に失敗</p>
  }
  const runs = q.data ?? []
  if (runs.length === 0) {
    return <p className="text-muted-foreground text-xs">まだ実行履歴がありません</p>
  }
  async function handleRerun(r: WorkflowRun) {
    try {
      const res = await trigger.mutateAsync({ workflowId: r.workflowId, input: r.input })
      if (res.status === 'succeeded') {
        toast.success(`再実行成功 (run ${res.runId.slice(0, 8)})`)
      } else {
        toast.error(`再実行失敗: ${res.error ?? 'unknown'}`)
      }
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '再実行に失敗')
    }
  }
  return (
    <ul
      className="divide-y rounded border text-xs"
      data-testid={`wf-runs-list-${workflowId}`}
      aria-label="直近の実行履歴 (最新 5 件)"
    >
      {runs.map((r) => {
        const isOpen = expandedRunId === r.id
        return (
          <li key={r.id} className="flex items-stretch" data-testid={`wf-run-row-${r.id}`}>
            <div className="flex-1">
              <button
                type="button"
                className="hover:bg-muted/50 flex w-full items-center gap-2 px-2 py-1.5 text-left"
                onClick={() => setExpandedRunId(isOpen ? null : r.id)}
                aria-expanded={isOpen}
                aria-controls={`wf-run-nodes-${r.id}`}
                data-testid={`wf-run-toggle-${r.id}`}
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                <RunStatusBadge status={r.status} />
                <span className="text-muted-foreground">{r.triggerKind}</span>
                <time
                  className="text-muted-foreground tabular-nums"
                  dateTime={
                    r.startedAt instanceof Date ? r.startedAt.toISOString() : (r.startedAt ?? '')
                  }
                >
                  {formatRunTime(r)}
                </time>
                <span className="text-muted-foreground ml-auto tabular-nums">
                  {formatRunDuration(r)}
                </span>
              </button>
              {isOpen && (
                <div id={`wf-run-nodes-${r.id}`} className="bg-muted/20 border-t px-2 py-2">
                  <WorkflowNodeRunsList runId={r.id} />
                </div>
              )}
            </div>
            <button
              type="button"
              className="hover:bg-muted/50 text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 border-l px-2 disabled:opacity-50"
              disabled={trigger.isPending}
              onClick={(e) => {
                e.stopPropagation()
                void handleRerun(r)
              }}
              aria-label={`実行 ${r.id.slice(0, 8)} を同じ input で再実行`}
              title={`同じ input で再実行 (${formatRunTime(r)})`}
              data-testid={`wf-run-rerun-${r.id}`}
            >
              <Play className="h-3 w-3" />再
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Phase 6.15 iter137: 1 run の各 node の input/output/error/duration を行ごとに表示。
 * 失敗 run なら error が赤字で <pre>、output は <details> の中で確認できる。
 */
function WorkflowNodeRunsList({ runId }: { runId: string }) {
  const q = useWorkflowNodeRuns(runId, { enabled: true })
  if (q.isLoading)
    return <p className="text-muted-foreground text-[11px]">node 詳細を読み込み中…</p>
  if (q.error) return <p className="text-destructive text-[11px]">node 詳細の取得に失敗</p>
  const rows = q.data ?? []
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-[11px]">node 実行履歴がありません</p>
  }
  return (
    <ul className="space-y-1.5" data-testid={`wf-node-runs-${runId}`}>
      {rows.map((nr) => (
        <li
          key={nr.id}
          className="bg-background space-y-1 rounded border p-1.5"
          data-testid={`wf-node-run-${nr.id}`}
        >
          <div className="flex items-center gap-2 text-[11px]">
            <RunStatusBadge status={nr.status} />
            <span className="font-mono">{nr.nodeId}</span>
            <span className="text-muted-foreground">({nr.nodeType})</span>
            <span className="text-muted-foreground ml-auto tabular-nums">
              {nr.durationMs != null ? `${nr.durationMs}ms` : '—'}
            </span>
          </div>
          {nr.error && (
            <pre
              className="overflow-x-auto rounded bg-red-50 px-2 py-1 text-[10px] whitespace-pre-wrap text-red-700 dark:bg-red-950 dark:text-red-300"
              data-testid={`wf-node-run-error-${nr.id}`}
              aria-label={`node ${nr.nodeId} のエラー`}
            >
              {nr.error}
            </pre>
          )}
          {nr.output != null && (
            <details className="text-[10px]">
              <summary className="text-muted-foreground cursor-pointer">output (jsonb)</summary>
              <pre className="bg-muted/30 mt-1 overflow-x-auto rounded px-2 py-1 whitespace-pre-wrap">
                {JSON.stringify(nr.output, null, 2)}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ul>
  )
}

function RunStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'succeeded'
      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
      : status === 'failed'
        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
        : status === 'running'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          : 'bg-muted text-muted-foreground'
  const label =
    status === 'succeeded'
      ? '成功'
      : status === 'failed'
        ? '失敗'
        : status === 'running'
          ? '実行中'
          : status === 'queued'
            ? '待機'
            : status === 'cancelled'
              ? '中止'
              : status
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}
      aria-label={`実行ステータス: ${label}`}
    >
      {label}
    </span>
  )
}

function formatRunTime(r: WorkflowRun): string {
  const t = r.startedAt ?? r.createdAt
  if (!t) return '—'
  const d = t instanceof Date ? t : new Date(t)
  return d.toLocaleString('ja-JP')
}

function formatRunDuration(r: WorkflowRun): string {
  if (!r.startedAt || !r.finishedAt) return '—'
  const s = r.startedAt instanceof Date ? r.startedAt : new Date(r.startedAt)
  const e = r.finishedAt instanceof Date ? r.finishedAt : new Date(r.finishedAt)
  const ms = e.getTime() - s.getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}
