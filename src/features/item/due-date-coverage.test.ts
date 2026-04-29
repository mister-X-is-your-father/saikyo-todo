import { describe, expect, it } from 'vitest'

import {
  computeDueDateCoverage,
  computeDueDateCoverageByPriority,
  type DueDateCoverageByPriorityFields,
  type DueDateCoverageFields,
  dueDateCoverageTone,
  formatDueDateCoverageByPriorityJa,
  formatDueDateCoverageJa,
} from './due-date-coverage'

describe('computeDueDateCoverage', () => {
  it('returns empty when items is empty', () => {
    expect(computeDueDateCoverage([])).toEqual({
      total: 0,
      withDueDate: 0,
      withoutDueDate: 0,
      coverageRate: null,
    })
  })

  it('excludes done items (doneAt != null)', () => {
    const items: DueDateCoverageFields[] = [
      { doneAt: '2026-04-29T10:00:00Z', archivedAt: null, dueDate: '2026-04-29' },
      { doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
    ]
    const stats = computeDueDateCoverage(items)
    expect(stats.total).toBe(1)
    expect(stats.withDueDate).toBe(1)
  })

  it('excludes archived items', () => {
    const items: DueDateCoverageFields[] = [
      { doneAt: null, archivedAt: '2026-04-29T10:00:00Z', dueDate: '2026-04-29' },
      { doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
    ]
    const stats = computeDueDateCoverage(items)
    expect(stats.total).toBe(1)
  })

  it('counts withDueDate when dueDate is valid YYYY-MM-DD', () => {
    const items: DueDateCoverageFields[] = [
      { doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { doneAt: null, archivedAt: null, dueDate: '2026-12-31' },
    ]
    const stats = computeDueDateCoverage(items)
    expect(stats.withDueDate).toBe(2)
    expect(stats.withoutDueDate).toBe(0)
    expect(stats.coverageRate).toBe(1)
  })

  it('counts withoutDueDate when dueDate is null / undefined / invalid', () => {
    const items: DueDateCoverageFields[] = [
      { doneAt: null, archivedAt: null, dueDate: null },
      { doneAt: null, archivedAt: null, dueDate: undefined },
      { doneAt: null, archivedAt: null, dueDate: '' },
      { doneAt: null, archivedAt: null, dueDate: 'garbage' },
      { doneAt: null, archivedAt: null, dueDate: '2026-99-99' },
    ]
    const stats = computeDueDateCoverage(items)
    expect(stats.withDueDate).toBe(0)
    expect(stats.withoutDueDate).toBe(5)
    expect(stats.coverageRate).toBe(0)
  })

  it('mixes coverage with correct rate', () => {
    const items: DueDateCoverageFields[] = [
      // 3 with dueDate
      { doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { doneAt: null, archivedAt: null, dueDate: '2026-05-01' },
      { doneAt: null, archivedAt: null, dueDate: '2026-05-15' },
      // 2 without
      { doneAt: null, archivedAt: null, dueDate: null },
      { doneAt: null, archivedAt: null, dueDate: null },
    ]
    const stats = computeDueDateCoverage(items)
    expect(stats.total).toBe(5)
    expect(stats.withDueDate).toBe(3)
    expect(stats.withoutDueDate).toBe(2)
    expect(stats.coverageRate).toBe(0.6)
  })
})

describe('formatDueDateCoverageJa', () => {
  it('formats empty as "未完了 0 件 (該当なし)"', () => {
    expect(
      formatDueDateCoverageJa({
        total: 0,
        withDueDate: 0,
        withoutDueDate: 0,
        coverageRate: null,
      }),
    ).toBe('未完了 0 件 (該当なし)')
  })

  it('formats 100% coverage', () => {
    expect(
      formatDueDateCoverageJa({
        total: 5,
        withDueDate: 5,
        withoutDueDate: 0,
        coverageRate: 1,
      }),
    ).toBe('期限カバレッジ: 100% (5 / 5 件)')
  })

  it('formats 0% coverage with "全て未設定" tail', () => {
    expect(
      formatDueDateCoverageJa({
        total: 5,
        withDueDate: 0,
        withoutDueDate: 5,
        coverageRate: 0,
      }),
    ).toBe('期限カバレッジ: 0% (0 / 5 件 — 全て未設定)')
  })

  it('formats partial coverage with "未設定 N 件" tail', () => {
    expect(
      formatDueDateCoverageJa({
        total: 5,
        withDueDate: 3,
        withoutDueDate: 2,
        coverageRate: 0.6,
      }),
    ).toBe('期限カバレッジ: 60% (3 / 5 件 — 未設定 2 件)')
  })

  it('rounds 66.6% to 67%', () => {
    expect(
      formatDueDateCoverageJa({
        total: 3,
        withDueDate: 2,
        withoutDueDate: 1,
        coverageRate: 2 / 3,
      }),
    ).toBe('期限カバレッジ: 67% (2 / 3 件 — 未設定 1 件)')
  })
})

describe('dueDateCoverageTone', () => {
  it('returns "good" when coverageRate >= 0.7', () => {
    expect(
      dueDateCoverageTone({ total: 10, withDueDate: 7, withoutDueDate: 3, coverageRate: 0.7 }),
    ).toBe('good')
    expect(
      dueDateCoverageTone({ total: 10, withDueDate: 10, withoutDueDate: 0, coverageRate: 1 }),
    ).toBe('good')
  })

  it('returns "neutral" when 0.3 <= coverageRate < 0.7', () => {
    expect(
      dueDateCoverageTone({ total: 10, withDueDate: 5, withoutDueDate: 5, coverageRate: 0.5 }),
    ).toBe('neutral')
    expect(
      dueDateCoverageTone({ total: 10, withDueDate: 3, withoutDueDate: 7, coverageRate: 0.3 }),
    ).toBe('neutral')
  })

  it('returns "warn" when coverageRate < 0.3', () => {
    expect(
      dueDateCoverageTone({ total: 10, withDueDate: 2, withoutDueDate: 8, coverageRate: 0.2 }),
    ).toBe('warn')
    expect(
      dueDateCoverageTone({ total: 10, withDueDate: 0, withoutDueDate: 10, coverageRate: 0 }),
    ).toBe('warn')
  })

  it('returns "neutral" for empty (total=0 / coverageRate=null)', () => {
    expect(
      dueDateCoverageTone({ total: 0, withDueDate: 0, withoutDueDate: 0, coverageRate: null }),
    ).toBe('neutral')
  })
})

describe('computeDueDateCoverageByPriority', () => {
  it('returns zero stats for all priorities when items empty', () => {
    const r = computeDueDateCoverageByPriority([])
    for (const k of [1, 2, 3, 4] as const) {
      expect(r[k]).toEqual({ total: 0, withDueDate: 0, withoutDueDate: 0, coverageRate: null })
    }
  })

  it('groups by priority and computes per-bucket coverage', () => {
    const items: DueDateCoverageByPriorityFields[] = [
      { priority: 1, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { priority: 1, doneAt: null, archivedAt: null, dueDate: '2026-05-01' },
      { priority: 3, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { priority: 3, doneAt: null, archivedAt: null, dueDate: null },
      { priority: 4, doneAt: null, archivedAt: null, dueDate: null },
      { priority: 4, doneAt: null, archivedAt: null, dueDate: null },
    ]
    const r = computeDueDateCoverageByPriority(items)
    expect(r[1]).toEqual({ total: 2, withDueDate: 2, withoutDueDate: 0, coverageRate: 1 })
    expect(r[3]).toEqual({ total: 2, withDueDate: 1, withoutDueDate: 1, coverageRate: 0.5 })
    expect(r[4]).toEqual({ total: 2, withDueDate: 0, withoutDueDate: 2, coverageRate: 0 })
  })

  it('normalizes null/undefined/out-of-range priority to p4', () => {
    const items: DueDateCoverageByPriorityFields[] = [
      { priority: null, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { priority: 99, doneAt: null, archivedAt: null, dueDate: null },
    ]
    const r = computeDueDateCoverageByPriority(items)
    expect(r[4]).toEqual({ total: 2, withDueDate: 1, withoutDueDate: 1, coverageRate: 0.5 })
  })
})

describe('formatDueDateCoverageByPriorityJa', () => {
  it('formats per-priority entries (skips total=0)', () => {
    const items: DueDateCoverageByPriorityFields[] = [
      { priority: 1, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { priority: 1, doneAt: null, archivedAt: null, dueDate: '2026-05-01' },
      { priority: 3, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { priority: 3, doneAt: null, archivedAt: null, dueDate: null },
    ]
    const r = computeDueDateCoverageByPriority(items)
    expect(formatDueDateCoverageByPriorityJa(r)).toBe(
      '期限カバレッジ: P1 100% (2/2) / P3 50% (1/2)',
    )
  })

  it('formats empty (all priorities total=0) as "未完了 0 件 (該当なし)"', () => {
    const r = computeDueDateCoverageByPriority([])
    expect(formatDueDateCoverageByPriorityJa(r)).toBe('未完了 0 件 (該当なし)')
  })
})

describe('integration: items → compute → format', () => {
  it('connects pipeline end-to-end', () => {
    const items: DueDateCoverageFields[] = [
      { doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { doneAt: null, archivedAt: null, dueDate: '2026-05-01' },
      { doneAt: null, archivedAt: null, dueDate: null },
      { doneAt: '2026-04-25T10:00:00Z', archivedAt: null, dueDate: '2026-04-29' }, // excluded (done)
    ]
    const stats = computeDueDateCoverage(items)
    expect(formatDueDateCoverageJa(stats)).toBe('期限カバレッジ: 67% (2 / 3 件 — 未設定 1 件)')
  })
})
