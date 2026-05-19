/**
 * iter (queue WT-2 substrate): 連絡待ち item を 依頼先別に grouping + 経過日数で sort する pure 関数。
 *
 * UI から独立、 Vitest 単体 test で網羅。
 *   - 「内部 (workspace member 待ち)」 / 「外部 (workspace_external_contacts 待ち)」 で 1 次 group
 *   - 各 group 内は targetLabel で 2 次 group (同じ人への複数 task をまとめる)
 *   - 各人の中は経過日数降順 (古い依頼を上に)
 *
 * 詳細: ~/.claude/plans/saikyo-waiting-mode-plan.md §5.1
 */
import type { Item } from './schema'
import type { WaitingForState } from './schema'

export interface WaitingItemRow {
  item: Item
  state: WaitingForState
  /** requestedAt からの経過日数 (今日基準、UTC 整数) */
  daysElapsed: number
  /** lastRemindedAt + cadence で計算した次リマインド予定 (null = リマインド無し) */
  nextReminderAt: Date | null
}

export interface WaitingGroup {
  /** targetUserId or targetContactId */
  targetKey: string
  targetLabel: string
  kind: 'internal' | 'external'
  rows: WaitingItemRow[]
}

export interface WaitingListBuckets {
  internal: WaitingGroup[]
  external: WaitingGroup[]
  /** 全 active 連絡待ち row の合計件数 */
  total: number
  /** 7 日以上経過した row 数 (danger カウント、上部 chip 用) */
  longOverdue: number
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

/**
 * `items` から waiting_for があるものだけを抽出し、依頼先別 group に纏める。
 * `now` は今日基準 (test では fixed Date を渡す)。
 */
export function aggregateWaitingList(items: Item[], now: Date): WaitingListBuckets {
  const internalMap = new Map<string, WaitingGroup>()
  const externalMap = new Map<string, WaitingGroup>()
  let total = 0
  let longOverdue = 0

  for (const item of items) {
    if (!item.waitingFor) continue
    if (item.deletedAt || item.archivedAt || item.doneAt) continue
    const state = item.waitingFor as unknown as WaitingForState
    const requestedAt = new Date(state.requestedAt)
    const days = Math.max(0, daysBetween(requestedAt, now))
    if (days >= 7) longOverdue += 1
    const lastReminded = state.lastRemindedAt ? new Date(state.lastRemindedAt) : null
    const nextReminderAt =
      state.reminderCadenceDays && lastReminded
        ? new Date(lastReminded.getTime() + state.reminderCadenceDays * 24 * 60 * 60 * 1000)
        : state.reminderCadenceDays
          ? new Date(requestedAt.getTime() + state.reminderCadenceDays * 24 * 60 * 60 * 1000)
          : null

    const row: WaitingItemRow = { item, state, daysElapsed: days, nextReminderAt }
    total += 1

    const isInternal = state.kind === 'internal'
    const key = (isInternal ? state.targetUserId : state.targetContactId) ?? '__missing__'
    const map = isInternal ? internalMap : externalMap
    const existing = map.get(key)
    if (existing) {
      existing.rows.push(row)
    } else {
      map.set(key, {
        targetKey: key,
        targetLabel: state.targetLabel,
        kind: state.kind,
        rows: [row],
      })
    }
  }

  // 各 group 内: daysElapsed 降順 (= 古い依頼が上)
  function sortGroup(g: WaitingGroup) {
    g.rows.sort((a, b) => b.daysElapsed - a.daysElapsed)
  }
  internalMap.forEach(sortGroup)
  externalMap.forEach(sortGroup)

  // group 自体: max daysElapsed 降順 (= 最も古い依頼を持つ group 上位)
  const internal = [...internalMap.values()].sort(
    (a, b) => (b.rows[0]?.daysElapsed ?? 0) - (a.rows[0]?.daysElapsed ?? 0),
  )
  const external = [...externalMap.values()].sort(
    (a, b) => (b.rows[0]?.daysElapsed ?? 0) - (a.rows[0]?.daysElapsed ?? 0),
  )

  return { internal, external, total, longOverdue }
}
