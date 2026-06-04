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

import { pointerFirstCollision } from '@/lib/dnd/pointer-first-collision'
import { isAppError } from '@/lib/errors'

import { formatFriendlyDate } from '@/features/item/date-tokens'
import { formatItemEstimateSummary, summarizeItemEstimates } from '@/features/item/estimate'
import { useReorderItem } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'

import { BulkCheckbox, BulkHeaderCheckbox } from './bulk-action-bar'
import { ItemCheckbox } from './item-checkbox'
import { ItemDecomposeButton } from './item-decompose-button'
import { ItemResearchButton } from './item-research-button'
import { MustBadge } from './must-badge'
import { StartTimerButton } from './start-timer-button'
import { StatusBadge } from './status-badge'

interface Props {
  workspaceId: string
  items: Item[]
  currentUserId?: string
}

function buildColumns(
  workspaceId: string,
  onEdit: (item: Item) => void,
  today: Date,
): ColumnDef<Item>[] {
  return [
    {
      id: 'drag',
      header: () => <span className="sr-only">並び替え</span>,
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
      cell: ({ row }) => <BulkCheckbox itemId={row.original.id} itemTitle={row.original.title} />,
    },
    {
      id: 'checkbox',
      header: () => <span className="sr-only">完了切替</span>,
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
            'hover:text-primary focus-visible:ring-ring rounded text-left hover:underline focus-visible:ring-2 focus-visible:outline-none ' +
            (row.original.doneAt ? 'text-muted-foreground line-through' : '')
          }
          data-testid={`backlog-title-${row.original.id}`}
          // iter1158: 旧 aria-label `「title」を編集` は visible "{title}" を位置 1
          // (「」内) に持ち voice control prefix-matching「click {title}」 match 不可
          // (substring 一致のみ)。iter1093-1157 sweep (kanban/today/period-title と
          // 同 pattern) に揃え visible title 冒頭固定 + em-dash 区切で descriptive 末尾。
          // sibling backlog-edit (iter1152 修正済) と差別化のため title 始まり (= 編集
          // icon button は "編集 — ..." 始まり)。
          aria-label={`${String(getValue())} — 編集`}
          /* iter2157: backlog-title button は title 無で aria-label
             "${title} — 編集" の "編集" context が sighted hover で disclose
             されない。inbox-view iter2155 / today-view iter2153 / personal-period
             iter2151 と同 title=aria-label sync pattern。 */
          title={`${String(getValue())} — 編集`}
        >
          <span aria-hidden="true">{String(getValue())}</span>
        </button>
      ),
    },
    {
      accessorKey: 'isMust',
      header: 'MUST',
      size: 70,
      cell: ({ getValue }) => (getValue() ? <MustBadge /> : null),
    },
    {
      accessorKey: 'dueDate',
      header: '期限',
      size: 110,
      // iter261 basics: ISO `2026-04-30` を `今日` / `明日` / `4/30 (木)` に整形。
      // iter436: <span title> から <time dateTime> 要素に格上げ (HTML5 semantic
      // で SR が日付情報として認識、iter435 command-palette と同 pattern)。
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        if (!v) return '—'
        return (
          <time dateTime={v}>
            <span aria-hidden="true">{formatFriendlyDate(v, today)}</span>
            <span className="sr-only">{`期限 ${v}`}</span>
          </time>
        )
      },
    },
    {
      accessorKey: 'updatedAt',
      header: '更新',
      size: 150,
      cell: ({ getValue }) => {
        const v = getValue() as Date | string | null
        if (!v) return '—'
        const d = typeof v === 'string' ? new Date(v) : v
        const iso = d.toISOString()
        const display = iso.slice(0, 19).replace('T', ' ')
        return (
          <time dateTime={iso}>
            <span aria-hidden="true">{display}</span>
            <span className="sr-only">{`最終更新 ${display}`}</span>
          </time>
        )
      },
    },
    {
      id: 'actions',
      header: 'アクション',
      size: 380,
      enableSorting: false,
      cell: ({ row }) => (
        <div
          className="flex gap-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(row.original)
            }}
            data-testid={`backlog-edit-${row.original.id}`}
            // iter1152: 旧 aria-label `「title」を編集` は visible "編集" を末尾
            // "を**編集**" に持ち voice control prefix-matching「click 編集」
            // match 不可。iter1093-1151 sweep convention に揃え visible "編集"
            // 冒頭固定 + em-dash 区切で title を descriptive 末尾保持。
            aria-label={`編集 — 「${row.original.title}」を編集`}
          >
            <span aria-hidden="true">編集</span>
          </Button>
          <ItemDecomposeButton workspaceId={workspaceId} item={row.original} />
          <ItemResearchButton workspaceId={workspaceId} item={row.original} />
          <StartTimerButton item={row.original} size="sm" />
        </div>
      ),
    },
  ]
}

export function BacklogView({ workspaceId, items }: Props) {
  // Phase 6.15 iter 77: ItemEditDialog の open 状態を items-board と同じく URL `?item=`
  // で共有 (他 view と同パターン)。currentUserId は items-board 側 dialog で使われる。
  const [, setOpenItemId] = useQueryState('item', parseAsString)
  // iter261 basics: dueDate 表示用のカレンダー基準日 (時分秒は無視)。1 render
  // 内で固定するために useMemo (TZ 依存だが UI 側 expectation なので OK)。
  const today = useMemo(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }, [])
  const columns = useMemo(
    () => buildColumns(workspaceId, (item) => void setOpenItemId(item.id), today),
    [workspaceId, setOpenItemId, today],
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

  // iter311 basics: 表示中 items の見積合計を上部に summary chip で出す (FEEDBACK_QUEUE
  // graphical 波及)。done/archive 済も含めた「Backlog で見えてる行」全体の集計。
  const estimateSummary = useMemo(
    () => formatItemEstimateSummary(summarizeItemEstimates(data)),
    [data],
  )

  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        {/* iter1060: role 無 span + aria-label を `role="img"` で
            authoritative 化 (iter1023/1049-1059 同 pattern、role=img sweep
            13 弾目)。Backlog 見積サマリ chip。 */}
        <span
          className="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
          data-testid="backlog-estimate-summary"
          role="img"
          /* iter1564: 旧 aria-label `"Backlog 見積サマリ: ${estimateSummary}"` は visible
             "${estimateSummary}" を末尾に持ち voice control prefix-matching が strict prefix-match
             で不可 (substring 一致のみ)。iter1553-1563 status/role/health/傾向 chip family と同
             pattern、visible 冒頭固定 + em-dash 区切。 */
          aria-label={`${estimateSummary} — Backlog 見積サマリ`}
          /* iter1871: visible は ⏱ + estimateSummary のみで「Backlog 見積サマリ」
             context が消えている。sighted hover で chip 意味 disclose
             (iter1867-1869 title 付与 sweep 続編)。 */
          title={`${estimateSummary} — Backlog 見積サマリ`}
        >
          <span aria-hidden="true">⏱</span>
          <span aria-hidden="true">{estimateSummary}</span>
        </span>
      </div>
      <div data-testid="backlog-view" className="max-h-[600px] overflow-auto rounded-lg border">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerFirstCollision}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              {/* iter1616: 旧 sr-only caption paren convention `(DnD で並び替え可能 / 列ヘッダ click で sort)` は
                  iter1093-1615 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */}
              バックログ一覧 — DnD で並び替え可能 / 列ヘッダ click で sort
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
                    // iter596 basics: aria-label に column name を含める。
                    // h.column.columnDef.header が string なら直接使い、function なら column.id で fallback
                    const headerName =
                      typeof h.column.columnDef.header === 'string'
                        ? h.column.columnDef.header
                        : h.column.id
                    return (
                      <th
                        key={h.id}
                        scope="col"
                        aria-sort={ariaSort}
                        tabIndex={h.column.getCanSort() ? 0 : undefined}
                        aria-label={
                          h.column.getCanSort()
                            ? `${headerName} 列でソート (現在: ${sortLabel}) — Enter / Space で次の状態に切替`
                            : undefined
                        }
                        /* iter2277: backlog sortable th の aria-label "X 列でソート (現在: Y) —
                           Enter / Space で次の状態に切替" は browser tooltip にならず sighted は
                           hover で現在 sort 状態 + 切替 hint disclose 不可。MCP path A で Backlog
                           view に test item ある状態で発見、5 sortable th (Status / タイトル / MUST /
                           期限 / 更新) 全 同時 title 同期、column-header sort feedback の
                           cross-modal 統一。 */
                        title={
                          h.column.getCanSort()
                            ? `${headerName} 列でソート (現在: ${sortLabel}) — Enter / Space で次の状態に切替`
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
                        <span aria-hidden="true">
                          {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
                        </span>
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
                  <BacklogRow
                    key={row.original.id}
                    row={row}
                    dndEnabled={dndEnabled}
                    onEdit={(item) => void setOpenItemId(item.id)}
                  />
                ))}
              </SortableContext>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-muted-foreground py-8 text-center"
                    role="status"
                    aria-live="polite"
                  >
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

function BacklogRow({
  row,
  dndEnabled,
  onEdit,
}: {
  row: Row<Item>
  dndEnabled: boolean
  onEdit: (item: Item) => void
}) {
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
      onClick={() => onEdit(row.original)}
      className="hover:bg-muted/50 cursor-pointer border-b"
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          style={{ width: cell.column.getSize() }}
          className="focus-visible:ring-ring px-3 py-2 focus-visible:ring-2 focus-visible:outline-none"
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
      role="img"
      aria-label="ドラッグで並び替え"
      data-testid="backlog-drag-handle"
      /* iter1873: ≡ 単体では「ドラッグハンドル」と sighted も即把握できない。
         hover で意図 disclose、palette/taskchute/period/inbox/kanban/backlog-estimate
         title sweep の続編。 */
      title="ドラッグで並び替え"
    >
      <span aria-hidden="true">≡</span>
    </span>
  )
}
