/**
 * iter314 ai-automation: daily-summary pure helper の単体検証。
 */
import { describe, expect, it } from 'vitest'

import {
  dailyMinutesSeries,
  type DailySummaryEntry,
  formatDailyMinutesSeries,
  groupTimeEntriesByDay,
  totalDailyMinutes,
} from './daily-summary'

const e = (overrides: DailySummaryEntry): DailySummaryEntry => overrides

const TODAY = new Date(2026, 3, 27) // 2026-04-27

describe('groupTimeEntriesByDay', () => {
  it('workDate ごとに合計分を集計', () => {
    const map = groupTimeEntriesByDay([
      e({ workDate: '2026-04-25', durationMinutes: 60 }),
      e({ workDate: '2026-04-25', durationMinutes: 30 }),
      e({ workDate: '2026-04-26', durationMinutes: 45 }),
    ])
    expect(map.get('2026-04-25')).toBe(90)
    expect(map.get('2026-04-26')).toBe(45)
    expect(map.size).toBe(2)
  })

  it('空配列は空 Map', () => {
    expect(groupTimeEntriesByDay([]).size).toBe(0)
  })

  it('workDate 欠落 / 空文字は除外', () => {
    const map = groupTimeEntriesByDay([
      { workDate: '', durationMinutes: 60 },
      { workDate: '2026-04-27', durationMinutes: 30 },
    ])
    expect(map.size).toBe(1)
  })

  it('不正 durationMinutes (NaN / 負 / Infinity) は 0 加算', () => {
    const map = groupTimeEntriesByDay([
      e({ workDate: '2026-04-27', durationMinutes: Number.NaN }),
      e({ workDate: '2026-04-27', durationMinutes: -30 }),
      e({ workDate: '2026-04-27', durationMinutes: 60 }),
    ])
    expect(map.get('2026-04-27')).toBe(60)
  })

  it('from / to で範囲フィルタ', () => {
    const entries = [
      e({ workDate: '2026-04-25', durationMinutes: 30 }),
      e({ workDate: '2026-04-26', durationMinutes: 60 }),
      e({ workDate: '2026-04-27', durationMinutes: 90 }),
    ]
    expect(groupTimeEntriesByDay(entries, { from: '2026-04-26', to: '2026-04-27' }).size).toBe(2)
  })
})

describe('dailyMinutesSeries', () => {
  it('today を含む直近 windowDays 日の連続系列 (古い順)', () => {
    const entries = [
      e({ workDate: '2026-04-27', durationMinutes: 60 }),
      e({ workDate: '2026-04-25', durationMinutes: 30 }),
    ]
    const series = dailyMinutesSeries(entries, { windowDays: 3 }, TODAY)
    expect(series).toEqual([
      { date: '2026-04-25', minutes: 30 },
      { date: '2026-04-26', minutes: 0 }, // 0 件日も含む
      { date: '2026-04-27', minutes: 60 },
    ])
  })

  it('windowDays=7 (default) で 7 日連続', () => {
    const series = dailyMinutesSeries([], {}, TODAY)
    expect(series).toHaveLength(7)
    expect(series[0]?.date).toBe('2026-04-21') // today - 6
    expect(series[6]?.date).toBe('2026-04-27') // today
  })

  it('windowDays<=0 は空配列', () => {
    expect(dailyMinutesSeries([], { windowDays: 0 }, TODAY)).toEqual([])
    expect(dailyMinutesSeries([], { windowDays: -3 }, TODAY)).toEqual([])
  })

  it('範囲外 entries は集計に含まれない', () => {
    const series = dailyMinutesSeries(
      [e({ workDate: '2026-04-15', durationMinutes: 60 })], // 12 日前 = window 外
      { windowDays: 3 },
      TODAY,
    )
    expect(series.every((d) => d.minutes === 0)).toBe(true)
  })

  it('today を文字列で渡しても OK', () => {
    const series = dailyMinutesSeries([], { windowDays: 3 }, '2026-04-27')
    expect(series).toHaveLength(3)
    expect(series[2]?.date).toBe('2026-04-27')
  })

  it('不正 today は空配列', () => {
    expect(dailyMinutesSeries([], { windowDays: 7 }, 'not-a-date')).toEqual([])
  })

  it('月跨ぎでも連続系列を維持 (4/30 → 5/1)', () => {
    const series = dailyMinutesSeries([], { windowDays: 3 }, new Date(2026, 4, 1)) // 5/1
    expect(series.map((d) => d.date)).toEqual(['2026-04-29', '2026-04-30', '2026-05-01'])
  })
})

describe('formatDailyMinutesSeries', () => {
  it('新しい順 (= series 後ろから) で 1 行整形', () => {
    const series = [
      { date: '2026-04-25', minutes: 240 }, // 4h
      { date: '2026-04-26', minutes: 60 }, // 1h
      { date: '2026-04-27', minutes: 300 }, // 5h
    ]
    expect(formatDailyMinutesSeries(series)).toBe('4/27 5時間 / 4/26 1時間 / 4/25 4時間')
  })

  it('0 分日は省略', () => {
    const series = [
      { date: '2026-04-25', minutes: 60 },
      { date: '2026-04-26', minutes: 0 }, // 省略
      { date: '2026-04-27', minutes: 120 },
    ]
    expect(formatDailyMinutesSeries(series)).toBe('4/27 2時間 / 4/25 1時間')
  })

  it('全 0 → "0 件"', () => {
    const series = [
      { date: '2026-04-25', minutes: 0 },
      { date: '2026-04-26', minutes: 0 },
    ]
    expect(formatDailyMinutesSeries(series)).toBe('0 件')
  })

  it('空配列 → "0 件"', () => {
    expect(formatDailyMinutesSeries([])).toBe('0 件')
  })

  it('日付は M/D で年省略', () => {
    expect(formatDailyMinutesSeries([{ date: '2026-04-05', minutes: 30 }])).toBe('4/5 30分')
  })

  it('時 + 分の混在も正しく整形', () => {
    expect(formatDailyMinutesSeries([{ date: '2026-04-27', minutes: 90 }])).toBe('4/27 1時間30分')
  })
})

describe('totalDailyMinutes', () => {
  it('Map の全 value を合計', () => {
    const map = new Map([
      ['2026-04-25', 60],
      ['2026-04-26', 30],
      ['2026-04-27', 90],
    ])
    expect(totalDailyMinutes(map)).toBe(180)
  })

  it('空 Map は 0', () => {
    expect(totalDailyMinutes(new Map())).toBe(0)
  })
})

describe('集計 + 系列 + 整形 統合', () => {
  it('groupTimeEntriesByDay → dailyMinutesSeries → format が正しく繋がる', () => {
    const entries = [
      e({ workDate: '2026-04-25', durationMinutes: 240 }), // 4h
      e({ workDate: '2026-04-27', durationMinutes: 300 }), // 5h
    ]
    const series = dailyMinutesSeries(entries, { windowDays: 3 }, TODAY)
    expect(formatDailyMinutesSeries(series)).toBe('4/27 5時間 / 4/25 4時間')
  })
})
