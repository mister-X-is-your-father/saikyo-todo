import { describe, expect, it } from 'vitest'

import type { Item } from '@/features/item/schema'

import {
  buildOperationBoard,
  dayOffsetISO,
  dueTimeMinutes,
  eisenhowerScore,
  isItemActive,
} from './operation-board'

const TODAY = '2026-04-30'

function mk(over: Partial<Item> & { id: string }): Item {
  return {
    workspaceId: 'ws',
    title: `item ${over.id}`,
    description: '',
    status: 'todo',
    parentPath: '',
    startDate: null,
    dueDate: null,
    dueTime: null,
    scheduledFor: null,
    baselineStartDate: null,
    baselineEndDate: null,
    baselineTakenAt: null,
    priority: 4,
    isMust: false,
    dod: null,
    goal: null,
    position: 'a0',
    customFields: {},
    archivedAt: null,
    doneAt: null,
    startedAt: null,
    completedAt: null,
    sprintId: null,
    keyResultId: null,
    createdByActorType: 'user',
    createdByActorId: 'u',
    deletedAt: null,
    version: 0,
    createdAt: new Date('2026-04-29T00:00:00Z'),
    updatedAt: new Date('2026-04-29T00:00:00Z'),
    ...over,
  } as Item
}

describe('dayOffsetISO', () => {
  it('+1 / -1 / 0 が UTC 日付で動く', () => {
    expect(dayOffsetISO(TODAY, 0)).toBe('2026-04-30')
    expect(dayOffsetISO(TODAY, 1)).toBe('2026-05-01')
    expect(dayOffsetISO(TODAY, -1)).toBe('2026-04-29')
    expect(dayOffsetISO('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('dueTimeMinutes', () => {
  it('時刻 / null / 不正値', () => {
    expect(dueTimeMinutes('09:30')).toBe(9 * 60 + 30)
    expect(dueTimeMinutes('00:00')).toBe(0)
    expect(dueTimeMinutes(null)).toBe(24 * 60)
    expect(dueTimeMinutes('garbage')).toBe(24 * 60)
  })
})

describe('isItemActive', () => {
  it('全 timestamp null = active (= true)', () => {
    expect(isItemActive(mk({ id: 'a' }))).toBe(true)
  })

  it('doneAt 設定 → 非 active', () => {
    expect(isItemActive(mk({ id: 'b', doneAt: new Date() }))).toBe(false)
  })

  it('archivedAt 設定 → 非 active', () => {
    expect(isItemActive(mk({ id: 'c', archivedAt: new Date() }))).toBe(false)
  })

  it('deletedAt 設定 → 非 active (soft delete)', () => {
    expect(isItemActive(mk({ id: 'd', deletedAt: new Date() }))).toBe(false)
  })
})

describe('eisenhowerScore', () => {
  it('overdue + MUST が最高 score', () => {
    const overdueMust = mk({
      id: 'a',
      dueDate: '2026-04-25',
      isMust: true,
      priority: 1,
    })
    const todayLow = mk({ id: 'b', scheduledFor: TODAY, priority: 4 })
    expect(eisenhowerScore(overdueMust, TODAY)).toBeGreaterThan(eisenhowerScore(todayLow, TODAY))
  })

  it('isMust は priority 1 の non-MUST より importance 高い', () => {
    const must = mk({ id: 'm', scheduledFor: TODAY, isMust: true, priority: 4 })
    const p1 = mk({ id: 'p', scheduledFor: TODAY, isMust: false, priority: 1 })
    expect(eisenhowerScore(must, TODAY)).toBeGreaterThan(eisenhowerScore(p1, TODAY))
  })

  it('期日無し scheduledFor=today も urgency 10 まで上がる', () => {
    const sched = mk({ id: 's', scheduledFor: TODAY, priority: 3 })
    expect(eisenhowerScore(sched, TODAY)).toBeGreaterThan(0)
  })
})

describe('buildOperationBoard', () => {
  it('空配列で 0 件構造を返す', () => {
    const r = buildOperationBoard([], TODAY)
    expect(r.doneYesterday.count).toBe(0)
    expect(r.mustToday.count).toBe(0)
    expect(r.overdue.total).toBe(0)
    expect(r.todayScheduled.count).toBe(0)
    expect(r.recommended).toBeNull()
    expect(r.today).toBe(TODAY)
  })

  it('昨日 done を集計する (今日 done は除外)', () => {
    const r = buildOperationBoard(
      [
        mk({ id: 'd1', doneAt: new Date('2026-04-29T15:00:00Z') }),
        mk({ id: 'd2', doneAt: new Date('2026-04-29T08:00:00Z') }),
        mk({ id: 'today-done', doneAt: new Date('2026-04-30T12:00:00Z') }),
      ],
      TODAY,
    )
    expect(r.doneYesterday.count).toBe(2)
    expect(r.doneYesterday.items.map((i) => i.id)).toEqual(['d1', 'd2'])
  })

  it('mustToday は isMust + scheduledFor/dueDate=today で抽出、時刻昇順', () => {
    const r = buildOperationBoard(
      [
        mk({ id: 'm-late', isMust: true, scheduledFor: TODAY, dueTime: '14:00' }),
        mk({ id: 'm-early', isMust: true, scheduledFor: TODAY, dueTime: '09:00' }),
        mk({ id: 'm-other-day', isMust: true, scheduledFor: '2026-05-02' }),
        mk({ id: 'not-must', scheduledFor: TODAY }),
      ],
      TODAY,
    )
    expect(r.mustToday.items.map((i) => i.id)).toEqual(['m-early', 'm-late'])
  })

  it('overdue は dueDate < today で active な item、古い順 top 3', () => {
    const r = buildOperationBoard(
      [
        mk({ id: 'o1', dueDate: '2026-04-20' }),
        mk({ id: 'o2', dueDate: '2026-04-25' }),
        mk({ id: 'o3', dueDate: '2026-04-28' }),
        mk({ id: 'o4', dueDate: '2026-04-29' }),
        mk({ id: 'done-overdue', dueDate: '2026-04-15', doneAt: new Date() }),
        mk({ id: 'future', dueDate: '2026-05-10' }),
      ],
      TODAY,
    )
    expect(r.overdue.total).toBe(4)
    expect(r.overdue.top3.map((i) => i.id)).toEqual(['o1', 'o2', 'o3'])
  })

  it('todayScheduled は scheduledFor=today or dueDate=today を時刻昇順 + MUST 優先', () => {
    const r = buildOperationBoard(
      [
        mk({ id: 'noon', scheduledFor: TODAY, dueTime: '12:00' }),
        mk({ id: 'must-noon', scheduledFor: TODAY, dueTime: '12:00', isMust: true }),
        mk({ id: 'morn', scheduledFor: TODAY, dueTime: '09:00' }),
      ],
      TODAY,
    )
    // morn (09) → must-noon (12 + MUST) → noon (12 non-MUST)
    expect(r.todayScheduled.items.map((i) => i.id)).toEqual(['morn', 'must-noon', 'noon'])
  })

  it('recommended は overdue + MUST が最高', () => {
    const r = buildOperationBoard(
      [
        mk({ id: 'overdue-must', dueDate: '2026-04-25', isMust: true }),
        mk({ id: 'today-not-must', scheduledFor: TODAY, priority: 1 }),
      ],
      TODAY,
    )
    expect(r.recommended?.id).toBe('overdue-must')
  })

  it('archived / deleted item は active 集合から除外', () => {
    const r = buildOperationBoard(
      [
        mk({ id: 'arch', dueDate: '2026-04-25', archivedAt: new Date() }),
        mk({ id: 'del', dueDate: '2026-04-25', deletedAt: new Date() }),
        mk({ id: 'live', dueDate: '2026-04-25' }),
      ],
      TODAY,
    )
    expect(r.overdue.total).toBe(1)
    expect(r.overdue.top3[0]?.id).toBe('live')
  })

  it('recommended が null になる (候補無し)', () => {
    const r = buildOperationBoard([mk({ id: 'future', scheduledFor: '2026-05-10' })], TODAY)
    expect(r.recommended).toBeNull()
  })
})
