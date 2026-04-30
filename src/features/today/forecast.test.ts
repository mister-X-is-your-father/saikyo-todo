import { describe, expect, it } from 'vitest'

import {
  buildTodayForecast,
  type ForecastItemFields,
  minutesUntilEndOfDay,
  parseHHMM,
} from './forecast'

function mk(over: Partial<ForecastItemFields> & { id: string }): ForecastItemFields {
  return {
    title: `item ${over.id}`,
    estimateMin: null,
    isMust: false,
    priority: 4,
    ...over,
  }
}

const NOW = new Date(2026, 3, 30, 9, 0) // 2026-04-30 09:00 local

describe('parseHHMM', () => {
  it('valid', () => {
    expect(parseHHMM('00:00')).toEqual({ h: 0, m: 0 })
    expect(parseHHMM('18:30')).toEqual({ h: 18, m: 30 })
    expect(parseHHMM('9:5')).toEqual({ h: 9, m: 5 })
  })
  it('invalid → null', () => {
    expect(parseHHMM('25:00')).toBeNull()
    expect(parseHHMM('18:60')).toBeNull()
    expect(parseHHMM('abc')).toBeNull()
  })
})

describe('minutesUntilEndOfDay', () => {
  it('NOW=09:00, end=18:00 → 540 min', () => {
    expect(minutesUntilEndOfDay(NOW, '18:00')).toBe(540)
  })
  it('NOW=17:30, end=18:00 → 30 min', () => {
    const n = new Date(2026, 3, 30, 17, 30)
    expect(minutesUntilEndOfDay(n, '18:00')).toBe(30)
  })
  it('NOW=19:00, end=18:00 → 0 (clamp)', () => {
    const n = new Date(2026, 3, 30, 19, 0)
    expect(minutesUntilEndOfDay(n, '18:00')).toBe(0)
  })
  it('invalid hhmm → fallback 18:00', () => {
    expect(minutesUntilEndOfDay(NOW, 'abc')).toBe(540)
  })
})

describe('buildTodayForecast', () => {
  it('空 items: total 0 + canFinishToday true + 各 list 空', () => {
    const r = buildTodayForecast([], NOW)
    expect(r.totalEstimateMin).toBe(0)
    expect(r.canFinishToday).toBe(true)
    expect(r.overflowMin).toBeLessThanOrEqual(0)
    expect(r.quickWins).toEqual([])
    expect(r.focusBlocks).toEqual([])
  })

  it('totalEstimate 集計: estimate 無しは除外、estimateUnknownCount に積む', () => {
    const items = [
      mk({ id: 'a', estimateMin: 30 }),
      mk({ id: 'b', estimateMin: 60 }),
      mk({ id: 'c', estimateMin: null }),
      mk({ id: 'd', estimateMin: -5 }),
    ]
    const r = buildTodayForecast(items, NOW)
    expect(r.totalEstimateMin).toBe(90)
    expect(r.estimateUnknownCount).toBe(2)
  })

  it('canFinishToday: total<=remaining → true', () => {
    const items = [mk({ id: 'a', estimateMin: 480 })] // 8h
    const r = buildTodayForecast(items, NOW) // remaining=540
    expect(r.canFinishToday).toBe(true)
    expect(r.overflowMin).toBe(-60)
  })

  it('canFinishToday: total>remaining → false + overflow 表示', () => {
    const items = [mk({ id: 'a', estimateMin: 600 })] // 10h
    const r = buildTodayForecast(items, NOW) // remaining=540
    expect(r.canFinishToday).toBe(false)
    expect(r.overflowMin).toBe(60)
  })

  it('quickWins: estimate<=30 のみ採用、priority→MUST→estimate 順', () => {
    const items = [
      mk({ id: 'a', estimateMin: 20, priority: 3 }),
      mk({ id: 'b', estimateMin: 30, priority: 1, isMust: true }),
      mk({ id: 'c', estimateMin: 60 }), // 30 超え除外
      mk({ id: 'd', estimateMin: 10, priority: 1 }),
      mk({ id: 'e', estimateMin: 25, priority: 2 }),
    ]
    const r = buildTodayForecast(items, NOW)
    // priority 1 + must=b (rank 1)、priority 1 + must=false=d (rank 2)、priority 2=e、priority 3=a
    expect(r.quickWins.map((it) => it.id)).toEqual(['b', 'd', 'e', 'a'])
  })

  it('quickWins: topN option で件数制限', () => {
    const items: ForecastItemFields[] = []
    for (let i = 0; i < 10; i++) {
      items.push(mk({ id: `i${i}`, estimateMin: 10, priority: 1 }))
    }
    const r = buildTodayForecast(items, NOW, { quickWinsTopN: 3 })
    expect(r.quickWins).toHaveLength(3)
  })

  it('focusBlocks: estimate>=90 のみ採用、priority→MUST 順', () => {
    const items = [
      mk({ id: 'a', estimateMin: 60 }), // 90 未満除外
      mk({ id: 'b', estimateMin: 120, priority: 2 }),
      mk({ id: 'c', estimateMin: 180, priority: 1, isMust: true }),
      mk({ id: 'd', estimateMin: 90, priority: 1 }),
    ]
    const r = buildTodayForecast(items, NOW)
    // priority 1 + must=c、priority 1 + must=false=d、priority 2=b
    // default topN=2
    expect(r.focusBlocks.map((it) => it.id)).toEqual(['c', 'd'])
  })

  it('focusBlocks: topN option で件数制限', () => {
    const items: ForecastItemFields[] = []
    for (let i = 0; i < 5; i++) {
      items.push(mk({ id: `i${i}`, estimateMin: 100 }))
    }
    const r = buildTodayForecast(items, NOW, { focusBlocksTopN: 4 })
    expect(r.focusBlocks).toHaveLength(4)
  })

  it('item は quickWins と focusBlocks 両方に入らない (estimate 30..89 はどちらでもない)', () => {
    const items = [
      mk({ id: 'a', estimateMin: 60 }), // medium
      mk({ id: 'b', estimateMin: 30 }), // quick
      mk({ id: 'c', estimateMin: 90 }), // focus
    ]
    const r = buildTodayForecast(items, NOW)
    expect(r.quickWins.map((it) => it.id)).toEqual(['b'])
    expect(r.focusBlocks.map((it) => it.id)).toEqual(['c'])
  })

  it('workdayEndsAt option で remaining 計算が変わる', () => {
    const items = [mk({ id: 'a', estimateMin: 360 })]
    const r = buildTodayForecast(items, NOW, { workdayEndsAt: '12:00' })
    expect(r.remainingMinutesUntilEnd).toBe(180) // 09:00 → 12:00
    expect(r.canFinishToday).toBe(false)
    expect(r.overflowMin).toBe(180)
  })

  it('priority null / undefined は 4 として扱う (sort 末尾)', () => {
    const items = [
      mk({ id: 'a', estimateMin: 10, priority: null }),
      mk({ id: 'b', estimateMin: 20, priority: 1 }),
    ]
    const r = buildTodayForecast(items, NOW)
    expect(r.quickWins[0]?.id).toBe('b')
    expect(r.quickWins[1]?.id).toBe('a')
  })
})
