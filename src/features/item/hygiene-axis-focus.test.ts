import { describe, expect, it } from 'vitest'

import type { CombinedHygieneScore } from './combined-hygiene'
import {
  formatHygieneAxisFocusJa,
  formatHygieneAxisStrongestJa,
  pickStrongestHygieneAxis,
  pickWeakestHygieneAxis,
} from './hygiene-axis-focus'

function score(d: number | null, dod: number | null, desc: number | null): CombinedHygieneScore {
  const rates = [d, dod, desc].filter((r): r is number => r !== null)
  return {
    score:
      rates.length > 0 ? Math.round((rates.reduce((s, v) => s + v, 0) / rates.length) * 100) : null,
    dueDateRate: d,
    dodRate: dod,
    descriptionRate: desc,
    eligibleAxes: rates.length,
  }
}

describe('pickWeakestHygieneAxis', () => {
  it('returns null when all axes are null', () => {
    expect(pickWeakestHygieneAxis(score(null, null, null))).toBeNull()
  })

  it('picks the lowest rate among 3 axes', () => {
    const r = pickWeakestHygieneAxis(score(0.8, 0.5, 0.7))
    expect(r?.axis).toBe('dod')
    expect(r?.rate).toBeCloseTo(0.5, 5)
    expect(r?.pct).toBe(50)
    expect(r?.label).toBe('DoD')
  })

  it('skips axes with null rate', () => {
    const r = pickWeakestHygieneAxis(score(null, 0.6, 0.4))
    expect(r?.axis).toBe('description')
  })

  it('breaks ties by preferring axis order (dueDate < dod < description)', () => {
    const r = pickWeakestHygieneAxis(score(0.5, 0.5, 0.5))
    expect(r?.axis).toBe('dueDate')
  })

  it('breaks ties between dod and description by preferring dod', () => {
    const r = pickWeakestHygieneAxis(score(null, 0.4, 0.4))
    expect(r?.axis).toBe('dod')
  })

  it('formats Japanese labels', () => {
    expect(pickWeakestHygieneAxis(score(0.2, null, null))?.label).toBe('期限')
    expect(pickWeakestHygieneAxis(score(null, 0.2, null))?.label).toBe('DoD')
    expect(pickWeakestHygieneAxis(score(null, null, 0.2))?.label).toBe('説明文')
  })
})

describe('formatHygieneAxisFocusJa', () => {
  it('formats null as "未完了 0 件 (該当なし)"', () => {
    expect(formatHygieneAxisFocusJa(null)).toBe('未完了 0 件 (該当なし)')
  })

  it('formats critical (rate < 0.3) with "まず…の充実から" suffix', () => {
    const r = pickWeakestHygieneAxis(score(null, null, 0.25))
    expect(formatHygieneAxisFocusJa(r)).toBe('重点軸: 説明文 25% — まず説明文の充実から')
  })

  it('formats neutral (0.3..0.7) with "改善余地あり" suffix', () => {
    const r = pickWeakestHygieneAxis(score(null, 0.5, null))
    expect(formatHygieneAxisFocusJa(r)).toBe('重点軸: DoD 50% — 改善余地あり')
  })

  it('formats good (>= 0.7) with "(全軸良好)" suffix', () => {
    const r = pickWeakestHygieneAxis(score(0.8, null, null))
    expect(formatHygieneAxisFocusJa(r)).toBe('重点軸: 期限 80% (全軸良好)')
  })

  it('boundary 30% is treated as neutral (>= 0.3 → neutral)', () => {
    const r = pickWeakestHygieneAxis(score(0.3, null, null))
    expect(formatHygieneAxisFocusJa(r)).toBe('重点軸: 期限 30% — 改善余地あり')
  })
})

describe('pickStrongestHygieneAxis (iter1017)', () => {
  it('全軸 null → null', () => {
    expect(pickStrongestHygieneAxis(score(null, null, null))).toBeNull()
  })

  it('単軸有り → その軸', () => {
    const r = pickStrongestHygieneAxis(score(0.8, null, null))
    expect(r?.axis).toBe('dueDate')
    expect(r?.pct).toBe(80)
  })

  it('最大 rate を返す', () => {
    const r = pickStrongestHygieneAxis(score(0.5, 0.9, 0.3))
    expect(r?.axis).toBe('dod')
    expect(r?.pct).toBe(90)
  })

  it('同 rate tie は HYGIENE_AXIS_ORDER 順 (dueDate > dod > description)', () => {
    const r = pickStrongestHygieneAxis(score(0.7, 0.7, 0.7))
    expect(r?.axis).toBe('dueDate')
  })
})

describe('formatHygieneAxisStrongestJa (iter1017)', () => {
  it('null → 「未完了 0 件 (該当なし)」', () => {
    expect(formatHygieneAxisStrongestJa(null)).toBe('未完了 0 件 (該当なし)')
  })

  it('>= 0.7 → 「達成度高め」', () => {
    const r = pickStrongestHygieneAxis(score(0.9, null, null))
    expect(formatHygieneAxisStrongestJa(r)).toBe('強み軸: 期限 90% (達成度高め)')
  })

  it('0.3-0.69 → hint なし', () => {
    const r = pickStrongestHygieneAxis(score(0.5, null, null))
    expect(formatHygieneAxisStrongestJa(r)).toBe('強み軸: 期限 50%')
  })

  it('< 0.3 → 「全軸要改善」', () => {
    const r = pickStrongestHygieneAxis(score(0.2, null, null))
    expect(formatHygieneAxisStrongestJa(r)).toBe('強み軸: 期限 20% (全軸要改善)')
  })
})
