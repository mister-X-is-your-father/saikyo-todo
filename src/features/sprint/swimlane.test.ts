/**
 * iter468 sprint swimlane の unit test。pure helper のみ、DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import { computeSwimlaneBarPosition, groupItemsByAssigneeKey } from './swimlane'

const SPRINT = { startDate: '2026-04-27', endDate: '2026-05-10' } // 14 日

describe('computeSwimlaneBarPosition', () => {
  it('sprint 期間ぴったり (4/27-5/10) → leftPct=0, widthPct=100', () => {
    const r = computeSwimlaneBarPosition(
      { id: 'a', startDate: '2026-04-27', dueDate: '2026-05-10' },
      SPRINT,
    )
    expect(r).not.toBeNull()
    expect(r!.leftPct).toBe(0)
    expect(r!.widthPct).toBe(100)
    expect(r!.fullyContained).toBe(true)
    expect(r!.clippedAtStart).toBe(false)
    expect(r!.clippedAtEnd).toBe(false)
  })

  it('1 日のみ bar (4/27-4/27) → 1/14 ≈ 7.14%', () => {
    const r = computeSwimlaneBarPosition(
      { id: 'a', startDate: '2026-04-27', dueDate: '2026-04-27' },
      SPRINT,
    )
    expect(r!.leftPct).toBe(0)
    expect(r!.widthPct).toBe(7.14)
  })

  it('sprint 半ば (5/2-5/4) → offset=5/14 width=3/14', () => {
    const r = computeSwimlaneBarPosition(
      { id: 'a', startDate: '2026-05-02', dueDate: '2026-05-04' },
      SPRINT,
    )
    expect(r!.leftPct).toBe(35.71)
    expect(r!.widthPct).toBe(21.43)
  })

  it('sprint 開始前から始まる (4/20-5/3) → clipAtStart、表示 start = sprint.start', () => {
    const r = computeSwimlaneBarPosition(
      { id: 'a', startDate: '2026-04-20', dueDate: '2026-05-03' },
      SPRINT,
    )
    expect(r!.clippedAtStart).toBe(true)
    expect(r!.leftPct).toBe(0)
    expect(r!.visibleStart).toBe('2026-04-27')
    expect(r!.visibleEnd).toBe('2026-05-03')
    // 4/27..5/3 = 7 日 / 14 日 = 50%
    expect(r!.widthPct).toBe(50)
  })

  it('sprint 終了後まで続く (5/8-5/15) → clipAtEnd、表示 end = sprint.end', () => {
    const r = computeSwimlaneBarPosition(
      { id: 'a', startDate: '2026-05-08', dueDate: '2026-05-15' },
      SPRINT,
    )
    expect(r!.clippedAtEnd).toBe(true)
    expect(r!.visibleEnd).toBe('2026-05-10')
    expect(r!.visibleStart).toBe('2026-05-08')
    // 5/8..5/10 = 3 日 / 14 = 21.43%
    expect(r!.widthPct).toBe(21.43)
  })

  it('完全範囲外 (item end < sprint start) → null', () => {
    const r = computeSwimlaneBarPosition(
      { id: 'a', startDate: '2026-04-20', dueDate: '2026-04-25' },
      SPRINT,
    )
    expect(r).toBeNull()
  })

  it('完全範囲外 (item start > sprint end) → null', () => {
    const r = computeSwimlaneBarPosition(
      { id: 'a', startDate: '2026-05-15', dueDate: '2026-05-20' },
      SPRINT,
    )
    expect(r).toBeNull()
  })

  it('startDate / dueDate 片方 null → null', () => {
    expect(
      computeSwimlaneBarPosition({ id: 'a', startDate: null, dueDate: '2026-05-03' }, SPRINT),
    ).toBeNull()
    expect(
      computeSwimlaneBarPosition({ id: 'a', startDate: '2026-04-30', dueDate: null }, SPRINT),
    ).toBeNull()
  })

  it('item.dueDate < startDate (不正範囲) → null', () => {
    const r = computeSwimlaneBarPosition(
      { id: 'a', startDate: '2026-05-03', dueDate: '2026-05-02' },
      SPRINT,
    )
    expect(r).toBeNull()
  })

  it('不正 ISO → null', () => {
    expect(
      computeSwimlaneBarPosition({ id: 'a', startDate: 'bad', dueDate: '2026-05-03' }, SPRINT),
    ).toBeNull()
  })

  it('両端 clip (sprint より長い、4/20-5/15) → leftPct=0, widthPct=100', () => {
    const r = computeSwimlaneBarPosition(
      { id: 'a', startDate: '2026-04-20', dueDate: '2026-05-15' },
      SPRINT,
    )
    expect(r!.clippedAtStart).toBe(true)
    expect(r!.clippedAtEnd).toBe(true)
    expect(r!.leftPct).toBe(0)
    expect(r!.widthPct).toBe(100)
  })
})

describe('groupItemsByAssigneeKey', () => {
  const items = [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
    { id: 'c', title: 'C' },
  ]
  const assignees: Record<string, Array<{ actorType: string; actorId: string }>> = {
    a: [{ actorType: 'user', actorId: 'u1' }],
    b: [{ actorType: 'user', actorId: 'u2' }],
    c: [], // 未割当
  }

  it('user キーで group、未割当は null キー', () => {
    const r = groupItemsByAssigneeKey(items, (id) => assignees[id] ?? [])
    expect(r.get('user:u1')).toEqual([items[0]])
    expect(r.get('user:u2')).toEqual([items[1]])
    expect(r.get(null)).toEqual([items[2]])
  })

  it('複数 assignee の item は各 lane に複製される', () => {
    const multi = (id: string) =>
      id === 'a'
        ? [
            { actorType: 'user', actorId: 'u1' },
            { actorType: 'user', actorId: 'u2' },
          ]
        : []
    const r = groupItemsByAssigneeKey(items.slice(0, 1), multi)
    expect(r.get('user:u1')).toEqual([items[0]])
    expect(r.get('user:u2')).toEqual([items[0]])
  })

  it('actorType 違いの同 id は別キー', () => {
    const fn = (id: string) =>
      id === 'a'
        ? [
            { actorType: 'user', actorId: 'x1' },
            { actorType: 'agent', actorId: 'x1' },
          ]
        : []
    const r = groupItemsByAssigneeKey(items.slice(0, 1), fn)
    expect(r.has('user:x1')).toBe(true)
    expect(r.has('agent:x1')).toBe(true)
  })

  it('items 空 → 空 Map', () => {
    expect(groupItemsByAssigneeKey([], () => []).size).toBe(0)
  })
})
