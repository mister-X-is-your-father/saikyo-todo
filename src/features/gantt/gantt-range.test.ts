/**
 * iter305 refactor: gantt-range pure helper の単体検証。
 * gantt-view.tsx 内で動作していた logic を完全互換で抽出 (動作変更ゼロ目的)。
 */
import { addDays, differenceInCalendarDays } from 'date-fns'
import { describe, expect, it } from 'vitest'

import { computeGanttRange, computeTodayX, computeTotalDays } from './gantt-range'

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d)

describe('computeGanttRange', () => {
  it('1 件: start - 1 日 / due + 1 日 の余白', () => {
    const r = computeGanttRange([{ start: D(2026, 4, 10), due: D(2026, 4, 15) }])
    expect(r).not.toBeNull()
    expect(r!.start.getTime()).toBe(D(2026, 4, 9).getTime())
    expect(r!.end.getTime()).toBe(D(2026, 4, 16).getTime())
  })

  it('複数件: min(start) と max(due) を取る', () => {
    const rows = [
      { start: D(2026, 4, 10), due: D(2026, 4, 12) },
      { start: D(2026, 4, 5), due: D(2026, 4, 20) },
      { start: D(2026, 4, 15), due: D(2026, 4, 18) },
    ]
    const r = computeGanttRange(rows)
    expect(r!.start.getTime()).toBe(D(2026, 4, 4).getTime()) // min(5)-1
    expect(r!.end.getTime()).toBe(D(2026, 4, 21).getTime()) // max(20)+1
  })

  it('空配列は null', () => {
    expect(computeGanttRange([])).toBeNull()
  })

  it('start = due の単日 row でも fail-soft (1 日範囲)', () => {
    const r = computeGanttRange([{ start: D(2026, 4, 10), due: D(2026, 4, 10) }])
    expect(r!.start.getTime()).toBe(D(2026, 4, 9).getTime())
    expect(r!.end.getTime()).toBe(D(2026, 4, 11).getTime())
  })
})

describe('computeTotalDays', () => {
  it('range の両端含む日数を返す (差 + 1)', () => {
    const range = { start: D(2026, 4, 1), end: D(2026, 4, 7) }
    expect(computeTotalDays(range)).toBe(7) // 1〜7 の 7 日
  })

  it('range = null は 0', () => {
    expect(computeTotalDays(null)).toBe(0)
  })

  it('start = end は 1 日 (両端含むので 0+1=1)', () => {
    expect(computeTotalDays({ start: D(2026, 4, 10), end: D(2026, 4, 10) })).toBe(1)
  })
})

describe('computeTodayX', () => {
  const RANGE = { start: D(2026, 4, 1), end: D(2026, 4, 30) } // 30 日
  const dayPx = 24 // 1 日 = 24px

  it('範囲中央: dayOffset * dayPx + 時刻 fraction', () => {
    const today = new Date(2026, 3, 15, 12, 0) // 4/15 12:00 (= dayOffset 14)
    const x = computeTodayX(RANGE, today, dayPx)
    // 14 * 24 + 0.5 * 24 = 336 + 12 = 348
    expect(x).toBeCloseTo(348)
  })

  it('range 範囲前 (today < start) は null', () => {
    expect(computeTodayX(RANGE, D(2026, 3, 15), dayPx)).toBeNull()
  })

  it('range 範囲後 (today > end) は null', () => {
    expect(computeTodayX(RANGE, D(2026, 5, 5), dayPx)).toBeNull()
  })

  it('range = null は null', () => {
    expect(computeTodayX(null, D(2026, 4, 15), dayPx)).toBeNull()
  })

  it('時刻 fraction 0:00 (深夜) は dayOffset * dayPx そのまま', () => {
    const today = new Date(2026, 3, 15, 0, 0)
    const x = computeTodayX(RANGE, today, dayPx)
    expect(x).toBeCloseTo(14 * 24)
  })

  it('時刻 fraction 23:59 (深夜直前) は dayOffset + ~1 * dayPx', () => {
    const today = new Date(2026, 3, 15, 23, 59)
    const x = computeTodayX(RANGE, today, dayPx)
    // 14 + (23*60+59)/1440 = 14 + 0.99931 = 14.99931
    expect(x).toBeGreaterThan(14 * 24 + 23.9)
    expect(x).toBeLessThan(15 * 24)
  })

  it('dayPx = 0 でも crash しない (値は 0)', () => {
    expect(computeTodayX(RANGE, D(2026, 4, 15), 0)).toBe(0)
  })

  it('range 端 (start == today) は dayOffset=0 で fraction*dayPx', () => {
    const today = new Date(2026, 3, 1, 12, 0) // 4/1 noon
    const x = computeTodayX(RANGE, today, dayPx)
    expect(x).toBeCloseTo(12) // 0 + 0.5 * 24
  })

  it('end の前日は dayOffset=totalDays-1 で in-range', () => {
    const range = { start: D(2026, 4, 1), end: D(2026, 4, 30) }
    const today = new Date(2026, 3, 30, 0, 0) // 4/30 0:00
    expect(computeTodayX(range, today, dayPx)).not.toBeNull()
    const xEnd = computeTodayX(range, today, dayPx)
    expect(xEnd).toBeCloseTo(29 * 24) // 29 日 fraction 0
  })
})

describe('computeGanttRange と computeTotalDays の組み合わせ (元 inline と一致)', () => {
  it('addDays / differenceInCalendarDays で再計算しても等しい', () => {
    const rows = [
      { start: D(2026, 4, 10), due: D(2026, 4, 12) },
      { start: D(2026, 4, 5), due: D(2026, 4, 20) },
    ]
    const range = computeGanttRange(rows)!
    const totalDays = computeTotalDays(range)
    // 元 inline と一致確認: range.start = 4/4, range.end = 4/21, totalDays = 18
    expect(differenceInCalendarDays(range.end, range.start) + 1).toBe(totalDays)
    expect(addDays(range.start, totalDays - 1).getTime()).toBe(range.end.getTime())
  })
})
