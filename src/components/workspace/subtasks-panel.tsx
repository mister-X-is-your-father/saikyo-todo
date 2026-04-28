'use client'

/**
 * Item 編集ダイアログの「子タスク」Tab 内容。
 *
 * iter255 で `item-edit-dialog.tsx` (831 行) から抽出。
 * iter256 で graphical (番号 + StatusBadge + checkbox)、本 iter で **再帰表示**
 * (孫タスク以下も indent tree で見える) を追加 (queue: subtask gap b/4)。
 *
 * 本体機能:
 *   - 既存子孫の **再帰 tree 表示** (status badge / checkbox / 番号 / line-through)
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
import { ItemCheckbox } from './item-checkbox'
import { StatusBadge } from './status-badge'
import { parseBulkSubtaskTitles } from './subtasks-panel-helpers'

interface Props {
  workspaceId: string
  parent: Item
}

/** 再帰 tree の最大深さ。これを超えると indent が破綻するので警告のみ表示。 */
const MAX_TREE_DEPTH = 6

/**
 * 1 件の subtask + その子孫を再帰描画する node component。
 *
 * 視覚的グルーピング (queue: タスクでのグルーピングもっとわかりやすく):
 *   - **子を持つ node** = 「group container」として描画 (淡い slate 背景 + ring +
 *     角丸)。中に親 row + 子 ol を入れ、「このタスクの中に子タスクが入ってる」
 *     ことを視覚で伝える
 *   - **leaf node** (子無し) = 通常 border row のみ
 *
 * 各深さで番号は 1 から再開 (深さで一意性を担保するため `data-depth` を持つ)。
 */
function SubtaskTreeNode({
  item,
  index,
  depth,
  allItems,
  workspaceId,
}: {
  item: Item
  index: number
  depth: number
  allItems: Item[]
  workspaceId: string
}) {
  const isDone = item.status === 'done'
  const fullPath = fullPathOf({ id: item.id, parentPath: item.parentPath })
  const grandchildren = allItems
    .filter((i) => !i.deletedAt && i.parentPath === fullPath)
    .sort((a, b) => a.position.localeCompare(b.position))
  const hasChildren = grandchildren.length > 0
  const overDepth = depth + 1 >= MAX_TREE_DEPTH

  /** 親 row 自体の描画。group container 内では border 不要 (親 wrapper が ring 持つ)。 */
  const headerRow = (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 text-sm ${
        hasChildren ? 'bg-card rounded border' : 'rounded border'
      }`}
      data-testid={`subtask-header-${item.id}`}
    >
      <ItemCheckbox item={item} workspaceId={workspaceId} />
      <span
        className="bg-muted text-muted-foreground inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] tabular-nums ring-1 ring-inset ring-slate-200"
        aria-label={`${index + 1} 番目 (深さ ${depth + 1})`}
        data-testid={`subtask-step-${item.id}`}
      >
        {index + 1}
      </span>
      <StatusBadge
        status={item.status}
        className="text-[10px]"
        data-testid={`subtask-status-${item.id}`}
      />
      <span
        className={`flex-1 truncate ${isDone ? 'text-muted-foreground line-through' : ''}`}
      >
        {item.title}
      </span>
      {hasChildren && (
        <span
          className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-slate-700"
          role="img"
          aria-label={`このタスクには子タスクが ${grandchildren.length} 件あります`}
          data-testid={`subtask-childcount-${item.id}`}
        >
          {grandchildren.length} 件
        </span>
      )}
      {item.isMust && (
        <span
          className="rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-700"
          role="img"
          aria-label="MUST タスク"
        >
          MUST
        </span>
      )}
    </div>
  )

  return (
    <li className="space-y-1" data-testid={`subtask-${item.id}`} data-depth={depth}>
      {hasChildren ? (
        <div
          className="space-y-2 rounded-lg bg-slate-50/60 p-1.5 ring-1 ring-slate-200 dark:bg-slate-900/30 dark:ring-slate-800"
          data-testid={`subtask-group-${item.id}`}
          role="group"
          aria-label={`グループ「${item.title}」 (子タスク ${grandchildren.length} 件)`}
        >
          {headerRow}
          {!overDepth && (
            <ol
              className="ml-4 space-y-1 border-l-2 border-slate-300 pl-3 dark:border-slate-700"
              data-testid={`subtask-children-${item.id}`}
              aria-label={`「${item.title}」の子タスク ${grandchildren.length} 件`}
            >
              {grandchildren.map((g, gIdx) => (
                <SubtaskTreeNode
                  key={g.id}
                  item={g}
                  index={gIdx}
                  depth={depth + 1}
                  allItems={allItems}
                  workspaceId={workspaceId}
                />
              ))}
            </ol>
          )}
          {overDepth && (
            <p className="ml-4 text-[10px] text-amber-700" role="status">
              ⚠ 深さ {MAX_TREE_DEPTH} を超える子タスクは省略 ({grandchildren.length} 件)
            </p>
          )}
        </div>
      ) : (
        headerRow
      )}
    </li>
  )
}

export function SubtasksPanel({ workspaceId, parent }: Props) {
  const items = useItems(workspaceId)
  const create = useCreateItem(workspaceId)
  const [bulkText, setBulkText] = useState('')

  const parentFullPath = fullPathOf({ id: parent.id, parentPath: parent.parentPath })
  const allItems = items.data ?? []

  const children = allItems
    .filter((i) => !i.deletedAt && i.parentPath === parentFullPath)
    .sort((a, b) => a.position.localeCompare(b.position))

  /** 再帰総数 (孫以下も含めた直接 + 間接 子孫の件数)。h3 に表示。 */
  const totalDescendants = allItems.filter(
    (i) =>
      !i.deletedAt &&
      i.parentPath !== '' &&
      i.parentPath !== parent.parentPath &&
      (i.parentPath === parentFullPath || i.parentPath.startsWith(`${parentFullPath}.`)),
  ).length

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
          <span className="sr-only">
            {totalDescendants > children.length
              ? `子タスク 直下 ${children.length} 件 / 子孫合計 ${totalDescendants} 件`
              : `既存の子タスク ${children.length} 件`}
          </span>
          <span aria-hidden="true">
            既存の子タスク ({children.length}
            {totalDescendants > children.length && (
              <span className="text-muted-foreground"> / 子孫 {totalDescendants}</span>
            )}
            )
          </span>
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
          <ol
            className="space-y-1"
            data-testid="subtasks-list"
            aria-label={`子タスク 全 ${children.length} 件 (子孫含め ${totalDescendants} 件)`}
          >
            {children.map((c, idx) => (
              <SubtaskTreeNode
                key={c.id}
                item={c}
                index={idx}
                depth={0}
                allItems={allItems}
                workspaceId={workspaceId}
              />
            ))}
          </ol>
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
