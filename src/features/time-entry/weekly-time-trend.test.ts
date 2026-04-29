import { describe, expect, it } from 'vitest'

import {
  computeWeeklyTimeTrend,
  formatWeeklyTimeTrendJa,
  splitTimeEntriesByWeek,
  type WeeklyTimeEntry,
} from './weekly-time-trend'

const E = (workDate: string, durationMinutes: number): WeeklyTimeEntry => ({
  workDate,
  durationMinutes,
})

describe('splitTimeEntriesByWeek', () => {
  it('today-6..today を thisWeek、today-13..today-7 を priorWeek に分割', () => {
    const today = '2026-04-29'
    const entries = [
      E('2026-04-29', 60), // today (this)
      E('2026-04-23', 60), // today-6 (this)
      E('2026-04-22', 60), // today-7 (prior)
      E('2026-04-16', 60), // today-13 (prior)
      E('2026-04-15', 60), // today-14 (除外)
      E('2026-04-30', 60), // today+1 (除外)
    ]
    const { thisWeek, priorWeek } = splitTimeEntriesByWeek(entries, today)
    expect(thisWeek.map((e) => e.workDate)).toEqual(['2026-04-29', '2026-04-23'])
    expect(priorWeek.map((e) => e.workDate)).toEqual(['2026-04-22', '2026-04-16'])
  })

  it('不正 today / 不正 workDate は除外', () => {
    expect(splitTimeEntriesByWeek([E('2026-04-29', 60)], 'bad')).toEqual({
      thisWeek: [],
      priorWeek: [],
    })
    const r = splitTimeEntriesByWeek([E('not-a-date', 60), E('2026-04-29', 60)], '2026-04-29')
    expect(r.thisWeek).toHaveLength(1)
  })

  it('月境界跨ぎでも正しく分割', () => {
    const today = '2026-05-02'
    const entries = [E('2026-05-02', 60), E('2026-04-26', 60), E('2026-04-25', 60)]
    const { thisWeek, priorWeek } = splitTimeEntriesByWeek(entries, today)
    expect(thisWeek.map((e) => e.workDate)).toEqual(['2026-05-02', '2026-04-26'])
    expect(priorWeek.map((e) => e.workDate)).toEqual(['2026-04-25'])
  })
})

describe('computeWeeklyTimeTrend', () => {
  it('this=0 / prior=0 で idle', () => {
    const r = computeWeeklyTimeTrend([], [])
    expect(r).toEqual({
      thisWeekMinutes: 0,
      priorWeekMinutes: 0,
      deltaMinutes: 0,
      deltaPct: null,
      direction: 'idle',
    })
  })

  it('prior=0、this>0 は up + deltaPct=null', () => {
    const r = computeWeeklyTimeTrend([E('2026-04-29', 60)], [])
    expect(r.thisWeekMinutes).toBe(60)
    expect(r.priorWeekMinutes).toBe(0)
    expect(r.deltaPct).toBeNull()
    expect(r.direction).toBe('up')
  })

  it('prior>0、this=0 は down', () => {
    const r = computeWeeklyTimeTrend([], [E('2026-04-22', 60)])
    expect(r.direction).toBe('down')
    expect(r.deltaPct).toBe(-100)
  })

  it('Δ% 絶対値 < 5% は flat', () => {
    const r = computeWeeklyTimeTrend([E('2026-04-29', 102)], [E('2026-04-22', 100)])
    expect(r.deltaPct).toBe(2)
    expect(r.direction).toBe('flat')
  })

  it('Δ% > +5% は up', () => {
    const r = computeWeeklyTimeTrend([E('2026-04-29', 150)], [E('2026-04-22', 100)])
    expect(r.deltaPct).toBe(50)
    expect(r.direction).toBe('up')
  })

  it('Δ% < -5% は down', () => {
    const r = computeWeeklyTimeTrend([E('2026-04-29', 50)], [E('2026-04-22', 100)])
    expect(r.deltaPct).toBe(-50)
    expect(r.direction).toBe('down')
  })

  it('NaN / 負 / Infinity duration は 0 として fail-soft', () => {
    const r = computeWeeklyTimeTrend(
      [E('2026-04-29', NaN), E('2026-04-29', -60), E('2026-04-29', 60), E('2026-04-29', Infinity)],
      [],
    )
    expect(r.thisWeekMinutes).toBe(60)
  })
})

describe('formatWeeklyTimeTrendJa', () => {
  it('idle は「稼働記録なし」', () => {
    const r = computeWeeklyTimeTrend([], [])
    expect(formatWeeklyTimeTrendJa(r)).toBe('直近 14 日: 稼働記録なし')
  })

  it('up は増加文言 + delta 表示', () => {
    const r = computeWeeklyTimeTrend([E('2026-04-29', 180)], [E('2026-04-22', 60)])
    expect(formatWeeklyTimeTrendJa(r)).toBe('稼働時間: 増加 (先週 1h → 今週 3h、+2h (+200%))')
  })

  it('prior=0 で deltaPct=null は (%) を含めない', () => {
    const r = computeWeeklyTimeTrend([E('2026-04-29', 90)], [])
    expect(formatWeeklyTimeTrendJa(r)).toBe('稼働時間: 増加 (先週 0min → 今週 1h 30min、+1h 30min)')
  })

  it('down は減少文言', () => {
    const r = computeWeeklyTimeTrend([E('2026-04-29', 30)], [E('2026-04-22', 120)])
    expect(formatWeeklyTimeTrendJa(r)).toBe(
      '稼働時間: 減少 (先週 2h → 今週 30min、-1h 30min (-75%))',
    )
  })

  it('flat は安定文言', () => {
    const r = computeWeeklyTimeTrend([E('2026-04-29', 102)], [E('2026-04-22', 100)])
    expect(formatWeeklyTimeTrendJa(r)).toBe('稼働時間: 安定 (先週 1h 40min → 今週 1h 42min)')
  })
})

describe('統合: split → compute → format', () => {
  it('時系列 entries から 1 行 prompt を生成', () => {
    const today = '2026-04-29'
    const entries = [
      E('2026-04-29', 90),
      E('2026-04-28', 60),
      E('2026-04-22', 30),
      E('2026-04-16', 30), // prior week
      E('2026-04-10', 600), // 範囲外
    ]
    const { thisWeek, priorWeek } = splitTimeEntriesByWeek(entries, today)
    const trend = computeWeeklyTimeTrend(thisWeek, priorWeek)
    expect(trend.thisWeekMinutes).toBe(150)
    expect(trend.priorWeekMinutes).toBe(60)
    expect(trend.direction).toBe('up')
    expect(formatWeeklyTimeTrendJa(trend)).toContain('稼働時間: 増加')
  })
})
