'use client'

/**
 * Backlog View (2nd ViewPlugin)。
 * - @tanstack/react-table でカラム定義・ソート
 * - @dnd-kit/sortable で行並び替え (position ソート時のみ有効)
 * - フィルタは親から URL 由来 (nuqs) の値が Item[] に適用済みで渡ってくる前提
 *
 * columns: drag / checkbox / status / title / MUST / dueDate / updatedAt / actions
 * 初期ソート: position (手動並び替えを活かす)
 */
import { useMemo, useState } from 'react'

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
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { parseAsString, useQueryState } from 'nuqs'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useReorderItem } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'

import { BulkCheckbox, BulkHeaderCheckbox } from './bulk-action-bar'
import { ItemCheckbox } from './item-checkbox'
import { ItemDecomposeButton } from './item-decompose-button'
import { ItemResearchButton } from './item-research-button'
import { StatusBadge } from './status-badge'

interface Props {
  workspaceId: string
  items: Item[]
  currentUserId?: string
}

function buildColumns(workspaceId: string, onEdit: (item: Item) => void): ColumnDef<Item>[] {
  return [
    {
      id: 'drag',
      header: '',
      size: 28,
      enableSorting: false,
      cell: () => <DragHandle />,
    },
    {
      id: 'select',
      header: ({ table }) => (
        <BulkHeaderCheckbox rowIds={table.getRowModel().rows.map((r) => r.original.id)} />
      ),
      size: 28,
      enableSorting: false,
      cell: ({ row }) => <BulkCheckbox itemId={row.original.id} />,
    },
    {
      id: 'checkbox',
      header: '',
      size: 40,
      enableSorting: false,
      cell: ({ row }) => <ItemCheckbox item={row.original} workspaceId={workspaceId} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    {
      accessorKey: 'title',
      header: 'タイトル',
      size: 340,
      cell: ({ getValue, row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(row.original)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={
            'hover:text-primary text-left hover:underline ' +
            (row.original.doneAt ? 'text-muted-foreground line-through' : '')
          }
          data-testid={`backlog-title-${row.original.id}`}
        >
          {String(getValue())}
        </button>
      ),
    },
    {
      accessorKey: 'isMust',
      header: 'MUST',
      size: 70,
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
            MUST
          </span>
        ) : null,
    },
    {
      accessorKey: 'dueDate',
      header: '期限',
      size: 110,
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
    {
      accessorKey: 'updatedAt',
      header: '更新',
      size: 150,
      cell: ({ getValue }) => {
        const v = getValue() as Date | string | null
        if (!v) return '—'
        const d = typeof v === 'string' ? new Date(v) : v
        return d.toISOString().slice(0, 19).replace('T', ' ')
      },
    },
    {
      id: 'actions',
      header: 'アクション',
      size: 300,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(row.original)}
            data-testid={`backlog-edit-${row.original.id}`}
          >
            編集
          </Button>
          <ItemDecomposeButton workspaceId={workspaceId} item={row.original} />
          <ItemResearchButton workspaceId={workspaceId} item={row.original} />
        </div>
      ),
    },
  ]
}

export function BacklogView({ workspaceId, items }: Props) {
  // Phase 6.15 iter 77: ItemEditDialog の open 状態を items-board と同じく URL `?item=`
  // で共有 (他 view と同パターン)。currentUserId は items-board 側 dialog で使われる。
  const [, setOpenItemId] = useQueryState('item', parseAsString)
  const columns = useMemo(
    () => buildColumns(workspaceId, (item) => void setOpenItemId(item.id)),
    [workspaceId, setOpenItemId],
  )
  // 初期は position ソート (手動並び替えを効かせる)。ユーザが他列 header を click した場合のみ再ソート。
  const [sorting, setSorting] = useState<SortingState>([])

  const data = useMemo(() => {
    const visible = items.filter((i) => !i.deletedAt)
    // position 昇順 (同率 position は createdAt で fallback)
    visible.sort((a, b) => {
      if (a.position !== b.position) return a.position < b.position ? -1 : 1
      return (a.createdAt ?? 0) < (b.createdAt ?? 0) ? -1 : 1
    })
    return visible
  }, [items])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  })

  const rows = table.getRowModel().rows
  const rowIds = useMemo(() => rows.map((r) => r.original.id), [rows])

  // DnD は sort が無指定 (= position 昇順) の時のみ有効
  const dndEnabled = sorting.length === 0

  const reorder = useReorderItem(workspaceId)
  const sensors = useSensors(
    // Mouse: 5px 動かないと drag 開始しない (click と区別)
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: 250ms 長押し + 5px 以内なら drag 開始 (スクロールと区別)。
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const srcIdx = rows.findIndex((r) => r.original.id === activeId)
    const dstIdx = rows.findIndex((r) => r.original.id === overId)
    if (srcIdx < 0 || dstIdx < 0) return
    const activeItem = rows[srcIdx]?.original
    if (!activeItem) return
    const next = arrayMove(rows, srcIdx, dstIdx)
    const newIdx = next.findIndex((r) => r.original.id === activeId)
    const prev = newIdx > 0 ? next[newIdx - 1]?.original : null
    const nextSib = newIdx < next.length - 1 ? next[newIdx + 1]?.original : null
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

  // 親の items-board が同じ ?item= を見て ItemEditDialog を開くので、Backlog 側では
  // dialog を rendering しない (重複描画を避ける)。これで全 view 共通の URL 駆動 UX に揃う。

  return (
    <>
      <div data-testid="backlog-view" className="max-h-[600px] overflow-auto rounded-lg border">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              バックログ一覧 (DnD で並び替え可能 / 列ヘッダ click で sort)
            </caption>
            <thead className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted() as 'asc' | 'desc' | false
                    const ariaSort: 'ascending' | 'descending' | 'none' | undefined =
                      h.column.getCanSort()
                        ? sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    const sortHandler = h.column.getCanSort()
                      ? h.column.getToggleSortingHandler()
                      : undefined
                    const sortLabel =
                      sorted === 'asc' ? '昇順' : sorted === 'desc' ? '降順' : '未ソート'
                    const headerText = flexRender(h.column.columnDef.header, h.getContext())
                    return (
                      <th
                        key={h.id}
                        scope="col"
                        aria-sort={ariaSort}
                        tabIndex={h.column.getCanSort() ? 0 : undefined}
                        aria-label={
                          h.column.getCanSort()
                            ? `列ソート (現在: ${sortLabel}) — Enter / Space で切替`
                            : undefined
                        }
                        style={{ width: h.getSize() }}
                        onClick={sortHandler}
                        onKeyDown={
                          h.column.getCanSort()
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  h.column.toggleSorting()
                                }
                              }
                            : undefined
                        }
                        className={`focus-visible:ring-foreground border-b px-3 py-2 text-left font-semibold focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${
                          h.column.getCanSort() ? 'cursor-pointer' : ''
                        }`}
                      >
                        {headerText}
                        {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              <SortableContext
                items={rowIds}
                strategy={verticalListSortingStrategy}
                disabled={!dndEnabled}
              >
                {rows.map((row) => (
                  <BacklogRow key={row.original.id} row={row} dndEnabled={dndEnabled} />
                ))}
              </SortableContext>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="text-muted-foreground py-8 text-center">
                    表示する item がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
      {!dndEnabled && (
        <p className="text-muted-foreground mt-2 text-xs">
          並び替えは列のソートを解除してから (position 順表示中のみ DnD 可能)
        </p>
      )}
    </>
  )
}

function BacklogRow({ row, dndEnabled }: { row: Row<Item>; dndEnabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.original.id,
    disabled: !dndEnabled,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <tr
      ref={setNodeRef}
      style={style}
      data-testid={`backlog-row-${row.original.id}`}
      className="hover:bg-muted/50 border-b"
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          style={{ width: cell.column.getSize() }}
          className="px-3 py-2"
          {...(cell.column.id === 'drag' && dndEnabled ? { ...attributes, ...listeners } : {})}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  )
}

function DragHandle() {
  return (
    <span
      className="text-muted-foreground cursor-grab select-none active:cursor-grabbing"
      aria-label="ドラッグで並び替え"
      data-testid="backlog-drag-handle"
    >
      ≡
    </span>
  )
}
