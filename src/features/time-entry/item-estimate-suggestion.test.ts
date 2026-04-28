import { describe, expect, it } from 'vitest'

import { suggestItemEstimate } from './item-estimate-suggestion'

describe('suggestItemEstimate', () => {
  it('description 無し → original null / summary "見積なし"', () => {
    const r = suggestItemEstimate(null, 1.3)
    expect(r.original).toBeNull()
    expect(r.calibrated).toBeNull()
    expect(r.delta).toBeNull()
    expect(r.summary).toBe('見積なし')
  })

  it('description 空文字 → 見積なし', () => {
    expect(suggestItemEstimate('', 1.3).summary).toBe('見積なし')
  })

  it('description に見積無し → 見積なし', () => {
    expect(suggestItemEstimate('普通の本文', 1.3).summary).toBe('見積なし')
  })

  it('factor null → 校正不要 / original 抽出のみ', () => {
    const r = suggestItemEstimate('見積: 30分', null)
    expect(r.original).toBe(30)
    expect(r.calibrated).toBeNull()
    expect(r.summary).toBe('校正不要 (元見積で十分)')
  })

  it('factor undefined → 校正不要', () => {
    expect(suggestItemEstimate('見積: 30分', undefined).summary).toBe('校正不要 (元見積で十分)')
  })

  it('factor 1.0 (= delta 0) → 校正不要', () => {
    const r = suggestItemEstimate('見積: 30分', 1.0)
    expect(r.original).toBe(30)
    expect(r.calibrated).toBeNull()
    expect(r.delta).toBeNull()
    expect(r.summary).toBe('校正不要 (元見積で十分)')
  })

  it('factor 1.3 + 30 分 → 39 分 (+9)', () => {
    const r = suggestItemEstimate('見積: 30分', 1.3)
    expect(r.original).toBe(30)
    expect(r.calibrated).toBe(39)
    expect(r.delta).toBe(9)
    expect(r.summary).toBe('見積: 30分 → 39分 (+9分)')
  })

  it('factor 0.5 + 60 分 → 30 分 (-30)', () => {
    const r = suggestItemEstimate('見積: 1時間', 0.5)
    expect(r.original).toBe(60)
    expect(r.calibrated).toBe(30)
    expect(r.delta).toBe(-30)
    expect(r.summary).toBe('見積: 1時間 → 30分 (-30分)')
  })

  it('factor 不正 (0 / 負 / NaN) → 校正不要 (applyBiasCalibration 側で null)', () => {
    expect(suggestItemEstimate('見積: 30分', 0).summary).toBe('校正不要 (元見積で十分)')
    expect(suggestItemEstimate('見積: 30分', -0.5).summary).toBe('校正不要 (元見積で十分)')
    expect(suggestItemEstimate('見積: 30分', Number.NaN).summary).toBe('校正不要 (元見積で十分)')
  })

  it('factor 2.0 + 1 時間 30 分 → 3 時間', () => {
    const r = suggestItemEstimate('見積: 1時間30分', 2.0)
    expect(r.original).toBe(90)
    expect(r.calibrated).toBe(180)
    expect(r.summary).toBe('見積: 1時間30分 → 3時間 (+90分)')
  })

  it('description 1 行目以外に見積文字列があっても無視', () => {
    expect(suggestItemEstimate('実装する\n見積: 30分', 1.3).summary).toBe('見積なし')
  })
})
