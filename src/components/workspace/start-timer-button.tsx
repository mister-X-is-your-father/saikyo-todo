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

import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'

interface Props {
  item: Pick<Item, 'id' | 'title'>
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
    return (
      <div
        className="text-muted-foreground inline-flex items-center gap-1 text-xs"
        data-testid={`start-timer-active-${item.id}`}
        role="status"
        aria-live="polite"
      >
        <Timer className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
        <span className="font-mono tabular-nums">{formatElapsed(elapsedFn())}</span>
        <span className="text-[10px]">計測中 — 右下 panel で停止</span>
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
    start({ itemId: item.id, itemTitle: item.title })
    toast.success(`「${item.title}」のタイマーを開始しました`)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size === 'sm' ? 'sm' : 'default'}
      onClick={handleClick}
      data-testid={`start-timer-${item.id}`}
      aria-label={
        otherActive
          ? `「${activeItemTitle}」のタイマーを停止して「${item.title}」の計測を開始`
          : `「${item.title}」のタイマーを開始`
      }
    >
      <Timer className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      {otherActive ? '別 Item を停止して計測開始' : '計測開始'}
    </Button>
  )
}
