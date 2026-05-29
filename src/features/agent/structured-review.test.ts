import { describe, expect, it } from 'vitest'

import {
  classifyReviewVerdictHint,
  computeReviewPassRatio,
  extractFirstJsonObject,
  formatReviewPassRatioJa,
  formatReviewSummaryJa,
  formatReviewVerdictHintJa,
  formatTopImprovementJa,
  formatWorstChecklistFindingJa,
  parseStructuredReview,
  pickTopChecklistFindings,
  pickTopImprovement,
  pickTopImprovements,
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

describe('computeReviewPassRatio', () => {
  it('全 0 → null', () => {
    expect(computeReviewPassRatio({ byStatus: { ok: 0, warn: 0, fail: 0 } })).toBeNull()
  })

  it('全 ok → 1.0', () => {
    expect(computeReviewPassRatio({ byStatus: { ok: 5, warn: 0, fail: 0 } })).toBe(1)
  })

  it('全 fail → 0', () => {
    expect(computeReviewPassRatio({ byStatus: { ok: 0, warn: 0, fail: 3 } })).toBe(0)
  })

  it('mix 4/5 → 0.8', () => {
    expect(computeReviewPassRatio({ byStatus: { ok: 4, warn: 1, fail: 0 } })).toBe(0.8)
  })

  it('5/7 → 0.71 (round2 2 桁丸め)', () => {
    expect(computeReviewPassRatio({ byStatus: { ok: 5, warn: 1, fail: 1 } })).toBe(0.71)
  })

  it('warn / fail 両方含む total で正規化', () => {
    expect(computeReviewPassRatio({ byStatus: { ok: 2, warn: 1, fail: 1 } })).toBe(0.5)
  })
})

describe('formatReviewPassRatioJa', () => {
  it('null → 「評価なし (checklist 空)」', () => {
    expect(formatReviewPassRatioJa(null, { byStatus: { ok: 0, warn: 0, fail: 0 } })).toBe(
      '評価なし (checklist 空)',
    )
  })

  it('100% → 「合格率 100% (5/5、完璧)」', () => {
    expect(formatReviewPassRatioJa(1, { byStatus: { ok: 5, warn: 0, fail: 0 } })).toBe(
      '合格率 100% (5/5、完璧)',
    )
  })

  it('0% → 「合格率 0% (0/3、要全面再 review)」', () => {
    expect(formatReviewPassRatioJa(0, { byStatus: { ok: 0, warn: 0, fail: 3 } })).toBe(
      '合格率 0% (0/3、要全面再 review)',
    )
  })

  it('80% → 「合格率 80% (4/5)」 (count breakdown も含む)', () => {
    expect(formatReviewPassRatioJa(0.8, { byStatus: { ok: 4, warn: 1, fail: 0 } })).toBe(
      '合格率 80% (4/5)',
    )
  })

  it('71% → 整数 % で丸め', () => {
    expect(formatReviewPassRatioJa(0.71, { byStatus: { ok: 5, warn: 1, fail: 1 } })).toBe(
      '合格率 71% (5/7)',
    )
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

describe('pickTopChecklistFindings (iter1432 — 上位 N severe findings)', () => {
  it('n <= 0 → 空配列 (defensive)', () => {
    const review = {
      checklist: [{ status: 'fail' as const, point: 'A', comment: '' }],
    }
    expect(pickTopChecklistFindings(review, 0)).toEqual([])
    expect(pickTopChecklistFindings(review, -1)).toEqual([])
  })

  it('空 checklist → 空配列', () => {
    expect(pickTopChecklistFindings({ checklist: [] }, 3)).toEqual([])
  })

  it('混合 → severity 降順 (fail → warn → ok)', () => {
    const review = {
      checklist: [
        { status: 'ok' as const, point: 'O1', comment: '' },
        { status: 'fail' as const, point: 'F1', comment: '' },
        { status: 'warn' as const, point: 'W1', comment: '' },
        { status: 'fail' as const, point: 'F2', comment: '' },
      ],
    }
    const top3 = pickTopChecklistFindings(review, 3)
    expect(top3.map((c) => c.point)).toEqual(['F1', 'F2', 'W1'])
  })

  it('同 severity 内は入力順保持 (stable)', () => {
    const review = {
      checklist: [
        { status: 'warn' as const, point: 'W1', comment: '' },
        { status: 'fail' as const, point: 'F1', comment: '' },
        { status: 'warn' as const, point: 'W2', comment: '' },
        { status: 'fail' as const, point: 'F2', comment: '' },
      ],
    }
    const top = pickTopChecklistFindings(review, 4)
    // fail → F1, F2 (元順) / warn → W1, W2 (元順)
    expect(top.map((c) => c.point)).toEqual(['F1', 'F2', 'W1', 'W2'])
  })

  it('n=1 は pickWorstChecklistFinding と等価 (= 最重要 1 件)', () => {
    const review = {
      checklist: [
        { status: 'warn' as const, point: 'W1', comment: '' },
        { status: 'fail' as const, point: 'F1', comment: '' },
      ],
    }
    const top1 = pickTopChecklistFindings(review, 1)
    const worst = pickWorstChecklistFinding(review)
    expect(top1.length).toBe(1)
    expect(top1[0]).toEqual(worst)
  })

  it('入力 review.checklist を mutate しない', () => {
    const checklist = [
      { status: 'ok' as const, point: 'O', comment: '' },
      { status: 'fail' as const, point: 'F', comment: '' },
    ]
    const original = [...checklist]
    pickTopChecklistFindings({ checklist }, 2)
    expect(checklist).toEqual(original)
  })
})

describe('pickTopImprovements (iter1432 — 上位 N severe improvements)', () => {
  it('n <= 0 → 空配列', () => {
    const review = {
      improvements: [{ title: 'A', rationale: 'a', severity: 'high' as const }],
    }
    expect(pickTopImprovements(review, 0)).toEqual([])
  })

  it('空 improvements → 空配列', () => {
    expect(pickTopImprovements({ improvements: [] }, 3)).toEqual([])
  })

  it('混合 → severity 降順 (high → medium → low)', () => {
    const review = {
      improvements: [
        { title: 'L1', rationale: 'l1', severity: 'low' as const },
        { title: 'H1', rationale: 'h1', severity: 'high' as const },
        { title: 'M1', rationale: 'm1', severity: 'medium' as const },
        { title: 'H2', rationale: 'h2', severity: 'high' as const },
      ],
    }
    const top3 = pickTopImprovements(review, 3)
    expect(top3.map((i) => i.title)).toEqual(['H1', 'H2', 'M1'])
  })

  it('n=1 は pickTopImprovement と等価', () => {
    const review = {
      improvements: [
        { title: 'M1', rationale: 'm', severity: 'medium' as const },
        { title: 'H1', rationale: 'h', severity: 'high' as const },
      ],
    }
    const top1 = pickTopImprovements(review, 1)
    const single = pickTopImprovement(review)
    expect(top1.length).toBe(1)
    expect(top1[0]).toEqual(single)
  })

  it('入力 improvements を mutate しない', () => {
    const improvements = [
      { title: 'L', rationale: 'l', severity: 'low' as const },
      { title: 'H', rationale: 'h', severity: 'high' as const },
    ]
    const original = [...improvements]
    pickTopImprovements({ improvements }, 2)
    expect(improvements).toEqual(original)
  })
})
