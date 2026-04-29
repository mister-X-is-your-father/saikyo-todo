import { describe, expect, it } from 'vitest'

import { computeSlipDays, formatSlipDaysJa, type SlipDaysFields } from './slip-days'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function localEndOfDay(dueDate: string, offsetDays = 0): Date {
  const [y, m, d] = dueDate.split('-').map(Number)
  return new Date(new Date(y!, m! - 1, d!, 23, 59, 59, 999).getTime() + offsetDays * MS_PER_DAY)
}

describe('computeSlipDays', () => {
  it('returns empty when items is empty', () => {
    expect(computeSlipDays([])).toEqual({
      count: 0,
      avgDays: null,
      medianDays: null,
      maxDays: null,
    })
  })

  it('excludes items without doneAt or dueDate (fail-soft)', () => {
    const items: SlipDaysFields[] = [
      { doneAt: null, dueDate: '2026-04-29' },
      { doneAt: '2026-04-29T10:00:00Z', dueDate: null },
      { doneAt: 'not-a-date', dueDate: '2026-04-29' },
      { doneAt: '2026-04-29T10:00:00Z', dueDate: 'garbage' },
    ]
    expect(computeSlipDays(items).count).toBe(0)
  })

  it('excludes items completed by the due date (no slip)', () => {
    const items: SlipDaysFields[] = [
      { doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      { doneAt: localEndOfDay('2026-04-29', 0).toISOString(), dueDate: '2026-04-29' },
    ]
    expect(computeSlipDays(items).count).toBe(0)
  })

  it('counts 1-day slip when completed the day after due', () => {
    const items: SlipDaysFields[] = [
      // doneAt = dueDate end-of-day + 1ms → 1 day slip (ceil)
      {
        doneAt: new Date(localEndOfDay('2026-04-29').getTime() + 1).toISOString(),
        dueDate: '2026-04-29',
      },
    ]
    const stats = computeSlipDays(items)
    expect(stats.count).toBe(1)
    expect(stats.maxDays).toBe(1)
  })

  it('computes avg / median / max for multiple misses', () => {
    const items: SlipDaysFields[] = [
      // 1 day slip
      { doneAt: localEndOfDay('2026-04-29', 1).toISOString(), dueDate: '2026-04-29' },
      // 2 days slip
      { doneAt: localEndOfDay('2026-04-29', 2).toISOString(), dueDate: '2026-04-29' },
      // 5 days slip
      { doneAt: localEndOfDay('2026-04-29', 5).toISOString(), dueDate: '2026-04-29' },
    ]
    const stats = computeSlipDays(items)
    expect(stats.count).toBe(3)
    expect(stats.avgDays).toBeCloseTo(2.7, 1)
    expect(stats.medianDays).toBe(2)
    expect(stats.maxDays).toBe(5)
  })

  it('computes median for even count (avg of middle 2)', () => {
    const items: SlipDaysFields[] = [
      { doneAt: localEndOfDay('2026-04-29', 1).toISOString(), dueDate: '2026-04-29' },
      { doneAt: localEndOfDay('2026-04-29', 3).toISOString(), dueDate: '2026-04-29' },
      { doneAt: localEndOfDay('2026-04-29', 5).toISOString(), dueDate: '2026-04-29' },
      { doneAt: localEndOfDay('2026-04-29', 9).toISOString(), dueDate: '2026-04-29' },
    ]
    const stats = computeSlipDays(items)
    expect(stats.count).toBe(4)
    // sorted: 1, 3, 5, 9 → median = (3+5)/2 = 4
    expect(stats.medianDays).toBe(4)
    expect(stats.avgDays).toBe(4.5)
    expect(stats.maxDays).toBe(9)
  })

  it('respects since option (excludes doneAt before since)', () => {
    const items: SlipDaysFields[] = [
      // before since (excluded)
      { doneAt: localEndOfDay('2026-04-01', 1).toISOString(), dueDate: '2026-04-01' },
      // after since (included, 2-day slip)
      { doneAt: localEndOfDay('2026-04-29', 2).toISOString(), dueDate: '2026-04-29' },
    ]
    const stats = computeSlipDays(items, { since: '2026-04-15T00:00:00Z' })
    expect(stats.count).toBe(1)
    expect(stats.maxDays).toBe(2)
  })

  it('ignores invalid since (uses all)', () => {
    const items: SlipDaysFields[] = [
      { doneAt: localEndOfDay('2026-04-01', 1).toISOString(), dueDate: '2026-04-01' },
      { doneAt: localEndOfDay('2026-04-29', 2).toISOString(), dueDate: '2026-04-29' },
    ]
    const stats = computeSlipDays(items, { since: 'garbage' })
    expect(stats.count).toBe(2)
  })
})

describe('formatSlipDaysJa', () => {
  it('formats empty as "遅延 0 件"', () => {
    expect(formatSlipDaysJa({ count: 0, avgDays: null, medianDays: null, maxDays: null })).toBe(
      '遅延 0 件',
    )
  })

  it('formats single miss with short form', () => {
    expect(formatSlipDaysJa({ count: 1, avgDays: 3, medianDays: 3, maxDays: 3 })).toBe(
      '遅延: 1 件 (3日)',
    )
  })

  it('formats multi-miss with avg / median / max', () => {
    expect(formatSlipDaysJa({ count: 5, avgDays: 3.4, medianDays: 2, maxDays: 12 })).toBe(
      '遅延: 5 件 (平均 3.4日 / 中央値 2日 / 最大 12日)',
    )
  })

  it('formats fractional median (even count)', () => {
    expect(formatSlipDaysJa({ count: 4, avgDays: 4.5, medianDays: 4, maxDays: 9 })).toBe(
      '遅延: 4 件 (平均 4.5日 / 中央値 4日 / 最大 9日)',
    )
  })
})

describe('integration: items → compute → format', () => {
  it('connects pipeline end-to-end', () => {
    const items: SlipDaysFields[] = [
      // hit (excluded)
      { doneAt: '2026-04-25T10:00:00Z', dueDate: '2026-04-29' },
      // miss 1 day
      { doneAt: localEndOfDay('2026-04-29', 1).toISOString(), dueDate: '2026-04-29' },
      // miss 5 days
      { doneAt: localEndOfDay('2026-04-29', 5).toISOString(), dueDate: '2026-04-29' },
    ]
    const stats = computeSlipDays(items)
    expect(formatSlipDaysJa(stats)).toBe('遅延: 2 件 (平均 3日 / 中央値 3日 / 最大 5日)')
  })
})
