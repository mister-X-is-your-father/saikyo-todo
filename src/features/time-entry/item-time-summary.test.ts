import { describe, expect, it } from 'vitest'

import {
  formatTopItemsByTime,
  groupTimeEntriesByItem,
  type ItemTimeEntry,
  selectTopItemsByTime,
} from './item-time-summary'

const E = (workDate: string, itemId: string | null, durationMinutes: number): ItemTimeEntry => ({
  workDate,
  itemId,
  durationMinutes,
})

describe('groupTimeEntriesByItem', () => {
  it('item 別に totalMinutes と entryCount を集計', () => {
    const grouped = groupTimeEntriesByItem([
      E('2026-04-29', 'a', 30),
      E('2026-04-29', 'a', 45),
      E('2026-04-29', 'b', 60),
    ])
    expect(grouped.size).toBe(2)
    expect(grouped.get('a')).toEqual({ totalMinutes: 75, entryCount: 2 })
    expect(grouped.get('b')).toEqual({ totalMinutes: 60, entryCount: 1 })
  })

  it('itemId=null の entry は除外', () => {
    const grouped = groupTimeEntriesByItem([E('2026-04-29', null, 30), E('2026-04-29', 'a', 60)])
    expect(grouped.size).toBe(1)
    expect(grouped.get('a')?.totalMinutes).toBe(60)
  })

  it('from / to で範囲フィルタ (両端 inclusive)', () => {
    const entries = [
      E('2026-04-25', 'a', 10),
      E('2026-04-28', 'a', 20),
      E('2026-04-29', 'a', 30),
      E('2026-04-30', 'a', 40),
    ]
    const grouped = groupTimeEntriesByItem(entries, { from: '2026-04-28', to: '2026-04-29' })
    expect(grouped.get('a')?.totalMinutes).toBe(50)
    expect(grouped.get('a')?.entryCount).toBe(2)
  })

  it('不正な workDate は除外', () => {
    const grouped = groupTimeEntriesByItem([E('not-a-date', 'a', 10), E('2026-04-29', 'a', 20)])
    expect(grouped.get('a')?.totalMinutes).toBe(20)
  })

  it('durationMinutes が 0/負/NaN/Infinity の entry は加算 + entryCount にカウントしない', () => {
    const grouped = groupTimeEntriesByItem([
      E('2026-04-29', 'a', 0),
      E('2026-04-29', 'a', -10),
      E('2026-04-29', 'a', NaN),
      E('2026-04-29', 'a', Infinity),
      E('2026-04-29', 'a', 30),
    ])
    expect(grouped.get('a')).toEqual({ totalMinutes: 30, entryCount: 1 })
  })

  it('小数 durationMinutes は round で集計', () => {
    const grouped = groupTimeEntriesByItem([E('2026-04-29', 'a', 12.6)])
    expect(grouped.get('a')?.totalMinutes).toBe(13)
  })

  it('空 entries は空 Map', () => {
    expect(groupTimeEntriesByItem([]).size).toBe(0)
  })
})

describe('selectTopItemsByTime', () => {
  const entries: ItemTimeEntry[] = [
    E('2026-04-29', 'a', 30),
    E('2026-04-29', 'a', 30), // a: 60 / 2
    E('2026-04-29', 'b', 90), // b: 90 / 1
    E('2026-04-29', 'c', 45), // c: 45 / 1
    E('2026-04-29', 'd', 30), // d: 30 / 1
  ]

  it('totalMinutes desc で上位 N 件', () => {
    const top = selectTopItemsByTime(entries, 3)
    expect(top.map((r) => r.itemId)).toEqual(['b', 'a', 'c'])
    expect(top[0]?.totalMinutes).toBe(90)
  })

  it('n <= 0 で空配列', () => {
    expect(selectTopItemsByTime(entries, 0)).toEqual([])
    expect(selectTopItemsByTime(entries, -5)).toEqual([])
  })

  it('n がデータ数を超えても全件返す (clamp)', () => {
    expect(selectTopItemsByTime(entries, 100)).toHaveLength(4)
  })

  it('同 totalMinutes は entryCount desc で tie-break', () => {
    const tieEntries: ItemTimeEntry[] = [
      E('2026-04-29', 'a', 60), // a: 60 / 1
      E('2026-04-29', 'b', 30),
      E('2026-04-29', 'b', 30), // b: 60 / 2
    ]
    const top = selectTopItemsByTime(tieEntries, 2)
    expect(top.map((r) => r.itemId)).toEqual(['b', 'a'])
  })

  it('同 totalMinutes + 同 entryCount は itemId 昇順で安定', () => {
    const tieEntries: ItemTimeEntry[] = [
      E('2026-04-29', 'b', 30),
      E('2026-04-29', 'a', 30),
      E('2026-04-29', 'c', 30),
    ]
    const top = selectTopItemsByTime(tieEntries, 3)
    expect(top.map((r) => r.itemId)).toEqual(['a', 'b', 'c'])
  })

  it('NaN / Infinity n は空配列', () => {
    expect(selectTopItemsByTime(entries, NaN)).toEqual([])
    expect(selectTopItemsByTime(entries, Infinity)).toEqual([])
  })

  it('options で範囲フィルタ後の top を返す', () => {
    const wide: ItemTimeEntry[] = [E('2026-04-25', 'old', 1000), E('2026-04-29', 'new', 60)]
    const top = selectTopItemsByTime(wide, 5, { from: '2026-04-28' })
    expect(top.map((r) => r.itemId)).toEqual(['new'])
  })
})

describe('formatTopItemsByTime', () => {
  it('1 行 summary を生成 (titles 解決)', () => {
    const titles = new Map([
      ['a', 'タスクA'],
      ['b', 'タスクB'],
    ])
    const top = [
      { itemId: 'b', totalMinutes: 90, entryCount: 1 },
      { itemId: 'a', totalMinutes: 60, entryCount: 2 },
    ]
    expect(formatTopItemsByTime(top, titles)).toBe(
      '実績 top 2: タスクB (1時間30分) / タスクA (1時間)',
    )
  })

  it('titles 未指定 / 欠落は (無題: <id 先頭 8 文字>) で fallback', () => {
    const top = [
      { itemId: '12345678-abcd-efff-0000-000000000000', totalMinutes: 30, entryCount: 1 },
    ]
    expect(formatTopItemsByTime(top)).toBe('実績 top 1: (無題: 12345678) (30分)')
  })

  it('空配列は sentinel', () => {
    expect(formatTopItemsByTime([])).toBe('実績 0 件 (該当なし)')
  })

  it('formatMinutesJa と整合 (2時間 / 30分 / 1分 boundary、iter811 ja-throughout)', () => {
    const titles = new Map([
      ['x', 'X'],
      ['y', 'Y'],
      ['z', 'Z'],
    ])
    const top = [
      { itemId: 'x', totalMinutes: 120, entryCount: 1 },
      { itemId: 'y', totalMinutes: 30, entryCount: 1 },
      { itemId: 'z', totalMinutes: 1, entryCount: 1 },
    ]
    expect(formatTopItemsByTime(top, titles)).toBe('実績 top 3: X (2時間) / Y (30分) / Z (1分)')
  })
})

describe('統合: 4 helper の連携', () => {
  it('時系列 entries → group → top → format で AI prompt 1 行', () => {
    const entries: ItemTimeEntry[] = [
      E('2026-04-29', 'a', 60),
      E('2026-04-29', 'a', 30),
      E('2026-04-29', 'b', 45),
      E('2026-04-28', 'c', 200), // 範囲外
      E('2026-04-29', null, 100), // itemId=null 除外
    ]
    const titles = new Map([
      ['a', 'PR レビュー'],
      ['b', 'バグ修正'],
    ])
    const top = selectTopItemsByTime(entries, 5, { from: '2026-04-29', to: '2026-04-29' })
    expect(formatTopItemsByTime(top, titles)).toBe(
      '実績 top 2: PR レビュー (1時間30分) / バグ修正 (45分)',
    )
  })
})
