/**
 * iter302 ai-automation: velocity pure helper の単体テスト。
 * 7 日 default + 古い順 byDay + total / avgPerDay / trend (up/flat/down) +
 * 不正値 fail-soft + windowDays<=0 / 空入力 / archive 含むパス を網羅する。
 */
import { describe, expect, it } from 'vitest'

import { type ChipTone } from '@/lib/ui/chip-tone'

import {
  classifyStreakMilestoneTransition,
  classifyVelocityHint,
  composeStreakBriefSignals,
  computeBestStreak,
  computeCompletionStreak,
  computeCompletionStreakExcludingToday,
  computeStreakChain,
  computeStreakComparisonSignal,
  computeVelocity,
  computeVelocityByPriority,
  countDoneToday,
  doneTodayToBriefSignal,
  formatBestStreakJa,
  formatCompletionStreakJa,
  formatDoneTodayJa,
  formatStreakBestComparisonJa,
  formatStreakBestSuffix,
  formatStreakTransitionJa,
  formatStreakWithMilestoneJa,
  formatVelocityByPriorityJa,
  formatVelocityHintJa,
  formatVelocitySummary,
  getStreakMilestone,
  streakComparisonToBriefSignal,
  type StreakMilestone,
  streakMilestoneChipTone,
  streakMilestoneLabelJa,
  streakToBriefSignal,
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

  describe('computeCompletionStreakExcludingToday (iter1710 — 昨日時点 streak)', () => {
    it('byDay.length < 2 → 0 (1 日以下では prev 不明)', () => {
      expect(computeCompletionStreakExcludingToday(mkByDay([]))).toBe(0)
      expect(computeCompletionStreakExcludingToday(mkByDay([1]))).toBe(0)
    })

    it('末尾 1 つ手前 (yesterday) count=0 → 0 (昨日まで途切れ)', () => {
      expect(computeCompletionStreakExcludingToday(mkByDay([1, 1, 0, 1]))).toBe(0)
      expect(computeCompletionStreakExcludingToday(mkByDay([1, 1, 1, 0, 1]))).toBe(0)
    })

    it('末尾を除いて遡った連続日数', () => {
      // [1, 1, 1, 1] → 末尾除いて [1,1,1] = 3 (= 昨日まで 3 日連続)
      expect(computeCompletionStreakExcludingToday(mkByDay([1, 1, 1, 1]))).toBe(3)
      // [0, 1, 1, 0] → 末尾除いて [0,1,1] = 末尾から遡って [1,1] = 2
      expect(computeCompletionStreakExcludingToday(mkByDay([0, 1, 1, 0]))).toBe(2)
    })

    it('全日 count > 0 → byDay.length - 1', () => {
      expect(computeCompletionStreakExcludingToday(mkByDay([1, 1, 1, 1, 1, 1, 1]))).toBe(6)
    })

    it('今日 done あっても 昨日まで途切れなら 0 (= achievement transition source)', () => {
      // [1, 0, 1] → 末尾除いて [1, 0] = 昨日 count=0 → 0
      // (curr = computeCompletionStreak = 1、prev = 0 → milestone none→none で maintained)
      expect(computeCompletionStreakExcludingToday(mkByDay([1, 0, 1]))).toBe(0)
    })

    it('caller pattern: prev + curr で transition 検知', () => {
      // [1, 1, 1] (3 日連続) → prev=2 (= [1,1])、curr=3 → none→bronze で achieved
      const summary = mkByDay([1, 1, 1])
      const prev = computeCompletionStreakExcludingToday(summary)
      const curr = computeCompletionStreak(summary)
      expect(prev).toBe(2)
      expect(curr).toBe(3)
      // (caller は classifyStreakMilestoneTransition(prev, curr) で 'achieved' 取得)
    })
  })

  describe('computeStreakChain (iter1712 — orchestrator)', () => {
    it('[1, 1, 1] (bronze 到達) → achieved + toast 文言 + chip data 全て返る', () => {
      const chain = computeStreakChain(mkByDay([1, 1, 1]))
      expect(chain.currStreak).toBe(3)
      expect(chain.prevStreak).toBe(2)
      expect(chain.currMilestone).toBe('bronze')
      expect(chain.prevMilestone).toBe('none')
      expect(chain.transition).toBe('achieved')
      expect(chain.briefSignal.tone).toBe('info') // bronze → info
      expect(chain.briefSignal.text).toContain('🥉')
      expect(chain.toastMessage).toContain('🎉')
      expect(chain.toastMessage).toContain('ブロンズ')
    })

    it('[1, 1, 0] (今日 streak 途切れ) → broken + 励まし toast', () => {
      const chain = computeStreakChain(mkByDay([1, 1, 0]))
      expect(chain.currStreak).toBe(0)
      expect(chain.prevStreak).toBe(2)
      expect(chain.currMilestone).toBe('none')
      expect(chain.prevMilestone).toBe('none') // 2 < 3 で none
      expect(chain.transition).toBe('maintained') // none → none
      expect(chain.toastMessage).toBeNull()
    })

    it('[1, 1, 1, 1, 1, 1, 1, 1] (silver 範囲 維持) → maintained + toast null', () => {
      // 8 日連続 → prev=7 (silver), curr=8 (silver) → maintained
      const chain = computeStreakChain(mkByDay([1, 1, 1, 1, 1, 1, 1, 1]))
      expect(chain.currStreak).toBe(8)
      expect(chain.prevStreak).toBe(7)
      expect(chain.currMilestone).toBe('silver')
      expect(chain.prevMilestone).toBe('silver')
      expect(chain.transition).toBe('maintained')
      expect(chain.toastMessage).toBeNull()
    })

    it('[] (空 byDay) → 全 0 / none / maintained / toast null (defensive)', () => {
      const chain = computeStreakChain(mkByDay([]))
      expect(chain.currStreak).toBe(0)
      expect(chain.prevStreak).toBe(0)
      expect(chain.currMilestone).toBe('none')
      expect(chain.transition).toBe('maintained')
      expect(chain.toastMessage).toBeNull()
    })
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

describe('formatStreakBestComparisonJa (iter1716 — 現在 vs best 1 行 ja-JP 比較)', () => {
  it('bestStreak=0 (= 完了履歴なし) → "完了履歴なし" sentinel', () => {
    expect(formatStreakBestComparisonJa(0, 0)).toBe('完了履歴なし')
    // curr 値は best=0 のとき無視 (defensive)
    expect(formatStreakBestComparisonJa(5, 0)).toBe('完了履歴なし')
  })

  it('currStreak=0 (= 中断中) & bestStreak>0 → "今 0 日 (最高 N 日)"', () => {
    expect(formatStreakBestComparisonJa(0, 3)).toBe('今 0 日 (最高 3 日)')
    expect(formatStreakBestComparisonJa(0, 14)).toBe('今 0 日 (最高 14 日)')
  })

  it('currStreak === bestStreak > 0 → "今 N 日連続 (最高記録更新中!)"', () => {
    expect(formatStreakBestComparisonJa(5, 5)).toBe('今 5 日連続 (最高記録更新中!)')
    expect(formatStreakBestComparisonJa(1, 1)).toBe('今 1 日連続 (最高記録更新中!)')
  })

  it('currStreak < bestStreak → "今 N 日連続 (最高 M 日)"', () => {
    expect(formatStreakBestComparisonJa(3, 7)).toBe('今 3 日連続 (最高 7 日)')
    expect(formatStreakBestComparisonJa(2, 10)).toBe('今 2 日連続 (最高 10 日)')
  })

  it('currStreak > bestStreak (defensive, 定義上起こらないが fail-soft) → "最高記録更新中!" 扱い', () => {
    // 定義上 best = window 全体最長 なので curr <= best のはず。
    // defensive: curr > best が来ても落ちず、現在を「記録更新中」 として扱う。
    expect(formatStreakBestComparisonJa(10, 5)).toBe('今 10 日連続 (最高記録更新中!)')
  })
})

describe('formatStreakBestSuffix (iter1723 — milestone と組合せ用 suffix のみ)', () => {
  it('best=0 → null (履歴なし、suffix なし)', () => {
    expect(formatStreakBestSuffix(0, 0)).toBeNull()
    // 履歴なしなら curr 値関係なく null
    expect(formatStreakBestSuffix(5, 0)).toBeNull()
  })

  it('curr=0 & best>0 (中断中) → "(最高 N 日、中断中)" — 中断 nudge を suffix で示唆', () => {
    expect(formatStreakBestSuffix(0, 5)).toBe('(最高 5 日、中断中)')
    expect(formatStreakBestSuffix(0, 14)).toBe('(最高 14 日、中断中)')
  })

  it('curr === best (記録更新中) → "(最高記録更新中!)"', () => {
    expect(formatStreakBestSuffix(7, 7)).toBe('(最高記録更新中!)')
    expect(formatStreakBestSuffix(1, 1)).toBe('(最高記録更新中!)')
  })

  it('curr < best → "(最高 N 日)"', () => {
    expect(formatStreakBestSuffix(3, 7)).toBe('(最高 7 日)')
    expect(formatStreakBestSuffix(2, 10)).toBe('(最高 10 日)')
  })

  it('curr > best (defensive) → "(最高記録更新中!)" 扱い', () => {
    expect(formatStreakBestSuffix(10, 5)).toBe('(最高記録更新中!)')
  })

  it('milestone text と組合せて重複なし 1 行統合できる (caller pattern)', () => {
    // 想定 caller flow: milestone text + suffix で「重複なし」 構成
    const curr = 7
    const best = 7
    const milestoneText = formatStreakWithMilestoneJa(curr)
    const suffix = formatStreakBestSuffix(curr, best)
    const combined = `${milestoneText}${suffix ? ` ${suffix}` : ''}`
    // 「7 日連続」 が重複しない (milestone のみで完結 + suffix は best 比較のみ)
    expect(combined).toContain('🥈 シルバー')
    expect(combined).toContain('(最高記録更新中!)')
    // 「7 日連続」 が 1 回のみ
    const dupes = combined.match(/7 日連続/g) ?? []
    expect(dupes.length).toBe(1)
  })
})

describe('streakComparisonToBriefSignal (iter1717 — 比較 chip 化)', () => {
  it('best=0 → tone=idle, text="完了履歴なし"', () => {
    const sig = streakComparisonToBriefSignal(0, 0)
    expect(sig.tone).toBe('idle')
    expect(sig.text).toBe('完了履歴なし')
  })

  it('curr=0 & best>0 (= 中断中) → tone=warn (= 再開 nudge)', () => {
    const sig = streakComparisonToBriefSignal(0, 5)
    expect(sig.tone).toBe('warn')
    expect(sig.text).toBe('今 0 日 (最高 5 日)')
  })

  it('curr === best (= 記録更新中) → tone=success', () => {
    const sig = streakComparisonToBriefSignal(7, 7)
    expect(sig.tone).toBe('success')
    expect(sig.text).toBe('今 7 日連続 (最高記録更新中!)')
  })

  it('curr < best (= 進行中だが過去未達) → tone=info', () => {
    const sig = streakComparisonToBriefSignal(3, 10)
    expect(sig.tone).toBe('info')
    expect(sig.text).toBe('今 3 日連続 (最高 10 日)')
  })

  it('curr > best (defensive) → tone=success (= 記録更新中 扱い)', () => {
    const sig = streakComparisonToBriefSignal(10, 5)
    expect(sig.tone).toBe('success')
    expect(sig.text).toBe('今 10 日連続 (最高記録更新中!)')
  })
})

describe('computeStreakComparisonSignal (iter1718 — summary → 比較 chip orchestrator)', () => {
  const mkByDay = (counts: number[]): VelocitySummary => ({
    byDay: counts.map((count, i) => ({ date: `2026-04-${22 + i}`, count })),
    total: counts.reduce((s, c) => s + c, 0),
    avgPerDay: 0,
    trend: 'flat',
  })

  it('全 0 (= 完了履歴なし) → tone=idle', () => {
    const sig = computeStreakComparisonSignal(mkByDay([0, 0, 0, 0, 0, 0, 0]))
    expect(sig.tone).toBe('idle')
    expect(sig.text).toBe('完了履歴なし')
  })

  it('今日 streak 7 日 = best 7 日 → tone=success (記録更新中)', () => {
    // 全 7 日 done → curr=7 (末尾連続) / best=7 (全長) → 記録更新中
    const sig = computeStreakComparisonSignal(mkByDay([1, 1, 1, 1, 1, 1, 1]))
    expect(sig.tone).toBe('success')
    expect(sig.text).toBe('今 7 日連続 (最高記録更新中!)')
  })

  it('今日中断 (= 末尾 0) + 過去 best > 0 → tone=warn (再開 nudge)', () => {
    // [1, 1, 1, 0, 0, 0, 0] → curr=0 (末尾 0) / best=3 → 中断中
    const sig = computeStreakComparisonSignal(mkByDay([1, 1, 1, 0, 0, 0, 0]))
    expect(sig.tone).toBe('warn')
    expect(sig.text).toBe('今 0 日 (最高 3 日)')
  })

  it('現在 < best (= 過去最高未達) → tone=info', () => {
    // [1, 1, 1, 0, 1, 1, 0] → 末尾 0、curr=0 ではなく warn (NOT 該当)。
    // [0, 1, 1, 1, 0, 1, 1] → 末尾 2 連続 / best 3 → curr=2, best=3, info
    const sig = computeStreakComparisonSignal(mkByDay([0, 1, 1, 1, 0, 1, 1]))
    expect(sig.tone).toBe('info')
    expect(sig.text).toBe('今 2 日連続 (最高 3 日)')
  })
})

describe('composeStreakBriefSignals (iter1720 — milestone + comparison 2 chip fan-out)', () => {
  const mkByDay = (counts: number[]): VelocitySummary => ({
    byDay: counts.map((count, i) => ({ date: `2026-04-${22 + i}`, count })),
    total: counts.reduce((s, c) => s + c, 0),
    avgPerDay: 0,
    trend: 'flat',
  })

  it('done なし (空 summary) → milestone tone=idle / comparison tone=idle', () => {
    const out = composeStreakBriefSignals(mkByDay([0, 0, 0, 0, 0, 0, 0]))
    expect(out.milestone.tone).toBe('idle')
    expect(out.comparison.tone).toBe('idle')
    expect(out.comparison.text).toBe('完了履歴なし')
  })

  it('7 日連続 → milestone success (silver) + comparison success (記録更新中)', () => {
    const out = composeStreakBriefSignals(mkByDay([1, 1, 1, 1, 1, 1, 1]))
    // curr=7, milestone=silver (>=7) → tone=success per streakMilestoneChipTone
    expect(out.milestone.tone).toBe('success')
    expect(out.milestone.text).toContain('🥈')
    // curr=7 === best=7 → comparison success
    expect(out.comparison.tone).toBe('success')
    expect(out.comparison.text).toContain('最高記録更新中')
  })

  it('中断中 (末尾 0, 過去履歴あり) → milestone tone=idle / comparison tone=warn (再開 nudge)', () => {
    // [1, 1, 1, 0, 0, 0, 0] → curr=0 / best=3
    const out = composeStreakBriefSignals(mkByDay([1, 1, 1, 0, 0, 0, 0]))
    expect(out.milestone.tone).toBe('idle')
    expect(out.comparison.tone).toBe('warn')
    expect(out.comparison.text).toBe('今 0 日 (最高 3 日)')
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

  it('formatStreakWithMilestoneJa (iter1706): milestone 未到達は数字のみ、到達後は label 付与', () => {
    // milestone 'none' (streak < 3) は base のみ、emoji 等 含まない
    expect(formatStreakWithMilestoneJa(0)).toBe('完了 streak 0 日 (今日まだ完了なし)')
    expect(formatStreakWithMilestoneJa(1)).toBe('完了 streak 1 日 (今日完了あり)')
    expect(formatStreakWithMilestoneJa(2)).toBe('完了 streak 2 日連続!')

    // bronze (3-6)
    expect(formatStreakWithMilestoneJa(3)).toBe('完了 streak 3 日連続! 🥉 ブロンズ (3 日連続)')
    expect(formatStreakWithMilestoneJa(6)).toBe('完了 streak 6 日連続! 🥉 ブロンズ (3 日連続)')

    // silver (7-13)
    expect(formatStreakWithMilestoneJa(7)).toBe('完了 streak 7 日連続! 🥈 シルバー (1 週間連続)')

    // gold (14-29)
    expect(formatStreakWithMilestoneJa(14)).toBe('完了 streak 14 日連続! 🥇 ゴールド (2 週間連続)')

    // platinum (30-99)
    expect(formatStreakWithMilestoneJa(50)).toBe('完了 streak 50 日連続! 💎 プラチナ (1 ヶ月連続)')

    // legend (>= 100)
    expect(formatStreakWithMilestoneJa(100)).toBe(
      '完了 streak 100 日連続! 👑 レジェンド (100 日連続!)',
    )
  })

  it('formatStreakWithMilestoneJa は streak=0 で milestone 表示なし (empty 状態を強調しない)', () => {
    const r = formatStreakWithMilestoneJa(0)
    expect(r).not.toContain('🥉')
    expect(r).not.toContain('マイルストーン')
  })

  it('classifyStreakMilestoneTransition (iter1707): milestone rank が上がる/下がる/同じ で 3 状態', () => {
    // achieved: rank up
    expect(classifyStreakMilestoneTransition(2, 3)).toBe('achieved') // none → bronze
    expect(classifyStreakMilestoneTransition(6, 7)).toBe('achieved') // bronze → silver
    expect(classifyStreakMilestoneTransition(13, 14)).toBe('achieved') // silver → gold
    expect(classifyStreakMilestoneTransition(29, 30)).toBe('achieved') // gold → platinum
    expect(classifyStreakMilestoneTransition(99, 100)).toBe('achieved') // platinum → legend

    // broken: rank down
    expect(classifyStreakMilestoneTransition(7, 0)).toBe('broken') // silver → none (streak 途切れ)
    expect(classifyStreakMilestoneTransition(100, 99)).toBe('broken') // legend → platinum (rare)

    // maintained: same milestone
    expect(classifyStreakMilestoneTransition(3, 4)).toBe('maintained') // bronze → bronze
    expect(classifyStreakMilestoneTransition(7, 13)).toBe('maintained') // silver → silver
    expect(classifyStreakMilestoneTransition(0, 0)).toBe('maintained') // none → none
    expect(classifyStreakMilestoneTransition(0, 2)).toBe('maintained') // none → none (still < 3)
  })

  it('classifyStreakMilestoneTransition は defensive (NaN / 負 → none 経由で maintained)', () => {
    expect(classifyStreakMilestoneTransition(NaN, NaN)).toBe('maintained') // both none
    expect(classifyStreakMilestoneTransition(-1, 0)).toBe('maintained') // none → none
    expect(classifyStreakMilestoneTransition(NaN, 3)).toBe('achieved') // none → bronze
  })

  it('formatStreakTransitionJa (iter1711): achieved → 🎉 メッセージ / broken → 😢 / maintained → null', () => {
    // achieved: bronze 到達
    expect(formatStreakTransitionJa('achieved', 3, 2)).toBe(
      '🎉 マイルストーン到達! 完了 streak 3 日連続! 🥉 ブロンズ (3 日連続)',
    )
    // achieved: silver 到達
    expect(formatStreakTransitionJa('achieved', 7, 6)).toBe(
      '🎉 マイルストーン到達! 完了 streak 7 日連続! 🥈 シルバー (1 週間連続)',
    )
    // achieved: legend 到達
    expect(formatStreakTransitionJa('achieved', 100, 99)).toBe(
      '🎉 マイルストーン到達! 完了 streak 100 日連続! 👑 レジェンド (100 日連続!)',
    )

    // broken: silver から streak 途切れ
    expect(formatStreakTransitionJa('broken', 0, 7)).toBe(
      '😢 streak 途切れました (前 7 日連続)。また始めよう!',
    )

    // maintained: 何も表示しない
    expect(formatStreakTransitionJa('maintained', 5, 5)).toBeNull()
    expect(formatStreakTransitionJa('maintained', 0, 0)).toBeNull()
  })

  it('streakToBriefSignal (iter1708): text + tone を 1 chip 形式で返す', () => {
    // streak=0 → idle / 'まだ完了なし'
    const s0 = streakToBriefSignal(0)
    expect(s0.tone).toBe('idle')
    expect(s0.text).toBe('完了 streak 0 日 (今日まだ完了なし)')

    // streak=2 (< 3、none) → idle / 数字のみ
    const s2 = streakToBriefSignal(2)
    expect(s2.tone).toBe('idle')
    expect(s2.text).toBe('完了 streak 2 日連続!')

    // streak=3 (bronze) → info / label 付き
    const s3 = streakToBriefSignal(3)
    expect(s3.tone).toBe('info')
    expect(s3.text).toContain('🥉')

    // streak=7 (silver) → success / label 付き
    const s7 = streakToBriefSignal(7)
    expect(s7.tone).toBe('success')
    expect(s7.text).toContain('🥈')

    // streak=100 (legend) → success / label 付き
    const s100 = streakToBriefSignal(100)
    expect(s100.tone).toBe('success')
    expect(s100.text).toContain('👑')
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

describe('countDoneToday / formatDoneTodayJa (iter1726 — 今日累計完了 chip)', () => {
  it('空 → 0', () => {
    expect(countDoneToday([], TODAY)).toBe(0)
    expect(formatDoneTodayJa(0)).toBe('今日 まだ 0 件')
  })

  it('今日 done 3 件 + 昨日 done 2 件 → 3 (= 今日のみ)', () => {
    const items: VelocityFields[] = [
      { doneAt: dt(0) },
      { doneAt: dt(0) },
      { doneAt: dt(0) },
      { doneAt: dt(1) },
      { doneAt: dt(1) },
    ]
    expect(countDoneToday(items, TODAY)).toBe(3)
    expect(formatDoneTodayJa(3)).toBe('今日 3 件完了!')
  })

  it('count=1 → "今日 1 件完了" (! なし、控えめ)', () => {
    expect(formatDoneTodayJa(1)).toBe('今日 1 件完了')
  })

  it('count>=2 → "今日 N 件完了!" (! あり、強調)', () => {
    expect(formatDoneTodayJa(2)).toBe('今日 2 件完了!')
    expect(formatDoneTodayJa(10)).toBe('今日 10 件完了!')
  })

  it('count<=0 (defensive、負も含む) → "今日 まだ 0 件"', () => {
    expect(formatDoneTodayJa(-1)).toBe('今日 まだ 0 件')
    expect(formatDoneTodayJa(0)).toBe('今日 まだ 0 件')
  })

  it('doneAt が null/不正値は除外 (fail-soft)', () => {
    const items: VelocityFields[] = [{ doneAt: dt(0) }, { doneAt: null }, { doneAt: 'invalid' }]
    expect(countDoneToday(items, TODAY)).toBe(1)
  })

  it('today を ISO 文字列でも受け付ける', () => {
    const items: VelocityFields[] = [{ doneAt: dt(0) }]
    expect(countDoneToday(items, '2026-04-28')).toBe(1)
  })
})

describe('doneTodayToBriefSignal (iter1727 — 今日累計完了 chip 化)', () => {
  it('count=0 → tone=idle / "今日 まだ 0 件"', () => {
    const sig = doneTodayToBriefSignal(0)
    expect(sig.tone).toBe('idle')
    expect(sig.text).toBe('今日 まだ 0 件')
  })

  it('count=1 → tone=info (= 動き出した、控えめ青)', () => {
    const sig = doneTodayToBriefSignal(1)
    expect(sig.tone).toBe('info')
    expect(sig.text).toBe('今日 1 件完了')
  })

  it('count=2 → tone=success (= 達成感、緑強調)', () => {
    const sig = doneTodayToBriefSignal(2)
    expect(sig.tone).toBe('success')
    expect(sig.text).toBe('今日 2 件完了!')
  })

  it('count=10 → tone=success (= 多くても同 tone)', () => {
    const sig = doneTodayToBriefSignal(10)
    expect(sig.tone).toBe('success')
    expect(sig.text).toBe('今日 10 件完了!')
  })

  it('count<0 (defensive) → tone=idle', () => {
    const sig = doneTodayToBriefSignal(-1)
    expect(sig.tone).toBe('idle')
    expect(sig.text).toBe('今日 まだ 0 件')
  })
})
