import { describe, expect, it } from 'vitest'

import { isoDaysFromNow, todayISO } from './iso'

describe('todayISO', () => {
  it('Date を YYYY-MM-DD ローカル化', () => {
    const fixed = new Date(2026, 3, 27, 9, 0, 0)
    expect(todayISO(fixed)).toBe('2026-04-27')
  })

  it('1 月 / 5 日も 0 padding', () => {
    expect(todayISO(new Date(2026, 0, 5, 0, 0, 0))).toBe('2026-01-05')
  })

  it('省略時は現在時刻 — 形式のみ検証', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isoDaysFromNow', () => {
  it('+0 / +7 / -1', () => {
    const fixed = new Date(2026, 3, 27, 9, 0, 0)
    expect(isoDaysFromNow(0, fixed)).toBe('2026-04-27')
    expect(isoDaysFromNow(7, fixed)).toBe('2026-05-04')
    expect(isoDaysFromNow(-1, fixed)).toBe('2026-04-26')
  })

  it('月跨ぎ', () => {
    const fixed = new Date(2026, 3, 30, 9, 0, 0)
    expect(isoDaysFromNow(2, fixed)).toBe('2026-05-02')
  })

  it('年跨ぎ', () => {
    const fixed = new Date(2026, 11, 30, 9, 0, 0)
    expect(isoDaysFromNow(3, fixed)).toBe('2027-01-02')
  })

  it('省略時は現在時刻 — 形式のみ検証', () => {
    expect(isoDaysFromNow(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
