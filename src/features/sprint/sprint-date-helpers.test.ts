import { describe, expect, it } from 'vitest'

import {
  addDaysISO,
  dayOfWeekJa,
  daysBetween,
  formatDateJa,
  isoDaysFromNow,
  nextDowISO,
  todayISO,
} from './sprint-date-helpers'

describe('dayOfWeekJa', () => {
  it('既知の日付の曜日 (UTC ベース)', () => {
    // 2026-04-27 (月)
    expect(dayOfWeekJa('2026-04-27')).toBe('月')
    // 2026-04-25 (土)
    expect(dayOfWeekJa('2026-04-25')).toBe('土')
    // 2026-04-26 (日)
    expect(dayOfWeekJa('2026-04-26')).toBe('日')
  })

  it('不正な ISO は空文字 (fail-safe)', () => {
    expect(dayOfWeekJa('not-a-date')).toBe('')
    expect(dayOfWeekJa('')).toBe('')
    expect(dayOfWeekJa('2026-04')).toBe('')
  })
})

describe('formatDateJa', () => {
  it('"2026-04-27" → "2026-04-27 (月)"', () => {
    expect(formatDateJa('2026-04-27')).toBe('2026-04-27 (月)')
  })

  it('不正な ISO は ISO そのまま', () => {
    expect(formatDateJa('bad-date')).toBe('bad-date')
  })
})

describe('addDaysISO', () => {
  it('+1 日', () => {
    expect(addDaysISO('2026-04-27', 1)).toBe('2026-04-28')
  })

  it('-1 日', () => {
    expect(addDaysISO('2026-04-27', -1)).toBe('2026-04-26')
  })

  it('月跨ぎ (4-30 + 1 = 5-1)', () => {
    expect(addDaysISO('2026-04-30', 1)).toBe('2026-05-01')
  })

  it('年跨ぎ (12-31 + 1 = 1-1)', () => {
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('うるう年 (2028-02-28 + 1 = 2-29)', () => {
    expect(addDaysISO('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('+13 (Sprint 期間 14 日の終了日)', () => {
    expect(addDaysISO('2026-04-27', 13)).toBe('2026-05-10')
  })
})

describe('daysBetween', () => {
  it('同日 = 0', () => {
    expect(daysBetween('2026-04-27', '2026-04-27')).toBe(0)
  })

  it('+1 日', () => {
    expect(daysBetween('2026-04-27', '2026-04-28')).toBe(1)
  })

  it('-1 日 (逆順)', () => {
    expect(daysBetween('2026-04-28', '2026-04-27')).toBe(-1)
  })

  it('Sprint 14 日 (start → end)', () => {
    expect(daysBetween('2026-04-27', '2026-05-10')).toBe(13)
  })

  it('月跨ぎ (4-25 → 5-25 = 30 日)', () => {
    expect(daysBetween('2026-04-25', '2026-05-25')).toBe(30)
  })

  it('年跨ぎ (12-25 → 1-5 = 11 日)', () => {
    expect(daysBetween('2026-12-25', '2027-01-05')).toBe(11)
  })
})

describe('todayISO / isoDaysFromNow', () => {
  it('todayISO は 10 文字 YYYY-MM-DD 形式', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('isoDaysFromNow(0) は今日と同じ', () => {
    expect(isoDaysFromNow(0)).toBe(todayISO())
  })

  it('isoDaysFromNow(1) は今日+1 日 (UTC 跨ぎでも 1 日差を維持するため addDaysISO で確認)', () => {
    expect(isoDaysFromNow(1)).toBe(addDaysISO(todayISO(), 1))
  })

  it('isoDaysFromNow(13) は今日+13 日 (Sprint 期間 14 日の終了日候補)', () => {
    expect(isoDaysFromNow(13)).toBe(addDaysISO(todayISO(), 13))
  })
})

describe('nextDowISO', () => {
  it('返り値は YYYY-MM-DD 形式', () => {
    expect(nextDowISO(1)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('返り値は今日以降', () => {
    const today = todayISO()
    for (let dow = 0; dow < 7; dow++) {
      expect(nextDowISO(dow) >= today).toBe(true)
    }
  })

  it('返り値の曜日は targetDow と一致', () => {
    const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土']
    for (let dow = 0; dow < 7; dow++) {
      expect(dayOfWeekJa(nextDowISO(dow))).toBe(DOW_NAMES[dow])
    }
  })
})
