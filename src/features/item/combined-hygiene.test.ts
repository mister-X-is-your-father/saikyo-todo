import { describe, expect, it } from 'vitest'

import {
  combinedHygieneTone,
  combineHygieneScore,
  formatCombinedHygieneJa,
} from './combined-hygiene'
import type { DescriptionCoverageStats } from './description-coverage'
import type { DodCoverageStats } from './dod-coverage'
import type { DueDateCoverageStats } from './due-date-coverage'

function dueDate(rate: number | null, total = 5): DueDateCoverageStats {
  if (rate === null) {
    return { total: 0, withDueDate: 0, withoutDueDate: 0, coverageRate: null }
  }
  const withDueDate = Math.round(rate * total)
  return {
    total,
    withDueDate,
    withoutDueDate: total - withDueDate,
    coverageRate: rate,
  }
}

function dod(rate: number | null, total = 5): DodCoverageStats {
  if (rate === null) return { total: 0, withDod: 0, withoutDod: 0, coverageRate: null }
  const withDod = Math.round(rate * total)
  return { total, withDod, withoutDod: total - withDod, coverageRate: rate }
}

function desc(rate: number | null, total = 5): DescriptionCoverageStats {
  if (rate === null) {
    return { total: 0, withDescription: 0, withoutDescription: 0, coverageRate: null }
  }
  const withDescription = Math.round(rate * total)
  return {
    total,
    withDescription,
    withoutDescription: total - withDescription,
    coverageRate: rate,
  }
}

describe('combineHygieneScore', () => {
  it('returns null score when all axes are null', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(null),
      dod: dod(null),
      description: desc(null),
    })
    expect(r.score).toBe(null)
    expect(r.eligibleAxes).toBe(0)
  })

  it('averages 3 axes when all are present', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(0.8),
      dod: dod(0.6),
      description: desc(0.7),
    })
    // (0.8 + 0.6 + 0.7) / 3 = 0.7 → 70
    expect(r.score).toBe(70)
    expect(r.eligibleAxes).toBe(3)
  })

  it('averages only non-null axes (partial)', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(0.5),
      dod: dod(null),
      description: desc(0.5),
    })
    // (0.5 + 0.5) / 2 = 0.5 → 50
    expect(r.score).toBe(50)
    expect(r.eligibleAxes).toBe(2)
  })

  it('rounds 66.6% to 67', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(2 / 3),
      dod: dod(2 / 3),
      description: desc(2 / 3),
    })
    expect(r.score).toBe(67)
  })

  it('returns 100 when all axes = 1', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(1),
      dod: dod(1),
      description: desc(1),
    })
    expect(r.score).toBe(100)
  })

  it('returns 0 when all axes = 0', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(0),
      dod: dod(0),
      description: desc(0),
    })
    expect(r.score).toBe(0)
  })

  it('preserves individual rates in output', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(0.8),
      dod: dod(null),
      description: desc(0.5),
    })
    expect(r.dueDateRate).toBeCloseTo(0.8, 5)
    expect(r.dodRate).toBe(null)
    expect(r.descriptionRate).toBe(0.5)
  })
})

describe('formatCombinedHygieneJa', () => {
  it('formats empty as "Planning Hygiene 0 件 (該当なし)"', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(null),
      dod: dod(null),
      description: desc(null),
    })
    expect(formatCombinedHygieneJa(r)).toBe('Planning Hygiene 0 件 (該当なし)')
  })

  it('formats full 3-axis summary', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(0.8),
      dod: dod(0.6),
      description: desc(0.7),
    })
    expect(formatCombinedHygieneJa(r)).toBe(
      'Planning Hygiene: 70 (期限 80% / DoD 60% / 説明文 70%)',
    )
  })

  it('formats partial summary (only non-null axes)', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(0.5),
      dod: dod(null),
      description: desc(0.5),
    })
    expect(formatCombinedHygieneJa(r)).toBe('Planning Hygiene: 50 (期限 50% / 説明文 50%)')
  })
})

describe('combinedHygieneTone', () => {
  it('returns "good" for score >= 70', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(0.8),
      dod: dod(0.7),
      description: desc(0.7),
    })
    expect(combinedHygieneTone(r)).toBe('good')
  })

  it('returns "neutral" for 30 <= score < 70', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(0.5),
      dod: dod(0.5),
      description: desc(0.5),
    })
    expect(combinedHygieneTone(r)).toBe('neutral')
  })

  it('returns "warn" for score < 30', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(0.1),
      dod: dod(0.2),
      description: desc(0.2),
    })
    expect(combinedHygieneTone(r)).toBe('warn')
  })

  it('returns "neutral" for empty', () => {
    const r = combineHygieneScore({
      dueDate: dueDate(null),
      dod: dod(null),
      description: desc(null),
    })
    expect(combinedHygieneTone(r)).toBe('neutral')
  })
})
