import { describe, expect, it } from 'vitest'

import {
  computeSimilarMustHistory,
  formatSimilarMustHistoryJa,
  type SimilarHistoryItemFields,
} from './must-similar-history'

function mk(over: Partial<SimilarHistoryItemFields> & { id: string }): SimilarHistoryItemFields {
  return {
    isMust: true,
    dueDate: null,
    doneAt: null,
    tagIds: [],
    assigneeIds: [],
    ...over,
  }
}

describe('computeSimilarMustHistory', () => {
  it('target に tag / assignee 両方 無し → EMPTY', () => {
    const target = mk({ id: 't' })
    const r = computeSimilarMustHistory([target], target)
    expect(r.similarItemCount).toBe(0)
    expect(r.slipStats.count).toBe(0)
  })

  it('類似 0 件 (tag も assignee も交差なし) → EMPTY', () => {
    const target = mk({ id: 't', tagIds: ['tag-a'], assigneeIds: ['u1'] })
    const others = [
      mk({ id: 'a', tagIds: ['tag-b'], assigneeIds: ['u2'] }),
      mk({ id: 'b', tagIds: ['tag-c'], assigneeIds: [] }),
    ]
    const r = computeSimilarMustHistory([target, ...others], target)
    expect(r.similarItemCount).toBe(0)
  })

  it('同 tag を共有する MUST item が類似に含まれる', () => {
    const target = mk({ id: 't', tagIds: ['tag-a'] })
    const items = [
      target,
      mk({ id: 'a', tagIds: ['tag-a'], dueDate: '2026-04-20', doneAt: new Date('2026-04-25') }),
      mk({ id: 'b', tagIds: ['tag-b'] }), // not similar
    ]
    const r = computeSimilarMustHistory(items, target)
    expect(r.similarItemCount).toBe(1)
    expect(r.slipStats.count).toBe(1)
    expect(r.slipStats.maxDays).toBe(5)
  })

  it('同 assignee を共有する MUST item が類似に含まれる', () => {
    const target = mk({ id: 't', assigneeIds: ['u1'] })
    const items = [
      target,
      mk({ id: 'a', assigneeIds: ['u1'], dueDate: '2026-04-20', doneAt: new Date('2026-04-23') }),
      mk({ id: 'b', assigneeIds: ['u2'] }),
    ]
    const r = computeSimilarMustHistory(items, target)
    expect(r.similarItemCount).toBe(1)
    expect(r.slipStats.maxDays).toBe(3)
  })

  it('isMust=false の item は類似に含めない', () => {
    const target = mk({ id: 't', tagIds: ['tag-a'] })
    const items = [
      target,
      mk({
        id: 'a',
        tagIds: ['tag-a'],
        isMust: false, // 除外
        dueDate: '2026-04-20',
        doneAt: new Date('2026-04-25'),
      }),
    ]
    const r = computeSimilarMustHistory(items, target)
    expect(r.similarItemCount).toBe(0)
  })

  it('target 自身は集計に含めない', () => {
    const target = mk({
      id: 't',
      tagIds: ['tag-a'],
      dueDate: '2026-04-20',
      doneAt: new Date('2026-04-25'),
    })
    const r = computeSimilarMustHistory([target], target)
    expect(r.similarItemCount).toBe(0)
  })

  it('複数 done overdue で avg / median / max が出る', () => {
    const target = mk({ id: 't', tagIds: ['tag-a'] })
    const items = [
      target,
      mk({ id: 'a', tagIds: ['tag-a'], dueDate: '2026-04-20', doneAt: new Date('2026-04-23') }), // 3 日
      mk({ id: 'b', tagIds: ['tag-a'], dueDate: '2026-04-15', doneAt: new Date('2026-04-25') }), // 10 日
      mk({ id: 'c', tagIds: ['tag-a'], dueDate: '2026-04-10', doneAt: new Date('2026-04-12') }), // 2 日
    ]
    const r = computeSimilarMustHistory(items, target)
    expect(r.similarItemCount).toBe(3)
    expect(r.slipStats.count).toBe(3)
    expect(r.slipStats.avgDays).toBe(5)
    expect(r.slipStats.maxDays).toBe(10)
  })
})

describe('formatSimilarMustHistoryJa', () => {
  it('類似 0 件 → "履歴なし"', () => {
    const r = formatSimilarMustHistoryJa({
      similarItemCount: 0,
      slipStats: { count: 0, avgDays: null, medianDays: null, maxDays: null },
    })
    expect(r).toBe('類似 0 件 (履歴なし)')
  })

  it('類似有るが slip=0 → "過去 overdue なし"', () => {
    const r = formatSimilarMustHistoryJa({
      similarItemCount: 5,
      slipStats: { count: 0, avgDays: null, medianDays: null, maxDays: null },
    })
    expect(r).toBe('類似 5 件 (過去 overdue なし)')
  })

  it('単一 overdue は短縮形', () => {
    const r = formatSimilarMustHistoryJa({
      similarItemCount: 3,
      slipStats: { count: 1, avgDays: 5, medianDays: 5, maxDays: 5 },
    })
    expect(r).toBe('類似 3 件中 過去 overdue 1 件 (5日)')
  })

  it('複数 overdue は full 形式', () => {
    const r = formatSimilarMustHistoryJa({
      similarItemCount: 5,
      slipStats: { count: 3, avgDays: 4, medianDays: 3, maxDays: 12 },
    })
    expect(r).toBe('類似 5 件中 過去 overdue 3 件 (平均 4日 / 中央値 3日 / 最大 12日)')
  })
})
