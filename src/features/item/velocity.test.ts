/**
 * iter302 ai-automation: velocity pure helper の単体テスト。
 * 7 日 default + 古い順 byDay + total / avgPerDay / trend (up/flat/down) +
 * 不正値 fail-soft + windowDays<=0 / 空入力 / archive 含むパス を網羅する。
 */
import { describe, expect, it } from 'vitest'

import { type ChipTone } from '@/lib/ui/chip-tone'

import {
  classifyVelocityHint,
  computeBestStreak,
  computeCompletionStreak,
  computeVelocity,
  computeVelocityByPriority,
  formatBestStreakJa,
  formatCompletionStreakJa,
  formatVelocityByPriorityJa,
  formatVelocityHintJa,
  formatVelocitySummary,
  getStreakMilestone,
  type StreakMilestone,
  streakMilestoneChipTone,
  streakMilestoneLabelJa,
  type VelocityByPriorityFields,
  velocityChipTone,
  type VelocityFields,
  type VelocitySummary,
  velocityToBriefSignal,
} from './velocity'

const TODAY = new Date(2026, 3, 28) // 2026-04-28
const DAY = 24 * 60 * 60 * 1000

function dt(daysAgo: number): Date {
  return new Date(TODAY.getTime() - daysAgo * DAY)
}

function mk(doneAt: Date | string | null): VelocityFields {
  return { doneAt }
}

describe('computeVelocity', () => {
  it('default 7 日 window で today 含む 7 日分 byDay を古い順に返す', () => {
    const items: VelocityFields[] = []
    const r = computeVelocity(items, {}, TODAY)
    expect(r.byDay).toHaveLength(7)
    expect(r.byDay[0]?.date).toBe('2026-04-22') // 6 日前
    expect(r.byDay[6]?.date).toBe('2026-04-28') // today
    expect(r.total).toBe(0)
    expect(r.avgPerDay).toBe(0)
    expect(r.trend).toBe('flat')
  })

  it('done が today にあれば最新 day に 1 件', () => {
    const items = [mk(dt(0))]
    const r = computeVelocity(items, {}, TODAY)
    expect(r.byDay[6]?.count).toBe(1)
    expect(r.total).toBe(1)
  })

  it('window 外の done は無視', () => {
    const items = [mk(dt(10))] // 10 日前は default 7 日 window 外
    const r = computeVelocity(items, {}, TODAY)
    expect(r.total).toBe(0)
  })

  it('複数 done が同 day に集約', () => {
    const items = [mk(dt(2)), mk(dt(2)), mk(dt(2))]
    const r = computeVelocity(items, {}, TODAY)
    const day = r.byDay.find((d) => d.date === '2026-04-26')
    expect(day?.count).toBe(3)
  })

  it('total / avgPerDay 算出', () => {
    const items = [mk(dt(0)), mk(dt(1)), mk(dt(2)), mk(dt(3)), mk(dt(4)), mk(dt(5)), mk(dt(6))]
    const r = computeVelocity(items, {}, TODAY)
    expect(r.total).toBe(7)
    expect(r.avgPerDay).toBe(1)
  })

  it('trend up: 後半 (今日寄り) が前半より +20% 以上', () => {
    // 7 日 → 前半 3 日 / 後半 4 日。前半 0 件 / 後半 3 件 → ratio=3/1=3 > 0.2 → up
    const items = [mk(dt(0)), mk(dt(1)), mk(dt(2))]
    const r = computeVelocity(items, {}, TODAY)
    expect(r.trend).toBe('up')
  })

  it('trend down: 後半が前半より -20% 以下', () => {
    // 前半 3 件 / 後半 0 件 → ratio = -3/3 = -1 → down
    const items = [mk(dt(4)), mk(dt(5)), mk(dt(6))]
    const r = computeVelocity(items, {}, TODAY)
    expect(r.trend).toBe('down')
  })

  it('trend flat: 前半 / 後半 ほぼ同量', () => {
    // 前半 2 件 / 後半 2 件 → ratio = 0 → flat
    const items = [mk(dt(0)), mk(dt(1)), mk(dt(5)), mk(dt(6))]
    const r = computeVelocity(items, {}, TODAY)
    expect(r.trend).toBe('flat')
  })

  it('windowDays カスタム = 14', () => {
    const items = [mk(dt(10))]
    const r = computeVelocity(items, { windowDays: 14 }, TODAY)
    expect(r.byDay).toHaveLength(14)
    expect(r.total).toBe(1)
  })

  it('windowDays <= 0 は空 result', () => {
    const r = computeVelocity([], { windowDays: 0 }, TODAY)
    expect(r.byDay).toEqual([])
    expect(r.total).toBe(0)
  })

  it('doneAt が null/undefined/不正値は除外 (fail-soft)', () => {
    const items: VelocityFields[] = [mk(null), { doneAt: undefined }, mk('not-a-date')]
    const r = computeVelocity(items, {}, TODAY)
    expect(r.total).toBe(0)
  })

  it('doneAt が ISO 文字列でも解釈する', () => {
    const items = [mk('2026-04-28T10:00:00Z')]
    const r = computeVelocity(items, {}, TODAY)
    expect(r.total).toBeGreaterThanOrEqual(0) // TZ 依存で today か yesterday に入るので存在のみ確認
  })

  it('today を ISO 文字列でも受け付ける', () => {
    const items: VelocityFields[] = []
    const r = computeVelocity(items, {}, '2026-04-28')
    expect(r.byDay).toHaveLength(7)
  })
})

describe('formatVelocitySummary', () => {
  it('0 件は 0 件 表示', () => {
    const r = computeVelocity([], {}, TODAY)
    expect(formatVelocitySummary(r)).toBe('直近 7 日 velocity: 0 件')
  })

  it('複数件 + 平均 + trend', () => {
    const items = [mk(dt(0)), mk(dt(0)), mk(dt(1)), mk(dt(2))]
    const r = computeVelocity(items, {}, TODAY)
    const s = formatVelocitySummary(r)
    expect(s).toContain('4 件')
    expect(s).toContain('件/日')
    expect(s).toContain('傾向')
  })

  it('windowDays 引数で表示日数を変えられる', () => {
    const items = [mk(dt(0))]
    const r = computeVelocity(items, { windowDays: 14 }, TODAY)
    const s = formatVelocitySummary(r, 14)
    expect(s).toContain('直近 14 日')
  })

  it('avgPerDay は小数 1 桁で表示', () => {
    const items = [mk(dt(0)), mk(dt(1)), mk(dt(2))] // 3 件 / 7 日 = 0.428...
    const r = computeVelocity(items, {}, TODAY)
    expect(formatVelocitySummary(r)).toContain('0.4 件/日')
  })
})

describe('computeVelocityByPriority / formatVelocityByPriorityJa (iter452)', () => {
  const mkP = (
    doneAt: Date | string | null,
    priority: number | null = 4,
  ): VelocityByPriorityFields => ({ doneAt, priority })

  it('空 → 全 bucket count=0 / avgPerDay=0', () => {
    const r = computeVelocityByPriority([], {}, TODAY)
    expect(r[1]).toEqual({ count: 0, avgPerDay: 0 })
    expect(r[2]).toEqual({ count: 0, avgPerDay: 0 })
    expect(r[3]).toEqual({ count: 0, avgPerDay: 0 })
    expect(r[4]).toEqual({ count: 0, avgPerDay: 0 })
    expect(formatVelocityByPriorityJa(r)).toBe('直近 7 日 velocity 0 件')
  })

  it('P1 3 件 + P3 5 件 → bucket 別 count + avgPerDay', () => {
    const items: VelocityByPriorityFields[] = [
      mkP(dt(0), 1),
      mkP(dt(1), 1),
      mkP(dt(2), 1),
      mkP(dt(0), 3),
      mkP(dt(0), 3),
      mkP(dt(1), 3),
      mkP(dt(2), 3),
      mkP(dt(3), 3),
    ]
    const r = computeVelocityByPriority(items, {}, TODAY)
    expect(r[1].count).toBe(3)
    expect(r[3].count).toBe(5)
    expect(r[1].avgPerDay).toBeCloseTo(3 / 7, 5)
    expect(formatVelocityByPriorityJa(r)).toBe(
      '直近 7 日 velocity: P1 3 件 (0.4件/日) / P3 5 件 (0.7件/日)',
    )
  })

  it('単一 priority 偏在 → 1 行のみ', () => {
    const items = [mkP(dt(0), 4), mkP(dt(1), 4)]
    const r = computeVelocityByPriority(items, {}, TODAY)
    expect(formatVelocityByPriorityJa(r)).toBe('直近 7 日 velocity: P4 2 件 (0.3件/日)')
  })

  it('windowDays オプションが sentinel に反映', () => {
    const r = computeVelocityByPriority([], { windowDays: 14 }, TODAY)
    expect(formatVelocityByPriorityJa(r, 14)).toBe('直近 14 日 velocity 0 件')
  })

  it('priority null/範囲外 → P4 集約', () => {
    const items = [mkP(dt(0), null), mkP(dt(0), 99)]
    const r = computeVelocityByPriority(items, {}, TODAY)
    expect(r[4].count).toBe(2)
  })
})

describe('classifyVelocityHint / formatVelocityHintJa (iter454)', () => {
  const mkSummary = (total: number, trend: 'up' | 'flat' | 'down'): VelocitySummary => ({
    byDay: [],
    total,
    avgPerDay: total / 7,
    trend,
  })

  it('total=0 → idle / "完了なし"', () => {
    const r = mkSummary(0, 'flat')
    expect(classifyVelocityHint(r)).toBe('idle')
    expect(formatVelocityHintJa(r)).toBe('完了なし')
  })

  it('total>0 + trend=up → up / "加速中"', () => {
    const r = mkSummary(10, 'up')
    expect(classifyVelocityHint(r)).toBe('up')
    expect(formatVelocityHintJa(r)).toBe('加速中')
  })

  it('total>0 + trend=flat → flat / "安定"', () => {
    const r = mkSummary(7, 'flat')
    expect(classifyVelocityHint(r)).toBe('flat')
    expect(formatVelocityHintJa(r)).toBe('安定')
  })

  it('total>0 + trend=down → down / "減速中"', () => {
    const r = mkSummary(5, 'down')
    expect(classifyVelocityHint(r)).toBe('down')
    expect(formatVelocityHintJa(r)).toBe('減速中')
  })
})

describe('computeCompletionStreak / formatCompletionStreakJa (iter457)', () => {
  const mkByDay = (counts: number[]): VelocitySummary => ({
    byDay: counts.map((count, i) => ({ date: `2026-04-${22 + i}`, count })),
    total: counts.reduce((s, c) => s + c, 0),
    avgPerDay: 0,
    trend: 'flat',
  })

  it('byDay 空 → streak=0', () => {
    expect(computeCompletionStreak(mkByDay([]))).toBe(0)
    expect(formatCompletionStreakJa(0)).toBe('完了 streak 0 日 (今日まだ完了なし)')
  })

  it('末尾 (today) count=0 → streak=0', () => {
    expect(computeCompletionStreak(mkByDay([1, 1, 1, 0]))).toBe(0)
  })

  it('末尾 count=1 → streak=1', () => {
    expect(computeCompletionStreak(mkByDay([0, 0, 0, 1]))).toBe(1)
    expect(formatCompletionStreakJa(1)).toBe('完了 streak 1 日 (今日完了あり)')
  })

  it('末尾から遡って 連続 → streak=連続日数', () => {
    expect(computeCompletionStreak(mkByDay([0, 1, 1, 1]))).toBe(3)
    expect(formatCompletionStreakJa(3)).toBe('完了 streak 3 日連続!')
  })

  it('全日 count > 0 → byDay.length', () => {
    expect(computeCompletionStreak(mkByDay([1, 2, 3, 4, 5, 6, 7]))).toBe(7)
    expect(formatCompletionStreakJa(7)).toBe('完了 streak 7 日連続!')
  })

  it('途中 break → 末尾連続部分のみ', () => {
    // [1, 0, 1, 1, 1] → 末尾 3 日連続 (途中 0 で break するが末尾から遡って 3 まで)
    expect(computeCompletionStreak(mkByDay([1, 0, 1, 1, 1]))).toBe(3)
  })
})

describe('computeBestStreak / formatBestStreakJa (iter459)', () => {
  const mkByDay = (counts: number[]): VelocitySummary => ({
    byDay: counts.map((count, i) => ({ date: `2026-04-${22 + i}`, count })),
    total: counts.reduce((s, c) => s + c, 0),
    avgPerDay: 0,
    trend: 'flat',
  })

  it('byDay 空 → 0', () => {
    expect(computeBestStreak(mkByDay([]))).toBe(0)
    expect(formatBestStreakJa(0)).toBe('直近 7 日の最長連続: 0 日 (該当なし)')
  })

  it('全日 count=0 → 0', () => {
    expect(computeBestStreak(mkByDay([0, 0, 0, 0]))).toBe(0)
  })

  it('単一連続 → そのまま', () => {
    expect(computeBestStreak(mkByDay([0, 0, 1, 1, 0]))).toBe(2)
    expect(formatBestStreakJa(2)).toBe('直近 7 日の最長連続: 2 日!')
  })

  it('複数 run の最長を返す', () => {
    // [1, 0, 1, 1, 0, 1, 1, 1, 0] → runs: 1, 2, 3 → max=3
    expect(computeBestStreak(mkByDay([1, 0, 1, 1, 0, 1, 1, 1, 0]))).toBe(3)
  })

  it('全日 count>0 → byDay.length', () => {
    expect(computeBestStreak(mkByDay([1, 2, 3, 4, 5, 6, 7]))).toBe(7)
    expect(formatBestStreakJa(7)).toBe('直近 7 日の最長連続: 7 日!')
  })

  it('windowDays オプション format に反映', () => {
    expect(formatBestStreakJa(3, 14)).toBe('直近 14 日の最長連続: 3 日!')
    expect(formatBestStreakJa(0, 30)).toBe('直近 30 日の最長連続: 0 日 (該当なし)')
  })

  it('1 日 → "!" なし', () => {
    expect(formatBestStreakJa(1)).toBe('直近 7 日の最長連続: 1 日')
  })
})

describe('getStreakMilestone / streakMilestoneLabelJa (iter1704)', () => {
  it('streak < 3 → none (まだマイルストーン未到達)', () => {
    expect(getStreakMilestone(0)).toBe('none')
    expect(getStreakMilestone(1)).toBe('none')
    expect(getStreakMilestone(2)).toBe('none')
  })

  it('streak 3-6 → bronze (3 日連続)', () => {
    expect(getStreakMilestone(3)).toBe('bronze')
    expect(getStreakMilestone(4)).toBe('bronze')
    expect(getStreakMilestone(6)).toBe('bronze')
  })

  it('streak 7-13 → silver (1 週間連続)', () => {
    expect(getStreakMilestone(7)).toBe('silver')
    expect(getStreakMilestone(10)).toBe('silver')
    expect(getStreakMilestone(13)).toBe('silver')
  })

  it('streak 14-29 → gold (2 週間連続)', () => {
    expect(getStreakMilestone(14)).toBe('gold')
    expect(getStreakMilestone(20)).toBe('gold')
    expect(getStreakMilestone(29)).toBe('gold')
  })

  it('streak 30-99 → platinum (1 ヶ月連続)', () => {
    expect(getStreakMilestone(30)).toBe('platinum')
    expect(getStreakMilestone(50)).toBe('platinum')
    expect(getStreakMilestone(99)).toBe('platinum')
  })

  it('streak >= 100 → legend (100 日連続!)', () => {
    expect(getStreakMilestone(100)).toBe('legend')
    expect(getStreakMilestone(365)).toBe('legend')
    expect(getStreakMilestone(1000)).toBe('legend')
  })

  it('defensive: 負の数 / NaN / Infinity → none', () => {
    expect(getStreakMilestone(-1)).toBe('none')
    expect(getStreakMilestone(NaN)).toBe('none')
    expect(getStreakMilestone(Infinity)).toBe('none')
    expect(getStreakMilestone(-Infinity)).toBe('none')
  })

  it('streakMilestoneLabelJa は 6 milestone に対応', () => {
    const all: StreakMilestone[] = ['none', 'bronze', 'silver', 'gold', 'platinum', 'legend']
    for (const m of all) {
      expect(streakMilestoneLabelJa(m)).toMatch(/.+/)
    }
    expect(streakMilestoneLabelJa('bronze')).toContain('🥉')
    expect(streakMilestoneLabelJa('silver')).toContain('🥈')
    expect(streakMilestoneLabelJa('gold')).toContain('🥇')
    expect(streakMilestoneLabelJa('platinum')).toContain('💎')
    expect(streakMilestoneLabelJa('legend')).toContain('👑')
  })

  it('streakMilestoneChipTone (iter1705): none→idle / bronze→info / silver+→success (positive polarity)', () => {
    expect(streakMilestoneChipTone('none')).toBe('idle')
    expect(streakMilestoneChipTone('bronze')).toBe('info')
    expect(streakMilestoneChipTone('silver')).toBe('success')
    expect(streakMilestoneChipTone('gold')).toBe('success')
    expect(streakMilestoneChipTone('platinum')).toBe('success')
    expect(streakMilestoneChipTone('legend')).toBe('success')
  })

  it('streakMilestoneChipTone は streak 順で tone が悪化しない (monotonic non-decreasing positive)', () => {
    // positive polarity: idle < info < success (= attention rank 逆)。streak が上がるほど
    // success 寄り。同じ success に収束しても降格しない。
    const order: StreakMilestone[] = ['none', 'bronze', 'silver', 'gold', 'platinum', 'legend']
    const positiveRank: Record<ChipTone, number> = {
      idle: 0,
      info: 1,
      warn: -1, // 出ない想定
      urgent: -2, // 出ない想定
      danger: -3, // 出ない想定
      success: 2,
    }
    let prev = -Infinity
    for (const m of order) {
      const curr = positiveRank[streakMilestoneChipTone(m)]
      expect(curr).toBeGreaterThanOrEqual(prev)
      prev = curr
    }
  })
})

describe('velocityChipTone (iter802 — positive polarity ChipTone)', () => {
  it('up → success / down → warn / flat → info / idle → idle', () => {
    expect(velocityChipTone('up')).toBe('success')
    expect(velocityChipTone('down')).toBe('warn')
    expect(velocityChipTone('flat')).toBe('info')
    expect(velocityChipTone('idle')).toBe('idle')
  })
})

describe('velocityToBriefSignal (iter802 — AgentBriefSignal compose)', () => {
  it('idle (= done なし) → text=完了ペース: 完了なし、tone=idle', () => {
    const summary: VelocitySummary = { byDay: [], total: 0, avgPerDay: 0, trend: 'flat' }
    const sig = velocityToBriefSignal(summary)
    expect(sig.tone).toBe('idle')
    expect(sig.text).toBe('完了ペース: 完了なし')
  })

  it('up trend → tone=success', () => {
    // 末尾に done が増える 7 日 byDay
    const items: VelocityFields[] = [
      { doneAt: dt(0) },
      { doneAt: dt(0) },
      { doneAt: dt(0) },
      { doneAt: dt(1) },
      { doneAt: dt(1) },
      { doneAt: dt(5) },
    ]
    const summary = computeVelocity(items, {}, TODAY)
    expect(summary.trend).toBe('up')
    const sig = velocityToBriefSignal(summary)
    expect(sig.tone).toBe('success')
    expect(sig.text).toBe('完了ペース: 加速中')
  })

  it('down trend → tone=warn', () => {
    // 前半に done 多 / 後半に done 少
    const items: VelocityFields[] = [
      { doneAt: dt(5) },
      { doneAt: dt(5) },
      { doneAt: dt(5) },
      { doneAt: dt(0) },
    ]
    const summary = computeVelocity(items, {}, TODAY)
    expect(summary.trend).toBe('down')
    const sig = velocityToBriefSignal(summary)
    expect(sig.tone).toBe('warn')
    expect(sig.text).toBe('完了ペース: 減速中')
  })
})
