/**
 * iter627 ai-automation: item_dependency.* part の input schema 単体テスト。
 */
import { describe, expect, it } from 'vitest'

import { itemDependencyListForItemPart } from './item-dependency'
import { VALID_FIXTURE_ID } from './test-fixtures'

describe('itemDependencyListForItemPart input schema', () => {
  it('itemId (uuid) で valid', () => {
    const r = itemDependencyListForItemPart.input.safeParse({ itemId: VALID_FIXTURE_ID })
    expect(r.success).toBe(true)
  })

  it('itemId 不正 (空 string) で invalid', () => {
    const r = itemDependencyListForItemPart.input.safeParse({ itemId: '' })
    expect(r.success).toBe(false)
  })

  it('itemId 不正 (uuid でない) で invalid', () => {
    const r = itemDependencyListForItemPart.input.safeParse({ itemId: 'not-a-uuid' })
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect=read / category=item', () => {
    expect(itemDependencyListForItemPart.id).toBe('item_dependency.list_for_item')
    expect(itemDependencyListForItemPart.sideEffect).toBe('read')
    expect(itemDependencyListForItemPart.category).toBe('item')
  })
})
