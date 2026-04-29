import { describe, expect, it } from 'vitest'

import { computeDailyStreak, formatStreakSummary, type StreakEntry } from './daily-streak'

const E = (workDate: string, durationMinutes: number): StreakEntry => ({
  workDate,
  durationMinutes,
})

describe('computeDailyStreak', () => {
  it('today から逆順に連続する稼働日を currentStreak でカウント', () => {
    const entries = [
      E('2026-04-29', 60),
      E('2026-04-28', 60),
      E('2026-04-27', 60),
      E('2026-04-25', 60), // 26 日抜け → currentStreak はここで止まる
    ]
    const r = computeDailyStreak(entries, '2026-04-29')
    expect(r.currentStreak).toBe(3)
    expect(r.longestStreak).toBe(3)
    expect(r.lastActiveDate).toBe('2026-04-29')
  })

  it('today が非稼働なら currentStreak=0', () => {
    const entries = [E('2026-04-28', 60), E('2026-04-27', 60)]
    const r = computeDailyStreak(entries, '2026-04-29')
    expect(r.currentStreak).toBe(0)
    expect(r.longestStreak).toBe(2)
    expect(r.lastActiveDate).toBe('2026-04-28')
  })

  it('longestStreak は entries 範囲全体の最長を返す', () => {
    const entries = [
      // 5 連続
      E('2026-04-01', 60),
      E('2026-04-02', 60),
      E('2026-04-03', 60),
      E('2026-04-04', 60),
      E('2026-04-05', 60),
      // 抜け
      E('2026-04-29', 60),
    ]
    const r = computeDailyStreak(entries, '2026-04-29')
    expect(r.currentStreak).toBe(1)
    expect(r.longestStreak).toBe(5)
  })

  it('同日 multi-entry は合算で 1 active 日にまとめる', () => {
    const entries = [
      E('2026-04-29', 30),
      E('2026-04-29', 30),
      E('2026-04-29', 30), // 合算 90min、1 active 日
      E('2026-04-28', 60),
    ]
    const r = computeDailyStreak(entries, '2026-04-29')
    expect(r.currentStreak).toBe(2)
    expect(r.longestStreak).toBe(2)
  })

  it('durationMinutes=0 / 負 / NaN / Infinity の日は active 扱いしない', () => {
    const entries = [
      E('2026-04-29', 0),
      E('2026-04-29', NaN),
      E('2026-04-29', -10),
      E('2026-04-29', Infinity),
    ]
    const r = computeDailyStreak(entries, '2026-04-29')
    expect(r.currentStreak).toBe(0)
    expect(r.lastActiveDate).toBe(null)
  })

  it('不正 workDate は除外', () => {
    const entries = [E('not-a-date', 60), E('2026-04-29', 60)]
    const r = computeDailyStreak(entries, '2026-04-29')
    expect(r.currentStreak).toBe(1)
  })

  it('entries 空 / 全て非稼働は全 0 + lastActiveDate=null', () => {
    expect(computeDailyStreak([], '2026-04-29')).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    })
  })

  it('today が不正 ISO でも longestStreak と lastActiveDate は計算される', () => {
    const entries = [E('2026-04-28', 60), E('2026-04-29', 60)]
    const r = computeDailyStreak(entries, 'bad')
    expect(r.currentStreak).toBe(0)
    expect(r.longestStreak).toBe(2)
    expect(r.lastActiveDate).toBe('2026-04-29')
  })

  it('月跨ぎの連続稼働も正しくカウント', () => {
    const entries = [E('2026-04-30', 60), E('2026-05-01', 60), E('2026-05-02', 60)]
    const r = computeDailyStreak(entries, '2026-05-02')
    expect(r.currentStreak).toBe(3)
    expect(r.longestStreak).toBe(3)
  })

  it('1 日のみ稼働は currentStreak=1 / longestStreak=1', () => {
    const r = computeDailyStreak([E('2026-04-29', 30)], '2026-04-29')
    expect(r).toEqual({ currentStreak: 1, longestStreak: 1, lastActiveDate: '2026-04-29' })
  })
})

describe('formatStreakSummary', () => {
  it('稼働記録なし', () => {
    const r = computeDailyStreak([], '2026-04-29')
    expect(formatStreakSummary(r, '2026-04-29')).toBe('稼働記録: まだ無し')
  })

  it('currentStreak > 0 で longest と等しい場合は trail 無し', () => {
    const r = computeDailyStreak(
      [E('2026-04-29', 60), E('2026-04-28', 60), E('2026-04-27', 60)],
      '2026-04-29',
    )
    expect(formatStreakSummary(r, '2026-04-29')).toBe('連続稼働 3 日目')
  })

  it('currentStreak < longestStreak なら最長を併記', () => {
    const r = computeDailyStreak(
      [
        E('2026-04-01', 60),
        E('2026-04-02', 60),
        E('2026-04-03', 60),
        E('2026-04-04', 60),
        E('2026-04-29', 60),
      ],
      '2026-04-29',
    )
    expect(formatStreakSummary(r, '2026-04-29')).toBe('連続稼働 1 日目 (最長 4 日)')
  })

  it('today 非稼働、yesterday active は「昨日」表記', () => {
    const r = computeDailyStreak([E('2026-04-28', 60), E('2026-04-27', 60)], '2026-04-29')
    expect(formatStreakSummary(r, '2026-04-29')).toBe(
      '連続記録リセット: 昨日 2026-04-28 (最長 2 日)',
    )
  })

  it('today 非稼働、>=2 日前 active は日数表記', () => {
    const r = computeDailyStreak([E('2026-04-25', 60)], '2026-04-29')
    expect(formatStreakSummary(r, '2026-04-29')).toBe('連続記録リセット: 4 日前 (最長 1 日)')
  })

  it('today が不正でも last + longest を出す', () => {
    const r = computeDailyStreak([E('2026-04-29', 60)], 'bad')
    expect(formatStreakSummary(r, 'bad')).toBe('稼働記録: 最終 2026-04-29 (最長 1 日)')
  })
})
