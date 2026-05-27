import { describe, expect, it } from 'vitest'

import {
  actionsToActDecisionsMarkdown,
  formatActDecisionsSummaryJa,
  parseStructuredActDecisions,
  StructuredActDecisionsSchema,
  summarizeActDecisions,
} from './structured-act-decisions'

const VALID = {
  actions: [
    { description: 'PR レビュー SLA を 4h に短縮', owner_candidate: '@alice', est_min: 30 },
    { description: 'QA 工数を見直す', owner_candidate: 'QA チーム', est_min: 60 },
  ],
}

describe('StructuredActDecisionsSchema', () => {
  it('valid + owner/est default', () => {
    const r = StructuredActDecisionsSchema.safeParse({ actions: [{ description: 'x' }] })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.actions[0]!.owner_candidate).toBe('')
      expect(r.data.actions[0]!.est_min).toBe(0)
    }
  })
  it('actions 空は reject', () => {
    expect(StructuredActDecisionsSchema.safeParse({ actions: [] }).success).toBe(false)
  })
  it('actions 4 件超は reject', () => {
    expect(
      StructuredActDecisionsSchema.safeParse({
        actions: [
          { description: 'a' },
          { description: 'b' },
          { description: 'c' },
          { description: 'd' },
        ],
      }).success,
    ).toBe(false)
  })
  it('est_min 負値 / 非整数は reject', () => {
    expect(
      StructuredActDecisionsSchema.safeParse({ actions: [{ description: 'a', est_min: -1 }] })
        .success,
    ).toBe(false)
    expect(
      StructuredActDecisionsSchema.safeParse({ actions: [{ description: 'a', est_min: 1.5 }] })
        .success,
    ).toBe(false)
  })
  it('空 description は reject', () => {
    expect(
      StructuredActDecisionsSchema.safeParse({ actions: [{ description: ' ' }] }).success,
    ).toBe(false)
  })
})

describe('parseStructuredActDecisions', () => {
  it('object → ok + summary', () => {
    const r = parseStructuredActDecisions(VALID)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.summary.actionCount).toBe(2)
      expect(r.summary.totalEstMin).toBe(90)
      expect(r.summary.ownedCount).toBe(2)
    }
  })
  it('code block string から抽出', () => {
    const text = 'これが提案です:\n```json\n' + JSON.stringify(VALID) + '\n```'
    expect(parseStructuredActDecisions(text).ok).toBe(true)
  })
  it('JSON 不在 → ok=false', () => {
    const r = parseStructuredActDecisions('改善案を考えました')
    expect(r.ok).toBe(false)
  })
  it('schema 不一致 → ok=false', () => {
    expect(parseStructuredActDecisions({ actions: [] }).ok).toBe(false)
  })
})

describe('summarize / format', () => {
  it('est 合計あり → 計 N 付き 1 行', () => {
    const s = summarizeActDecisions(StructuredActDecisionsSchema.parse(VALID))
    expect(formatActDecisionsSummaryJa(s)).toBe('Act: 改善 2 件 / 計 1時間30分')
  })
  it('est 合計 0 → 計 を省略', () => {
    const s = summarizeActDecisions(
      StructuredActDecisionsSchema.parse({ actions: [{ description: 'x' }] }),
    )
    expect(formatActDecisionsSummaryJa(s)).toBe('Act: 改善 1 件')
  })
})

describe('actionsToActDecisionsMarkdown (AI-3 → P-6 連結)', () => {
  it('owner + est を括弧付き bullet に', () => {
    const md = actionsToActDecisionsMarkdown(StructuredActDecisionsSchema.parse(VALID).actions)
    expect(md).toBe(
      '- PR レビュー SLA を 4h に短縮 (@alice, 30分)\n- QA 工数を見直す (QA チーム, 1時間)',
    )
  })
  it('owner/est 無しは括弧省略', () => {
    const md = actionsToActDecisionsMarkdown(
      StructuredActDecisionsSchema.parse({ actions: [{ description: 'ドキュメント整備' }] })
        .actions,
    )
    expect(md).toBe('- ドキュメント整備')
  })
})
