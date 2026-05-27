import { describe, expect, it } from 'vitest'

import {
  formatPlanSuggestionSummaryJa,
  parseStructuredPlanSuggestion,
  StructuredPlanSuggestionSchema,
  summarizePlanSuggestion,
} from './structured-plan-suggestion'

const VALID = {
  hypothesis: 'daily standup を朝→昼に変更で完了率が上がる',
  target_metric_candidates: ['週次完了 item 数', '平均 lead time'],
  suggested_items: [
    { itemId: 'item-1', title: 'standup 時間変更を周知' },
    { title: '新規: 完了率ダッシュボードを作る' },
  ],
}

describe('StructuredPlanSuggestionSchema', () => {
  it('valid + suggested_items default []', () => {
    const r = StructuredPlanSuggestionSchema.safeParse({
      hypothesis: 'x',
      target_metric_candidates: ['m'],
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.suggested_items).toEqual([])
  })
  it('hypothesis 空は reject', () => {
    expect(
      StructuredPlanSuggestionSchema.safeParse({ hypothesis: ' ', target_metric_candidates: ['m'] })
        .success,
    ).toBe(false)
  })
  it('metric 候補 空配列は reject', () => {
    expect(
      StructuredPlanSuggestionSchema.safeParse({ hypothesis: 'x', target_metric_candidates: [] })
        .success,
    ).toBe(false)
  })
  it('metric 候補 6 件超は reject', () => {
    expect(
      StructuredPlanSuggestionSchema.safeParse({
        hypothesis: 'x',
        target_metric_candidates: ['1', '2', '3', '4', '5', '6'],
      }).success,
    ).toBe(false)
  })
  it('suggested item の title 空は reject', () => {
    expect(
      StructuredPlanSuggestionSchema.safeParse({
        hypothesis: 'x',
        target_metric_candidates: ['m'],
        suggested_items: [{ title: '' }],
      }).success,
    ).toBe(false)
  })
})

describe('parseStructuredPlanSuggestion', () => {
  it('object → ok + summary', () => {
    const r = parseStructuredPlanSuggestion(VALID)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.summary.metricCount).toBe(2)
      expect(r.summary.suggestedItemCount).toBe(2)
      expect(r.summary.existingItemCount).toBe(1)
    }
  })
  it('code block string から抽出', () => {
    const text = '提案:\n```json\n' + JSON.stringify(VALID) + '\n```'
    expect(parseStructuredPlanSuggestion(text).ok).toBe(true)
  })
  it('JSON 不在 → ok=false', () => {
    expect(parseStructuredPlanSuggestion('仮説を考えました').ok).toBe(false)
  })
  it('schema 不一致 → ok=false', () => {
    expect(parseStructuredPlanSuggestion({ hypothesis: 'x' }).ok).toBe(false)
  })
})

describe('summarize / format', () => {
  it('既存 item ありで (既存 N) を付ける', () => {
    const s = summarizePlanSuggestion(StructuredPlanSuggestionSchema.parse(VALID))
    expect(formatPlanSuggestionSummaryJa(s)).toBe('Plan 提案: metric 候補 2 / item 2 (既存 1)')
  })
  it('suggested item 0 → 既存 表記なし', () => {
    const s = summarizePlanSuggestion(
      StructuredPlanSuggestionSchema.parse({ hypothesis: 'x', target_metric_candidates: ['m'] }),
    )
    expect(formatPlanSuggestionSummaryJa(s)).toBe('Plan 提案: metric 候補 1 / item 0')
  })
})
