/**
 * iter796 ai-automation: analytics-signals (4 軸 unified compose) の unit test。
 * pure helper のみ、DB / DOM 非依存。
 */
import { describe, expect, it } from 'vitest'

import { computeWorkspaceMomentum, type MomentumFields } from '@/features/item/momentum'
import { buildWeeklyCompletionInsight } from '@/features/item/weekly-completion-insight'

import { computeAgentReliability } from './agent-reliability'
import { analyticsSignalsToArray, composeAnalyticsSignals } from './analytics-signals'
import { computeCostMonthProjection } from './cost-month-projection'
import { computeMonthlyCostTrend, type CostMonthEntry } from './cost-monthly-trend'

const TODAY = new Date('2026-04-29T00:00:00Z')
const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysAgo(n: number): string {
  return new Date(TODAY.getTime() - n * MS_PER_DAY + 12 * 60 * 60 * 1000).toISOString()
}

describe('composeAnalyticsSignals (4 軸 unified compose)', () => {
  it('全入力 null → 全 signal null (= 空配列)', () => {
    const s = composeAnalyticsSignals({})
    expect(s.reliability).toBeNull()
    expect(s.dominantRole).toBeNull()
    expect(s.concerningRole).toBeNull()
    expect(s.costProjection).toBeNull()
    expect(s.costTrend).toBeNull()
    expect(s.momentum).toBeNull()
    expect(s.weeklyCompletion).toBeNull()
    expect(analyticsSignalsToArray(s)).toEqual([])
  })

  it('weeklyCompletion のみ → weeklyCompletion signal (iter797)', () => {
    const insight = buildWeeklyCompletionInsight(
      [{ doneAt: new Date(2026, 3, 28, 12, 0, 0) }, { doneAt: new Date(2026, 3, 29, 12, 0, 0) }],
      new Date(2026, 3, 30, 12, 0, 0),
    )
    const s = composeAnalyticsSignals({ weeklyCompletion: insight })
    expect(s.weeklyCompletion).not.toBeNull()
    expect(s.weeklyCompletion!.tone).toBe('success') // up = 完了 増 = 達成
  })

  it('reliability のみ → reliability + dominant signal (healthy/dominant あり)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 15, failed: 0 },
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    const s = composeAnalyticsSignals({ reliability })
    expect(s.reliability).not.toBeNull()
    expect(s.dominantRole).not.toBeNull()
    expect(s.concerningRole).toBeNull() // healthy のみなので弱点無し
    expect(s.costProjection).toBeNull()
    expect(s.costTrend).toBeNull()
    expect(s.momentum).toBeNull()
  })

  it('reliability critical → concerningRole signal も含む 3 件', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 },
    ])
    const s = composeAnalyticsSignals({ reliability })
    expect(s.concerningRole).not.toBeNull()
    expect(s.concerningRole!.tone).toBe('danger')
  })

  it('cost-projection のみ → costProjection signal', () => {
    const costProjection = computeCostMonthProjection({
      thisMonthUsd: 1,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    const s = composeAnalyticsSignals({ costProjection })
    expect(s.costProjection).not.toBeNull()
    expect(s.costProjection!.tone).toBe('info') // safe
  })

  it('cost-trend のみ → costTrend signal', () => {
    const entries: CostMonthEntry[] = [
      { month: '2026-04', costUsd: 1.5 },
      { month: '2026-03', costUsd: 1.0 },
    ]
    const costTrend = computeMonthlyCostTrend(entries, '2026-04-29')
    const s = composeAnalyticsSignals({ costTrend })
    expect(s.costTrend).not.toBeNull()
    expect(s.costTrend!.tone).toBe('warn') // up = cost 増 = 警戒
  })

  it('momentum のみ → momentum signal', () => {
    const items: MomentumFields[] = [
      { createdAt: daysAgo(1), doneAt: null },
      { createdAt: daysAgo(2), doneAt: null },
      { createdAt: daysAgo(3), doneAt: null },
      { createdAt: daysAgo(20), doneAt: daysAgo(1) },
    ]
    const momentum = computeWorkspaceMomentum(items, {}, TODAY)
    const s = composeAnalyticsSignals({ momentum })
    expect(s.momentum).not.toBeNull()
    expect(s.momentum!.tone).toBe('warn') // growing
  })

  it('全 4 軸入力 → 6 signal 全部埋まる (concerningRole 含む)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 6, failed: 4 }, // critical
    ])
    const costProjection = computeCostMonthProjection({
      thisMonthUsd: 6,
      today: '2026-04-30',
      monthlyLimitUsd: 5,
    })
    const costTrend = computeMonthlyCostTrend(
      [
        { month: '2026-04', costUsd: 1.5 },
        { month: '2026-03', costUsd: 1.0 },
      ],
      '2026-04-29',
    )
    const momentum = computeWorkspaceMomentum(
      [
        { createdAt: daysAgo(1), doneAt: null },
        { createdAt: daysAgo(2), doneAt: null },
        { createdAt: daysAgo(3), doneAt: null },
        { createdAt: daysAgo(20), doneAt: daysAgo(1) },
      ],
      {},
      TODAY,
    )
    const s = composeAnalyticsSignals({ reliability, costProjection, costTrend, momentum })
    expect(s.reliability).not.toBeNull()
    expect(s.dominantRole).not.toBeNull()
    expect(s.concerningRole).not.toBeNull()
    expect(s.costProjection).not.toBeNull()
    expect(s.costTrend).not.toBeNull()
    expect(s.momentum).not.toBeNull()

    const arr = analyticsSignalsToArray(s)
    expect(arr.length).toBe(6)
    // 表示順: concerning (severity 1) → costProjection → reliability → costTrend → momentum → dominantRole
    expect(arr[0]).toBe(s.concerningRole)
    expect(arr[1]).toBe(s.costProjection)
    expect(arr[2]).toBe(s.reliability)
    expect(arr[3]).toBe(s.costTrend)
    expect(arr[4]).toBe(s.momentum)
    expect(arr[5]).toBe(s.dominantRole)
  })
})

describe('analyticsSignalsToArray (順序 + null 除去)', () => {
  it('部分入力 → null 除去で順序保持', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 15, failed: 0 },
    ])
    const momentum = computeWorkspaceMomentum([{ createdAt: daysAgo(1), doneAt: null }], {}, TODAY)
    const s = composeAnalyticsSignals({ reliability, momentum })
    const arr = analyticsSignalsToArray(s)
    // concerning (null) スキップ → costProjection (null) スキップ → reliability (有) →
    // costTrend (null) スキップ → momentum (有) → dominantRole (有)
    expect(arr.length).toBe(3)
    expect(arr[0]).toBe(s.reliability)
    expect(arr[1]).toBe(s.momentum)
    expect(arr[2]).toBe(s.dominantRole)
  })
})
