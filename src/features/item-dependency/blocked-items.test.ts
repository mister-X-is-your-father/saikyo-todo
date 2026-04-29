import { describe, expect, it } from 'vitest'

import { formatBlockedItemsBriefJa, pickWorkspaceBlockedItems } from './blocked-items'

const NOW = new Date('2026-04-29T00:00:00Z')

interface TestItem {
  id: string
  title: string
  doneAt: Date | null
  deletedAt?: Date | null
}

const item = (id: string, overrides: Partial<TestItem> = {}): TestItem => ({
  id,
  title: `item-${id}`,
  doneAt: null,
  deletedAt: null,
  ...overrides,
})

describe('pickWorkspaceBlockedItems', () => {
  it('items / edges 空 → 空配列', () => {
    expect(pickWorkspaceBlockedItems([], [])).toEqual([])
  })

  it('open blocker 1 件 → 1 entry', () => {
    const r = pickWorkspaceBlockedItems(
      [item('a'), item('b')],
      [{ fromItemId: 'a', toItemId: 'b' }],
    )
    expect(r).toEqual([{ itemId: 'b', title: 'item-b', openBlockerCount: 1, totalBlockerCount: 1 }])
  })

  it('blocker 完了済 → 結果に含めない (open=0 で除外)', () => {
    const r = pickWorkspaceBlockedItems(
      [item('a', { doneAt: NOW }), item('b')],
      [{ fromItemId: 'a', toItemId: 'b' }],
    )
    expect(r).toEqual([])
  })

  it('blocker 2 件 (1 open + 1 done) → openCount=1 / total=2', () => {
    const r = pickWorkspaceBlockedItems(
      [item('a'), item('a2', { doneAt: NOW }), item('b')],
      [
        { fromItemId: 'a', toItemId: 'b' },
        { fromItemId: 'a2', toItemId: 'b' },
      ],
    )
    expect(r).toEqual([{ itemId: 'b', title: 'item-b', openBlockerCount: 1, totalBlockerCount: 2 }])
  })

  it('対象 (toItem) が完了済 → 結果に含めない', () => {
    const r = pickWorkspaceBlockedItems(
      [item('a'), item('b', { doneAt: NOW })],
      [{ fromItemId: 'a', toItemId: 'b' }],
    )
    expect(r).toEqual([])
  })

  it('対象 / blocker が deletedAt → 除外', () => {
    const r = pickWorkspaceBlockedItems(
      [item('a', { deletedAt: NOW }), item('b'), item('c'), item('d', { deletedAt: NOW })],
      [
        { fromItemId: 'a', toItemId: 'b' },
        { fromItemId: 'c', toItemId: 'd' },
      ],
    )
    expect(r).toEqual([])
  })

  it('openBlockerCount desc で sort、同数は title 昇順 (ja)', () => {
    const r = pickWorkspaceBlockedItems(
      [
        item('p1'),
        item('p2'),
        item('p3'),
        item('a', { title: 'リリース準備' }),
        item('b', { title: '報告書' }),
        item('c', { title: '調整' }),
      ],
      [
        // a: 3 待ち
        { fromItemId: 'p1', toItemId: 'a' },
        { fromItemId: 'p2', toItemId: 'a' },
        { fromItemId: 'p3', toItemId: 'a' },
        // b: 1 待ち
        { fromItemId: 'p1', toItemId: 'b' },
        // c: 1 待ち (b と同数 → title 昇順 ja で 'c' (調整) が先?)
        { fromItemId: 'p2', toItemId: 'c' },
      ],
    )
    expect(r.map((e) => e.itemId)).toEqual(['a', 'c', 'b'])
    expect(r.map((e) => e.openBlockerCount)).toEqual([3, 1, 1])
  })

  it('blocker が items list に存在しない (孤立 edge) → 無視', () => {
    const r = pickWorkspaceBlockedItems([item('b')], [{ fromItemId: 'ghost', toItemId: 'b' }])
    expect(r).toEqual([])
  })
})

describe('formatBlockedItemsBriefJa', () => {
  it('空 → "blocked 0 件"', () => {
    expect(formatBlockedItemsBriefJa([])).toBe('blocked 0 件')
  })

  it('1 件 → "blocked 1 件: A [2 件待ち]"', () => {
    expect(
      formatBlockedItemsBriefJa([
        { itemId: 'a', title: 'リリース準備', openBlockerCount: 2, totalBlockerCount: 2 },
      ]),
    ).toBe('blocked 1 件: リリース準備 [2 件待ち]')
  })

  it('limit 超過 → "他 K 件" tail を append', () => {
    const blocked = [
      { itemId: 'a', title: 'A', openBlockerCount: 3, totalBlockerCount: 3 },
      { itemId: 'b', title: 'B', openBlockerCount: 2, totalBlockerCount: 2 },
      { itemId: 'c', title: 'C', openBlockerCount: 1, totalBlockerCount: 1 },
      { itemId: 'd', title: 'D', openBlockerCount: 1, totalBlockerCount: 1 },
      { itemId: 'e', title: 'E', openBlockerCount: 1, totalBlockerCount: 1 },
    ]
    expect(formatBlockedItemsBriefJa(blocked, 3)).toBe(
      'blocked 5 件: A [3 件待ち] / B [2 件待ち] / C [1 件待ち] / 他 2 件',
    )
  })

  it('title 空 → "(無題)" にフォールバック', () => {
    expect(
      formatBlockedItemsBriefJa([
        { itemId: 'a', title: '', openBlockerCount: 1, totalBlockerCount: 1 },
      ]),
    ).toBe('blocked 1 件: (無題) [1 件待ち]')
  })
})
