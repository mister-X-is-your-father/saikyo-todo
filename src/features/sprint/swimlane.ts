/**
 * iter468 P0 (queue: Sprint 担当者 swim-lane Gantt scope A substrate):
 * Sprint 期間内に Item bar を配置する % position 計算 + 日数計算 + clip 処理の
 * pure helper。
 *
 * 「スプリントごとに、担当者を縦に並べて何をするかをわかるような機能 (がんと的な)」
 * (2026-04-30 ユーザ要望) の **scope A 最小** SprintCard 内 disclosure に bind
 * するための substrate。次 iter で SprintCard に「担当者ビュー」 disclosure を
 * 追加し、本 helper で各 bar の left% / width% を render。
 *
 * 既存資産:
 *  - `parseIsoDateAsLocalMidnight` (lib/date/iso) で `YYYY-MM-DD` → Date
 *  - `MS_PER_DAY` (lib/date/iso) で 1 日 ms 定数
 *  - sprint.startDate / endDate は drizzle date col (ISO `YYYY-MM-DD`)
 *
 * 仕様:
 *  - sprint 期間 = [startDate..endDate] (両端 inclusive)、totalDays = endDate -
 *    startDate + 1
 *  - bar 期間 = [item.startDate ?? item.scheduledFor, item.dueDate]、両端 inclusive
 *  - sprint 期間外への突出は clip (sprint 範囲内の部分のみ可視)
 *  - 完全に sprint 範囲外 (item 終了 < sprint 開始 OR item 開始 > sprint 終了) →
 *    null sentinel (UI は bar 非表示 / 別 box)
 *  - 開始 / 終了 ISO が不正 / null → null sentinel
 */

import { MS_PER_DAY, parseIsoDateAsLocalMidnight } from '@/lib/date/iso'
import { round2 } from '@/lib/round-decimal'

export interface SwimlanePeriod {
  /** sprint or 表示範囲の start (ISO `YYYY-MM-DD`) */
  startDate: string
  /** sprint or 表示範囲の end (両端 inclusive、ISO) */
  endDate: string
}

export interface SwimlaneItemSource {
  id: string
  /** item の表示開始 (= startDate ?? scheduledFor)、null は除外候補 */
  startDate: string | null
  /** item の表示終了 (= dueDate)、null は除外候補 */
  dueDate: string | null
}

export interface SwimlaneBarPosition {
  /** sprint 範囲内の bar の左端 (= start を sprint 開始からの日数で 0..1 正規化) */
  leftPct: number
  /** sprint 範囲内の bar の幅 (両端 inclusive 日数 / sprint totalDays) */
  widthPct: number
  /** clip された結果の表示 開始 ISO (sprint 範囲内に丸めた start) */
  visibleStart: string
  /** clip された結果の表示 終了 ISO */
  visibleEnd: string
  /** sprint 範囲内に完全に収まるか (= clip なし) */
  fullyContained: boolean
  /** clip 由来 (= 元の bar が sprint より早くから始まる / 後まで続く) */
  clippedAtStart: boolean
  clippedAtEnd: boolean
}

export function computeSwimlaneBarPosition(
  item: SwimlaneItemSource,
  period: SwimlanePeriod,
): SwimlaneBarPosition | null {
  if (!item.startDate || !item.dueDate) return null
  const itemStart = parseIsoDateAsLocalMidnight(item.startDate)
  const itemEnd = parseIsoDateAsLocalMidnight(item.dueDate)
  const periodStart = parseIsoDateAsLocalMidnight(period.startDate)
  const periodEnd = parseIsoDateAsLocalMidnight(period.endDate)
  if (!itemStart || !itemEnd || !periodStart || !periodEnd) return null
  if (itemEnd.getTime() < itemStart.getTime()) return null
  if (periodEnd.getTime() < periodStart.getTime()) return null

  // 完全範囲外
  if (itemEnd.getTime() < periodStart.getTime()) return null
  if (itemStart.getTime() > periodEnd.getTime()) return null

  const visibleStartDate = itemStart.getTime() < periodStart.getTime() ? periodStart : itemStart
  const visibleEndDate = itemEnd.getTime() > periodEnd.getTime() ? periodEnd : itemEnd

  const totalDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY) + 1
  const offsetDays = Math.round((visibleStartDate.getTime() - periodStart.getTime()) / MS_PER_DAY)
  const visibleDays =
    Math.round((visibleEndDate.getTime() - visibleStartDate.getTime()) / MS_PER_DAY) + 1

  const leftPct = (offsetDays / totalDays) * 100
  const widthPct = (visibleDays / totalDays) * 100

  return {
    leftPct: round2(leftPct),
    widthPct: round2(widthPct),
    visibleStart: formatIso(visibleStartDate),
    visibleEnd: formatIso(visibleEndDate),
    fullyContained:
      itemStart.getTime() >= periodStart.getTime() && itemEnd.getTime() <= periodEnd.getTime(),
    clippedAtStart: itemStart.getTime() < periodStart.getTime(),
    clippedAtEnd: itemEnd.getTime() > periodEnd.getTime(),
  }
}

/**
 * `items` を「assignee actor (`actorType:actorId`)」キーで group 化。各 item は
 * 1 人以上の assignee を持つ場合は重複 entry になる (= 各 lane に表示)。
 * assignee ゼロは null キー (= "未割当" lane) に。
 *
 * key 形式: `${actorType}:${actorId}` で actorType 違いの同 id 衝突を回避。
 * null キーは literal `null` (Map key でそのまま使える)。
 */
export interface SwimlaneAssigneeRef {
  actorType: string
  actorId: string
}

export function groupItemsByAssigneeKey<T extends { id: string }>(
  items: ReadonlyArray<T>,
  getAssignees: (itemId: string) => ReadonlyArray<SwimlaneAssigneeRef>,
): Map<string | null, T[]> {
  const out = new Map<string | null, T[]>()
  for (const it of items) {
    const refs = getAssignees(it.id)
    if (refs.length === 0) {
      const list = out.get(null) ?? []
      list.push(it)
      out.set(null, list)
      continue
    }
    for (const r of refs) {
      const key = `${r.actorType}:${r.actorId}`
      const list = out.get(key) ?? []
      list.push(it)
      out.set(key, list)
    }
  }
  return out
}

function formatIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// iter965 refactor: round2 は lib/round-decimal.ts に集約。
