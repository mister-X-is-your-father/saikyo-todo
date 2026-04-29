/**
 * iter405 refactor: filterMustOnly pure helper の単体テスト。
 */
import { describe, expect, it } from 'vitest'

import { filterMustOnly, type MustFilterFields } from './must-filter'

interface TestItem extends MustFilterFields {
  id: string
}

describe('filterMustOnly', () => {
  it('items 空 → 空配列', () => {
    expect(filterMustOnly([])).toEqual([])
  })

  it('isMust=true のみ通す', () => {
    const items: TestItem[] = [
      { id: 'A', isMust: true },
      { id: 'B', isMust: false },
      { id: 'C', isMust: true },
    ]
    expect(filterMustOnly(items).map((i) => i.id)).toEqual(['A', 'C'])
  })

  it('isMust = null / undefined は除外', () => {
    const items: TestItem[] = [
      { id: 'A', isMust: true },
      { id: 'B', isMust: null },
      { id: 'C', isMust: undefined },
      { id: 'D', isMust: true },
    ]
    expect(filterMustOnly(items).map((i) => i.id)).toEqual(['A', 'D'])
  })

  it('元配列順 stable', () => {
    const items: TestItem[] = [
      { id: 'A', isMust: true },
      { id: 'B', isMust: false },
      { id: 'C', isMust: true },
      { id: 'D', isMust: true },
    ]
    expect(filterMustOnly(items).map((i) => i.id)).toEqual(['A', 'C', 'D'])
  })

  it('null/undefined item 自体も除外 (defensive)', () => {
    const items = [
      { id: 'A', isMust: true },
      null as unknown as TestItem,
      undefined as unknown as TestItem,
      { id: 'B', isMust: true },
    ]
    expect(filterMustOnly(items).map((i) => i.id)).toEqual(['A', 'B'])
  })
})
