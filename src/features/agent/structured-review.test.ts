import { describe, expect, it } from 'vitest'

import {
  classifyReviewVerdictHint,
  extractFirstJsonObject,
  formatReviewSummaryJa,
  formatReviewVerdictHintJa,
  formatTopImprovementJa,
  formatWorstChecklistFindingJa,
  parseStructuredReview,
  pickTopImprovement,
  pickWorstChecklistFinding,
  type ReviewSummary,
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

describe('formatReviewSummaryJa', () => {
  it('合格 (fail=0) かつ 全 status / 全 severity あり', () => {
    const summary: ReviewSummary = {
      byStatus: { ok: 5, warn: 1, fail: 0 },
      bySeverity: { high: 0, medium: 1, low: 0 },
      pass: true,
    }
    expect(formatReviewSummaryJa(summary)).toBe('合格 (✅5 ⚠1、改善 medium 1)')
  })

  it('不合格 (fail>0)', () => {
    const summary: ReviewSummary = {
      byStatus: { ok: 3, warn: 1, fail: 2 },
      bySeverity: { high: 1, medium: 1, low: 0 },
      pass: false,
    }
    expect(formatReviewSummaryJa(summary)).toBe('不合格 (✅3 ⚠1 ❌2、改善 high 1 / medium 1)')
  })

  it('改善 0 件 → "改善 0 件"', () => {
    const summary: ReviewSummary = {
      byStatus: { ok: 3, warn: 0, fail: 0 },
      bySeverity: { high: 0, medium: 0, low: 0 },
      pass: true,
    }
    expect(formatReviewSummaryJa(summary)).toBe('合格 (✅3、改善 0 件)')
  })

  it('count=0 status は省略', () => {
    const summary: ReviewSummary = {
      byStatus: { ok: 5, warn: 0, fail: 0 },
      bySeverity: { high: 0, medium: 0, low: 0 },
      pass: true,
    }
    const out = formatReviewSummaryJa(summary)
    expect(out).toContain('✅5')
    expect(out).not.toContain('⚠')
    expect(out).not.toContain('❌')
  })
})

describe('pickWorstChecklistFinding', () => {
  it('fail を最優先で返す', () => {
    const r = pickWorstChecklistFinding({
      checklist: [
        { point: 'a', status: 'ok', comment: '' },
        { point: 'b', status: 'warn', comment: '' },
        { point: 'c', status: 'fail', comment: '理由' },
      ],
    })
    expect(r?.point).toBe('c')
  })

  it('fail なし → 最初の warn', () => {
    const r = pickWorstChecklistFinding({
      checklist: [
        { point: 'a', status: 'ok', comment: '' },
        { point: 'b', status: 'warn', comment: '' },
        { point: 'c', status: 'warn', comment: '' },
      ],
    })
    expect(r?.point).toBe('b')
  })

  it('warn もなし → null', () => {
    const r = pickWorstChecklistFinding({
      checklist: [
        { point: 'a', status: 'ok', comment: '' },
        { point: 'b', status: 'ok', comment: '' },
      ],
    })
    expect(r).toBeNull()
  })

  it('checklist 空 → null', () => {
    expect(pickWorstChecklistFinding({ checklist: [] })).toBeNull()
  })
})

describe('pickTopImprovement', () => {
  it('high を最優先', () => {
    const r = pickTopImprovement({
      improvements: [
        { title: 'A', rationale: 'x', severity: 'low' },
        { title: 'B', rationale: 'x', severity: 'high' },
        { title: 'C', rationale: 'x', severity: 'medium' },
      ],
    })
    expect(r?.title).toBe('B')
  })

  it('high 無し → medium', () => {
    const r = pickTopImprovement({
      improvements: [
        { title: 'A', rationale: 'x', severity: 'low' },
        { title: 'B', rationale: 'x', severity: 'medium' },
      ],
    })
    expect(r?.title).toBe('B')
  })

  it('low のみ', () => {
    const r = pickTopImprovement({
      improvements: [{ title: 'A', rationale: 'x', severity: 'low' }],
    })
    expect(r?.title).toBe('A')
  })

  it('空 → null', () => {
    expect(pickTopImprovement({ improvements: [] })).toBeNull()
  })

  it('同 severity 複数 → 入力順 先頭', () => {
    const r = pickTopImprovement({
      improvements: [
        { title: 'A', rationale: 'x', severity: 'high' },
        { title: 'B', rationale: 'x', severity: 'high' },
      ],
    })
    expect(r?.title).toBe('A')
  })
})

describe('formatWorstChecklistFindingJa', () => {
  it('null → 「review 完璧 (要対応なし)」', () => {
    expect(formatWorstChecklistFindingJa(null)).toBe('review 完璧 (要対応なし)')
  })

  it('fail → ❌ + point', () => {
    expect(formatWorstChecklistFindingJa({ point: 'DoD 未達', status: 'fail', comment: '' })).toBe(
      '❌ DoD 未達',
    )
  })

  it('warn → ⚠ + point', () => {
    expect(formatWorstChecklistFindingJa({ point: 'test 不足', status: 'warn', comment: '' })).toBe(
      '⚠️ test 不足',
    )
  })

  it('長い point は 80 文字超で ... 圧縮', () => {
    const longPoint = 'あ'.repeat(100)
    const out = formatWorstChecklistFindingJa({ point: longPoint, status: 'fail', comment: '' })
    expect(out).toContain('…')
    // 8 字制限テスト 簡易
    expect(out.length).toBeLessThanOrEqual(82)
  })
})

describe('formatTopImprovementJa', () => {
  it('null → 「優先改善: なし」', () => {
    expect(formatTopImprovementJa(null)).toBe('優先改善: なし')
  })

  it('high → ❗ glyph + [high]', () => {
    expect(formatTopImprovementJa({ title: 'XSS 対策', rationale: 'r', severity: 'high' })).toBe(
      '❗ 優先改善: XSS 対策 [high]',
    )
  })

  it('medium → ⚠ glyph', () => {
    expect(formatTopImprovementJa({ title: 'doc 補強', rationale: 'r', severity: 'medium' })).toBe(
      '⚠ 優先改善: doc 補強 [medium]',
    )
  })

  it('low → · glyph (控えめ)', () => {
    expect(formatTopImprovementJa({ title: 'lint 修正', rationale: 'r', severity: 'low' })).toBe(
      '· 優先改善: lint 修正 [low]',
    )
  })

  it('長い title は 80 文字超で … 圧縮', () => {
    const longTitle = 'あ'.repeat(100)
    const out = formatTopImprovementJa({ title: longTitle, rationale: 'r', severity: 'high' })
    expect(out).toContain('…')
    expect(out.length).toBeLessThanOrEqual(120) // glyph + prefix + suffix の余裕込み
  })
})

describe('classifyReviewVerdictHint', () => {
  it('全 0 → idle', () => {
    expect(classifyReviewVerdictHint({ byStatus: { ok: 0, warn: 0, fail: 0 } })).toBe('idle')
  })

  it('fail >= 1 → severe', () => {
    expect(classifyReviewVerdictHint({ byStatus: { ok: 5, warn: 0, fail: 1 } })).toBe('severe')
  })

  it('warn >= 3 (fail=0) → moderate', () => {
    expect(classifyReviewVerdictHint({ byStatus: { ok: 1, warn: 3, fail: 0 } })).toBe('moderate')
  })

  it('warn 1-2 (fail=0) → mild', () => {
    expect(classifyReviewVerdictHint({ byStatus: { ok: 5, warn: 2, fail: 0 } })).toBe('mild')
  })

  it('ok のみ → mild', () => {
    expect(classifyReviewVerdictHint({ byStatus: { ok: 5, warn: 0, fail: 0 } })).toBe('mild')
  })
})

describe('formatReviewVerdictHintJa', () => {
  it('idle / mild / moderate / severe を 1 単語で返す', () => {
    expect(formatReviewVerdictHintJa({ byStatus: { ok: 0, warn: 0, fail: 0 } })).toBe('review なし')
    expect(formatReviewVerdictHintJa({ byStatus: { ok: 5, warn: 0, fail: 0 } })).toBe('健全 pass')
    expect(formatReviewVerdictHintJa({ byStatus: { ok: 1, warn: 3, fail: 0 } })).toBe(
      '多数注意 (pass)',
    )
    expect(formatReviewVerdictHintJa({ byStatus: { ok: 0, warn: 0, fail: 1 } })).toBe('不合格')
  })
})
