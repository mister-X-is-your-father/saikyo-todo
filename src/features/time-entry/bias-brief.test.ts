import { describe, expect, it } from 'vitest'

import type { EstimateBiasReport } from './bias'
import { formatBiasBriefJa, formatBiasBriefText } from './bias-brief'

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

describe('formatBiasBriefJa', () => {
  it('unknown は データ不足 + サンプル件数 + 記録のうながし', () => {
    const b = formatBiasBriefJa(
      report({ totalCount: 5, withEstimateCount: 1, tendency: 'unknown' }),
    )
    expect(b.headline).toBe('見積精度: データ不足')
    expect(b.detail).toContain('1/5 件')
    expect(b.detail).toContain('3 件以上')
    expect(b.recommendation).toContain('見積: 30分')
  })

  it('on-track は 良好 + 比率 + 続行 OK', () => {
    const b = formatBiasBriefJa(
      report({
        totalCount: 10,
        withEstimateCount: 10,
        onCount: 8,
        underCount: 1,
        overCount: 1,
        medianRatio: 1,
        calibrationFactor: 1,
        tendency: 'on-track',
      }),
    )
    expect(b.headline).toBe('見積精度: 良好')
    expect(b.detail).toContain('80%')
    expect(b.detail).toContain('10 件中 8 件')
    expect(b.recommendation).toContain('そのまま信頼')
  })

  it('underestimating は 過小評価 + factor + 30→39 例', () => {
    const b = formatBiasBriefJa(
      report({
        totalCount: 5,
        withEstimateCount: 5,
        overCount: 4,
        onCount: 1,
        medianRatio: 1.3,
        calibrationFactor: 1.3,
        tendency: 'underestimating',
      }),
    )
    expect(b.headline).toBe('見積精度: 過小評価傾向 (1.30×)')
    expect(b.detail).toContain('80%')
    expect(b.detail).toContain('超過')
    expect(b.recommendation).toContain('30分 → 39分')
  })

  it('overestimating は 過大評価 + factor + 60→30 例', () => {
    const b = formatBiasBriefJa(
      report({
        totalCount: 5,
        withEstimateCount: 5,
        underCount: 4,
        onCount: 1,
        medianRatio: 0.5,
        calibrationFactor: 0.5,
        tendency: 'overestimating',
      }),
    )
    expect(b.headline).toBe('見積精度: 過大評価傾向 (0.50×)')
    expect(b.detail).toContain('80%')
    expect(b.detail).toContain('早く完了')
    expect(b.recommendation).toContain('60分 → 30分')
  })

  it('mixed は ばらつき + 内訳 + 種別分けの推奨', () => {
    const b = formatBiasBriefJa(
      report({
        totalCount: 6,
        withEstimateCount: 6,
        underCount: 2,
        onCount: 2,
        overCount: 2,
        medianRatio: 1,
        calibrationFactor: 1,
        tendency: 'mixed',
      }),
    )
    expect(b.headline).toBe('見積精度: ばらつきあり')
    expect(b.detail).toContain('見積内 2')
    expect(b.detail).toContain('ぴったり 2')
    expect(b.detail).toContain('超過 2')
    expect(b.recommendation).toContain('種別')
  })

  it('calibrationFactor=null でも tendency=on-track なら headline に "—" は出さない', () => {
    // unreachable in computeEstimateBias 仕様上だが、API 防衛的に確認
    const b = formatBiasBriefJa(
      report({
        totalCount: 5,
        withEstimateCount: 5,
        onCount: 4,
        overCount: 1,
        tendency: 'on-track',
      }),
    )
    expect(b.headline).toBe('見積精度: 良好')
  })
})

describe('formatBiasBriefText', () => {
  it('3 要素を改行で連結', () => {
    const txt = formatBiasBriefText(
      report({ totalCount: 0, withEstimateCount: 0, tendency: 'unknown' }),
    )
    const lines = txt.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('データ不足')
  })
})
