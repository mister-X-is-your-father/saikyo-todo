import { describe, expect, it } from 'vitest'

import type { CombinedHygieneScore } from './combined-hygiene'
import type { CombinedHygieneByPriority } from './combined-hygiene-by-priority'
import { formatHygieneFocusJa, pickWeakestHygienePriority } from './hygiene-focus'

function score(value: number | null, eligibleAxes = 3): CombinedHygieneScore {
  if (value === null) {
    return {
      score: null,
      dueDateRate: null,
      dodRate: null,
      descriptionRate: null,
      eligibleAxes: 0,
    }
  }
  // 仮の rate を score / 100 にして 1 軸貢献に集約 (test 用)
  return {
    score: value,
    dueDateRate: value / 100,
    dodRate: null,
    descriptionRate: null,
    eligibleAxes,
  }
}

function byPriority(
  p1: number | null,
  p2: number | null,
  p3: number | null,
  p4: number | null,
): CombinedHygieneByPriority {
  return { 1: score(p1), 2: score(p2), 3: score(p3), 4: score(p4) }
}

describe('pickWeakestHygienePriority', () => {
  it('returns null when all priorities are empty', () => {
    expect(pickWeakestHygienePriority(byPriority(null, null, null, null))).toBeNull()
  })

  it('picks the lowest score across 4 priorities', () => {
    const r = pickWeakestHygienePriority(byPriority(80, 60, 30, 90))
    expect(r?.priority).toBe(3)
    expect(r?.score).toBe(30)
    expect(r?.tone).toBe('neutral')
  })

  it('skips priorities with null score', () => {
    const r = pickWeakestHygienePriority(byPriority(null, 50, null, 90))
    expect(r?.priority).toBe(2)
    expect(r?.score).toBe(50)
  })

  it('breaks ties by preferring smaller priority number (P1 over P3)', () => {
    const r = pickWeakestHygienePriority(byPriority(40, 80, 40, 90))
    expect(r?.priority).toBe(1)
  })

  it('returns warn tone for score < 30', () => {
    const r = pickWeakestHygienePriority(byPriority(20, 80, null, null))
    expect(r?.tone).toBe('warn')
    expect(r?.score).toBe(20)
  })

  it('returns good tone when all scores are >= 70', () => {
    const r = pickWeakestHygienePriority(byPriority(70, 80, 90, 100))
    expect(r?.priority).toBe(1)
    expect(r?.tone).toBe('good')
  })

  it('preserves eligibleAxes from the picked priority', () => {
    const bp: CombinedHygieneByPriority = {
      1: score(40, 2),
      2: score(80, 3),
      3: score(null),
      4: score(null),
    }
    expect(pickWeakestHygienePriority(bp)?.eligibleAxes).toBe(2)
  })
})

describe('formatHygieneFocusJa', () => {
  it('formats null as "未完了 0 件 (該当なし)"', () => {
    expect(formatHygieneFocusJa(null)).toBe('未完了 0 件 (該当なし)')
  })

  it('formats warn tone with planning 漏れ suffix', () => {
    const r = pickWeakestHygienePriority(byPriority(20, null, null, null))
    expect(formatHygieneFocusJa(r)).toBe('要注意: P1 Hygiene 20 — planning 漏れ多、計画化推奨')
  })

  it('formats neutral tone with 計画化余地 suffix', () => {
    const r = pickWeakestHygienePriority(byPriority(50, null, null, null))
    expect(formatHygieneFocusJa(r)).toBe('重点: P1 Hygiene 50 — 計画化余地あり')
  })

  it('formats good tone without suffix', () => {
    const r = pickWeakestHygienePriority(byPriority(80, null, null, null))
    expect(formatHygieneFocusJa(r)).toBe('良好: P1 Hygiene 80')
  })
})
