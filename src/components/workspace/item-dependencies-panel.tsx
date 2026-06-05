'use client'

/**
 * Item 依存関係 (item_dependencies) Panel — ItemEditDialog の "依存" tab。
 *
 *   - 前提条件 (blockedBy): この Item が後続。上流 Item の完了待ち
 *   - 後続タスク (blocking): この Item が前提。自分の完了を待つ Item
 *   - 関連    (related)   : relates_to 双方向
 *
 * 追加 picker は同 workspace の Item を select。type は blocks / relates_to。
 * - blocks: 上流 (前提) になる Item を選ぶ → fromItemId=picked, toItemId=self
 *   （= "この Item は picked の後続")
 * - relates_to: 関連を結ぶ → fromItemId=self, toItemId=picked
 *
 * iter301 basics: 各 row 行頭に **方向 icon** (← 前提 / → 後続 / ⇄ 関連) を配置、
 * status は raw 文字列 → `StatusBadge` (icon + 配色 chip) に統一。section 全体の
 * accent 色は header 周辺で残し、row 内の status 表現は app 共通 graphical pattern
 * (subtask-panel / Today / Inbox 等) と揃える (FEEDBACK_QUEUE「Item dependencies
 * tab: 依存先を visual chain (矢印付き mini DAG) で」候補の前段)。
 */
import { useMemo, useState } from 'react'

import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Circle,
  CircleCheck,
  CirclePause,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useItems } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'
import { getStatusVisual } from '@/features/item/status-visual'
import {
  useAddItemDependency,
  useItemDependencies,
  useRemoveItemDependency,
} from '@/features/item-dependency/hooks'
import {
  type DependencyReadinessIconKey,
  formatDependencyReadiness,
  getDependencyReadinessVisual,
  summarizeDependencyReadiness,
} from '@/features/item-dependency/readiness'
import type { ItemDependencyType } from '@/features/item-dependency/schema'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MustBadge } from '@/components/workspace/must-badge'
import { StatusBadge } from '@/components/workspace/status-badge'

/**
 * iter411 basics: readiness-visual の iconKey を Lucide component に map。
 * `STATUS_ICONS` (status-badge.tsx) / `ACTION_ICON` (activity-log.tsx) と同パターン。
 */
const READINESS_ICON: Record<DependencyReadinessIconKey, LucideIcon> = {
  check: CircleCheck,
  pause: CirclePause,
  idle: Circle,
}

interface Props {
  workspaceId: string
  item: Item
}

export function ItemDependenciesPanel({ workspaceId, item }: Props) {
  const { data, isLoading } = useItemDependencies(item.id)
  const allItems = useItems(workspaceId)
  const add = useAddItemDependency(item.id)
  const remove = useRemoveItemDependency(item.id)

  const [pickKind, setPickKind] = useState<'prerequisite' | 'related'>('prerequisite')
  const [pickId, setPickId] = useState('')

  const candidates = useMemo(() => {
    const all = allItems.data ?? []
    return all.filter((i) => i.id !== item.id && !i.deletedAt)
  }, [allItems.data, item.id])

  async function handleAdd() {
    if (!pickId) return
    try {
      if (pickKind === 'prerequisite') {
        // 自分が後続 → fromItemId = picked, toItemId = self, type='blocks'
        await add.mutateAsync({ fromItemId: pickId, toItemId: item.id, type: 'blocks' })
      } else {
        await add.mutateAsync({ fromItemId: item.id, toItemId: pickId, type: 'relates_to' })
      }
      setPickId('')
      toast.success('依存を追加しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '追加に失敗しました')
    }
  }

  async function handleRemove(args: {
    fromItemId: string
    toItemId: string
    type: ItemDependencyType
  }) {
    try {
      await remove.mutateAsync(args)
      toast.success('依存を解除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '解除に失敗しました')
    }
  }

  if (isLoading)
    return (
      <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
        読み込み中…
      </p>
    )

  const blockedBy = data?.blockedBy ?? []
  const blocking = data?.blocking ?? []
  const related = data?.related ?? []
  // iter306 basics: iter297 で整備済の summarizeDependencyReadiness substrate を UI bind。
  // 依存タブを開いた時に「いま着手可能か / 何件残っているか」が一瞥で伝わる readiness chip を
  // 先頭に配置 (FEEDBACK_QUEUE「Item dependencies tab: 依存先を visual chain」候補の前段)。
  // iter411 basics: tone (色 + Lucide icon) を `getDependencyReadinessVisual` に集約。
  // 旧 inline ternary + unicode glyph (✓/⏸/·) を status-badge / sprint-progress と
  // 同じ graphical pattern (Lucide icon + Tailwind class set) に統一。
  const readiness = summarizeDependencyReadiness({ blockedBy, blocking, related })
  const readinessSummary = formatDependencyReadiness(readiness)
  const readinessVisual = getDependencyReadinessVisual(readiness)
  const ReadinessIcon = READINESS_ICON[readinessVisual.iconKey]

  return (
    <div className="space-y-5" data-testid="dependencies-panel">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ${readinessVisual.bgClass} ${readinessVisual.textClass} ${readinessVisual.ringClass}`}
        role="status"
        aria-live="polite"
        /* iter1569: 旧 aria-label `"依存サマリ (${toneLabel}): ${readinessSummary}"` は visible
           "${readinessSummary}" を末尾に持ち voice control prefix-matching が strict prefix-match
           で不可 (substring 一致のみ)。iter1553-1568 status/role/health/傾向/summary chip family と
           同 pattern、visible 冒頭固定 + em-dash 区切。 */
        aria-label={`${readinessSummary} — 依存サマリ (${readinessVisual.toneLabel})`}
        /* iter2177: dep-readiness-chip の aria-label は browser tooltip にならず sighted は
           hover で 依存サマリ tone label disclose 不可。sync-error iter2175 / pdca-daily-bars
           iter2173 と同 title=aria-label sync pattern。 */
        title={`${readinessSummary} — 依存サマリ (${readinessVisual.toneLabel})`}
        data-testid="dep-readiness-chip"
        data-blocked={readiness.isBlocked}
        data-tone={readinessVisual.tone}
      >
        <ReadinessIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
        {/* iter920: parent role="status" aria-label "依存サマリ (${toneLabel}): ${readinessSummary}"
            が完全 content を持つため、内側 visible {readinessSummary} は二重読み上げ →
            aria-hidden で SR 単独経路に集約 (iter918 operation-board / iter907/909-919 続編)。 */}
        <span aria-hidden="true">{readinessSummary}</span>
      </div>
      <Section
        title="前提条件 (これが終わらないと進められない)"
        emptyText="前提条件はありません"
        items={blockedBy}
        onRemove={(ref) => handleRemove({ fromItemId: ref.id, toItemId: item.id, type: 'blocks' })}
        removing={remove.isPending}
        direction="incoming"
      />
      <Section
        title="後続タスク (この Item を待っている)"
        emptyText="後続タスクはありません"
        items={blocking}
        onRemove={(ref) => handleRemove({ fromItemId: item.id, toItemId: ref.id, type: 'blocks' })}
        removing={remove.isPending}
        direction="outgoing"
      />
      <Section
        title="関連"
        emptyText="関連はありません"
        items={related}
        onRemove={(ref) =>
          handleRemove({ fromItemId: item.id, toItemId: ref.id, type: 'relates_to' })
        }
        removing={remove.isPending}
        direction="mutual"
      />

      <div
        className="space-y-2 rounded border border-dashed p-3"
        role="group"
        aria-labelledby="dep-add-label"
      >
        <Label id="dep-add-label">{`「${item.title}」の依存を追加`}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pickKind}
            onChange={(e) => setPickKind(e.target.value as 'prerequisite' | 'related')}
            className="min-h-11 rounded border px-2 py-1.5 text-sm"
            required
            aria-required="true"
            data-testid="dep-kind"
            // iter1195: 旧 aria-label `依存の種類 (現在: 前提条件 ...)` は visible
            // (option text "前提条件 (上流)" / "関連") を中位置 "(現在: ...)" 内に持ち
            // voice control prefix-matching「click 前提条件 / 関連」 match 不可
            // (src-kind iter1192 / sprint-defaults-dow iter1194 同 sweep)。
            aria-label={(() => {
              const visible =
                pickKind === 'prerequisite'
                  ? '前提条件 (上流、これが完了しないと本 Item を着手できない)'
                  : pickKind === 'related'
                    ? '関連 (緩い結び付き、進行ブロックではない)'
                    : pickKind
              return `${visible} — 依存の種類 (現在: ${visible})`
            })()}
            /* iter2373: dep-kind select の aria-label IIFE は SR に 現在 kind +
               依存意味 (= 前提条件: 着手 blocker / 関連: 緩い結び付き、ブロックなし) を
               渡すが native <select> でも aria-label は browser tooltip にならず sighted
               は hover で同 mental model (= 依存の強さの差) 把握不可。option text
               "前提条件 (上流)" / "関連" のみ disclose で着手 blocker / 緩い結び付き の
               実質的な意味は disclose されない。KR 進捗算出モード iter2371 /
               sprint-defaults-dow iter2369 / gantt-zoom-select iter2361 と同 select
               title-aria sync pattern を dep-kind にも展開、依存 setup form の選択基準
               hover disclose 補完。 */
            title={(() => {
              const visible =
                pickKind === 'prerequisite'
                  ? '前提条件 (上流、これが完了しないと本 Item を着手できない)'
                  : pickKind === 'related'
                    ? '関連 (緩い結び付き、進行ブロックではない)'
                    : pickKind
              return `${visible} — 依存の種類 (現在: ${visible})`
            })()}
          >
            <option value="prerequisite">前提条件 (上流)</option>
            <option value="related">関連</option>
          </select>
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="min-h-11 min-w-[260px] flex-1 rounded border px-2 py-1.5 text-sm"
            data-testid="dep-target"
            required
            aria-required="true"
            aria-label={
              candidates.length === 0
                ? '依存先 Item — 選択可能な候補がありません (本 Item と循環しない他の Item を作成すると候補に出ます)'
                : `依存先 Item (候補 ${candidates.length} 件、本 Item と循環しないものに限定)`
            }
            /* iter2375: dep-target select の aria-label は state-dependent 2-path
               (候補 0 件 / 候補 N 件) で SR に candidates 状況 + 循環防止 caveat を
               渡すが native <select> でも aria-label は browser tooltip にならず sighted
               は hover で同 context (= 0 件時 "他の Item を作成すれば出ます" hint /
               N 件時 "循環しないものに限定" caveat) 把握不可。option text "Item を選択…"
               のみ disclose で「依存先 Item」 という設定対象名 + 循環防止規約も hover
               非可視。dep-kind iter2373 と pair で 依存 setup form の 2 select 全 hover
               disclose 完備。 */
            title={
              candidates.length === 0
                ? '依存先 Item — 選択可能な候補がありません (本 Item と循環しない他の Item を作成すると候補に出ます)'
                : `依存先 Item (候補 ${candidates.length} 件、本 Item と循環しないものに限定)`
            }
          >
            <option value="">Item を選択…</option>
            {candidates.map((c) => {
              const statusJa = getStatusVisual(c.status).shortLabel
              return (
                <option
                  key={c.id}
                  value={c.id}
                  aria-label={
                    c.isMust ? `MUST: ${c.title} (${statusJa})` : `${c.title} (${statusJa})`
                  }
                >
                  {c.isMust ? '⚠ ' : ''}
                  {c.title} [{statusJa}]
                </option>
              )
            })}
          </select>
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            disabled={!pickId || add.isPending}
            aria-busy={add.isPending || undefined}
            onClick={() => void handleAdd()}
            data-testid="dep-add-btn"
            // iter1163: 旧 aria-label 3 path とも visible "追加" / "追加中…" を
            // 中位置 ("依存を追加するには ..." / "依存を追加中…" / "依存先として追加")
            // に持ち voice control prefix-matching「click 追加 / 追加中…」 match 不可
            // (substring 一致のみ)。iter1093-1162 sweep に揃え visible 冒頭固定。
            aria-label={
              !pickId
                ? '追加 — 依存を追加するには対象 Item を選択してください'
                : add.isPending
                  ? '追加中… — 依存を追加中…'
                  : '追加 — 選択した Item を依存先として追加'
            }
            /* iter2377: dep-add-btn の aria-label は state-dependent 3-path (未選択 /
               pending / selectable) で SR には full action context + 操作前提 hint を
               渡すが visible "追加" / "追加中…" のみで sighted hover で 「対象 Item を
               選択してください」 hint や対象指定の hint が disclose 不可。submit
               button iter1791 / sprint-period-save iter2351 と同 state-dependent button
               title pattern を dep-add-btn にも展開、依存 setup form の add button UX
               補完 (未選択時の操作 hint hover disclose)。 */
            title={
              !pickId
                ? '追加 — 依存を追加するには対象 Item を選択してください'
                : add.isPending
                  ? '追加中… — 依存を追加中…'
                  : '追加 — 選択した Item を依存先として追加'
            }
          >
            <span aria-hidden="true">{add.isPending ? '追加中…' : '追加'}</span>
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">循環 (A → B → A) になる依存は拒否されます</p>
      </div>
    </div>
  )
}

/**
 * 依存方向を視覚化するための icon + tooltip + sr 文言の対応。
 * - incoming (前提条件): ← 「この Item を待っている上流」
 * - outgoing (後続タスク): → 「この Item を待つ下流」
 * - mutual (関連): ⇄ 「双方向の関連」
 *
 * icon の色は section 種別を伝える役割を兼ねる (rose=前提 / amber=後続 / slate=関連)。
 */
type DependencyDirection = 'incoming' | 'outgoing' | 'mutual'

const DIRECTION_CONFIG: Record<
  DependencyDirection,
  { icon: LucideIcon; iconClass: string; srLabel: string }
> = {
  incoming: {
    icon: ArrowLeft,
    iconClass: 'text-rose-600 dark:text-rose-400',
    srLabel: '前提 (この Item は上流の完了を待っている)',
  },
  outgoing: {
    icon: ArrowRight,
    iconClass: 'text-amber-600 dark:text-amber-400',
    srLabel: '後続 (この Item の完了を待っている)',
  },
  mutual: {
    icon: ArrowLeftRight,
    iconClass: 'text-slate-500 dark:text-slate-400',
    srLabel: '関連 (双方向)',
  },
}

function Section({
  title,
  emptyText,
  items,
  onRemove,
  removing,
  direction,
}: {
  title: string
  emptyText: string
  items: Array<{
    ref: { id: string; title: string; status: string; isMust: boolean; doneAt: Date | null }
    createdAt: Date
  }>
  onRemove: (ref: { id: string; title: string; status: string }) => void
  removing?: boolean
  direction: DependencyDirection
}) {
  const { icon: DirectionIcon, iconClass, srLabel } = DIRECTION_CONFIG[direction]

  // iter450: <h3> に id を付与し下流 <ul> を aria-labelledby で連携 (iter427 /
  // iter428 / iter438 / iter447-449 と同 widget heading 統一 pattern 13 件目)。
  const headingId = `dep-section-${direction}-heading`
  return (
    <div className="space-y-2">
      <h3 id={headingId} className="text-sm font-semibold">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-1" aria-labelledby={headingId}>
          {items.map(({ ref }) => (
            <li
              key={ref.id}
              className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm"
              data-testid={`dep-${ref.id}`}
              data-direction={direction}
            >
              {/* iter1907: 矢印 icon-only で sighted は方向が分かるが「前提タスク」/
                  「依存先タスク」 等 specific srLabel は disclose されず、hover で disclose
                  (iter1905 activity actor / iter1903 activity icon と同 status chip pattern)。
                  Lucide icon の title prop は内部 <title> 要素になり SR が aria-label と
                  二重 announce する恐れあるため、wrapper span に title 付与で sighted hover
                  のみ disclose。 */}
              <span title={srLabel} className="inline-flex shrink-0">
                <DirectionIcon className={`h-4 w-4 ${iconClass}`} role="img" aria-label={srLabel} />
              </span>
              <StatusBadge status={ref.status} className="text-[10px]" iconOnly />
              {/* iter1751: dependency ref title span は truncate で長 title 切れ、title 付与で
                  sighted hover → 全文 disclose (iter1720-1750 sweep の item-dependencies 展開)。 */}
              <span className="flex-1 truncate" title={ref.title}>
                {ref.isMust && <MustBadge className="mr-1" iconOnly />}
                {ref.title}
              </span>
              {ref.doneAt && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">完了済み</span>
              )}
              {/* iter1301: 旧 aria-label `依存「title」を解除[中…]` は visible "解除" を
                  末尾 "を**解除**" position に持ち voice control prefix-matching
                  「click 解除」 match 不可 (substring 一致のみ)。backlog-edit iter1152 /
                  sprint-defaults-edit iter1153 と同 sweep convention で visible "解除" 冒頭固定 +
                  em-dash 区切で descriptive 末尾 (依存 title) 保持。visible span は behavior
                  互換のため "解除" 固定 (pending state は aria-busy のみ)。 */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={() => onRemove(ref)}
                disabled={removing}
                aria-busy={removing || undefined}
                data-testid={`dep-remove-${ref.id}`}
                aria-label={
                  removing
                    ? `解除 — 依存「${ref.title}」を解除中…`
                    : `解除 — 依存「${ref.title}」を解除`
                }
                /* iter2111: dep-remove title (静的 template) は state-dependent
                   aria-label (解除中… / 解除 2-path) と divergent → 2-path sync。
                   proposal-accept/reject iter2109 / proposals-redecompose iter2107 と
                   同 title-aria divergence 修正 pattern。state context を sighted
                   hover で disclose。 */
                title={
                  removing
                    ? `解除 — 依存「${ref.title}」を解除中…`
                    : `解除 — 依存「${ref.title}」を解除`
                }
              >
                <span aria-hidden="true">解除</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
