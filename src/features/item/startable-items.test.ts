import { describe, expect, it } from 'vitest'

import {
  formatStartableItemsSummary,
  selectStartableItems,
  type StartableItemFields,
} from './startable-items'

const TODAY = new Date(2026, 3, 28) // 2026-04-28 (Tue)

const item = (overrides: Partial<StartableItemFields & { id: string; title: string }>) => ({
  id: 'a',
  title: 'task-a',
  status: 'todo',
  startDate: null,
  priority: 4,
  dueDate: null,
  isMust: false,
  doneAt: null,
  archivedAt: null,
  ...overrides,
})

describe('selectStartableItems', () => {
  it('未来 startDate は除外、今日以前なら包含', () => {
    const r = selectStartableItems(
      [
        item({ id: 'a', startDate: '2026-04-30' }), // 未来 → 除外
        item({ id: 'b', startDate: '2026-04-28' }), // 今日 → 包含
        item({ id: 'c', startDate: '2026-04-20' }), // 過去 → 包含
        item({ id: 'd', startDate: null }), // 未指定 → 包含
      ],
      undefined,
      TODAY,
    )
    expect(r.map((i) => i.id).sort()).toEqual(['b', 'c', 'd'])
  })

  it('doneAt / archivedAt は除外', () => {
    const r = selectStartableItems(
      [
        item({ id: 'a', doneAt: new Date() }),
        item({ id: 'b', archivedAt: new Date() }),
        item({ id: 'c' }),
      ],
      undefined,
      TODAY,
    )
    expect(r.map((i) => i.id)).toEqual(['c'])
  })

  it('status=cancelled / blocked は default で除外', () => {
    const r = selectStartableItems(
      [
        item({ id: 'a', status: 'cancelled' }),
        item({ id: 'b', status: 'blocked' }),
        item({ id: 'c', status: 'todo' }),
        item({ id: 'd', status: 'in_progress' }),
      ],
      undefined,
      TODAY,
    )
    expect(r.map((i) => i.id)).toEqual(['c', 'd'])
  })

  it('excludeStatuses option で除外 status を上書きできる', () => {
    const r = selectStartableItems(
      [
        item({ id: 'a', status: 'cancelled' }),
        item({ id: 'b', status: 'blocked' }),
        item({ id: 'c', status: 'todo' }),
      ],
      { excludeStatuses: ['cancelled'] }, // blocked は許可
      TODAY,
    )
    expect(r.map((i) => i.id)).toEqual(['b', 'c'])
  })

  it('urgency 降順で並ぶ (高 priority + MUST + 期限切れが先頭)', () => {
    const r = selectStartableItems(
      [
        item({ id: 'a', priority: 4 }), // urgency 10
        item({ id: 'b', priority: 1 }), // urgency 100
        item({ id: 'c', priority: 1, isMust: true, dueDate: '2026-04-25' }), // urgency 180 (overdue)
        item({ id: 'd', priority: 2 }), // urgency 70
      ],
      undefined,
      TODAY,
    )
    expect(r.map((i) => i.id)).toEqual(['c', 'b', 'd', 'a'])
  })

  it('同 urgency は元配列順を保つ (stable)', () => {
    const r = selectStartableItems(
      [
        item({ id: 'a', priority: 3 }),
        item({ id: 'b', priority: 3 }),
        item({ id: 'c', priority: 3 }),
      ],
      undefined,
      TODAY,
    )
    expect(r.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('limit option で件数を切り詰め', () => {
    const r = selectStartableItems(
      [
        item({ id: 'a', priority: 1 }),
        item({ id: 'b', priority: 2 }),
        item({ id: 'c', priority: 3 }),
        item({ id: 'd', priority: 4 }),
      ],
      { limit: 2 },
      TODAY,
    )
    expect(r.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('limit=0 は空配列', () => {
    const r = selectStartableItems([item({ id: 'a' })], { limit: 0 }, TODAY)
    expect(r).toEqual([])
  })

  it('limit が負値ならスライスせず全件', () => {
    const r = selectStartableItems([item({ id: 'a' }), item({ id: 'b' })], { limit: -1 }, TODAY)
    // 負値 limit は無視 → 全件 (想定挙動。spec で sentinel/全件 のどちらでも統一されていれば OK)
    expect(r.map((i) => i.id).sort()).toEqual(['a', 'b'])
  })

  it('空配列入力で空配列返却', () => {
    expect(selectStartableItems([], undefined, TODAY)).toEqual([])
  })
})

describe('formatStartableItemsSummary', () => {
  it('0 件は sentinel', () => {
    expect(formatStartableItemsSummary([])).toBe('着手可能 0 件 (該当なし)')
  })

  it('全件が showTop 内なら全 title を並べる', () => {
    const r = formatStartableItemsSummary([
      item({ id: 'a', title: 'A', priority: 1 }),
      item({ id: 'b', title: 'B', priority: 2 }),
      item({ id: 'c', title: 'C', priority: 3 }),
    ])
    expect(r).toBe('着手可能 3 件: A (p1) / B (p2) / C (p3)')
  })

  it('showTop 超過は "他 K 件" で表示', () => {
    const r = formatStartableItemsSummary(
      [
        item({ id: 'a', title: 'A', priority: 1 }),
        item({ id: 'b', title: 'B', priority: 2 }),
        item({ id: 'c', title: 'C', priority: 3 }),
        item({ id: 'd', title: 'D', priority: 4 }),
        item({ id: 'e', title: 'E', priority: 4 }),
      ],
      2,
    )
    expect(r).toBe('着手可能 5 件: A (p1) / B (p2) / 他 3 件')
  })

  it('title 欠落は "(無題)" fallback、priority 欠落は p4', () => {
    const r = formatStartableItemsSummary([
      item({ id: 'a', title: undefined, priority: undefined as unknown as number }),
    ])
    expect(r).toBe('着手可能 1 件: (無題) (p4)')
  })
})
