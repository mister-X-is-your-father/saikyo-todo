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
import { type KeyboardEvent as ReactKeyboardEvent, useState } from 'react'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeftFromLine, ArrowRightFromLine, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

import { fullPathOf } from '@/lib/db/ltree-path'
import { isAppError } from '@/lib/errors'

import { useCreateItem, useItems, useMoveItem, useReorderItem } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

import { DecomposeProposalsPanel } from './decompose-proposals-panel'
import { ItemCheckbox } from './item-checkbox'
import { MustBadge } from './must-badge'
import { StatusBadge } from './status-badge'
import {
  compareSiblings,
  findGrandparentId,
  findPrevSibling,
  parseBulkSubtaskTitles,
} from './subtasks-panel-helpers'

interface Props {
  workspaceId: string
  parent: Item
}

/** 再帰 tree の最大深さ。これを超えると indent が破綻するので警告のみ表示。 */
const MAX_TREE_DEPTH = 6

/**
 * 1 件の subtask + その子孫を再帰描画する node component。
 *
 * 視覚的グルーピング:
 *   - **子を持つ node** = 「group container」として描画 (淡い slate 背景 + ring +
 *     角丸)。中に親 row + 子 ol を入れ、子タスクが内側に居るのを視覚で伝える
 *   - **leaf node** (子無し) = 通常 border row のみ
 *
 * DnD (本 iter で追加):
 *   - 各 row に GripVertical の drag handle を付与、`useSortable` で sortable 化
 *   - 同 parent 内 sibling の reorder のみ対応 (cross-parent move = indent は別 iter)
 *   - 各深さの `<ol>` が独立した SortableContext なので、SortableContext を跨いだ
 *     drop は親 (SubtasksPanel の DndContext) の onDragEnd で同 parent 確認 + 拒否
 */
function SubtaskTreeNode({
  item,
  index,
  depth,
  allItems,
  workspaceId,
  onIndent,
  onOutdent,
  movePending,
}: {
  item: Item
  index: number
  depth: number
  allItems: Item[]
  workspaceId: string
  onIndent: (item: Item) => void
  onOutdent: (item: Item) => void
  movePending: boolean
}) {
  const isDone = item.status === 'done'
  const fullPath = fullPathOf({ id: item.id, parentPath: item.parentPath })
  const grandchildren = allItems
    .filter((i) => !i.deletedAt && i.parentPath === fullPath)
    .sort(compareSiblings)
  const hasChildren = grandchildren.length > 0
  const overDepth = depth + 1 >= MAX_TREE_DEPTH

  // iter290 P0: indent/outdent 可否は同期計算で disabled 切替に流す
  const canIndent = findPrevSibling(item, allItems) !== null && depth + 1 < MAX_TREE_DEPTH
  const canOutdent = findGrandparentId(item, allItems) !== null

  // DnD: row 自体を sortable に。drag handle のみが pointer hold/drag を起動。
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  /** Alt+←/→ keyboard で outdent/indent (focus は drag handle / row 全体)。 */
  function onRowKeyDown(e: ReactKeyboardEvent<HTMLLIElement>) {
    if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
    if (e.key === 'ArrowRight') {
      if (!canIndent || movePending) return
      e.preventDefault()
      onIndent(item)
    } else if (e.key === 'ArrowLeft') {
      if (!canOutdent || movePending) return
      e.preventDefault()
      onOutdent(item)
    }
  }

  /** 親 row 自体の描画。group container 内では bg-card で wrapper の slate と差別化。 */
  const headerRow = (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 text-sm ${
        hasChildren ? 'bg-card rounded border' : 'rounded border'
      }`}
      data-testid={`subtask-header-${item.id}`}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground -ml-1 cursor-grab touch-none active:cursor-grabbing"
        aria-label={`「${item.title}」をドラッグで並び替え`}
        data-testid={`subtask-drag-${item.id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <ItemCheckbox item={item} workspaceId={workspaceId} />
      <span
        className="bg-muted text-muted-foreground inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] tabular-nums ring-1 ring-slate-200 ring-inset"
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
      <span className={`flex-1 truncate ${isDone ? 'text-muted-foreground line-through' : ''}`}>
        {item.title}
      </span>
      {hasChildren && (
        <span
          className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 tabular-nums"
          role="img"
          aria-label={`このタスクには子タスクが ${grandchildren.length} 件あります`}
          data-testid={`subtask-childcount-${item.id}`}
        >
          {grandchildren.length} 件
        </span>
      )}
      {item.isMust && <MustBadge />}
      {/* iter290 P0 (queue: subtask gap d/4): indent/outdent buttons + Alt+←/→ keyboard */}
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
        onClick={() => onOutdent(item)}
        disabled={!canOutdent || movePending}
        data-testid={`subtask-outdent-${item.id}`}
        aria-label={
          !canOutdent
            ? `「${item.title}」は root のためアウトデント不可`
            : movePending
              ? `「${item.title}」を移動中…`
              : `「${item.title}」を 1 段アウトデント (Alt+←)`
        }
        title="アウトデント (Alt+←)"
      >
        <ArrowLeftFromLine className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
        onClick={() => onIndent(item)}
        disabled={!canIndent || movePending}
        data-testid={`subtask-indent-${item.id}`}
        aria-label={
          !canIndent
            ? depth + 1 >= MAX_TREE_DEPTH
              ? `深さ ${MAX_TREE_DEPTH} を超えるためインデント不可`
              : `「${item.title}」の前に sibling が無いためインデント不可`
            : movePending
              ? `「${item.title}」を移動中…`
              : `「${item.title}」を 1 段インデント (Alt+→)`
        }
        title="インデント (Alt+→)"
      >
        <ArrowRightFromLine className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )

  return (
    <li
      ref={setNodeRef}
      style={sortableStyle}
      className="space-y-1 outline-none focus-within:ring-1 focus-within:ring-blue-200"
      data-testid={`subtask-${item.id}`}
      data-depth={depth}
      tabIndex={-1}
      onKeyDown={onRowKeyDown}
    >
      {hasChildren ? (
        <div
          className="space-y-2 rounded-lg bg-slate-50/60 p-1.5 ring-1 ring-slate-200 dark:bg-slate-900/30 dark:ring-slate-800"
          data-testid={`subtask-group-${item.id}`}
          role="group"
          aria-label={`グループ「${item.title}」 (子タスク ${grandchildren.length} 件)`}
        >
          {headerRow}
          {!overDepth && (
            <SortableContext
              items={grandchildren.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
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
                    onIndent={onIndent}
                    onOutdent={onOutdent}
                    movePending={movePending}
                  />
                ))}
              </ol>
            </SortableContext>
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
  const reorder = useReorderItem(workspaceId)
  const move = useMoveItem(workspaceId)
  const [bulkText, setBulkText] = useState('')

  const parentFullPath = fullPathOf({ id: parent.id, parentPath: parent.parentPath })
  const allItems = items.data ?? []

  const children = allItems
    .filter((i) => !i.deletedAt && i.parentPath === parentFullPath)
    .sort(compareSiblings)

  /**
   * iter290 P0 (queue: subtask gap d/4): 1 段 indent。前 sibling の子になる。
   * 前 sibling 不在 / depth 超過は button 側で disabled になっているので呼ばれない。
   */
  async function handleIndent(target: Item) {
    const prev = findPrevSibling(target, allItems)
    if (!prev) {
      toast.warning('インデント先の前 sibling がありません')
      return
    }
    try {
      await move.mutateAsync({ id: target.id, newParentItemId: prev.id })
      toast.success(`「${target.title}」を 1 段インデントしました`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'インデントに失敗')
    }
  }

  /**
   * iter290 P0: 1 段 outdent。祖父の子になる ('root' sentinel → root 直下)。
   */
  async function handleOutdent(target: Item) {
    const grandId = findGrandparentId(target, allItems)
    if (grandId === null) {
      toast.warning('これ以上アウトデントできません (既に root)')
      return
    }
    const newParentItemId = grandId === 'root' ? null : grandId
    try {
      await move.mutateAsync({ id: target.id, newParentItemId })
      toast.success(`「${target.title}」を 1 段アウトデントしました`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'アウトデントに失敗')
    }
  }

  /** 再帰総数 (孫以下も含めた直接 + 間接 子孫の件数)。h3 に表示。 */
  const totalDescendants = allItems.filter(
    (i) =>
      !i.deletedAt &&
      i.parentPath !== '' &&
      i.parentPath !== parent.parentPath &&
      (i.parentPath === parentFullPath || i.parentPath.startsWith(`${parentFullPath}.`)),
  ).length

  // DnD: backlog-view と同じ sensor 設定 (mouse 5px / touch 250ms 長押し)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  /**
   * drag end ハンドラ。同 parent_path 内のみ reorder 可、cross-parent は拒否
   * (= cross-parent move は次 iter の indent/outdent で対応予定)。
   */
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeItem = allItems.find((i) => i.id === String(active.id))
    const overItem = allItems.find((i) => i.id === String(over.id))
    if (!activeItem || !overItem) return
    if (activeItem.parentPath !== overItem.parentPath) {
      // iter290 P0: 親をまたぐ移動は indent / outdent 専用 button (Alt+←/→) で
      toast.warning('親をまたぐ移動は indent / outdent ボタン (Alt+←/→) で操作してください')
      return
    }
    // 同 parent の siblings をソート → arrayMove → 前後を計算 → reorder action
    const siblings = allItems
      .filter((i) => !i.deletedAt && i.parentPath === activeItem.parentPath)
      .sort((a, b) => a.position.localeCompare(b.position))
    const srcIdx = siblings.findIndex((s) => s.id === activeItem.id)
    const dstIdx = siblings.findIndex((s) => s.id === overItem.id)
    if (srcIdx < 0 || dstIdx < 0) return
    const next = arrayMove(siblings, srcIdx, dstIdx)
    const newIdx = next.findIndex((s) => s.id === activeItem.id)
    const prev = newIdx > 0 ? next[newIdx - 1] : null
    const nextSib = newIdx < next.length - 1 ? next[newIdx + 1] : null
    try {
      await reorder.mutateAsync({
        id: activeItem.id,
        expectedVersion: activeItem.version,
        prevSiblingId: prev?.id ?? null,
        nextSiblingId: nextSib?.id ?? null,
      })
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '並び替えに失敗')
    }
  }

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={children.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
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
                    onIndent={handleIndent}
                    onOutdent={handleOutdent}
                    movePending={move.isPending}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
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
