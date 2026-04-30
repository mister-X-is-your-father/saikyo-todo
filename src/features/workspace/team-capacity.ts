/**
 * iter469 P0 (queue: チームメンバー余裕時間 一覧 scope A substrate 続編):
 * member 一覧 × items × 期間 (今日 / 今週) を組み合わせて、各 member の今日 /
 * 今週の capacity load を 1 関数で返す orchestrator。iter465 (member-capacity) +
 * iter466 (capacity-period) を上位で連結。
 *
 * 「各チームメンバーが今日、今週、どれくらい余裕な時間があるのか」(2026-04-29
 * ユーザ要望) の **scope A substrate** 終端 (next iter で workspace home の
 * MemberCapacityPanel が本 helper 1 関数呼び出すだけで全 row を render 可)。
 *
 * 仕様:
 *  - members: workspace の actor 一覧 (`actorType:actorId` で唯一性、表示順は呼び側)
 *  - items: workspace 全 Item (filter 不要、本 helper 内で period + assignee 適用)
 *  - getAssignees: itemId → AssigneeRef[] の callback (caller で memo 化推奨)
 *  - today: Date (test deterministic 化のため必須)
 *  - capacityPerDayMinutes: 1 日あたり capacity (default 480 = 8h)
 *  - doneStatusKeys: ReadonlySet<string> (workspace_statuses から caller で構築)
 *  - 各 member について: 今日 = `getDayRange(today)` 範囲 / 今週 = `getIsoWeekRange(today)`
 *    範囲で items を filter、自分が assignee の Item のみ pickup、`computeMember
 *    CapacityLoad` で load 計算
 *  - capacityPerWeek = capacityPerDay * 7 (= 7 日分、ISO 月-日)。業務週 (5 日)
 *    に絞りたい caller は capacityPerDayMinutes を渡す前に N/M 比率で調整可。
 *
 * generic ではなく具象 type を使うのは caller が iter465 / iter466 の API と
 * 揃えるため (両 helper を直接呼び出すのと同じ shape)。
 */

import type { SwimlaneAssigneeRef } from '@/features/sprint/swimlane'

import { getDayRange, getIsoWeekRange, selectItemsByDueDateInRange } from './capacity-period'
import {
  type CapacityItemInput,
  computeMemberCapacityLoad,
  type MemberCapacityLoad,
} from './member-capacity'

export interface TeamCapacityMember {
  actorType: string
  actorId: string
  displayName?: string | null
}

export interface TeamCapacityItem extends CapacityItemInput {
  id: string
  dueDate: string | null | undefined
}

export interface TeamCapacityLoadRow {
  member: TeamCapacityMember
  todayLoad: MemberCapacityLoad
  weekLoad: MemberCapacityLoad
}

export interface TeamCapacityInput {
  members: ReadonlyArray<TeamCapacityMember>
  items: ReadonlyArray<TeamCapacityItem>
  /** itemId → assignee refs (`useItemAssignees` を caller で memoize 推奨) */
  getAssignees: (itemId: string) => ReadonlyArray<SwimlaneAssigneeRef>
  today: Date
  /** 1 日あたり capacity 分、default 480 (8h) */
  capacityPerDayMinutes?: number
  /** completed として扱う status key (= used 算入除外) */
  doneStatusKeys: ReadonlySet<string>
}

export function computeTeamCapacityLoads(input: TeamCapacityInput): TeamCapacityLoadRow[] {
  const capPerDay = input.capacityPerDayMinutes ?? 480
  const capPerWeek = capPerDay * 7
  const dayRange = getDayRange(input.today)
  const weekRange = getIsoWeekRange(input.today)

  const todayItems = selectItemsByDueDateInRange(input.items, dayRange)
  const weekItems = selectItemsByDueDateInRange(input.items, weekRange)

  return input.members.map((member) => {
    const myToday = todayItems.filter((it) => isAssignedTo(input.getAssignees(it.id), member))
    const myWeek = weekItems.filter((it) => isAssignedTo(input.getAssignees(it.id), member))
    return {
      member,
      todayLoad: computeMemberCapacityLoad(myToday, capPerDay, input.doneStatusKeys),
      weekLoad: computeMemberCapacityLoad(myWeek, capPerWeek, input.doneStatusKeys),
    }
  })
}

function isAssignedTo(
  refs: ReadonlyArray<SwimlaneAssigneeRef>,
  member: TeamCapacityMember,
): boolean {
  for (const r of refs) {
    if (r.actorType === member.actorType && r.actorId === member.actorId) return true
  }
  return false
}

/**
 * 表示用 sort: 今日の overload (赤) → tight (黄) → comfortable / free → unknown 順、
 * 同 status 内は displayName ?? actorId 昇順 (UI が「危ない member 上」 で揃う)。
 *
 * 既存の load.loadStatus 4 値 + unknown を順序定義 (= UI tone alignment と整合)。
 */
const LOAD_STATUS_ORDER: Record<string, number> = {
  overloaded: 0,
  tight: 1,
  comfortable: 2,
  free: 3,
  unknown: 4,
}

export function sortTeamCapacityLoadsByUrgency(
  rows: ReadonlyArray<TeamCapacityLoadRow>,
): TeamCapacityLoadRow[] {
  return [...rows].sort((a, b) => {
    const sa = LOAD_STATUS_ORDER[a.todayLoad.loadStatus] ?? 5
    const sb = LOAD_STATUS_ORDER[b.todayLoad.loadStatus] ?? 5
    if (sa !== sb) return sa - sb
    const na = a.member.displayName ?? a.member.actorId
    const nb = b.member.displayName ?? b.member.actorId
    return na.localeCompare(nb)
  })
}
