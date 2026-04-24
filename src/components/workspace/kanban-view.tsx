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
import { useMemo } from 'react'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
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

import { isAppError } from '@/lib/errors'

import { useReorderItem, useUpdateItemStatus } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'
import { useWorkspaceStatuses } from '@/features/workspace/hooks'

interface Props {
  workspaceId: string
  items: Item[]
}

export function KanbanView({ workspaceId, items }: Props) {
  const { data: statuses } = useWorkspaceStatuses(workspaceId)
  const updateStatus = useUpdateItemStatus(workspaceId)
  const reorder = useReorderItem(workspaceId)

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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(260px, 1fr))` }}
        data-testid="kanban-board"
      >
        {statuses.map((s) => (
          <KanbanColumn
            key={s.key}
            statusKey={s.key}
            label={s.label}
            color={s.color}
            items={itemsByStatus.get(s.key) ?? []}
          />
        ))}
      </div>
    </DndContext>
  )
}

function KanbanColumn({
  statusKey,
  label,
  color,
  items,
}: {
  statusKey: string
  label: string
  color: string
  items: Item[]
}) {
  return (
    <div className="bg-card rounded-lg border p-3" data-testid={`kanban-column-${statusKey}`}>
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
        <div className="min-h-8 space-y-2" data-droppable-status={statusKey}>
          {items.length === 0 ? (
            <div className="text-muted-foreground rounded border border-dashed px-2 py-4 text-center text-xs">
              カードなし
            </div>
          ) : (
            items.map((item) => <KanbanCard key={item.id} item={item} />)
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function KanbanCard({ item }: { item: Item }) {
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
      className="bg-background cursor-grab rounded border p-2 text-sm shadow-sm active:cursor-grabbing"
      data-testid={`kanban-card-${item.id}`}
    >
      <div className="font-medium">{item.title}</div>
      {item.isMust && <span className="text-xs text-red-500">MUST</span>}
    </div>
  )
}
