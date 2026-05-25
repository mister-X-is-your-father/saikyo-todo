import { describe, expect, it } from 'vitest'

import {
  allowedNextPdcaPhases,
  formatPdcaCyclePhaseStatusJa,
  isAllowedPdcaPhaseTransition,
  isPdcaPhaseStuck,
  pdcaCyclePhaseLabelJa,
  pdcaPhaseDayLimit,
  pdcaPhaseSeverity,
  pdcaPhaseSeverityLabelJa,
  type PdcaPhaseTimestamps,
  phaseElapsedDays,
} from './phase-helpers'

const NOW = new Date('2026-04-30T10:00:00Z')

function days(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)
}

describe('pdcaCyclePhaseLabelJa', () => {
  it('5 status を Japanese label に', () => {
    expect(pdcaCyclePhaseLabelJa('plan')).toBe('仮説立案 (Plan)')
    expect(pdcaCyclePhaseLabelJa('do')).toBe('実行 (Do)')
    expect(pdcaCyclePhaseLabelJa('check')).toBe('検証 (Check)')
    expect(pdcaCyclePhaseLabelJa('act')).toBe('改善決定 (Act)')
    expect(pdcaCyclePhaseLabelJa('closed')).toBe('完了')
  })
})

describe('phaseElapsedDays', () => {
  it('plan: planStartedAt から計算', () => {
    const c: PdcaPhaseTimestamps = { status: 'plan', planStartedAt: days(2) }
    expect(phaseElapsedDays(c, NOW)).toBe(2)
  })

  it('do: doStartedAt から計算', () => {
    const c: PdcaPhaseTimestamps = { status: 'do', doStartedAt: days(7) }
    expect(phaseElapsedDays(c, NOW)).toBe(7)
  })

  it('check: checkStartedAt から計算', () => {
    const c: PdcaPhaseTimestamps = { status: 'check', checkStartedAt: days(1) }
    expect(phaseElapsedDays(c, NOW)).toBe(1)
  })

  it('act: updatedAt フォールバック', () => {
    const c: PdcaPhaseTimestamps = { status: 'act', updatedAt: days(3) }
    expect(phaseElapsedDays(c, NOW)).toBe(3)
  })

  it('closed: null', () => {
    expect(phaseElapsedDays({ status: 'closed' }, NOW)).toBeNull()
  })

  it('timestamp 不明 → null', () => {
    expect(phaseElapsedDays({ status: 'do' }, NOW)).toBeNull()
  })

  it('未来 timestamp は 0 へ clamp', () => {
    const c: PdcaPhaseTimestamps = { status: 'do', doStartedAt: new Date(NOW.getTime() + 1000) }
    expect(phaseElapsedDays(c, NOW)).toBe(0)
  })
})

describe('pdcaPhaseSeverity', () => {
  it('closed → "closed"', () => {
    expect(pdcaPhaseSeverity({ status: 'closed' }, NOW)).toBe('closed')
  })

  it('elapsed=0 → "fresh"', () => {
    const c: PdcaPhaseTimestamps = { status: 'plan', planStartedAt: NOW }
    expect(pdcaPhaseSeverity(c, NOW)).toBe('fresh')
  })

  it('plan: 上限 3 日、3 日以内は "on_track"', () => {
    expect(pdcaPhaseSeverity({ status: 'plan', planStartedAt: days(2) }, NOW)).toBe('on_track')
    expect(pdcaPhaseSeverity({ status: 'plan', planStartedAt: days(3) }, NOW)).toBe('on_track')
  })

  it('plan: 4-6 日は "stale" (上限 × 2 以下)', () => {
    expect(pdcaPhaseSeverity({ status: 'plan', planStartedAt: days(4) }, NOW)).toBe('stale')
    expect(pdcaPhaseSeverity({ status: 'plan', planStartedAt: days(6) }, NOW)).toBe('stale')
  })

  it('plan: 7+ 日は "overdue"', () => {
    expect(pdcaPhaseSeverity({ status: 'plan', planStartedAt: days(7) }, NOW)).toBe('overdue')
    expect(pdcaPhaseSeverity({ status: 'plan', planStartedAt: days(20) }, NOW)).toBe('overdue')
  })

  it('do: 上限 14 日 (長め)', () => {
    expect(pdcaPhaseSeverity({ status: 'do', doStartedAt: days(10) }, NOW)).toBe('on_track')
    expect(pdcaPhaseSeverity({ status: 'do', doStartedAt: days(20) }, NOW)).toBe('stale')
    expect(pdcaPhaseSeverity({ status: 'do', doStartedAt: days(30) }, NOW)).toBe('overdue')
  })

  it('timestamp 不明 → "on_track" (neutral fallback)', () => {
    expect(pdcaPhaseSeverity({ status: 'plan' }, NOW)).toBe('on_track')
  })
})

describe('pdcaPhaseSeverityLabelJa', () => {
  it('5 severity を Japanese label に', () => {
    expect(pdcaPhaseSeverityLabelJa('closed')).toBe('完了')
    expect(pdcaPhaseSeverityLabelJa('fresh')).toBe('開始直後')
    expect(pdcaPhaseSeverityLabelJa('on_track')).toBe('順調')
    expect(pdcaPhaseSeverityLabelJa('stale')).toBe('停滞気味')
    expect(pdcaPhaseSeverityLabelJa('overdue')).toBe('進行を促す')
  })
})

describe('formatPdcaCyclePhaseStatusJa', () => {
  it('closed は phase label のみ', () => {
    expect(formatPdcaCyclePhaseStatusJa({ status: 'closed' }, NOW)).toBe('完了')
  })

  it('on_track + 経過日数 tail', () => {
    const c: PdcaPhaseTimestamps = { status: 'do', doStartedAt: days(5) }
    expect(formatPdcaCyclePhaseStatusJa(c, NOW)).toBe('実行 (Do) — 順調 (5 日)')
  })

  it('overdue + tail', () => {
    const c: PdcaPhaseTimestamps = { status: 'plan', planStartedAt: days(10) }
    expect(formatPdcaCyclePhaseStatusJa(c, NOW)).toBe('仮説立案 (Plan) — 進行を促す (10 日)')
  })

  it('timestamp 未記録は tail に明示', () => {
    expect(formatPdcaCyclePhaseStatusJa({ status: 'plan' }, NOW)).toBe(
      '仮説立案 (Plan) — 順調 (timestamp 未記録)',
    )
  })
})

describe('pdcaPhaseDayLimit (iter1011)', () => {
  it('closed → null (= Infinity を露出させず null sentinel)', () => {
    expect(pdcaPhaseDayLimit('closed')).toBeNull()
  })

  it('各 phase の整数日数', () => {
    expect(pdcaPhaseDayLimit('plan')).toBe(3)
    expect(pdcaPhaseDayLimit('do')).toBe(14)
    expect(pdcaPhaseDayLimit('check')).toBe(3)
    expect(pdcaPhaseDayLimit('act')).toBe(2)
  })
})

describe('isPdcaPhaseStuck (iter1011)', () => {
  it('on_track (経過 0-limit) → false', () => {
    expect(isPdcaPhaseStuck({ status: 'do', doStartedAt: days(5) }, NOW)).toBe(false)
  })

  it('stale (経過 limit < x <= limit*2) → true', () => {
    expect(isPdcaPhaseStuck({ status: 'do', doStartedAt: days(20) }, NOW)).toBe(true)
  })

  it('overdue (経過 > limit*2) → true', () => {
    expect(isPdcaPhaseStuck({ status: 'plan', planStartedAt: days(10) }, NOW)).toBe(true)
  })

  it('fresh (経過 0 日) → false', () => {
    expect(isPdcaPhaseStuck({ status: 'do', doStartedAt: NOW }, NOW)).toBe(false)
  })

  it('closed → false', () => {
    expect(isPdcaPhaseStuck({ status: 'closed' }, NOW)).toBe(false)
  })

  it('timestamp 未記録 → false (= on_track fallback)', () => {
    expect(isPdcaPhaseStuck({ status: 'plan' }, NOW)).toBe(false)
  })
})

describe('allowedNextPdcaPhases / isAllowedPdcaPhaseTransition (iter1341)', () => {
  it('各 phase の許可遷移先', () => {
    expect(allowedNextPdcaPhases('plan')).toEqual(['do', 'check'])
    expect(allowedNextPdcaPhases('do')).toEqual(['check'])
    expect(allowedNextPdcaPhases('check')).toEqual(['act'])
    expect(allowedNextPdcaPhases('act')).toEqual(['closed'])
    expect(allowedNextPdcaPhases('closed')).toEqual([])
  })

  it('plan は do skip で check に直行できる', () => {
    expect(isAllowedPdcaPhaseTransition('plan', 'check')).toBe(true)
    expect(isAllowedPdcaPhaseTransition('plan', 'do')).toBe(true)
  })

  it('逆行 / skip 過ぎ は禁止', () => {
    expect(isAllowedPdcaPhaseTransition('do', 'plan')).toBe(false)
    expect(isAllowedPdcaPhaseTransition('check', 'do')).toBe(false)
    expect(isAllowedPdcaPhaseTransition('plan', 'act')).toBe(false)
    expect(isAllowedPdcaPhaseTransition('closed', 'plan')).toBe(false)
    expect(isAllowedPdcaPhaseTransition('act', 'act')).toBe(false)
  })

  it('allowedNextPdcaPhases は呼び元が破壊できない (新配列を返す)', () => {
    const a = allowedNextPdcaPhases('plan')
    a.push('act')
    expect(allowedNextPdcaPhases('plan')).toEqual(['do', 'check'])
  })
})
