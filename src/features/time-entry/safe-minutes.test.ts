/**
 * iter630 refactor: safeMinutes の単体テスト。
 *
 * time-entry 系 4 集計 helper が依存する sanitization helper を 1 source of truth
 * に固定する。NaN / Infinity / 負値 / 0 / 正値 / 小数の境界を確認。
 */
import { describe, expect, it } from 'vitest'

import { safeMinutes } from './safe-minutes'

describe('safeMinutes', () => {
  it('finite な正値は Math.round で整数化', () => {
    expect(safeMinutes(60)).toBe(60)
    expect(safeMinutes(60.4)).toBe(60)
    expect(safeMinutes(60.5)).toBe(61) // banker round ではなく Math.round の挙動
    expect(safeMinutes(60.6)).toBe(61)
  })

  it('0 / 負値は 0 にクランプ (集計対象外)', () => {
    expect(safeMinutes(0)).toBe(0)
    expect(safeMinutes(-1)).toBe(0)
    expect(safeMinutes(-Infinity)).toBe(0)
  })

  it('NaN / Infinity は 0 にクランプ', () => {
    expect(safeMinutes(NaN)).toBe(0)
    expect(safeMinutes(Infinity)).toBe(0)
  })
})
