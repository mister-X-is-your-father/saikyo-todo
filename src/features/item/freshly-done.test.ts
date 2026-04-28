import { describe, expect, it } from 'vitest'

import {
  formatFreshlyDoneSummary,
  type FreshlyDoneItemFields,
  selectFreshlyDoneItems,
} from './freshly-done'

const NOW = new Date('2026-04-28T12:00:00Z')

const item = (overrides: Partial<FreshlyDoneItemFields & { id: string; title: string }>) => ({
  id: 'a',
  title: 'task-a',
  doneAt: null,
  archivedAt: null,
  ...overrides,
})

describe('selectFreshlyDoneItems', () => {
  it('doneAt が直近 7 日内なら抽出 (新しい順)', () => {
    const entries = selectFreshlyDoneItems(
      [
        item({ id: 'a', doneAt: '2026-04-25T00:00:00Z' }), // 3 日前
        item({ id: 'b', doneAt: '2026-04-28T00:00:00Z' }), // 0 日 (今日)
        item({ id: 'c', doneAt: '2026-04-22T00:00:00Z' }), // 6 日前
      ],
      undefined,
      NOW,
    )
    expect(entries.map((e) => e.item.id)).toEqual(['b', 'a', 'c'])
    expect(entries.map((e) => e.daysSinceDone)).toEqual([0, 3, 6])
  })

  it('thresholdDays 超過は除外 (default 7 日)', () => {
    const entries = selectFreshlyDoneItems(
      [
        item({ id: 'a', doneAt: '2026-04-21T00:00:00Z' }), // 7 日前 → 包含 (= threshold ちょうど)
        item({ id: 'b', doneAt: '2026-04-20T00:00:00Z' }), // 8 日前 → 除外
      ],
      undefined,
      NOW,
    )
    expect(entries.map((e) => e.item.id)).toEqual(['a'])
  })

  it('thresholdDays オプションで期間を変更できる', () => {
    const entries = selectFreshlyDoneItems(
      [
        item({ id: 'a', doneAt: '2026-04-26T00:00:00Z' }), // 2 日前
        item({ id: 'b', doneAt: '2026-04-25T00:00:00Z' }), // 3 日前
      ],
      { thresholdDays: 2 },
      NOW,
    )
    expect(entries.map((e) => e.item.id)).toEqual(['a'])
  })

  it('archivedAt は除外', () => {
    const entries = selectFreshlyDoneItems(
      [
        item({ id: 'a', doneAt: '2026-04-27T00:00:00Z', archivedAt: '2026-04-27T01:00:00Z' }),
        item({ id: 'b', doneAt: '2026-04-27T00:00:00Z' }),
      ],
      undefined,
      NOW,
    )
    expect(entries.map((e) => e.item.id)).toEqual(['b'])
  })

  it('doneAt 未設定 / 未来 / 不正値は除外 (fail-soft)', () => {
    const entries = selectFreshlyDoneItems(
      [
        item({ id: 'a', doneAt: null }),
        item({ id: 'b', doneAt: undefined }),
        item({ id: 'c', doneAt: '2099-01-01T00:00:00Z' }), // 未来
        item({ id: 'd', doneAt: 'not-a-date' }),
        item({ id: 'e', doneAt: '2026-04-27T00:00:00Z' }), // 1 日前 → 包含
      ],
      undefined,
      NOW,
    )
    expect(entries.map((e) => e.item.id)).toEqual(['e'])
  })

  it('thresholdDays が負値なら空配列', () => {
    const entries = selectFreshlyDoneItems(
      [item({ id: 'a', doneAt: '2026-04-28T00:00:00Z' })],
      { thresholdDays: -1 },
      NOW,
    )
    expect(entries).toEqual([])
  })

  it('today に文字列を渡せる + 不正値は空', () => {
    const entries = selectFreshlyDoneItems(
      [item({ id: 'a', doneAt: '2026-04-27T00:00:00Z' })],
      undefined,
      'not-a-date',
    )
    expect(entries).toEqual([])
  })

  it('同 daysSinceDone の中では元配列順を保つ (stable)', () => {
    const entries = selectFreshlyDoneItems(
      [
        item({ id: 'a', doneAt: '2026-04-27T00:00:00Z' }),
        item({ id: 'b', doneAt: '2026-04-27T00:00:00Z' }),
        item({ id: 'c', doneAt: '2026-04-27T00:00:00Z' }),
      ],
      undefined,
      NOW,
    )
    expect(entries.map((e) => e.item.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('formatFreshlyDoneSummary', () => {
  it('0 件は "完了 0 件 (直近 7 日)" sentinel', () => {
    expect(formatFreshlyDoneSummary([])).toBe('完了 0 件 (直近 7 日)')
  })

  it('thresholdDays を渡すと sentinel に反映', () => {
    expect(formatFreshlyDoneSummary([], 14)).toBe('完了 0 件 (直近 14 日)')
  })

  it('1 件以上は "完了 N: title (今日|N 日前) / ..." 形式', () => {
    const entries = [
      { item: item({ id: 'a', title: 'A' }), daysSinceDone: 0 },
      { item: item({ id: 'b', title: 'B' }), daysSinceDone: 3 },
      { item: item({ id: 'c', title: 'C' }), daysSinceDone: 7 },
    ]
    expect(formatFreshlyDoneSummary(entries)).toBe('完了 3: A (今日) / B (3 日前) / C (7 日前)')
  })

  it('title 欠落は "(無題)" fallback', () => {
    const entries = [{ item: item({ id: 'a', title: undefined }), daysSinceDone: 1 }]
    expect(formatFreshlyDoneSummary(entries)).toBe('完了 1: (無題) (1 日前)')
  })
})
