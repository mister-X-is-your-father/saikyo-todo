import { describe, expect, it } from 'vitest'

import { type SprintStatus, sprintStatusLabelJa, sprintStatusSeverity } from './schema'

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

describe('sprintStatusSeverity', () => {
  it('planning → info (青、計画中)', () => {
    expect(sprintStatusSeverity('planning')).toBe('info')
  })

  it('active → ok (緑、稼働中 = healthy in-progress)', () => {
    expect(sprintStatusSeverity('active')).toBe('ok')
  })

  it('completed → muted (グレー、過去)', () => {
    expect(sprintStatusSeverity('completed')).toBe('muted')
  })

  it('cancelled → danger (赤、注意喚起)', () => {
    expect(sprintStatusSeverity('cancelled')).toBe('danger')
  })

  it('全 SprintStatus 値で 5 段階 Severity のいずれかを返す', () => {
    const all: SprintStatus[] = ['planning', 'active', 'completed', 'cancelled']
    const validSev = ['ok', 'info', 'warn', 'danger', 'muted']
    for (const s of all) {
      expect(validSev).toContain(sprintStatusSeverity(s))
    }
  })
})
