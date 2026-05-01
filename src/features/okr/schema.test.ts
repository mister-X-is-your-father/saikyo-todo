import { describe, expect, it } from 'vitest'

import { type GoalStatus, goalStatusLabelJa } from './schema'

describe('goalStatusLabelJa', () => {
  it('全 3 status の JA label を返す', () => {
    expect(goalStatusLabelJa('active')).toBe('稼働中')
    expect(goalStatusLabelJa('completed')).toBe('完了')
    expect(goalStatusLabelJa('archived')).toBe('アーカイブ')
  })

  it('全 GoalStatus 値が空文字列でない (網羅性ガード)', () => {
    const all: GoalStatus[] = ['active', 'completed', 'archived']
    for (const s of all) {
      expect(goalStatusLabelJa(s).length).toBeGreaterThan(0)
    }
  })
})
