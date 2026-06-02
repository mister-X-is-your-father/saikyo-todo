import { describe, expect, it } from 'vitest'

import {
  type BiasSample,
  type BiasTendency,
  biasTendencyCountsToSeverityCounts,
  biasTendencyLabelJa,
  biasTendencySeverity,
  computeEstimateBias,
} from './bias'

const sample = (actualMinutes: number, estimateMinutes: number | null): BiasSample => ({
  actualMinutes,
  estimateMinutes,
})

describe('computeEstimateBias', () => {
  it('空 sample → unknown / 全 0', () => {
    const r = computeEstimateBias([])
    expect(r.totalCount).toBe(0)
    expect(r.withEstimateCount).toBe(0)
    expect(r.tendency).toBe('unknown')
    expect(r.medianRatio).toBeNull()
    expect(r.meanRatio).toBeNull()
    expect(r.calibrationFactor).toBeNull()
    expect(r.summary).toContain('傾向を判定できません')
  })

  it('estimate 付き 1-2 件は unknown (sample 不足)', () => {
    const r = computeEstimateBias([sample(30, 30), sample(20, 20)])
    expect(r.withEstimateCount).toBe(2)
    expect(r.tendency).toBe('unknown')
    expect(r.calibrationFactor).toBeNull()
  })

  it('estimateMinutes が null / 0 の sample は ratio 集計から除外', () => {
    const r = computeEstimateBias([
      sample(30, null),
      sample(20, 0),
      sample(10, 10),
      sample(20, 20),
      sample(30, 30),
    ])
    expect(r.totalCount).toBe(5)
    expect(r.withEstimateCount).toBe(3)
    expect(r.tendency).toBe('on-track')
  })

  it('全 sample が見積±10% 内 → on-track + medianRatio≈1', () => {
    const r = computeEstimateBias([sample(30, 30), sample(20, 20), sample(45, 45), sample(60, 60)])
    expect(r.tendency).toBe('on-track')
    expect(r.onCount).toBe(4)
    expect(r.medianRatio).toBe(1)
    expect(r.calibrationFactor).toBe(1)
    expect(r.summary).toContain('見積精度は良好')
    expect(r.summary).toContain('100%')
  })

  it('actual >> estimate が支配的 → underestimating (見積が低すぎ)', () => {
    const r = computeEstimateBias([
      sample(60, 30), // ratio 2.0, over
      sample(45, 30), // ratio 1.5, over
      sample(50, 30), // ratio 1.67, over
      sample(40, 30), // ratio 1.33, over
      sample(30, 30), // ratio 1.0, on
    ])
    expect(r.overCount).toBe(4)
    expect(r.onCount).toBe(1)
    expect(r.underCount).toBe(0)
    expect(r.tendency).toBe('underestimating')
    expect(r.calibrationFactor).toBeGreaterThan(1)
    expect(r.summary).toContain('過小評価')
  })

  it('actual << estimate が支配的 → overestimating (見積が高すぎ)', () => {
    const r = computeEstimateBias([
      sample(15, 30), // ratio 0.5, under
      sample(20, 30), // ratio 0.67, under
      sample(10, 30), // ratio 0.33, under
      sample(18, 30), // ratio 0.6, under
      sample(30, 30), // ratio 1.0, on
    ])
    expect(r.underCount).toBe(4)
    expect(r.onCount).toBe(1)
    expect(r.overCount).toBe(0)
    expect(r.tendency).toBe('overestimating')
    expect(r.calibrationFactor).toBeLessThan(1)
    expect(r.summary).toContain('過大評価')
  })

  it('under と over がどちらも一定数 → mixed', () => {
    const r = computeEstimateBias([
      sample(60, 30), // over
      sample(50, 30), // over
      sample(15, 30), // under
      sample(10, 30), // under
      sample(30, 30), // on
    ])
    expect(r.tendency).toBe('mixed')
    expect(r.summary).toContain('ばらつき')
  })

  it('counts は withEstimateCount に加算的に等しい', () => {
    const samples = [
      sample(30, 30),
      sample(60, 30),
      sample(15, 30),
      sample(40, null), // 除外
      sample(50, 0), // 除外
    ]
    const r = computeEstimateBias(samples)
    expect(r.totalCount).toBe(5)
    expect(r.withEstimateCount).toBe(3)
    expect(r.underCount + r.onCount + r.overCount).toBe(r.withEstimateCount)
  })

  it('medianRatio は奇数件で中央値、偶数件で中央 2 つの平均', () => {
    // ratios: 0.5, 1.0, 2.0 → median=1.0
    const odd = computeEstimateBias([sample(15, 30), sample(30, 30), sample(60, 30)])
    expect(odd.medianRatio).toBe(1)

    // ratios: 0.5, 1.0, 1.5, 2.0 → median=(1.0+1.5)/2 = 1.25
    const even = computeEstimateBias([
      sample(15, 30),
      sample(30, 30),
      sample(45, 30),
      sample(60, 30),
    ])
    expect(even.medianRatio).toBe(1.25)
  })

  it('calibrationFactor は 0.05 刻みで丸め', () => {
    // ratios: 1.27, 1.30, 1.33 → median=1.30 → 1.30
    const r1 = computeEstimateBias([
      sample(38, 30), // ratio ≈ 1.267
      sample(39, 30), // ratio = 1.30
      sample(40, 30), // ratio ≈ 1.333
    ])
    // medianRatio = 1.30
    expect(r1.calibrationFactor).toBeCloseTo(1.3, 5)

    // ratios: 1.31, 1.31, 1.31 → median=1.31 → round to 1.30
    const r2 = computeEstimateBias([sample(393, 300), sample(393, 300), sample(393, 300)])
    expect(r2.calibrationFactor).toBeCloseTo(1.3, 5)
  })

  it('calibrationFactor は [0.5, 3.0] に clamp', () => {
    // ratios all 5.0 → over の極端 ケース
    const r = computeEstimateBias([sample(50, 10), sample(50, 10), sample(50, 10)])
    expect(r.calibrationFactor).toBe(3)

    // ratios all 0.1 → under の極端 ケース
    const r2 = computeEstimateBias([sample(1, 30), sample(1, 30), sample(1, 30)])
    expect(r2.calibrationFactor).toBe(0.5)
  })

  it('tolerance は formatVariance と同じ (10% / 最低 1 分)', () => {
    // estimate 5, actual 6: tolerance=max(1, round(0.5))=1 → diff=+1, |1|≤1 → on
    // estimate 5, actual 7: diff=+2 > 1 → over
    const r = computeEstimateBias([sample(6, 5), sample(7, 5), sample(8, 5)])
    expect(r.onCount).toBe(1)
    expect(r.overCount).toBe(2)
  })

  it('summary に件数 / カテゴリ % が表示される', () => {
    const r = computeEstimateBias([
      sample(60, 30),
      sample(60, 30),
      sample(60, 30),
      sample(60, 30),
      sample(30, 30),
    ])
    expect(r.summary).toMatch(/5 件中/)
    expect(r.summary).toMatch(/\d+%/)
  })
})

describe('biasTendencyLabelJa', () => {
  it('全 5 段階のラベルを返す', () => {
    expect(biasTendencyLabelJa('on-track')).toBe('見積精度 良好')
    expect(biasTendencyLabelJa('underestimating')).toBe('見積を低く見積りがち')
    expect(biasTendencyLabelJa('overestimating')).toBe('見積を高く見積りがち')
    expect(biasTendencyLabelJa('mixed')).toBe('見積精度にばらつき')
    expect(biasTendencyLabelJa('unknown')).toBe('見積データ 不足')
  })

  it('全 BiasTendency 値が空文字列でない (網羅性ガード)', () => {
    const all: BiasTendency[] = [
      'on-track',
      'underestimating',
      'overestimating',
      'mixed',
      'unknown',
    ]
    for (const t of all) {
      expect(biasTendencyLabelJa(t).length).toBeGreaterThan(0)
    }
  })
})

describe('biasTendencySeverity', () => {
  it('on-track → ok (緑)', () => {
    expect(biasTendencySeverity('on-track')).toBe('ok')
  })

  it('underestimating → warn (残業リスク)', () => {
    expect(biasTendencySeverity('underestimating')).toBe('warn')
  })

  it('overestimating → info (buffer 余り、軽微)', () => {
    expect(biasTendencySeverity('overestimating')).toBe('info')
  })

  it('mixed → warn (要観察)', () => {
    expect(biasTendencySeverity('mixed')).toBe('warn')
  })

  it('unknown → muted (データ不足、グレー)', () => {
    expect(biasTendencySeverity('unknown')).toBe('muted')
  })

  it('全 BiasTendency 値で 5 段階 Severity のいずれかを返す', () => {
    const all: BiasTendency[] = [
      'on-track',
      'underestimating',
      'overestimating',
      'mixed',
      'unknown',
    ]
    const validSev = ['ok', 'info', 'warn', 'danger', 'muted']
    for (const t of all) {
      expect(validSev).toContain(biasTendencySeverity(t))
    }
  })
})

describe('biasTendencyCountsToSeverityCounts', () => {
  it('tendency counts を 5 段 severity counts に集約', () => {
    expect(
      biasTendencyCountsToSeverityCounts({
        'on-track': 3,
        underestimating: 2,
        overestimating: 1,
        mixed: 1,
        unknown: 2,
      }),
    ).toEqual({
      ok: 3, // on-track
      info: 1, // overestimating
      warn: 3, // underestimating + mixed
      danger: 0,
      muted: 2, // unknown
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(
      biasTendencyCountsToSeverityCounts({
        'on-track': 0,
        underestimating: 0,
        overestimating: 0,
        mixed: 0,
        unknown: 0,
      }),
    ).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
  })

  it('合計が tendency 件数の合計と一致', () => {
    const counts = {
      'on-track': 3,
      underestimating: 2,
      overestimating: 1,
      mixed: 1,
      unknown: 2,
    } as const
    const sevCounts = biasTendencyCountsToSeverityCounts(counts)
    const tendencyTotal = Object.values(counts).reduce((a, b) => a + b, 0)
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(tendencyTotal)
  })

  it('bias-tendency は danger bucket には出ない (見積精度は致命的事象として表現しない)', () => {
    const r = biasTendencyCountsToSeverityCounts({
      'on-track': 1,
      underestimating: 1,
      overestimating: 1,
      mixed: 1,
      unknown: 1,
    })
    expect(r.danger).toBe(0)
  })

  // iter1689 refactor regression guard: aggregateCountsBySeverity 委譲後も TENDENCY_SEVERITY の
  // mapping (underestimating + mixed → 同 warn 加算 lossy 縮約) が経由されることを assert。
  it('入力 key 順を変えても結果同一 (集約は加算的、順序不変)', () => {
    const a = biasTendencyCountsToSeverityCounts({
      'on-track': 4,
      underestimating: 3,
      overestimating: 2,
      mixed: 5,
      unknown: 1,
    })
    const b = biasTendencyCountsToSeverityCounts({
      unknown: 1,
      mixed: 5,
      overestimating: 2,
      underestimating: 3,
      'on-track': 4,
    })
    expect(a).toEqual(b)
    expect(a.warn).toBe(3 + 5) // underestimating + mixed が warn に lossy 縮約
  })
})
