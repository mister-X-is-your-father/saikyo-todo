import { describe, expect, it } from 'vitest'

import {
  bucketByPriorityWith,
  countItemsByPriority,
  countNonEmptyPriorityBuckets,
  countNonEmptyPriorityBucketsBy,
  formatPriorityCounts,
  groupItemsByPriority,
  priorityClass,
  priorityLabel,
} from './priority'

describe('priority helpers', () => {
  it('priorityClass: 各 priority に対応する Tailwind class を返す', () => {
    expect(priorityClass(1)).toBe('bg-red-500')
    expect(priorityClass(2)).toBe('bg-amber-500')
    expect(priorityClass(3)).toBe('bg-blue-500')
    expect(priorityClass(4)).toBe('bg-slate-400')
  })

  it('priorityClass: null / undefined / 範囲外は p4 (slate) にフォールバック', () => {
    expect(priorityClass(null)).toBe('bg-slate-400')
    expect(priorityClass(undefined)).toBe('bg-slate-400')
    expect(priorityClass(99)).toBe('bg-slate-400')
  })

  it('priorityLabel: SR 向け日本語ラベルを返す', () => {
    expect(priorityLabel(1)).toBe('優先度: 最優先 (p1)')
    expect(priorityLabel(2)).toBe('優先度: 高 (p2)')
    expect(priorityLabel(3)).toBe('優先度: 中 (p3)')
    expect(priorityLabel(4)).toBe('優先度: 低 (p4)')
  })

  it('priorityLabel: null / undefined は p4 (低) として扱う', () => {
    expect(priorityLabel(null)).toBe('優先度: 低 (p4)')
    expect(priorityLabel(undefined)).toBe('優先度: 低 (p4)')
  })
})

describe('groupItemsByPriority', () => {
  it('priority 別に items を振り分け、順序は元配列順を保つ', () => {
    const items = [
      { id: 'a', priority: 1 },
      { id: 'b', priority: 3 },
      { id: 'c', priority: 1 },
      { id: 'd', priority: 2 },
      { id: 'e', priority: 4 },
    ]
    const groups = groupItemsByPriority(items)
    expect(groups[1].map((i) => i.id)).toEqual(['a', 'c'])
    expect(groups[2].map((i) => i.id)).toEqual(['d'])
    expect(groups[3].map((i) => i.id)).toEqual(['b'])
    expect(groups[4].map((i) => i.id)).toEqual(['e'])
  })

  it('priority null / undefined / 範囲外は p4 バケットに集約 (priorityClass のフォールバックと一貫)', () => {
    const items = [
      { id: 'a', priority: null },
      { id: 'b', priority: undefined },
      { id: 'c', priority: 99 },
      { id: 'd', priority: 0 },
      { id: 'e', priority: 4 },
    ]
    const groups = groupItemsByPriority(items)
    expect(groups[4].map((i) => i.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(groups[1]).toEqual([])
    expect(groups[2]).toEqual([])
    expect(groups[3]).toEqual([])
  })

  it('空配列でも 4 つの bucket が空配列で初期化される (undefined チェック不要)', () => {
    const groups = groupItemsByPriority([])
    expect(groups[1]).toEqual([])
    expect(groups[2]).toEqual([])
    expect(groups[3]).toEqual([])
    expect(groups[4]).toEqual([])
  })
})

describe('countItemsByPriority', () => {
  it('priority 別に件数を集計', () => {
    const items = [
      { priority: 1 },
      { priority: 1 },
      { priority: 2 },
      { priority: 3 },
      { priority: 3 },
      { priority: 3 },
      { priority: 4 },
    ]
    expect(countItemsByPriority(items)).toEqual({ 1: 2, 2: 1, 3: 3, 4: 1 })
  })

  it('null / undefined / 範囲外は p4 件数に加算', () => {
    const items = [{ priority: null }, { priority: undefined }, { priority: 99 }, { priority: 1 }]
    expect(countItemsByPriority(items)).toEqual({ 1: 1, 2: 0, 3: 0, 4: 3 })
  })

  it('空配列は全 0', () => {
    expect(countItemsByPriority([])).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 })
  })
})

describe('formatPriorityCounts', () => {
  it('AI prompt 用の 1 行 summary を返す (件数 0 の bucket は省略)', () => {
    expect(formatPriorityCounts({ 1: 2, 2: 1, 3: 3, 4: 1 })).toBe('最優先 2 / 高 1 / 中 3 / 低 1')
  })

  it('一部の bucket だけ件数があれば、その分だけ表示', () => {
    expect(formatPriorityCounts({ 1: 0, 2: 5, 3: 0, 4: 2 })).toBe('高 5 / 低 2')
    expect(formatPriorityCounts({ 1: 1, 2: 0, 3: 0, 4: 0 })).toBe('最優先 1')
  })

  it('全 0 件は "0 件"', () => {
    expect(formatPriorityCounts({ 1: 0, 2: 0, 3: 0, 4: 0 })).toBe('0 件')
  })

  it('priority 順 (1→2→3→4) で並ぶ — 入力 record の key 順に依存しない', () => {
    expect(formatPriorityCounts({ 4: 1, 3: 2, 2: 3, 1: 4 })).toBe('最優先 4 / 高 3 / 中 2 / 低 1')
  })
})

describe('bucketByPriorityWith', () => {
  it('returns initial values from compute() for empty bucket', () => {
    const r = bucketByPriorityWith([] as Array<{ priority: number; v: number }>, (g) => g.length)
    expect(r).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 })
  })

  it('groups items by priority and applies compute() to each bucket', () => {
    const items = [
      { priority: 1, v: 10 },
      { priority: 1, v: 20 },
      { priority: 3, v: 30 },
      { priority: 4, v: 40 },
    ]
    const r = bucketByPriorityWith(items, (g) => g.reduce((s, it) => s + it.v, 0))
    expect(r).toEqual({ 1: 30, 2: 0, 3: 30, 4: 40 })
  })

  it('normalizes null/undefined/out-of-range priority to p4', () => {
    const items = [
      { priority: null as null | number, v: 1 },
      { priority: undefined as undefined | number, v: 2 },
      { priority: 99, v: 3 },
    ]
    const r = bucketByPriorityWith(items, (g) => g.length)
    expect(r).toEqual({ 1: 0, 2: 0, 3: 0, 4: 3 })
  })

  it('preserves item order within bucket (stable)', () => {
    const items = [
      { priority: 1, v: 'a' },
      { priority: 1, v: 'b' },
      { priority: 1, v: 'c' },
    ]
    const r = bucketByPriorityWith(items, (g) => g.map((it) => it.v).join(''))
    expect(r[1]).toBe('abc')
  })
})

describe('countNonEmptyPriorityBuckets / countNonEmptyPriorityBucketsBy', () => {
  it('countNonEmptyPriorityBuckets: counts buckets with total > 0', () => {
    const r = countNonEmptyPriorityBuckets({
      1: { total: 3 },
      2: { total: 0 },
      3: { total: 1 },
      4: { total: 0 },
    })
    expect(r).toBe(2)
  })

  it('countNonEmptyPriorityBucketsBy: applies custom predicate', () => {
    const byPriority: Record<1 | 2 | 3 | 4, { score: number | null }> = {
      1: { score: 80 },
      2: { score: null },
      3: { score: 30 },
      4: { score: null },
    }
    expect(countNonEmptyPriorityBucketsBy(byPriority, (s) => s.score !== null)).toBe(2)
  })

  it('countNonEmptyPriorityBucketsBy: returns 0 when all buckets empty by predicate', () => {
    expect(
      countNonEmptyPriorityBucketsBy(
        { 1: { count: 0 }, 2: { count: 0 }, 3: { count: 0 }, 4: { count: 0 } },
        (s) => s.count > 0,
      ),
    ).toBe(0)
  })
})
