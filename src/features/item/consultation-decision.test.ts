import { describe, expect, it } from 'vitest'

import {
  appendConsultationDecision,
  buildConsultationDecisionRecord,
} from './consultation-decision'

describe('buildConsultationDecisionRecord', () => {
  it('選択 / 理由 / 決定者 / 日付 を markdown に', () => {
    expect(
      buildConsultationDecisionRecord({
        chosenOptionLabel: 'B 案: 既存改修',
        reason: 'コスト面で現実的',
        decidedBy: '田中',
        decidedAt: '2026-05-27T03:00:00Z',
      }),
    ).toBe(
      '---\n## 決定 (2026-05-27)\n- 選択: B 案: 既存改修\n- 理由: コスト面で現実的\n- 決定者: 田中',
    )
  })

  it('理由なし → 理由行を省略', () => {
    const r = buildConsultationDecisionRecord({
      chosenOptionLabel: 'A 案',
      decidedAt: '2026-05-27T00:00:00Z',
    })
    expect(r).not.toContain('- 理由:')
    expect(r).toContain('- 選択: A 案')
  })

  it('決定者なし → 決定者行を省略', () => {
    const r = buildConsultationDecisionRecord({
      chosenOptionLabel: 'A 案',
      reason: 'x',
      decidedAt: '2026-05-27T00:00:00Z',
    })
    expect(r).not.toContain('- 決定者:')
  })

  it('不正な日付 → 日付なし見出し', () => {
    const r = buildConsultationDecisionRecord({
      chosenOptionLabel: 'A 案',
      decidedAt: 'invalid',
    })
    expect(r).toContain('## 決定\n')
    expect(r).not.toContain('## 決定 (')
  })

  it('label / reason の前後空白を trim', () => {
    const r = buildConsultationDecisionRecord({
      chosenOptionLabel: '  A 案  ',
      reason: '  理由  ',
      decidedAt: '2026-05-27T00:00:00Z',
    })
    expect(r).toContain('- 選択: A 案\n')
    expect(r).toContain('- 理由: 理由')
  })
})

describe('appendConsultationDecision', () => {
  it('空 description → 記録のみ', () => {
    const r = appendConsultationDecision('', {
      chosenOptionLabel: 'A 案',
      decidedAt: '2026-05-27T00:00:00Z',
    })
    expect(r.startsWith('---\n## 決定')).toBe(true)
  })

  it('既存 description → 空行を挟んで連結', () => {
    const r = appendConsultationDecision('元の本文', {
      chosenOptionLabel: 'A 案',
      decidedAt: '2026-05-27T00:00:00Z',
    })
    expect(r).toBe('元の本文\n\n---\n## 決定 (2026-05-27)\n- 選択: A 案')
  })

  it('末尾の余分な改行は trim してから連結', () => {
    const r = appendConsultationDecision('本文\n\n\n', {
      chosenOptionLabel: 'A 案',
      decidedAt: '2026-05-27T00:00:00Z',
    })
    expect(r.startsWith('本文\n\n---')).toBe(true)
  })
})
