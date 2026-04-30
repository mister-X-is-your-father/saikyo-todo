/**
 * iter469 team-capacity orchestrator の unit test。pure helper のみ、DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import { computeTeamCapacityLoads, sortTeamCapacityLoadsByUrgency } from './team-capacity'

const DONE = new Set(['done', 'cancelled'])

const ALICE = { actorType: 'user', actorId: 'a1', displayName: 'Alice' }
const BOB = { actorType: 'user', actorId: 'b1', displayName: 'Bob' }
const TODAY = new Date(2026, 3, 30) // 2026-04-30 (木) — ISO 週は 4/27-5/3

describe('computeTeamCapacityLoads', () => {
  it('member 0 名 → 空配列', () => {
    const r = computeTeamCapacityLoads({
      members: [],
      items: [],
      getAssignees: () => [],
      today: TODAY,
      doneStatusKeys: DONE,
    })
    expect(r).toEqual([])
  })

  it('1 member, 0 items → today/week とも free 0%', () => {
    const r = computeTeamCapacityLoads({
      members: [ALICE],
      items: [],
      getAssignees: () => [],
      today: TODAY,
      doneStatusKeys: DONE,
    })
    expect(r).toHaveLength(1)
    expect(r[0]!.todayLoad.usedMinutes).toBe(0)
    expect(r[0]!.weekLoad.usedMinutes).toBe(0)
    expect(r[0]!.todayLoad.loadStatus).toBe('free')
  })

  it('Alice の今日 dueDate item 1 件 (240 分) → todayLoad used=240, free 50%', () => {
    const items = [{ id: 'i1', estimateMinutes: 240, status: 'todo', dueDate: '2026-04-30' }]
    const r = computeTeamCapacityLoads({
      members: [ALICE],
      items,
      getAssignees: () => [{ actorType: 'user', actorId: 'a1' }],
      today: TODAY,
      doneStatusKeys: DONE,
    })
    expect(r[0]!.todayLoad.usedMinutes).toBe(240)
    expect(r[0]!.todayLoad.loadStatus).toBe('free')
    // 今週 capacity = 480 * 7 = 3360、240/3360 ≈ 7%
    expect(r[0]!.weekLoad.usedMinutes).toBe(240)
    expect(r[0]!.weekLoad.utilizationPct).toBe(7)
  })

  it('範囲外の dueDate (sprint より後) は今日にも今週にも入らない', () => {
    const items = [{ id: 'i1', estimateMinutes: 240, status: 'todo', dueDate: '2026-05-10' }]
    const r = computeTeamCapacityLoads({
      members: [ALICE],
      items,
      getAssignees: () => [{ actorType: 'user', actorId: 'a1' }],
      today: TODAY,
      doneStatusKeys: DONE,
    })
    expect(r[0]!.todayLoad.usedMinutes).toBe(0)
    expect(r[0]!.weekLoad.usedMinutes).toBe(0)
  })

  it('別 member の item は対象外', () => {
    const items = [{ id: 'i1', estimateMinutes: 600, status: 'todo', dueDate: '2026-04-30' }]
    const r = computeTeamCapacityLoads({
      members: [ALICE, BOB],
      items,
      getAssignees: () => [{ actorType: 'user', actorId: 'b1' }], // Bob だけ
      today: TODAY,
      doneStatusKeys: DONE,
    })
    const aliceRow = r.find((x) => x.member.actorId === 'a1')!
    const bobRow = r.find((x) => x.member.actorId === 'b1')!
    expect(aliceRow.todayLoad.usedMinutes).toBe(0)
    expect(bobRow.todayLoad.usedMinutes).toBe(600)
  })

  it('1 item 複数 assignee (Alice + Bob) → 両方の load に算入', () => {
    const items = [{ id: 'i1', estimateMinutes: 300, status: 'todo', dueDate: '2026-04-30' }]
    const r = computeTeamCapacityLoads({
      members: [ALICE, BOB],
      items,
      getAssignees: () => [
        { actorType: 'user', actorId: 'a1' },
        { actorType: 'user', actorId: 'b1' },
      ],
      today: TODAY,
      doneStatusKeys: DONE,
    })
    expect(r[0]!.todayLoad.usedMinutes).toBe(300)
    expect(r[1]!.todayLoad.usedMinutes).toBe(300)
  })

  it('done item は capacity 算入から除外', () => {
    const items = [{ id: 'i1', estimateMinutes: 480, status: 'done', dueDate: '2026-04-30' }]
    const r = computeTeamCapacityLoads({
      members: [ALICE],
      items,
      getAssignees: () => [{ actorType: 'user', actorId: 'a1' }],
      today: TODAY,
      doneStatusKeys: DONE,
    })
    expect(r[0]!.todayLoad.usedMinutes).toBe(0)
    expect(r[0]!.todayLoad.doneItemCount).toBe(1)
  })

  it('capacityPerDayMinutes=240 (= 4h) で過負荷判定', () => {
    const items = [{ id: 'i1', estimateMinutes: 480, status: 'todo', dueDate: '2026-04-30' }]
    const r = computeTeamCapacityLoads({
      members: [ALICE],
      items,
      getAssignees: () => [{ actorType: 'user', actorId: 'a1' }],
      today: TODAY,
      capacityPerDayMinutes: 240,
      doneStatusKeys: DONE,
    })
    expect(r[0]!.todayLoad.utilizationPct).toBe(200)
    expect(r[0]!.todayLoad.loadStatus).toBe('overloaded')
  })

  it('actorType 違いの同 id は別 member として扱う', () => {
    const AGENT = { actorType: 'agent', actorId: 'a1' }
    const r = computeTeamCapacityLoads({
      members: [ALICE, AGENT],
      items: [{ id: 'i1', estimateMinutes: 60, status: 'todo', dueDate: '2026-04-30' }],
      getAssignees: () => [{ actorType: 'agent', actorId: 'a1' }],
      today: TODAY,
      doneStatusKeys: DONE,
    })
    const userRow = r.find((x) => x.member.actorType === 'user')!
    const agentRow = r.find((x) => x.member.actorType === 'agent')!
    expect(userRow.todayLoad.usedMinutes).toBe(0)
    expect(agentRow.todayLoad.usedMinutes).toBe(60)
  })
})

describe('sortTeamCapacityLoadsByUrgency', () => {
  function makeRow(name: string, status: string) {
    return {
      member: { actorType: 'user', actorId: name, displayName: name },
      todayLoad: { loadStatus: status, capacityMinutes: 480 } as never,
      weekLoad: {} as never,
    }
  }

  it('overloaded > tight > comfortable > free > unknown 順', () => {
    const rows = [
      makeRow('comf', 'comfortable'),
      makeRow('over', 'overloaded'),
      makeRow('free', 'free'),
      makeRow('tight', 'tight'),
      makeRow('unk', 'unknown'),
    ]
    const sorted = sortTeamCapacityLoadsByUrgency(rows)
    expect(sorted.map((r) => r.member.displayName)).toEqual([
      'over',
      'tight',
      'comf',
      'free',
      'unk',
    ])
  })

  it('同 status 内は displayName 昇順', () => {
    const rows = [makeRow('Charlie', 'free'), makeRow('Alice', 'free'), makeRow('Bob', 'free')]
    const sorted = sortTeamCapacityLoadsByUrgency(rows)
    expect(sorted.map((r) => r.member.displayName)).toEqual(['Alice', 'Bob', 'Charlie'])
  })
})
