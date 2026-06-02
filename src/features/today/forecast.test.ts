import { describe, expect, it } from 'vitest'

import {
  buildTodayForecast,
  type ForecastItemFields,
  forecastSeverity,
  forecastSeverityCountsToSeverityCounts,
  forecastSeverityLabelJa,
  formatTodayForecastJa,
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

describe('forecastSeverity', () => {
  it('canFinishToday=true → ok', () => {
    const r = buildTodayForecast([mk({ id: 'a', estimateMin: 30 })], NOW)
    expect(forecastSeverity(r)).toBe('ok')
  })

  it('overflow 30 分以下 → info', () => {
    // NOW=09:00, end=18:00 → 残 540 分。total=570 → over 30
    const items = Array.from({ length: 19 }, (_, i) => mk({ id: `i${i}`, estimateMin: 30 }))
    const r = buildTodayForecast(items, NOW)
    expect(r.overflowMin).toBe(30)
    expect(forecastSeverity(r)).toBe('info')
  })

  it('overflow 30-120 → warn', () => {
    // total = 600 → over 60
    const items = Array.from({ length: 20 }, (_, i) => mk({ id: `i${i}`, estimateMin: 30 }))
    const r = buildTodayForecast(items, NOW)
    expect(r.overflowMin).toBe(60)
    expect(forecastSeverity(r)).toBe('warn')
  })

  it('overflow 120 超 → danger', () => {
    // total = 700 → over 160
    const items = [mk({ id: 'a', estimateMin: 700 })]
    const r = buildTodayForecast(items, NOW)
    expect(r.overflowMin).toBe(160)
    expect(forecastSeverity(r)).toBe('danger')
  })
})

describe('forecastSeverityLabelJa', () => {
  it('4 段の Japanese label', () => {
    expect(forecastSeverityLabelJa('ok')).toBe('余裕')
    expect(forecastSeverityLabelJa('info')).toBe('少しはみ出し')
    expect(forecastSeverityLabelJa('warn')).toBe('要 トリアージ')
    expect(forecastSeverityLabelJa('danger')).toBe('明らかに過剰')
  })
})

describe('formatTodayForecastJa', () => {
  it('余裕 ケース', () => {
    const r = buildTodayForecast([mk({ id: 'a', estimateMin: 60 })], NOW)
    const out = formatTodayForecastJa(r)
    expect(out).toContain('余裕')
    expect(out).toContain('合計 1h')
    expect(out).toContain('残 9h')
  })

  it('超過時に "超過 Xh" tail', () => {
    const r = buildTodayForecast([mk({ id: 'a', estimateMin: 700 })], NOW)
    const out = formatTodayForecastJa(r)
    expect(out).toContain('明らかに過剰')
    expect(out).toContain('超過 2.7h')
  })

  it('estimate 不明件数を tail に明示', () => {
    const r = buildTodayForecast(
      [mk({ id: 'a', estimateMin: null }), mk({ id: 'b', estimateMin: null })],
      NOW,
    )
    expect(formatTodayForecastJa(r)).toContain('2 件 見積なし')
  })
})

describe('forecastSeverityCountsToSeverityCounts', () => {
  it('forecast counts を 5 段 severity counts に集約 (identity + muted padding)', () => {
    expect(
      forecastSeverityCountsToSeverityCounts({
        ok: 4,
        info: 3,
        warn: 2,
        danger: 1,
      }),
    ).toEqual({
      ok: 4,
      info: 3,
      warn: 2,
      danger: 1,
      muted: 0,
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(forecastSeverityCountsToSeverityCounts({ ok: 0, info: 0, warn: 0, danger: 0 })).toEqual({
      ok: 0,
      info: 0,
      warn: 0,
      danger: 0,
      muted: 0,
    })
  })

  it('muted は常に 0 (forecast 4 段に muted 概念なし)', () => {
    const r = forecastSeverityCountsToSeverityCounts({ ok: 1, info: 1, warn: 1, danger: 1 })
    expect(r.muted).toBe(0)
  })

  it('合計が forecast 件数の合計と一致', () => {
    const counts = { ok: 4, info: 3, warn: 2, danger: 1 }
    const sevCounts = forecastSeverityCountsToSeverityCounts(counts)
    const total = counts.ok + counts.info + counts.warn + counts.danger
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(total)
  })

  // iter1692 refactor regression guard: aggregateCountsBySeverity 委譲後も identity copy
  // (ForecastSeverity ⊂ Severity の subset、muted は 0 padding) が保証されることを assert。
  it('入力 key 順を変えても結果同一 + muted は常に 0', () => {
    const a = forecastSeverityCountsToSeverityCounts({ ok: 4, info: 3, warn: 2, danger: 1 })
    const b = forecastSeverityCountsToSeverityCounts({ danger: 1, warn: 2, info: 3, ok: 4 })
    expect(a).toEqual(b)
    expect(a.muted).toBe(0)
  })
})
