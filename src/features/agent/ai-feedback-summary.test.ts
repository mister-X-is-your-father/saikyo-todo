import { describe, expect, it } from 'vitest'

import {
  type AiFeedbackEntry,
  aiFeedbackTone,
  formatAiFeedbackSummaryJa,
  summarizeAiFeedback,
} from './ai-feedback-summary'

function r(rating: number): AiFeedbackEntry {
  return { rating }
}

describe('summarizeAiFeedback', () => {
  it('空 → count 0 / avg null / rate null', () => {
    const s = summarizeAiFeedback([])
    expect(s.count).toBe(0)
    expect(s.avg).toBeNull()
    expect(s.positiveRate).toBeNull()
  })

  it('平均 + 分布 + 好評/不評 件数', () => {
    const s = summarizeAiFeedback([r(5), r(4), r(4), r(2), r(1)])
    expect(s.count).toBe(5)
    expect(s.avg).toBe(3.2) // 16/5
    expect(s.distribution).toEqual({ 1: 1, 2: 1, 3: 0, 4: 2, 5: 1 })
    expect(s.positiveCount).toBe(3) // 4,4,5
    expect(s.negativeCount).toBe(2) // 1,2
    expect(s.positiveRate).toBe(60) // 3/5
  })

  it('rating=3 は positive/negative どちらでもない', () => {
    const s = summarizeAiFeedback([r(3), r(3)])
    expect(s.positiveCount).toBe(0)
    expect(s.negativeCount).toBe(0)
    expect(s.avg).toBe(3)
  })

  it('範囲外 / 非整数 / NaN は除外', () => {
    const s = summarizeAiFeedback([r(5), r(0), r(6), r(3.5), { rating: NaN }, r(4)])
    expect(s.count).toBe(2) // 5, 4 のみ
    expect(s.avg).toBe(4.5)
  })

  it('avg は round1 (端数 1 桁)', () => {
    const s = summarizeAiFeedback([r(5), r(5), r(4)]) // 14/3 = 4.666...
    expect(s.avg).toBe(4.7)
  })
})

describe('formatAiFeedbackSummaryJa', () => {
  it('件数あり → 平均 + 件数 + 好評率', () => {
    const s = summarizeAiFeedback([r(5), r(4), r(4), r(2)])
    expect(formatAiFeedbackSummaryJa(s)).toBe('AI 評価: 平均 3.8 (4 件・好評 75%)')
  })
  it('件数 0 → 評価なし', () => {
    expect(formatAiFeedbackSummaryJa(summarizeAiFeedback([]))).toBe('評価なし')
  })
})

describe('aiFeedbackTone', () => {
  it('avg >= 4 → good', () => {
    expect(aiFeedbackTone(summarizeAiFeedback([r(4), r(5)]))).toBe('good')
  })
  it('3 <= avg < 4 → ok', () => {
    expect(aiFeedbackTone(summarizeAiFeedback([r(3), r(3), r(4)]))).toBe('ok')
  })
  it('avg < 3 → poor', () => {
    expect(aiFeedbackTone(summarizeAiFeedback([r(1), r(2), r(2)]))).toBe('poor')
  })
  it('評価なし → idle', () => {
    expect(aiFeedbackTone(summarizeAiFeedback([]))).toBe('idle')
  })
})
