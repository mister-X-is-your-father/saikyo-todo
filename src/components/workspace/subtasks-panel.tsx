'use client'

/**
 * Item 編集ダイアログの「子タスク」Tab 内容。
 *
 * iter255 で `item-edit-dialog.tsx` (831 行) から抽出。SubtasksPanel は
 * dialog 本体と密結合していないため (workspace 内 hooks と DecomposeProposalsPanel
 * を直接使うのみ) 単独 file に切り出して責任範囲を明示する。
 *
 * 本体機能:
 *   - 既存 children の一覧表示 (status badge / MUST badge)
 *   - 改行区切りの bulk 追加 form (空行スキップ / priority=4 / status=todo)
 *   - 親 Item 直下に AI 分解候補 (DecomposeProposalsPanel) を出す
 */
import { useState } from 'react'

import { toast } from 'sonner'

import { fullPathOf } from '@/lib/db/ltree-path'

import { useCreateItem, useItems } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

import { DecomposeProposalsPanel } from './decompose-proposals-panel'
import { parseBulkSubtaskTitles } from './subtasks-panel-helpers'

interface Props {
  workspaceId: string
  parent: Item
}

export function SubtasksPanel({ workspaceId, parent }: Props) {
  const items = useItems(workspaceId)
  const create = useCreateItem(workspaceId)
  const [bulkText, setBulkText] = useState('')

  const parentFullPath = fullPathOf({ id: parent.id, parentPath: parent.parentPath })

  const children = (items.data ?? [])
    .filter((i) => !i.deletedAt && i.parentPath === parentFullPath)
    .sort((a, b) => a.position.localeCompare(b.position))

  async function handleBulkAdd() {
    const titles = parseBulkSubtaskTitles(bulkText)
    if (titles.length === 0) return
    let succeeded = 0
    for (const t of titles) {
      try {
        await create.mutateAsync({
          workspaceId,
          title: t,
          description: '',
          status: 'todo',
          parentItemId: parent.id,
          priority: 4,
          isMust: false,
          idempotencyKey: crypto.randomUUID(),
        })
        succeeded += 1
      } catch (e) {
        console.error('[subtasks] create failed', e)
      }
    }
    if (succeeded > 0) {
      toast.success(`子タスクを ${succeeded} 件追加しました`)
      setBulkText('')
    }
    if (succeeded < titles.length) {
      toast.error(`${titles.length - succeeded} 件は追加に失敗しました`)
    }
  }

  const pendingTitleCount = parseBulkSubtaskTitles(bulkText).length

  return (
    <div className="space-y-4" data-testid="subtasks-panel">
      <DecomposeProposalsPanel workspaceId={workspaceId} parentItemId={parent.id} />

      <div className="space-y-2" role="region" aria-labelledby="subtasks-existing-heading">
        <h3 id="subtasks-existing-heading" className="text-sm font-semibold">
          <span className="sr-only">{`既存の子タスク ${children.length} 件`}</span>
          <span aria-hidden="true">既存の子タスク ({children.length})</span>
        </h3>
        {items.isLoading ? (
          <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
            読み込み中…
          </p>
        ) : children.length === 0 ? (
          <p className="text-muted-foreground text-xs" role="status">
            まだ子タスクがありません
          </p>
        ) : (
          <ul className="space-y-1" data-testid="subtasks-list">
            {children.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm"
                data-testid={`subtask-${c.id}`}
              >
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    c.status === 'done'
                      ? 'bg-green-100 text-green-700'
                      : c.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {c.status}
                </span>
                <span className="flex-1 truncate">{c.title}</span>
                {c.isMust && (
                  <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-700">
                    MUST
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 rounded border border-dashed p-2">
        <Label htmlFor="subtasks-bulk">改行区切りで bulk 追加</Label>
        <textarea
          id="subtasks-bulk"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={5}
          className="bg-background w-full rounded border px-2 py-1.5 font-mono text-sm"
          placeholder={'例:\n仕様書を読む\nスキーマ設計\nプロトタイプ実装'}
          data-testid="subtasks-bulk-input"
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            空行は無視。priority=4 / status=todo で作成。
          </span>
          <Button
            type="button"
            size="sm"
            disabled={!bulkText.trim() || create.isPending}
            onClick={() => void handleBulkAdd()}
            data-testid="subtasks-bulk-add-btn"
            aria-label={
              !bulkText.trim()
                ? '子タスクを追加するには改行区切りで入力してください'
                : create.isPending
                  ? `子タスク ${pendingTitleCount} 件を追加中…`
                  : `子タスク ${pendingTitleCount} 件をまとめて追加`
            }
          >
            {create.isPending ? '追加中…' : `${pendingTitleCount} 件追加`}
          </Button>
        </div>
      </div>
    </div>
  )
}
