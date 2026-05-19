/**
 * iter625 refactor: safeUsd の単体テスト。
 *
 * cost-monthly-trend / cost-month-projection が依存する sanitization helper を
 * 1 source of truth に固定する。NaN / Infinity / 負値 / 0 / 正値の境界を確認。
 */
import { describe, expect, it } from 'vitest'

import { formatUsd, safeUsd } from './cost-safe-usd'

describe('safeUsd', () => {
  it('finite な正値はそのまま返す', () => {
    expect(safeUsd(1)).toBe(1)
    expect(safeUsd(0.0001)).toBe(0.0001)
    expect(safeUsd(123456.789)).toBe(123456.789)
  })

  it('0 / 負値は 0 にクランプ (集計対象外)', () => {
    expect(safeUsd(0)).toBe(0)
    expect(safeUsd(-1)).toBe(0)
    expect(safeUsd(-Infinity)).toBe(0)
  })

  it('NaN / Infinity は 0 にクランプ', () => {
    expect(safeUsd(NaN)).toBe(0)
    expect(safeUsd(Infinity)).toBe(0)
  })
})

describe('formatUsd (iter1022)', () => {
  it('0 / 負値 / NaN / Infinity → $0.00', () => {
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(-1)).toBe('$0.00')
    expect(formatUsd(NaN)).toBe('$0.00')
    expect(formatUsd(Infinity)).toBe('$0.00')
  })

  it('1 未満は 3 桁小数 ($0.123)', () => {
    expect(formatUsd(0.123)).toBe('$0.123')
    expect(formatUsd(0.001)).toBe('$0.001')
    expect(formatUsd(0.5)).toBe('$0.500')
  })

  it('1 以上は 2 桁小数 ($1.23)', () => {
    expect(formatUsd(1)).toBe('$1.00')
    expect(formatUsd(1.234)).toBe('$1.23')
    expect(formatUsd(12.5)).toBe('$12.50')
    expect(formatUsd(123.456)).toBe('$123.46')
  })
})
