import { describe, expect, it } from 'vitest'

import { chipTone3Class } from './dashboard-chip'

describe('chipTone3Class', () => {
  it('returns emerald classes for "good"', () => {
    const cls = chipTone3Class('good')
    expect(cls).toContain('emerald-50')
    expect(cls).toContain('emerald-200')
    expect(cls).toContain('emerald-700')
  })

  it('returns muted/border classes for "neutral" (iter1345 で WCAG 1.4.3 対応 text-foreground 化)', () => {
    const cls = chipTone3Class('neutral')
    expect(cls).toContain('bg-muted')
    // iter1345 (commit 10987ee): muted-on-muted 4.34:1 が text-xs (12px) で AA 未達のため
    // text-muted-foreground → text-foreground に統一。bg-muted + border 維持で「中立」 visual
    // は不変、ただし可読 contrast 確保。
    expect(cls).toContain('text-foreground')
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
