import { describe, expect, it } from 'vitest'

import { round1, round2 } from './round-decimal'

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

describe('round2 (iter965)', () => {
  it('正の値: 1.4545 → 1.45 (= 2 桁丸め)', () => {
    expect(round2(1.4545)).toBe(1.45)
  })

  it('整数 → 同値', () => {
    expect(round2(0)).toBe(0)
    expect(round2(3)).toBe(3)
  })

  it('小数点以下 ぴったり 2 桁 → そのまま', () => {
    expect(round2(0.5)).toBe(0.5)
    expect(round2(12.34)).toBe(12.34)
  })

  it('境界 0.005 → 0.01 (Math.round(0.5)=1 / 10/2)', () => {
    expect(round2(0.005)).toBe(0.01)
  })

  it('浮動小数の揺らぎ吸収: 1.1 + 2.2 → 3.3 (= 3.3000000000000003 → 3.3)', () => {
    expect(round2(1.1 + 2.2)).toBe(3.3)
  })
})

describe('round1 / round2 edge cases (iter966 — coverage 補強)', () => {
  it('round1 / round2: 0 → 0 (sign preserve)', () => {
    expect(Object.is(round1(0), 0)).toBe(true)
    expect(Object.is(round2(0), 0)).toBe(true)
  })

  it('round1 / round2: 非常に大きい値 → そのまま (overflow しない)', () => {
    expect(round1(1e10)).toBe(1e10)
    expect(round2(1e10)).toBe(1e10)
  })

  it('round1 / round2: NaN → NaN (= Math.round(NaN) は NaN)', () => {
    expect(Number.isNaN(round1(NaN))).toBe(true)
    expect(Number.isNaN(round2(NaN))).toBe(true)
  })

  it('round1 / round2: Infinity → Infinity', () => {
    expect(round1(Infinity)).toBe(Infinity)
    expect(round2(-Infinity)).toBe(-Infinity)
  })

  it('round1 と round2: round2(x) は同 x の round1 より同等以上の精度 (= round2 切り上げ → round1 が必要なら追加丸めて等しくなる)', () => {
    // 1.456 → round2 = 1.46 → round1 = 1.5
    expect(round1(round2(1.456))).toBe(round1(1.456))
    // 1.44 → round2 = 1.44 → round1 = 1.4
    expect(round1(round2(1.44))).toBe(round1(1.44))
  })
})
