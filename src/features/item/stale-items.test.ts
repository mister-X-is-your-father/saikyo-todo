/**
 * iter299 ai-automation: stale-items pure helper の単体テスト。
 * 7 日 default + done/archive/excludeStatuses 除外 + 不正値 fail-soft + 古い順並び
 * を網羅する。
 */
import { describe, expect, it } from 'vitest'

import {
  computeStaleItemsByPriority,
  formatStaleItemsByPriorityJa,
  formatStaleItemsSummary,
  selectStaleItems,
  type StaleItemFields,
} from './stale-items'

const TODAY = new Date(2026, 3, 28) // 2026-04-28
const DAY = 24 * 60 * 60 * 1000

function dt(daysAgo: number): Date {
  return new Date(TODAY.getTime() - daysAgo * DAY)
}

function mk(overrides: Partial<StaleItemFields>): StaleItemFields {
  return {
    id: overrides.id ?? 'i',
    title: overrides.title ?? 'untitled',
    status: overrides.status ?? 'todo',
    updatedAt: overrides.updatedAt ?? dt(0),
    doneAt: overrides.doneAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
  }
}

describe('selectStaleItems', () => {
  it('threshold 未満は除外 (default 7 日)', () => {
    const items = [mk({ id: 'a', updatedAt: dt(6) })] // 6 日前 < 7 日閾値
    expect(selectStaleItems(items, {}, TODAY)).toEqual([])
  })

  it('threshold 以上は stale (境界 = 7 日も含む)', () => {
    const items = [mk({ id: 'a', updatedAt: dt(7) })]
    const res = selectStaleItems(items, {}, TODAY)
    expect(res).toHaveLength(1)
    expect(res[0]?.staleDays).toBe(7)
  })

  it('done / archive 済は除外', () => {
    const items = [
      mk({ id: 'done', updatedAt: dt(30), doneAt: new Date() }),
      mk({ id: 'arc', updatedAt: dt(30), archivedAt: new Date() }),
    ]
    expect(selectStaleItems(items, {}, TODAY)).toEqual([])
  })

  it('status=done / cancelled は default で除外 (excludeStatuses)', () => {
    const items = [
      mk({ id: 'd', status: 'done', updatedAt: dt(30) }),
      mk({ id: 'c', status: 'cancelled', updatedAt: dt(30) }),
      mk({ id: 't', status: 'todo', updatedAt: dt(30) }),
    ]
    const res = selectStaleItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['t'])
  })

  it('excludeStatuses をカスタムできる ([] で全 status 含める)', () => {
    const items = [mk({ id: 'd', status: 'done', updatedAt: dt(30) })]
    // doneAt=null & status=done だけを stale に拾うパターン (data 不整合検出用)
    const res = selectStaleItems(items, { excludeStatuses: [] }, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['d'])
  })

  it('updatedAt が null/undefined/不正値は除外 (fail-soft)', () => {
    const items = [
      mk({ id: 'null', updatedAt: null }),
      mk({ id: 'undef', updatedAt: undefined }),
      mk({ id: 'bad', updatedAt: 'not-a-date' }),
    ]
    expect(selectStaleItems(items, {}, TODAY)).toEqual([])
  })

  it('updatedAt が未来 (時計ズレ) は除外', () => {
    const items = [mk({ id: 'fut', updatedAt: new Date(TODAY.getTime() + DAY) })]
    expect(selectStaleItems(items, {}, TODAY)).toEqual([])
  })

  it('updatedAt が ISO 文字列でも解釈する', () => {
    const items = [mk({ id: 'iso', updatedAt: '2026-04-20T00:00:00Z' })] // 8 日前
    const res = selectStaleItems(items, {}, TODAY)
    expect(res).toHaveLength(1)
  })

  it('古い順 (staleDays desc) に並び、同 day は元配列順 stable', () => {
    const items = [
      mk({ id: 'a', updatedAt: dt(10) }),
      mk({ id: 'b', updatedAt: dt(20) }),
      mk({ id: 'c', updatedAt: dt(20) }),
      mk({ id: 'd', updatedAt: dt(15) }),
    ]
    const res = selectStaleItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('thresholdDays カスタム = 14 で 14 日以上のみ', () => {
    const items = [
      mk({ id: '7', updatedAt: dt(7) }),
      mk({ id: '14', updatedAt: dt(14) }),
      mk({ id: '20', updatedAt: dt(20) }),
    ]
    const res = selectStaleItems(items, { thresholdDays: 14 }, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['20', '14'])
  })

  it('today を ISO 文字列でも受け付ける', () => {
    const items = [mk({ id: 'a', updatedAt: '2026-04-20' })] // 8 日前
    const res = selectStaleItems(items, {}, '2026-04-28')
    expect(res).toHaveLength(1)
  })
})

describe('formatStaleItemsSummary', () => {
  it('0 件は 該当なし sentinel', () => {
    expect(formatStaleItemsSummary([])).toBe('stale 0 (該当なし)')
  })

  it('1 件 + staleDays 反映', () => {
    const items = [mk({ id: 'a', title: '見積依頼', updatedAt: dt(10) })]
    const entries = selectStaleItems(items, {}, TODAY)
    expect(formatStaleItemsSummary(entries)).toBe('stale 1: 見積依頼 (10 日前)')
  })

  it('複数件は / 区切り (古い順)', () => {
    const items = [
      mk({ id: 'a', title: 'A', updatedAt: dt(10) }),
      mk({ id: 'b', title: 'B', updatedAt: dt(20) }),
      mk({ id: 'c', title: 'C', updatedAt: dt(15) }),
    ]
    const entries = selectStaleItems(items, {}, TODAY)
    expect(formatStaleItemsSummary(entries)).toBe(
      'stale 3: B (20 日前) / C (15 日前) / A (10 日前)',
    )
  })

  it('title 欠落は (無題) で fallback', () => {
    const item: StaleItemFields = {
      id: 'a',
      // title 未指定で undefined
      status: 'todo',
      updatedAt: dt(10),
      doneAt: null,
      archivedAt: null,
    }
    const entries = selectStaleItems([item], {}, TODAY)
    expect(formatStaleItemsSummary(entries)).toContain('(無題)')
  })
})

describe('computeStaleItemsByPriority', () => {
  function mkP(
    overrides: Partial<StaleItemFields & { priority: number | null }>,
  ): StaleItemFields & { priority: number | null } {
    return { ...mk(overrides), priority: overrides.priority ?? 4 }
  }

  it('items 空 → 全 P count=0', () => {
    const result = computeStaleItemsByPriority([], {}, TODAY)
    expect(result[1]).toEqual({ count: 0, oldestStaleDays: null })
    expect(result[2]).toEqual({ count: 0, oldestStaleDays: null })
    expect(result[3]).toEqual({ count: 0, oldestStaleDays: null })
    expect(result[4]).toEqual({ count: 0, oldestStaleDays: null })
  })

  it('priority 別に集計、threshold 未満 / done は除外', () => {
    const items = [
      mkP({ id: 'a', priority: 1, updatedAt: dt(14) }), // ✓
      mkP({ id: 'b', priority: 1, updatedAt: dt(8) }), // ✓
      mkP({ id: 'c', priority: 3, updatedAt: dt(10) }), // ✓
      mkP({ id: 'd', priority: 1, updatedAt: dt(6) }), // 短期
      mkP({ id: 'e', priority: 4, updatedAt: dt(20), doneAt: new Date() }), // done
    ]
    const result = computeStaleItemsByPriority(items, {}, TODAY)
    expect(result[1]).toEqual({ count: 2, oldestStaleDays: 14 })
    expect(result[3]).toEqual({ count: 1, oldestStaleDays: 10 })
    expect(result[2]).toEqual({ count: 0, oldestStaleDays: null })
    expect(result[4]).toEqual({ count: 0, oldestStaleDays: null })
  })

  it('priority null/範囲外 は p4', () => {
    const items = [
      mkP({ id: 'a', priority: null, updatedAt: dt(8) }),
      mkP({ id: 'b', priority: 99 as number, updatedAt: dt(14) }),
    ]
    const result = computeStaleItemsByPriority(items, {}, TODAY)
    expect(result[4]).toEqual({ count: 2, oldestStaleDays: 14 })
  })
})

describe('formatStaleItemsByPriorityJa', () => {
  it('全 P count=0 → stale 0 件', () => {
    const empty = computeStaleItemsByPriority([], {}, TODAY)
    expect(formatStaleItemsByPriorityJa(empty)).toBe('stale 0 件')
  })

  it('複数 P 分散 → 番号順 / 区切り、count=0 P 省略', () => {
    function mkP(
      overrides: Partial<StaleItemFields & { priority: number }>,
    ): StaleItemFields & { priority: number } {
      return { ...mk(overrides), priority: overrides.priority ?? 4 }
    }
    const items = [
      mkP({ id: 'a', priority: 1, updatedAt: dt(14) }),
      mkP({ id: 'b', priority: 3, updatedAt: dt(10) }),
    ]
    const byP = computeStaleItemsByPriority(items, {}, TODAY)
    expect(formatStaleItemsByPriorityJa(byP)).toBe('P1 1 件 (最古 14日) / P3 1 件 (最古 10日)')
  })
})
