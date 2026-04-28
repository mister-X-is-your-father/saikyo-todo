import { describe, expect, it } from 'vitest'

import type { EstimateBiasReport } from './bias'
import { computeBiasConfidence, formatBiasConfidenceJa } from './bias-confidence'

const report = (overrides: Partial<EstimateBiasReport>): EstimateBiasReport => ({
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

describe('computeBiasConfidence — sample buckets', () => {
  it('0 件 → none / score 0 / rationale: 3 件以上必要', () => {
    const c = computeBiasConfidence(report({ withEstimateCount: 0 }))
    expect(c.level).toBe('none')
    expect(c.score).toBe(0)
    expect(c.rationale).toContain('3 件以上')
  })

  it('1-2 件 → very-low', () => {
    expect(computeBiasConfidence(report({ withEstimateCount: 1 })).level).toBe('very-low')
    expect(computeBiasConfidence(report({ withEstimateCount: 2 })).level).toBe('very-low')
  })

  it('3-9 件 → low', () => {
    expect(computeBiasConfidence(report({ withEstimateCount: 3 })).level).toBe('low')
    expect(computeBiasConfidence(report({ withEstimateCount: 9 })).level).toBe('low')
  })

  it('10-19 件 → moderate', () => {
    expect(computeBiasConfidence(report({ withEstimateCount: 10 })).level).toBe('moderate')
    expect(computeBiasConfidence(report({ withEstimateCount: 19 })).level).toBe('moderate')
  })

  it('20+ 件 → high (sample 不足 rationale なし)', () => {
    const c = computeBiasConfidence(report({ withEstimateCount: 20 }))
    expect(c.level).toBe('high')
    expect(c.score).toBe(1)
    expect(c.rationale).not.toContain('サンプル不足')
  })
})

describe('computeBiasConfidence — downgrade', () => {
  it('clamp 端 (0.5×) は 1 段下げる', () => {
    const c = computeBiasConfidence(
      report({ withEstimateCount: 25, calibrationFactor: 0.5, tendency: 'overestimating' }),
    )
    // high → moderate
    expect(c.level).toBe('moderate')
    expect(c.rationale).toContain('clamp 範囲外')
  })

  it('clamp 端 (3.0×) も同様', () => {
    const c = computeBiasConfidence(
      report({ withEstimateCount: 25, calibrationFactor: 3.0, tendency: 'underestimating' }),
    )
    expect(c.level).toBe('moderate')
  })

  it('mixed tendency は 1 段下げる', () => {
    const c = computeBiasConfidence(
      report({ withEstimateCount: 12, calibrationFactor: 1.05, tendency: 'mixed' }),
    )
    // moderate → low
    expect(c.level).toBe('low')
    expect(c.rationale).toContain('ばらつき')
  })

  it('mixed + clamp 端は 2 段下げる', () => {
    const c = computeBiasConfidence(
      report({ withEstimateCount: 25, calibrationFactor: 0.5, tendency: 'mixed' }),
    )
    // high → moderate → low
    expect(c.level).toBe('low')
  })

  it('元が none ならそれ以上は下げない', () => {
    const c = computeBiasConfidence(report({ withEstimateCount: 0, tendency: 'mixed' }))
    expect(c.level).toBe('none')
  })

  it('on-track + 十分 sample + 中央付近 factor は high のまま', () => {
    const c = computeBiasConfidence(
      report({ withEstimateCount: 25, calibrationFactor: 1.0, tendency: 'on-track' }),
    )
    expect(c.level).toBe('high')
    expect(c.rationale).toBe('')
  })
})

describe('formatBiasConfidenceJa', () => {
  it('none', () => {
    const c = computeBiasConfidence(report({ withEstimateCount: 0 }))
    expect(formatBiasConfidenceJa(c)).toBe(
      '自信度: データなし (0 件) — まず 3 件以上の見積付き time entry が必要',
    )
  })

  it('low (sample 5)', () => {
    const c = computeBiasConfidence(
      report({ withEstimateCount: 5, calibrationFactor: 1.3, tendency: 'underestimating' }),
    )
    expect(formatBiasConfidenceJa(c)).toBe('自信度: 低い (5 件) — サンプル不足 (5/10)')
  })

  it('moderate (sample 12)', () => {
    const c = computeBiasConfidence(
      report({ withEstimateCount: 12, calibrationFactor: 1.3, tendency: 'underestimating' }),
    )
    expect(formatBiasConfidenceJa(c)).toBe('自信度: 中 (12 件)')
  })

  it('high (sample 30)', () => {
    const c = computeBiasConfidence(
      report({ withEstimateCount: 30, calibrationFactor: 1.05, tendency: 'on-track' }),
    )
    expect(formatBiasConfidenceJa(c)).toBe('自信度: 高い (30 件)')
  })
})
