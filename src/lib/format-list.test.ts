/**
 * iter365 refactor: format-list の単体テスト。
 */
import { describe, expect, it } from 'vitest'

import { formatTopWithOverflow } from './format-list'

describe('formatTopWithOverflow', () => {
  it('items 空 → 空文字', () => {
    expect(formatTopWithOverflow([], (n: number) => `n${n}`, 3)).toBe('')
  })

  it('items.length ≤ limit → tail 無しで join', () => {
    expect(formatTopWithOverflow([1, 2], (n) => `n${n}`, 5)).toBe('n1 / n2')
  })

  it('items.length > limit → 他 K 件 tail を append', () => {
    expect(formatTopWithOverflow([1, 2, 3, 4, 5], (n) => `n${n}`, 3)).toBe('n1 / n2 / n3 / 他 2 件')
  })

  it('limit = 0 → 全件 tail', () => {
    expect(formatTopWithOverflow([1, 2, 3], (n) => `n${n}`, 0)).toBe('他 3 件')
  })

  it('limit < 0 → 全件 tail (clamp via Math.max)', () => {
    expect(formatTopWithOverflow([1, 2, 3], (n) => `n${n}`, -5)).toBe('他 3 件')
  })

  it('separator option を反映', () => {
    expect(formatTopWithOverflow([1, 2, 3], (n) => `n${n}`, 2, { separator: ', ' })).toBe(
      'n1, n2, 他 1 件',
    )
  })

  it('overflowPrefix / overflowSuffix option を反映', () => {
    expect(
      formatTopWithOverflow([1, 2, 3], (n) => `n${n}`, 1, {
        overflowPrefix: 'and ',
        overflowSuffix: ' more',
      }),
    ).toBe('n1 / and 2 more')
  })

  it('単件で limit を超えない (= tail 無し)', () => {
    expect(formatTopWithOverflow(['x'], (s) => s, 3)).toBe('x')
  })

  it('1 件 + limit=1 (境界) で tail 無し', () => {
    expect(formatTopWithOverflow(['x'], (s) => s, 1)).toBe('x')
  })

  it('1 件超過 (= 2 件 / limit=1) で tail 出現', () => {
    expect(formatTopWithOverflow(['x', 'y'], (s) => s, 1)).toBe('x / 他 1 件')
  })

  it('totalForOverflow option で tail 計算用の総数を override', () => {
    // entries.length=2 だが、totalForOverflow=10 なら rest = 10 - 2 = 8
    expect(formatTopWithOverflow(['x', 'y'], (s) => s, 5, { totalForOverflow: 10 })).toBe(
      'x / y / 他 8 件',
    )
  })

  it('totalForOverflow option が items.length と等しい時は通常 join', () => {
    expect(formatTopWithOverflow(['x', 'y'], (s) => s, 5, { totalForOverflow: 2 })).toBe('x / y')
  })
})
