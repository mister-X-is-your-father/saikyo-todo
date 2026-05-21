/**
 * iter367 ai-automation: 「期限超過 (overdue) で未完了 (active) な item」を抽出 +
 * status 別に集計する pure helper。
 *
 * 既存 due-proximity (per-item kind 判定 / 集計は status 未参照) と slip-days
 * (= 完了したが遅延した item / doneAt > dueDate) は overdue 軸の片側ずつしか
 * カバーしていなかった。本 helper は **「まだ完了していないのに期限を超えている」**
 * = 計画 vs 現実の最も深刻な乖離を 1 関数で集計する。
 *
 * AI 朝 brief / pm-agent / dashboard widget が「期限超過 5 件 (todo 3 / 進行中 2)」
 * のような 2 軸 (overdue × status) signal を 1 関数で取り出せる。
 *
 * 仕様:
 *   - 集計対象: `dueDate` valid ISO (`YYYY-MM-DD`) かつ today より前 (= dueDate < today)
 *   - 完了 / archive / status='cancelled' は除外 (= active のみ)
 *   - byStatus: todo / in_progress / blocked / unknown の 4 bucket
 *     ('done' / 'cancelled' は除外済なので bucket に出ない)
 *   - oldestOverdueDays: 最も超過日数が大きい item の `today - dueDate` (件数 0 → null)
 *
 * 不正値 fail-soft:
 *   - dueDate が null/undefined/不正 ISO → 除外
 *   - 完了 (doneAt 非 null) → 除外
 *   - archive 済 (archivedAt 非 null) → 除外
 *   - status = 'done' / 'cancelled' → 除外 (DEFAULT_EXCLUDE_STATUSES)
 */

import { MS_PER_DAY, parseDateOrNull, parseIsoDateAsLocalMidnight } from '@/lib/date/iso'
import { formatNonZeroCounts } from '@/lib/format-counts'
import { formatTitleDaysListJa } from '@/lib/format-list'
import type { ChipTone } from '@/lib/ui/chip-tone'
import { severeMildIdleToChipTone } from '@/lib/widget/severity-bridges'

import type { AgentBriefSignal } from '@/features/agent/brief-signal'

import {
  bucketByPriorityWith,
  formatPriorityBucketsCountWithDays,
  type PriorityKey,
} from './priority'
import { isTerminalStatus, normalizeStatus } from './status-visual'

export interface OverdueActiveFields {
  status: string | null | undefined
  dueDate: string | null | undefined
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
}

/** byStatus に含む status (active な 4 種、done/cancelled は対象外)。 */
export type OverdueActiveStatusKey = 'todo' | 'in_progress' | 'blocked' | 'unknown'

const STATUS_ORDER: readonly OverdueActiveStatusKey[] = [
  'todo',
  'in_progress',
  'blocked',
  'unknown',
] as const

const STATUS_LABEL: Record<OverdueActiveStatusKey, string> = {
  todo: 'TODO',
  in_progress: '進行中',
  blocked: 'blocked',
  unknown: '不明',
}

export interface OverdueActiveStats {
  total: number
  byStatus: Record<OverdueActiveStatusKey, number>
  /** 最も超過日数が大きい item の `today - dueDate` (= 「最も古い期限超過」) */
  oldestOverdueDays: number | null
}

const EMPTY: OverdueActiveStats = {
  total: 0,
  byStatus: { todo: 0, in_progress: 0, blocked: 0, unknown: 0 },
  oldestOverdueDays: null,
}

export function computeOverdueActive<T extends OverdueActiveFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): OverdueActiveStats {
  const todayDate = parseDateOrNull(today)
  if (!todayDate) return EMPTY
  const todayMidnightMs = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate(),
  ).getTime()

  const byStatus: Record<OverdueActiveStatusKey, number> = {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    unknown: 0,
  }
  let total = 0
  let oldestOverdueDays: number | null = null

  for (const it of items) {
    if (!it) continue
    if (it.doneAt || it.archivedAt) continue
    if (typeof it.dueDate !== 'string') continue
    const dueMidnight = parseIsoDateAsLocalMidnight(it.dueDate)
    if (!dueMidnight) continue
    const dueMs = dueMidnight.getTime()
    if (dueMs >= todayMidnightMs) continue // overdue は厳密に dueDate < today

    const statusKey = normalizeStatus(it.status)
    if (isTerminalStatus(statusKey)) continue
    // StatusKey = 'todo' | 'in_progress' | 'done' | 'cancelled' | 'blocked' | 'unknown'
    // done / cancelled は除外済、残り 4 種は OverdueActiveStatusKey と互換
    byStatus[statusKey as OverdueActiveStatusKey] += 1
    total += 1

    const overdueDays = Math.floor((todayMidnightMs - dueMs) / MS_PER_DAY)
    if (oldestOverdueDays === null || overdueDays > oldestOverdueDays) {
      oldestOverdueDays = overdueDays
    }
  }

  if (total === 0) return EMPTY
  return { total, byStatus, oldestOverdueDays }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'期限超過 5 件 (TODO 3 / 進行中 2) — 最古 14 日'`
 *   `'期限超過 1 件 (進行中 1)'`  (= 最古 0 日 = 今日が dueDate ではないので omit)
 *   `'期限超過 0 件'`
 *
 * 件数 0 の status は省略 (formatNonZeroCounts と同じ慣習)。oldestOverdueDays が
 * 0 (= 1 日前以内) は tail を省略、1 日以上で `' — 最古 N 日'` tail を付加。
 */
export function formatOverdueActiveJa(stats: OverdueActiveStats): string {
  if (stats.total === 0) return '期限超過 0 件'
  const breakdown = formatNonZeroCounts(stats.byStatus, STATUS_ORDER, STATUS_LABEL)
  const oldest =
    stats.oldestOverdueDays !== null && stats.oldestOverdueDays >= 1
      ? ` — 最古 ${stats.oldestOverdueDays} 日`
      : ''
  return `期限超過 ${stats.total} 件 (${breakdown})${oldest}`
}

/**
 * dashboard chip 配色用の severity bucket:
 *  - 'severe' (= 7 日以上 overdue な active item が 1 件以上、または件数 ≥ 5)
 *  - 'mild' (= overdue active が 1+ 件、ただし全て < 7 日 + 件数 < 5)
 *  - 'idle' (= 0 件)
 */
export type OverdueActiveSeverity = 'severe' | 'mild' | 'idle'

export function overdueActiveSeverity(stats: OverdueActiveStats): OverdueActiveSeverity {
  if (stats.total === 0) return 'idle'
  if ((stats.oldestOverdueDays ?? 0) >= 7) return 'severe'
  if (stats.total >= 5) return 'severe'
  return 'mild'
}

/**
 * iter1049 ai-automation: overdue active stats → 共通 `ChipTone` bridge。
 *
 *   - severe (= 7d+ 超過 含む or 5+ 件) → 'danger' (= 赤、要対応)
 *   - mild   (= 0 < total < 5 + 全て < 7d) → 'warn'   (= 黄、注意)
 *   - idle   (= 期限超過なし)             → 'idle'   (= 灰、attention 不要)
 *
 * iter1047 `stuckWipChipTone` と同パターン (= 'severe'|'mild'|'idle' → ChipTone)。
 * `formatOverdueActiveJa` と整合する tone 軸で AgentBriefSignal / dashboard chip-tone bind 用。
 *
 * 既存 dashboard chip (dashboard-view.tsx の overdueActive panel) は inline severity →
 * Tailwind class を直接構築していたが、本 helper で ChipTone vocab に乗せれば
 * agentBriefSignal pattern に統一可能。
 */
export function overdueActiveChipTone(stats: OverdueActiveStats): ChipTone {
  // iter1055 refactor: 'severe'|'mild'|'idle' → ChipTone mapping を共通 bridge に集約。
  return severeMildIdleToChipTone(overdueActiveSeverity(stats))
}

/**
 * iter1049 ai-automation: overdue active stats → `AgentBriefSignal` (text + tone) compose helper。
 *
 * iter1025/1031/1035/1038/1040/1046/1047 等 `*ToBriefSignal` pattern (= 14 axes 弾) の overdue
 * 軸版。text は iter367 `formatOverdueActiveJa` を再利用 (= '期限超過 5 件 (todo 3 / 進行中 2) — 最古 7 日')、
 * tone は本 iter `overdueActiveChipTone` を再利用 (= chip 配色と signal tone が完全一致)。
 *
 * caller pattern:
 *   const stats = computeOverdueActive(items, today)
 *   const signal = overdueActiveToBriefSignal(stats)
 *   // → composeAnalyticsSignals 風に concat、または単独 chip render
 *
 * 用途:
 *   - AI 朝 brief / Slack daily digest 「期限超過 5 件 (...)」 signal
 *   - dashboard chip 「期限超過 異常」 tone 統一 (既存 inline 配色から)
 *   - analytics-signals.ts の 15 軸目候補 (次 iter integration 想定)
 */
export function overdueActiveToBriefSignal(stats: OverdueActiveStats): AgentBriefSignal {
  return {
    text: formatOverdueActiveJa(stats),
    tone: overdueActiveChipTone(stats),
  }
}

/** by-priority 集計の単 bucket 値: overdue active 件数 + 最古超過日数 (count=0 → null)。 */
export interface OverdueActiveByPriorityStats {
  count: number
  oldestOverdueDays: number | null
}

/**
 * iter369 ai-automation: overdue active items を priority 別に集計する pure helper。
 * iter382 hygiene-debt-by-priority / iter387 slip-days-by-priority / iter389
 * backlog-aging-by-priority / iter399 stale-urgent-by-priority / iter362
 * wip-stuck-by-priority と並ぶ「× priority」軸 10 弾目。
 *
 * 「P1 期限超過 3 件 (最古 14 日) / P3 期限超過 2 件 (最古 5 日)」のように 高優先軸の
 * overdue を分離して可視化、全体「期限超過 5 件」だけでは見えない priority bias を露出。
 * computeOverdueActive の filter ロジックは bucketByPriorityWith 経由で priority 別に
 * 再適用 (P1 のみ / P2 のみ ... の各 bucket 内で overdue 集計)。
 */
export function computeOverdueActiveByPriority<
  T extends OverdueActiveFields & { priority: number | null | undefined },
>(
  items: readonly T[],
  today: Date | string = new Date(),
): Record<PriorityKey, OverdueActiveByPriorityStats> {
  return bucketByPriorityWith(items, (group) => {
    const stats = computeOverdueActive(group, today)
    if (stats.total === 0) return { count: 0, oldestOverdueDays: null }
    return { count: stats.total, oldestOverdueDays: stats.oldestOverdueDays }
  })
}

/**
 * priority 別 overdue active を 1 行 summary に。例:
 *   'P1 3 件 (最古 14日) / P3 2 件 (最古 5日)' / count=0 P 省略 / 全 P 0 → '期限超過 0 件'
 */
export function formatOverdueActiveByPriorityJa(
  byPriority: Record<PriorityKey, OverdueActiveByPriorityStats>,
): string {
  return formatPriorityBucketsCountWithDays(
    byPriority,
    (s) => s.count,
    (s) => s.oldestOverdueDays,
    '最古',
    '期限超過 0 件',
  )
}

/** pickOverdueActiveItems の戻り単 entry。item + 何日 overdue か。 */
export interface OverdueActiveEntry<T extends OverdueActiveFields> {
  item: T
  /** today - dueDate (整数日数、Math.floor) */
  overdueDays: number
}

/**
 * iter382 ai-automation: overdue active な items を実際に抽出して overdueDays 降順で
 * 返す pure helper。iter379 (`pickMustOverdueItems`) の symmetric 拡張 — must 以外も
 * 含めた「期限超過で未完了」全般版。
 *
 * computeOverdueActive は stats (total / byStatus / oldestOverdueDays) のみだったが、
 * AI 朝 brief や dashboard tooltip / pm-agent watch list で「具体的にどの item が
 * 期限超過しているか」を見せたい時は items 一覧が必要。本 helper はその gap を埋める。
 *
 * 仕様 (computeOverdueActive と filter ロジック互換):
 *   - dueDate valid ISO + dueDate < today
 *   - done/archive/cancelled 除外 (= active のみ)
 *   - 並び: overdueDays 降順 (= 最も deeply overdue)、tie で元配列順 stable
 */
export function pickOverdueActiveItems<T extends OverdueActiveFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): OverdueActiveEntry<T>[] {
  const todayDate = parseDateOrNull(today)
  if (!todayDate) return []
  const todayMidnightMs = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate(),
  ).getTime()

  const enriched: { entry: OverdueActiveEntry<T>; index: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it) continue
    if (it.doneAt || it.archivedAt) continue
    if (typeof it.dueDate !== 'string') continue
    const dueMidnight = parseIsoDateAsLocalMidnight(it.dueDate)
    if (!dueMidnight) continue
    const dueMs = dueMidnight.getTime()
    if (dueMs >= todayMidnightMs) continue
    const statusKey = normalizeStatus(it.status)
    if (isTerminalStatus(statusKey)) continue
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

/** caller の overdue item に title が含まれる場合の structural subset。 */
export type OverdueActiveWithTitle = OverdueActiveFields & { title?: string | null }

/**
 * AI prompt 用 1 行サマリ (title list 付き):
 *   `'期限超過: 提出書類 14日 / 連絡 5日 / 他 1 件'`
 *   `'期限超過 0 件'`
 *
 * iter379 (`formatMustOverdueTitlesJa`) と同 vocabulary、prefix のみ "MUST 期限超過" →
 * "期限超過" に差し替え (= must 限定でない全般版)。
 */
export function formatOverdueActiveTitlesJa<T extends OverdueActiveWithTitle>(
  entries: readonly OverdueActiveEntry<T>[],
  limit: number = 3,
): string {
  return formatTitleDaysListJa(entries, (e) => e.overdueDays, '期限超過', limit)
}
