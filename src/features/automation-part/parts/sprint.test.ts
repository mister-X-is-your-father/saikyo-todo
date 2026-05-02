/**
 * iter624 ai-automation: sprint.* part の input schema 単体テスト。
 */
import { describe, expect, it } from 'vitest'

import { sprintListPart } from './sprint'

describe('sprintListPart input schema', () => {
  it('空 object で valid (filter なし)', () => {
    const r = sprintListPart.input.safeParse({})
    expect(r.success).toBe(true)
  })

  it('part metadata: id / sideEffect=read / category=goal', () => {
    expect(sprintListPart.id).toBe('sprint.list')
    expect(sprintListPart.sideEffect).toBe('read')
    // sprint は OKR 系 (Goal と同じ workspace 経営 entity) なので category=goal で扱う
    expect(sprintListPart.category).toBe('goal')
  })
})
