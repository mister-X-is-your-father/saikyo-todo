import { describe, expect, it } from 'vitest'

import {
  buildTaskChuteTicker,
  formatHHMM,
  isDone,
  type TickerItemFields,
} from './cumulative-remaining'

function mk(over: Partial<TickerItemFields> & { id: string }): TickerItemFields {
  return { status: 'todo', doneAt: null, estimateMin: null, ...over }
}

describe('isDone', () => {
  it('doneAt 有り → done', () => {
    expect(isDone(mk({ id: 'a', doneAt: new Date() }))).toBe(true)
  })
  it("status='done' → done", () => {
    expect(isDone(mk({ id: 'a', status: 'done' }))).toBe(true)
  })
  it("status='cancelled' → done 扱い", () => {
    expect(isDone(mk({ id: 'a', status: 'cancelled' }))).toBe(true)
  })
  it("doneAt null + status='todo' → not done", () => {
    expect(isDone(mk({ id: 'a' }))).toBe(false)
  })
})

describe('formatHHMM', () => {
  it('時刻を HH:MM zero-pad', () => {
    expect(formatHHMM(new Date(2026, 0, 1, 9, 5))).toBe('09:05')
    expect(formatHHMM(new Date(2026, 0, 1, 18, 30))).toBe('18:30')
    expect(formatHHMM(new Date(2026, 0, 1, 0, 0))).toBe('00:00')
  })
})

describe('buildTaskChuteTicker', () => {
  const NOW = new Date(2026, 3, 30, 9, 0) // 2026-04-30 09:00 (local)

  it('空 items → 全項目 0 + rows=[]', () => {
    const r = buildTaskChuteTicker([], NOW)
    expect(r.totalEstimateMin).toBe(0)
    expect(r.doneEstimateMin).toBe(0)
    expect(r.remainingEstimateMin).toBe(0)
    expect(r.estimateUnknownCount).toBe(0)
    expect(r.rows).toEqual([])
  })

  it('estimate 無し item は estimateUnknownCount に積まれ totalEstimate は不変', () => {
    const r = buildTaskChuteTicker(
      [mk({ id: 'a', estimateMin: null }), mk({ id: 'b', estimateMin: null })],
      NOW,
    )
    expect(r.estimateUnknownCount).toBe(2)
    expect(r.totalEstimateMin).toBe(0)
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0]?.cumulativeRemainingMin).toBe(0)
    expect(r.rows[0]?.eta).toBeNull()
  })

  it('全 item active + estimate あり: cumulativeRemainingMin が逐次減って 0 に', () => {
    const items = [
      mk({ id: 'a', estimateMin: 30 }),
      mk({ id: 'b', estimateMin: 60 }),
      mk({ id: 'c', estimateMin: 15 }),
    ]
    const r = buildTaskChuteTicker(items, NOW)
    expect(r.totalEstimateMin).toBe(105)
    expect(r.doneEstimateMin).toBe(0)
    expect(r.remainingEstimateMin).toBe(105)
    // row[0]: 30 消化、残 75
    expect(r.rows[0]?.cumulativeRemainingMin).toBe(75)
    expect(r.rows[0]?.eta).toBe('09:30')
    // row[1]: +60 消化、残 15
    expect(r.rows[1]?.cumulativeRemainingMin).toBe(15)
    expect(r.rows[1]?.eta).toBe('10:30')
    // row[2]: +15 消化、残 0
    expect(r.rows[2]?.cumulativeRemainingMin).toBe(0)
    expect(r.rows[2]?.eta).toBe('10:45')
  })

  it('done 済 item は doneEstimate に加算され、eta=null、累積は直前と同値', () => {
    const items = [
      mk({ id: 'a', estimateMin: 30, doneAt: new Date() }),
      mk({ id: 'b', estimateMin: 60 }),
    ]
    const r = buildTaskChuteTicker(items, NOW)
    expect(r.totalEstimateMin).toBe(90)
    expect(r.doneEstimateMin).toBe(30)
    expect(r.remainingEstimateMin).toBe(60)
    // row 0: done、cumulative = remainingActive(60) - consumed(0) = 60、eta=null
    expect(r.rows[0]?.cumulativeRemainingMin).toBe(60)
    expect(r.rows[0]?.eta).toBeNull()
    // row 1: active、+60 消化、残 0、eta=10:00
    expect(r.rows[1]?.cumulativeRemainingMin).toBe(0)
    expect(r.rows[1]?.eta).toBe('10:00')
  })

  it('estimate 無しの active row は eta=null、累積は直前と同値', () => {
    const items = [
      mk({ id: 'a', estimateMin: 30 }),
      mk({ id: 'b', estimateMin: null }),
      mk({ id: 'c', estimateMin: 15 }),
    ]
    const r = buildTaskChuteTicker(items, NOW)
    expect(r.estimateUnknownCount).toBe(1)
    expect(r.rows[0]?.cumulativeRemainingMin).toBe(15) // 30 を消化した後 残 15
    expect(r.rows[0]?.eta).toBe('09:30')
    // row 1: estimate 無し、累積は row 0 終了直後と同値、eta=null
    expect(r.rows[1]?.cumulativeRemainingMin).toBe(15)
    expect(r.rows[1]?.eta).toBeNull()
    // row 2: +15 消化、残 0
    expect(r.rows[2]?.cumulativeRemainingMin).toBe(0)
    expect(r.rows[2]?.eta).toBe('09:45')
  })

  it('estimateMin が負値の item は estimate 無し扱い', () => {
    const r = buildTaskChuteTicker([mk({ id: 'a', estimateMin: -5 })], NOW)
    expect(r.totalEstimateMin).toBe(0)
    expect(r.estimateUnknownCount).toBe(1)
    expect(r.rows[0]?.estimateMin).toBeNull()
  })

  it('cancelled item は done 扱い (estimate 加算するが eta は null)', () => {
    const items = [
      mk({ id: 'a', estimateMin: 30, status: 'cancelled' }),
      mk({ id: 'b', estimateMin: 60 }),
    ]
    const r = buildTaskChuteTicker(items, NOW)
    expect(r.doneEstimateMin).toBe(30)
    expect(r.remainingEstimateMin).toBe(60)
    expect(r.rows[0]?.eta).toBeNull()
  })

  it('NOW=09:00 + estimate 480 (8h) で 17:00 eta', () => {
    const r = buildTaskChuteTicker([mk({ id: 'a', estimateMin: 480 })], NOW)
    expect(r.rows[0]?.eta).toBe('17:00')
  })

  it('rows 順は input 順を保つ (sort しない)', () => {
    const items = [
      mk({ id: 'c', estimateMin: 15 }),
      mk({ id: 'a', estimateMin: 30 }),
      mk({ id: 'b', estimateMin: 60 }),
    ]
    const r = buildTaskChuteTicker(items, NOW)
    expect(r.rows.map((row) => row.item.id)).toEqual(['c', 'a', 'b'])
  })
})
