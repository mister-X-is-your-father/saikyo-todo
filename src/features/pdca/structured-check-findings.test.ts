import { describe, expect, it } from 'vitest'

import {
  formatCheckFindingsSummaryJa,
  parseStructuredCheckFindings,
  StructuredCheckFindingsSchema,
  summarizeCheckFindings,
} from './structured-check-findings'

const VALID = {
  wins: ['レビュー SLA を守れた', 'standup が短くなった'],
  gaps: ['QA 工数が想定超過'],
  anomalies: ['金曜だけ完了が激減'],
}

describe('StructuredCheckFindingsSchema', () => {
  it('valid object を通す + anomalies default []', () => {
    const r = StructuredCheckFindingsSchema.safeParse({ wins: ['a'], gaps: ['b'] })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.anomalies).toEqual([])
  })
  it('wins 空配列は reject', () => {
    expect(StructuredCheckFindingsSchema.safeParse({ wins: [], gaps: ['b'] }).success).toBe(false)
  })
  it('空文字 finding は reject', () => {
    expect(StructuredCheckFindingsSchema.safeParse({ wins: ['  '], gaps: ['b'] }).success).toBe(
      false,
    )
  })
  it('wins 6 件超は reject', () => {
    expect(
      StructuredCheckFindingsSchema.safeParse({
        wins: ['1', '2', '3', '4', '5', '6'],
        gaps: ['b'],
      }).success,
    ).toBe(false)
  })
  it('anomalies 4 件超は reject', () => {
    expect(
      StructuredCheckFindingsSchema.safeParse({
        wins: ['a'],
        gaps: ['b'],
        anomalies: ['1', '2', '3', '4'],
      }).success,
    ).toBe(false)
  })
})

describe('parseStructuredCheckFindings', () => {
  it('object 入力 → ok + summary', () => {
    const r = parseStructuredCheckFindings(VALID)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.summary.winCount).toBe(2)
      expect(r.summary.gapCount).toBe(1)
      expect(r.summary.anomalyCount).toBe(1)
      expect(r.summary.hasAnomaly).toBe(true)
    }
  })

  it('code block 付き string から JSON 抽出', () => {
    const text = '```json\n' + JSON.stringify(VALID) + '\n```'
    const r = parseStructuredCheckFindings(text)
    expect(r.ok).toBe(true)
  })

  it('JSON object 不在の string → ok=false', () => {
    const r = parseStructuredCheckFindings('ただの感想文です')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('JSON object')
  })

  it('schema 不一致 → ok=false (details 付き)', () => {
    const r = parseStructuredCheckFindings({ wins: [], gaps: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('schema 不一致')
  })
})

describe('summarizeCheckFindings / formatCheckFindingsSummaryJa', () => {
  it('anomaly 有り → 異常を含む 1 行', () => {
    const s = summarizeCheckFindings(StructuredCheckFindingsSchema.parse(VALID))
    expect(formatCheckFindingsSummaryJa(s)).toBe('学び: 成果 2 / 課題 1 / 異常 1')
  })
  it('anomaly 0 → 異常を省略', () => {
    const s = summarizeCheckFindings(
      StructuredCheckFindingsSchema.parse({ wins: ['a', 'b'], gaps: ['c', 'd'] }),
    )
    expect(s.hasAnomaly).toBe(false)
    expect(formatCheckFindingsSummaryJa(s)).toBe('学び: 成果 2 / 課題 2')
  })
})
