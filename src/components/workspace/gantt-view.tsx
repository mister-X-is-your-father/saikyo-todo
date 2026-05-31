'use client'

/**
 * Gantt View。MVP は棒のみ実装、Phase 6.15 iter 6 で **依存線 SVG オーバーレイ** を統合。
 *
 * 自作理由: gantt-task-react は peerDeps が React 18 固定。React 19 の pnpm strict peer
 * で install できない。MVP は "棒のみ" なので SVG 不要、div + Tailwind で十分。
 *
 * 入力: startDate + dueDate を持つ item のみ bar 化。どちらか欠けたら表示はするが bar なし。
 *
 * 座標系:
 *   - timeline range: min(startDate) .. max(dueDate) + 1日 (両端に余白)
 *   - 1 day = 40px 固定
 *   - bar left = (startDate - rangeStart) * dayWidth
 *   - bar width = (dueDate - startDate + 1) * dayWidth
 *
 * 依存線 (Phase 6.15 iter 2 で component 化、iter 6 で配線):
 *   - props.edges に Phase 6.10 item_dependencies (type='blocks') を fromId/toId で渡すと
 *     Manhattan L 字パスで矢印描画。両端 bar が isCritical なら赤実線
 *   - props.criticalIds に critical path 上の itemId を渡すと bar が isCritical 扱い
 *     (Phase 6.15 iter 1 の computeCriticalPath を呼んだ結果を渡す想定)
 *   - workspace 横断 edges 取得 hook は次 iter (現状は呼び出し元から渡す)
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { computeBarDragShift, computeSnappedDragPx } from '@/features/gantt/bar-drag'
import {
  computeGanttRange,
  computeMonthBoundaries,
  computeTodayX,
  computeTotalDays,
} from '@/features/gantt/gantt-range'
import { computeProjectStats, formatSlipText } from '@/features/gantt/project-stats'
import { useUpdateItem } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'

import { type GanttBar, type GanttDepEdge, GanttDependencyArrows } from './gantt-dependency-arrows'

interface Props {
  workspaceId: string
  items: Item[]
  /** Phase 6.10 item_dependencies の type='blocks' edges (workspace 横断) */
  edges?: GanttDepEdge[]
  /** Phase 6.15 iter 1 computeCriticalPath の criticalPathIds */
  criticalIds?: string[]
  /** Phase 6.15 iter 46 — CPM 出力 projectDurationDays (summary banner 用) */
  projectDurationDays?: number
}

const ROW_PX = 32
const HEADER_PX = 32
const LABEL_COL_PX = 240
/** Phase 6.15 iter 73: TeamGantt 風 zoom (1 day = N px)。default は 1x = 40px。 */
const ZOOM_PX: Record<'compact' | 'normal' | 'wide', number> = {
  compact: 24,
  normal: 40,
  wide: 64,
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null
  const d = typeof v === 'string' ? parseISO(v) : v
  return isValid(d) ? d : null
}

export function GanttView({
  workspaceId,
  items,
  edges = [],
  criticalIds = [],
  projectDurationDays,
}: Omit<Props, 'workspaceId'> & { workspaceId?: string }) {
  const active = useMemo(() => items.filter((i) => !i.deletedAt), [items])
  const criticalSet = useMemo(() => new Set(criticalIds), [criticalIds])
  // Phase 6.15 iter 31: bar click で ItemEditDialog (deep link 経由) を開く
  const [, setOpenItemId] = useQueryState('item', parseAsString)
  // Phase 6.15 iter 60: "今日にジャンプ" — outer scroll container を ref で持つ
  const scrollRef = useRef<HTMLDivElement | null>(null)
  // Phase 6.15 iter 62/75: 完了済 (doneAt あり) を行から隠す toggle (TeamGantt 風 filter)。
  // iter 75 で nuqs URL state 化 (?hideDone=true が refresh 後も保持される)
  const [hideDone, setHideDone] = useQueryState('hideDone', parseAsBoolean.withDefault(false))
  // Phase 6.15 iter 82: 依存線 (SVG 矢印) の表示 toggle (混雑した Gantt で off にして見やすく)
  const [showDeps, setShowDeps] = useQueryState('showDeps', parseAsBoolean.withDefault(true))
  // Phase 6.15 iter 73-74: zoom (compact/normal/wide) — TeamGantt の day/week/month zoom 相当。
  // iter 74 で nuqs URL state 化 (?zoom=wide が refresh 後も保持される)
  const [zoom, setZoom] = useQueryState(
    'zoom',
    parseAsStringLiteral(['compact', 'normal', 'wide'] as const).withDefault('normal'),
  )
  const dayPx = ZOOM_PX[zoom]

  // FEEDBACK_QUEUE P0 entry 4 「Gantt DnD 期間編集」 scope A UI bind (iter478):
  // 中央 drag で bar の startDate / dueDate を平行 shift。snap to day。
  // - drag 中は visual ghost (translateX) で「次の日にスナップ」プレビュー
  // - 4px 未満 → click 扱い (dialog open)
  // - drop 時 `computeBarDragShift` で日数計算 → useUpdateItem
  // - ConflictError は toast でユーザに通知 (revert は invalidateQueries で自動)
  // - workspaceId 未指定 (read-only Gantt) → drag 無効 (button disabled 同等)
  const update = useUpdateItem(workspaceId ?? '')
  const [drag, setDrag] = useState<{
    barId: string
    startX: number
    deltaPx: number
    moved: boolean
  } | null>(null)
  // pointerup 直後の click event を抑止するための「直前 drag 完了」フラグ
  const suppressNextClickRef = useRef<string | null>(null)
  const DRAG_THRESHOLD_PX = 4

  const withDates = useMemo(
    () =>
      active
        .filter((i) => (hideDone ? !i.doneAt : true))
        .map((i) => ({
          item: i,
          start: toDate(i.startDate),
          due: toDate(i.dueDate),
        }))
        .filter((x) => x.start && x.due) as {
        item: Item
        start: Date
        due: Date
      }[],
    [active, hideDone],
  )

  // iter305 refactor: range / totalDays / todayX の inline 計算を pure helper
  // (`@/features/gantt/gantt-range`) に集約。動作変更ゼロ、test 17 件で固定。
  const range = useMemo(() => computeGanttRange(withDates), [withDates])
  const totalDays = computeTotalDays(range)
  const timelineWidth = totalDays * dayPx
  const days: Date[] = []
  if (range) {
    for (let i = 0; i < totalDays; i++) days.push(addDays(range.start, i))
  }

  // Today 縦線 (TeamGantt/GanttPRO の典型機能)。range 範囲外なら null
  const today = new Date()
  const todayX = computeTodayX(range, today, dayPx)

  // Phase 6.15 iter 61: 初回 mount で today に自動スクロール (TeamGantt default)。
  // 早期 return より先に Hook を呼ぶ必要があるためここに置く (rules-of-hooks)。
  const didInitialScrollRef = useRef(false)
  useEffect(() => {
    if (didInitialScrollRef.current) return
    if (todayX === null) return
    const el = scrollRef.current
    if (!el) return
    didInitialScrollRef.current = true
    const target = LABEL_COL_PX + todayX - el.clientWidth / 2
    el.scrollTo({ left: Math.max(0, target), behavior: 'instant' as ScrollBehavior })
  }, [todayX])

  if (withDates.length === 0) {
    return (
      <div data-testid="gantt-view" className="rounded-lg border p-6">
        <p className="text-muted-foreground text-center text-sm" role="status" aria-live="polite">
          startDate / dueDate が両方設定された item がありません。 Item 編集で期間を入れると Gantt
          に表示されます。
        </p>
      </div>
    )
  }

  // 行の Y 位置 = HEADER_PX + index * ROW_PX、bar は top:1 + (ROW_PX - 8)/2 が中央
  const ganttBars: GanttBar[] = withDates.map((x, idx) => {
    const leftDays = differenceInCalendarDays(x.start, range!.start)
    const spanDays = differenceInCalendarDays(x.due, x.start) + 1
    const barLeft = leftDays * dayPx
    const barWidth = spanDays * dayPx
    return {
      id: x.item.id,
      leftPx: barLeft,
      rightPx: barLeft + barWidth,
      centerYPx: HEADER_PX + idx * ROW_PX + ROW_PX / 2,
      isCritical: criticalSet.has(x.item.id),
    }
  })

  const totalHeight = HEADER_PX + withDates.length * ROW_PX

  // 月境界線 (TeamGantt 風)。day i の day が前日と異なる月に変わる index を pure
  // helper (`computeMonthBoundaries`) で算出。iter310 で gantt-range.ts に集約済。
  const monthBoundaryDays = computeMonthBoundaries(days)

  const criticalCount = criticalSet.size
  const totalSpanDays = differenceInCalendarDays(range!.end, range!.start) + 1

  // Phase 6.15 iter 51/87: baseline 比較 — `computeProjectStats` 純粋関数で集計
  const { baselineCount, slipItemCount, totalSlipDays } = computeProjectStats(withDates)

  function scrollToToday(behavior: ScrollBehavior = 'smooth') {
    const el = scrollRef.current
    if (!el || todayX === null) return
    const target = LABEL_COL_PX + todayX - el.clientWidth / 2
    el.scrollTo({ left: Math.max(0, target), behavior })
  }

  const dragEnabled = Boolean(workspaceId)

  function onBarPointerDown(e: React.PointerEvent<HTMLDivElement>, barId: string) {
    if (!dragEnabled) return
    if (e.button !== 0 || e.pointerType === 'touch') return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ barId, startX: e.clientX, deltaPx: 0, moved: false })
  }

  function onBarPointerMove(e: React.PointerEvent<HTMLDivElement>, barId: string) {
    if (!drag || drag.barId !== barId) return
    const deltaPx = e.clientX - drag.startX
    const moved = drag.moved || Math.abs(deltaPx) >= DRAG_THRESHOLD_PX
    if (deltaPx === drag.deltaPx && moved === drag.moved) return
    setDrag({ ...drag, deltaPx, moved })
  }

  async function onBarPointerUp(
    e: React.PointerEvent<HTMLDivElement>,
    barId: string,
    item: Item,
    startISO: string,
    dueISO: string,
  ) {
    if (!drag || drag.barId !== barId) return
    const deltaPx = drag.deltaPx
    const moved = drag.moved
    setDrag(null)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // already released by browser
    }
    if (!moved) {
      // click 扱い、onClick 側で setOpenItemId(item.id) が走る
      return
    }
    // 直後の click を suppress (drag 完了なので dialog を開かない)
    suppressNextClickRef.current = barId
    const result = computeBarDragShift({
      startDate: startISO,
      dueDate: dueISO,
      deltaPx,
      dayPx,
    })
    if (result.invalid || result.deltaDays === 0) return
    try {
      await update.mutateAsync({
        id: item.id,
        expectedVersion: item.version,
        patch: { startDate: result.startDate, dueDate: result.dueDate },
      })
      const sign = result.deltaDays > 0 ? '+' : ''
      toast.success(`期間を ${sign}${result.deltaDays} 日 シフトしました`)
    } catch (err) {
      if (isAppError(err) && err.code === 'CONFLICT') {
        toast.error('別の編集と競合しました。Gantt を再読込して再操作してください')
      } else {
        toast.error(isAppError(err) ? err.message : '期間の更新に失敗しました')
      }
    }
  }

  function onBarPointerCancel(barId: string) {
    if (!drag || drag.barId !== barId) return
    setDrag(null)
  }

  function onBarClick(e: React.MouseEvent<HTMLDivElement>, itemId: string) {
    // drag 完了直後の click は dialog を開かない
    if (suppressNextClickRef.current === itemId) {
      suppressNextClickRef.current = null
      e.preventDefault()
      e.stopPropagation()
      return
    }
    e.stopPropagation()
    void setOpenItemId(itemId)
  }

  return (
    <div
      ref={scrollRef}
      data-testid="gantt-view"
      className="overflow-auto rounded-lg border"
      // iter1356: 旧 role="grid" は内部に role=group (summary) / role=img (legend) /
      // role=row→role=button (bar) を持ち、grid が要求する row→gridcell 構造に
      // 適合せず critical aria-required-children を 2 件出していた (malformed grid は
      // 無 grid より SR に有害)。gridcell を持たない以上 grid semantics は成立しないため、
      // label 付き role="group" (必須子なし) に降格。各 bar は role="button" + aria-label で
      // 個別に accessible なので情報損失は無し。
      role="group"
      /* iter1578: 旧 aria-label paren convention `"Gantt チャート (Item X 件 × 期間 Y 日)"` は
         iter1093-1577 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
      aria-label={`Gantt チャート — Item ${withDates.length} 件 × 期間 ${totalSpanDays} 日`}
    >
      {/* Project summary banner (Phase 6.15 iter 46 — TeamGantt/GanttPRO 風) */}
      <div
        data-testid="gantt-summary"
        className="bg-muted/40 text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-1.5 text-xs"
        role="group"
        aria-label={`Gantt project summary (表示範囲 ${totalSpanDays} 日 / 表示中 Item ${withDates.length} 件${
          projectDurationDays !== undefined && projectDurationDays > 0
            ? ` / CPM 期間 ${projectDurationDays} 日`
            : ''
        }${criticalCount > 0 ? ` / critical ${criticalCount} 件` : ''}${
          baselineCount > 0 ? ` / baseline ${baselineCount} 件` : ''
        }${slipItemCount > 0 ? ` / 遅延 ${slipItemCount} 件 計 ${totalSlipDays} 日` : ''})`}
      >
        {/* iter917: parent role="group" aria-label が "表示範囲 X 日 / 表示中 Item Y 件
            / CPM 期間 Z 日 / ..." 完全 content を持つため、内側 3 span は visible
            duplicate → aria-hidden で SR 単独経路に集約 (critical / baseline / slip
            兄弟 chip 既同 pattern、iter913 baseline 揃え と全 5 chip 一貫化)。 */}
        <span aria-hidden="true">
          表示範囲 <span className="text-foreground font-mono">{totalSpanDays}</span> 日
        </span>
        <span aria-hidden="true">
          表示中 Item <span className="text-foreground font-mono">{withDates.length}</span> 件
        </span>
        {projectDurationDays !== undefined && projectDurationDays > 0 && (
          <span aria-hidden="true">
            CPM 期間 <span className="text-foreground font-mono">{projectDurationDays}</span> 日
          </span>
        )}
        {/* iter1055: Gantt summary の 3 chip (critical / baseline / slip) は role 無
            span + aria-label の SR picked-up divergence。`role="img"` で authoritative 化
            (iter1023/1049-1054 同 pattern、role=img sweep 8 弾目)。 */}
        {criticalCount > 0 && (
          <span
            data-testid="gantt-summary-critical"
            className="text-red-600 dark:text-red-400"
            title="critical path 上の item (= project 全体期間に直接影響、遅延すると全体遅延)"
            role="img"
            /* iter1583: paren convention を em-dash 区切に統一 (iter1093-1582 sweep)。 */
            aria-label={`critical path ${criticalCount} 件 — project 全体期間に直接影響、遅延すると全体遅延`}
          >
            <span aria-hidden="true">
              critical path <span className="font-mono">{criticalCount}</span> 件
            </span>
          </span>
        )}
        {baselineCount > 0 && (
          <span
            data-testid="gantt-summary-baseline"
            title="baseline = 計画策定時に固定した開始/終了日 (実績との遅延差分計測の基準)"
            role="img"
            /* iter1583: paren convention を em-dash 区切に統一 (iter1093-1582 sweep)。 */
            aria-label={`baseline ${baselineCount} 件 — 計画策定時に固定した開始/終了日、実績との遅延差分計測の基準`}
          >
            <span aria-hidden="true">
              baseline <span className="font-mono">{baselineCount}</span> 件
            </span>
          </span>
        )}
        {slipItemCount > 0 && (
          <span
            data-testid="gantt-summary-slip"
            className="text-amber-600 dark:text-amber-400"
            title={`baseline より遅れている item の合計遅延日数`}
            role="img"
            /* iter1583: paren convention を em-dash 区切に統一 (iter1093-1582 sweep)。 */
            aria-label={`遅延 ${slipItemCount} 件 — baseline より遅れている item、計 ${totalSlipDays} 日`}
          >
            <span aria-hidden="true">
              遅延 <span className="font-mono">{slipItemCount}</span> 件 / 計
              <span className="font-mono"> {totalSlipDays}</span> 日
            </span>
          </span>
        )}
        <label className="ml-auto flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">zoom</span>
          <select
            value={zoom}
            onChange={(e) => setZoom(e.target.value as typeof zoom)}
            className="min-h-11 rounded border bg-transparent px-1 py-0.5 text-xs"
            data-testid="gantt-zoom-select"
            // iter1190: filter-status iter1182 / filter-sprint iter1183 と同 sweep —
            // 旧 aria-label `Gantt の 1 日あたりの幅 (現在: 狭 24px/day)` は visible
            // (option text "狭 (24px/day)" 等) を中位置に持ち voice control
            // prefix-matching「click 狭」 match 不可 (substring 一致のみ)。
            aria-label={(() => {
              const visible =
                zoom === 'compact'
                  ? '狭 24px/day'
                  : zoom === 'normal'
                    ? '標準 40px/day'
                    : zoom === 'wide'
                      ? '広 64px/day'
                      : zoom
              return `${visible} — Gantt の 1 日あたりの幅 (現在: ${visible})`
            })()}
          >
            <option value="compact">狭 (24px/day)</option>
            <option value="normal">標準 (40px/day)</option>
            <option value="wide">広 (64px/day)</option>
          </select>
        </label>
        <label
          data-testid="gantt-show-deps-toggle"
          className="flex min-h-11 items-center gap-1 text-xs"
        >
          <input
            type="checkbox"
            checked={showDeps}
            onChange={(e) => setShowDeps(e.target.checked)}
            className="size-3.5 cursor-pointer accent-current"
            aria-label={showDeps ? '依存線を表示中 — クリックで非表示' : '依存線を表示する'}
          />
          <span aria-hidden="true">依存線</span>
        </label>
        <label
          data-testid="gantt-hide-done-toggle"
          className="flex min-h-11 items-center gap-1 text-xs"
        >
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="size-3.5 cursor-pointer accent-current"
            // iter1199: 旧 checked path '完了済を隠している (クリックで表示)' は visible
            // "完了済を隠す" を literal substring に含まず ("隠す" vs "隠して" の conjugation
            // divergence) WCAG 2.5.3 (Label in Name) 違反。visible "完了済を隠す" を冒頭固定で
            // satisfy。
            /* iter1506: iter1199 で checked path のみ em-dash 化されたが unchecked path 旧 paren
               convention が iter1093-1505 em-dash sweep からこぼれていた。両 path で「現在は X」 を
               em-dash 区切に統一、iter1495 dependency toggle と同 pattern。 */
            aria-label={
              hideDone
                ? '完了済を隠す — 現在は隠している (クリックで表示に戻す)'
                : '完了済を隠す — 現在は表示中'
            }
          />
          <span aria-hidden="true">完了済を隠す</span>
        </label>
        {todayX !== null && (
          <button
            type="button"
            data-testid="gantt-jump-today"
            onClick={() => scrollToToday('smooth')}
            // iter507: pseudo で tap target を 44x44 化 (visual px-2 py-0.5 text-xs 維持、
            // gantt-summary banner の sibling chip / checkbox と垂直 align も保持)
            className="text-foreground hover:bg-muted focus-visible:ring-ring relative rounded border px-2 py-0.5 text-xs before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none"
            title="今日の縦線まで横スクロール"
            // iter1145: 旧 aria-label "Gantt timeline を今日 (...) の縦線まで横スクロール" は
            // visible "今日へジャンプ" の "へジャンプ" 部が literal substring に含まれず
            // WCAG 2.5.3 (Label in Name) 違反 + voice control「click 今日へジャンプ」 match 不可。
            // visible を冒頭固定し em-dash 区切で残りを補足説明する convention
            // (iter1093-1144 sweep) に揃える。
            aria-label={`今日へジャンプ — Gantt timeline を今日 (${format(new Date(), 'M月d日 (eee)')}) の縦線まで横スクロール`}
          >
            <span aria-hidden="true">今日へジャンプ</span>
          </button>
        )}
      </div>
      <div style={{ width: LABEL_COL_PX + timelineWidth, position: 'relative' }}>
        {/* 依存線 SVG オーバーレイ (Phase 6.15 iter 2 の component を iter 6 で配線) */}
        {showDeps && edges.length > 0 && (
          <GanttDependencyArrows
            width={timelineWidth}
            height={totalHeight}
            bars={ganttBars}
            edges={edges}
            offsetLeftPx={LABEL_COL_PX}
          />
        )}
        {/* Today 縦線 (Phase 6.15 iter 10 — TeamGantt/GanttPRO の典型機能) */}
        {/* iter1067: role 無 div + aria-label を `role="img"` で
            authoritative 化 (iter1023/1049-1066 同 pattern、role=img sweep
            20 弾目)。Gantt 上の today / baseline 視覚 marker。 */}
        {todayX !== null && (
          <div
            data-testid="gantt-today-line"
            role="img"
            aria-label={`今日 (${format(new Date(), 'yyyy年M月d日 (eee)')}) の縦線`}
            className="pointer-events-none absolute z-20"
            style={{
              left: LABEL_COL_PX + todayX,
              top: 0,
              width: 1.5,
              height: totalHeight,
              background: 'rgba(220, 38, 38, 0.7)', // red-600 半透明
            }}
          >
            {/* iter927: parent div aria-label "今日 (yyyy年M月d日 (eee)) の縦線"
                が完全 content を持つため、内側 visible "今日" badge span は
                aria-hidden で SR 単独経路に集約 (iter918-926 続編)。 */}
            <span
              className="absolute -top-0.5 left-1 rounded bg-red-600 px-1 py-0.5 text-[10px] leading-none text-white"
              style={{ whiteSpace: 'nowrap' }}
              aria-hidden="true"
            >
              今日
            </span>
          </div>
        )}
        {/* Header */}
        <div className="bg-muted sticky top-0 z-10 flex border-b" style={{ height: HEADER_PX }}>
          <div
            className="shrink-0 border-r px-3 py-2 text-sm font-semibold"
            style={{ width: LABEL_COL_PX }}
          >
            Item
          </div>
          {/* iter1009: timeline header の M/d 日付 ruler は sighted 用の視覚 subdivision
              (親 grid の aria-colcount=2 は Item + Timeline の 2 列を宣言、日付は
              Timeline 列の subdivision)。各 bar の aria-label に開始 / 終了日付が
              既に含まれているため SR では装飾扱いに固定し、container ごと aria-hidden
              で「5/21 5/22 5/23 …」の連続読み上げ noise を抑止する。 */}
          <div style={{ width: timelineWidth }} className="flex" aria-hidden="true">
            {days.map((d, i) => {
              const dow = d.getDay() // 0=Sun / 6=Sat
              const isWeekend = dow === 0 || dow === 6
              return (
                <div
                  key={i}
                  style={{ width: dayPx }}
                  data-weekend={isWeekend ? 'true' : 'false'}
                  className={
                    'shrink-0 border-r px-1 text-center text-xs ' +
                    (isWeekend ? 'text-foreground bg-muted/40' : 'text-foreground')
                  }
                >
                  {format(d, 'M/d')}
                </div>
              )
            })}
          </div>
        </div>
        {/* 月境界線 (Phase 6.15 iter 16 — TeamGantt 風) */}
        {monthBoundaryDays.length > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10"
            style={{
              left: LABEL_COL_PX,
              top: 0,
              width: timelineWidth,
              height: totalHeight,
            }}
          >
            {monthBoundaryDays.map((dayIdx) => (
              <div
                key={`month-${dayIdx}`}
                data-testid={`gantt-month-boundary-${dayIdx}`}
                className="absolute"
                style={{
                  left: dayIdx * dayPx - 0.5,
                  top: 0,
                  width: 1,
                  height: '100%',
                  background: 'rgba(100, 116, 139, 0.4)', // slate-500 半透明
                }}
              >
                <span
                  className="bg-background absolute -top-1 left-0.5 rounded px-1 text-[10px] leading-none font-medium text-slate-700 dark:text-slate-300"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {format(days[dayIdx]!, 'M月')}
                </span>
              </div>
            ))}
          </div>
        )}
        {/* 週末縦帯 (Phase 6.15 iter 11 — TeamGantt の典型表現)。bar の下に薄い背景 */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: LABEL_COL_PX,
            top: HEADER_PX,
            width: timelineWidth,
            height: totalHeight - HEADER_PX,
          }}
        >
          {days.map((d, i) => {
            const dow = d.getDay()
            if (dow !== 0 && dow !== 6) return null
            return (
              <div
                key={`weekend-${i}`}
                data-testid={`gantt-weekend-${i}`}
                className="absolute"
                style={{
                  left: i * dayPx,
                  top: 0,
                  width: dayPx,
                  height: '100%',
                  background: 'rgba(148, 163, 184, 0.10)', // slate-400 薄め
                }}
              />
            )
          })}
        </div>

        {/* Rows */}
        {withDates.map(({ item, start, due }, idx) => {
          const leftDays = differenceInCalendarDays(start, range!.start)
          const spanDays = differenceInCalendarDays(due, start) + 1
          const barLeft = leftDays * dayPx
          const barWidth = spanDays * dayPx
          // 完了済 (doneAt あり) は TeamGantt 風 opacity を下げ + bar に取り消し線
          const isDone = Boolean(item.doneAt)
          const baseAlpha = isDone ? 0.4 : item.isMust ? 0.9 : 0.8
          const barBg = item.isMust
            ? `rgba(239,68,68,${baseAlpha})`
            : `rgba(59,130,246,${baseAlpha})`
          // Phase 6.15 iter 49: baseline (TeamGantt 風 — 当初計画 vs 現在の差分)
          const blStart = toDate(item.baselineStartDate)
          const blEnd = toDate(item.baselineEndDate)
          const hasBaseline = Boolean(blStart && blEnd)
          const baselineLeft = blStart ? differenceInCalendarDays(blStart, range!.start) * dayPx : 0
          const baselineWidth =
            blStart && blEnd ? (differenceInCalendarDays(blEnd, blStart) + 1) * dayPx : 0
          // Phase 6.15 iter 51/88: slip 日数 (現 due - baselineEnd)。formatSlipText で文字列化
          const slipDays = blEnd ? differenceInCalendarDays(due, blEnd) : 0
          const slipText = formatSlipText(slipDays, Boolean(blEnd))
          // bar / milestone 共通の SR 用ラベルとキー操作 (Enter/Space で ItemEditDialog 起動)
          const onBarKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              void setOpenItemId(item.id)
            }
          }
          // Phase 6.15 iter 79: bar 内部に進捗 fill (TeamGantt 風)。status 文字列ベース。
          //   todo: 0% / in_progress: 50% / done: 100% (それ以外は 0%)
          //   done は既に opacity 落としていて見にくいので fill は省略
          const progressPct = isDone
            ? 0
            : item.status === 'in_progress'
              ? 50
              : item.status === 'done'
                ? 100
                : 0
          return (
            <div
              key={item.id}
              data-testid={`gantt-row-${item.id}`}
              onClick={() => void setOpenItemId(item.id)}
              className="hover:bg-muted/50 flex cursor-pointer border-b"
              style={{ height: ROW_PX }}
            >
              <div
                className="flex shrink-0 items-center gap-2 border-r px-3 text-sm"
                style={{ width: LABEL_COL_PX }}
              >
                {/* 行番号 (TeamGantt 風 — 全体把握しやすく)。
                    iter1008: 親 div は role="row" + aria-rowindex を持ち SR には
                    既に position 情報を提供済。visible 番号は装飾なので aria-hidden
                    で SR の二重読み上げ ("1 / 2 / 3" を title 直前に毎行) を抑止。 */}
                <span
                  className="text-muted-foreground inline-block w-5 shrink-0 text-right text-xs tabular-nums"
                  data-testid={`gantt-row-num-${idx + 1}`}
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>
                <span className="truncate">{item.title}</span>
                {item.isMust && (
                  <span
                    // iter1383: text-red-600 (#e7000b) は dark gantt bg 上で 4.15:1 (<4.5)。
                    // dark:text-red-400 で dark でも pass (light は 600 維持)。
                    className="ml-1 shrink-0 text-xs text-red-600 dark:text-red-400"
                    role="img"
                    aria-label="MUST タスク"
                  >
                    <span aria-hidden="true">MUST</span>
                  </span>
                )}
              </div>
              <div style={{ width: timelineWidth, position: 'relative', height: ROW_PX }}>
                {hasBaseline && (
                  <div
                    data-testid={`gantt-baseline-${item.id}`}
                    role="img"
                    aria-label={`ベースライン ${item.baselineStartDate} → ${item.baselineEndDate}`}
                    className="pointer-events-none absolute"
                    style={{
                      left: baselineLeft,
                      width: baselineWidth,
                      bottom: 2,
                      height: 5,
                      background: 'rgba(100, 116, 139, 0.45)', // slate-500 半透明
                      borderRadius: 2,
                    }}
                    title={`baseline: ${item.baselineStartDate} → ${item.baselineEndDate}`}
                  />
                )}
                {spanDays === 1 ? (
                  // milestone (1 日完結) — TeamGantt 風 ◇ 菱形 (rotate 45)
                  <div
                    data-testid={`gantt-bar-${item.id}`}
                    data-milestone="true"
                    data-done={isDone ? 'true' : 'false'}
                    data-critical={criticalSet.has(item.id) ? 'true' : 'false'}
                    role="button"
                    tabIndex={0}
                    /* iter1500: aria-label と title attribute で format divergence
                       (aria-label `(milestone date)` vs title `date (milestone)` で SR と
                       mouse hover で異なる文字列が露見)。title と byte-identical な
                       em-dash 形式に統一、iter1093-1499 sweep convention とも整合。 */
                    aria-label={`${item.title} — ${format(start, 'yyyy-MM-dd')} (milestone)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}`}
                    className="focus-visible:ring-foreground absolute focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                    style={{
                      left: barLeft + (dayPx - 18) / 2,
                      top: (ROW_PX - 18) / 2,
                      width: 18,
                      height: 18,
                      background: barBg,
                      transform: 'rotate(45deg)',
                      // Subtle drop shadow + critical 強調の 2 段重ね (TeamGantt 風)
                      boxShadow: criticalSet.has(item.id)
                        ? '0 0 0 2px rgb(220, 38, 38), 0 1px 2px rgba(0,0,0,0.18)'
                        : '0 1px 2px rgba(0,0,0,0.18)',
                      cursor: 'pointer',
                    }}
                    title={`${item.title} — ${format(start, 'yyyy-MM-dd')} (milestone)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}`}
                    onClick={() => void setOpenItemId(item.id)}
                    onKeyDown={onBarKeyDown}
                  />
                ) : (
                  <div
                    data-testid={`gantt-bar-${item.id}`}
                    data-milestone="false"
                    data-done={isDone ? 'true' : 'false'}
                    data-critical={criticalSet.has(item.id) ? 'true' : 'false'}
                    data-dragging={drag?.barId === item.id && drag.moved ? 'true' : 'false'}
                    role="button"
                    tabIndex={0}
                    /* iter1500: 同上 — aria-label と title (line 765) を byte-identical
                       em-dash 形式に統一。${title} の後に em-dash で区切り、 ドラッグ hint も
                       title と同じ em-dash 区切に揃え iter1093-1499 sweep convention とも整合。 */
                    aria-label={`${item.title} — ${format(start, 'yyyy-MM-dd')} → ${format(due, 'yyyy-MM-dd')} (${spanDays}日)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}${progressPct > 0 ? ` [進捗 ${progressPct}%]` : ''}${dragEnabled ? ' — ドラッグで期間移動' : ''}`}
                    onKeyDown={onBarKeyDown}
                    onPointerDown={(e) => onBarPointerDown(e, item.id)}
                    onPointerMove={(e) => onBarPointerMove(e, item.id)}
                    onPointerUp={(e) =>
                      void onBarPointerUp(
                        e,
                        item.id,
                        item,
                        format(start, 'yyyy-MM-dd'),
                        format(due, 'yyyy-MM-dd'),
                      )
                    }
                    onPointerCancel={() => onBarPointerCancel(item.id)}
                    onClick={(e) => onBarClick(e, item.id)}
                    className="focus-visible:ring-foreground absolute top-1 flex items-center gap-1 overflow-hidden rounded text-xs leading-6 select-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                    style={{
                      left: barLeft,
                      width: barWidth,
                      height: ROW_PX - 8,
                      background: barBg,
                      color: 'white',
                      paddingLeft: 6,
                      paddingRight: 6,
                      // Subtle drop shadow + critical 強調の 2 段重ね (TeamGantt 風)
                      boxShadow: criticalSet.has(item.id)
                        ? '0 0 0 2px rgb(220, 38, 38), 0 1px 2px rgba(0,0,0,0.18)'
                        : '0 1px 2px rgba(0,0,0,0.18)',
                      cursor: dragEnabled
                        ? drag?.barId === item.id && drag.moved
                          ? 'grabbing'
                          : 'grab'
                        : 'pointer',
                      textDecoration: isDone ? 'line-through' : undefined,
                      // drag 中は snap to day で視覚 ghost (translateX) — TeamGantt 風
                      transform:
                        drag?.barId === item.id && drag.moved
                          ? `translateX(${computeSnappedDragPx(drag.deltaPx, dayPx)}px)`
                          : undefined,
                      opacity: drag?.barId === item.id && drag.moved ? 0.85 : undefined,
                      transition: drag?.barId === item.id ? 'none' : 'transform 120ms ease-out',
                      touchAction: 'none',
                    }}
                    title={`${item.title} — ${format(start, 'yyyy-MM-dd')} → ${format(due, 'yyyy-MM-dd')} (${spanDays}日)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}${progressPct > 0 ? ` [進捗 ${progressPct}%]` : ''}${dragEnabled ? ' — ドラッグで期間移動' : ''}`}
                  >
                    {progressPct > 0 && (
                      <div
                        data-testid={`gantt-progress-${item.id}`}
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 rounded-l"
                        style={{
                          width: `${progressPct}%`,
                          background: 'rgba(0, 0, 0, 0.2)',
                        }}
                      />
                    )}
                    {/* 短い bar (< 60px) では title 省略して d だけにする */}
                    {/* iter928: parent bar role="button" aria-label "${title} ... (${spanDays}日)..."
                        が完全 content を持つため、内側 visible title / spanDays span は
                        aria-hidden で SR 単独経路に集約 (iter918-927 続編)。 */}
                    {barWidth >= 60 && (
                      <span
                        className="truncate font-medium"
                        style={{ maxWidth: barWidth - 32 }}
                        aria-hidden="true"
                      >
                        {item.title}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 opacity-75" aria-hidden="true">
                      {spanDays}d
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
