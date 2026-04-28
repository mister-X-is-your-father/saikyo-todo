'use client'

/**
 * Phase 6.15 iter124-125: 外部 API 連携 (pull 型) UI。
 * - 一覧: name / kind / enabled / 「Pull」「無効化」「削除」
 * - 「Pull」: triggerSourcePullAction で同期 pull → fetched/created/updated を toast に
 * - 作成 form (iter125): kind selector + kind 別 config (yamory: token / custom-rest: url + paths)
 */
import { useState } from 'react'

import { ChevronDown, ChevronRight, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useCreateExternalSource,
  useDeleteExternalSource,
  useExternalSources,
  useSourceImports,
  useTriggerSourcePull,
  useUpdateExternalSource,
} from '@/features/external-source/hooks'
import type { ExternalImport, ExternalSource } from '@/features/external-source/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface Props {
  workspaceId: string
}

export function IntegrationsPanel({ workspaceId }: Props) {
  const list = useExternalSources(workspaceId)

  return (
    <section
      className="space-y-6"
      data-testid="integrations-panel"
      aria-label="API 連携 source 一覧と新規作成"
    >
      <CreateSourceForm workspaceId={workspaceId} />
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
          description="上の form から Yamory / カスタム REST を Source として登録すると、定期 / 手動で Item を pull できます。"
          action={
            <button
              type="button"
              className="text-primary hover:bg-muted mt-2 rounded border px-3 py-1.5 text-xs hover:underline"
              data-testid="integrations-empty-create"
              aria-label="Source 作成フォームの『名前』入力欄にフォーカス"
              onClick={() => {
                const el = document.getElementById('src-name') as HTMLInputElement | null
                el?.focus()
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
            >
              作成フォームへ
            </button>
          }
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
    </section>
  )
}

function SourceCard({ workspaceId, src }: { workspaceId: string; src: ExternalSource }) {
  const update = useUpdateExternalSource(workspaceId)
  const del = useDeleteExternalSource(workspaceId)
  const trigger = useTriggerSourcePull(workspaceId)
  const [importsOpen, setImportsOpen] = useState(false)

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
            aria-label={
              !src.enabled
                ? `Source「${src.name}」は無効化中のため Pull 不可`
                : trigger.isPending
                  ? `Source「${src.name}」を Pull 中…`
                  : `Source「${src.name}」を手動 Pull (sync 実行、30s timeout)`
            }
          >
            <Play className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {trigger.isPending ? 'Pull 中…' : 'Pull'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void toggleEnabled()}
            disabled={update.isPending}
            data-testid={`src-toggle-${src.id}`}
            aria-label={
              update.isPending
                ? `Source「${src.name}」の状態を更新中…`
                : `Source「${src.name}」を${src.enabled ? '無効化' : '有効化'}`
            }
          >
            {src.enabled ? '無効化' : '有効化'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setImportsOpen((v) => !v)}
            aria-expanded={importsOpen}
            aria-controls={`src-imports-${src.id}`}
            data-testid={`src-imports-toggle-${src.id}`}
          >
            {importsOpen ? (
              <ChevronDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            )}
            履歴
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleDelete()}
            disabled={del.isPending}
            data-testid={`src-delete-${src.id}`}
            aria-label={
              del.isPending ? `Source「${src.name}」を削除中…` : `Source「${src.name}」を削除`
            }
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
          </Button>
        </div>
        {importsOpen && (
          <div id={`src-imports-${src.id}`} className="mt-3" data-testid={`src-imports-${src.id}`}>
            <SourceImportHistory sourceId={src.id} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Phase 6.15 iter125: 外部 API source 新規作成 form。
 * kind selector で yamory / custom-rest を切替、kind 別の config field を出す。
 * 保存時は zod (CreateSourceInputSchema) で server-side バリデーション。
 */
function CreateSourceForm({ workspaceId }: { workspaceId: string }) {
  const create = useCreateExternalSource(workspaceId)
  const [kind, setKind] = useState<'yamory' | 'custom-rest'>('custom-rest')
  const [name, setName] = useState('')
  // yamory
  const [token, setToken] = useState('')
  const [projectIds, setProjectIds] = useState('') // comma-separated
  // custom-rest
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<'GET' | 'POST'>('GET')
  const [itemsPath, setItemsPath] = useState('')
  const [idPath, setIdPath] = useState('id')
  const [titlePath, setTitlePath] = useState('title')
  const [duePath, setDuePath] = useState('')

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      if (kind === 'yamory') {
        const ids = projectIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        await create.mutateAsync({
          workspaceId,
          name: trimmed,
          kind: 'yamory',
          config: {
            token,
            ...(ids.length > 0 ? { projectIds: ids } : {}),
          },
          scheduleCron: null,
        })
      } else {
        await create.mutateAsync({
          workspaceId,
          name: trimmed,
          kind: 'custom-rest',
          config: {
            url,
            method,
            ...(itemsPath ? { itemsPath } : {}),
            idPath,
            titlePath,
            ...(duePath ? { duePath } : {}),
          },
          scheduleCron: null,
        })
      }
      toast.success('Source を作成しました')
      // リセット
      setName('')
      setToken('')
      setProjectIds('')
      setUrl('')
      setItemsPath('')
      setDuePath('')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">新規 Source</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
          data-testid="create-source-form"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="src-kind">種別</Label>
              <select
                id="src-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as 'yamory' | 'custom-rest')}
                className="h-9 w-full rounded-md border px-3 py-1 text-sm"
                aria-label="Source 種別"
              >
                <option value="custom-rest">custom-rest (汎用 REST)</option>
                <option value="yamory">yamory (脆弱性管理)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="src-name">名前</Label>
              <IMEInput
                id="src-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: Yamory チーム A"
                required
                aria-required="true"
                minLength={1}
                maxLength={200}
              />
            </div>
          </div>

          {kind === 'yamory' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="src-token">API Token</Label>
                <IMEInput
                  id="src-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Yamory API token"
                  required
                  aria-required="true"
                  minLength={1}
                  data-testid="src-token"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="src-project-ids">project IDs (1 件以上)</Label>
                <IMEInput
                  id="src-project-ids"
                  value={projectIds}
                  onChange={(e) => setProjectIds(e.target.value)}
                  placeholder="comma-separated (例: proj-a, proj-b)"
                  required
                  aria-required="true"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="src-url">URL</Label>
                  <IMEInput
                    id="src-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/api/items"
                    required
                    aria-required="true"
                    data-testid="src-url"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="src-method">method</Label>
                  <select
                    id="src-method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
                    className="h-9 w-full rounded-md border px-3 py-1 text-sm"
                    aria-label="HTTP method"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="src-items-path">items path (任意)</Label>
                  <IMEInput
                    id="src-items-path"
                    value={itemsPath}
                    onChange={(e) => setItemsPath(e.target.value)}
                    placeholder="例: data.items (省略で root)"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="src-due-path">due path (任意)</Label>
                  <IMEInput
                    id="src-due-path"
                    value={duePath}
                    onChange={(e) => setDuePath(e.target.value)}
                    placeholder="例: due_date"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="src-id-path">id path</Label>
                  <IMEInput
                    id="src-id-path"
                    value={idPath}
                    onChange={(e) => setIdPath(e.target.value)}
                    required
                    aria-required="true"
                    minLength={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="src-title-path">title path</Label>
                  <IMEInput
                    id="src-title-path"
                    value={titlePath}
                    onChange={(e) => setTitlePath(e.target.value)}
                    required
                    aria-required="true"
                    minLength={1}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!name.trim() || create.isPending}
              data-testid="src-create-btn"
              aria-label={
                !name.trim()
                  ? 'Source を作成するには名前を入力してください'
                  : create.isPending
                    ? 'Source を作成中…'
                    : 'External Source を新規作成'
              }
            >
              {create.isPending ? '作成中…' : '作成'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Phase 6.15 iter126: Source の直近 5 件 import (pull) 履歴。
 * status / triggerKind / 開始時刻 / fetched/created/updated を表示。
 */
function SourceImportHistory({ sourceId }: { sourceId: string }) {
  const q = useSourceImports(sourceId)
  if (q.isLoading) {
    return (
      <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
        読み込み中…
      </p>
    )
  }
  if (q.error) {
    return (
      <p className="text-destructive text-xs" role="alert">
        履歴の取得に失敗
      </p>
    )
  }
  const imports = q.data ?? []
  if (imports.length === 0) {
    return (
      <p className="text-muted-foreground text-xs" role="status">
        まだ Pull 履歴がありません
      </p>
    )
  }
  return (
    <ul
      className="divide-y rounded border text-xs"
      data-testid={`src-imports-list-${sourceId}`}
      aria-label="直近の Pull 履歴 (最新 5 件)"
    >
      {imports.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center gap-2 px-2 py-1.5"
          data-testid={`src-import-row-${r.id}`}
        >
          <ImportStatusBadge status={r.status} />
          <span className="text-muted-foreground">{r.triggerKind}</span>
          <time
            className="text-muted-foreground tabular-nums"
            dateTime={r.startedAt instanceof Date ? r.startedAt.toISOString() : (r.startedAt ?? '')}
          >
            {formatImportTime(r)}
          </time>
          <span
            className="text-muted-foreground ml-auto tabular-nums"
            aria-label={`fetched ${r.fetchedCount} / created ${r.createdCount} / updated ${r.updatedCount}`}
          >
            f={r.fetchedCount} / c={r.createdCount} / u={r.updatedCount}
          </span>
          {r.error && (
            <span
              className="text-destructive line-clamp-1 w-full text-[10px]"
              title={r.error}
              aria-label={`Pull エラー: ${r.error}`}
              role="alert"
            >
              {r.error}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function ImportStatusBadge({ status }: { status: string }) {
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
            : status
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}
      aria-label={`Pull ステータス: ${label}`}
    >
      {label}
    </span>
  )
}

function formatImportTime(r: ExternalImport): string {
  const t = r.startedAt ?? r.createdAt
  if (!t) return '—'
  const d = t instanceof Date ? t : new Date(t)
  return d.toLocaleString('ja-JP')
}
