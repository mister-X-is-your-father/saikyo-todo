'use client'

/**
 * Phase 6.15 iter124-125: 外部 API 連携 (pull 型) UI。
 * - 一覧: name / kind / enabled / 「Pull」「無効化」「削除」
 * - 「Pull」: triggerSourcePullAction で同期 pull → fetched/created/updated を toast に
 * - 作成 form (iter125): kind selector + kind 別 config (yamory: token / custom-rest: url + paths)
 */
import { useState } from 'react'

import { Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useCreateExternalSource,
  useDeleteExternalSource,
  useExternalSources,
  useTriggerSourcePull,
  useUpdateExternalSource,
} from '@/features/external-source/hooks'
import type { ExternalSource } from '@/features/external-source/schema'

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
    <div className="space-y-6" data-testid="integrations-panel">
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
                <Label htmlFor="src-project-ids">project IDs (任意)</Label>
                <IMEInput
                  id="src-project-ids"
                  value={projectIds}
                  onChange={(e) => setProjectIds(e.target.value)}
                  placeholder="comma-separated (省略で全 project)"
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
            >
              {create.isPending ? '作成中…' : '作成'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
