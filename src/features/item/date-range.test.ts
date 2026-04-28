import { describe, expect, it } from 'vitest'

import { isInvalidDateRange } from './date-range'

describe('isInvalidDateRange', () => {
  it('両方 null / undefined → 判定できないので false', () => {
    expect(isInvalidDateRange(null, null)).toBe(false)
    expect(isInvalidDateRange(undefined, undefined)).toBe(false)
    expect(isInvalidDateRange(null, undefined)).toBe(false)
  })

  it('片方が空文字 → false (まだ未確定)', () => {
    expect(isInvalidDateRange('', '2026-04-30')).toBe(false)
    expect(isInvalidDateRange('2026-04-27', '')).toBe(false)
    expect(isInvalidDateRange('', '')).toBe(false)
  })

  it('片方が null → false', () => {
    expect(isInvalidDateRange(null, '2026-04-30')).toBe(false)
    expect(isInvalidDateRange('2026-04-27', null)).toBe(false)
  })

  it('start < end → false (正しい順)', () => {
    expect(isInvalidDateRange('2026-04-27', '2026-04-30')).toBe(false)
  })

  it('start === end → false (単日タスク / 単日 Sprint を許容)', () => {
    expect(isInvalidDateRange('2026-04-27', '2026-04-27')).toBe(false)
  })

  it('start > end → true (不正)', () => {
    expect(isInvalidDateRange('2026-04-30', '2026-04-27')).toBe(true)
  })

  it('月跨ぎでも辞書順 == 時系列順なので正しく判定', () => {
    expect(isInvalidDateRange('2026-04-30', '2026-05-01')).toBe(false)
    expect(isInvalidDateRange('2026-05-01', '2026-04-30')).toBe(true)
  })

  it('年跨ぎ', () => {
    expect(isInvalidDateRange('2026-12-31', '2027-01-01')).toBe(false)
    expect(isInvalidDateRange('2027-01-01', '2026-12-31')).toBe(true)
  })
})
