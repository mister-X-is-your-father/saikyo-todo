import { describe, expect, it } from 'vitest'

import {
  computeDodCoverage,
  computeDodCoverageByPriority,
  type DodCoverageByPriorityFields,
  type DodCoverageFields,
  dodCoverageTone,
  formatDodCoverageByPriorityJa,
  formatDodCoverageJa,
} from './dod-coverage'

describe('computeDodCoverage', () => {
  it('returns empty when items is empty', () => {
    expect(computeDodCoverage([])).toEqual({
      total: 0,
      withDod: 0,
      withoutDod: 0,
      coverageRate: null,
    })
  })

  it('excludes done items (doneAt != null)', () => {
    const items: DodCoverageFields[] = [
      { doneAt: '2026-04-29T10:00:00Z', archivedAt: null, dod: '受入条件' },
      { doneAt: null, archivedAt: null, dod: '受入条件' },
    ]
    expect(computeDodCoverage(items).total).toBe(1)
  })

  it('excludes archived items', () => {
    const items: DodCoverageFields[] = [
      { doneAt: null, archivedAt: '2026-04-29T10:00:00Z', dod: '受入条件' },
      { doneAt: null, archivedAt: null, dod: '受入条件' },
    ]
    expect(computeDodCoverage(items).total).toBe(1)
  })

  it('counts withDod when dod is meaningful (non-empty after trim)', () => {
    const items: DodCoverageFields[] = [
      { doneAt: null, archivedAt: null, dod: '受入条件 A' },
      { doneAt: null, archivedAt: null, dod: '  spaces ok  ' },
    ]
    const stats = computeDodCoverage(items)
    expect(stats.withDod).toBe(2)
    expect(stats.coverageRate).toBe(1)
  })

  it('counts withoutDod when dod is null / undefined / empty / whitespace-only', () => {
    const items: DodCoverageFields[] = [
      { doneAt: null, archivedAt: null, dod: null },
      { doneAt: null, archivedAt: null, dod: undefined },
      { doneAt: null, archivedAt: null, dod: '' },
      { doneAt: null, archivedAt: null, dod: '   ' },
      { doneAt: null, archivedAt: null, dod: '\n\t' },
    ]
    const stats = computeDodCoverage(items)
    expect(stats.withDod).toBe(0)
    expect(stats.withoutDod).toBe(5)
    expect(stats.coverageRate).toBe(0)
  })

  it('mixes coverage with correct rate', () => {
    const items: DodCoverageFields[] = [
      { doneAt: null, archivedAt: null, dod: '受入条件 A' },
      { doneAt: null, archivedAt: null, dod: '受入条件 B' },
      { doneAt: null, archivedAt: null, dod: '受入条件 C' },
      { doneAt: null, archivedAt: null, dod: null },
      { doneAt: null, archivedAt: null, dod: null },
    ]
    const stats = computeDodCoverage(items)
    expect(stats.total).toBe(5)
    expect(stats.withDod).toBe(3)
    expect(stats.withoutDod).toBe(2)
    expect(stats.coverageRate).toBe(0.6)
  })
})

describe('formatDodCoverageJa', () => {
  it('formats empty as "未完了 0 件 (該当なし)"', () => {
    expect(formatDodCoverageJa({ total: 0, withDod: 0, withoutDod: 0, coverageRate: null })).toBe(
      '未完了 0 件 (該当なし)',
    )
  })

  it('formats 100% coverage', () => {
    expect(formatDodCoverageJa({ total: 5, withDod: 5, withoutDod: 0, coverageRate: 1 })).toBe(
      'DoD カバレッジ: 100% (5 / 5 件)',
    )
  })

  it('formats 0% coverage with "全て未設定" tail', () => {
    expect(formatDodCoverageJa({ total: 5, withDod: 0, withoutDod: 5, coverageRate: 0 })).toBe(
      'DoD カバレッジ: 0% (0 / 5 件 — 全て未設定)',
    )
  })

  it('formats partial coverage with "未設定 N 件" tail', () => {
    expect(formatDodCoverageJa({ total: 5, withDod: 3, withoutDod: 2, coverageRate: 0.6 })).toBe(
      'DoD カバレッジ: 60% (3 / 5 件 — 未設定 2 件)',
    )
  })

  it('rounds 66.6% to 67%', () => {
    expect(formatDodCoverageJa({ total: 3, withDod: 2, withoutDod: 1, coverageRate: 2 / 3 })).toBe(
      'DoD カバレッジ: 67% (2 / 3 件 — 未設定 1 件)',
    )
  })
})

describe('dodCoverageTone', () => {
  it('returns "good" when coverageRate >= 0.7', () => {
    expect(dodCoverageTone({ total: 10, withDod: 7, withoutDod: 3, coverageRate: 0.7 })).toBe(
      'good',
    )
    expect(dodCoverageTone({ total: 10, withDod: 10, withoutDod: 0, coverageRate: 1 })).toBe('good')
  })

  it('returns "neutral" when 0.3 <= coverageRate < 0.7', () => {
    expect(dodCoverageTone({ total: 10, withDod: 5, withoutDod: 5, coverageRate: 0.5 })).toBe(
      'neutral',
    )
    expect(dodCoverageTone({ total: 10, withDod: 3, withoutDod: 7, coverageRate: 0.3 })).toBe(
      'neutral',
    )
  })

  it('returns "warn" when coverageRate < 0.3', () => {
    expect(dodCoverageTone({ total: 10, withDod: 2, withoutDod: 8, coverageRate: 0.2 })).toBe(
      'warn',
    )
    expect(dodCoverageTone({ total: 10, withDod: 0, withoutDod: 10, coverageRate: 0 })).toBe('warn')
  })

  it('returns "neutral" for empty (total=0 / coverageRate=null)', () => {
    expect(dodCoverageTone({ total: 0, withDod: 0, withoutDod: 0, coverageRate: null })).toBe(
      'neutral',
    )
  })
})

describe('computeDodCoverageByPriority', () => {
  it('returns zero stats for all priorities when items empty', () => {
    const r = computeDodCoverageByPriority([])
    for (const k of [1, 2, 3, 4] as const) {
      expect(r[k]).toEqual({ total: 0, withDod: 0, withoutDod: 0, coverageRate: null })
    }
  })

  it('groups by priority and computes per-bucket DoD coverage', () => {
    const items: DodCoverageByPriorityFields[] = [
      // P1: 2 / 2 = 100%
      { priority: 1, doneAt: null, archivedAt: null, dod: 'a' },
      { priority: 1, doneAt: null, archivedAt: null, dod: 'b' },
      // P3: 1 / 2 = 50%
      { priority: 3, doneAt: null, archivedAt: null, dod: 'c' },
      { priority: 3, doneAt: null, archivedAt: null, dod: null },
      // P4: 0 / 2 = 0%
      { priority: 4, doneAt: null, archivedAt: null, dod: null },
      { priority: 4, doneAt: null, archivedAt: null, dod: '' },
    ]
    const r = computeDodCoverageByPriority(items)
    expect(r[1]).toEqual({ total: 2, withDod: 2, withoutDod: 0, coverageRate: 1 })
    expect(r[3]).toEqual({ total: 2, withDod: 1, withoutDod: 1, coverageRate: 0.5 })
    expect(r[4]).toEqual({ total: 2, withDod: 0, withoutDod: 2, coverageRate: 0 })
  })

  it('normalizes null/undefined/out-of-range priority to p4', () => {
    const items: DodCoverageByPriorityFields[] = [
      { priority: null, doneAt: null, archivedAt: null, dod: 'a' },
      { priority: undefined, doneAt: null, archivedAt: null, dod: null },
      { priority: 99, doneAt: null, archivedAt: null, dod: 'b' },
    ]
    const r = computeDodCoverageByPriority(items)
    expect(r[4]).toEqual({ total: 3, withDod: 2, withoutDod: 1, coverageRate: 2 / 3 })
  })
})

describe('formatDodCoverageByPriorityJa', () => {
  it('formats per-priority entries (skips total=0)', () => {
    const items: DodCoverageByPriorityFields[] = [
      { priority: 1, doneAt: null, archivedAt: null, dod: 'a' },
      { priority: 1, doneAt: null, archivedAt: null, dod: 'b' },
      { priority: 3, doneAt: null, archivedAt: null, dod: 'c' },
      { priority: 3, doneAt: null, archivedAt: null, dod: null },
    ]
    const r = computeDodCoverageByPriority(items)
    expect(formatDodCoverageByPriorityJa(r)).toBe('DoD カバレッジ: P1 100% (2/2) / P3 50% (1/2)')
  })

  it('formats empty (all priorities total=0) as "未完了 0 件 (該当なし)"', () => {
    const r = computeDodCoverageByPriority([])
    expect(formatDodCoverageByPriorityJa(r)).toBe('未完了 0 件 (該当なし)')
  })
})

describe('integration: items → compute → format', () => {
  it('connects pipeline end-to-end', () => {
    const items: DodCoverageFields[] = [
      { doneAt: null, archivedAt: null, dod: '受入条件 A' },
      { doneAt: null, archivedAt: null, dod: '受入条件 B' },
      { doneAt: null, archivedAt: null, dod: null },
      { doneAt: '2026-04-25T10:00:00Z', archivedAt: null, dod: '受入条件' }, // excluded (done)
    ]
    const stats = computeDodCoverage(items)
    expect(formatDodCoverageJa(stats)).toBe('DoD カバレッジ: 67% (2 / 3 件 — 未設定 1 件)')
  })
})
