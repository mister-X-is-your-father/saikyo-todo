import { describe, expect, it } from 'vitest'

import {
  computeDueHitRate,
  type DueHitRateFields,
  dueHitRateTone,
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
