import { describe, expect, it } from 'vitest'

import type { Item } from '@/features/item/schema'

import { dueTimeToMinutes, sortForTimeline } from './sort-for-timeline'

function mk(over: Partial<Item> & { id: string }): Item {
  return {
    workspaceId: 'ws',
    title: over.title ?? `item ${over.id}`,
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
    sprintId: null,
    keyResultId: null,
    createdByActorType: 'user',
    createdByActorId: 'u',
    deletedAt: null,
    version: 0,
    createdAt: new Date('2026-04-30T00:00:00Z'),
    updatedAt: new Date('2026-04-30T00:00:00Z'),
    ...over,
  } as Item
}

describe('dueTimeToMinutes', () => {
  it('parses HH:MM and HH:MM:SS', () => {
    expect(dueTimeToMinutes('00:00')).toBe(0)
    expect(dueTimeToMinutes('09:30')).toBe(9 * 60 + 30)
    expect(dueTimeToMinutes('23:59:59')).toBe(23 * 60 + 59)
  })

  it('returns null for invalid / null', () => {
    expect(dueTimeToMinutes(null)).toBeNull()
    expect(dueTimeToMinutes(undefined)).toBeNull()
    expect(dueTimeToMinutes('25:00')).toBeNull()
    expect(dueTimeToMinutes('garbage')).toBeNull()
  })
})

describe('sortForTimeline', () => {
  it('時刻ありを先に並べる (時刻昇順)', () => {
    const out = sortForTimeline([
      mk({ id: 'a', dueTime: '14:00' }),
      mk({ id: 'b', dueTime: '09:30' }),
      mk({ id: 'c', dueTime: '11:00' }),
    ])
    expect(out.map((o) => o.item.id)).toEqual(['b', 'c', 'a'])
    expect(out[0]?.timeLabel).toBe('09:30')
  })

  it('時刻無しは後ろに並べ、priority 昇順 → createdAt 昇順', () => {
    const t1 = new Date('2026-04-30T01:00:00Z')
    const t2 = new Date('2026-04-30T02:00:00Z')
    const out = sortForTimeline([
      mk({ id: 'p4', priority: 4, createdAt: t1 }),
      mk({ id: 'p1', priority: 1, createdAt: t2 }),
      mk({ id: 'p3a', priority: 3, createdAt: t1 }),
      mk({ id: 'p3b', priority: 3, createdAt: t2 }),
    ])
    expect(out.map((o) => o.item.id)).toEqual(['p1', 'p3a', 'p3b', 'p4'])
    expect(out.every((o) => o.timeLabel === null)).toBe(true)
  })

  it('混在: 時刻あり → 時刻無し の 2 段', () => {
    const out = sortForTimeline([
      mk({ id: 'noon', dueTime: '12:00' }),
      mk({ id: 'free', priority: 2 }),
      mk({ id: 'morn', dueTime: '08:00' }),
    ])
    expect(out.map((o) => o.item.id)).toEqual(['morn', 'noon', 'free'])
  })

  it('時刻同 → priority → createdAt の tie-breaker', () => {
    const t1 = new Date('2026-04-30T01:00:00Z')
    const t2 = new Date('2026-04-30T02:00:00Z')
    const out = sortForTimeline([
      mk({ id: 'c', dueTime: '10:00', priority: 1, createdAt: t2 }),
      mk({ id: 'a', dueTime: '10:00', priority: 3, createdAt: t1 }),
      mk({ id: 'b', dueTime: '10:00', priority: 1, createdAt: t1 }),
    ])
    // priority 1 先 → b (t1 古い) → c (t2)、最後に priority 3 a
    expect(out.map((o) => o.item.id)).toEqual(['b', 'c', 'a'])
  })

  it('空配列は空配列を返す', () => {
    expect(sortForTimeline([])).toEqual([])
  })

  it('formats time as HH:MM (zero-padded)', () => {
    const out = sortForTimeline([mk({ id: 'a', dueTime: '9:5' })])
    expect(out[0]?.timeLabel).toBe('09:05')
  })

  it('index は 0 から連番', () => {
    const out = sortForTimeline([
      mk({ id: 'a', dueTime: '09:00' }),
      mk({ id: 'b', dueTime: '10:00' }),
      mk({ id: 'c' }),
    ])
    expect(out.map((o) => o.index)).toEqual([0, 1, 2])
  })
})
