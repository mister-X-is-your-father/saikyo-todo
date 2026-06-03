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
import { pointerFirstCollision } from '@/lib/dnd/pointer-first-collision'
import { isAppError } from '@/lib/errors'

import {
  formatDescendantsActivityHintJa,
  formatDescendantsProgressJa,
  summarizeDescendantsProgress,
} from '@/features/item/descendants-progress'
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
  countDescendants,
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
  // 2026-04-30: `animateLayoutChanges: () => false` で **drop 後の自動 layout animation を無効化**。
  // これがないと、楽観 update で array 順が変わった瞬間に dnd-kit が古い transform を
  // 残したまま新 DOM 位置に適用し、要素が「上に飛んでから戻ってくる」 視覚 artifact が発生する。
  // ※ drag 中の「他要素が押し退けられる」 動作は isSorting=true の transform で別管理 (健在)。
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } =
    useSortable({
      id: item.id,
      animateLayoutChanges: () => false,
    })
  // 2026-04-30: drag-or-sorting 中のみ transform を適用、drop 確定後は空 style。
  //   - isDragging=true: 自身が drag されている (translateY 等で追従)
  //   - isSorting=true (isDragging=false): 別要素が drag 中、自身は make-way 移動
  //   - 両方 false (= drop 完了): transform 0、artifact 防止のため style 空
  const sortableStyle =
    isDragging || isSorting
      ? { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
      : {}

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
        // iter508: pseudo で tap target を 44x44 化 (visual h-4 w-4 維持、drag 機能不変)
        // iter1308 (modeM hazard、comment-thread iter1303 / kanban-edit iter1306 /
        // kr-delete iter1307 と同 fix): GripVertical h-4 w-4 (16x16) は `before:-inset-3` (12px)
        // で 16+24=40 両軸、WCAG 2.5.5 (44x44) 未達。`inline-flex min-h-11 min-w-11 items-center
        // justify-center` 追加で両軸 44 強制、icon は center 配置で見た目バランス維持。
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative -ml-1 inline-flex min-h-11 min-w-11 cursor-grab touch-none items-center justify-center rounded before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
        /* iter1698: 旧 `「${item.title}」 — ドラッグで並び替え` は accessible name 先頭が
           「 (U+300C) で voice control「click ${item.title}」 strict prefix match と不一致
           (WCAG 2.5.3、iter1697 backlog sortable <th> と同 pattern)。drag handle は
           interactive (button + listeners) で voice control 対象、「」 quote を外し
           ${item.title} を literal prefix に。」 close-quote が抜けるが、em-dash 区切で
           title と action 文の境界は SR に明瞭。 */
        aria-label={`${item.title} — ドラッグで並び替え`}
        data-testid={`subtask-drag-${item.id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <ItemCheckbox item={item} workspaceId={workspaceId} />
      {/* iter1061: role 無 span + aria-label を `role="img"` で
          authoritative 化 (iter1023/1049-1060 同 pattern、role=img sweep
          14 弾目)。subtask step 番号 chip。 */}
      <span
        // iter1548: ring-slate-200 は light 固定で iter1376/1493/1512-1547 chip/ring dark sweep
        // からこぼれていた (subtasks child count iter1535 と同 file 内の漏れ)。bg-muted/text-foreground は
        // CSS var で theme-aware だが ring のみ explicit、dark 時に ring-slate-200 が浮く。
        // dark:ring-slate-700 を補完で contrast 整合。
        className="bg-muted text-foreground inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] tabular-nums ring-1 ring-slate-200 ring-inset dark:ring-slate-700"
        role="img"
        /* iter1590: paren convention を em-dash 区切に統一 (iter1093-1589 sweep)。 */
        aria-label={`${index + 1} 番目 — 深さ ${depth + 1}`}
        data-testid={`subtask-step-${item.id}`}
      >
        <span aria-hidden="true">{index + 1}</span>
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
          // iter1535: child count chip は light 固定 (bg-slate-200 + text-slate-700) で
          // iter1376/1493/1512-1534 chip dark sweep からこぼれていた。dark variant 補完。
          className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 tabular-nums dark:bg-slate-800/40 dark:text-slate-300"
          role="img"
          aria-label={`このタスクには子タスクが ${grandchildren.length} 件あります`}
          data-testid={`subtask-childcount-${item.id}`}
        >
          <span aria-hidden="true">{grandchildren.length} 件</span>
        </span>
      )}
      {item.isMust && <MustBadge />}
      {/* iter290 P0 (queue: subtask gap d/4): indent/outdent buttons + Alt+←/→ keyboard */}
      <button
        type="button"
        // iter508: pseudo で tap target を 44x44 化 (visual h-3.5 w-3.5 維持、disabled 時は anchor 消す)
        // iter1308 (modeM hazard 続き): icon h-3.5 w-3.5 (14x14) は `before:-inset-3` (12px) で
        // 14+24=38 両軸、WCAG 2.5.5 未達。`inline-flex min-h-11 min-w-11 items-center justify-center`
        // 追加で両軸 44 強制 (subtask-drag iter1308 と同 fix)。
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative inline-flex min-h-11 min-w-11 items-center justify-center rounded before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-30 disabled:before:hidden"
        onClick={() => onOutdent(item)}
        disabled={!canOutdent || movePending}
        aria-busy={movePending || undefined}
        data-testid={`subtask-outdent-${item.id}`}
        aria-keyshortcuts="Alt+ArrowLeft"
        // iter1213: 旧 aria-label は visible に類似する "アウトデント" を中位置に持ち
        // voice control prefix-matching「click アウトデント」 match 不可 (icon-only button
        // で visible text 無、title attribute は tooltip 専用)。subtasks-bulk iter1211 と同
        // sweep を outdent button にも展開。title attribute と同じ "アウトデント" を
        // aria-label 冒頭固定 + em-dash 区切で descriptive 末尾保持。
        aria-label={
          !canOutdent
            ? `アウトデント — 「${item.title}」は root のためアウトデント不可`
            : movePending
              ? `アウトデント — 「${item.title}」を移動中…`
              : `アウトデント — 「${item.title}」を 1 段アウトデント (Alt+←)`
        }
        title="アウトデント (Alt+←)"
      >
        <ArrowLeftFromLine className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        // iter508: pseudo で tap target を 44x44 化 (visual h-3.5 w-3.5 維持、disabled 時は anchor 消す)
        // iter1308 (modeM hazard 続き): subtask-outdent と同 fix。
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative inline-flex min-h-11 min-w-11 items-center justify-center rounded before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-30 disabled:before:hidden"
        onClick={() => onIndent(item)}
        disabled={!canIndent || movePending}
        aria-busy={movePending || undefined}
        data-testid={`subtask-indent-${item.id}`}
        aria-keyshortcuts="Alt+ArrowRight"
        // iter1213: outdent button と同 sweep — visible text 無 icon-only で title
        // attribute "インデント (Alt+→)" は tooltip 専用、voice control prefix-matching
        // 「click インデント」用に aria-label 冒頭に "インデント" 固定 + em-dash 区切で
        // descriptive 末尾保持。
        aria-label={
          !canIndent
            ? depth + 1 >= MAX_TREE_DEPTH
              ? `インデント — 深さ ${MAX_TREE_DEPTH} を超えるためインデント不可`
              : `インデント — 「${item.title}」の前に sibling が無いためインデント不可`
            : movePending
              ? `インデント — 「${item.title}」を移動中…`
              : `インデント — 「${item.title}」を 1 段インデント (Alt+→)`
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
      /* iter1573: focus-within:ring-blue-200 は light 固定で iter1493/1512-1571 ring dark sweep
         からこぼれていた (subtasks-panel step number iter1548 と同 file 内の別 ring 漏れ)。
         dark mode で ring-blue-200 (very-light blue) は dark bg 上で blowout、focus indicator が
         潰れる。dark:focus-within:ring-blue-700 (= darker) で contrast 整合。 */
      className="space-y-1 outline-none focus-within:ring-1 focus-within:ring-blue-200 dark:focus-within:ring-blue-700"
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
          /* iter1586: paren convention を em-dash 区切に統一 (iter1093-1585 sweep)。 */
          aria-label={`グループ「${item.title}」 — 子タスク ${grandchildren.length} 件`}
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
            <p
              className="ml-4 text-[10px] text-amber-700 dark:text-amber-400"
              role="status"
              aria-live="polite"
            >
              <span aria-hidden="true">⚠ </span>深さ {MAX_TREE_DEPTH} を超える子タスクは省略 (
              {grandchildren.length} 件)
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

  /** 再帰総数 (孫以下も含めた直接 + 間接 子孫の件数)。h3 に表示。iter300 で helper 化 */
  const totalDescendants = countDescendants(parent, allItems)

  // iter426 basics: subtree 進捗 + activity hint を panel 先頭に表示。
  // iter417 / iter424 substrate を bind、items.data 既取得済なので追加 query なし。
  // total === 0 (子タスクなし) は panel 自体非表示で UI 静か。
  const descendantsProgress = summarizeDescendantsProgress(
    { id: parent.id, parentPath: parent.parentPath },
    allItems,
  )

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
    // **重要**: 表示順と完全一致させるため `compareSiblings` (position + id tie-break)
    // を使う。`localeCompare` だけだと collision 時に index がずれて 思った位置に
    // 行かない (2026-04-30 ユーザ報告 root cause)。
    const siblings = allItems
      .filter((i) => !i.deletedAt && i.parentPath === activeItem.parentPath)
      .sort(compareSiblings)
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
      {descendantsProgress.total > 0 ? (
        <div
          className={`rounded-md border px-3 py-2 ring-1 ring-inset ${
            descendantsProgress.isComplete
              ? 'border-emerald-200 bg-emerald-50 ring-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:ring-emerald-900/50'
              : descendantsProgress.blocked > 0
                ? 'border-amber-200 bg-amber-50 ring-amber-200 dark:border-amber-900/50 dark:bg-amber-950/30 dark:ring-amber-900/50'
                : 'border-slate-200 bg-slate-50 ring-slate-200 dark:border-slate-700/50 dark:bg-slate-900/30 dark:ring-slate-700/50'
          }`}
          role="status"
          aria-live="polite"
          /* iter1599: 旧 aria-label `"サマリ: X — Y"` の先頭 colon `:` は iter1093-1598 sweep の
             em-dash 区切と divergent。`サマリ:` colon を ` — ` em-dash に統一 (内部 em-dash と
             整合)。 */
          aria-label={`サマリ — ${formatDescendantsActivityHintJa(descendantsProgress)} — ${formatDescendantsProgressJa(descendantsProgress)}`}
          data-testid="subtasks-progress-summary"
          data-pct-done={descendantsProgress.pctDone}
        >
          {/* iter916: parent aria-label "サマリ: ${activityHint} — ${progress}" が
              完全 content を持つため、視覚 2 行 (activity hint + progress) は
              aria-hidden で覆い SR 単独経路に集約 (iter907/909-915 続編、aria-live
              status region 内の visible duplicate 排除)。 */}
          <div className="text-xs font-medium" aria-hidden="true">
            <span>📋 </span>
            {formatDescendantsActivityHintJa(descendantsProgress)}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[11px]" aria-hidden="true">
            {formatDescendantsProgressJa(descendantsProgress)}
          </div>
        </div>
      ) : null}

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
          <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
            まだ子タスクがありません
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerFirstCollision}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={children.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol
                className="space-y-1"
                data-testid="subtasks-list"
                /* iter1586: paren convention を em-dash 区切に統一 (iter1093-1585 sweep)。 */
                aria-label={`子タスク 全 ${children.length} 件 — 子孫含め ${totalDescendants} 件`}
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
        <Label htmlFor="subtasks-bulk">改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加)</Label>
        <textarea
          id="subtasks-bulk"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          // iter318: Cmd/Ctrl+Enter で bulk 追加 (iter313-317 と同 pattern、改行区切り
          // 入力なので Enter は newline 必須、modifier 併用が必須)。空 / pending 中は noop。
          onKeyDown={(e) => {
            if (
              (e.metaKey || e.ctrlKey) &&
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              bulkText.trim() &&
              !create.isPending
            ) {
              e.preventDefault()
              void handleBulkAdd()
            }
          }}
          rows={5}
          className="bg-background w-full rounded border px-2 py-1.5 font-mono text-sm"
          placeholder={'例:\n仕様書を読む\nスキーマ設計\nプロトタイプ実装'}
          aria-keyshortcuts="Meta+Enter Control+Enter"
          // iter1211: 旧 aria-label `子タスクを改行区切りで bulk 追加 (...)` (全 3 path) は
          // visible Label "改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加)" を中位置
          // "子タスクを **改行区切りで bulk 追加** (...)" に持ち voice control prefix-matching
          // 「click 改行区切り」 match 不可 (substring 一致のみ)。p-dod iter1210 と同 sweep を
          // subtasks-bulk にも展開。Textarea は htmlFor Label が visible なので Label text
          // "改行区切りで bulk 追加" を冒頭固定 + em-dash 区切で descriptive ("子タスクを
          // ...") 末尾保持。
          aria-label={
            bulkText === ''
              ? '改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加)'
              : pendingTitleCount === 0
                ? '改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 (現在 空行のみで追加対象なし)'
                : `改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 (現在 ${pendingTitleCount} 件、Cmd/Ctrl+Enter で追加)`
          }
          data-testid="subtasks-bulk-input"
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            空行は無視。priority=4 / status=todo で作成。
          </span>
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            disabled={!bulkText.trim() || create.isPending}
            aria-busy={create.isPending || undefined}
            onClick={() => void handleBulkAdd()}
            data-testid="subtasks-bulk-add-btn"
            aria-keyshortcuts="Meta+Enter Control+Enter"
            // iter1176: 旧 aria-label 3 path とも visible "追加中…" / "N 件追加" を
            // 中位置〜末尾に持ち voice control prefix-matching「click 追加 / 追加中…」
            // match 不可 (iter1093-1175 sweep convention が漏れていた)。
            // visible 冒頭固定 + em-dash 区切で descriptive 末尾保持。
            aria-label={
              !bulkText.trim()
                ? '追加 — 子タスクを追加するには改行区切りで入力してください'
                : create.isPending
                  ? `追加中… — 子タスク ${pendingTitleCount} 件を追加中…`
                  : `${pendingTitleCount} 件追加 — 子タスク ${pendingTitleCount} 件をまとめて追加`
            }
          >
            <span aria-hidden="true">
              {create.isPending ? '追加中…' : `${pendingTitleCount} 件追加`}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
