import { describe, expect, it } from 'vitest'

import { formatNonZeroCounts } from './format-counts'

describe('formatNonZeroCounts', () => {
  const order = ['a', 'b', 'c'] as const
  const labels = { a: 'alpha', b: 'beta', c: 'gamma' }

  it('全 bucket > 0 で order 順に並ぶ', () => {
    expect(formatNonZeroCounts({ a: 1, b: 2, c: 3 }, order, labels)).toBe(
      'alpha 1 / beta 2 / gamma 3',
    )
  })

  it('0 件の bucket は省略 (= "label 0" は出ない)', () => {
    expect(formatNonZeroCounts({ a: 0, b: 5, c: 0 }, order, labels)).toBe('beta 5')
    expect(formatNonZeroCounts({ a: 1, b: 0, c: 1 }, order, labels)).toBe('alpha 1 / gamma 1')
  })

  it('全 0 件 → default sentinel "0 件"', () => {
    expect(formatNonZeroCounts({ a: 0, b: 0, c: 0 }, order, labels)).toBe('0 件')
  })

  it('emptySentinel を override できる', () => {
    expect(formatNonZeroCounts({ a: 0, b: 0, c: 0 }, order, labels, '該当なし')).toBe('該当なし')
  })

  it('order と異なる入力 record key 順は無視 (order が支配)', () => {
    // 入力 record の literal key 順は { c, a, b } だが出力は order の {a, b, c} 順
    expect(formatNonZeroCounts({ c: 3, a: 1, b: 2 }, order, labels)).toBe(
      'alpha 1 / beta 2 / gamma 3',
    )
  })

  it('order が空配列なら sentinel', () => {
    expect(formatNonZeroCounts({ a: 1, b: 2, c: 3 }, [], labels)).toBe('0 件')
  })

  it('負値はスキップ (`> 0` チェック、0 と同等扱い)', () => {
    expect(formatNonZeroCounts({ a: -1, b: 5, c: 0 }, order, labels)).toBe('beta 5')
  })
})
