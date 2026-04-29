import { describe, expect, it } from 'vitest'

import {
  computeDescriptionCoverage,
  computeDescriptionCoverageByPriority,
  type DescriptionCoverageByPriorityFields,
  type DescriptionCoverageFields,
  descriptionCoverageTone,
  formatDescriptionCoverageByPriorityJa,
  formatDescriptionCoverageJa,
} from './description-coverage'

describe('computeDescriptionCoverage', () => {
  it('returns empty when items is empty', () => {
    expect(computeDescriptionCoverage([])).toEqual({
      total: 0,
      withDescription: 0,
      withoutDescription: 0,
      coverageRate: null,
    })
  })

  it('excludes done / archived items', () => {
    const items: DescriptionCoverageFields[] = [
      { doneAt: '2026-04-29T10:00:00Z', archivedAt: null, description: 'a' },
      { doneAt: null, archivedAt: '2026-04-29T10:00:00Z', description: 'b' },
      { doneAt: null, archivedAt: null, description: 'c' },
    ]
    expect(computeDescriptionCoverage(items).total).toBe(1)
  })

  it('counts withDescription for non-empty after trim', () => {
    const items: DescriptionCoverageFields[] = [
      { doneAt: null, archivedAt: null, description: '詳細 A' },
      { doneAt: null, archivedAt: null, description: '  spaces ok  ' },
    ]
    const stats = computeDescriptionCoverage(items)
    expect(stats.withDescription).toBe(2)
    expect(stats.coverageRate).toBe(1)
  })

  it('counts withoutDescription for null/empty/whitespace-only', () => {
    const items: DescriptionCoverageFields[] = [
      { doneAt: null, archivedAt: null, description: null },
      { doneAt: null, archivedAt: null, description: undefined },
      { doneAt: null, archivedAt: null, description: '' },
      { doneAt: null, archivedAt: null, description: '   ' },
    ]
    expect(computeDescriptionCoverage(items)).toEqual({
      total: 4,
      withDescription: 0,
      withoutDescription: 4,
      coverageRate: 0,
    })
  })

  it('mixes coverage with correct rate', () => {
    const items: DescriptionCoverageFields[] = [
      { doneAt: null, archivedAt: null, description: 'a' },
      { doneAt: null, archivedAt: null, description: 'b' },
      { doneAt: null, archivedAt: null, description: 'c' },
      { doneAt: null, archivedAt: null, description: null },
      { doneAt: null, archivedAt: null, description: null },
    ]
    expect(computeDescriptionCoverage(items)).toEqual({
      total: 5,
      withDescription: 3,
      withoutDescription: 2,
      coverageRate: 0.6,
    })
  })
})

describe('formatDescriptionCoverageJa', () => {
  it('formats empty as "未完了 0 件 (該当なし)"', () => {
    expect(
      formatDescriptionCoverageJa({
        total: 0,
        withDescription: 0,
        withoutDescription: 0,
        coverageRate: null,
      }),
    ).toBe('未完了 0 件 (該当なし)')
  })

  it('formats 100% / 0% / partial', () => {
    expect(
      formatDescriptionCoverageJa({
        total: 5,
        withDescription: 5,
        withoutDescription: 0,
        coverageRate: 1,
      }),
    ).toBe('説明文カバレッジ: 100% (5 / 5 件)')
    expect(
      formatDescriptionCoverageJa({
        total: 5,
        withDescription: 0,
        withoutDescription: 5,
        coverageRate: 0,
      }),
    ).toBe('説明文カバレッジ: 0% (0 / 5 件 — 全て未設定)')
    expect(
      formatDescriptionCoverageJa({
        total: 5,
        withDescription: 3,
        withoutDescription: 2,
        coverageRate: 0.6,
      }),
    ).toBe('説明文カバレッジ: 60% (3 / 5 件 — 未設定 2 件)')
  })
})

describe('descriptionCoverageTone', () => {
  it('returns "good" / "neutral" / "warn" by threshold', () => {
    expect(
      descriptionCoverageTone({
        total: 10,
        withDescription: 8,
        withoutDescription: 2,
        coverageRate: 0.8,
      }),
    ).toBe('good')
    expect(
      descriptionCoverageTone({
        total: 10,
        withDescription: 5,
        withoutDescription: 5,
        coverageRate: 0.5,
      }),
    ).toBe('neutral')
    expect(
      descriptionCoverageTone({
        total: 10,
        withDescription: 1,
        withoutDescription: 9,
        coverageRate: 0.1,
      }),
    ).toBe('warn')
  })

  it('returns "neutral" for empty', () => {
    expect(
      descriptionCoverageTone({
        total: 0,
        withDescription: 0,
        withoutDescription: 0,
        coverageRate: null,
      }),
    ).toBe('neutral')
  })
})

describe('computeDescriptionCoverageByPriority + format', () => {
  it('returns zero stats for all priorities when items empty', () => {
    const r = computeDescriptionCoverageByPriority([])
    for (const k of [1, 2, 3, 4] as const) {
      expect(r[k]).toEqual({
        total: 0,
        withDescription: 0,
        withoutDescription: 0,
        coverageRate: null,
      })
    }
    expect(formatDescriptionCoverageByPriorityJa(r)).toBe('未完了 0 件 (該当なし)')
  })

  it('groups by priority and formats summary', () => {
    const items: DescriptionCoverageByPriorityFields[] = [
      { priority: 1, doneAt: null, archivedAt: null, description: 'a' },
      { priority: 1, doneAt: null, archivedAt: null, description: 'b' },
      { priority: 3, doneAt: null, archivedAt: null, description: 'c' },
      { priority: 3, doneAt: null, archivedAt: null, description: null },
    ]
    const r = computeDescriptionCoverageByPriority(items)
    expect(r[1].coverageRate).toBe(1)
    expect(r[3].coverageRate).toBe(0.5)
    expect(formatDescriptionCoverageByPriorityJa(r)).toBe(
      '説明文カバレッジ: P1 100% (2/2) / P3 50% (1/2)',
    )
  })
})
