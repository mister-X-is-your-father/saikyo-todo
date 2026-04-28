import { describe, expect, it } from 'vitest'

import type { EstimateBiasReport } from './bias'
import { formatBiasBriefRichJa, formatBiasBriefRichText } from './bias-brief-rich'
import type { BiasReportByCategory } from './bias-by-category'

const wsReport = (overrides: Partial<EstimateBiasReport>): EstimateBiasReport => ({
  totalCount: 0,
  withEstimateCount: 0,
  underCount: 0,
  onCount: 0,
  overCount: 0,
  medianRatio: null,
  meanRatio: null,
  calibrationFactor: null,
  tendency: 'unknown',
  summary: '',
  ...overrides,
})

const catReport = (overrides: Partial<BiasReportByCategory>): BiasReportByCategory => {
  const empty: EstimateBiasReport = wsReport({})
  return {
    dev: empty,
    meeting: empty,
    research: empty,
    ops: empty,
    other: empty,
    ...overrides,
  }
}

const skewed = (
  tendency: 'underestimating' | 'overestimating',
  factor: number,
  count = 5,
): EstimateBiasReport =>
  wsReport({
    totalCount: count,
    withEstimateCount: count,
    underCount: tendency === 'overestimating' ? count : 0,
    onCount: 0,
    overCount: tendency === 'underestimating' ? count : 0,
    medianRatio: factor,
    meanRatio: factor,
    calibrationFactor: factor,
    tendency,
    summary: '',
  })

describe('formatBiasBriefRichJa', () => {
  it('skew 無し → categoryNote 省略', () => {
    const ws = wsReport({ tendency: 'unknown' })
    const cat = catReport({})
    const b = formatBiasBriefRichJa(ws, cat)
    expect(b.categoryNote).toBeUndefined()
    expect(b.headline).toContain('データ不足')
  })

  it('workspace=on-track + category 強 skew → categoryNote 付く (注意喚起)', () => {
    const ws = wsReport({
      totalCount: 10,
      withEstimateCount: 10,
      onCount: 7,
      overCount: 2,
      underCount: 1,
      calibrationFactor: 1.0,
      tendency: 'on-track',
      summary: '',
    })
    const cat = catReport({ dev: skewed('underestimating', 1.5) })
    const b = formatBiasBriefRichJa(ws, cat)
    expect(b.categoryNote).toBe('特に: 開発: 見積を 1.50× 過小評価しがち (5 件)')
  })

  it('workspace=under + category 同方向でより極端 → categoryNote 付く', () => {
    const ws = skewed('underestimating', 1.2)
    const cat = catReport({ dev: skewed('underestimating', 1.5) })
    const b = formatBiasBriefRichJa(ws, cat)
    expect(b.categoryNote).toBe('特に: 開発: 見積を 1.50× 過小評価しがち (5 件)')
  })

  it('workspace=under + category=under だが workspace と同程度 → categoryNote 省略 (重複情報)', () => {
    const ws = skewed('underestimating', 1.5)
    const cat = catReport({ dev: skewed('underestimating', 1.55) })
    const b = formatBiasBriefRichJa(ws, cat)
    expect(b.categoryNote).toBeUndefined()
  })

  it('workspace=under + category=over (逆方向) → categoryNote 省略 (混乱回避)', () => {
    const ws = skewed('underestimating', 1.5)
    const cat = catReport({ ops: skewed('overestimating', 0.5) })
    const b = formatBiasBriefRichJa(ws, cat)
    expect(b.categoryNote).toBeUndefined()
  })

  it('workspace=over + category=over でより極端 → categoryNote 付く', () => {
    const ws = skewed('overestimating', 0.8)
    const cat = catReport({ meeting: skewed('overestimating', 0.5) })
    const b = formatBiasBriefRichJa(ws, cat)
    expect(b.categoryNote).toBe('特に: MTG: 見積を 0.50× 過大評価しがち (5 件)')
  })

  it('workspace=mixed + category 強 skew → categoryNote 付く', () => {
    const ws = wsReport({
      totalCount: 10,
      withEstimateCount: 10,
      underCount: 5,
      onCount: 0,
      overCount: 5,
      calibrationFactor: 1.0,
      tendency: 'mixed',
      summary: '',
    })
    const cat = catReport({ dev: skewed('underestimating', 2.0) })
    const b = formatBiasBriefRichJa(ws, cat)
    expect(b.categoryNote).toBe('特に: 開発: 見積を 2.00× 過小評価しがち (5 件)')
  })

  it('headline / detail / recommendation は formatBiasBriefJa と一致', () => {
    const ws = skewed('underestimating', 1.3, 12)
    // detail 計算用: overCount=12 のうち 100%
    ws.overCount = 9
    ws.withEstimateCount = 12
    const b = formatBiasBriefRichJa(ws, catReport({}))
    expect(b.headline).toBe('見積精度: 過小評価傾向 (1.30×)')
    expect(b.detail).toContain('12 件のうち 9 件')
    expect(b.recommendation).toContain('30分')
  })
})

describe('formatBiasBriefRichText', () => {
  it('categoryNote 無しは 3 行', () => {
    const t = formatBiasBriefRichText(wsReport({ tendency: 'unknown' }), catReport({}))
    expect(t.split('\n')).toHaveLength(3)
  })

  it('categoryNote 有りは 4 行 + 4 行目に「特に」', () => {
    const ws = skewed('underestimating', 1.2)
    const cat = catReport({ dev: skewed('underestimating', 1.6) })
    const t = formatBiasBriefRichText(ws, cat)
    const lines = t.split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[3]).toMatch(/^特に: /)
  })
})
