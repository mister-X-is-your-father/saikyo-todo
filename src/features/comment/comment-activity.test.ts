/**
 * iter309 ai-automation: comment-activity pure helper の単体検証。
 */
import { describe, expect, it } from 'vitest'

import {
  type CommentActivityEntry,
  formatTopCommentedItemsSummary,
  groupCommentsByItem,
  selectTopCommentedItems,
} from './comment-activity'

const c = (
  overrides: Partial<CommentActivityEntry> & Pick<CommentActivityEntry, 'itemId'>,
): CommentActivityEntry => ({
  createdAt: new Date(2026, 3, 27),
  ...overrides,
})

describe('groupCommentsByItem', () => {
  it('itemId ごとに件数を集計', () => {
    const counts = groupCommentsByItem([
      c({ itemId: 'A' }),
      c({ itemId: 'A' }),
      c({ itemId: 'B' }),
      c({ itemId: 'C' }),
      c({ itemId: 'A' }),
    ])
    expect(counts.get('A')).toBe(3)
    expect(counts.get('B')).toBe(1)
    expect(counts.get('C')).toBe(1)
    expect(counts.size).toBe(3)
  })

  it('空配列は空 Map', () => {
    expect(groupCommentsByItem([]).size).toBe(0)
  })

  it('itemId 欠落 / null は除外', () => {
    const counts = groupCommentsByItem([
      c({ itemId: 'A' }),
      { itemId: '', createdAt: new Date() },
      { itemId: null as unknown as string, createdAt: new Date() },
    ])
    expect(counts.get('A')).toBe(1)
    expect(counts.size).toBe(1)
  })

  it('since 指定で古い comment は除外', () => {
    const counts = groupCommentsByItem(
      [
        c({ itemId: 'A', createdAt: new Date(2026, 3, 20) }), // 古い
        c({ itemId: 'A', createdAt: new Date(2026, 3, 27) }), // 新
        c({ itemId: 'B', createdAt: new Date(2026, 3, 28) }),
      ],
      { since: new Date(2026, 3, 25) },
    )
    expect(counts.get('A')).toBe(1)
    expect(counts.get('B')).toBe(1)
  })

  it('since を ISO 文字列で渡しても OK', () => {
    const counts = groupCommentsByItem(
      [
        c({ itemId: 'A', createdAt: new Date(2026, 3, 20) }),
        c({ itemId: 'A', createdAt: new Date(2026, 3, 27) }),
      ],
      { since: '2026-04-25' },
    )
    expect(counts.get('A')).toBe(1)
  })

  it('不正 createdAt (null) は since 指定時に除外', () => {
    const counts = groupCommentsByItem(
      [c({ itemId: 'A', createdAt: null }), c({ itemId: 'A', createdAt: new Date(2026, 3, 27) })],
      { since: new Date(2026, 3, 25) },
    )
    expect(counts.get('A')).toBe(1)
  })
})

describe('selectTopCommentedItems', () => {
  const comments: CommentActivityEntry[] = [
    c({ itemId: 'A' }),
    c({ itemId: 'A' }),
    c({ itemId: 'A' }),
    c({ itemId: 'B' }),
    c({ itemId: 'B' }),
    c({ itemId: 'C' }),
  ]

  it('件数降順で上位 N 件', () => {
    const top = selectTopCommentedItems(comments, 2)
    expect(top).toHaveLength(2)
    expect(top[0]).toEqual({ itemId: 'A', count: 3 })
    expect(top[1]).toEqual({ itemId: 'B', count: 2 })
  })

  it('全件返す (n が件数より大)', () => {
    expect(selectTopCommentedItems(comments, 10)).toHaveLength(3)
  })

  it('n=0 は空配列', () => {
    expect(selectTopCommentedItems(comments, 0)).toEqual([])
  })

  it('n<0 は空配列', () => {
    expect(selectTopCommentedItems(comments, -3)).toEqual([])
  })

  it('同件数は挿入順 (= stable)', () => {
    const top = selectTopCommentedItems(
      [c({ itemId: 'X' }), c({ itemId: 'Y' }), c({ itemId: 'Z' })],
      3,
    )
    expect(top.map((e) => e.itemId)).toEqual(['X', 'Y', 'Z'])
  })

  it('since で範囲フィルタ', () => {
    const top = selectTopCommentedItems(
      [
        c({ itemId: 'A', createdAt: new Date(2026, 3, 20) }),
        c({ itemId: 'A', createdAt: new Date(2026, 3, 28) }),
        c({ itemId: 'B', createdAt: new Date(2026, 3, 28) }),
      ],
      5,
      { since: new Date(2026, 3, 25) },
    )
    expect(top).toHaveLength(2)
    expect(top.find((e) => e.itemId === 'A')?.count).toBe(1)
  })
})

describe('formatTopCommentedItemsSummary', () => {
  it('1 件以上は title + 件数を区切って整形', () => {
    const titles = new Map([
      ['A', 'リリース準備'],
      ['B', '設計レビュー'],
    ])
    expect(
      formatTopCommentedItemsSummary(
        [
          { itemId: 'A', count: 5 },
          { itemId: 'B', count: 3 },
        ],
        titles,
      ),
    ).toBe('活発 2 件: リリース準備 (5 件) / 設計レビュー (3 件)')
  })

  it('0 件は "活発 0 件 (該当なし)"', () => {
    expect(formatTopCommentedItemsSummary([])).toBe('活発 0 件 (該当なし)')
  })

  it('title 欠落は "(無題: <id 先頭 8 文字>)"', () => {
    expect(formatTopCommentedItemsSummary([{ itemId: 'abcdef0123-456', count: 3 }])).toBe(
      '活発 1 件: (無題: abcdef01) (3 件)',
    )
  })

  it('itemTitles を渡さなくても crash しない', () => {
    expect(formatTopCommentedItemsSummary([{ itemId: 'XXXXXXXX-zzz', count: 1 }])).toContain(
      'XXXXXXXX',
    )
  })

  it('複数件は " / " 区切り', () => {
    const line = formatTopCommentedItemsSummary([
      { itemId: 'a', count: 5 },
      { itemId: 'b', count: 3 },
      { itemId: 'c', count: 1 },
    ])
    expect(line.split(' / ')).toHaveLength(3)
  })
})

describe('集計 + 整形 統合', () => {
  it('selectTopCommentedItems → formatTopCommentedItemsSummary が正しく繋がる', () => {
    const comments: CommentActivityEntry[] = [
      c({ itemId: 'A' }),
      c({ itemId: 'A' }),
      c({ itemId: 'B' }),
    ]
    const top = selectTopCommentedItems(comments, 5)
    const titles = new Map([
      ['A', 'リリース'],
      ['B', '設計'],
    ])
    expect(formatTopCommentedItemsSummary(top, titles)).toBe(
      '活発 2 件: リリース (2 件) / 設計 (1 件)',
    )
  })
})
