import { describe, expect, it } from 'vitest'

import { uuidToLabel } from '@/lib/db/ltree-path'

import {
  computeParentItemsProgressByPriority,
  formatAggregateParentItemsJa,
  formatParentItemsProgressBriefJa,
  formatParentItemsProgressByPriorityJa,
  type ParentItemProgress,
  pickIncompleteParentItems,
  summarizeParentItemsAggregate,
} from './parent-items-progress'

const NOW = new Date('2026-04-29T00:00:00Z')

const PARENT_A = '00000000-0000-0000-0000-00000000aaaa'
const PARENT_A_FULL = uuidToLabel(PARENT_A)
const PARENT_B = '00000000-0000-0000-0000-00000000bbbb'
const PARENT_B_FULL = uuidToLabel(PARENT_B)

interface TestItem {
  id: string
  title: string
  parentPath: string
  status: string | null | undefined
  deletedAt?: Date | null
  priority?: number | null
}

const item = (id: string, overrides: Partial<TestItem> = {}): TestItem => ({
  id,
  title: `T-${id}`,
  parentPath: '',
  status: 'todo',
  deletedAt: null,
  ...overrides,
})

describe('pickIncompleteParentItems', () => {
  it('items 空 → []', () => {
    expect(pickIncompleteParentItems([])).toEqual([])
  })

  it('子ゼロの parent (= 末端) は除外', () => {
    const r = pickIncompleteParentItems([item(PARENT_A, { title: 'lonely' })])
    expect(r).toEqual([])
  })

  it('1 parent + 子 5 (うち done 2) → 1 entry', () => {
    const items = [
      item(PARENT_A, { title: 'parent-A' }),
      item('c1', { parentPath: PARENT_A_FULL, status: 'done' }),
      item('c2', { parentPath: PARENT_A_FULL, status: 'done' }),
      item('c3', { parentPath: PARENT_A_FULL, status: 'todo' }),
      item('c4', { parentPath: PARENT_A_FULL, status: 'in_progress' }),
      item('c5', { parentPath: PARENT_A_FULL, status: 'blocked' }),
    ]
    const r = pickIncompleteParentItems(items)
    expect(r).toHaveLength(1)
    expect(r[0]?.parent.id).toBe(PARENT_A)
    expect(r[0]?.progress.total).toBe(5)
    expect(r[0]?.progress.done).toBe(2)
    expect(r[0]?.progress.pctDone).toBe(40)
    expect(r[0]?.progress.isComplete).toBe(false)
  })

  it('全 done parent (isComplete) は除外', () => {
    const r = pickIncompleteParentItems([
      item(PARENT_A, { title: 'done-parent' }),
      item('c1', { parentPath: PARENT_A_FULL, status: 'done' }),
      item('c2', { parentPath: PARENT_A_FULL, status: 'done' }),
    ])
    expect(r).toEqual([])
  })

  it('parent.deletedAt → 除外', () => {
    const r = pickIncompleteParentItems([
      item(PARENT_A, { title: 'deleted', deletedAt: NOW }),
      item('c1', { parentPath: PARENT_A_FULL, status: 'todo' }),
    ])
    expect(r).toEqual([])
  })

  it('複数 parent → pctDone 昇順 (低進捗が先)', () => {
    const r = pickIncompleteParentItems([
      // A: 10% (1/10)
      item(PARENT_A, { title: 'A' }),
      ...Array.from({ length: 9 }, (_, i) =>
        item(`a${i}`, { parentPath: PARENT_A_FULL, status: 'todo' }),
      ),
      item('aDone', { parentPath: PARENT_A_FULL, status: 'done' }),
      // B: 60% (6/10)
      item(PARENT_B, { title: 'B' }),
      ...Array.from({ length: 4 }, (_, i) =>
        item(`b${i}`, { parentPath: PARENT_B_FULL, status: 'todo' }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        item(`bDone${i}`, { parentPath: PARENT_B_FULL, status: 'done' }),
      ),
    ])
    expect(r).toHaveLength(2)
    expect(r[0]?.parent.id).toBe(PARENT_A)
    expect(r[0]?.progress.pctDone).toBe(10)
    expect(r[1]?.parent.id).toBe(PARENT_B)
    expect(r[1]?.progress.pctDone).toBe(60)
  })

  it('同 pctDone は title 昇順 (ja)', () => {
    const r = pickIncompleteParentItems([
      item(PARENT_A, { title: 'りんご' }),
      item('a1', { parentPath: PARENT_A_FULL, status: 'todo' }),
      item('a2', { parentPath: PARENT_A_FULL, status: 'done' }),
      item(PARENT_B, { title: 'あんず' }),
      item('b1', { parentPath: PARENT_B_FULL, status: 'todo' }),
      item('b2', { parentPath: PARENT_B_FULL, status: 'done' }),
    ])
    expect(r.map((e) => e.parent.id)).toEqual([PARENT_B, PARENT_A]) // あんず → りんご
  })
})

describe('formatParentItemsProgressBriefJa', () => {
  it('空 → "進行中の案件 0 件"', () => {
    expect(formatParentItemsProgressBriefJa([])).toBe('進行中の案件 0 件')
  })

  it('1 件 → "進行中: A 30% (3/10)"', () => {
    expect(
      formatParentItemsProgressBriefJa([
        {
          parent: item(PARENT_A, { title: 'リリース準備' }),
          progress: {
            total: 10,
            done: 3,
            inProgress: 0,
            blocked: 0,
            todo: 7,
            cancelled: 0,
            unknown: 0,
            pctDone: 30,
            isComplete: false,
          },
          priority: 4,
        },
      ]),
    ).toBe('進行中: リリース準備 30% (3/10)')
  })

  it('limit 超過 → "他 K 件" tail', () => {
    const entries = ['A', 'B', 'C', 'D', 'E'].map((title, i) => ({
      parent: item(`p${i}`, { title }),
      progress: {
        total: 10,
        done: i,
        inProgress: 0,
        blocked: 0,
        todo: 10 - i,
        cancelled: 0,
        unknown: 0,
        pctDone: i * 10,
        isComplete: false,
      },
      priority: 4 as const,
    }))
    expect(formatParentItemsProgressBriefJa(entries, 3)).toBe(
      '進行中: A 0% (0/10) / B 10% (1/10) / C 20% (2/10) / 他 2 件',
    )
  })

  it('title 空 → "(無題)"', () => {
    expect(
      formatParentItemsProgressBriefJa([
        {
          parent: item(PARENT_A, { title: '' }),
          progress: {
            total: 5,
            done: 1,
            inProgress: 0,
            blocked: 0,
            todo: 4,
            cancelled: 0,
            unknown: 0,
            pctDone: 20,
            isComplete: false,
          },
          priority: 4,
        },
      ]),
    ).toBe('進行中: (無題) 20% (1/5)')
  })
})

describe('summarizeParentItemsAggregate / formatAggregateParentItemsJa', () => {
  const e = (pct: number): ParentItemProgress<{ title: string }> => ({
    parent: { title: `T-${pct}` },
    progress: {
      total: 10,
      done: Math.round((pct / 100) * 10),
      inProgress: 0,
      blocked: 0,
      todo: 10 - Math.round((pct / 100) * 10),
      cancelled: 0,
      unknown: 0,
      pctDone: pct,
      isComplete: pct === 100,
    },
    priority: 4,
  })

  it('空 → all-zero aggregate', () => {
    expect(summarizeParentItemsAggregate([])).toEqual({
      count: 0,
      avgPctDone: 0,
      byTier: { stuck: 0, slow: 0, healthy: 0, almostDone: 0 },
    })
    expect(formatAggregateParentItemsJa(summarizeParentItemsAggregate([]))).toBe('進行中 0 件')
  })

  it('1 entry pct=30 → slow 1 / avg=30%', () => {
    const r = summarizeParentItemsAggregate([e(30)])
    expect(r).toEqual({
      count: 1,
      avgPctDone: 30,
      byTier: { stuck: 0, slow: 1, healthy: 0, almostDone: 0 },
    })
    expect(formatAggregateParentItemsJa(r)).toBe('進行中 1 件: 平均 30%, 前半遅延 1')
  })

  it('tier 境界 (25 / 50 / 75) は下側 tier に入る', () => {
    expect(summarizeParentItemsAggregate([e(0)]).byTier.stuck).toBe(1)
    expect(summarizeParentItemsAggregate([e(24)]).byTier.stuck).toBe(1)
    expect(summarizeParentItemsAggregate([e(25)]).byTier.slow).toBe(1)
    expect(summarizeParentItemsAggregate([e(49)]).byTier.slow).toBe(1)
    expect(summarizeParentItemsAggregate([e(50)]).byTier.healthy).toBe(1)
    expect(summarizeParentItemsAggregate([e(74)]).byTier.healthy).toBe(1)
    expect(summarizeParentItemsAggregate([e(75)]).byTier.almostDone).toBe(1)
    expect(summarizeParentItemsAggregate([e(99)]).byTier.almostDone).toBe(1)
  })

  it('混在 tier (10 / 30 / 60 / 80 / 90) → 全 4 bucket 顕在', () => {
    const r = summarizeParentItemsAggregate([e(10), e(30), e(60), e(80), e(90)])
    expect(r.count).toBe(5)
    expect(r.avgPctDone).toBe(54) // (10+30+60+80+90)/5 = 270/5 = 54
    expect(r.byTier).toEqual({ stuck: 1, slow: 1, healthy: 1, almostDone: 2 })
    expect(formatAggregateParentItemsJa(r)).toBe(
      '進行中 5 件: 平均 54%, 停滞 1 / 前半遅延 1 / 順調 1 / 仕上げ 2',
    )
  })

  it('count=0 tier は format で省略', () => {
    const r = summarizeParentItemsAggregate([e(60), e(70), e(80)])
    expect(formatAggregateParentItemsJa(r)).toBe('進行中 3 件: 平均 70%, 順調 2 / 仕上げ 1')
  })

  it('avgPctDone は Math.round で整数化', () => {
    // avg = (33 + 67) / 2 = 50 (round)
    const r = summarizeParentItemsAggregate([e(33), e(67)])
    expect(r.avgPctDone).toBe(50)
  })
})

describe('pickIncompleteParentItems — priority 抽出', () => {
  it('parent.priority=1 は priority=1 で entry に乗る', () => {
    const r = pickIncompleteParentItems([
      item(PARENT_A, { title: 'P1', priority: 1 }),
      item('c1', { parentPath: PARENT_A_FULL, status: 'todo' }),
    ])
    expect(r[0]?.priority).toBe(1)
  })

  it('priority=null / 範囲外 (5) は 4 に集約', () => {
    const r = pickIncompleteParentItems([
      item(PARENT_A, { title: 'A', priority: null }),
      item('a1', { parentPath: PARENT_A_FULL, status: 'todo' }),
      item(PARENT_B, { title: 'B', priority: 5 }),
      item('b1', { parentPath: PARENT_B_FULL, status: 'todo' }),
    ])
    expect(r.map((x) => x.priority)).toEqual([4, 4])
  })
})

describe('computeParentItemsProgressByPriority / formatParentItemsProgressByPriorityJa', () => {
  const e = (
    id: string,
    pct: number,
    priority: 1 | 2 | 3 | 4 = 4,
  ): ParentItemProgress<TestItem> => ({
    parent: item(id, { priority, title: `T-${id}` }),
    progress: {
      total: 10,
      done: Math.round((pct / 100) * 10),
      inProgress: 0,
      blocked: 0,
      todo: 10 - Math.round((pct / 100) * 10),
      cancelled: 0,
      unknown: 0,
      pctDone: pct,
      isComplete: false,
    },
    priority,
  })

  it('空 → 全 bucket count=0 / avg=null', () => {
    const r = computeParentItemsProgressByPriority([])
    expect(r).toEqual({
      1: { count: 0, avgPctDone: null },
      2: { count: 0, avgPctDone: null },
      3: { count: 0, avgPctDone: null },
      4: { count: 0, avgPctDone: null },
    })
    expect(formatParentItemsProgressByPriorityJa(r)).toBe('進行中の案件 0 件')
  })

  it('P1 1 件 (30%) + P3 2 件 (60% / 80%) → P3 avg=70', () => {
    const r = computeParentItemsProgressByPriority([e('a', 30, 1), e('b', 60, 3), e('c', 80, 3)])
    expect(r[1]).toEqual({ count: 1, avgPctDone: 30 })
    expect(r[2]).toEqual({ count: 0, avgPctDone: null })
    expect(r[3]).toEqual({ count: 2, avgPctDone: 70 })
    expect(r[4]).toEqual({ count: 0, avgPctDone: null })
    expect(formatParentItemsProgressByPriorityJa(r)).toBe(
      '進行中: P1 1 件 (平均 30%) / P3 2 件 (平均 70%)',
    )
  })

  it('単一 priority 偏在 → 1 行のみ', () => {
    const r = computeParentItemsProgressByPriority([e('a', 30, 4), e('b', 50, 4)])
    expect(formatParentItemsProgressByPriorityJa(r)).toBe('進行中: P4 2 件 (平均 40%)')
  })

  it('avgPctDone は Math.round で整数化 (33 + 67 → 50)', () => {
    const r = computeParentItemsProgressByPriority([e('a', 33, 2), e('b', 67, 2)])
    expect(r[2]?.avgPctDone).toBe(50)
  })
})
