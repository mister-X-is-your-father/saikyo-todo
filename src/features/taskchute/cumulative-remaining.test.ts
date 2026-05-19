import { describe, expect, it } from 'vitest'

import {
  buildTaskChuteTicker,
  computeTickerProgressPct,
  formatDurationJa,
  formatHHMM,
  formatTickerHeaderJa,
  formatTickerProgressJa,
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

describe('formatDurationJa', () => {
  it('0 / negative / NaN → 0m', () => {
    expect(formatDurationJa(0)).toBe('0m')
    expect(formatDurationJa(-5)).toBe('0m')
    expect(formatDurationJa(NaN)).toBe('0m')
  })
  it('60 未満は 分のみ', () => {
    expect(formatDurationJa(45)).toBe('45m')
    expect(formatDurationJa(1)).toBe('1m')
  })
  it('丁度 60 / 120 は h のみ', () => {
    expect(formatDurationJa(60)).toBe('1h')
    expect(formatDurationJa(120)).toBe('2h')
  })
  it('h と m の合算', () => {
    expect(formatDurationJa(252)).toBe('4h12m')
    expect(formatDurationJa(125)).toBe('2h5m')
  })
  it('小数は round', () => {
    expect(formatDurationJa(60.4)).toBe('1h')
    expect(formatDurationJa(60.6)).toBe('1h1m')
  })
})

describe('formatTickerHeaderJa', () => {
  const NOW2 = new Date('2026-04-30T09:00:00')
  it('全件 estimate 無し / 0 件 → 合計 0m', () => {
    const ticker = buildTaskChuteTicker([], NOW2)
    expect(formatTickerHeaderJa(ticker)).toBe('合計 0m')
  })

  it('合計 + 残 + 終わる予測 を連結', () => {
    const items = [
      mk({ id: 'a', estimateMin: 30 }), // 9:30 eta
      mk({ id: 'b', estimateMin: 60 }), // 10:30 eta
    ]
    const ticker = buildTaskChuteTicker(items, NOW2)
    expect(formatTickerHeaderJa(ticker)).toBe('合計 1h30m / 残 1h30m / 終わる予測 10:30')
  })

  it('estimate 無し件数があれば末尾に「(N 件 見積なし)」', () => {
    const items = [mk({ id: 'a', estimateMin: 30 }), mk({ id: 'b' }), mk({ id: 'c' })]
    const ticker = buildTaskChuteTicker(items, NOW2)
    const out = formatTickerHeaderJa(ticker)
    expect(out).toContain('(2 件 見積なし)')
  })

  it('全件 done なら eta 省略', () => {
    const items = [
      mk({ id: 'a', estimateMin: 30, doneAt: NOW2 }),
      mk({ id: 'b', estimateMin: 60, status: 'done' }),
    ]
    const ticker = buildTaskChuteTicker(items, NOW2)
    const out = formatTickerHeaderJa(ticker)
    expect(out).toContain('合計 1h30m')
    expect(out).toContain('残 0m')
    expect(out).not.toContain('終わる予測')
  })
})

describe('computeTickerProgressPct (iter1012)', () => {
  it('total=0 → null', () => {
    expect(computeTickerProgressPct({ totalEstimateMin: 0, doneEstimateMin: 0 })).toBeNull()
  })

  it('done=0 → 0', () => {
    expect(computeTickerProgressPct({ totalEstimateMin: 60, doneEstimateMin: 0 })).toBe(0)
  })

  it('done=total → 100', () => {
    expect(computeTickerProgressPct({ totalEstimateMin: 60, doneEstimateMin: 60 })).toBe(100)
  })

  it('mid: 30/120 → 25', () => {
    expect(computeTickerProgressPct({ totalEstimateMin: 120, doneEstimateMin: 30 })).toBe(25)
  })

  it('2/3 → 67 (round)', () => {
    expect(computeTickerProgressPct({ totalEstimateMin: 90, doneEstimateMin: 60 })).toBe(67)
  })
})

describe('formatTickerProgressJa (iter1012)', () => {
  it('null (total=0) → 「進捗なし (見積なし)」', () => {
    expect(formatTickerProgressJa({ totalEstimateMin: 0, doneEstimateMin: 0 })).toBe(
      '進捗なし (見積なし)',
    )
  })

  it('100% → 「進捗 100% (全件完了)」', () => {
    expect(formatTickerProgressJa({ totalEstimateMin: 60, doneEstimateMin: 60 })).toBe(
      '進捗 100% (全件完了)',
    )
  })

  it('0% → 「進捗 0% (未着手)」', () => {
    expect(formatTickerProgressJa({ totalEstimateMin: 60, doneEstimateMin: 0 })).toBe(
      '進捗 0% (未着手)',
    )
  })

  it('mid 25% → 「進捗 25% (X / Y 完了)」', () => {
    expect(formatTickerProgressJa({ totalEstimateMin: 120, doneEstimateMin: 30 })).toBe(
      '進捗 25% (30m / 2h 完了)',
    )
  })
})
