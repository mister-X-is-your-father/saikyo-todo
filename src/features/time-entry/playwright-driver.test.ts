import { describe, expect, it } from 'vitest'

import { minutesToHoursDecimal } from './playwright-driver'

describe('minutesToHoursDecimal', () => {
  it('15 分刻みの境界: 15 → 0.25', () => {
    expect(minutesToHoursDecimal(15)).toBe(0.25)
  })
  it('30 → 0.5', () => {
    expect(minutesToHoursDecimal(30)).toBe(0.5)
  })
  it('60 → 1', () => {
    expect(minutesToHoursDecimal(60)).toBe(1)
  })
  it('90 → 1.5', () => {
    expect(minutesToHoursDecimal(90)).toBe(1.5)
  })
  it('1 分でも 15 分に切り上げ (0.25h)', () => {
    expect(minutesToHoursDecimal(1)).toBe(0.25)
  })
  it('16 分は 0.5 (切り上げ)', () => {
    expect(minutesToHoursDecimal(16)).toBe(0.5)
  })
  it('0 以下は 0.25 (フロア)', () => {
    expect(minutesToHoursDecimal(0)).toBe(0.25)
    expect(minutesToHoursDecimal(-10)).toBe(0.25)
  })
})
