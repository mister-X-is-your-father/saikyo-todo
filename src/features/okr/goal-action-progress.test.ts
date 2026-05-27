import { describe, expect, it } from 'vitest'

import {
  type ActionItemProgressInput,
  computeGoalActionProgress,
  formatGoalActionProgressJa,
} from './goal-action-progress'

function it_(done: boolean, weight?: number): ActionItemProgressInput {
  return weight === undefined ? { done } : { done, weight }
}

describe('computeGoalActionProgress', () => {
  it('空 → 全 0', () => {
    expect(computeGoalActionProgress([])).toEqual({
      total: 0,
      doneCount: 0,
      pct: 0,
      weightedPct: 0,
    })
  })

  it('重みなし → 件数ベース %', () => {
    const r = computeGoalActionProgress([it_(true), it_(true), it_(true), it_(false), it_(false)])
    expect(r.total).toBe(5)
    expect(r.doneCount).toBe(3)
    expect(r.pct).toBe(60)
    expect(r.weightedPct).toBe(60) // 重み均一なので一致
  })

  it('重み付き → 重要 item の done が効く', () => {
    // done: weight3、未done: weight1 ×2 → weighted = 3/(3+1+1)=60%、件数=1/3=33%
    const r = computeGoalActionProgress([it_(true, 3), it_(false, 1), it_(false, 1)])
    expect(r.pct).toBe(33)
    expect(r.weightedPct).toBe(60)
  })

  it('不正 weight (負/NaN/null) は 1 に正規化', () => {
    const r = computeGoalActionProgress([
      it_(true, -5),
      it_(false, NaN),
      { done: false, weight: null },
    ])
    // 全 weight=1 扱い → done 1/3 = 33%、weighted も 33%
    expect(r.pct).toBe(33)
    expect(r.weightedPct).toBe(33)
  })

  it('全 done → 100%', () => {
    const r = computeGoalActionProgress([it_(true), it_(true)])
    expect(r.pct).toBe(100)
    expect(r.weightedPct).toBe(100)
  })
})

describe('formatGoalActionProgressJa', () => {
  it('紐付けなし', () => {
    expect(formatGoalActionProgressJa(computeGoalActionProgress([]))).toBe('紐付け action なし')
  })
  it('重み均一 → 重み付き表記なし', () => {
    expect(formatGoalActionProgressJa(computeGoalActionProgress([it_(true), it_(false)]))).toBe(
      '目標達成 50% (1/2)',
    )
  })
  it('重み付きで pct と異なる → 重み付き明示', () => {
    expect(
      formatGoalActionProgressJa(
        computeGoalActionProgress([it_(true, 3), it_(false, 1), it_(false, 1)]),
      ),
    ).toBe('目標達成 60% (1/3、重み付き)')
  })
})
