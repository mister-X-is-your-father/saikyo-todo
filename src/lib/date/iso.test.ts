import { describe, expect, it } from 'vitest'

import {
  formatLocalISO,
  isoDaysFromNow,
  parseDateOrNull,
  shiftIsoDate,
  todayISO,
  toLocalMidnight,
} from './iso'

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

describe('parseDateOrNull', () => {
  it('null / undefined / 空文字 は null', () => {
    expect(parseDateOrNull(null)).toBe(null)
    expect(parseDateOrNull(undefined)).toBe(null)
    expect(parseDateOrNull('')).toBe(null)
  })

  it('Date instance は inert で返す (Number.isFinite チェック)', () => {
    const d = new Date(2026, 3, 27)
    expect(parseDateOrNull(d)).toBe(d)
  })

  it('不正 Date instance (NaN time) は null', () => {
    expect(parseDateOrNull(new Date('garbage'))).toBe(null)
  })

  it('YYYY-MM-DD 文字列を parse', () => {
    const r = parseDateOrNull('2026-04-27')
    expect(r).not.toBeNull()
    expect(r?.toISOString().slice(0, 10)).toBe('2026-04-27')
  })

  it('RFC3339 datetime も parse', () => {
    const r = parseDateOrNull('2026-04-27T15:30:00Z')
    expect(r).not.toBeNull()
    expect(r?.getUTCHours()).toBe(15)
  })

  it('不正値文字列は null (fail-soft)', () => {
    expect(parseDateOrNull('not-a-date')).toBe(null)
    expect(parseDateOrNull('2026-99-99')).toBe(null)
  })
})

describe('shiftIsoDate', () => {
  it('+0 / +1 / -1', () => {
    expect(shiftIsoDate('2026-04-27', 0)).toBe('2026-04-27')
    expect(shiftIsoDate('2026-04-27', 1)).toBe('2026-04-28')
    expect(shiftIsoDate('2026-04-27', -1)).toBe('2026-04-26')
  })

  it('月跨ぎ (前後双方向)', () => {
    expect(shiftIsoDate('2026-04-30', 1)).toBe('2026-05-01')
    expect(shiftIsoDate('2026-05-01', -1)).toBe('2026-04-30')
  })

  it('年跨ぎ (前後双方向)', () => {
    expect(shiftIsoDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftIsoDate('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('長距離 shift (±60 日 等)', () => {
    expect(shiftIsoDate('2026-04-27', 60)).toBe('2026-06-26')
    expect(shiftIsoDate('2026-04-27', -60)).toBe('2026-02-26')
  })

  it('うるう年境界 (2024-02-28 → 2024-02-29)', () => {
    expect(shiftIsoDate('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftIsoDate('2024-02-29', 1)).toBe('2024-03-01')
    // 平年は 2/28 → 3/1
    expect(shiftIsoDate('2025-02-28', 1)).toBe('2025-03-01')
  })

  it('0 padding を保つ (1 月 / 5 日 等)', () => {
    expect(shiftIsoDate('2026-01-05', 0)).toBe('2026-01-05')
    expect(shiftIsoDate('2026-12-09', 0)).toBe('2026-12-09')
  })
})

describe('formatLocalISO', () => {
  it('Date を YYYY-MM-DD ローカル化 (時刻部分を捨てる)', () => {
    expect(formatLocalISO(new Date(2026, 3, 27, 14, 30, 45))).toBe('2026-04-27')
  })

  it('1 月 / 5 日も 0 padding', () => {
    expect(formatLocalISO(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(formatLocalISO(new Date(2026, 11, 9, 23, 59))).toBe('2026-12-09')
  })

  it('todayISO と同値 (今日の Date を渡せば形式一致)', () => {
    const d = new Date(2026, 3, 27, 9, 0, 0)
    expect(formatLocalISO(d)).toBe(todayISO(d))
  })
})

describe('toLocalMidnight', () => {
  it('Date を 0:00:00 揃えで返す', () => {
    const r = toLocalMidnight(new Date(2026, 3, 27, 14, 30, 45))
    expect(r).not.toBeNull()
    expect(r?.getFullYear()).toBe(2026)
    expect(r?.getMonth()).toBe(3)
    expect(r?.getDate()).toBe(27)
    expect(r?.getHours()).toBe(0)
    expect(r?.getMinutes()).toBe(0)
    expect(r?.getSeconds()).toBe(0)
  })

  it('null / undefined は null', () => {
    expect(toLocalMidnight(null)).toBe(null)
    expect(toLocalMidnight(undefined)).toBe(null)
  })

  it('不正 Date (NaN time) は null (fail-soft)', () => {
    expect(toLocalMidnight(new Date('garbage'))).toBe(null)
  })

  it('元 Date を mutate しない (新インスタンスを返す)', () => {
    const original = new Date(2026, 3, 27, 14, 30)
    const result = toLocalMidnight(original)
    expect(result).not.toBe(original)
    expect(original.getHours()).toBe(14)
  })
})
