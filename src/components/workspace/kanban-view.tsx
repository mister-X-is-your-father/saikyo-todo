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
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
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
import { parseAsString, useQueryState } from 'nuqs'
import { toast } from 'sonner'

import { uuidToLabel } from '@/lib/db/ltree-path'
import { pointerFirstCollision } from '@/lib/dnd/pointer-first-collision'
import { isAppError } from '@/lib/errors'

import { formatFriendlyDate } from '@/features/item/date-tokens'
import { useReorderItem, useUpdateItemStatus } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'
import { useWorkspaceStatuses } from '@/features/workspace/hooks'

import { ItemCheckbox } from './item-checkbox'
import { ItemDecomposeButton } from './item-decompose-button'
import { getCardStatusAccent } from './kanban-card-accent'
import { MustBadge } from './must-badge'

interface Props {
  workspaceId: string
  items: Item[]
  currentUserId?: string
}

export function KanbanView({ workspaceId, items }: Props) {
  // Phase 6.15 iter 78: editing dialog state を URL `?item=` に統合 (Backlog iter77 と同パターン)。
  // 親 items-board が同じ ?item= を見て ItemEditDialog を render するので Kanban 側は dialog を持たない。
  const [, setOpenItemId] = useQueryState('item', parseAsString)
  const { data: statuses } = useWorkspaceStatuses(workspaceId)
  const updateStatus = useUpdateItemStatus(workspaceId)
  const reorder = useReorderItem(workspaceId)

  const sensors = useSensors(
    // Mouse: 5px 動かないと drag 開始しない (click と区別)
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: 250ms 長押し + 5px 以内なら drag 開始 (スクロールと区別)。
    // tolerance を超えるスワイプは scroll として扱われ、drag は発火しない (Todoist / Trello 風)。
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
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
    return (
      <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
        {/* iter1318: ASCII "..." → Unicode "…" で codebase ellipsis convention 統一 */}
        列定義を読み込み中…
      </p>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerFirstCollision}
        onDragEnd={handleDragEnd}
      >
        {/*
         * 横スクロールを内部 (この div) で完結させる。body を横長にしないことで
         * 1) スマホで右切れ防止、2) `position: fixed` Dialog が viewport 中央に正しく出る、
         * 3) ヘッダ / nav が Kanban スクロールに巻き込まれない。
         * Trello / TickTick の Kanban が同パターン。
         */}
        <div
          className="grid gap-4 overflow-x-auto pb-2"
          style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(260px, 1fr))` }}
          data-testid="kanban-board"
          role="group"
          /* iter1576: 旧 aria-label paren convention `"Kanban ボード (X 列)"` は iter1093-1575
             sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
          aria-label={`Kanban ボード — ${statuses.length} 列`}
          /* iter2281: kanban-board root group の aria-label "Kanban ボード — N 列" は browser
             tooltip にならず sighted は hover で「Kanban 全体構造 + 列数」 disclose 不可。
             MCP path A で Kanban view 探索中に発見、Gantt root iter2247 と同 chart/board root
             container title pattern を Kanban にも展開、3 view root container title 完成
             (Gantt / Kanban / Backlog table)。 */
          title={`Kanban ボード — ${statuses.length} 列`}
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
              onEdit={(item) => void setOpenItemId(item.id)}
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
  const headingId = `kanban-col-heading-${statusKey}`
  return (
    <section
      ref={setNodeRef}
      // 列ごとに viewport 内で縦スクロールを完結させる (Trello / TickTick Kanban パターン)。
      // max-h は viewport 高さから上部 UI (workspace header + quick-add + view-switcher) を引いた残り。
      className={`bg-card flex max-h-[calc(100dvh-14rem)] flex-col rounded-lg border p-3 ${isOver ? 'ring-primary ring-2' : ''}`}
      data-testid={`kanban-column-${statusKey}`}
      aria-labelledby={headingId}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between">
        {/* iter1354: 旧 style={{ color }} は status 色 (slate-400 / blue-500 /
            green-500 等 accent 色) を heading text 色に直接適用し、白 card 上で
            2.27〜3.67:1 と WCAG 1.4.3 (4.5:1) を割っていた。status 色は装飾 dot
            (非テキストなので contrast 規定外、status は label text が伝える) に移し、
            heading text は text-foreground で可読性確保。 */}
        <h3
          id={headingId}
          className="text-foreground flex items-center gap-1.5 text-sm font-semibold"
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          {label}
          {/* iter1653: sr-only count を em-dash 区切に統一 (iter1619 keybindings-help /
              iter1633 dashboard MUST list と同 sweep)。leading space ` ` → ` — `。 */}
          <span className="sr-only">{` — ${items.length} 件`}</span>
        </h3>
        <span className="text-muted-foreground text-xs" aria-hidden="true">
          {items.length}
        </span>
      </div>
      <SortableContext
        id={statusKey}
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="min-h-16 flex-1 space-y-2 overflow-y-auto pr-1"
          data-droppable-status={statusKey}
        >
          {items.length === 0 ? (
            <div
              className="text-muted-foreground rounded border border-dashed px-2 py-4 text-center text-xs"
              role="status"
              aria-live="polite"
            >
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
    </section>
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
  // iter263 basics: dueDate / startDate を formatFriendlyDate で表示するための基準日。
  // useMemo の cost より「カードごとに Date.now を毎 render evaluate」する方が
  // 視覚的に紛らわしい (renders 跨ぎでカレンダー越境ぎりぎりの bug 余地)。
  const today = useMemo(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }, [])
  const accent = getCardStatusAccent(item.status)
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(item)}
      className={`group focus-visible:ring-ring cursor-grab rounded border p-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing ${accent.bgClass} ${accent.borderClass}`}
      data-testid={`kanban-card-${item.id}`}
      data-status={item.status}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <ItemCheckbox item={item} workspaceId={workspaceId} className="mt-0.5" />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            data-testid={`kanban-title-${item.id}`}
            // iter1155: 旧 aria-label `「title」を編集` は visible "{title}" を位置 1
            // (「」内) に持ち voice control prefix-matching「click {title}」 match 不可
            // (substring 一致のみ)。iter1093-1154 sweep convention に揃え visible title
            // 冒頭固定 + em-dash 区切で descriptive 末尾保持。
            aria-label={`${item.title} — 編集`}
            className={
              'hover:text-primary focus-visible:ring-ring rounded text-left font-medium break-words hover:underline focus-visible:ring-2 focus-visible:outline-none ' +
              (item.doneAt ? 'text-muted-foreground line-through' : '')
            }
          >
            <span aria-hidden="true">{item.title}</span>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.isMust && <MustBadge />}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            // iter331: aria-label を context-rich に (旧 "編集" だけでは Kanban 内のどの
            // item の編集 button か SR で判別不能だった、複数 card の同 button を
            // 連続 announce すると区別できない)。✎ char には aria-hidden を付与し
            // unicode 名 (U+270E LOWER RIGHT PENCIL) の冗長読み上げを抑制。
            // iter506: pseudo で tap target を 44x44 化 (visual ✎ icon size 維持)、
            // iter505 ItemCheckbox pattern と同 pseudo `::before` 拡張。
            // iter1155: visible は ✎ icon (aria-hidden) のみで WCAG 2.5.3 視覚 label
            // 制約は無いが、 sibling title button (`kanban-title-`) と aria-label が
            // 一致すると tab navigation 時 SR で重複読み上げ。 ✎ icon は "編集" 意図を
            // 表すので "編集 —" prefix を冒頭に置いて voice control「click 編集」
            // prefix-match satisfy + title button (`${title} — 編集`) と差別化。
            aria-label={`編集 — 「${item.title}」を編集 (✎ アイコン)`}
            /* iter2115: kanban-edit title "「title」を編集" は aria-label
               "編集 — 「title」を編集 (✎ アイコン)" と divergent (visible "編集" prefix
               + em-dash convention 不在)。subtask-outdent/indent iter2113 / dep-remove
               iter2111 と同 title-aria divergence 修正 pattern。title と aria-label を
               揃え (✎ アイコン hint も含め) sighted hover で full context disclose。 */
            title={`編集 — 「${item.title}」を編集 (✎ アイコン)`}
            // iter1306 (modeM hazard 続き、comment-thread iter1303 / operation-board iter1304 /
            // activity-log iter1305 と同 fix): icon ✎ (text-xs, ~16px) + px-1 + `before:-inset-3`
            // (12px) で 16+24=40px (片軸)、horizontally も 8(✎)+8(px-1)+24=40px で WCAG 2.5.5
            // (44x44) 両軸未達。`inline-flex min-h-11 min-w-11 items-center justify-center` で
            // 両軸 44 強制 + ✎ icon を center 配置で見た目バランス維持。
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1 text-xs before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none"
            data-testid={`kanban-edit-${item.id}`}
          >
            <span aria-hidden="true">✎</span>
          </button>
        </div>
      </div>
      {(item.startDate || item.dueDate) && (
        <div
          className="text-muted-foreground mt-1 text-[11px]"
          // iter263 basics: ISO 生表示 → formatFriendlyDate で「明日 / 4/30 (木)」化。
          // 元 ISO は親 div の title に残し、SR と hover で正確な日付保持。
          title={`${item.startDate ? `開始 ${item.startDate}` : ''}${
            item.startDate && item.dueDate ? ' / ' : ''
          }${item.dueDate ? `期限 ${item.dueDate}` : ''}`}
        >
          {item.startDate && (
            <>
              開始:{' '}
              <time dateTime={item.startDate}>{formatFriendlyDate(item.startDate, today)}</time>
            </>
          )}
          {item.startDate && item.dueDate ? ' / ' : ''}
          {item.dueDate && (
            <>
              期限: <time dateTime={item.dueDate}>{formatFriendlyDate(item.dueDate, today)}</time>
            </>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        {childCount > 0 ? (
          // iter1059: role 無 span + aria-label を `role="img"` で
          // authoritative 化 (iter1023/1049-1058 同 pattern、role=img sweep
          // 12 弾目)。Kanban card 内の子タスク count chip。
          // iter1869: 視覚 chip text は `子 N 件` で省略形、aria-label の
          // `子タスク N 件` と divergent。sighted hover で full ja text disclose
          // (iter1867 palette priority dot title 付与 sweep の続き)。
          <span
            className="text-foreground bg-muted inline-flex items-center rounded-full px-2 py-0.5 text-[10px]"
            data-testid={`kanban-child-count-${item.id}`}
            role="img"
            aria-label={`子タスク ${childCount} 件`}
            title={`子タスク ${childCount} 件`}
          >
            <span aria-hidden="true">子 {childCount} 件</span>
          </span>
        ) : (
          <span />
        )}
        <div
          className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          data-testid={`kanban-decompose-wrapper-${item.id}`}
        >
          <ItemDecomposeButton workspaceId={workspaceId} item={item} />
        </div>
      </div>
    </div>
  )
}
