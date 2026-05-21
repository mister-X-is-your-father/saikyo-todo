/**
 * iter519 (queue TC-1): TaskChute 1 列 timeline の表示順を決める pure 関数。
 *
 * 並び順:
 *   1. dueTime が指定されている item を先に (時刻昇順)
 *   2. 次に dueTime 無し scheduledFor==today の item (priority → createdAt 昇順)
 *   3. 最後に それ以外 (期限超過 / 未来日)
 *
 * 完了済 / 削除済 / archive 済 / scheduledFor が today 以外 (一部例外: 期限超過は含む)
 * は呼び出し側で除外する。本関数は `selected: Item[]` を受け取って 1 配列に sort して返すだけ。
 *
 * テスト: src/features/taskchute/sort-for-timeline.test.ts
 * 参照: docs/methodology-modes-plan.md §1 T-1 (1 列 linear timeline)
 */
import { pad2 } from '@/lib/date/iso'

import type { Item } from '@/features/item/schema'

export interface TimelineItem {
  item: Item
  /** sort 後の表示位置 (UI 側 key 用) */
  index: number
  /** 表示用の時刻 (HH:MM、null なら時刻未指定) */
  timeLabel: string | null
}

/**
 * dueTime "HH:MM:SS" → 分換算 (00:00 = 0、23:59 = 1439)。null/不正値は null。
 */
export function dueTimeToMinutes(dueTime: string | null | undefined): number | null {
  if (!dueTime) return null
  const m = /^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/.exec(dueTime)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

function priorityRank(priority: number): number {
  // priority: 1 = highest, 4 = none → sort 昇順で 1 が先
  return Math.max(1, Math.min(4, priority))
}

export function sortForTimeline(items: Item[]): TimelineItem[] {
  // 1) dueTime あり → 時刻昇順
  const withTime: { item: Item; minutes: number }[] = []
  // 2) dueTime 無し → priority → createdAt
  const noTime: Item[] = []

  for (const it of items) {
    const minutes = dueTimeToMinutes(it.dueTime)
    if (minutes !== null) withTime.push({ item: it, minutes })
    else noTime.push(it)
  }

  withTime.sort((a, b) => {
    if (a.minutes !== b.minutes) return a.minutes - b.minutes
    if (priorityRank(a.item.priority) !== priorityRank(b.item.priority)) {
      return priorityRank(a.item.priority) - priorityRank(b.item.priority)
    }
    // tie-breaker: createdAt 昇順 (古い方が先 = 段取り順を尊重)
    return a.item.createdAt.getTime() - b.item.createdAt.getTime()
  })

  noTime.sort((a, b) => {
    if (priorityRank(a.priority) !== priorityRank(b.priority)) {
      return priorityRank(a.priority) - priorityRank(b.priority)
    }
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  const formatTime = (m: number): string => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`

  const out: TimelineItem[] = []
  let idx = 0
  for (const w of withTime) {
    out.push({ item: w.item, index: idx, timeLabel: formatTime(w.minutes) })
    idx++
  }
  for (const n of noTime) {
    out.push({ item: n, index: idx, timeLabel: null })
    idx++
  }
  return out
}
