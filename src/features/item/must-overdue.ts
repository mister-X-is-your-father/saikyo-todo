/**
 * iter372 ai-automation: MUST × overdue active combinator。
 *
 * iter367 overdue-active (= 期限超過で未完了 全般) と must-hygiene (= MUST + dueDate
 * 設定状況) を 2 軸で交差させた combinator。iter384 (`aged-hygiene-debt` =
 * hygiene-debt × aging) や iter397 (`stale-urgent` = urgency × aging) や iter364
 * (`must-stuck-wip` = MUST × stuck WIP) と同パターンの 2 軸交差 substrate。
 *
 * 単独 overdue-active (期限超過全般) や単独 must-hygiene (MUST 全般) より signal 強度が
 * 高い: MUST はあって当然、overdue も発生して当然、しかし両方該当 = 「絶対落とせない
 * MUST が既に期限を超えて未完了」 = MVP の核「MUST 絶対落とさない」の最も深刻な違反。
 * must-stuck-wip (MUST × 進行中で停滞) と相補で、こちらは「未完了で期限超過」軸。
 *
 * caller benefits:
 *   - AI 朝 brief 「MUST 期限超過 2 件 (最古 14 日) — 即対応」を 1 関数で
 *   - pm-agent watch list の最高優先 escalation 候補
 *   - dashboard 専用 chip (severity 'critical' = red、must-stuck-wip と異なる軸)
 */

import { computeOverdueActive, type OverdueActiveFields } from './overdue-active'

export interface MustOverdueFields extends OverdueActiveFields {
  isMust: boolean | null | undefined
}

export interface MustOverdueStats {
  /** isMust + overdue active 件数 */
  total: number
  /** 最も超過日数が大きい MUST item の `today - dueDate` (件数 0 → null) */
  oldestOverdueDays: number | null
}

const EMPTY: MustOverdueStats = { total: 0, oldestOverdueDays: null }

/**
 * isMust=true かつ overdue active な items を 2 軸交差で集計。
 *
 * 仕様:
 *   - isMust=true (null/false/undefined は除外)
 *   - overdue active (= dueDate < today valid ISO + done/archive/cancelled 除外)
 *     は computeOverdueActive と同じロジックを isMust 配列に再適用 (status 4 bucket
 *     は使わず、total / oldestOverdueDays のみ取り出す)
 */
export function computeMustOverdue<T extends MustOverdueFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): MustOverdueStats {
  const onlyMust: T[] = []
  for (const it of items) {
    if (it && it.isMust) onlyMust.push(it)
  }
  if (onlyMust.length === 0) return EMPTY
  const stats = computeOverdueActive(onlyMust, today)
  return { total: stats.total, oldestOverdueDays: stats.oldestOverdueDays }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'MUST 期限超過 2 件 (最古 14 日) — 即対応'`
 *   `'MUST 期限超過 1 件 (今日付)'` (= oldestOverdueDays === 0 = 直前)
 *   `'MUST 期限超過 0 件'`
 *
 * caller (AI brief / dashboard) は本文字列をそのまま埋め込める。
 */
export function formatMustOverdueJa(stats: MustOverdueStats): string {
  if (stats.total === 0) return 'MUST 期限超過 0 件'
  const days = stats.oldestOverdueDays ?? 0
  if (days >= 1) {
    return `MUST 期限超過 ${stats.total} 件 (最古 ${days} 日) — 即対応`
  }
  return `MUST 期限超過 ${stats.total} 件 (今日付)`
}

/**
 * dashboard chip 配色用の severity bucket:
 *  - 'critical' (= 1+ 件 = MUST 絶対落とさない原則違反、red 強警報)
 *  - 'idle' (= 0 件 = 健全)
 *
 * MUST に絞った時点で既に最深刻なので 2 値で十分。
 */
export type MustOverdueSeverity = 'critical' | 'idle'

export function mustOverdueSeverity(stats: MustOverdueStats): MustOverdueSeverity {
  return stats.total > 0 ? 'critical' : 'idle'
}
