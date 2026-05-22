/**
 * iter1109 basics: `utils.ts` の `cn` (Tailwind class name merger) unit test。
 *
 * shadcn / 全 component で使用される最低レベル helper。clsx (truthy 結合) +
 * tailwind-merge (後勝ち conflict resolution) の動作を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('単一文字列をそのまま返す', () => {
    expect(cn('text-sm')).toBe('text-sm')
  })

  it('複数引数を space 区切りで連結', () => {
    expect(cn('text-sm', 'font-bold')).toBe('text-sm font-bold')
  })

  it('falsy (undefined / null / false / 空文字) は無視', () => {
    expect(cn('text-sm', undefined, null, false, '', 'font-bold')).toBe('text-sm font-bold')
  })

  it('配列を flatten して結合 (clsx 互換)', () => {
    expect(cn(['text-sm', 'font-bold'])).toBe('text-sm font-bold')
    expect(cn('p-2', ['text-red-500', null], 'hover:text-red-700')).toBe(
      'p-2 text-red-500 hover:text-red-700',
    )
  })

  it('object 条件 (key=truthy で含む / key=falsy で除外)', () => {
    expect(cn({ 'text-sm': true, 'font-bold': false })).toBe('text-sm')
  })

  it('Tailwind conflict は後勝ち (tailwind-merge)', () => {
    // p-2 と p-4 は同 utility group → 後勝ち
    expect(cn('p-2', 'p-4')).toBe('p-4')
    // text-red-500 と text-blue-500 は同 color group → 後勝ち
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('異なる utility group は両方残る', () => {
    expect(cn('p-2', 'text-sm')).toBe('p-2 text-sm')
    expect(cn('hover:text-red-500', 'text-blue-500')).toBe('hover:text-red-500 text-blue-500')
  })

  it('引数 0 個で 空文字', () => {
    expect(cn()).toBe('')
  })
})
