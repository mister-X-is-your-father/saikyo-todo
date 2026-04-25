'use client'

/**
 * Kanban View (第 1 号 ViewPlugin)。
 * - status 列 = workspace_statuses (order 昇順)
 * - 各列は該当 status の item を position 順で並べる
 * - DnD:
 *   - 別列に drop → useUpdateItemStatus (楽観更新)
 *   - 同列内で drop → useReorderItem (楽観更新)
 *
 * 注意: position は items 全体で共有の numeric lex (fractional-indexing) なので、
 *       別列間で drop した時は status だけ変えて position は据置き (MVP 簡易実装)。
 */
import { useMemo, useState } from 'react'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
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
import { toast } from 'sonner'

import { uuidToLabel } from '@/lib/db/ltree-path'
import { isAppError } from '@/lib/errors'

import { useReorderItem, useUpdateItemStatus } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'
import { useWorkspaceStatuses } from '@/features/workspace/hooks'

import { ItemCheckbox } from './item-checkbox'
import { ItemDecomposeButton } from './item-decompose-button'
import { ItemEditDialog } from './item-edit-dialog'

interface Props {
  workspaceId: string
  items: Item[]
  currentUserId?: string
}

export function KanbanView({ workspaceId, items, currentUserId }: Props) {
  const { data: statuses } = useWorkspaceStatuses(workspaceId)
  const updateStatus = useUpdateItemStatus(workspaceId)
  const reorder = useReorderItem(workspaceId)
  const [editing, setEditing] = useState<Item | null>(null)

  const sensors = useSensors(
    // 5px 以上動いてから drag 開始 (click と区別するため)
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const itemsByStatus = useMemo(() => {
    const groups = new Map<string, Item[]>()
    for (const s of statuses ?? []) groups.set(s.key, [])
    for (const item of items) {
      if (item.deletedAt) continue
      const list = groups.get(item.status) ?? []
      list.push(item)
      groups.set(item.status, list)
    }
    // 各列 position 昇順
    for (const [key, list] of groups) {
      list.sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
      groups.set(key, list)
    }
    return groups
  }, [items, statuses])

  // parent_path から子カウントを逆引き (各 Kanban カード下に表示)
  const childCountByItemId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const parent of items) {
      const parentLabel = uuidToLabel(parent.id)
      // 自分の直下の parent_path は 既存 parent_path + '.' + parentLabel
      const childPath =
        parent.parentPath === '' ? parentLabel : `${parent.parentPath}.${parentLabel}`
      let n = 0
      for (const maybeChild of items) {
        if (maybeChild.deletedAt) continue
        if (maybeChild.parentPath === childPath) n += 1
      }
      counts.set(parent.id, n)
    }
    return counts
  }, [items])

  function findContainerAndIndex(itemId: string): { status: string; index: number } | null {
    for (const [status, list] of itemsByStatus) {
      const idx = list.findIndex((i) => i.id === itemId)
      if (idx >= 0) return { status, index: idx }
    }
    return null
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const src = findContainerAndIndex(activeId)
    if (!src) return
    const activeItem = itemsByStatus.get(src.status)?.[src.index]
    if (!activeItem) return

    // over が status key (空列に drop) か item id か
    const overIsStatus = statuses?.some((s) => s.key === overId) ?? false
    const destStatus = overIsStatus ? overId : findContainerAndIndex(overId)?.status
    if (!destStatus) return

    if (destStatus !== src.status) {
      // 別列に drop → status 変更のみ
      try {
        await updateStatus.mutateAsync({
          id: activeItem.id,
          expectedVersion: activeItem.version,
          status: destStatus,
        })
      } catch (e) {
        toast.error(isAppError(e) ? e.message : 'ステータス変更に失敗')
      }
      return
    }

    // 同列内 → reorder
    const colItems = itemsByStatus.get(src.status) ?? []
    const destIdx = colItems.findIndex((i) => i.id === overId)
    if (destIdx < 0 || destIdx === src.index) return
    const next = arrayMove(colItems, src.index, destIdx)
    const newIdx = next.findIndex((i) => i.id === activeItem.id)
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

  if (!statuses) {
    return <p className="text-muted-foreground text-sm">列定義を読み込み中...</p>
  }

  return (
    <>
      <ItemEditDialog
        workspaceId={workspaceId}
        item={editing}
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null)
        }}
        currentUserId={currentUserId}
      />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(260px, 1fr))` }}
          data-testid="kanban-board"
        >
          {statuses.map((s) => (
            <KanbanColumn
              key={s.key}
              workspaceId={workspaceId}
              statusKey={s.key}
              label={s.label}
              color={s.color}
              items={itemsByStatus.get(s.key) ?? []}
              childCountByItemId={childCountByItemId}
              onEdit={(item) => setEditing(item)}
            />
          ))}
        </div>
      </DndContext>
    </>
  )
}

function KanbanColumn({
  workspaceId,
  statusKey,
  label,
  color,
  items,
  childCountByItemId,
  onEdit,
}: {
  workspaceId: string
  statusKey: string
  label: string
  color: string
  items: Item[]
  childCountByItemId: Map<string, number>
  onEdit: (item: Item) => void
}) {
  // 空カラムや、カード外へのドロップを受けるため列全体を droppable にする
  // (id は statusKey なので handleDragEnd の overIsStatus 分岐に入る)
  const { setNodeRef, isOver } = useDroppable({ id: statusKey })
  return (
    <div
      ref={setNodeRef}
      className={`bg-card rounded-lg border p-3 ${isOver ? 'ring-primary ring-2' : ''}`}
      data-testid={`kanban-column-${statusKey}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color }}>
          {label}
        </h3>
        <span className="text-muted-foreground text-xs">{items.length}</span>
      </div>
      <SortableContext
        id={statusKey}
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-16 space-y-2" data-droppable-status={statusKey}>
          {items.length === 0 ? (
            <div className="text-muted-foreground rounded border border-dashed px-2 py-4 text-center text-xs">
              ここにドロップ
            </div>
          ) : (
            items.map((item) => (
              <KanbanCard
                key={item.id}
                item={item}
                workspaceId={workspaceId}
                childCount={childCountByItemId.get(item.id) ?? 0}
                onEdit={onEdit}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function KanbanCard({
  item,
  workspaceId,
  childCount,
  onEdit,
}: {
  item: Item
  workspaceId: string
  childCount: number
  onEdit: (item: Item) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-background group cursor-grab rounded border p-2 text-sm shadow-sm active:cursor-grabbing"
      data-testid={`kanban-card-${item.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <ItemCheckbox item={item} workspaceId={workspaceId} className="mt-0.5" />
          <div
            className={`font-medium break-words ${item.doneAt ? 'text-muted-foreground line-through' : ''}`}
          >
            {item.title}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.isMust && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
              MUST
            </span>
          )}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            aria-label="編集"
            className="text-muted-foreground hover:text-foreground rounded px-1 text-xs"
            data-testid={`kanban-edit-${item.id}`}
          >
            ✎
          </button>
        </div>
      </div>
      {(item.startDate || item.dueDate) && (
        <div className="text-muted-foreground mt-1 text-[11px]">
          {item.startDate ? `開始: ${item.startDate}` : ''}
          {item.startDate && item.dueDate ? ' / ' : ''}
          {item.dueDate ? `期限: ${item.dueDate}` : ''}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        {childCount > 0 ? (
          <span
            className="text-muted-foreground bg-muted inline-flex items-center rounded-full px-2 py-0.5 text-[10px]"
            data-testid={`kanban-child-count-${item.id}`}
          >
            子 {childCount} 件
          </span>
        ) : (
          <span />
        )}
        <div
          className="opacity-0 transition-opacity group-hover:opacity-100"
          data-testid={`kanban-decompose-wrapper-${item.id}`}
        >
          <ItemDecomposeButton workspaceId={workspaceId} item={item} />
        </div>
      </div>
    </div>
  )
}
