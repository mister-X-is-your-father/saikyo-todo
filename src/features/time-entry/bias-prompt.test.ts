import { describe, expect, it } from 'vitest'

import type { EstimateBiasReport } from './bias'
import type { BiasReportByCategory } from './bias-by-category'
import type { BiasConfidence } from './bias-confidence'
import { formatBiasForAiPrompt, formatBiasPromptEmpty } from './bias-prompt'
import type { BiasTrend } from './bias-trend'

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

const empty: EstimateBiasReport = wsReport({})
const emptyCat: BiasReportByCategory = {
  dev: empty,
  meeting: empty,
  research: empty,
  ops: empty,
  other: empty,
}

const skewed = (
  tendency: 'underestimating' | 'overestimating',
  factor: number,
  count = 12,
  overCount?: number,
): EstimateBiasReport =>
  wsReport({
    totalCount: count,
    withEstimateCount: count,
    underCount: tendency === 'overestimating' ? count : 0,
    onCount: 0,
    overCount: tendency === 'underestimating' ? (overCount ?? count) : 0,
    medianRatio: factor,
    meanRatio: factor,
    calibrationFactor: factor,
    tendency,
    summary: '',
  })

describe('formatBiasForAiPrompt', () => {
  it('workspace のみ → 3 行 brief + 見出し', () => {
    const ws = skewed('underestimating', 1.3)
    const out = formatBiasForAiPrompt({ workspace: ws })
    const lines = out.split('\n')
    expect(lines[0]).toBe('### 見積精度 (直近)')
    expect(lines[1]).toContain('過小評価傾向 (1.30×)')
    expect(lines[2]).toContain('12 件のうち')
    expect(lines[3]).toMatch(/^- 推奨: /)
    expect(lines).toHaveLength(4)
  })

  it('confidence 付き → 自信度行が追加', () => {
    const ws = skewed('underestimating', 1.3)
    const conf: BiasConfidence = {
      level: 'moderate',
      score: 0.7,
      samples: 12,
      rationale: '',
    }
    const out = formatBiasForAiPrompt({ workspace: ws, confidence: conf })
    expect(out).toContain('- 自信度: 中 (12 件)')
  })

  it('trend が inconclusive 以外なら trend 行が追加', () => {
    const ws = skewed('underestimating', 1.3)
    const trend: BiasTrend = {
      direction: 'improving',
      priorFactor: 1.5,
      recentFactor: 1.3,
      distanceDelta: 0.2,
    }
    const out = formatBiasForAiPrompt({ workspace: ws, trend })
    expect(out).toContain('- 見積精度の変化: 改善 (1.50× → 1.30×)')
  })

  it('trend が inconclusive なら省略', () => {
    const ws = skewed('underestimating', 1.3)
    const trend: BiasTrend = {
      direction: 'inconclusive',
      priorFactor: null,
      recentFactor: null,
      distanceDelta: null,
    }
    const out = formatBiasForAiPrompt({ workspace: ws, trend })
    expect(out).not.toContain('見積精度の変化')
  })

  it('category 付き + 強 skew で categoryNote 行が追加 (4 行目末尾)', () => {
    const ws = skewed('underestimating', 1.2)
    const cat: BiasReportByCategory = {
      ...emptyCat,
      dev: skewed('underestimating', 1.6, 8, 8),
    }
    const out = formatBiasForAiPrompt({ workspace: ws, category: cat })
    const lines = out.split('\n')
    // 末尾に categoryNote
    expect(lines[lines.length - 1]).toMatch(/^- 特に: /)
  })

  it('category 付きでも skew 同程度なら categoryNote 省略', () => {
    const ws = skewed('underestimating', 1.5)
    const cat: BiasReportByCategory = {
      ...emptyCat,
      dev: skewed('underestimating', 1.55, 8, 8),
    }
    const out = formatBiasForAiPrompt({ workspace: ws, category: cat })
    expect(out).not.toContain('特に:')
  })

  it('全部入り → 3 行 brief + confidence + trend + categoryNote (順序固定)', () => {
    const ws = skewed('underestimating', 1.3)
    const cat: BiasReportByCategory = {
      ...emptyCat,
      dev: skewed('underestimating', 1.6, 8, 8),
    }
    const trend: BiasTrend = {
      direction: 'improving',
      priorFactor: 1.5,
      recentFactor: 1.3,
      distanceDelta: 0.2,
    }
    const conf: BiasConfidence = {
      level: 'moderate',
      score: 0.7,
      samples: 12,
      rationale: '',
    }
    const out = formatBiasForAiPrompt({ workspace: ws, category: cat, trend, confidence: conf })
    const lines = out.split('\n')
    expect(lines[0]).toBe('### 見積精度 (直近)')
    // headline / detail / recommendation
    expect(lines[1]).toContain('過小評価傾向')
    expect(lines[2]).toContain('12 件')
    expect(lines[3]).toMatch(/^- 推奨: /)
    // confidence (4 番目)
    expect(lines[4]).toMatch(/^- 自信度: /)
    // trend (5 番目)
    expect(lines[5]).toMatch(/^- 見積精度の変化: 改善/)
    // categoryNote (末尾)
    expect(lines[6]).toMatch(/^- 特に: /)
    expect(lines).toHaveLength(7)
  })

  it('見出しは markdown H3', () => {
    const ws = skewed('underestimating', 1.3)
    const out = formatBiasForAiPrompt({ workspace: ws })
    expect(out.startsWith('### ')).toBe(true)
  })
})

describe('formatBiasPromptEmpty', () => {
  it('fallback は H3 + 不足メッセージ 2 行', () => {
    const out = formatBiasPromptEmpty()
    const lines = out.split('\n')
    expect(lines[0]).toBe('### 見積精度 (直近)')
    expect(lines[1]).toContain('サンプルが不足')
    expect(lines).toHaveLength(2)
  })
})
