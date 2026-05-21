import { describe, expect, it } from 'vitest'

import {
  dayDiffISO,
  dueDateEndOfDayMs,
  formatLocalISO,
  formatUtcISO,
  ISO_DATE_RE,
  isoDaysFromNow,
  isValidIsoDate,
  MS_PER_DAY,
  pad2,
  parseDateOrNull,
  parseIsoDateAsLocalMidnight,
  shiftIsoDate,
  todayISO,
  todayUtcISO,
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

describe('formatUtcISO', () => {
  it('UTC 基準の Date を YYYY-MM-DD に整形', () => {
    expect(formatUtcISO(new Date('2026-04-27T15:30:00Z'))).toBe('2026-04-27')
    expect(formatUtcISO(new Date('2026-04-27T00:00:00Z'))).toBe('2026-04-27')
  })

  it('UTC 日跨ぎを保持 (ローカル化しない)', () => {
    // ローカル TZ 依存しない確認: 23:59 UTC は 4/27、翌 0:30 UTC は 4/28
    expect(formatUtcISO(new Date('2026-04-27T23:59:00Z'))).toBe('2026-04-27')
    expect(formatUtcISO(new Date('2026-04-28T00:30:00Z'))).toBe('2026-04-28')
  })
})

describe('todayUtcISO', () => {
  it('引数 Date を UTC YYYY-MM-DD に', () => {
    expect(todayUtcISO(new Date('2026-04-27T15:30:00Z'))).toBe('2026-04-27')
  })

  it('省略時は現在時刻 — 形式のみ検証', () => {
    expect(todayUtcISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('formatUtcISO と同値 (糖衣)', () => {
    const d = new Date('2026-04-27T12:00:00Z')
    expect(todayUtcISO(d)).toBe(formatUtcISO(d))
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

describe('isValidIsoDate', () => {
  it('returns true for valid YYYY-MM-DD', () => {
    expect(isValidIsoDate('2026-04-29')).toBe(true)
    expect(isValidIsoDate('2024-12-31')).toBe(true)
    expect(isValidIsoDate('2026-01-01')).toBe(true)
  })

  it('returns true for ISO datetime prefix (only checks YYYY-MM-DD)', () => {
    expect(isValidIsoDate('2026-04-29T15:30:00Z')).toBe(true)
  })

  it('returns false for out-of-range month / day', () => {
    expect(isValidIsoDate('2026-99-29')).toBe(false)
    expect(isValidIsoDate('2026-04-99')).toBe(false)
    expect(isValidIsoDate('2026-00-15')).toBe(false)
    expect(isValidIsoDate('2026-12-00')).toBe(false)
  })

  it('returns false for malformed input', () => {
    expect(isValidIsoDate('garbage')).toBe(false)
    expect(isValidIsoDate('')).toBe(false)
    expect(isValidIsoDate('2026/04/29')).toBe(false)
    expect(isValidIsoDate('26-04-29')).toBe(false)
  })
})

describe('ISO_DATE_RE (iter615 共有 regex)', () => {
  it('完全一致 YYYY-MM-DD で true', () => {
    expect(ISO_DATE_RE.test('2026-04-29')).toBe(true)
    expect(ISO_DATE_RE.test('2024-12-31')).toBe(true)
  })

  it('ISO datetime prefix は false (= 完全一致のみ、isValidIsoDate と挙動が違う)', () => {
    expect(ISO_DATE_RE.test('2026-04-29T15:30:00Z')).toBe(false)
  })

  it('形式不一致は false', () => {
    expect(ISO_DATE_RE.test('2026/04/29')).toBe(false)
    expect(ISO_DATE_RE.test('26-04-29')).toBe(false)
    expect(ISO_DATE_RE.test('')).toBe(false)
  })
})

describe('dueDateEndOfDayMs', () => {
  it('returns end-of-day ms for valid YYYY-MM-DD', () => {
    const ms = dueDateEndOfDayMs('2026-04-29')
    expect(ms).not.toBeNull()
    const d = new Date(ms!)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(3)
    expect(d.getDate()).toBe(29)
    expect(d.getHours()).toBe(23)
    expect(d.getMinutes()).toBe(59)
    expect(d.getSeconds()).toBe(59)
    expect(d.getMilliseconds()).toBe(999)
  })

  it('returns null for invalid ISO', () => {
    expect(dueDateEndOfDayMs('garbage')).toBe(null)
    expect(dueDateEndOfDayMs('2026-99-99')).toBe(null)
    expect(dueDateEndOfDayMs('')).toBe(null)
  })

  it('produces ms greater than start-of-day', () => {
    const end = dueDateEndOfDayMs('2026-04-29')!
    const start = new Date(2026, 3, 29, 0, 0, 0).getTime()
    expect(end).toBeGreaterThan(start)
    expect(end - start).toBe(24 * 60 * 60 * 1000 - 1) // 1 day - 1 ms
  })
})

describe('parseIsoDateAsLocalMidnight', () => {
  it('valid ISO `YYYY-MM-DD` をローカル TZ 0:00 Date に変換', () => {
    const d = parseIsoDateAsLocalMidnight('2026-04-29')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2026)
    expect(d!.getMonth()).toBe(3) // 0-indexed = April
    expect(d!.getDate()).toBe(29)
    expect(d!.getHours()).toBe(0)
    expect(d!.getMinutes()).toBe(0)
    expect(d!.getSeconds()).toBe(0)
  })

  it('長い ISO (`YYYY-MM-DDTHH:MM:SS`) も prefix のみ採用', () => {
    const d = parseIsoDateAsLocalMidnight('2026-04-29T12:34:56Z')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2026)
    expect(d!.getDate()).toBe(29)
    expect(d!.getHours()).toBe(0) // 時刻 prefix は無視、0:00 に揃う
  })

  it('形式不一致は null', () => {
    expect(parseIsoDateAsLocalMidnight('2026/04/29')).toBeNull()
    expect(parseIsoDateAsLocalMidnight('29-04-2026')).toBeNull()
    expect(parseIsoDateAsLocalMidnight('not-a-date')).toBeNull()
    expect(parseIsoDateAsLocalMidnight('')).toBeNull()
  })

  it('月が範囲外 (0 / 13) は null', () => {
    expect(parseIsoDateAsLocalMidnight('2026-00-15')).toBeNull()
    expect(parseIsoDateAsLocalMidnight('2026-13-15')).toBeNull()
  })

  it('日が範囲外 (0 / 32) は null', () => {
    expect(parseIsoDateAsLocalMidnight('2026-04-00')).toBeNull()
    expect(parseIsoDateAsLocalMidnight('2026-04-32')).toBeNull()
  })

  it('境界値 (1 月 1 日 / 12 月 31 日) は受け入れ', () => {
    expect(parseIsoDateAsLocalMidnight('2026-01-01')).not.toBeNull()
    expect(parseIsoDateAsLocalMidnight('2026-12-31')).not.toBeNull()
  })

  it('toLocalMidnight(parseDateOrNull(iso)) と同等の Date を返す (semantics 互換)', () => {
    const a = parseIsoDateAsLocalMidnight('2026-04-29')!
    const b = toLocalMidnight(parseDateOrNull('2026-04-29'))!
    expect(a.getTime()).toBe(b.getTime())
  })
})

describe('dayDiffISO (iter1029)', () => {
  it('同日 → 0', () => {
    expect(dayDiffISO('2026-04-29', '2026-04-29')).toBe(0)
  })

  it('a < b → 正 (b - a の日数)', () => {
    expect(dayDiffISO('2026-04-22', '2026-04-29')).toBe(7)
    expect(dayDiffISO('2026-04-29', '2026-05-06')).toBe(7)
  })

  it('a > b → 負', () => {
    expect(dayDiffISO('2026-04-29', '2026-04-22')).toBe(-7)
  })

  it('月跨ぎ / 年跨ぎは UTC 計算で正常', () => {
    expect(dayDiffISO('2026-01-31', '2026-02-01')).toBe(1)
    expect(dayDiffISO('2025-12-31', '2026-01-01')).toBe(1)
  })

  it('不正 ISO → NaN', () => {
    expect(dayDiffISO('not-a-date', '2026-04-29')).toBeNaN()
    expect(dayDiffISO('2026-04-29', 'garbage')).toBeNaN()
  })
})

describe('pad2 (iter1045)', () => {
  it('1 桁を 0 埋め (5 → "05")', () => {
    expect(pad2(5)).toBe('05')
    expect(pad2(0)).toBe('00')
    expect(pad2(9)).toBe('09')
  })

  it('2 桁以上は そのまま (10 → "10" / 100 → "100")', () => {
    expect(pad2(10)).toBe('10')
    expect(pad2(59)).toBe('59')
    expect(pad2(100)).toBe('100')
  })

  it('formatLocalISO / shiftIsoDate / addDaysISO の HH/MM padding 内部実装と整合', () => {
    // formatLocalISO は pad2 を内部利用、月 1 / 日 1 は "01" になる
    expect(formatLocalISO(new Date(2026, 0, 1))).toBe('2026-01-01')
    // shiftIsoDate も pad2 経由で 2 桁 padding
    expect(shiftIsoDate('2026-01-31', 1)).toBe('2026-02-01')
  })
})

describe('MS_PER_DAY', () => {
  it('= 24 × 60 × 60 × 1000 (1 day in ms)', () => {
    expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000)
    expect(MS_PER_DAY).toBe(86_400_000)
  })

  it('Date 差を日数に変換できる', () => {
    const a = new Date(2026, 3, 29).getTime()
    const b = new Date(2026, 3, 22).getTime()
    expect(Math.round((a - b) / MS_PER_DAY)).toBe(7)
  })
})
