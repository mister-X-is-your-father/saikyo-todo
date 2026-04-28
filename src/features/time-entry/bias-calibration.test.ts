import { describe, expect, it } from 'vitest'

import {
  applyBiasCalibration,
  formatCalibratedEstimateJa,
  suggestCalibratedEstimates,
} from './bias-calibration'

describe('applyBiasCalibration', () => {
  it('factor=null は null', () => {
    expect(applyBiasCalibration(30, null)).toBeNull()
  })

  it('factor<=0 は null (異常値ガード)', () => {
    expect(applyBiasCalibration(30, 0)).toBeNull()
    expect(applyBiasCalibration(30, -1)).toBeNull()
  })

  it('estimate<=0 は null (見積無し)', () => {
    expect(applyBiasCalibration(0, 1.3)).toBeNull()
    expect(applyBiasCalibration(-5, 1.3)).toBeNull()
  })

  it('factor=1.3, estimate=30 → 39 分 (+9)', () => {
    expect(applyBiasCalibration(30, 1.3)).toEqual({
      inputMinutes: 30,
      calibratedMinutes: 39,
      deltaMinutes: 9,
    })
  })

  it('factor=0.5 で短縮: 60 → 30 (-30)', () => {
    expect(applyBiasCalibration(60, 0.5)).toEqual({
      inputMinutes: 60,
      calibratedMinutes: 30,
      deltaMinutes: -30,
    })
  })

  it('整数丸め (29.7 → 30)', () => {
    // 30 * 0.99 = 29.7 → round → 30
    expect(applyBiasCalibration(30, 0.99)?.calibratedMinutes).toBe(30)
    // 30 * 1.05 = 31.5 → round → 32 (banker は使わない、Math.round)
    expect(applyBiasCalibration(30, 1.05)?.calibratedMinutes).toBe(32)
  })

  it('1 分未満は最低 1 分に clamp', () => {
    // 0.1 * 5 = 0.5 → round → 1 (Math.round(0.5)=1) — clamp 不要だがガード
    // 確実に 1 未満になる例: 1 * 0.1 = 0.1 → round 0 → clamp 1
    expect(applyBiasCalibration(1, 0.1)?.calibratedMinutes).toBe(1)
  })

  it('Number.isFinite ガード: NaN / Infinity は null', () => {
    expect(applyBiasCalibration(NaN, 1.3)).toBeNull()
    expect(applyBiasCalibration(Infinity, 1.3)).toBeNull()
  })
})

describe('suggestCalibratedEstimates', () => {
  it('factor=null は空配列', () => {
    expect(suggestCalibratedEstimates(null)).toEqual([])
  })

  it('factor=1.3 → 5 typical estimate 全て delta != 0 (15→20, 30→39, 60→78, 120→156, 240→312)', () => {
    const out = suggestCalibratedEstimates(1.3)
    expect(out).toHaveLength(5)
    expect(out[0]).toEqual({ inputMinutes: 15, calibratedMinutes: 20, deltaMinutes: 5 })
    expect(out[1]).toEqual({ inputMinutes: 30, calibratedMinutes: 39, deltaMinutes: 9 })
    expect(out[4]).toEqual({ inputMinutes: 240, calibratedMinutes: 312, deltaMinutes: 72 })
  })

  it('factor=1.0 (delta 0) は全行スキップ → 空配列', () => {
    expect(suggestCalibratedEstimates(1.0)).toEqual([])
  })

  it('factor=0.5 → 全件 delta < 0 で残る', () => {
    const out = suggestCalibratedEstimates(0.5)
    expect(out).toHaveLength(5)
    expect(out.every((c) => c.deltaMinutes < 0)).toBe(true)
  })

  it('factor=1.05 で 15→16, 30→32 (delta=1, 2)、丸め後同じものはスキップ', () => {
    // 15*1.05=15.75 → 16 (delta=1)
    // 30*1.05=31.5 → 32 (delta=2)
    // 60*1.05=63 (delta=3)
    // 120*1.05=126 (delta=6)
    // 240*1.05=252 (delta=12)
    const out = suggestCalibratedEstimates(1.05)
    expect(out).toHaveLength(5) // 全部 delta != 0
    expect(out[0]).toEqual({ inputMinutes: 15, calibratedMinutes: 16, deltaMinutes: 1 })
  })
})

describe('formatCalibratedEstimateJa', () => {
  it('+ 表記', () => {
    expect(
      formatCalibratedEstimateJa({ inputMinutes: 30, calibratedMinutes: 39, deltaMinutes: 9 }),
    ).toBe('30分 → 39分 (+9分)')
  })

  it('- 表記 (正符号付かず)', () => {
    expect(
      formatCalibratedEstimateJa({ inputMinutes: 60, calibratedMinutes: 30, deltaMinutes: -30 }),
    ).toBe('60分 → 30分 (-30分)')
  })

  it('±0 表記 (使用者は除外推奨だが API として安全)', () => {
    expect(
      formatCalibratedEstimateJa({ inputMinutes: 30, calibratedMinutes: 30, deltaMinutes: 0 }),
    ).toBe('30分 → 30分 (±0分)')
  })
})
