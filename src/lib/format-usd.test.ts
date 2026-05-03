import { describe, expect, it } from 'vitest'

import { formatUsd } from './format-usd'

describe('formatUsd', () => {
  it('1 USD 未満 → 3 桁', () => {
    expect(formatUsd(0.123)).toBe('$0.123')
    expect(formatUsd(0.5)).toBe('$0.500')
    expect(formatUsd(0.999)).toBe('$0.999')
  })

  it('1 USD 以上 → 2 桁', () => {
    expect(formatUsd(1)).toBe('$1.00')
    expect(formatUsd(1.234)).toBe('$1.23')
    expect(formatUsd(99.999)).toBe('$100.00')
    expect(formatUsd(1234.5)).toBe('$1234.50')
  })

  it('0 は $0.000 (3 桁優先)', () => {
    expect(formatUsd(0)).toBe('$0.000')
  })

  it('負数 → 0 として扱う', () => {
    expect(formatUsd(-1)).toBe('$0.000')
    expect(formatUsd(-100)).toBe('$0.000')
  })

  it('NaN / Infinity → 0 として扱う', () => {
    expect(formatUsd(Number.NaN)).toBe('$0.000')
    expect(formatUsd(Number.POSITIVE_INFINITY)).toBe('$0.000')
    expect(formatUsd(Number.NEGATIVE_INFINITY)).toBe('$0.000')
  })

  it('境界 1.0 ちょうどは 2 桁 (>= 1 で 2 桁)', () => {
    expect(formatUsd(1.0)).toBe('$1.00')
  })

  it('丸め: toFixed(2) は banker 丸めではなく round half away from zero', () => {
    // toFixed の挙動 (環境依存無し): 1.005 は浮動小数表現の関係で 1.00 になる
    // 環境特性として知っておくべき
    expect(formatUsd(1.244)).toBe('$1.24')
    expect(formatUsd(1.246)).toBe('$1.25')
  })
})
