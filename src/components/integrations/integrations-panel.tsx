'use client'

/**
 * Phase 6.15 iter124: 外部 API 連携 (pull 型) の最小 UI。
 * - 一覧: name / kind / enabled / 「Pull」「無効化」「削除」
 * - 「Pull」: triggerSourcePullAction で同期 pull → fetched/created/updated を toast に
 * - 作成 form は次 iter (kind 別 config の zod が複雑なため別 dialog で実装)
 */
import { Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useDeleteExternalSource,
  useExternalSources,
  useTriggerSourcePull,
  useUpdateExternalSource,
} from '@/features/external-source/hooks'
import type { ExternalSource } from '@/features/external-source/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  workspaceId: string
}

export function IntegrationsPanel({ workspaceId }: Props) {
  const list = useExternalSources(workspaceId)

  return (
    <div className="space-y-6" data-testid="integrations-panel">
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState
          message={isAppError(list.error) ? list.error.message : '一覧取得に失敗'}
          onRetry={() => void list.refetch()}
        />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          title="外部 API 連携がありません"
          description="API (Yamory / カスタム REST) を Source として登録すると、定期 / 手動で Item を pull できます。作成 form は次 iter で実装予定 (現状は seed / DB 経由で登録)。"
        />
      ) : (
        <ul className="space-y-3" data-testid="sources-list">
          {list.data!.map((src) => (
            <li key={src.id}>
              <SourceCard workspaceId={workspaceId} src={src} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SourceCard({ workspaceId, src }: { workspaceId: string; src: ExternalSource }) {
  const update = useUpdateExternalSource(workspaceId)
  const del = useDeleteExternalSource(workspaceId)
  const trigger = useTriggerSourcePull(workspaceId)

  async function toggleEnabled() {
    try {
      await update.mutateAsync({
        id: src.id,
        expectedVersion: src.version,
        patch: { enabled: !src.enabled },
      })
      toast.success(src.enabled ? '無効化しました' : '有効化しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '更新に失敗')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Source「${src.name}」を削除しますか?`)) return
    try {
      await del.mutateAsync(src.id)
      toast.success('削除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '削除に失敗')
    }
  }

  async function handlePull() {
    try {
      const r = await trigger.mutateAsync(src.id)
      if (r.status === 'succeeded') {
        toast.success(
          `Pull 成功: fetched=${r.fetched} / created=${r.created} / updated=${r.updated}`,
        )
      } else {
        toast.error(`Pull 失敗: ${r.error ?? 'unknown'}`)
      }
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Pull に失敗')
    }
  }

  return (
    <Card data-testid={`src-card-${src.id}`}>
      <CardHeader className="pb-2">
        <CardTitle className="truncate text-base">{src.name}</CardTitle>
        <p className="text-muted-foreground mt-0.5 text-xs">
          kind: {src.kind} · {src.enabled ? '有効' : '無効'}
          {src.scheduleCron ? ` · cron: ${src.scheduleCron}` : ''}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handlePull()}
            disabled={!src.enabled || trigger.isPending}
            data-testid={`src-pull-${src.id}`}
            title="手動 pull (sync 実行、30s timeout)"
          >
            <Play className="mr-1 h-3.5 w-3.5" />
            {trigger.isPending ? 'Pull 中…' : 'Pull'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void toggleEnabled()}
            disabled={update.isPending}
            data-testid={`src-toggle-${src.id}`}
          >
            {src.enabled ? '無効化' : '有効化'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleDelete()}
            disabled={del.isPending}
            data-testid={`src-delete-${src.id}`}
            aria-label={`Source「${src.name}」を削除`}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
