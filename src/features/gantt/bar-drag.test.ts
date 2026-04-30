/**
 * iter467 bar-drag の unit test。pure helper のみ、DB / DOM 非依存。
 */
import { describe, expect, it } from 'vitest'

import { computeBarDragShift, computeBarLeftEdgeShift, computeBarRightEdgeShift } from './bar-drag'

describe('computeBarDragShift (中央 drag = 平行 shift)', () => {
  it('1 日分右にシフト (deltaPx=20, dayPx=20)', () => {
    const r = computeBarDragShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: 20,
      dayPx: 20,
    })
    expect(r.startDate).toBe('2026-05-01')
    expect(r.dueDate).toBe('2026-05-04')
    expect(r.deltaDays).toBe(1)
    expect(r.invalid).toBe(false)
  })

  it('3 日分左にシフト (deltaPx=-60, dayPx=20)', () => {
    const r = computeBarDragShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: -60,
      dayPx: 20,
    })
    expect(r.startDate).toBe('2026-04-27')
    expect(r.dueDate).toBe('2026-04-30')
    expect(r.deltaDays).toBe(-3)
  })

  it('半日以上 (deltaPx=11, dayPx=20) は 1 日に round (snap to day)', () => {
    const r = computeBarDragShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: 11,
      dayPx: 20,
    })
    expect(r.deltaDays).toBe(1)
  })

  it('半日未満 (deltaPx=9, dayPx=20) は 0 日 (snap)、no-op', () => {
    const r = computeBarDragShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: 9,
      dayPx: 20,
    })
    expect(r.deltaDays).toBe(0)
    expect(r.startDate).toBe('2026-04-30')
    expect(r.dueDate).toBe('2026-05-03')
  })

  it('dayPx=0 → invalid', () => {
    const r = computeBarDragShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: 100,
      dayPx: 0,
    })
    expect(r.invalid).toBe(true)
    expect(r.deltaDays).toBe(0)
  })

  it('dayPx=NaN → invalid', () => {
    const r = computeBarDragShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: 100,
      dayPx: NaN,
    })
    expect(r.invalid).toBe(true)
  })

  it('startDate=null → null のまま、dueDate のみ shift', () => {
    const r = computeBarDragShift({
      startDate: null,
      dueDate: '2026-05-03',
      deltaPx: 20,
      dayPx: 20,
    })
    expect(r.startDate).toBeNull()
    expect(r.dueDate).toBe('2026-05-04')
  })

  it('月跨ぎ (4/30 → 5/2)', () => {
    const r = computeBarDragShift({
      startDate: '2026-04-29',
      dueDate: '2026-04-30',
      deltaPx: 40,
      dayPx: 20,
    })
    expect(r.startDate).toBe('2026-05-01')
    expect(r.dueDate).toBe('2026-05-02')
  })
})

describe('computeBarLeftEdgeShift (startDate のみ shift)', () => {
  it('1 日分右にシフト → startDate のみ +1、dueDate 不変', () => {
    const r = computeBarLeftEdgeShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: 20,
      dayPx: 20,
    })
    expect(r.startDate).toBe('2026-05-01')
    expect(r.dueDate).toBe('2026-05-03')
  })

  it('startDate > dueDate になる shift は clamp (期間 0 日)', () => {
    const r = computeBarLeftEdgeShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: 200,
      dayPx: 20,
    })
    expect(r.startDate).toBe('2026-05-03')
    expect(r.dueDate).toBe('2026-05-03')
  })

  it('startDate=null → 何も shift しない', () => {
    const r = computeBarLeftEdgeShift({
      startDate: null,
      dueDate: '2026-05-03',
      deltaPx: 20,
      dayPx: 20,
    })
    expect(r.startDate).toBeNull()
  })
})

describe('computeBarRightEdgeShift (dueDate のみ shift)', () => {
  it('1 日分左にシフト → dueDate のみ -1、startDate 不変', () => {
    const r = computeBarRightEdgeShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: -20,
      dayPx: 20,
    })
    expect(r.startDate).toBe('2026-04-30')
    expect(r.dueDate).toBe('2026-05-02')
  })

  it('dueDate < startDate になる shift は clamp (期間 0 日)', () => {
    const r = computeBarRightEdgeShift({
      startDate: '2026-04-30',
      dueDate: '2026-05-03',
      deltaPx: -200,
      dayPx: 20,
    })
    expect(r.startDate).toBe('2026-04-30')
    expect(r.dueDate).toBe('2026-04-30')
  })

  it('dueDate=null → 何も shift しない', () => {
    const r = computeBarRightEdgeShift({
      startDate: '2026-04-30',
      dueDate: null,
      deltaPx: -20,
      dayPx: 20,
    })
    expect(r.dueDate).toBeNull()
  })
})
