/**
 * iter674 chore: cn helper (clsx + tailwind-merge) の単体テスト。test 不在解消。
 *
 * `cn(...inputs)` は shadcn pattern の標準 className 合成 helper。clsx で truthy
 * を join + tailwind-merge で同 group の class 競合を解決 (例: 'p-4 p-2' → 'p-2')。
 * 本 test は wrapper の挙動 (= clsx + twMerge の組合せ) を最低限保証する。
 */
import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('複数 string を空白区切りで join', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('falsy 値 (undefined / null / false / "") は drop', () => {
    expect(cn('a', undefined, 'b', null, 'c', false, 'd', '')).toBe('a b c d')
  })

  it('object 形式 (clsx の) で truthy 条件のみ採用', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active')
  })

  it('array をフラット化', () => {
    expect(cn(['a', 'b'], ['c', 'd'])).toBe('a b c d')
  })

  it('tailwind-merge で同 group 競合を解決 (後勝ち)', () => {
    // p-4 と p-2 は同 group の padding utility、後勝ちで p-2 のみ残る
    expect(cn('p-4', 'p-2')).toBe('p-2')
    // text-sm と text-lg は同 group、後勝ち
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('異なる group は併記', () => {
    expect(cn('text-sm', 'text-red-500')).toBe('text-sm text-red-500')
  })

  it('引数なし → 空文字', () => {
    expect(cn()).toBe('')
  })
})
