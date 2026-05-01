import { describe, expect, it } from 'vitest'

import { type Period, periodLabelJa } from './schema'

describe('periodLabelJa', () => {
  it('全 3 period の JA label を返す', () => {
    expect(periodLabelJa('day')).toBe('日次')
    expect(periodLabelJa('week')).toBe('週次')
    expect(periodLabelJa('month')).toBe('月次')
  })

  it('全 Period 値が空文字列でない (網羅性ガード)', () => {
    const all: Period[] = ['day', 'week', 'month']
    for (const p of all) {
      expect(periodLabelJa(p).length).toBeGreaterThan(0)
    }
  })
})
