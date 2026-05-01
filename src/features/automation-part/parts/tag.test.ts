/**
 * iter612 ai-automation: tag.* part の input schema 単体テスト。
 */
import { describe, expect, it } from 'vitest'

import { tagListPart } from './tag'

describe('tagListPart input schema', () => {
  it('空 object で valid (filter なし)', () => {
    const r = tagListPart.input.safeParse({})
    expect(r.success).toBe(true)
  })

  it('part metadata: id / sideEffect=read / category=tag', () => {
    expect(tagListPart.id).toBe('tag.list')
    expect(tagListPart.sideEffect).toBe('read')
    expect(tagListPart.category).toBe('tag')
  })
})
