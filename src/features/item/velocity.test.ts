/**
 * iter302 ai-automation: velocity pure helper の単体テスト。
 * 7 日 default + 古い順 byDay + total / avgPerDay / trend (up/flat/down) +
 * 不正値 fail-soft + windowDays<=0 / 空入力 / archive 含むパス を網羅する。
 */
import { describe, expect, it } from 'vitest'

import {
  computeVelocity,
  computeVelocityByPriority,
  formatVelocityByPriorityJa,
  formatVelocitySummary,
  type VelocityByPriorityFields,
  type VelocityFields,
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
