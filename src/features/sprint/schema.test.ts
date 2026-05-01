import { describe, expect, it } from 'vitest'

import { type SprintStatus, sprintStatusLabelJa } from './schema'

describe('sprintStatusLabelJa', () => {
  it('全 4 status の JA label を返す', () => {
    expect(sprintStatusLabelJa('planning')).toBe('計画中')
    expect(sprintStatusLabelJa('active')).toBe('稼働中')
    expect(sprintStatusLabelJa('completed')).toBe('完了')
    expect(sprintStatusLabelJa('cancelled')).toBe('中止')
  })

  it('全 SprintStatus 値が空文字列でない (網羅性ガード)', () => {
    const all: SprintStatus[] = ['planning', 'active', 'completed', 'cancelled']
    for (const s of all) {
      expect(sprintStatusLabelJa(s).length).toBeGreaterThan(0)
    }
  })
})
