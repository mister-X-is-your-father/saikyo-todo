/**
 * iter619 ai-automation: goal.* part の input schema 単体テスト。
 */
import { describe, expect, it } from 'vitest'

import { goalListPart } from './goal'

describe('goalListPart input schema', () => {
  it('空 object で valid (filter なし)', () => {
    const r = goalListPart.input.safeParse({})
    expect(r.success).toBe(true)
  })

  it('part metadata: id / sideEffect=read / category=goal', () => {
    expect(goalListPart.id).toBe('goal.list')
    expect(goalListPart.sideEffect).toBe('read')
    expect(goalListPart.category).toBe('goal')
  })
})
