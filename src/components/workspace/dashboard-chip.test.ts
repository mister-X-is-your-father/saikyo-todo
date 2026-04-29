import { describe, expect, it } from 'vitest'

import { chipTone3Class } from './dashboard-chip'

describe('chipTone3Class', () => {
  it('returns emerald classes for "good"', () => {
    const cls = chipTone3Class('good')
    expect(cls).toContain('emerald-50')
    expect(cls).toContain('emerald-200')
    expect(cls).toContain('emerald-700')
  })

  it('returns muted/border classes for "neutral"', () => {
    const cls = chipTone3Class('neutral')
    expect(cls).toContain('bg-muted')
    expect(cls).toContain('text-muted-foreground')
    expect(cls).toContain('border-border')
  })

  it('returns amber classes for "warn"', () => {
    const cls = chipTone3Class('warn')
    expect(cls).toContain('amber-50')
    expect(cls).toContain('amber-200')
    expect(cls).toContain('amber-700')
  })

  it('produces stable output across calls (referentially equal)', () => {
    expect(chipTone3Class('good')).toBe(chipTone3Class('good'))
    expect(chipTone3Class('neutral')).toBe(chipTone3Class('neutral'))
    expect(chipTone3Class('warn')).toBe(chipTone3Class('warn'))
  })
})
