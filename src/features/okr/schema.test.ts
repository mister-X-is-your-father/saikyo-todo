import { describe, expect, it } from 'vitest'

import { type GoalStatus, goalStatusLabelJa, goalStatusSeverity } from './schema'

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

describe('goalStatusSeverity', () => {
  it('active → ok (緑、稼働中)', () => {
    expect(goalStatusSeverity('active')).toBe('ok')
  })

  it('completed → muted (グレー、過去)', () => {
    expect(goalStatusSeverity('completed')).toBe('muted')
  })

  it('archived → muted (グレー、より目立たない)', () => {
    expect(goalStatusSeverity('archived')).toBe('muted')
  })

  it('全 GoalStatus 値で 5 段階 Severity のいずれかを返す', () => {
    const all: GoalStatus[] = ['active', 'completed', 'archived']
    const validSev = ['ok', 'info', 'warn', 'danger', 'muted']
    for (const s of all) {
      expect(validSev).toContain(goalStatusSeverity(s))
    }
  })
})
