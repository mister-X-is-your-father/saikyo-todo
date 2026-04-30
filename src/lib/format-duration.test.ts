/**
 * iter490 format-duration の unit test (lib 集約版)。pure helper、I/O 非依存。
 *
 * 元 test (`time-entry/category-summary.test.ts` の formatMinutes 24 件) は再 import
 * path 経由で継続 PASS。本 file は新 path での確認 + 本 helper 固有 fail-soft の補強。
 */
import { describe, expect, it } from 'vitest'

import { formatMinutes } from './format-duration'

describe('formatMinutes (canonical 定義、iter490 集約)', () => {
  it('60 未満 → "Mmin"', () => {
    expect(formatMinutes(0)).toBe('0min')
    expect(formatMinutes(15)).toBe('15min')
    expect(formatMinutes(59)).toBe('59min')
  })

  it('60 倍数 → "Hh"', () => {
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(480)).toBe('8h')
  })

  it('混合 → "Hh Mmin"', () => {
    expect(formatMinutes(90)).toBe('1h 30min')
    expect(formatMinutes(135)).toBe('2h 15min')
  })

  it('小数は round (89.4 → 1h 29min, 89.6 → 1h 30min)', () => {
    expect(formatMinutes(89.4)).toBe('1h 29min')
    expect(formatMinutes(89.6)).toBe('1h 30min')
  })

  it('不正値 (負 / NaN / Infinity) → 0min fail-soft', () => {
    expect(formatMinutes(-100)).toBe('0min')
    expect(formatMinutes(NaN)).toBe('0min')
    expect(formatMinutes(Infinity)).toBe('0min')
    expect(formatMinutes(-Infinity)).toBe('0min')
  })
})
