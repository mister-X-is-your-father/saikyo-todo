import { describe, expect, it } from 'vitest'

import { isItemActive } from './active'
import type { Item } from './schema'

function mk(over: Partial<Item>): Item {
  // 最小限の Item shape (test only、未使用 field は undefined のまま)
  return {
    doneAt: null,
    archivedAt: null,
    deletedAt: null,
    ...over,
  } as Item
}

describe('isItemActive (iter1042 canonical)', () => {
  it('doneAt / archivedAt / deletedAt が全て null → true (active)', () => {
    expect(isItemActive(mk({}))).toBe(true)
  })

  it('doneAt あり → false', () => {
    expect(isItemActive(mk({ doneAt: new Date() }))).toBe(false)
  })

  it('archivedAt あり → false', () => {
    expect(isItemActive(mk({ archivedAt: new Date() }))).toBe(false)
  })

  it('deletedAt あり → false', () => {
    expect(isItemActive(mk({ deletedAt: new Date() }))).toBe(false)
  })

  it('複数の terminal field 同時 → false', () => {
    expect(isItemActive(mk({ doneAt: new Date(), archivedAt: new Date() }))).toBe(false)
  })
})
