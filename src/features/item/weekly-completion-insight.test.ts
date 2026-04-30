/**
 * weekly-completion-insight pure helper の単体 test。
 *
 * 観点:
 *  - 空配列 → EMPTY (idle)
 *  - thisWeek / priorWeek count + Δ% / direction
 *  - byDayOfWeek (Mon-Sun = 0-6) 集計
 *  - peakDow / troughDow (count > 0 のときのみ非 null)
 *  - 不正 doneAt 除外
 *  - format helper
 */
import { describe, expect, it } from 'vitest'

import {
  buildWeeklyCompletionInsight,
  dayOfWeekLabelJa,
  formatWeeklyCompletionInsightJa,
  type WeeklyCompletionItemFields,
} from './weekly-completion-insight'

// today: 2026-04-30 (木) — 本週 = 04-24 金 〜 04-30 木、前週 = 04-17 金 〜 04-23 木
const TODAY = new Date(2026, 3, 30, 12, 0, 0)

function mk(doneAt: Date | string | null): WeeklyCompletionItemFields {
  return { doneAt }
}

describe('dayOfWeekLabelJa', () => {
  it('0=月 / 1=火 / 6=日', () => {
    expect(dayOfWeekLabelJa(0)).toBe('月')
    expect(dayOfWeekLabelJa(1)).toBe('火')
    expect(dayOfWeekLabelJa(2)).toBe('水')
    expect(dayOfWeekLabelJa(6)).toBe('日')
  })
})

describe('buildWeeklyCompletionInsight', () => {
  it('空配列 → idle / 全 0', () => {
    const r = buildWeeklyCompletionInsight([], TODAY)
    expect(r.thisWeekTotal).toBe(0)
    expect(r.priorWeekTotal).toBe(0)
    expect(r.deltaCount).toBe(0)
    expect(r.deltaPct).toBe(0)
    expect(r.direction).toBe('idle')
    expect(r.peakDow).toBeNull()
    expect(r.troughDow).toBeNull()
  })

  it('本週 5 件 / 前週 4 件 → +25% / up', () => {
    const items: WeeklyCompletionItemFields[] = [
      // 本週 (04-24 〜 04-30) 5 件
      mk(new Date(2026, 3, 24, 10)),
      mk(new Date(2026, 3, 26, 10)),
      mk(new Date(2026, 3, 28, 10)),
      mk(new Date(2026, 3, 29, 10)),
      mk(new Date(2026, 3, 30, 10)),
      // 前週 (04-17 〜 04-23) 4 件
      mk(new Date(2026, 3, 17, 10)),
      mk(new Date(2026, 3, 19, 10)),
      mk(new Date(2026, 3, 21, 10)),
      mk(new Date(2026, 3, 22, 10)),
      // 範囲外
      mk(new Date(2026, 3, 10, 10)),
      mk(new Date(2026, 4, 5, 10)),
    ]
    const r = buildWeeklyCompletionInsight(items, TODAY)
    expect(r.thisWeekTotal).toBe(5)
    expect(r.priorWeekTotal).toBe(4)
    expect(r.deltaCount).toBe(1)
    expect(r.deltaPct).toBe(25)
    expect(r.direction).toBe('up')
  })

  it('本週 0 / 前週 5 → -100% / down', () => {
    const items: WeeklyCompletionItemFields[] = [
      mk(new Date(2026, 3, 17, 10)),
      mk(new Date(2026, 3, 18, 10)),
      mk(new Date(2026, 3, 19, 10)),
      mk(new Date(2026, 3, 20, 10)),
      mk(new Date(2026, 3, 21, 10)),
    ]
    const r = buildWeeklyCompletionInsight(items, TODAY)
    expect(r.thisWeekTotal).toBe(0)
    expect(r.priorWeekTotal).toBe(5)
    expect(r.deltaPct).toBe(-100)
    expect(r.direction).toBe('down')
  })

  it('priorWeek=0 + thisWeek>0 → deltaPct=null + up', () => {
    const r = buildWeeklyCompletionInsight([mk(TODAY)], TODAY)
    expect(r.deltaPct).toBeNull()
    expect(r.direction).toBe('up')
  })

  it('|Δ%| < 5 → flat', () => {
    // prior 100 件 (= 大きい数で +2 でも 2%) のシミュレーション
    const items: WeeklyCompletionItemFields[] = []
    for (let i = 0; i < 100; i++) items.push(mk(new Date(2026, 3, 20, 10))) // 04-20 (前週)
    for (let i = 0; i < 102; i++) items.push(mk(new Date(2026, 3, 28, 10))) // 04-28 (本週)
    const r = buildWeeklyCompletionInsight(items, TODAY)
    expect(r.priorWeekTotal).toBe(100)
    expect(r.thisWeekTotal).toBe(102)
    expect(r.deltaPct).toBe(2)
    expect(r.direction).toBe('flat')
  })

  it('byDayOfWeek: 木曜の done 3 件 → byDayOfWeek[3]=3, peakDow=3', () => {
    // 04-30 = 木 (DayOfWeekJa = 3)
    const items: WeeklyCompletionItemFields[] = [
      mk(new Date(2026, 3, 30, 9)),
      mk(new Date(2026, 3, 30, 10)),
      mk(new Date(2026, 3, 30, 14)),
    ]
    const r = buildWeeklyCompletionInsight(items, TODAY)
    expect(r.byDayOfWeek[3]).toBe(3)
    expect(r.peakDow).toBe(3)
    // 全 done が木に集中、他曜日 0 → trough は最初の 0 曜日 (= 月=0)
    expect(r.troughDow).toBe(0)
  })

  it('不正 doneAt は黙って除外', () => {
    const items: WeeklyCompletionItemFields[] = [
      mk(null),
      mk('not-a-date'),
      mk(new Date(2026, 3, 28, 10)),
    ]
    const r = buildWeeklyCompletionInsight(items, TODAY)
    expect(r.thisWeekTotal).toBe(1)
  })
})

describe('formatWeeklyCompletionInsightJa', () => {
  it('両週 0 → "(前週比なし)"', () => {
    const r = buildWeeklyCompletionInsight([], TODAY)
    expect(formatWeeklyCompletionInsightJa(r)).toBe('今週 0 件 (前週比なし)')
  })

  it('+25% / ピーク木 (= 本週の done が木曜に集中)', () => {
    const items: WeeklyCompletionItemFields[] = [
      mk(new Date(2026, 3, 30, 9)),
      mk(new Date(2026, 3, 30, 14)),
      mk(new Date(2026, 3, 28, 10)),
      mk(new Date(2026, 3, 27, 10)),
      mk(new Date(2026, 3, 26, 10)),
      mk(new Date(2026, 3, 17, 10)),
      mk(new Date(2026, 3, 18, 10)),
      mk(new Date(2026, 3, 19, 10)),
      mk(new Date(2026, 3, 21, 10)),
    ]
    const r = buildWeeklyCompletionInsight(items, TODAY)
    expect(formatWeeklyCompletionInsightJa(r)).toContain('+25%')
    expect(formatWeeklyCompletionInsightJa(r)).toContain('ピーク木')
  })

  it('priorWeek=0 + thisWeek>0 → "+∞%"', () => {
    const r = buildWeeklyCompletionInsight([mk(TODAY)], TODAY)
    expect(formatWeeklyCompletionInsightJa(r)).toContain('+∞%')
  })

  it('-100% は符号付き', () => {
    const items: WeeklyCompletionItemFields[] = [
      mk(new Date(2026, 3, 17, 10)),
      mk(new Date(2026, 3, 19, 10)),
    ]
    const r = buildWeeklyCompletionInsight(items, TODAY)
    expect(formatWeeklyCompletionInsightJa(r)).toBe('今週 0 件 (前週比 -100%)')
  })
})
