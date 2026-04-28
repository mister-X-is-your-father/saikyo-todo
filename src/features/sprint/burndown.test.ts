import { describe, expect, it } from 'vitest'

import { computeSprintBurndown } from './burndown'

describe('computeSprintBurndown', () => {
  // 14 日 Sprint、5 日経過、進捗 5/14 (= 36%)、経過 5/14 (= 36%) → on-track
  it('14 日 Sprint で経過と完了がほぼ揃っていれば on-track', () => {
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-05-03',
      total: 14,
      done: 5,
      today: '2026-04-24',
    })
    expect(r.totalDays).toBe(14)
    expect(r.elapsedDays).toBe(5)
    expect(r.remainingDays).toBe(9)
    expect(r.elapsedPct).toBe(36)
    expect(r.completionPct).toBe(36)
    expect(r.isOnTrack).toBe(true)
  })

  it('総日数は両端含むので start = end でも 1', () => {
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-04-20',
      total: 0,
      done: 0,
      today: '2026-04-20',
    })
    expect(r.totalDays).toBe(1)
    expect(r.elapsedDays).toBe(1)
    expect(r.remainingDays).toBe(0)
    expect(r.elapsedPct).toBe(100)
  })

  it('開始前 (today < start) は elapsedDays=0 / remainingDays は end まで', () => {
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-05-03',
      total: 10,
      done: 0,
      today: '2026-04-15',
    })
    expect(r.elapsedDays).toBe(0)
    expect(r.elapsedPct).toBe(0)
    expect(r.remainingDays).toBe(18)
  })

  it('終了後 (today > end) は elapsedDays=totalDays / remainingDays=0', () => {
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-05-03',
      total: 10,
      done: 7,
      today: '2026-05-10',
    })
    expect(r.elapsedDays).toBe(14)
    expect(r.elapsedPct).toBe(100)
    expect(r.remainingDays).toBe(0)
    expect(r.completionPct).toBe(70)
    // 70% < 100 - 10 = 90 → 遅れ判定
    expect(r.isOnTrack).toBe(false)
  })

  it('total=0 (item 未割当) は常に on-track / completionPct=0', () => {
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-05-03',
      total: 0,
      done: 0,
      today: '2026-04-30',
    })
    expect(r.completionPct).toBe(0)
    expect(r.isOnTrack).toBe(true)
  })

  it('完了率が経過率 -10 ちょうどは on-track (境界)', () => {
    // 14 日中 10 日経過 (71%)、10 件中 6 件完了 (60%) → 60 ≥ 71-10=61? 60 < 61 → 遅れ
    // ピッタリ -10 を作るために done=8.4 にはできないので、
    // 10 件 / 6 件 (60%) → 経過 70% で boundary は 60 == 60 になる組み合わせを作る:
    // 14 日 / 経過 9.8 日… 整数で揃える: 10 日 / 経過 7 日 (70%)、10 件中 6 件完了 (60%) → 60 ≥ 60 → true
    // daysBetween(start, today) + 1 = 7 になる today: start=2026-04-20 → today=2026-04-26
    // total = max(1, 9 + 1) = 10
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-04-29',
      total: 10,
      done: 6,
      today: '2026-04-26',
    })
    expect(r.totalDays).toBe(10)
    expect(r.elapsedDays).toBe(7)
    expect(r.elapsedPct).toBe(70)
    expect(r.completionPct).toBe(60)
    expect(r.isOnTrack).toBe(true)
  })

  it('完了率が経過率 -10 を下回ると遅れ判定 (off-track)', () => {
    // 経過 70%、完了 50% (10 件中 5 件) → 50 < 70-10=60 → false
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-04-29',
      total: 10,
      done: 5,
      today: '2026-04-26',
    })
    expect(r.completionPct).toBe(50)
    expect(r.elapsedPct).toBe(70)
    expect(r.isOnTrack).toBe(false)
  })

  it('進みすぎ (完了率 > 経過率) も on-track', () => {
    // 経過 30%、完了 80% → 80 ≥ 30-10=20 → true
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-04-29',
      total: 10,
      done: 8,
      today: '2026-04-22',
    })
    expect(r.completionPct).toBe(80)
    expect(r.elapsedPct).toBe(30)
    expect(r.isOnTrack).toBe(true)
  })

  it('total<0 / done<0 は 0 にフロアしてから計算 (defensive)', () => {
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-04-29',
      total: -5,
      done: -3,
      today: '2026-04-22',
    })
    // total=0 扱い → completionPct=0 / on-track
    expect(r.completionPct).toBe(0)
    expect(r.isOnTrack).toBe(true)
  })

  it('done > total でも 100 を上限にせず計算 (% は 100 超えうるが警告しない)', () => {
    // 10 件中 12 件完了 (120%、楽観ロックや race で起こりうる) → 120% も on-track
    const r = computeSprintBurndown({
      startDate: '2026-04-20',
      endDate: '2026-04-29',
      total: 10,
      done: 12,
      today: '2026-04-22',
    })
    expect(r.completionPct).toBe(120)
    expect(r.isOnTrack).toBe(true)
  })

  it('不正 ISO は daysBetween=0 になり totalDays=1 にフォールバック (fail-soft)', () => {
    const r = computeSprintBurndown({
      startDate: 'garbage',
      endDate: 'garbage',
      total: 0,
      done: 0,
      today: '2026-04-22',
    })
    expect(r.totalDays).toBe(1)
    expect(r.elapsedPct).toBe(100) // elapsedDays=1, totalDays=1
  })
})
