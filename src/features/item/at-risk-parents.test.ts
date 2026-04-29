import { describe, expect, it } from 'vitest'

import { uuidToLabel } from '@/lib/db/ltree-path'

import {
  type AtRiskParentEntry,
  classifyAtRiskParentsHint,
  computeAtRiskParentsByPriority,
  formatAtRiskParentsBriefJa,
  formatAtRiskParentsByPriorityJa,
  formatAtRiskParentsHintJa,
  pickAtRiskParents,
} from './at-risk-parents'

const NOW = new Date('2026-04-29T00:00:00Z')

const PARENT_A = '00000000-0000-0000-0000-00000000aaaa'
const PARENT_A_FULL = uuidToLabel(PARENT_A)
const PARENT_B = '00000000-0000-0000-0000-00000000bbbb'
const PARENT_B_FULL = uuidToLabel(PARENT_B)

interface TestItem {
  id: string
  title: string
  parentPath: string
  status: string | null
  updatedAt: Date | string | null
  doneAt?: Date | null
  deletedAt?: Date | null
  priority?: number | null
}

const item = (id: string, overrides: Partial<TestItem> = {}): TestItem => ({
  id,
  title: `T-${id}`,
  parentPath: '',
  status: 'todo',
  updatedAt: NOW,
  doneAt: null,
  deletedAt: null,
  ...overrides,
})

const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)

describe('pickAtRiskParents', () => {
  it('items 空 → []', () => {
    expect(pickAtRiskParents([], {}, NOW)).toEqual([])
  })

  it('parent + 子 1 (updatedAt 14 日前) → at-risk (default threshold 7)', () => {
    const r = pickAtRiskParents(
      [
        item(PARENT_A, { title: 'parent-A' }),
        item('c1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(14) }),
      ],
      {},
      NOW,
    )
    expect(r).toHaveLength(1)
    expect(r[0]?.parent.id).toBe(PARENT_A)
    expect(r[0]?.maxStaleDays).toBe(14)
    expect(r[0]?.activeDescendantCount).toBe(1)
  })

  it('全子孫 updatedAt < 7 日 → at-risk ではない', () => {
    const r = pickAtRiskParents(
      [
        item(PARENT_A),
        item('c1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(3) }),
        item('c2', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(5) }),
      ],
      {},
      NOW,
    )
    expect(r).toEqual([])
  })

  it('threshold をオーバライド (= 3 日) で 4 日前の子も検出', () => {
    const r = pickAtRiskParents(
      [item(PARENT_A), item('c1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(4) })],
      { thresholdDays: 3 },
      NOW,
    )
    expect(r).toHaveLength(1)
    expect(r[0]?.maxStaleDays).toBe(4)
  })

  it('done 子は active からスキップ (集計対象外)', () => {
    const r = pickAtRiskParents(
      [
        item(PARENT_A),
        // 唯一 active 子は 3 日前 (未 stale)、done 子は 30 日前
        item('c1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(3) }),
        item('c2', {
          parentPath: PARENT_A_FULL,
          updatedAt: daysAgo(30),
          doneAt: daysAgo(20),
          status: 'done',
        }),
      ],
      {},
      NOW,
    )
    expect(r).toEqual([])
  })

  it('cancelled 子も active から除外', () => {
    const r = pickAtRiskParents(
      [
        item(PARENT_A),
        item('c1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(3) }),
        item('c2', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(30), status: 'cancelled' }),
      ],
      {},
      NOW,
    )
    expect(r).toEqual([])
  })

  it('parent 自身が done → 結果に含めない', () => {
    const r = pickAtRiskParents(
      [
        item(PARENT_A, { doneAt: daysAgo(1) }),
        item('c1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(20) }),
      ],
      {},
      NOW,
    )
    expect(r).toEqual([])
  })

  it('parent 自身が deletedAt → 結果に含めない', () => {
    const r = pickAtRiskParents(
      [
        item(PARENT_A, { deletedAt: NOW }),
        item('c1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(20) }),
      ],
      {},
      NOW,
    )
    expect(r).toEqual([])
  })

  it('複数 parent → maxStaleDays 降順', () => {
    const r = pickAtRiskParents(
      [
        item(PARENT_A, { title: 'A' }),
        item('a1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(14) }),
        item(PARENT_B, { title: 'B' }),
        item('b1', { parentPath: PARENT_B_FULL, updatedAt: daysAgo(20) }),
      ],
      {},
      NOW,
    )
    expect(r.map((e) => e.parent.id)).toEqual([PARENT_B, PARENT_A])
    expect(r.map((e) => e.maxStaleDays)).toEqual([20, 14])
  })

  it('孫タスクも集計に含める (parentPath が parentFull. で始まる)', () => {
    const grandPrefix = `${PARENT_A_FULL}.${uuidToLabel('00000000-0000-0000-0000-00000000cccc')}`
    const r = pickAtRiskParents(
      [
        item(PARENT_A),
        item('c1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(3) }), // 直下: 新しい
        item('g1', { parentPath: grandPrefix, updatedAt: daysAgo(20) }), // 孫: 古い
      ],
      {},
      NOW,
    )
    expect(r).toHaveLength(1)
    expect(r[0]?.maxStaleDays).toBe(20) // 孫の最古 = 20
    expect(r[0]?.activeDescendantCount).toBe(2)
  })

  it('updatedAt が未来時刻 → diffMs < 0 → skip (= 実 stale なし扱い)', () => {
    const future = new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000)
    const r = pickAtRiskParents(
      [item(PARENT_A), item('c1', { parentPath: PARENT_A_FULL, updatedAt: future })],
      {},
      NOW,
    )
    // active 子 1 件あるが updatedAt が未来 → stale 0、threshold 未満で除外
    expect(r).toEqual([])
  })
})

describe('formatAtRiskParentsBriefJa', () => {
  it('空 → "触れていない案件 0 件"', () => {
    expect(formatAtRiskParentsBriefJa([])).toBe('触れていない案件 0 件')
  })

  it('1 件 → "触れていない案件 1 件: A 14日"', () => {
    expect(
      formatAtRiskParentsBriefJa([
        {
          parent: item(PARENT_A, { title: 'リリース準備' }),
          maxStaleDays: 14,
          activeDescendantCount: 3,
          priority: 4,
        },
      ]),
    ).toBe('触れていない案件 1 件: リリース準備 14日')
  })

  it('limit 超過 → "他 K 件" tail', () => {
    const entries = ['A', 'B', 'C', 'D', 'E'].map((title, i) => ({
      parent: item(`p${i}`, { title }),
      maxStaleDays: 20 - i,
      activeDescendantCount: 1,
      priority: 4 as const,
    }))
    expect(formatAtRiskParentsBriefJa(entries, 3)).toBe(
      '触れていない案件 5 件: A 20日 / B 19日 / C 18日 / 他 2 件',
    )
  })

  it('title 空 → "(無題)"', () => {
    expect(
      formatAtRiskParentsBriefJa([
        {
          parent: item(PARENT_A, { title: '' }),
          maxStaleDays: 8,
          activeDescendantCount: 1,
          priority: 4,
        },
      ]),
    ).toBe('触れていない案件 1 件: (無題) 8日')
  })
})

describe('pickAtRiskParents — priority 抽出', () => {
  it('parent.priority=1 は priority=1 で乗る', () => {
    const r = pickAtRiskParents(
      [
        item(PARENT_A, { title: 'P1', priority: 1 }),
        item('c1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(14) }),
      ],
      {},
      NOW,
    )
    expect(r[0]?.priority).toBe(1)
  })

  it('priority=null / 範囲外 (5) は 4 に集約', () => {
    const r = pickAtRiskParents(
      [
        item(PARENT_A, { title: 'A', priority: null }),
        item('a1', { parentPath: PARENT_A_FULL, updatedAt: daysAgo(14) }),
        item(PARENT_B, { title: 'B', priority: 5 }),
        item('b1', { parentPath: PARENT_B_FULL, updatedAt: daysAgo(14) }),
      ],
      {},
      NOW,
    )
    expect(r.map((e) => e.priority)).toEqual([4, 4])
  })
})

describe('computeAtRiskParentsByPriority / formatAtRiskParentsByPriorityJa', () => {
  const e = (
    id: string,
    days: number,
    priority: 1 | 2 | 3 | 4 = 4,
  ): AtRiskParentEntry<TestItem> => ({
    parent: item(id, { priority, title: `T-${id}` }),
    maxStaleDays: days,
    activeDescendantCount: 1,
    priority,
  })

  it('空 → 全 bucket count=0 / max=null', () => {
    const r = computeAtRiskParentsByPriority([])
    expect(r).toEqual({
      1: { count: 0, maxStaleDays: null },
      2: { count: 0, maxStaleDays: null },
      3: { count: 0, maxStaleDays: null },
      4: { count: 0, maxStaleDays: null },
    })
    expect(formatAtRiskParentsByPriorityJa(r)).toBe('触れていない案件 0 件')
  })

  it('P1 1 件 (14日) + P3 2 件 (8日 / 12日) → P3 max=12', () => {
    const r = computeAtRiskParentsByPriority([e('a', 14, 1), e('b', 8, 3), e('c', 12, 3)])
    expect(r[1]).toEqual({ count: 1, maxStaleDays: 14 })
    expect(r[2]).toEqual({ count: 0, maxStaleDays: null })
    expect(r[3]).toEqual({ count: 2, maxStaleDays: 12 })
    expect(r[4]).toEqual({ count: 0, maxStaleDays: null })
    expect(formatAtRiskParentsByPriorityJa(r)).toBe(
      '触れていない案件: P1 1 件 (最大 14日) / P3 2 件 (最大 12日)',
    )
  })

  it('単一 priority 偏在 → 1 行のみ', () => {
    const r = computeAtRiskParentsByPriority([e('a', 14, 4), e('b', 8, 4)])
    expect(formatAtRiskParentsByPriorityJa(r)).toBe('触れていない案件: P4 2 件 (最大 14日)')
  })
})

describe('classifyAtRiskParentsHint / formatAtRiskParentsHintJa (iter442)', () => {
  // local helper for entries
  const entry = (
    days: number,
    priority: 1 | 2 | 3 | 4 = 4,
  ): AtRiskParentEntry<{ id: string; title: string }> => ({
    parent: { id: `p-${days}`, title: `T-${days}` },
    maxStaleDays: days,
    activeDescendantCount: 1,
    priority,
  })

  it('空 → idle / "案件停滞なし"', () => {
    expect(classifyAtRiskParentsHint([])).toBe('idle')
    expect(formatAtRiskParentsHintJa([])).toBe('案件停滞なし')
  })

  it('count ≤ 2 かつ max < 14 → mild', () => {
    expect(classifyAtRiskParentsHint([entry(7)])).toBe('mild')
    expect(classifyAtRiskParentsHint([entry(7), entry(13)])).toBe('mild')
    expect(formatAtRiskParentsHintJa([entry(8)])).toBe('一部案件停滞')
  })

  it('count 3-4 → moderate (max < 14 でも)', () => {
    const r = [entry(7), entry(8), entry(10)]
    expect(classifyAtRiskParentsHint(r)).toBe('moderate')
    expect(formatAtRiskParentsHintJa(r)).toBe('案件停滞多め')
  })

  it('max 14-29 → moderate (count 1 でも)', () => {
    expect(classifyAtRiskParentsHint([entry(14)])).toBe('moderate')
    expect(classifyAtRiskParentsHint([entry(29)])).toBe('moderate')
  })

  it('count ≥ 5 → severe', () => {
    const r = Array.from({ length: 5 }, (_, i) => entry(7 + i))
    expect(classifyAtRiskParentsHint(r)).toBe('severe')
    expect(formatAtRiskParentsHintJa(r)).toBe('案件深刻放置 (要 review)')
  })

  it('max ≥ 30 → severe (count 1 でも)', () => {
    expect(classifyAtRiskParentsHint([entry(30)])).toBe('severe')
    expect(classifyAtRiskParentsHint([entry(60)])).toBe('severe')
  })
})
