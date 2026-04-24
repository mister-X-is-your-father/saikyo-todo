'use client'

/**
 * Backlog View (2nd ViewPlugin)。
 * - @tanstack/react-table でカラム定義・ソート
 * - @tanstack/react-virtual で行仮想化 (~1000 件想定でも軽い)
 * - フィルタは親から URL 由来 (nuqs) の値が Item[] に適用済みで渡ってくる前提
 *
 * columns: status / title / MUST / dueDate / updatedAt
 */
import { useMemo, useRef, useState } from 'react'

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

import type { Item } from '@/features/item/schema'

import { ItemDecomposeButton } from './item-decompose-button'
import { ItemResearchButton } from './item-research-button'
import { StatusBadge } from './status-badge'

interface Props {
  workspaceId: string
  items: Item[]
}

function buildColumns(workspaceId: string): ColumnDef<Item>[] {
  return [
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    {
      accessorKey: 'title',
      header: 'タイトル',
      size: 360,
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
      size: 220,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <ItemDecomposeButton workspaceId={workspaceId} item={row.original} />
          <ItemResearchButton workspaceId={workspaceId} item={row.original} />
        </div>
      ),
    },
  ]
}

export function BacklogView({ workspaceId, items }: Props) {
  const columns = useMemo(() => buildColumns(workspaceId), [workspaceId])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }])

  const data = useMemo(() => items.filter((i) => !i.deletedAt), [items])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 8,
  })

  return (
    <div
      ref={scrollRef}
      data-testid="backlog-view"
      className="h-[600px] overflow-auto rounded-lg border"
    >
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted sticky top-0 z-10">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  style={{ width: h.getSize() }}
                  onClick={h.column.getToggleSortingHandler()}
                  className="cursor-pointer border-b px-3 py-2 text-left font-semibold"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            display: 'block',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const row = rows[vRow.index]
            if (!row) return null
            return (
              <tr
                key={row.id}
                data-testid={`backlog-row-${row.original.id}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${vRow.start}px)`,
                  display: 'table',
                  width: '100%',
                  tableLayout: 'fixed',
                }}
                className="hover:bg-muted/50 border-b"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ width: cell.column.getSize() }} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-muted-foreground py-8 text-center">
                表示する item がありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
