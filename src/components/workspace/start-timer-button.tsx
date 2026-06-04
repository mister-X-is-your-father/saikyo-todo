'use client'

/**
 * Phase 6.15 iter 249 — Item に対してタスクタイマーを開始するボタン (TickTick 風)。
 *
 * 配置想定: ItemEditDialog 上部 / Backlog 行 / Today 行 等の主要 Item entry point。
 *
 * 状態の出し分け:
 *   1. **active timer 無し**: 「計測開始」 button、click で store.start
 *   2. **この Item で計測中**: 「計測中 (MM:SS)」 表示 (button は disabled、停止は
 *      右下 panel 側で行う)
 *   3. **別の Item で計測中**: 「他の Item を停止して開始」 button、click で確認後
 *      stop → start (新 Item)
 */
import { useEffect, useState } from 'react'

import { Timer } from 'lucide-react'
import { toast } from 'sonner'

import { formatElapsed, useActiveTimerStore } from '@/lib/stores/active-timer'

import { extractEstimateMinutes } from '@/features/item/estimate'
import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'

interface Props {
  /**
   * iter254: description も渡せるように緩めた (estimateMinutes 抽出用、optional)。
   * 渡されない場合 estimate なしで起動 (variance なし)。
   */
  item: Pick<Item, 'id' | 'title'> & { description?: string | null }
  /** 'sm' は Item 行向けの compact、'default' は dialog 向け */
  size?: 'sm' | 'default'
}

export function StartTimerButton({ item, size = 'default' }: Props) {
  const activeItemId = useActiveTimerStore((s) => s.itemId)
  const activeItemTitle = useActiveTimerStore((s) => s.itemTitle)
  const running = useActiveTimerStore((s) => s.running)
  const elapsedFn = useActiveTimerStore((s) => s.elapsedMs)
  const start = useActiveTimerStore((s) => s.start)
  const stopFn = useActiveTimerStore((s) => s.stop)

  // この Item で計測中なら経過時間を 1s ごとに re-render
  const isMine = activeItemId === item.id
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isMine || !running) return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [isMine, running])

  if (isMine) {
    // iter446: 旧 role="status" + aria-live="polite" は 1 秒 tick で SR queue を
    // flood する anti-pattern (iter426 ActiveTimerPanel elapsed span と同問題)。
    // role="img" + 集約 aria-label に切替えて on-demand 取得に変更、children を
    // AT 上隠蔽することで再 announce 抑制。
    return (
      <div
        className="text-muted-foreground inline-flex items-center gap-1 text-xs"
        data-testid={`start-timer-active-${item.id}`}
        role="img"
        aria-label={`「${item.title}」を計測中 — 経過 ${formatElapsed(elapsedFn())}、右下 panel で停止`}
        /* iter1949: visible は icon + 経過時間 + "計測中" 短文のみで item.title context が
           無い、sighted hover で full label disclose (inbox-region iter1945 と同 region/widget
           summary pattern)。 */
        title={`「${item.title}」を計測中 — 経過 ${formatElapsed(elapsedFn())}、右下 panel で停止`}
      >
        <Timer className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
        <span className="font-mono tabular-nums" aria-hidden="true">
          {formatElapsed(elapsedFn())}
        </span>
        <span className="text-[10px]" aria-hidden="true">
          計測中 — 右下 panel で停止
        </span>
      </div>
    )
  }

  const otherActive = activeItemId !== null
  const handleClick = () => {
    if (otherActive) {
      const ok = window.confirm(
        `「${activeItemTitle ?? '(別 Item)'}」のタイマーを停止して、「${item.title}」のタイマーを開始しますか?\n(現在の計測値は破棄されます)`,
      )
      if (!ok) return
      // stop は state クリアのみ。time_entries への保存は行わないので別途 toast 警告。
      const stopped = stopFn()
      if (stopped) {
        toast.warning(
          `「${stopped.itemTitle || '前の Item'}」の計測 (${formatElapsed(stopped.elapsedMs)}) は記録せず破棄しました`,
        )
      }
    }
    const estimateMinutes = extractEstimateMinutes(item.description) ?? null
    start({ itemId: item.id, itemTitle: item.title, estimateMinutes })
    toast.success(
      estimateMinutes
        ? `「${item.title}」のタイマーを開始しました (見積 ${estimateMinutes}分)`
        : `「${item.title}」のタイマーを開始しました`,
    )
  }

  // iter310: size='sm' (Today / Backlog 行) で otherActive 時に 12 文字超 ("別 Item を停止して計測開始")
  // が並び、行幅を圧迫して折返し / レイアウト崩れの原因に。compact 時のみ短縮した
  // visible label を出し、SR / hover には full hint を保つ。
  // iter1034: WCAG 2.5.3「Label in Name」 = accessible name は visible text を含む必要あり。
  // 旧 comment は「visible は aria-label の prefix」と主張していたが実際は不一致
  // ("切替して開始" は "「X」のタイマーを停止して「Y」の計測を開始" の substring ではない)。
  // 修正: aria-label を `${visibleLabel} — ${fullHint}` 形式で組立、視覚短縮ラベルを
  // 必ず accessible name の prefix にし voice-control match を保証。
  const isCompact = size === 'sm'
  const visibleLabel = otherActive
    ? isCompact
      ? '切替して開始'
      : '別 Item を停止して計測開始'
    : '計測開始'
  const fullHint = otherActive
    ? `「${activeItemTitle}」のタイマーを停止して「${item.title}」の計測を開始`
    : `「${item.title}」のタイマーを開始`
  const accessibleLabel = `${visibleLabel} — ${fullHint}`

  return (
    <Button
      type="button"
      variant="outline"
      size={isCompact ? 'sm' : 'default'}
      className="min-h-11"
      onClick={handleClick}
      data-testid={`start-timer-${item.id}`}
      aria-label={accessibleLabel}
      /* iter2271: start-timer (idle 通常 path) は旧 title が otherActive 時のみ fullHint で、
         normal idle (= 別 Item で計測なし) では title=undefined → sighted hover で何も出ず。
         aria-label の accessibleLabel は両 path とも full context だが SR にしか届かなかった。
         MCP path A で ItemEditDialog 内 start-timer button 探索中に発見、両 path とも
         accessibleLabel と同 text の title を付与し sync (iter1949 active-timer / iter2107
         redecompose と同 title-aria full sync pattern)。 */
      title={accessibleLabel}
    >
      <Timer className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      <span aria-hidden="true">{visibleLabel}</span>
    </Button>
  )
}
