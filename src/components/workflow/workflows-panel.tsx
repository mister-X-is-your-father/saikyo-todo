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

import { Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useTriggerWorkflow,
  useUpdateWorkflow,
  useWorkflows,
} from '@/features/workflow/hooks'
import type { Workflow } from '@/features/workflow/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="space-y-6" data-testid="workflows-panel">
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
    </div>
  )
}

function WorkflowCard({ workspaceId, wf }: { workspaceId: string; wf: Workflow }) {
  const update = useUpdateWorkflow(workspaceId)
  const del = useDeleteWorkflow(workspaceId)
  const trigger = useTriggerWorkflow()
  const nodeCount = (wf.graph as { nodes?: unknown[] }).nodes?.length ?? 0
  const triggerKind = (wf.trigger as { kind?: string }).kind ?? 'manual'

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
            onClick={() => void handleDelete()}
            disabled={del.isPending}
            data-testid={`wf-delete-${wf.id}`}
            aria-label={`Workflow「${wf.name}」を削除`}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
