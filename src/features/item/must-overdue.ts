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

import { MS_PER_DAY, parseDateOrNull, parseIsoDateAsLocalMidnight } from '@/lib/date/iso'
import { formatTopWithOverflow } from '@/lib/format-list'

import { computeOverdueActive, type OverdueActiveFields } from './overdue-active'
import { bucketByPriorityWith, formatPriorityBuckets, type PriorityKey } from './priority'

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

/** pickMustOverdueItems の戻り単 entry。item + 何日 overdue か。 */
export interface MustOverdueEntry<T extends MustOverdueFields> {
  item: T
  /** today - dueDate (整数日数、Math.floor) */
  overdueDays: number
}

/**
 * iter379 ai-automation: isMust=true かつ overdue active な items を実際に抽出して
 * overdueDays 降順で返す pure helper。
 *
 * computeMustOverdue は stats (total / oldestOverdueDays) のみだったが、AI 朝 brief や
 * dashboard tooltip で「具体的にどの MUST が期限超過しているか」を見せたい時は items
 * 一覧が必要。本 helper はその gap を埋める。
 *
 * 仕様 (computeOverdueActive と filter ロジック互換、isMust 追加):
 *   - isMust=true (null/false/undefined 除外)
 *   - dueDate valid ISO + dueDate < today
 *   - done/archive/cancelled 除外
 *   - 並び: overdueDays 降順 (= 最も deeply overdue)、tie で元配列順 stable
 */
export function pickMustOverdueItems<T extends MustOverdueFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): MustOverdueEntry<T>[] {
  const todayDate = parseDateOrNull(today)
  if (!todayDate) return []
  const todayMidnightMs = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate(),
  ).getTime()

  const enriched: { entry: MustOverdueEntry<T>; index: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it || !it.isMust) continue
    if (it.doneAt || it.archivedAt) continue
    if (it.status === 'cancelled' || it.status === 'done') continue
    if (typeof it.dueDate !== 'string') continue
    const dueMidnight = parseIsoDateAsLocalMidnight(it.dueDate)
    if (!dueMidnight) continue
    const dueMs = dueMidnight.getTime()
    if (dueMs >= todayMidnightMs) continue
    const overdueDays = Math.floor((todayMidnightMs - dueMs) / MS_PER_DAY)
    enriched.push({ entry: { item: it, overdueDays }, index: i })
  }
  enriched.sort((a, b) => {
    if (b.entry.overdueDays !== a.entry.overdueDays) {
      return b.entry.overdueDays - a.entry.overdueDays
    }
    return a.index - b.index
  })
  return enriched.map((e) => e.entry)
}

/** caller の MUST item に title が含まれる場合の structural subset。 */
export type MustOverdueWithTitle = MustOverdueFields & { title?: string | null }

/**
 * AI prompt 用 1 行サマリ (title list 付き):
 *   `'MUST 期限超過: 提出書類 14日 / 連絡 5日 / 他 1 件'`
 *   `'MUST 期限超過 0 件'`
 */
export function formatMustOverdueTitlesJa<T extends MustOverdueWithTitle>(
  entries: readonly MustOverdueEntry<T>[],
  limit: number = 3,
): string {
  if (entries.length === 0) return 'MUST 期限超過 0 件'
  const body = formatTopWithOverflow(
    entries,
    (e) => {
      const title =
        typeof e.item.title === 'string' && e.item.title.length > 0 ? e.item.title : '(無題)'
      return `${title} ${e.overdueDays}日`
    },
    limit,
  )
  return `MUST 期限超過: ${body}`
}

/** by-priority 集計の単 bucket 値: must-overdue 件数 + 最古超過日数 (count=0 → null)。 */
export interface MustOverdueByPriorityStats {
  count: number
  oldestOverdueDays: number | null
}

/**
 * iter384 ai-automation: must-overdue を priority 別に集計する pure helper。
 * iter369 (`computeOverdueActiveByPriority`) の must-only 版 (= isMust=true filter 追加)。
 * iter382 hygiene-debt / iter387 slip-days / iter389 backlog-aging / iter399 stale-urgent
 * / iter362 wip-stuck / iter369 overdue-active と並ぶ「× priority」軸 11 弾目。
 *
 * 「P1 MUST 期限超過 2 件 (最古 14 日) / P3 MUST 期限超過 1 件 (最古 5 日)」のように、
 * MUST の中でも高優先軸の overdue を分離して可視化。must-overdue は全体「2 件」だけでも
 * MVP 違反警報だが、P1 が含まれているか否かで escalation 順位が変わる。
 *
 * computeMustOverdue (= isMust + overdue active 全集計) を bucketByPriorityWith 経由で
 * priority 別に再適用 (P1 のみ / P2 のみ ... の各 bucket 内で MUST overdue 集計)。
 */
export function computeMustOverdueByPriority<
  T extends MustOverdueFields & { priority: number | null | undefined },
>(
  items: readonly T[],
  today: Date | string = new Date(),
): Record<PriorityKey, MustOverdueByPriorityStats> {
  return bucketByPriorityWith(items, (group) => {
    const stats = computeMustOverdue(group, today)
    if (stats.total === 0) return { count: 0, oldestOverdueDays: null }
    return { count: stats.total, oldestOverdueDays: stats.oldestOverdueDays }
  })
}

/**
 * priority 別 must-overdue を 1 行 summary に。例:
 *   'P1 2 件 (最古 14日) / P3 1 件 (最古 5日)' / count=0 P 省略 / 全 P 0 → 'MUST 期限超過 0 件'
 *
 * iter369 formatOverdueActiveByPriorityJa と format 互換 (= bucket 内の文言は同じ、
 * 全 0 sentinel のみ 'MUST 期限超過 0 件' / 'overdue 0 件' に差し替え)。
 */
export function formatMustOverdueByPriorityJa(
  byPriority: Record<PriorityKey, MustOverdueByPriorityStats>,
): string {
  return formatPriorityBuckets(
    byPriority,
    (k, s) =>
      s.count > 0 && s.oldestOverdueDays !== null
        ? `P${k} ${s.count} 件 (最古 ${s.oldestOverdueDays}日)`
        : null,
    'MUST 期限超過 0 件',
  )
}
