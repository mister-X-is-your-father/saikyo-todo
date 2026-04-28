'use client'

/**
 * Template の子 item 編集。inline 追加 + 一覧。MVP 最小: title + isMust + dod + dueOffsetDays。
 * parent_path は root 固定 (MVP)、階層展開は Day 14 で本格対応。
 */
import { useState } from 'react'

import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useAddTemplateItem,
  useRemoveTemplateItem,
  useTemplateItems,
} from '@/features/template/hooks'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  templateId: string
}

export function TemplateItemsEditor({ templateId }: Props) {
  const items = useTemplateItems(templateId)
  const addMut = useAddTemplateItem(templateId)
  const removeMut = useRemoveTemplateItem(templateId)

  const [title, setTitle] = useState('')
  const [isMust, setIsMust] = useState(false)
  const [dod, setDod] = useState('')
  const [dueOffset, setDueOffset] = useState('')

  async function handleAdd() {
    const t = title.trim()
    if (!t) return
    try {
      await addMut.mutateAsync({
        templateId,
        title: t,
        description: '',
        parentPath: '',
        statusInitial: 'todo',
        dueOffsetDays: dueOffset ? Number(dueOffset) : null,
        isMust,
        dod: isMust ? dod.trim() : null,
        defaultAssignees: [],
        agentRoleToInvoke: null,
      })
      setTitle('')
      setIsMust(false)
      setDod('')
      setDueOffset('')
      toast.success('追加しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '追加に失敗しました')
    }
  }

  async function handleRemove(id: string, title: string) {
    if (
      !window.confirm(
        `Template item「${title}」を削除しますか?\n(template に紐づいた今後の展開には影響しないが、過去 instance はそのまま)`,
      )
    )
      return
    try {
      await removeMut.mutateAsync({ id })
      toast.success('削除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '削除に失敗しました')
    }
  }

  return (
    <div className="space-y-4" data-testid="template-items-editor">
      <form
        className="space-y-2 rounded-md border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void handleAdd()
        }}
      >
        <div className="flex gap-2">
          <IMEInput
            placeholder="子 Item のタイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
            aria-label="子 Item のタイトル"
            required
            aria-required="true"
            minLength={1}
            maxLength={500}
          />
          <input
            type="number"
            placeholder="期日 offset 日"
            value={dueOffset}
            onChange={(e) => setDueOffset(e.target.value)}
            className="h-9 w-28 rounded-md border px-2 text-sm"
            aria-label="期日 offset (日数 — 展開日 + N 日後を期日に設定)"
          />
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={isMust} onChange={(e) => setIsMust(e.target.checked)} />
          MUST (絶対落とさない)
        </label>
        {isMust ? (
          <Textarea
            placeholder="DoD (Definition of Done) を明記"
            value={dod}
            onChange={(e) => setDod(e.target.value)}
            rows={2}
            aria-label="DoD (Definition of Done) — MUST item の完了条件"
            required
            aria-required="true"
          />
        ) : null}
        <Button
          type="submit"
          size="sm"
          disabled={addMut.isPending || !title.trim()}
          aria-label={
            !title.trim()
              ? '子 Item を追加するにはタイトルを入力してください'
              : addMut.isPending
                ? '子 Item を追加中…'
                : '子 Item を Template に追加'
          }
        >
          + 追加
        </Button>
      </form>

      {items.isLoading ? (
        <Loading />
      ) : items.error ? (
        <ErrorState
          message={isAppError(items.error) ? items.error.message : '取得失敗'}
          onRetry={() => void items.refetch()}
        />
      ) : (items.data?.length ?? 0) === 0 ? (
        <EmptyState title="子 Item がまだありません" />
      ) : (
        <ul className="divide-y text-sm">
          {items.data!.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 py-2"
              data-testid="template-item-row"
            >
              <span className="flex-1 truncate">{it.title}</span>
              {it.isMust ? (
                <span
                  className="rounded bg-red-500/10 px-1.5 text-xs text-red-600"
                  role="img"
                  aria-label="MUST item"
                >
                  MUST
                </span>
              ) : null}
              {it.dueOffsetDays != null ? (
                <span
                  className="text-muted-foreground text-xs"
                  aria-label={`期日 offset +${it.dueOffsetDays} 日`}
                >
                  +{it.dueOffsetDays}日
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(it.id, it.title)}
                disabled={removeMut.isPending}
                aria-label={
                  removeMut.isPending
                    ? `Template item「${it.title}」を削除中…`
                    : `Template item「${it.title}」を削除`
                }
              >
                <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
