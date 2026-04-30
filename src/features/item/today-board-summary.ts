/**
 * iter522 ai-automation (queue: fluffy-1 stand-up→widget): 「今日の作戦盤」widget の
 * pure data substrate。
 *
 * fluffy 撲滅原則 (CLAUDE.md / FEEDBACK_QUEUE.md META):
 *  - AI に文章を書かせない (= existing PM Stand-up は markdown 生成 → toast dead-letter)
 *  - データ抽出 / 計算 / 並び替え を直接 widget に出す (= 見て即わかる、6 軸 1/3/6 全勝)
 *  - 純 algorithm のみ、AI 不要
 *
 * 本 helper は items 配列 1 つから widget レンダ用 4 panel 構造体を 1 関数で組み立てる。
 * 既存の overdue-active / must-overdue / recent-completed pure helper を compose する。
 *
 * 仕様:
 *  - overdue:    dueDate < today + active (done/archive/cancelled 除外)、overdueDays 降順、top N
 *  - mustToday:  isMust=true + dueDate=today + active
 *  - dueToday:   dueDate=today + active (mustToday を含む superset)、dueTime 昇順 fallback createdAt
 *  - doneIn24h:  doneAt が今より 24 時間以内、新しい順、top N
 *
 * 各 panel は { total, top: TItem[] } の最小限 shape。caller (widget) は title /
 * priority / id 等を直接読む。AI prompt 用フォーマット関数は本 file には置かず、
 * 既存 formatOverdueActiveJa / formatRecentCompletedSummaryJa を caller 側で必要に
 * 応じて呼ぶ (= fluffy 撲滅原則: 必要時のみ短い 1 行 summary を作る)。
 */

import { parseDateOrNull, parseIsoDateAsLocalMidnight, todayISO } from '@/lib/date/iso'

import { type RecentCompletedFields, selectRecentCompleted } from './recent-completed'
import { normalizeStatus } from './status-visual'

export interface TodayBoardItemFields extends RecentCompletedFields {
  dueDate: string | null | undefined
  /** HH:MM:SS or HH:MM。null なら時刻未指定で 末尾 sort */
  dueTime?: string | null | undefined
  status: string | null | undefined
  archivedAt: Date | string | null | undefined
  isMust: boolean | null | undefined
  createdAt?: Date | string | null | undefined
}

export interface TodayBoardOverdueEntry<T extends TodayBoardItemFields> {
  item: T
  overdueDays: number
}

export interface TodayBoardPanel<T extends TodayBoardItemFields, E = T> {
  total: number
  top: E[]
}

export interface TodayBoardSummary<T extends TodayBoardItemFields> {
  /** dueDate < today + active */
  overdue: TodayBoardPanel<T, TodayBoardOverdueEntry<T>>
  /** isMust + dueDate=today + active */
  mustToday: TodayBoardPanel<T>
  /** dueDate=today + active (mustToday の superset) */
  dueToday: TodayBoardPanel<T>
  /** doneAt が now-24h 以降 */
  doneIn24h: TodayBoardPanel<T>
}

export interface TodayBoardOptions {
  /** 各 panel に含める最大件数 (default 3) */
  topLimit?: number
}

const DEFAULT_TOP = 3
const HOUR_MS = 60 * 60 * 1000

function isActive<T extends TodayBoardItemFields>(it: T): boolean {
  if (!it) return false
  if (it.doneAt || it.archivedAt) return false
  const s = normalizeStatus(it.status)
  if (s === 'done' || s === 'cancelled') return false
  return true
}

function compareDueTime(
  aTime: string | null | undefined,
  bTime: string | null | undefined,
): number {
  const a = aTime ?? ''
  const b = bTime ?? ''
  if (a === b) return 0
  if (a === '') return 1
  if (b === '') return -1
  return a < b ? -1 : 1
}

function compareCreatedAt(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
): number {
  const ad = parseDateOrNull(a)?.getTime() ?? Number.POSITIVE_INFINITY
  const bd = parseDateOrNull(b)?.getTime() ?? Number.POSITIVE_INFINITY
  return ad - bd
}

export function buildTodayBoardSummary<T extends TodayBoardItemFields>(
  items: readonly T[],
  now: Date = new Date(),
  options: TodayBoardOptions = {},
): TodayBoardSummary<T> {
  const limit = options.topLimit ?? DEFAULT_TOP
  const todayIso = todayISO(now)
  const todayMidnightMs = parseIsoDateAsLocalMidnight(todayIso)?.getTime() ?? now.getTime()

  const overdueAll: TodayBoardOverdueEntry<T>[] = []
  const mustTodayAll: T[] = []
  const dueTodayAll: T[] = []
  for (const it of items) {
    if (!it) continue
    if (typeof it.dueDate !== 'string') continue
    if (!isActive(it)) continue
    const dueMs = parseIsoDateAsLocalMidnight(it.dueDate)?.getTime()
    if (dueMs === undefined) continue
    if (dueMs < todayMidnightMs) {
      const overdueDays = Math.floor((todayMidnightMs - dueMs) / (HOUR_MS * 24))
      overdueAll.push({ item: it, overdueDays })
    } else if (it.dueDate === todayIso) {
      dueTodayAll.push(it)
      if (it.isMust === true) mustTodayAll.push(it)
    }
  }

  overdueAll.sort((a, b) => b.overdueDays - a.overdueDays)
  const sortToday = (a: T, b: T): number => {
    const t = compareDueTime(a.dueTime, b.dueTime)
    if (t !== 0) return t
    return compareCreatedAt(a.createdAt, b.createdAt)
  }
  dueTodayAll.sort(sortToday)
  mustTodayAll.sort(sortToday)

  const recent = selectRecentCompleted(items, { windowHours: 24 }, now)

  return {
    overdue: { total: overdueAll.length, top: overdueAll.slice(0, limit) },
    mustToday: { total: mustTodayAll.length, top: mustTodayAll.slice(0, limit) },
    dueToday: { total: dueTodayAll.length, top: dueTodayAll.slice(0, limit) },
    doneIn24h: {
      total: recent.length,
      top: recent.slice(0, limit).map((e) => e.item),
    },
  }
}
