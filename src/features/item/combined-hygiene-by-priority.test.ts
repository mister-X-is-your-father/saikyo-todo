import { describe, expect, it } from 'vitest'

import {
  computeCombinedHygieneByPriority,
  formatCombinedHygieneByPriorityJa,
} from './combined-hygiene-by-priority'

interface Item {
  doneAt: Date | string | null
  archivedAt: Date | string | null
  dueDate: string | null
  dod: string | null
  description: string | null
  priority: number | null
}

function item(p: Partial<Item> & { priority: number }): Item {
  return {
    doneAt: null,
    archivedAt: null,
    dueDate: null,
    dod: null,
    description: null,
    ...p,
  }
}

describe('computeCombinedHygieneByPriority', () => {
  it('returns null score / eligibleAxes=0 for empty buckets', () => {
    const r = computeCombinedHygieneByPriority([])
    expect(r[1].score).toBe(null)
    expect(r[1].eligibleAxes).toBe(0)
    expect(r[2].score).toBe(null)
    expect(r[3].score).toBe(null)
    expect(r[4].score).toBe(null)
  })

  it('computes per-priority hygiene from 3 axes', () => {
    const items: Item[] = [
      // P1: 期限あり / DoD あり / 説明あり (= 3/3 軸 100% → score 100)
      item({ priority: 1, dueDate: '2026-05-01', dod: 'ok', description: 'desc' }),
      // P3: 期限なし / DoD なし / 説明なし (= 3/3 軸 0% → score 0)
      item({ priority: 3 }),
    ]
    const r = computeCombinedHygieneByPriority(items)
    expect(r[1].score).toBe(100)
    expect(r[1].eligibleAxes).toBe(3)
    expect(r[3].score).toBe(0)
    expect(r[3].eligibleAxes).toBe(3)
    // P2 / P4 は item なし → null
    expect(r[2].score).toBe(null)
    expect(r[4].score).toBe(null)
  })

  it('mixes per-priority — P1 perfect / P3 partial', () => {
    const items: Item[] = [
      item({ priority: 1, dueDate: '2026-05-01', dod: 'ok', description: 'd' }),
      item({ priority: 1, dueDate: '2026-05-02', dod: 'ok', description: 'd' }),
      item({ priority: 3, dueDate: '2026-05-03', dod: null, description: null }),
      item({ priority: 3, dueDate: null, dod: null, description: null }),
    ]
    const r = computeCombinedHygieneByPriority(items)
    // P1: 期限 2/2=100, DoD 2/2=100, desc 2/2=100 → 100
    expect(r[1].score).toBe(100)
    // P3: 期限 1/2=50, DoD 0/2=0, desc 0/2=0 → avg 16.67 → 17
    expect(r[3].score).toBe(17)
  })

  it('treats done / archived items as out of scope (not counted)', () => {
    const items: Item[] = [
      item({ priority: 1, doneAt: new Date(), dueDate: '2026-05-01' }),
      item({ priority: 1, archivedAt: new Date(), dueDate: '2026-05-02' }),
    ]
    const r = computeCombinedHygieneByPriority(items)
    expect(r[1].score).toBe(null)
    expect(r[1].eligibleAxes).toBe(0)
  })

  it('normalizes priority null / out-of-range to P4', () => {
    const items: Item[] = [
      item({ priority: null as unknown as number, dueDate: '2026-05-01', dod: 'ok' }),
      item({ priority: 9, dueDate: '2026-05-02', dod: null }),
    ]
    const r = computeCombinedHygieneByPriority(items)
    expect(r[4].eligibleAxes).toBe(3)
    // 期限 2/2=100, DoD 1/2=50, desc 0/2=0 → avg 50 → 50
    expect(r[4].score).toBe(50)
  })
})

describe('formatCombinedHygieneByPriorityJa', () => {
  it('formats empty buckets as "未完了 0 件 (該当なし)"', () => {
    const r = computeCombinedHygieneByPriority([])
    expect(formatCombinedHygieneByPriorityJa(r)).toBe('未完了 0 件 (該当なし)')
  })

  it('formats only non-empty priorities', () => {
    const items: Item[] = [
      item({ priority: 1, dueDate: '2026-05-01', dod: 'ok', description: 'd' }),
      item({ priority: 3, dueDate: null, dod: null, description: null }),
    ]
    const r = computeCombinedHygieneByPriority(items)
    expect(formatCombinedHygieneByPriorityJa(r)).toBe('Planning Hygiene: P1 100 / P3 0')
  })
})
