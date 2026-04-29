import { describe, expect, it } from 'vitest'

import {
  type CompletionDaysFields,
  computeCompletionDaysByPriority,
  computePriorityLatencyGap,
  formatCompletionDaysByPriorityJa,
} from './completion-days-by-priority'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysAgo(n: number, base = Date.now()): string {
  return new Date(base - n * MS_PER_DAY).toISOString()
}

describe('computeCompletionDaysByPriority', () => {
  it('returns all-zero stats when items empty', () => {
    const stats = computeCompletionDaysByPriority([])
    expect(stats[1]).toEqual({ count: 0, avgDays: null })
    expect(stats[4]).toEqual({ count: 0, avgDays: null })
  })

  it('aggregates a single P1 item', () => {
    const items: CompletionDaysFields[] = [
      { priority: 1, createdAt: daysAgo(5), doneAt: daysAgo(2) },
    ]
    const stats = computeCompletionDaysByPriority(items)
    expect(stats[1]).toEqual({ count: 1, avgDays: 3 })
  })

  it('averages multiple items in same priority', () => {
    const items: CompletionDaysFields[] = [
      { priority: 2, createdAt: daysAgo(10), doneAt: daysAgo(8) }, // 2 days
      { priority: 2, createdAt: daysAgo(10), doneAt: daysAgo(6) }, // 4 days
      { priority: 2, createdAt: daysAgo(10), doneAt: daysAgo(4) }, // 6 days
    ]
    const stats = computeCompletionDaysByPriority(items)
    expect(stats[2].count).toBe(3)
    expect(stats[2].avgDays).toBe(4.0)
  })

  it('groups by priority correctly', () => {
    const items: CompletionDaysFields[] = [
      { priority: 1, createdAt: daysAgo(3), doneAt: daysAgo(1) }, // 2 days
      { priority: 2, createdAt: daysAgo(8), doneAt: daysAgo(4) }, // 4 days
      { priority: 3, createdAt: daysAgo(10), doneAt: daysAgo(4) }, // 6 days
    ]
    const stats = computeCompletionDaysByPriority(items)
    expect(stats[1]).toEqual({ count: 1, avgDays: 2 })
    expect(stats[2]).toEqual({ count: 1, avgDays: 4 })
    expect(stats[3]).toEqual({ count: 1, avgDays: 6 })
    expect(stats[4]).toEqual({ count: 0, avgDays: null })
  })

  it('treats invalid priority (null/undefined/out of range) as P4', () => {
    const items: CompletionDaysFields[] = [
      { priority: null, createdAt: daysAgo(5), doneAt: daysAgo(0) },
      { priority: undefined, createdAt: daysAgo(7), doneAt: daysAgo(0) },
      { priority: 99, createdAt: daysAgo(3), doneAt: daysAgo(0) },
    ]
    const stats = computeCompletionDaysByPriority(items)
    expect(stats[4].count).toBe(3)
    expect(stats[4].avgDays).toBe(5)
  })

  it('skips items without doneAt (= incomplete)', () => {
    const items: CompletionDaysFields[] = [
      { priority: 1, createdAt: daysAgo(5), doneAt: null },
      { priority: 1, createdAt: daysAgo(3), doneAt: undefined },
      { priority: 1, createdAt: daysAgo(2), doneAt: daysAgo(1) }, // 1 day
    ]
    const stats = computeCompletionDaysByPriority(items)
    expect(stats[1].count).toBe(1)
    expect(stats[1].avgDays).toBe(1)
  })

  it('skips items without createdAt or invalid dates', () => {
    const items: CompletionDaysFields[] = [
      { priority: 1, createdAt: null, doneAt: daysAgo(0) },
      { priority: 1, createdAt: 'not-a-date', doneAt: daysAgo(0) },
      { priority: 1, createdAt: daysAgo(5), doneAt: daysAgo(2) }, // valid, 3 days
    ]
    const stats = computeCompletionDaysByPriority(items)
    expect(stats[1].count).toBe(1)
    expect(stats[1].avgDays).toBe(3)
  })

  it('skips items where doneAt < createdAt (clock skew)', () => {
    const items: CompletionDaysFields[] = [
      { priority: 1, createdAt: daysAgo(2), doneAt: daysAgo(5) }, // skew
      { priority: 1, createdAt: daysAgo(5), doneAt: daysAgo(2) }, // valid 3 days
    ]
    const stats = computeCompletionDaysByPriority(items)
    expect(stats[1].count).toBe(1)
    expect(stats[1].avgDays).toBe(3)
  })

  it('respects since filter (doneAt >= since)', () => {
    const items: CompletionDaysFields[] = [
      { priority: 1, createdAt: daysAgo(10), doneAt: daysAgo(8) }, // old, 2 days
      { priority: 1, createdAt: daysAgo(5), doneAt: daysAgo(2) }, // recent, 3 days
    ]
    const stats = computeCompletionDaysByPriority(items, { since: daysAgo(7) })
    expect(stats[1].count).toBe(1)
    expect(stats[1].avgDays).toBe(3)
  })

  it('rounds avgDays to 1 decimal', () => {
    const items: CompletionDaysFields[] = [
      { priority: 1, createdAt: daysAgo(3), doneAt: daysAgo(2) }, // 1 day
      { priority: 1, createdAt: daysAgo(3), doneAt: daysAgo(0) }, // 3 days
      // avg = 2 days even (no rounding edge)
    ]
    const stats = computeCompletionDaysByPriority(items)
    expect(stats[1].avgDays).toBe(2)
  })
})

describe('formatCompletionDaysByPriorityJa', () => {
  it('returns sentinel when all priorities empty', () => {
    expect(
      formatCompletionDaysByPriorityJa({
        1: { count: 0, avgDays: null },
        2: { count: 0, avgDays: null },
        3: { count: 0, avgDays: null },
        4: { count: 0, avgDays: null },
      }),
    ).toBe('完了 0 件 (該当なし)')
  })

  it('hides empty buckets, shows populated ones in P1→P4 order', () => {
    expect(
      formatCompletionDaysByPriorityJa({
        1: { count: 3, avgDays: 2.5 },
        2: { count: 0, avgDays: null },
        3: { count: 5, avgDays: 6.0 },
        4: { count: 1, avgDays: 14.0 },
      }),
    ).toBe('完了所要: P1 2.5日 (n=3) / P3 6日 (n=5) / P4 14日 (n=1)')
  })

  it('formats single populated bucket', () => {
    expect(
      formatCompletionDaysByPriorityJa({
        1: { count: 0, avgDays: null },
        2: { count: 7, avgDays: 4.2 },
        3: { count: 0, avgDays: null },
        4: { count: 0, avgDays: null },
      }),
    ).toBe('完了所要: P2 4.2日 (n=7)')
  })
})

describe('computePriorityLatencyGap', () => {
  it('returns null when no priorities have data', () => {
    expect(
      computePriorityLatencyGap({
        1: { count: 0, avgDays: null },
        2: { count: 0, avgDays: null },
        3: { count: 0, avgDays: null },
        4: { count: 0, avgDays: null },
      }),
    ).toBeNull()
  })

  it('returns null when only one priority has data', () => {
    expect(
      computePriorityLatencyGap({
        1: { count: 0, avgDays: null },
        2: { count: 5, avgDays: 4 },
        3: { count: 0, avgDays: null },
        4: { count: 0, avgDays: null },
      }),
    ).toBeNull()
  })

  it('computes gap between highest and lowest priority with data', () => {
    expect(
      computePriorityLatencyGap({
        1: { count: 3, avgDays: 2.5 },
        2: { count: 5, avgDays: 4 },
        3: { count: 0, avgDays: null },
        4: { count: 1, avgDays: 14 },
      }),
    ).toEqual({
      highKey: 1,
      lowKey: 4,
      highDays: 2.5,
      lowDays: 14,
      gapDays: 11.5,
    })
  })

  it('handles negative gap (low priority finishes faster — unusual)', () => {
    expect(
      computePriorityLatencyGap({
        1: { count: 1, avgDays: 10 },
        2: { count: 0, avgDays: null },
        3: { count: 0, avgDays: null },
        4: { count: 1, avgDays: 3 },
      }),
    ).toEqual({
      highKey: 1,
      lowKey: 4,
      highDays: 10,
      lowDays: 3,
      gapDays: -7,
    })
  })

  it('rounds gap to 1 decimal', () => {
    const gap = computePriorityLatencyGap({
      1: { count: 1, avgDays: 1.1 },
      2: { count: 0, avgDays: null },
      3: { count: 0, avgDays: null },
      4: { count: 1, avgDays: 3.4 },
    })
    expect(gap?.gapDays).toBe(2.3)
  })
})

describe('integration: items → stats → format → gap', () => {
  it('flows from items through 3 helpers', () => {
    const items: CompletionDaysFields[] = [
      { priority: 1, createdAt: daysAgo(3), doneAt: daysAgo(1) }, // P1: 2 days
      { priority: 1, createdAt: daysAgo(5), doneAt: daysAgo(2) }, // P1: 3 days
      { priority: 4, createdAt: daysAgo(20), doneAt: daysAgo(5) }, // P4: 15 days
    ]
    const stats = computeCompletionDaysByPriority(items)
    expect(stats[1]).toEqual({ count: 2, avgDays: 2.5 })
    expect(stats[4]).toEqual({ count: 1, avgDays: 15 })
    const summary = formatCompletionDaysByPriorityJa(stats)
    expect(summary).toBe('完了所要: P1 2.5日 (n=2) / P4 15日 (n=1)')
    const gap = computePriorityLatencyGap(stats)
    expect(gap).toEqual({
      highKey: 1,
      lowKey: 4,
      highDays: 2.5,
      lowDays: 15,
      gapDays: 12.5,
    })
  })
})
