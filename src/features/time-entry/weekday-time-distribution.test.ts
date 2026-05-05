import { describe, expect, it } from 'vitest'

import {
  findPeakWeekday,
  formatWeekdayTimeDistributionJa,
  groupTimeEntriesByWeekday,
  WEEKDAY_KEYS,
  weekdayLabelJa,
  type WeekdayTimeEntry,
} from './weekday-time-distribution'

// 既知の曜日アンカー (UTC):
//   2026-04-27 = 月曜 / 04-28 = 火 / 04-29 = 水 / 04-30 = 木 / 05-01 = 金 / 05-02 = 土 / 05-03 = 日
const MON = '2026-04-27'
const TUE = '2026-04-28'
const WED = '2026-04-29'
const THU = '2026-04-30'
const FRI = '2026-05-01'
const SAT = '2026-05-02'

describe('groupTimeEntriesByWeekday', () => {
  it('returns all-zero when entries empty', () => {
    expect(groupTimeEntriesByWeekday([])).toEqual({
      mon: 0,
      tue: 0,
      wed: 0,
      thu: 0,
      fri: 0,
      sat: 0,
      sun: 0,
    })
  })

  it('maps a single entry to the correct weekday bucket', () => {
    expect(groupTimeEntriesByWeekday([{ workDate: TUE, durationMinutes: 90 }]).tue).toBe(90)
    expect(groupTimeEntriesByWeekday([{ workDate: SAT, durationMinutes: 30 }]).sat).toBe(30)
  })

  it('sums multiple entries on the same weekday across different weeks', () => {
    const entries: WeekdayTimeEntry[] = [
      { workDate: MON, durationMinutes: 60 }, // 月 (今週)
      { workDate: '2026-04-20', durationMinutes: 30 }, // 月 (先週)
      { workDate: TUE, durationMinutes: 120 },
    ]
    const totals = groupTimeEntriesByWeekday(entries)
    expect(totals.mon).toBe(90)
    expect(totals.tue).toBe(120)
    expect(totals.wed).toBe(0)
  })

  it('clamps invalid durationMinutes (NaN / 負 / Infinity) to 0', () => {
    const entries: WeekdayTimeEntry[] = [
      { workDate: WED, durationMinutes: Number.NaN },
      { workDate: WED, durationMinutes: -10 },
      { workDate: WED, durationMinutes: Infinity },
      { workDate: WED, durationMinutes: 45 },
    ]
    expect(groupTimeEntriesByWeekday(entries).wed).toBe(45)
  })

  it('skips entries with malformed workDate', () => {
    const entries: WeekdayTimeEntry[] = [
      { workDate: '', durationMinutes: 60 },
      { workDate: 'not-a-date', durationMinutes: 60 },
      { workDate: '2026/04/27', durationMinutes: 60 }, // slash 区切り
      { workDate: '2026-13-40', durationMinutes: 60 }, // 範囲外
      { workDate: '2026-02-30', durationMinutes: 60 }, // 非実在日
      { workDate: MON, durationMinutes: 60 }, // 唯一有効
    ]
    expect(groupTimeEntriesByWeekday(entries).mon).toBe(60)
  })

  it('respects from/to filter (両端 inclusive)', () => {
    const entries: WeekdayTimeEntry[] = [
      { workDate: MON, durationMinutes: 60 },
      { workDate: TUE, durationMinutes: 60 },
      { workDate: WED, durationMinutes: 60 },
      { workDate: THU, durationMinutes: 60 },
    ]
    const totals = groupTimeEntriesByWeekday(entries, { from: TUE, to: WED })
    expect(totals.mon).toBe(0)
    expect(totals.tue).toBe(60)
    expect(totals.wed).toBe(60)
    expect(totals.thu).toBe(0)
  })

  it('rounds fractional minutes', () => {
    expect(groupTimeEntriesByWeekday([{ workDate: FRI, durationMinutes: 90.6 }]).fri).toBe(91)
  })
})

describe('weekdayLabelJa', () => {
  it('returns Japanese single-char labels for all 7 keys', () => {
    expect(weekdayLabelJa('mon')).toBe('月')
    expect(weekdayLabelJa('tue')).toBe('火')
    expect(weekdayLabelJa('wed')).toBe('水')
    expect(weekdayLabelJa('thu')).toBe('木')
    expect(weekdayLabelJa('fri')).toBe('金')
    expect(weekdayLabelJa('sat')).toBe('土')
    expect(weekdayLabelJa('sun')).toBe('日')
  })

  it('exposes WEEKDAY_KEYS in 月→日 order', () => {
    expect([...WEEKDAY_KEYS]).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
  })
})

describe('findPeakWeekday', () => {
  it('returns null when all zero', () => {
    expect(findPeakWeekday({ mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 })).toBeNull()
  })

  it('picks the weekday with the largest minutes', () => {
    const peak = findPeakWeekday({
      mon: 60,
      tue: 360,
      wed: 120,
      thu: 0,
      fri: 90,
      sat: 0,
      sun: 0,
    })
    expect(peak).toEqual({ key: 'tue', minutes: 360 })
  })

  it('breaks tie by week-order (月→日 優先)', () => {
    const peak = findPeakWeekday({
      mon: 0,
      tue: 120,
      wed: 0,
      thu: 0,
      fri: 120, // tie with tue → tue が先
      sat: 0,
      sun: 0,
    })
    expect(peak).toEqual({ key: 'tue', minutes: 120 })
  })
})

describe('formatWeekdayTimeDistributionJa', () => {
  it('hides zero buckets by default', () => {
    const out = formatWeekdayTimeDistributionJa({
      mon: 240,
      tue: 360,
      wed: 0,
      thu: 0,
      fri: 90,
      sat: 0,
      sun: 0,
    })
    expect(out).toBe('月 4時間 / 火 6時間 / 金 1時間30分')
  })

  it('shows all 7 weekdays when hideZero=false', () => {
    const out = formatWeekdayTimeDistributionJa(
      { mon: 60, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
      { hideZero: false },
    )
    expect(out).toBe('月 1時間 / 火 0分 / 水 0分 / 木 0分 / 金 0分 / 土 0分 / 日 0分')
  })

  it('returns "0 件" sentinel when all zero', () => {
    expect(
      formatWeekdayTimeDistributionJa({
        mon: 0,
        tue: 0,
        wed: 0,
        thu: 0,
        fri: 0,
        sat: 0,
        sun: 0,
      }),
    ).toBe('0 件')
  })
})

describe('integration: 1 週分 entries → distribution + peak + format', () => {
  it('connects group → peak → format end-to-end', () => {
    const entries: WeekdayTimeEntry[] = [
      { workDate: MON, durationMinutes: 240 }, // 4h
      { workDate: TUE, durationMinutes: 360 }, // 6h ← peak
      { workDate: WED, durationMinutes: 300 }, // 5h
      { workDate: THU, durationMinutes: 150 }, // 2h 30min
      { workDate: FRI, durationMinutes: 180 }, // 3h
      // 土日は記録なし
    ]
    const totals = groupTimeEntriesByWeekday(entries)
    expect(totals).toEqual({ mon: 240, tue: 360, wed: 300, thu: 150, fri: 180, sat: 0, sun: 0 })
    expect(findPeakWeekday(totals)).toEqual({ key: 'tue', minutes: 360 })
    expect(formatWeekdayTimeDistributionJa(totals)).toBe(
      '月 4時間 / 火 6時間 / 水 5時間 / 木 2時間30分 / 金 3時間',
    )
  })
})
