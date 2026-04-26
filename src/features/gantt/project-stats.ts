/**
 * Gantt summary banner で表示する集計値を計算する純粋関数。
 * Phase 6.15 iter 87 — gantt-view の inline ループから抽出して unit test 化。
 *
 * 入力: 期間が引ける item の (item, start, due) リスト
 * 出力:
 *   - baselineCount  : baselineEndDate が set されている item 数
 *   - slipItemCount  : (due > baselineEndDate) の item 数 (= 遅延中)
 *   - totalSlipDays  : 上記 item の遅延日数合計 (≥ 0)
 *
 * baseline_pair_check (DB CHECK) 上、baselineStartDate と baselineEndDate は
 * 同時に NULL or 同時に set。この関数は baselineEndDate のみ参照。
 */
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'

import type { Item } from '@/features/item/schema'

export interface DatedItem {
  item: Item
  /** Item.dueDate を Date に解釈したもの (caller が既に持っている前提) */
  due: Date
}

export interface ProjectStats {
  baselineCount: number
  slipItemCount: number
  totalSlipDays: number
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null
  const d = typeof v === 'string' ? parseISO(v) : v
  return isValid(d) ? d : null
}

export function computeProjectStats(rows: DatedItem[]): ProjectStats {
  let baselineCount = 0
  let slipItemCount = 0
  let totalSlipDays = 0
  for (const x of rows) {
    const blEnd = toDate(x.item.baselineEndDate)
    if (!blEnd) continue
    baselineCount += 1
    const slip = differenceInCalendarDays(x.due, blEnd)
    if (slip > 0) {
      slipItemCount += 1
      totalSlipDays += slip
    }
  }
  return { baselineCount, slipItemCount, totalSlipDays }
}

/**
 * Gantt bar の title attr に追記する slip 表示文字列。
 * - baseline 未設定 (hasBaseline=false): '' (空文字)
 * - slipDays > 0: ` [遅延 +N日]`
 * - slipDays < 0: ` [前倒し N日]` (符号付き=負数のまま見せる)
 * - slipDays === 0: ` [計画通り]`
 *
 * 先頭スペース込みで返すので caller は単純に template literal に挿入できる。
 */
export function formatSlipText(slipDays: number, hasBaseline: boolean): string {
  if (!hasBaseline) return ''
  if (slipDays > 0) return ` [遅延 +${slipDays}日]`
  if (slipDays < 0) return ` [前倒し ${slipDays}日]`
  return ' [計画通り]'
}
