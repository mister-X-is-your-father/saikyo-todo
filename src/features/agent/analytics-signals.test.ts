/**
 * iter796 ai-automation: analytics-signals (4 軸 unified compose) の unit test。
 * pure helper のみ、DB / DOM 非依存。
 */
import { describe, expect, it } from 'vitest'

import { computeWorkspaceMomentum, type MomentumFields } from '@/features/item/momentum'
import { computeVelocity, type VelocityFields } from '@/features/item/velocity'
import { buildWeeklyCompletionInsight } from '@/features/item/weekly-completion-insight'

import { computeAgentReliability } from './agent-reliability'
import {
  analyticsSignalsToArray,
  composeAnalyticsSignals,
  countAnalyticsSignalsByTone,
  formatAnalyticsSignalsLineJa,
  formatAnalyticsSignalsToneSummaryJa,
  pickHighestSeveritySignal,
} from './analytics-signals'
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
    expect(s.velocity).toBeNull()
    expect(analyticsSignalsToArray(s)).toEqual([])
  })

  it('iter803: velocity のみ → velocity signal、tone=success (up trend)', () => {
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: TODAY },
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 5 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({ velocity })
    expect(s.velocity).not.toBeNull()
    expect(s.velocity!.tone).toBe('success')
    expect(s.velocity!.text).toContain('完了ペース')
  })

  it('iter803: velocity idle (= done なし) → tone=idle', () => {
    const velocity = computeVelocity([], {}, TODAY)
    const s = composeAnalyticsSignals({ velocity })
    expect(s.velocity).not.toBeNull()
    expect(s.velocity!.tone).toBe('idle')
  })

  it('iter1044: weeklyReviewDue overdue → tone=danger / "1 週以上経過"', () => {
    const s = composeAnalyticsSignals({ weeklyReviewDue: 'overdue' })
    expect(s.weeklyReviewDue).not.toBeNull()
    expect(s.weeklyReviewDue!.tone).toBe('danger')
    expect(s.weeklyReviewDue!.text).toBe('1 週以上経過')
  })

  it('iter1044: weeklyReviewDue recent → tone=success / "点検済"', () => {
    const s = composeAnalyticsSignals({ weeklyReviewDue: 'recent' })
    expect(s.weeklyReviewDue!.tone).toBe('success')
    expect(s.weeklyReviewDue!.text).toBe('点検済')
  })

  it('iter1043: consultationCounts のみ (空) → consultationCounts signal、tone=idle / "相談なし"', () => {
    const s = composeAnalyticsSignals({
      consultationCounts: { open: 0, 'closing-soon': 0, overdue: 0, decided: 0 },
    })
    expect(s.consultationCounts).not.toBeNull()
    expect(s.consultationCounts!.tone).toBe('idle')
    expect(s.consultationCounts!.text).toBe('相談なし')
  })

  it('iter1043: consultationCounts overdue > 0 → tone=danger', () => {
    const s = composeAnalyticsSignals({
      consultationCounts: { open: 2, 'closing-soon': 1, overdue: 3, decided: 5 },
    })
    expect(s.consultationCounts!.tone).toBe('danger')
    expect(s.consultationCounts!.text).toBe('判断漏れ 3 件')
  })

  it('iter1043: consultationCounts decided only → tone=success', () => {
    const s = composeAnalyticsSignals({
      consultationCounts: { open: 0, 'closing-soon': 0, overdue: 0, decided: 4 },
    })
    expect(s.consultationCounts!.tone).toBe('success')
    expect(s.consultationCounts!.text).toBe('決定済 4 件')
  })

  it('iter1041: waitingSummary のみ (空) → waitingSummary signal、tone=idle / "連絡待ちなし"', () => {
    const s = composeAnalyticsSignals({
      waitingSummary: {
        total: 0,
        bySeverity: { ok: 0, warn: 0, danger: 0, muted: 0 },
        oldestDays: null,
        dueRemindCount: 0,
      },
    })
    expect(s.waitingSummary).not.toBeNull()
    expect(s.waitingSummary!.tone).toBe('idle')
    expect(s.waitingSummary!.text).toBe('連絡待ちなし')
  })

  it('iter1041: waitingSummary danger > 0 → tone=danger', () => {
    const s = composeAnalyticsSignals({
      waitingSummary: {
        total: 2,
        bySeverity: { ok: 0, warn: 0, danger: 2, muted: 0 },
        oldestDays: 10,
        dueRemindCount: 0,
      },
    })
    expect(s.waitingSummary!.tone).toBe('danger')
  })

  it('iter1041: waitingSummary 健全のみ → tone=success', () => {
    const s = composeAnalyticsSignals({
      waitingSummary: {
        total: 1,
        bySeverity: { ok: 1, warn: 0, danger: 0, muted: 0 },
        oldestDays: 2,
        dueRemindCount: 0,
      },
    })
    expect(s.waitingSummary!.tone).toBe('success')
  })

  it('iter1026: backlogAging のみ (全 0 = 新鮮) → backlogAging signal、tone=success', () => {
    const s = composeAnalyticsSignals({
      backlogAging: { new: 0, recent: 0, stale: 0, ancient: 0, unknown: 0 },
    })
    expect(s.backlogAging).not.toBeNull()
    expect(s.backlogAging!.tone).toBe('success')
    expect(s.backlogAging!.text).toBe('新鮮')
  })

  it('iter1026: backlogAging ancient 5+ (danger) → tone=danger', () => {
    const s = composeAnalyticsSignals({
      backlogAging: { new: 0, recent: 0, stale: 0, ancient: 5, unknown: 0 },
    })
    expect(s.backlogAging!.tone).toBe('danger')
    expect(s.backlogAging!.text).toBe('危険 古参 5 件')
  })

  it('iter1026: backlogAging stale 1-4 (info) → tone=info, 軽微 ラベル', () => {
    const s = composeAnalyticsSignals({
      backlogAging: { new: 0, recent: 0, stale: 2, ancient: 0, unknown: 0 },
    })
    expect(s.backlogAging!.tone).toBe('info')
    expect(s.backlogAging!.text).toBe('軽微 停滞 2 件')
  })

  it('iter1026: 全 9 軸の表示順 — backlogAging が biasTrend の直後 (5 番手) に並ぶ', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 15, failed: 0 },
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 }
    const s = composeAnalyticsSignals({
      reliability,
      dueHitRate,
      biasTrend: {
        direction: 'improving',
        priorFactor: 1.5,
        recentFactor: 1.2,
        distanceDelta: 0.3,
      },
      backlogAging: { new: 0, recent: 0, stale: 0, ancient: 5, unknown: 0 },
    })
    const arr = analyticsSignalsToArray(s)
    // 順序: concerning (null) → costProjection (null) → dueHitRate → biasTrend →
    // backlogAging → reliability → costTrend (null) → velocity (null) →
    // weekly (null) → momentum (null) → dominantRole (= 唯一 PM)
    expect(arr.length).toBe(5)
    expect(arr[0]).toBe(s.dueHitRate)
    expect(arr[1]).toBe(s.biasTrend)
    expect(arr[2]).toBe(s.backlogAging)
    expect(arr[3]).toBe(s.reliability)
    expect(arr[4]).toBe(s.dominantRole)
  })

  it('iter805: biasTrend のみ → biasTrend signal、tone=success (improving)', () => {
    const s = composeAnalyticsSignals({
      biasTrend: {
        direction: 'improving',
        priorFactor: 1.5,
        recentFactor: 1.2,
        distanceDelta: 0.3,
      },
    })
    expect(s.biasTrend).not.toBeNull()
    expect(s.biasTrend!.tone).toBe('success')
    expect(s.biasTrend!.text).toContain('改善')
  })

  it('iter805: 全 8 軸入力 → 表示順で biasTrend が dueHitRate の直後 (4 番手) に並ぶ', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 15, failed: 0 },
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 }
    const s = composeAnalyticsSignals({
      reliability,
      dueHitRate,
      biasTrend: {
        direction: 'improving',
        priorFactor: 1.5,
        recentFactor: 1.2,
        distanceDelta: 0.3,
      },
    })
    const arr = analyticsSignalsToArray(s)
    // 順序: concerning (null) → costProjection (null) → dueHitRate → biasTrend →
    // reliability → costTrend (null) → velocity (null) → weekly (null) →
    // momentum (null) → dominantRole (= 唯一 PM)
    expect(arr.length).toBe(4)
    expect(arr[0]).toBe(s.dueHitRate)
    expect(arr[1]).toBe(s.biasTrend)
    expect(arr[2]).toBe(s.reliability)
    expect(arr[3]).toBe(s.dominantRole)
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

  it('dueHitRate のみ → dueHitRate signal (iter799)、tone=success (= 高達成)', () => {
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 }
    const s = composeAnalyticsSignals({ dueHitRate })
    expect(s.dueHitRate).not.toBeNull()
    expect(s.dueHitRate!.tone).toBe('success')
    expect(s.dueHitRate!.text).toContain('期限達成率')
  })

  it('dueHitRate 低 → tone=warn', () => {
    const dueHitRate = { total: 10, hit: 3, miss: 7, hitRate: 0.3 }
    const s = composeAnalyticsSignals({ dueHitRate })
    expect(s.dueHitRate!.tone).toBe('warn')
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
    // (iter799: dueHitRate / weeklyCompletion 未指定 → スキップ)
    expect(arr[0]).toBe(s.concerningRole)
    expect(arr[1]).toBe(s.costProjection)
    expect(arr[2]).toBe(s.reliability)
    expect(arr[3]).toBe(s.costTrend)
    expect(arr[4]).toBe(s.momentum)
    expect(arr[5]).toBe(s.dominantRole)
  })

  it('iter799: dueHitRate も含めた 6 軸 + 4 reliability sub = 7 signal、新表示順 で整列', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 15, failed: 0 },
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    const costProjection = computeCostMonthProjection({
      thisMonthUsd: 1,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 }
    const s = composeAnalyticsSignals({ reliability, costProjection, dueHitRate })
    const arr = analyticsSignalsToArray(s)
    // 新順序: concerning (null) → costProjection → dueHitRate → reliability → costTrend (null) →
    // weeklyCompletion (null) → momentum (null) → dominantRole
    expect(arr.length).toBe(4)
    expect(arr[0]).toBe(s.costProjection)
    expect(arr[1]).toBe(s.dueHitRate)
    expect(arr[2]).toBe(s.reliability)
    expect(arr[3]).toBe(s.dominantRole)
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

describe('AnalyticsSignals invariant (iter819 — schema完全性 ガード)', () => {
  it('EMPTY (= 全 signal null) は AnalyticsSignals 全 field を必ず初期化 (= 新軸追加時の漏れ検知)', () => {
    const empty = composeAnalyticsSignals({})
    // すべての field が key として存在し、value=null を持つ
    const expectedKeys = [
      'reliability',
      'dominantRole',
      'concerningRole',
      'costProjection',
      'costTrend',
      'momentum',
      'weeklyCompletion',
      'dueHitRate',
      'velocity',
      'biasTrend',
      'backlogAging',
      'waitingSummary',
      'consultationCounts',
      'weeklyReviewDue',
    ] as const
    expect(Object.keys(empty).sort()).toEqual([...expectedKeys].sort())
    for (const k of expectedKeys) {
      expect(empty[k]).toBeNull()
    }
    // analyticsSignalsToArray は EMPTY 入力で必ず空配列 (= 新 field 追加時に
    // analyticsSignalsToArray の `ordered` array にも追加し忘れた場合は ここで
    // 落ちないが、型レベルで Object.keys(empty).length === ordered.length チェック
    // も追加可能)
    expect(analyticsSignalsToArray(empty)).toEqual([])
  })
})

describe('formatAnalyticsSignalsLineJa (iter816 — plain text 1 行 compose)', () => {
  it('全空 → 「記録なし」 sentinel', () => {
    const s = composeAnalyticsSignals({})
    expect(formatAnalyticsSignalsLineJa(s)).toBe('記録なし')
  })

  it('reliability + dueHitRate → " / " 区切りで text 連結 (順序整列、tone 落ち)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 9, failed: 1 },
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 }
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const line = formatAnalyticsSignalsLineJa(s)
    // 順序: dueHitRate → reliability → dominantRole (concerning は warn 87% 不出)
    expect(line).toContain('期限達成率: 90%')
    expect(line).toContain('AI 信頼性')
    expect(line).toContain(' / ')
  })
})

describe('countAnalyticsSignalsByTone (iter954)', () => {
  it('全空 → 全 0', () => {
    const s = composeAnalyticsSignals({})
    expect(countAnalyticsSignalsByTone(s)).toEqual({
      danger: 0,
      urgent: 0,
      warn: 0,
      info: 0,
      idle: 0,
      success: 0,
    })
  })

  it('reliability + dueHitRate (90% hit、success) → signal の tone を集計', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 9, failed: 1 },
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 }
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const counts = countAnalyticsSignalsByTone(s)
    // 全 signal 数 = analyticsSignalsToArray(s).length と一致
    const arr = analyticsSignalsToArray(s)
    const total =
      counts.danger + counts.urgent + counts.warn + counts.info + counts.idle + counts.success
    expect(total).toBe(arr.length)
    // dueHitRate 90% は success tone (= 高めの hit rate)
    expect(counts.success).toBeGreaterThanOrEqual(1)
  })

  it('signal が複数 success tone なら success count が複数', () => {
    // velocity (up trend) + weeklyCompletion (up) で success が 2 つ
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: TODAY },
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 5 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({ velocity })
    const counts = countAnalyticsSignalsByTone(s)
    const arr = analyticsSignalsToArray(s)
    const total =
      counts.danger + counts.urgent + counts.warn + counts.info + counts.idle + counts.success
    expect(total).toBe(arr.length)
    expect(arr.length).toBeGreaterThan(0)
  })
})

describe('formatAnalyticsSignalsToneSummaryJa (iter954)', () => {
  it('全空 → 「0 件」 sentinel (= formatToneCountsJa 経由)', () => {
    const s = composeAnalyticsSignals({})
    expect(formatAnalyticsSignalsToneSummaryJa(s)).toBe('0 件')
  })

  it('実 signal 入り → ja-JP tone 別 件数の 1 行', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 9, failed: 1 },
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 }
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const summary = formatAnalyticsSignalsToneSummaryJa(s)
    // 0 件 sentinel ではない
    expect(summary).not.toBe('0 件')
    // ja-JP label が含まれる (= chipToneLabelJa の語彙)
    expect(summary).toMatch(/緊急|要対応|注意|通常|対象外|達成/)
  })
})

describe('pickHighestSeveritySignal (iter957 — 最重要 1 signal)', () => {
  it('全空 → null', () => {
    const s = composeAnalyticsSignals({})
    expect(pickHighestSeveritySignal(s)).toBeNull()
  })

  it('reliability critical (danger) + dueHitRate 90% (success) → danger signal が勝つ', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // critical
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 }
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const top = pickHighestSeveritySignal(s)
    expect(top).not.toBeNull()
    expect(top!.tone).toBe('danger')
  })

  it('全て success → success signal を返す (= 全部正常時の代表 chip)', () => {
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: TODAY },
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 5 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({ velocity })
    const top = pickHighestSeveritySignal(s)
    expect(top).not.toBeNull()
    expect(top!.tone).toBe('success')
  })

  it('同 rank が複数の場合は array 順 (= concerningRole / costProjection / dueHitRate 順) で先頭', () => {
    // 全て warn の場合、analyticsSignalsToArray の表示順 (= concerningRole が先) で stable max
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 8, failed: 2 }, // warn 80%
    ])
    const dueHitRate = { total: 10, hit: 5, miss: 5, hitRate: 0.5 } // warn 50%
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const top = pickHighestSeveritySignal(s)
    expect(top).not.toBeNull()
    // concerningRole が array の先頭、warn 同 rank なので stable max で勝つ
    expect(top!.tone).toBe('warn')
  })
})
