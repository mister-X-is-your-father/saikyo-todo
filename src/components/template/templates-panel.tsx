'use client'

/**
 * Templates 一覧 + 新規作成。各カードクリックで詳細 (子 Item 編集) に展開。
 * MVP: 単一ページ完結。drawer / modal は使わず inline expansion。
 */
import { useState } from 'react'

import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useCreateTemplate, useSoftDeleteTemplate, useTemplates } from '@/features/template/hooks'
import type { Template } from '@/features/template/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { IMEInput } from '@/components/shared/ime-input'
import { InstantiateForm } from '@/components/template/instantiate-form'
import { TemplateItemsEditor } from '@/components/template/template-items-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  workspaceId: string
}

export function TemplatesPanel({ workspaceId }: Props) {
  const list = useTemplates(workspaceId)
  const createMut = useCreateTemplate(workspaceId)
  const deleteMut = useSoftDeleteTemplate(workspaceId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<'manual' | 'recurring'>('manual')
  const [scheduleCron, setScheduleCron] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleCreate() {
    const n = name.trim()
    if (!n) return
    try {
      await createMut.mutateAsync({
        workspaceId,
        name: n,
        description,
        kind,
        scheduleCron: kind === 'recurring' ? scheduleCron.trim() || null : null,
        variablesSchema: {},
        tags: [],
        idempotencyKey: crypto.randomUUID(),
      })
      setName('')
      setDescription('')
      setKind('manual')
      setScheduleCron('')
      toast.success('Template を作成しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗しました')
    }
  }

  async function handleDelete(t: Template) {
    if (!confirm(`"${t.name}" を削除しますか?`)) return
    try {
      await deleteMut.mutateAsync({ id: t.id, expectedVersion: t.version })
      toast.success('削除しました')
      if (expandedId === t.id) setExpandedId(null)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '削除に失敗しました')
    }
  }

  return (
    <div className="space-y-6" data-testid="templates-panel">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新規 Template</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="tmpl-name">名前</Label>
                <IMEInput
                  id="tmpl-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: クライアント onboarding"
                  required
                  aria-required="true"
                  minLength={1}
                  maxLength={200}
                />
              </div>
              <div>
                <Label htmlFor="tmpl-kind">種別</Label>
                <select
                  id="tmpl-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as 'manual' | 'recurring')}
                  className="h-9 w-full rounded-md border px-3 py-1 text-sm"
                >
                  <option value="manual">manual (手動展開)</option>
                  <option value="recurring">recurring (cron で自動展開)</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="tmpl-desc">説明</Label>
              <Textarea
                id="tmpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="このテンプレートが何を生成するか"
              />
            </div>
            {kind === 'recurring' ? (
              <div>
                <Label htmlFor="tmpl-cron">cron 式</Label>
                <IMEInput
                  id="tmpl-cron"
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                  placeholder="0 9 * * 1  (毎週月曜 09:00)"
                  className="font-mono"
                />
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={createMut.isPending || !name.trim()}
              aria-label={
                !name.trim()
                  ? 'Template を作成するには名前を入力してください'
                  : createMut.isPending
                    ? 'Template を作成中…'
                    : 'Template を新規作成'
              }
            >
              作成
            </Button>
          </form>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState
          message={isAppError(list.error) ? list.error.message : '一覧取得に失敗しました'}
          onRetry={() => void list.refetch()}
        />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState title="Template がありません" description="上のフォームから作成してください" />
      ) : (
        <ul className="space-y-3">
          {list.data!.map((t) => (
            <li key={t.id}>
              <Card data-testid="template-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    aria-expanded={expandedId === t.id}
                    aria-controls={`template-body-${t.id}`}
                    aria-label={`Template「${t.name}」の詳細を${expandedId === t.id ? '閉じる' : '開く'}`}
                  >
                    <CardTitle className="text-base">
                      {t.name}
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        [{t.kind}
                        {t.scheduleCron ? ` · ${t.scheduleCron}` : ''}]
                      </span>
                    </CardTitle>
                    {t.description ? (
                      <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
                    ) : null}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(t)}
                    disabled={deleteMut.isPending}
                    aria-label={
                      deleteMut.isPending
                        ? `Template「${t.name}」を削除中…`
                        : `Template「${t.name}」を削除`
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                  </Button>
                </CardHeader>
                {expandedId === t.id ? (
                  <CardContent className="space-y-4" id={`template-body-${t.id}`}>
                    <InstantiateForm workspaceId={workspaceId} template={t} />
                    <TemplateItemsEditor templateId={t.id} />
                  </CardContent>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
