import { describe, expect, it } from 'vitest'

import {
  extractFirstJsonObject,
  parseStructuredReview,
  statusGlyph,
  StructuredReviewSchema,
  summarizeReview,
} from './structured-review'

describe('StructuredReviewSchema', () => {
  it('完全形を受理', () => {
    const r = StructuredReviewSchema.safeParse({
      checklist: [
        { point: 'DoD 達成', status: 'ok', comment: '' },
        { point: 'test カバ', status: 'warn', comment: '50% のみ' },
        { point: 'security', status: 'fail', comment: 'XSS 検出' },
      ],
      improvements: [{ title: '修正', rationale: 'XSS 対策', severity: 'high' }],
      overall_summary: 'security が課題',
    })
    expect(r.success).toBe(true)
  })

  it('improvements 省略は default []', () => {
    const r = StructuredReviewSchema.safeParse({
      checklist: [{ point: 'OK', status: 'ok' }],
      overall_summary: '完璧',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.improvements).toEqual([])
    }
  })

  it('checklist 空 → reject', () => {
    const r = StructuredReviewSchema.safeParse({
      checklist: [],
      overall_summary: 'x',
    })
    expect(r.success).toBe(false)
  })

  it('overall_summary 空 → reject', () => {
    const r = StructuredReviewSchema.safeParse({
      checklist: [{ point: 'OK', status: 'ok' }],
      overall_summary: '',
    })
    expect(r.success).toBe(false)
  })

  it('improvement severity 不正値 → reject', () => {
    const r = StructuredReviewSchema.safeParse({
      checklist: [{ point: 'OK', status: 'ok' }],
      improvements: [{ title: 't', rationale: 'r', severity: 'critical' }],
      overall_summary: 'x',
    })
    expect(r.success).toBe(false)
  })

  it('checklist status: ok/warn/fail のみ受理、他は reject', () => {
    expect(
      StructuredReviewSchema.safeParse({
        checklist: [{ point: 'p', status: 'unknown' }],
        overall_summary: 'x',
      }).success,
    ).toBe(false)
  })
})

describe('summarizeReview', () => {
  it('byStatus 集計 + pass 判定 (fail 無し)', () => {
    const r = summarizeReview({
      checklist: [
        { point: 'a', status: 'ok', comment: '' },
        { point: 'b', status: 'ok', comment: '' },
        { point: 'c', status: 'warn', comment: '' },
      ],
      improvements: [],
      overall_summary: 'x',
    })
    expect(r.byStatus).toEqual({ ok: 2, warn: 1, fail: 0 })
    expect(r.pass).toBe(true)
  })

  it('pass=false: fail が 1 件でも', () => {
    const r = summarizeReview({
      checklist: [
        { point: 'a', status: 'ok', comment: '' },
        { point: 'b', status: 'fail', comment: '' },
      ],
      improvements: [],
      overall_summary: 'x',
    })
    expect(r.pass).toBe(false)
  })

  it('bySeverity 集計', () => {
    const r = summarizeReview({
      checklist: [{ point: 'a', status: 'ok', comment: '' }],
      improvements: [
        { title: 't1', rationale: 'r', severity: 'high' },
        { title: 't2', rationale: 'r', severity: 'high' },
        { title: 't3', rationale: 'r', severity: 'low' },
      ],
      overall_summary: 'x',
    })
    expect(r.bySeverity).toEqual({ high: 2, medium: 0, low: 1 })
  })
})

describe('statusGlyph', () => {
  it('ok / warn / fail の glyph + label', () => {
    expect(statusGlyph('ok').glyph).toBe('✅')
    expect(statusGlyph('warn').glyph).toBe('⚠️')
    expect(statusGlyph('fail').glyph).toBe('❌')
    expect(statusGlyph('warn').label).toBe('注意')
  })
})

describe('parseStructuredReview', () => {
  it('valid JSON string を受理 + summary 計算', () => {
    const r = parseStructuredReview(
      JSON.stringify({
        checklist: [
          { point: 'a', status: 'ok' },
          { point: 'b', status: 'fail', comment: 'X' },
        ],
        improvements: [{ title: 't', rationale: 'r', severity: 'high' }],
        overall_summary: 'X 要対策',
      }),
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.summary.byStatus).toEqual({ ok: 1, warn: 0, fail: 1 })
      expect(r.summary.bySeverity).toEqual({ high: 1, medium: 0, low: 0 })
      expect(r.summary.pass).toBe(false)
    }
  })

  it('code block 含む string でも JSON 抽出', () => {
    const text = `Here's my review:
\`\`\`json
{
  "checklist": [{ "point": "p", "status": "ok" }],
  "overall_summary": "good"
}
\`\`\``
    const r = parseStructuredReview(text)
    expect(r.ok).toBe(true)
  })

  it('object を直接渡しても OK', () => {
    const r = parseStructuredReview({
      checklist: [{ point: 'p', status: 'ok' }],
      overall_summary: 'x',
    })
    expect(r.ok).toBe(true)
  })

  it('JSON parse 失敗 → ok=false', () => {
    const r = parseStructuredReview('{ broken')
    expect(r.ok).toBe(false)
  })

  it('schema 不一致 (checklist 空) → ok=false + details', () => {
    const r = parseStructuredReview({ checklist: [], overall_summary: 'x' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.details).toBeDefined()
    }
  })

  it('JSON object が無い string → ok=false', () => {
    const r = parseStructuredReview('plain text')
    expect(r.ok).toBe(false)
  })
})

describe('extractFirstJsonObject', () => {
  it('plain JSON / pre-text / nested / 文字列内の {} を正しく扱う', () => {
    expect(extractFirstJsonObject('{"a":1}')).toBe('{"a":1}')
    expect(extractFirstJsonObject('text { "a": 1 } more')).toBe('{ "a": 1 }')
    expect(extractFirstJsonObject('{"a":{"b":2}}')).toBe('{"a":{"b":2}}')
    expect(extractFirstJsonObject('{"s":"{not}"}')).toBe('{"s":"{not}"}')
    expect(extractFirstJsonObject('plain')).toBeNull()
  })
})
