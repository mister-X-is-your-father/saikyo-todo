/**
 * iter299 ai-automation: goal-health pure helper の単体検証。
 * Sprint burndown (iter285) の goal 版なので boundary を入念に押さえる。
 */
import { describe, expect, it } from 'vitest'

import {
  computeGoalHealth,
  countGoalsByHealth,
  formatGoalHealthCounts,
  type GoalHealthTier,
  goalHealthTierLabel,
  groupGoalsByHealth,
} from './goal-health'

// 30 日 Goal: 2026-04-01 ~ 2026-04-30 (totalDays=30)
const START = '2026-04-01'
const END = '2026-04-30'

// today は文字列 ISO で渡す (関数 sig 通り)
const TODAY_BEFORE = '2026-03-15' // 開始前
const TODAY_DAY1 = '2026-04-01' // 1 日目 (経過率 1/30 ≈ 3.3%)
const TODAY_DAY15 = '2026-04-15' // 50% 経過 (= 15/30 = 50%)
const TODAY_AFTER = '2026-05-15' // 終了後

describe('computeGoalHealth — achieved (達成)', () => {
  it('pct >= 1.0 は期間中でも achieved', () => {
    const h = computeGoalHealth({ pct: 1.0, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('achieved')
    expect(h.label).toBe('達成')
  })

  it('pct > 1.0 (超過達成) でも achieved', () => {
    const h = computeGoalHealth({ pct: 1.5, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('achieved')
    expect(h.gapPct).toBeCloseTo(0.5)
  })

  it('期間後でも pct=1.0 なら achieved (= 期限内達成済)', () => {
    const h = computeGoalHealth({ pct: 1.0, startDate: START, endDate: END, today: TODAY_AFTER })
    expect(h.tier).toBe<GoalHealthTier>('achieved')
  })
})

describe('computeGoalHealth — idle (期間外)', () => {
  it('開始前 (today < startDate) は idle', () => {
    const h = computeGoalHealth({ pct: 0, startDate: START, endDate: END, today: TODAY_BEFORE })
    expect(h.tier).toBe<GoalHealthTier>('idle')
    expect(h.elapsedPct).toBe(0)
  })

  it('期間後 (today > endDate) で pct < 1.0 は idle (期限切れ未達成)', () => {
    const h = computeGoalHealth({ pct: 0.5, startDate: START, endDate: END, today: TODAY_AFTER })
    expect(h.tier).toBe<GoalHealthTier>('idle')
    expect(h.elapsedPct).toBe(1)
  })

  it('開始前 + pct=0.5 でも idle 優先 (まだ判定しない期間)', () => {
    const h = computeGoalHealth({ pct: 0.5, startDate: START, endDate: END, today: TODAY_BEFORE })
    expect(h.tier).toBe<GoalHealthTier>('idle')
  })
})

describe('computeGoalHealth — on-track (順調)', () => {
  it('完了率が経過率と一致 (50%/50%) は on-track', () => {
    const h = computeGoalHealth({ pct: 0.5, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('on-track')
  })

  it('完了率が経過率より先行 (70%/50%) も on-track', () => {
    const h = computeGoalHealth({ pct: 0.7, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('on-track')
    expect(h.gapPct).toBeCloseTo(0.2)
  })

  it('完了率が経過率の -10% 以内 (40%/50%) は on-track (10% buffer)', () => {
    const h = computeGoalHealth({ pct: 0.4, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('on-track')
    expect(h.gapPct).toBeCloseTo(-0.1)
  })

  it('Day1 で pct=0 でも on-track (経過率 ≈ 3.3% で gap=-3.3% < 10%)', () => {
    const h = computeGoalHealth({ pct: 0, startDate: START, endDate: END, today: TODAY_DAY1 })
    expect(h.tier).toBe<GoalHealthTier>('on-track')
  })
})

describe('computeGoalHealth — at-risk (やや遅れ)', () => {
  it('完了率が経過率の -10% を超え -30% 以内 (25%/50%) は at-risk', () => {
    const h = computeGoalHealth({ pct: 0.25, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('at-risk')
  })

  it('境界 -10% 直後 (39%/50%) は at-risk', () => {
    const h = computeGoalHealth({ pct: 0.39, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('at-risk')
  })

  it('境界 -30% ちょうど (20%/50%) は at-risk', () => {
    const h = computeGoalHealth({ pct: 0.2, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('at-risk')
  })
})

describe('computeGoalHealth — behind (遅延)', () => {
  it('完了率が経過率の -30% を超えて遅れ (10%/50%) は behind', () => {
    const h = computeGoalHealth({ pct: 0.1, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('behind')
  })

  it('完了率 0 + 50% 経過 → behind', () => {
    const h = computeGoalHealth({ pct: 0, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('behind')
  })

  it('境界 -30% ぎり超 (19%/50%) は behind', () => {
    const h = computeGoalHealth({ pct: 0.19, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('behind')
  })
})

describe('computeGoalHealth — fail-soft', () => {
  it('pct=NaN は 0 扱い', () => {
    const h = computeGoalHealth({
      pct: Number.NaN,
      startDate: START,
      endDate: END,
      today: TODAY_DAY15,
    })
    expect(h.tier).toBe<GoalHealthTier>('behind')
    expect(h.gapPct).toBeCloseTo(-0.5)
  })

  it('pct 負値は 0 にクランプ', () => {
    const h = computeGoalHealth({ pct: -0.5, startDate: START, endDate: END, today: TODAY_DAY15 })
    expect(h.tier).toBe<GoalHealthTier>('behind') // 0% / 50% → -50% gap
  })

  it('start = end (1 日 Goal) でも 0 除算しない', () => {
    const h = computeGoalHealth({
      pct: 0.5,
      startDate: '2026-04-15',
      endDate: '2026-04-15',
      today: '2026-04-15',
    })
    // 1 日完結で当日は 100% 経過 → 50% 完了は behind
    expect(h.tier).toBe<GoalHealthTier>('behind')
    expect(h.elapsedPct).toBe(1)
  })
})

describe('goalHealthTierLabel', () => {
  it('5 tier の日本語短ラベルを返す', () => {
    expect(goalHealthTierLabel('achieved')).toBe('達成')
    expect(goalHealthTierLabel('on-track')).toBe('順調')
    expect(goalHealthTierLabel('at-risk')).toBe('やや遅れ')
    expect(goalHealthTierLabel('behind')).toBe('遅延')
    expect(goalHealthTierLabel('idle')).toBe('期間外')
  })
})

describe('groupGoalsByHealth', () => {
  it('各 tier に正しく振り分ける', () => {
    const goals = [
      { pct: 1.0, startDate: START, endDate: END }, // achieved
      { pct: 0.5, startDate: START, endDate: END }, // on-track (50%/50%)
      { pct: 0.25, startDate: START, endDate: END }, // at-risk (25%/50%)
      { pct: 0.1, startDate: START, endDate: END }, // behind (10%/50%)
      { pct: 0.0, startDate: '2099-01-01', endDate: '2099-12-31' }, // idle (期間前)
    ]
    const groups = groupGoalsByHealth(goals, TODAY_DAY15)
    expect(groups.achieved).toHaveLength(1)
    expect(groups['on-track']).toHaveLength(1)
    expect(groups['at-risk']).toHaveLength(1)
    expect(groups.behind).toHaveLength(1)
    expect(groups.idle).toHaveLength(1)
  })

  it('空配列 → 全 tier 空で初期化', () => {
    const groups = groupGoalsByHealth([], TODAY_DAY15)
    expect(groups.achieved).toEqual([])
    expect(groups['on-track']).toEqual([])
    expect(groups['at-risk']).toEqual([])
    expect(groups.behind).toEqual([])
    expect(groups.idle).toEqual([])
  })

  it('元配列順を保つ stable group 化', () => {
    const A = { pct: 0.5, startDate: START, endDate: END }
    const B = { pct: 0.6, startDate: START, endDate: END }
    const C = { pct: 0.7, startDate: START, endDate: END }
    const groups = groupGoalsByHealth([A, B, C], TODAY_DAY15)
    expect(groups['on-track'][0]).toBe(A)
    expect(groups['on-track'][1]).toBe(B)
    expect(groups['on-track'][2]).toBe(C)
  })
})

describe('countGoalsByHealth', () => {
  it('tier 別件数を返す', () => {
    const goals = [
      { pct: 1.0, startDate: START, endDate: END }, // achieved
      { pct: 1.0, startDate: START, endDate: END }, // achieved
      { pct: 0.5, startDate: START, endDate: END }, // on-track
      { pct: 0.0, startDate: START, endDate: END }, // behind
    ]
    expect(countGoalsByHealth(goals, TODAY_DAY15)).toEqual({
      achieved: 2,
      'on-track': 1,
      'at-risk': 0,
      behind: 1,
      idle: 0,
    })
  })

  it('空配列 → 全 0', () => {
    expect(countGoalsByHealth([], TODAY_DAY15)).toEqual({
      achieved: 0,
      'on-track': 0,
      'at-risk': 0,
      behind: 0,
      idle: 0,
    })
  })
})

describe('formatGoalHealthCounts', () => {
  it('件数 0 の tier を省略し tier 順で連結', () => {
    expect(
      formatGoalHealthCounts({ achieved: 1, 'on-track': 2, 'at-risk': 0, behind: 1, idle: 0 }),
    ).toBe('達成 1 / 順調 2 / 遅延 1')
  })

  it('全 0 → "0 件"', () => {
    expect(
      formatGoalHealthCounts({ achieved: 0, 'on-track': 0, 'at-risk': 0, behind: 0, idle: 0 }),
    ).toBe('0 件')
  })

  it('単一 tier も順序を保つ', () => {
    expect(
      formatGoalHealthCounts({ achieved: 0, 'on-track': 0, 'at-risk': 3, behind: 0, idle: 0 }),
    ).toBe('やや遅れ 3')
  })

  it('tier 順は achieved → on-track → at-risk → behind → idle', () => {
    expect(
      formatGoalHealthCounts({ achieved: 1, 'on-track': 0, 'at-risk': 0, behind: 0, idle: 1 }),
    ).toBe('達成 1 / 期間外 1')
  })
})
