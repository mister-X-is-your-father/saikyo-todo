import { describe, expect, it } from 'vitest'

import {
  computeDueHitRate,
  computeDueHitRateByPriority,
  countNonEmptyPriorityBuckets,
  type DueHitRateByPriorityFields,
  type DueHitRateFields,
  dueHitRateTone,
  formatDueHitRateByPriorityJa,
  formatDueHitRateJa,
} from './due-hit-rate'

const HOUR = 60 * 60 * 1000

function localEndOfDay(dueDate: string, offsetMs = 0): Date {
  const [y, m, d] = dueDate.split('-').map(Number)
  return new Date(y!, m! - 1, d!, 23, 59, 59, 999 + offsetMs)
}

describe('computeDueHitRate', () => {
  it('returns empty when items is empty', () => {
    expect(computeDueHitRate([])).toEqual({ total: 0, hit: 0, miss: 0, hitRate: null })
  })

  it('excludes items without doneAt', () => {
    const items: DueHitRateFields[] = [
      { doneAt: null, dueDate: '2026-04-29' },
      { doneAt: undefined, dueDate: '2026-04-29' },
    ]
    expect(computeDueHitRate(items).total).toBe(0)
  })

  it('excludes items without dueDate', () => {
    const items: DueHitRateFields[] = [
      { doneAt: '2026-04-29T10:00:00Z', dueDate: null },
      { doneAt: '2026-04-29T10:00:00Z', dueDate: undefined },
    ]
    expect(computeDueHitRate(items).total).toBe(0)
  })

  it('excludes invalid doneAt or dueDate (fail-soft)', () => {
    const items: DueHitRateFields[] = [
      { doneAt: 'not-a-date', dueDate: '2026-04-29' },
      { doneAt: '2026-04-29T10:00:00Z', dueDate: '2026-99-99' },
      { doneAt: '2026-04-29T10:00:00Z', dueDate: 'garbage' },
    ]
    expect(computeDueHitRate(items).total).toBe(0)
  })

  it('counts hit when doneAt is on the due date (before end-of-day)', () => {
    const items: DueHitRateFields[] = [
      { doneAt: localEndOfDay('2026-04-29', -HOUR).toISOString(), dueDate: '2026-04-29' },
    ]
    const stats = computeDueHitRate(items)
    expect(stats).toEqual({ total: 1, hit: 1, miss: 0, hitRate: 1 })
  })

  it('counts hit when doneAt is well before due date', () => {
    const items: DueHitRateFields[] = [{ doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' }]
    const stats = computeDueHitRate(items)
    expect(stats.hit).toBe(1)
    expect(stats.miss).toBe(0)
  })

  it('counts miss when doneAt is after due-date end-of-day', () => {
    const items: DueHitRateFields[] = [
      { doneAt: localEndOfDay('2026-04-29', 2 * HOUR).toISOString(), dueDate: '2026-04-29' },
    ]
    const stats = computeDueHitRate(items)
    expect(stats).toEqual({ total: 1, hit: 0, miss: 1, hitRate: 0 })
  })

  it('mixes hit and miss with correct rate', () => {
    const items: DueHitRateFields[] = [
      // 4 hits
      { doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      { doneAt: '2026-04-26T10:00:00Z', dueDate: '2026-04-29' },
      { doneAt: '2026-04-27T10:00:00Z', dueDate: '2026-04-29' },
      { doneAt: '2026-04-28T10:00:00Z', dueDate: '2026-04-29' },
      // 1 miss
      { doneAt: '2026-04-30T15:00:00Z', dueDate: '2026-04-29' },
    ]
    const stats = computeDueHitRate(items)
    expect(stats.total).toBe(5)
    expect(stats.hit).toBe(4)
    expect(stats.miss).toBe(1)
    expect(stats.hitRate).toBeCloseTo(0.8, 5)
  })

  it('respects since option (excludes doneAt before since)', () => {
    const items: DueHitRateFields[] = [
      // before since (excluded)
      { doneAt: '2026-04-01T10:00:00Z', dueDate: '2026-04-01' },
      // after since (included, hit)
      { doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
    ]
    const stats = computeDueHitRate(items, { since: '2026-04-15T00:00:00Z' })
    expect(stats.total).toBe(1)
    expect(stats.hit).toBe(1)
  })

  it('ignores invalid since (uses all)', () => {
    const items: DueHitRateFields[] = [
      { doneAt: '2026-04-01T10:00:00Z', dueDate: '2026-04-01' },
      { doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
    ]
    const stats = computeDueHitRate(items, { since: 'garbage' })
    expect(stats.total).toBe(2)
  })
})

describe('formatDueHitRateJa', () => {
  it('formats normal rate (rounded to whole percent)', () => {
    expect(formatDueHitRateJa({ total: 5, hit: 4, miss: 1, hitRate: 0.8 })).toBe(
      '期限達成率: 80% (4 / 5 件)',
    )
  })

  it('formats 100% hit rate', () => {
    expect(formatDueHitRateJa({ total: 5, hit: 5, miss: 0, hitRate: 1 })).toBe(
      '期限達成率: 100% (5 / 5 件)',
    )
  })

  it('formats 0% hit rate with tail "全て遅延"', () => {
    expect(formatDueHitRateJa({ total: 3, hit: 0, miss: 3, hitRate: 0 })).toBe(
      '期限達成率: 0% (0 / 3 件 — 全て遅延)',
    )
  })

  it('formats empty (total=0) as "完了 0 件 (該当なし)"', () => {
    expect(formatDueHitRateJa({ total: 0, hit: 0, miss: 0, hitRate: null })).toBe(
      '完了 0 件 (該当なし)',
    )
  })

  it('rounds 66.66% to 67% (half-to-even)', () => {
    expect(formatDueHitRateJa({ total: 3, hit: 2, miss: 1, hitRate: 2 / 3 })).toBe(
      '期限達成率: 67% (2 / 3 件)',
    )
  })
})

describe('dueHitRateTone', () => {
  it('returns "good" when hitRate >= 0.8 (達成)', () => {
    expect(dueHitRateTone({ total: 5, hit: 5, miss: 0, hitRate: 1 })).toBe('good')
    expect(dueHitRateTone({ total: 5, hit: 4, miss: 1, hitRate: 0.8 })).toBe('good')
  })

  it('returns "neutral" when 0.5 <= hitRate < 0.8 (中立)', () => {
    expect(dueHitRateTone({ total: 4, hit: 3, miss: 1, hitRate: 0.75 })).toBe('neutral')
    expect(dueHitRateTone({ total: 2, hit: 1, miss: 1, hitRate: 0.5 })).toBe('neutral')
  })

  it('returns "warn" when hitRate < 0.5 (警戒)', () => {
    expect(dueHitRateTone({ total: 5, hit: 2, miss: 3, hitRate: 0.4 })).toBe('warn')
    expect(dueHitRateTone({ total: 3, hit: 0, miss: 3, hitRate: 0 })).toBe('warn')
  })

  it('returns "neutral" for empty (total=0 / hitRate=null)', () => {
    expect(dueHitRateTone({ total: 0, hit: 0, miss: 0, hitRate: null })).toBe('neutral')
  })
})

describe('computeDueHitRateByPriority', () => {
  it('returns zero stats for all priorities when items empty', () => {
    const r = computeDueHitRateByPriority([])
    for (const k of [1, 2, 3, 4] as const) {
      expect(r[k]).toEqual({ total: 0, hit: 0, miss: 0, hitRate: null })
    }
  })

  it('groups by priority and computes per-bucket hit rate', () => {
    const items: DueHitRateByPriorityFields[] = [
      // P1: 2 hits / 0 miss → 100%
      { priority: 1, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 1, doneAt: '2026-04-26T10:00:00Z', dueDate: '2026-04-29' },
      // P3: 1 hit / 1 miss → 50%
      { priority: 3, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 3, doneAt: '2026-05-01T10:00:00Z', dueDate: '2026-04-29' },
      // P4: 0 hit / 1 miss → 0%
      { priority: 4, doneAt: '2026-05-01T10:00:00Z', dueDate: '2026-04-29' },
    ]
    const r = computeDueHitRateByPriority(items)
    expect(r[1]).toEqual({ total: 2, hit: 2, miss: 0, hitRate: 1 })
    expect(r[2]).toEqual({ total: 0, hit: 0, miss: 0, hitRate: null })
    expect(r[3]).toEqual({ total: 2, hit: 1, miss: 1, hitRate: 0.5 })
    expect(r[4]).toEqual({ total: 1, hit: 0, miss: 1, hitRate: 0 })
  })

  it('normalizes null/undefined/out-of-range priority to p4', () => {
    const items: DueHitRateByPriorityFields[] = [
      { priority: null, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' }, // → p4 hit
      { priority: undefined, doneAt: '2026-05-01T10:00:00Z', dueDate: '2026-04-29' }, // → p4 miss
      { priority: 99, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' }, // → p4 hit
    ]
    const r = computeDueHitRateByPriority(items)
    expect(r[4]).toEqual({ total: 3, hit: 2, miss: 1, hitRate: 2 / 3 })
  })

  it('respects since option per priority bucket', () => {
    const items: DueHitRateByPriorityFields[] = [
      { priority: 1, doneAt: '2026-04-01T10:00:00Z', dueDate: '2026-04-01' }, // before since
      { priority: 1, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' }, // after since (hit)
    ]
    const r = computeDueHitRateByPriority(items, { since: '2026-04-15T00:00:00Z' })
    expect(r[1]).toEqual({ total: 1, hit: 1, miss: 0, hitRate: 1 })
  })
})

describe('formatDueHitRateByPriorityJa', () => {
  it('formats per-priority entries (skips total=0)', () => {
    const items: DueHitRateByPriorityFields[] = [
      { priority: 1, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 1, doneAt: '2026-04-26T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 3, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 3, doneAt: '2026-05-01T10:00:00Z', dueDate: '2026-04-29' },
    ]
    const r = computeDueHitRateByPriority(items)
    expect(formatDueHitRateByPriorityJa(r)).toBe('期限達成率: P1 100% (2/2) / P3 50% (1/2)')
  })

  it('formats empty (all priorities total=0) as "完了 0 件 (該当なし)"', () => {
    const r = computeDueHitRateByPriority([])
    expect(formatDueHitRateByPriorityJa(r)).toBe('完了 0 件 (該当なし)')
  })

  it('rounds percentage half-to-even', () => {
    // 2/3 = 0.666… → 67%
    const items: DueHitRateByPriorityFields[] = [
      { priority: 2, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 2, doneAt: '2026-04-26T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 2, doneAt: '2026-05-01T10:00:00Z', dueDate: '2026-04-29' },
    ]
    const r = computeDueHitRateByPriority(items)
    expect(formatDueHitRateByPriorityJa(r)).toBe('期限達成率: P2 67% (2/3)')
  })
})

describe('countNonEmptyPriorityBuckets', () => {
  it('returns 0 for fully empty (no completed items)', () => {
    const r = computeDueHitRateByPriority([])
    expect(countNonEmptyPriorityBuckets(r)).toBe(0)
  })

  it('returns 1 when all completed items in one priority', () => {
    const items: DueHitRateByPriorityFields[] = [
      { priority: 1, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 1, doneAt: '2026-04-26T10:00:00Z', dueDate: '2026-04-29' },
    ]
    const r = computeDueHitRateByPriority(items)
    expect(countNonEmptyPriorityBuckets(r)).toBe(1)
  })

  it('returns N when items spread across N priorities', () => {
    const items: DueHitRateByPriorityFields[] = [
      { priority: 1, doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 2, doneAt: '2026-04-26T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 3, doneAt: '2026-04-27T10:00:00Z', dueDate: '2026-04-29' },
      { priority: 4, doneAt: '2026-04-28T10:00:00Z', dueDate: '2026-04-29' },
    ]
    const r = computeDueHitRateByPriority(items)
    expect(countNonEmptyPriorityBuckets(r)).toBe(4)
  })
})

describe('integration: items → compute → format', () => {
  it('connects pipeline end-to-end', () => {
    const items: DueHitRateFields[] = [
      { doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' }, // hit
      { doneAt: '2026-04-26T10:00:00Z', dueDate: '2026-04-29' }, // hit
      { doneAt: '2026-05-01T10:00:00Z', dueDate: '2026-04-29' }, // miss
      { doneAt: null, dueDate: '2026-04-29' }, // excluded
    ]
    const stats = computeDueHitRate(items)
    expect(formatDueHitRateJa(stats)).toBe('期限達成率: 67% (2 / 3 件)')
  })
})
