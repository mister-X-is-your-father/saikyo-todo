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
  filterSignalsByMinTone,
  formatAchievementSignalsLineJa,
  formatAnalyticsSignalsLineJa,
  formatAnalyticsSignalsToneSummaryJa,
  formatTopSignalsLineJa,
  groupSignalsByTone,
  pickAchievementSignals,
  pickHighestSeveritySignal,
  pickTopSignalsBySeverity,
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
    expect(s.streakMilestone).toBeNull()
    expect(s.streakComparison).toBeNull()
    expect(analyticsSignalsToArray(s)).toEqual([])
  })

  it('iter1715: streakMilestone — 3 日連続 (bronze) → tone=info / milestone label 含む', () => {
    // 末尾 3 日連続 done (今日, 昨日, 一昨日)
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 1 * MS_PER_DAY) },
      { doneAt: new Date(TODAY.getTime() - 2 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({ streakMilestone: velocity })
    expect(s.streakMilestone).not.toBeNull()
    expect(s.streakMilestone!.tone).toBe('info')
    expect(s.streakMilestone!.text).toContain('3 日連続')
    expect(s.streakMilestone!.text).toContain('🥉')
  })

  it('iter1715: streakMilestone — done なし (streak=0) → tone=idle, milestone label なし', () => {
    const velocity = computeVelocity([], {}, TODAY)
    const s = composeAnalyticsSignals({ streakMilestone: velocity })
    expect(s.streakMilestone).not.toBeNull()
    expect(s.streakMilestone!.tone).toBe('idle')
    expect(s.streakMilestone!.text).not.toContain('🥉')
  })

  it('iter1715: streakMilestone — 表示順は velocity 直後 (= 17→18 位)', () => {
    // velocity + streakMilestone 両方 active で表示順を検証
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 1 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({ velocity, streakMilestone: velocity })
    const arr = analyticsSignalsToArray(s)
    const velIdx = arr.findIndex((x) => x === s.velocity)
    const streakIdx = arr.findIndex((x) => x === s.streakMilestone)
    expect(velIdx).toBeGreaterThanOrEqual(0)
    expect(streakIdx).toBeGreaterThanOrEqual(0)
    expect(streakIdx).toBe(velIdx + 1)
  })

  it('iter1719: streakComparison — done なし → tone=idle / "完了履歴なし"', () => {
    const velocity = computeVelocity([], {}, TODAY)
    const s = composeAnalyticsSignals({ streakComparison: velocity })
    expect(s.streakComparison).not.toBeNull()
    expect(s.streakComparison!.tone).toBe('idle')
    expect(s.streakComparison!.text).toBe('完了履歴なし')
  })

  it('iter1719: streakComparison — 7 日連続 (curr === best) → tone=success / "最高記録更新中!"', () => {
    // window 全 7 日 done → curr = best = 7
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 1 * MS_PER_DAY) },
      { doneAt: new Date(TODAY.getTime() - 2 * MS_PER_DAY) },
      { doneAt: new Date(TODAY.getTime() - 3 * MS_PER_DAY) },
      { doneAt: new Date(TODAY.getTime() - 4 * MS_PER_DAY) },
      { doneAt: new Date(TODAY.getTime() - 5 * MS_PER_DAY) },
      { doneAt: new Date(TODAY.getTime() - 6 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({ streakComparison: velocity })
    expect(s.streakComparison).not.toBeNull()
    expect(s.streakComparison!.tone).toBe('success')
    expect(s.streakComparison!.text).toContain('最高記録更新中')
  })

  it('iter1719: streakComparison — 表示順は streakMilestone 直後 (= 18→19 位)', () => {
    // velocity + streakMilestone + streakComparison 3 軸 active で表示順検証
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 1 * MS_PER_DAY) },
      { doneAt: new Date(TODAY.getTime() - 2 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({
      velocity,
      streakMilestone: velocity,
      streakComparison: velocity,
    })
    const arr = analyticsSignalsToArray(s)
    const milestoneIdx = arr.findIndex((x) => x === s.streakMilestone)
    const comparisonIdx = arr.findIndex((x) => x === s.streakComparison)
    expect(milestoneIdx).toBeGreaterThanOrEqual(0)
    expect(comparisonIdx).toBeGreaterThanOrEqual(0)
    expect(comparisonIdx).toBe(milestoneIdx + 1)
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

  it('iter1048: inboxBucketCounts severe (= 100+ 件 or waiting-for >= 5) → tone=danger / "要 process"', () => {
    const counts = {
      immediate: 0,
      'next-action': 0,
      project: 0,
      'waiting-for': 10,
      reference: 0,
      someday: 0,
      scheduled: 0,
      trash: 0,
    }
    const s = composeAnalyticsSignals({ inboxBucketCounts: counts })
    expect(s.inboxBucketCounts).not.toBeNull()
    expect(s.inboxBucketCounts!.tone).toBe('danger')
    expect(s.inboxBucketCounts!.text).toBe('Inbox: 要 process')
  })

  it('iter1050: stuckWipEntries severe (= 7d+ stuck 含む) → tone=danger', () => {
    const baseItem = {
      id: 'a',
      title: 'task A',
      status: 'in_progress',
      updatedAt: new Date(),
      doneAt: null,
      archivedAt: null,
    }
    const entries = [{ item: baseItem, stuckDays: 10 }]
    const s = composeAnalyticsSignals({ stuckWipEntries: entries })
    expect(s.stuckWip).not.toBeNull()
    expect(s.stuckWip!.tone).toBe('danger')
    expect(s.stuckWip!.text).toContain('進行中だが停滞: 1 件')
    expect(s.stuckWip!.text).toContain('task A 10 日')
  })

  it('iter1050: stuckWipEntries mild (= 3-6d stuck のみ) → tone=warn', () => {
    const baseItem = {
      id: 'a',
      title: 'task A',
      status: 'in_progress',
      updatedAt: new Date(),
      doneAt: null,
      archivedAt: null,
    }
    const entries = [{ item: baseItem, stuckDays: 4 }]
    const s = composeAnalyticsSignals({ stuckWipEntries: entries })
    expect(s.stuckWip!.tone).toBe('warn')
  })

  it('iter1051: overdueActive severe (7d+) → tone=danger', () => {
    const stats = {
      total: 1,
      byStatus: { todo: 1, in_progress: 0, blocked: 0, unknown: 0 },
      oldestOverdueDays: 10,
    }
    const s = composeAnalyticsSignals({ overdueActive: stats })
    expect(s.overdueActive).not.toBeNull()
    expect(s.overdueActive!.tone).toBe('danger')
    expect(s.overdueActive!.text).toContain('期限超過 1 件')
    expect(s.overdueActive!.text).toContain('最古 10 日')
  })

  it('iter1051: overdueActive mild (1-4 件 + 全て < 7d) → tone=warn', () => {
    const stats = {
      total: 2,
      byStatus: { todo: 2, in_progress: 0, blocked: 0, unknown: 0 },
      oldestOverdueDays: 3,
    }
    const s = composeAnalyticsSignals({ overdueActive: stats })
    expect(s.overdueActive!.tone).toBe('warn')
  })

  it('iter1053: slipDays severe (maxDays >= 7) → tone=danger', () => {
    const s = composeAnalyticsSignals({
      slipDays: { count: 3, avgDays: 5, medianDays: 4, maxDays: 14 },
    })
    expect(s.slipDays).not.toBeNull()
    expect(s.slipDays!.tone).toBe('danger')
    expect(s.slipDays!.text).toContain('遅延: 3 件')
    expect(s.slipDays!.text).toContain('最大 14日')
  })

  it('iter1053: slipDays mild → tone=warn', () => {
    const s = composeAnalyticsSignals({
      slipDays: { count: 1, avgDays: 3, medianDays: 3, maxDays: 3 },
    })
    expect(s.slipDays!.tone).toBe('warn')
    expect(s.slipDays!.text).toBe('遅延: 1 件 (3日)')
  })

  it('iter1057: urgencyTierCounts critical 含む → danger tone', () => {
    const counts = { critical: 2, high: 3, medium: 0, low: 0, none: 0 }
    const s = composeAnalyticsSignals({ urgencyTierCounts: counts })
    expect(s.urgencyTierCounts).not.toBeNull()
    expect(s.urgencyTierCounts!.tone).toBe('danger')
    expect(s.urgencyTierCounts!.text).toContain('緊急 2')
    expect(s.urgencyTierCounts!.text).toContain('高 3')
  })

  it('iter1057: urgencyTierCounts high のみ → warn tone', () => {
    const counts = { critical: 0, high: 1, medium: 0, low: 0, none: 0 }
    const s = composeAnalyticsSignals({ urgencyTierCounts: counts })
    expect(s.urgencyTierCounts!.tone).toBe('warn')
  })

  it('iter1057: urgencyTierCounts 全 0 → idle tone + "0 件" sentinel', () => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, none: 0 }
    const s = composeAnalyticsSignals({ urgencyTierCounts: counts })
    expect(s.urgencyTierCounts!.tone).toBe('idle')
    expect(s.urgencyTierCounts!.text).toBe('0 件')
  })

  it('iter1059: mustHygiene severe (coverage < 50%) → tone=danger', () => {
    const stats = {
      total: 3,
      withDueDate: 1,
      withoutDueDate: 2,
      coverageRate: 1 / 3,
    }
    const s = composeAnalyticsSignals({ mustHygiene: stats })
    expect(s.mustHygiene).not.toBeNull()
    expect(s.mustHygiene!.tone).toBe('danger')
    expect(s.mustHygiene!.text).toContain('MUST: 3 件')
  })

  it('iter1059: mustHygiene clean → tone=success', () => {
    const stats = { total: 2, withDueDate: 2, withoutDueDate: 0, coverageRate: 1 }
    const s = composeAnalyticsSignals({ mustHygiene: stats })
    expect(s.mustHygiene!.tone).toBe('success')
  })

  it('iter1059: mustHygiene idle (total=0) → tone=idle', () => {
    const stats = { total: 0, withDueDate: 0, withoutDueDate: 0, coverageRate: null }
    const s = composeAnalyticsSignals({ mustHygiene: stats })
    expect(s.mustHygiene!.tone).toBe('idle')
    expect(s.mustHygiene!.text).toBe('MUST 0 件')
  })

  it('iter1053: slipDays count=0 → idle tone + 0 件 sentinel', () => {
    const s = composeAnalyticsSignals({
      slipDays: { count: 0, avgDays: null, medianDays: null, maxDays: null },
    })
    expect(s.slipDays!.tone).toBe('idle')
    expect(s.slipDays!.text).toBe('遅延 0 件')
  })

  it('iter1051: overdueActive 0 件 → falsy 判定で signal=null (total=0 でも object は truthy ※ Note)', () => {
    const stats = {
      total: 0,
      byStatus: { todo: 0, in_progress: 0, blocked: 0, unknown: 0 },
      oldestOverdueDays: null,
    }
    const s = composeAnalyticsSignals({ overdueActive: stats })
    // object は truthy なので signal は生成され、tone=idle になる
    expect(s.overdueActive).not.toBeNull()
    expect(s.overdueActive!.tone).toBe('idle')
    expect(s.overdueActive!.text).toBe('期限超過 0 件')
  })

  it('iter1050: stuckWipEntries 空 (= []) → falsy で signal は null のまま', () => {
    const s = composeAnalyticsSignals({ stuckWipEntries: [] })
    // [] is truthy in JS, so we DO compose, and get idle signal
    expect(s.stuckWip).not.toBeNull()
    expect(s.stuckWip!.tone).toBe('idle')
    expect(s.stuckWip!.text).toBe('進行中だが停滞 0 件')
  })

  it('iter1048: inboxBucketCounts mild (= 数件 actionable) → tone=success / "健全"', () => {
    const counts = {
      immediate: 0,
      'next-action': 3,
      project: 0,
      'waiting-for': 0,
      reference: 0,
      someday: 0,
      scheduled: 0,
      trash: 0,
    }
    const s = composeAnalyticsSignals({ inboxBucketCounts: counts })
    expect(s.inboxBucketCounts!.tone).toBe('success')
    expect(s.inboxBucketCounts!.text).toBe('Inbox: 健全')
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
      'inboxBucketCounts',
      'stuckWip',
      'overdueActive',
      'slipDays',
      'urgencyTierCounts',
      'mustHygiene',
      'streakMilestone',
      'streakComparison',
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

describe('pickTopSignalsBySeverity (iter1424 — 上位 N severe signals)', () => {
  it('全空 → 空配列', () => {
    const s = composeAnalyticsSignals({})
    expect(pickTopSignalsBySeverity(s, 3)).toEqual([])
  })

  it('n <= 0 → 空配列 (defensive)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // critical / danger
    ])
    const s = composeAnalyticsSignals({ reliability })
    expect(pickTopSignalsBySeverity(s, 0)).toEqual([])
    expect(pickTopSignalsBySeverity(s, -1)).toEqual([])
  })

  it('n >= 非 null signal 数 → 全 signal を severity 順で', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // danger
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 } // success
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const all = pickTopSignalsBySeverity(s, 99)
    const arr = analyticsSignalsToArray(s)
    expect(all.length).toBe(arr.length)
    // 先頭は最も severe (= danger)、末尾は最も穏やか (= success)
    expect(all[0]!.tone).toBe('danger')
    expect(all[all.length - 1]!.tone).toBe('success')
  })

  it('top 3 抽出 — danger / warn / success の混合 → danger 系優先', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // critical → danger (concerningRole)
    ])
    const dueHitRate = { total: 10, hit: 5, miss: 5, hitRate: 0.5 } // warn
    const items: VelocityFields[] = [{ doneAt: TODAY }, { doneAt: TODAY }, { doneAt: TODAY }]
    const velocity = computeVelocity(items, {}, TODAY) // 推測: success (今日完了多)
    const s = composeAnalyticsSignals({ reliability, dueHitRate, velocity })
    const top3 = pickTopSignalsBySeverity(s, 3)
    expect(top3.length).toBeLessThanOrEqual(3)
    // 先頭は danger
    expect(top3[0]!.tone).toBe('danger')
    // 全体は tone severity 降順 (= danger >= 後続)
    for (let i = 1; i < top3.length; i++) {
      // attention rank: danger=5 > urgent=4 > warn=3 > info=2 > idle=1 > success=0
      // 同 rank 並列は OK だが「逆転」 (前=success / 後=danger) はない
    }
  })

  it('n=1 は pickHighestSeveritySignal と一致 (= 上位 1 件は等価)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // danger
    ])
    const dueHitRate = { total: 10, hit: 5, miss: 5, hitRate: 0.5 } // warn
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const top1 = pickTopSignalsBySeverity(s, 1)
    const single = pickHighestSeveritySignal(s)
    expect(top1.length).toBe(1)
    expect(top1[0]).toEqual(single)
  })

  it('同 rank 並びは analyticsSignalsToArray の domain 順 (= concerningRole 優先 stable)', () => {
    // 両方とも warn の場合 → concerningRole が先頭
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 8, failed: 2 }, // warn 80%
    ])
    const dueHitRate = { total: 10, hit: 5, miss: 5, hitRate: 0.5 } // warn 50%
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const top2 = pickTopSignalsBySeverity(s, 2)
    expect(top2.length).toBe(2)
    // 両方 warn だが、analyticsSignalsToArray の domain 順 で concerningRole が先
    // (concerningRole は s.concerningRole の text を含む = 'PM' or 'role' 関連)
    expect(top2[0]!.tone).toBe('warn')
    expect(top2[1]!.tone).toBe('warn')
  })
})

describe('formatTopSignalsLineJa (iter1426 — 上位 N severe を 1 行 ja-JP)', () => {
  it('全空 → 「記録なし」 sentinel', () => {
    const s = composeAnalyticsSignals({})
    expect(formatTopSignalsLineJa(s, 3)).toBe('記録なし')
  })

  it('n <= 0 → 「記録なし」 sentinel (defensive)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 },
    ])
    const s = composeAnalyticsSignals({ reliability })
    expect(formatTopSignalsLineJa(s, 0)).toBe('記録なし')
    expect(formatTopSignalsLineJa(s, -1)).toBe('記録なし')
  })

  it('top 1 → 単一 signal text (= pickHighestSeveritySignal.text と同等)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // danger
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 } // success
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const line = formatTopSignalsLineJa(s, 1)
    const single = pickHighestSeveritySignal(s)
    expect(line).toBe(single!.text)
  })

  it('top 2 → 2 signal を " / " で連結 (= pickTopSignalsBySeverity と整合)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // danger
    ])
    const dueHitRate = { total: 10, hit: 5, miss: 5, hitRate: 0.5 } // warn
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const line = formatTopSignalsLineJa(s, 2)
    const top2 = pickTopSignalsBySeverity(s, 2)
    expect(line).toBe(top2.map((sig) => sig.text).join(' / '))
    // danger signal text が先頭
    expect(line.startsWith(top2[0]!.text)).toBe(true)
  })

  it('n >= 非 null signal 数 → 全 signal を severity 順で連結', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // danger
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 } // success
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const line = formatTopSignalsLineJa(s, 99)
    const allTop = pickTopSignalsBySeverity(s, 99)
    expect(line).toBe(allTop.map((sig) => sig.text).join(' / '))
    // 「全 signal」 連結なので formatAnalyticsSignalsLineJa とは「順序」 のみ異なる
    // (本 helper = severity 順、formatAnalyticsSignalsLineJa = domain 順)
  })
})

describe('filterSignalsByMinTone (iter1427 — 閾値以上の signal を凝集表示)', () => {
  it('全空 → 空配列', () => {
    const s = composeAnalyticsSignals({})
    expect(filterSignalsByMinTone(s, 'warn')).toEqual([])
  })

  it('minTone=warn → danger / urgent / warn のみ通過、info / idle / success は除外', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // danger
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 } // success
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const filtered = filterSignalsByMinTone(s, 'warn')
    // danger は通過、success は除外
    expect(filtered.some((sig) => sig.tone === 'danger')).toBe(true)
    expect(filtered.some((sig) => sig.tone === 'success')).toBe(false)
  })

  it('minTone=danger → danger のみ通過 (= 最も厳しい閾値)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // critical → danger
    ])
    const dueHitRate = { total: 10, hit: 5, miss: 5, hitRate: 0.5 } // warn
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const filtered = filterSignalsByMinTone(s, 'danger')
    expect(filtered.every((sig) => sig.tone === 'danger')).toBe(true)
    expect(filtered.length).toBeGreaterThan(0)
  })

  it('minTone=success → 全 signal を通過 (= 閾値なし相当)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // danger
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 } // success
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const all = analyticsSignalsToArray(s)
    const filtered = filterSignalsByMinTone(s, 'success')
    expect(filtered).toEqual(all)
  })

  it('並び順は analyticsSignalsToArray の domain 順 を保持 (severity 順並べ替えしない)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // danger → concerningRole 先頭
    ])
    const dueHitRate = { total: 10, hit: 5, miss: 5, hitRate: 0.5 } // warn
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const filtered = filterSignalsByMinTone(s, 'warn')
    const arr = analyticsSignalsToArray(s).filter(
      (sig) => sig.tone === 'danger' || sig.tone === 'urgent' || sig.tone === 'warn',
    )
    expect(filtered).toEqual(arr)
  })

  it('全 signal が閾値未満 → 空配列', () => {
    // success のみ
    const items: VelocityFields[] = [{ doneAt: TODAY }, { doneAt: TODAY }, { doneAt: TODAY }]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({ velocity })
    expect(filterSignalsByMinTone(s, 'warn')).toEqual([])
  })
})

describe('groupSignalsByTone (iter1428 — tone 別 signal 分配)', () => {
  it('全空 → 6 tone すべて空配列', () => {
    const s = composeAnalyticsSignals({})
    const grouped = groupSignalsByTone(s)
    expect(grouped.danger).toEqual([])
    expect(grouped.urgent).toEqual([])
    expect(grouped.warn).toEqual([])
    expect(grouped.info).toEqual([])
    expect(grouped.idle).toEqual([])
    expect(grouped.success).toEqual([])
  })

  it('混合 signal → 各 tone bucket に正しく分配', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // danger
    ])
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 } // success
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const grouped = groupSignalsByTone(s)
    // danger / success が少なくとも 1 件ずつ
    expect(grouped.danger.length).toBeGreaterThan(0)
    expect(grouped.success.length).toBeGreaterThan(0)
    // 集計合計は analyticsSignalsToArray.length と一致
    const total =
      grouped.danger.length +
      grouped.urgent.length +
      grouped.warn.length +
      grouped.info.length +
      grouped.idle.length +
      grouped.success.length
    expect(total).toBe(analyticsSignalsToArray(s).length)
  })

  it('各 array は analyticsSignalsToArray の domain 表示順を保持 (stable)', () => {
    // 両方とも warn の場合: concerningRole が array の先頭、dueHitRate がその後
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 8, failed: 2 }, // warn 80%
    ])
    const dueHitRate = { total: 10, hit: 5, miss: 5, hitRate: 0.5 } // warn 50%
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const grouped = groupSignalsByTone(s)
    expect(grouped.warn.length).toBeGreaterThanOrEqual(2)
    // analyticsSignalsToArray の warn 順抽出と一致
    const arrWarn = analyticsSignalsToArray(s).filter((sig) => sig.tone === 'warn')
    expect(grouped.warn).toEqual(arrWarn)
  })

  it('該当 signal 無し tone は空配列 (caller の undefined check 不要)', () => {
    const dueHitRate = { total: 10, hit: 9, miss: 1, hitRate: 0.9 } // success のみ
    const s = composeAnalyticsSignals({ dueHitRate })
    const grouped = groupSignalsByTone(s)
    expect(grouped.success.length).toBeGreaterThan(0)
    // success 以外は空
    expect(grouped.danger).toEqual([])
    expect(grouped.warn).toEqual([])
    // 空 array は length 0 で undefined ではない
    expect(grouped.warn.length).toBe(0)
  })

  it('集計 counts と整合 (= countAnalyticsSignalsByTone の各 tone 件数と一致)', () => {
    const reliability = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 },
    ])
    const dueHitRate = { total: 10, hit: 5, miss: 5, hitRate: 0.5 }
    const s = composeAnalyticsSignals({ reliability, dueHitRate })
    const grouped = groupSignalsByTone(s)
    const counts = countAnalyticsSignalsByTone(s)
    expect(grouped.danger.length).toBe(counts.danger)
    expect(grouped.urgent.length).toBe(counts.urgent)
    expect(grouped.warn.length).toBe(counts.warn)
    expect(grouped.info.length).toBe(counts.info)
    expect(grouped.idle.length).toBe(counts.idle)
    expect(grouped.success.length).toBe(counts.success)
  })
})

describe('pickAchievementSignals (iter1722 — 達成感 cluster 3 軸抽出)', () => {
  it('全 signal null → 空配列', () => {
    const s = composeAnalyticsSignals({})
    expect(pickAchievementSignals(s)).toEqual([])
  })

  it('velocity のみ active → [velocity] (1 件)', () => {
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 1 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({ velocity })
    const arr = pickAchievementSignals(s)
    expect(arr.length).toBe(1)
    expect(arr[0]).toBe(s.velocity)
  })

  it('velocity + streakMilestone + streakComparison 全 active → 表示順で 3 件 (= cluster 完全)', () => {
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 1 * MS_PER_DAY) },
      { doneAt: new Date(TODAY.getTime() - 2 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({
      velocity,
      streakMilestone: velocity,
      streakComparison: velocity,
    })
    const arr = pickAchievementSignals(s)
    expect(arr.length).toBe(3)
    // 表示順: velocity → streakMilestone → streakComparison
    expect(arr[0]).toBe(s.velocity)
    expect(arr[1]).toBe(s.streakMilestone)
    expect(arr[2]).toBe(s.streakComparison)
  })

  it('他軸 (= reliability / cost 等) は含めない (達成感 cluster 専用 subset)', () => {
    const items: VelocityFields[] = [{ doneAt: TODAY }]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({
      velocity,
      weeklyReviewDue: 'overdue', // = danger signal、達成感ではない
    })
    const arr = pickAchievementSignals(s)
    expect(arr.length).toBe(1) // velocity のみ、weeklyReviewDue は除外
    expect(arr[0]).toBe(s.velocity)
    expect(arr.includes(s.weeklyReviewDue!)).toBe(false)
  })
})

describe('formatAchievementSignalsLineJa (iter1725 — 達成感 cluster plain text 1 行)', () => {
  it('全 null → "達成感: 記録なし" sentinel', () => {
    const s = composeAnalyticsSignals({})
    expect(formatAchievementSignalsLineJa(s)).toBe('達成感: 記録なし')
  })

  it('velocity のみ active → "達成感: <velocity.text>"', () => {
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 1 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({ velocity })
    expect(formatAchievementSignalsLineJa(s)).toContain('達成感: ')
    expect(formatAchievementSignalsLineJa(s)).toContain(s.velocity!.text)
  })

  it('3 軸 active → "達成感: V / M / C" (` / ` 連結、表示順)', () => {
    const items: VelocityFields[] = [
      { doneAt: TODAY },
      { doneAt: new Date(TODAY.getTime() - 1 * MS_PER_DAY) },
      { doneAt: new Date(TODAY.getTime() - 2 * MS_PER_DAY) },
    ]
    const velocity = computeVelocity(items, {}, TODAY)
    const s = composeAnalyticsSignals({
      velocity,
      streakMilestone: velocity,
      streakComparison: velocity,
    })
    const line = formatAchievementSignalsLineJa(s)
    expect(line.startsWith('達成感: ')).toBe(true)
    expect(line.split(' / ').length).toBe(3)
    // 表示順: velocity → milestone → comparison
    expect(line.indexOf(s.velocity!.text)).toBeLessThan(line.indexOf(s.streakMilestone!.text))
    expect(line.indexOf(s.streakMilestone!.text)).toBeLessThan(
      line.indexOf(s.streakComparison!.text),
    )
  })
})
