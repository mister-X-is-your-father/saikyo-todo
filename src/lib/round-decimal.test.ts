import { describe, expect, it } from 'vitest'

import { round1 } from './round-decimal'

describe('round1', () => {
  it('正の値: 1.4545 → 1.5 (5/10 切り上げ)', () => {
    expect(round1(1.4545)).toBe(1.5)
  })

  it('正の値: 2.04 → 2 (0.04 は 0 へ)', () => {
    expect(round1(2.04)).toBe(2)
  })

  it('整数 → 同値', () => {
    expect(round1(0)).toBe(0)
    expect(round1(3)).toBe(3)
    expect(round1(-7)).toBe(-7)
  })

  it('境界 0.05 / 0.15 → 0.1 / 0.2 (Math.round の挙動に従う)', () => {
    // Math.round(0.5) = 1 → round1(0.05) = round(0.5)/10 = 0.1
    expect(round1(0.05)).toBe(0.1)
    // Math.round(1.5) = 2 → 0.2
    expect(round1(0.15)).toBe(0.2)
  })

  it('負の値: Math.round は banker rounding ではない (= -0.5 → 0)', () => {
    // Math.round(-1.25 * 10) = Math.round(-12.5) = -12 (towards +∞ for .5)
    expect(round1(-1.25)).toBe(-1.2)
    expect(round1(-1.26)).toBe(-1.3)
  })

  it('浮動小数の揺らぎ吸収: 0.1 + 0.2 → 0.3 (= 0.30000000000000004 → 0.3)', () => {
    expect(round1(0.1 + 0.2)).toBe(0.3)
  })
})
