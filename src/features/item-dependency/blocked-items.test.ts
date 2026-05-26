import { describe, expect, it } from 'vitest'

import {
  classifyBlockedItemsHint,
  computeBlockedItemsByPriority,
  formatBlockedItemsBriefJa,
  formatBlockedItemsByPriorityJa,
  formatBlockedItemsHintJa,
  formatBlockingChainsJa,
  pickBlockingChains,
  pickWorkspaceBlockedItems,
  type WorkspaceBlockedItem,
} from './blocked-items'

const NOW = new Date('2026-04-29T00:00:00Z')

interface TestItem {
  id: string
  title: string
  doneAt: Date | null
  deletedAt?: Date | null
  priority?: number | null
}

const item = (id: string, overrides: Partial<TestItem> = {}): TestItem => ({
  id,
  title: `item-${id}`,
  doneAt: null,
  deletedAt: null,
  ...overrides,
})

const blocked = (
  itemId: string,
  openBlockerCount: number,
  priority: 1 | 2 | 3 | 4 = 4,
  overrides: Partial<WorkspaceBlockedItem> = {},
): WorkspaceBlockedItem => ({
  itemId,
  title: `T-${itemId}`,
  openBlockerCount,
  totalBlockerCount: openBlockerCount,
  priority,
  ...overrides,
})

describe('pickWorkspaceBlockedItems', () => {
  it('items / edges 空 → 空配列', () => {
    expect(pickWorkspaceBlockedItems([], [])).toEqual([])
  })

  it('open blocker 1 件 → 1 entry (priority null は 4 に正規化)', () => {
    const r = pickWorkspaceBlockedItems(
      [item('a'), item('b')],
      [{ fromItemId: 'a', toItemId: 'b' }],
    )
    expect(r).toEqual([
      { itemId: 'b', title: 'item-b', openBlockerCount: 1, totalBlockerCount: 1, priority: 4 },
    ])
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
    expect(r).toEqual([
      { itemId: 'b', title: 'item-b', openBlockerCount: 1, totalBlockerCount: 2, priority: 4 },
    ])
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
    expect(formatBlockedItemsBriefJa([blocked('a', 2, 1, { title: 'リリース準備' })])).toBe(
      'blocked 1 件: リリース準備 [2 件待ち]',
    )
  })

  it('limit 超過 → "他 K 件" tail を append', () => {
    const items = [
      blocked('a', 3, 4, { title: 'A' }),
      blocked('b', 2, 4, { title: 'B' }),
      blocked('c', 1, 4, { title: 'C' }),
      blocked('d', 1, 4, { title: 'D' }),
      blocked('e', 1, 4, { title: 'E' }),
    ]
    expect(formatBlockedItemsBriefJa(items, 3)).toBe(
      'blocked 5 件: A [3 件待ち] / B [2 件待ち] / C [1 件待ち] / 他 2 件',
    )
  })

  it('title 空 → "(無題)" にフォールバック', () => {
    expect(formatBlockedItemsBriefJa([blocked('a', 1, 4, { title: '' })])).toBe(
      'blocked 1 件: (無題) [1 件待ち]',
    )
  })
})

describe('pickWorkspaceBlockedItems — priority 抽出', () => {
  it('priority=1 の Item は priority=1 で乗る', () => {
    const r = pickWorkspaceBlockedItems(
      [item('a'), item('b', { priority: 1 })],
      [{ fromItemId: 'a', toItemId: 'b' }],
    )
    expect(r).toEqual([
      { itemId: 'b', title: 'item-b', openBlockerCount: 1, totalBlockerCount: 1, priority: 1 },
    ])
  })

  it('priority=0 / null / 範囲外 (5) は 4 に集約', () => {
    const r = pickWorkspaceBlockedItems(
      [
        item('a'),
        item('b1', { priority: 0 }),
        item('b2', { priority: 5 }),
        item('b3', { priority: null }),
      ],
      [
        { fromItemId: 'a', toItemId: 'b1' },
        { fromItemId: 'a', toItemId: 'b2' },
        { fromItemId: 'a', toItemId: 'b3' },
      ],
    )
    expect(r.map((e) => e.priority)).toEqual([4, 4, 4])
  })
})

describe('computeBlockedItemsByPriority / formatBlockedItemsByPriorityJa', () => {
  it('空 → 全 bucket count=0 / max=null', () => {
    const r = computeBlockedItemsByPriority([])
    expect(r).toEqual({
      1: { count: 0, maxOpenBlockerCount: null },
      2: { count: 0, maxOpenBlockerCount: null },
      3: { count: 0, maxOpenBlockerCount: null },
      4: { count: 0, maxOpenBlockerCount: null },
    })
    expect(formatBlockedItemsByPriorityJa(r)).toBe('依存ブロック 0 件')
  })

  it('P1 1 件 (3 待ち) + P3 2 件 (1 待ち / 2 待ち) → P3 max=2', () => {
    const r = computeBlockedItemsByPriority([
      blocked('a', 3, 1),
      blocked('b', 1, 3),
      blocked('c', 2, 3),
    ])
    expect(r[1]).toEqual({ count: 1, maxOpenBlockerCount: 3 })
    expect(r[2]).toEqual({ count: 0, maxOpenBlockerCount: null })
    expect(r[3]).toEqual({ count: 2, maxOpenBlockerCount: 2 })
    expect(r[4]).toEqual({ count: 0, maxOpenBlockerCount: null })
    expect(formatBlockedItemsByPriorityJa(r)).toBe(
      '依存ブロック: P1 1 件 (最大 3 件待ち) / P3 2 件 (最大 2 件待ち)',
    )
  })

  it('単一 priority 偏在 (P4 のみ) → P4 行のみ', () => {
    const r = computeBlockedItemsByPriority([blocked('a', 2, 4), blocked('b', 1, 4)])
    expect(formatBlockedItemsByPriorityJa(r)).toBe('依存ブロック: P4 2 件 (最大 2 件待ち)')
  })

  it('count=0 の bucket は format で省略', () => {
    const r = computeBlockedItemsByPriority([blocked('a', 5, 2)])
    expect(formatBlockedItemsByPriorityJa(r)).toBe('依存ブロック: P2 1 件 (最大 5 件待ち)')
  })
})

describe('classifyBlockedItemsHint / formatBlockedItemsHintJa (iter439)', () => {
  it('空 → idle / "依存ブロックなし"', () => {
    expect(classifyBlockedItemsHint([])).toBe('idle')
    expect(formatBlockedItemsHintJa([])).toBe('依存ブロックなし')
  })

  it('count ≤ 2 かつ max ≤ 2 → mild', () => {
    expect(classifyBlockedItemsHint([blocked('a', 1)])).toBe('mild')
    expect(classifyBlockedItemsHint([blocked('a', 2), blocked('b', 1)])).toBe('mild')
    expect(formatBlockedItemsHintJa([blocked('a', 2)])).toBe('依存軽微')
  })

  it('count 3-4 → moderate (max ≤ 2 でも)', () => {
    const r = [blocked('a', 1), blocked('b', 2), blocked('c', 1)]
    expect(classifyBlockedItemsHint(r)).toBe('moderate')
    expect(formatBlockedItemsHintJa(r)).toBe('依存中程度')
  })

  it('max ≥ 3 → moderate (count 1 でも)', () => {
    expect(classifyBlockedItemsHint([blocked('a', 3)])).toBe('moderate')
    expect(classifyBlockedItemsHint([blocked('a', 4)])).toBe('moderate')
  })

  it('count ≥ 5 → severe', () => {
    const r = Array.from({ length: 5 }, (_, i) => blocked(`a${i}`, 1))
    expect(classifyBlockedItemsHint(r)).toBe('severe')
    expect(formatBlockedItemsHintJa(r)).toBe('依存深刻 (前提解消急務)')
  })

  it('max ≥ 5 → severe (count 1 でも)', () => {
    expect(classifyBlockedItemsHint([blocked('a', 5)])).toBe('severe')
    expect(classifyBlockedItemsHint([blocked('a', 10)])).toBe('severe')
  })
})

describe('pickBlockingChains', () => {
  it('items / edges 空 → 空配列', () => {
    expect(pickBlockingChains([], [])).toEqual([])
  })

  it('open blocker 1 件 → blocker title を名前付きで返す', () => {
    const r = pickBlockingChains(
      [item('z', { title: '設計レビュー' }), item('y', { title: 'リリース準備' })],
      [{ fromItemId: 'z', toItemId: 'y' }],
    )
    expect(r).toEqual([
      {
        blockedId: 'y',
        blockedTitle: 'リリース準備',
        openBlockerTitles: ['設計レビュー'],
        openBlockerCount: 1,
        priority: 4,
      },
    ])
  })

  it('完了済 blocker は open に数えない (= chain から除外)', () => {
    const r = pickBlockingChains(
      [item('z', { doneAt: NOW }), item('y')],
      [{ fromItemId: 'z', toItemId: 'y' }],
    )
    expect(r).toEqual([])
  })

  it('自分が done / deleted の target は対象外', () => {
    const r = pickBlockingChains(
      [item('z'), item('done', { doneAt: NOW }), item('del', { deletedAt: NOW })],
      [
        { fromItemId: 'z', toItemId: 'done' },
        { fromItemId: 'z', toItemId: 'del' },
      ],
    )
    expect(r).toEqual([])
  })

  it('複数 open blocker は title ja 昇順で並ぶ、openBlockerCount desc で stable sort', () => {
    const r = pickBlockingChains(
      [
        item('a', { title: 'あ' }),
        item('b', { title: 'い' }),
        item('y1', { title: 'リリース準備' }),
        item('y2', { title: 'レポート' }),
      ],
      [
        { fromItemId: 'b', toItemId: 'y1' },
        { fromItemId: 'a', toItemId: 'y1' },
        { fromItemId: 'a', toItemId: 'y2' },
      ],
    )
    expect(r.map((c) => c.blockedId)).toEqual(['y1', 'y2'])
    expect(r[0]!.openBlockerTitles).toEqual(['あ', 'い'])
    expect(r[0]!.openBlockerCount).toBe(2)
  })

  it('重複 edge は二重加算しない', () => {
    const r = pickBlockingChains(
      [item('z'), item('y')],
      [
        { fromItemId: 'z', toItemId: 'y' },
        { fromItemId: 'z', toItemId: 'y' },
      ],
    )
    expect(r[0]!.openBlockerCount).toBe(1)
  })
})

describe('formatBlockingChainsJa', () => {
  it('0 件 → ブロック連鎖なし', () => {
    expect(formatBlockingChainsJa([])).toBe('ブロック連鎖なし')
  })

  it('1 件待ち → 「Y は Z 待ち」', () => {
    const chains = pickBlockingChains(
      [item('z', { title: '設計レビュー' }), item('y', { title: 'リリース準備' })],
      [{ fromItemId: 'z', toItemId: 'y' }],
    )
    expect(formatBlockingChainsJa(chains)).toBe('リリース準備 は 設計レビュー 待ち')
  })

  it('複数待ち → 先頭 blocker + 他 N 件', () => {
    const chains = pickBlockingChains(
      [
        item('a', { title: 'あ' }),
        item('b', { title: 'い' }),
        item('y', { title: 'リリース準備' }),
      ],
      [
        { fromItemId: 'a', toItemId: 'y' },
        { fromItemId: 'b', toItemId: 'y' },
      ],
    )
    expect(formatBlockingChainsJa(chains)).toBe('リリース準備 は あ 他 1 件 待ち')
  })

  it('limit 超過は 他 K 件 tail を付ける', () => {
    const items = [
      item('z'),
      item('y1', { title: 'A' }),
      item('y2', { title: 'B' }),
      item('y3', { title: 'C' }),
      item('y4', { title: 'D' }),
    ]
    const edges = [
      { fromItemId: 'z', toItemId: 'y1' },
      { fromItemId: 'z', toItemId: 'y2' },
      { fromItemId: 'z', toItemId: 'y3' },
      { fromItemId: 'z', toItemId: 'y4' },
    ]
    expect(formatBlockingChainsJa(pickBlockingChains(items, edges), 3)).toContain('他 1 件')
  })
})
