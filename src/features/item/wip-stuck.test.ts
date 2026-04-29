/**
 * iter359 ai-automation: wip-stuck pure helper の単体テスト。
 *
 * default 3 日閾値 / done/archive/non-WIP 除外 / 不正値 fail-soft / 古い順並び /
 * format ja の sentinel / severity 4 値分岐 を網羅する。
 */
import { describe, expect, it } from 'vitest'

import {
  formatStuckWipSummaryJa,
  selectStuckWipItems,
  type StuckWipFields,
  stuckWipSeverity,
} from './wip-stuck'

const TODAY = new Date(2026, 3, 29) // 2026-04-29
const DAY = 24 * 60 * 60 * 1000

function dt(daysAgo: number): Date {
  return new Date(TODAY.getTime() - daysAgo * DAY)
}

function mk(overrides: Partial<StuckWipFields>): StuckWipFields {
  return {
    id: overrides.id ?? 'i',
    title: overrides.title ?? 'untitled',
    status: overrides.status ?? 'in_progress',
    updatedAt: overrides.updatedAt ?? dt(0),
    doneAt: overrides.doneAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
  }
}

describe('selectStuckWipItems', () => {
  it('threshold 未満は除外 (default 3 日)', () => {
    const items = [mk({ id: 'a', updatedAt: dt(2) })]
    expect(selectStuckWipItems(items, {}, TODAY)).toEqual([])
  })

  it('threshold 以上は stuck (境界 = 3 日も含む)', () => {
    const items = [mk({ id: 'a', updatedAt: dt(3) })]
    const res = selectStuckWipItems(items, {}, TODAY)
    expect(res).toHaveLength(1)
    expect(res[0]?.stuckDays).toBe(3)
  })

  it('non-WIP (todo / blocked / done など) は除外', () => {
    const items = [
      mk({ id: 't', status: 'todo', updatedAt: dt(10) }),
      mk({ id: 'b', status: 'blocked', updatedAt: dt(10) }),
      mk({ id: 'd', status: 'done', updatedAt: dt(10) }),
      mk({ id: 'w', status: 'in_progress', updatedAt: dt(10) }),
    ]
    const res = selectStuckWipItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['w'])
  })

  it('done/archive 済 (= doneAt/archivedAt 非 null) は in_progress でも除外', () => {
    const items = [
      mk({ id: 'd', updatedAt: dt(10), doneAt: new Date() }),
      mk({ id: 'a', updatedAt: dt(10), archivedAt: new Date() }),
    ]
    expect(selectStuckWipItems(items, {}, TODAY)).toEqual([])
  })

  it('updatedAt が null/undefined/不正値は除外 (fail-soft)', () => {
    const items = [
      mk({ id: 'null', updatedAt: null }),
      mk({ id: 'undef', updatedAt: undefined }),
      mk({ id: 'bad', updatedAt: 'not-a-date' }),
    ]
    expect(selectStuckWipItems(items, {}, TODAY)).toEqual([])
  })

  it('updatedAt が未来 (時計ズレ) は除外', () => {
    const items = [mk({ id: 'fut', updatedAt: new Date(TODAY.getTime() + DAY) })]
    expect(selectStuckWipItems(items, {}, TODAY)).toEqual([])
  })

  it('updatedAt が ISO 文字列でも解釈する', () => {
    const items = [mk({ id: 'iso', updatedAt: '2026-04-25T00:00:00Z' })] // ~4 日前
    const res = selectStuckWipItems(items, {}, TODAY)
    expect(res).toHaveLength(1)
  })

  it('停滞日数 desc に並び、同 day は元配列順 stable', () => {
    const items = [
      mk({ id: 'a', updatedAt: dt(5) }),
      mk({ id: 'b', updatedAt: dt(10) }),
      mk({ id: 'c', updatedAt: dt(10) }),
      mk({ id: 'd', updatedAt: dt(7) }),
    ]
    const res = selectStuckWipItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('thresholdDays カスタム = 7 で 7 日以上のみ', () => {
    const items = [
      mk({ id: '3', updatedAt: dt(3) }),
      mk({ id: '7', updatedAt: dt(7) }),
      mk({ id: '14', updatedAt: dt(14) }),
    ]
    const res = selectStuckWipItems(items, { thresholdDays: 7 }, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['14', '7'])
  })

  it('today を ISO 文字列でも受け付ける', () => {
    const items = [mk({ id: 'a', updatedAt: '2026-04-25' })] // ~4 日前
    const res = selectStuckWipItems(items, {}, '2026-04-29')
    expect(res).toHaveLength(1)
  })

  it('items 空 → 空配列', () => {
    expect(selectStuckWipItems([], {}, TODAY)).toEqual([])
  })
})

describe('formatStuckWipSummaryJa', () => {
  it('0 件は sentinel', () => {
    expect(formatStuckWipSummaryJa([])).toBe('進行中だが停滞 0 件')
  })

  it('1 件 + stuckDays 反映', () => {
    const items = [mk({ id: 'a', title: '見積依頼', updatedAt: dt(5) })]
    const entries = selectStuckWipItems(items, {}, TODAY)
    expect(formatStuckWipSummaryJa(entries)).toBe('進行中だが停滞: 1 件 (見積依頼 5 日)')
  })

  it('複数件は / 区切り (停滞日数 desc)', () => {
    const items = [
      mk({ id: 'a', title: 'A', updatedAt: dt(4) }),
      mk({ id: 'b', title: 'B', updatedAt: dt(7) }),
      mk({ id: 'c', title: 'C', updatedAt: dt(5) }),
    ]
    const entries = selectStuckWipItems(items, {}, TODAY)
    expect(formatStuckWipSummaryJa(entries)).toBe('進行中だが停滞: 3 件 (B 7 日 / C 5 日 / A 4 日)')
  })

  it('limit を超えた残件は 他 N 件 でまとめる', () => {
    const items = [
      mk({ id: 'a', title: 'A', updatedAt: dt(10) }),
      mk({ id: 'b', title: 'B', updatedAt: dt(8) }),
      mk({ id: 'c', title: 'C', updatedAt: dt(6) }),
      mk({ id: 'd', title: 'D', updatedAt: dt(5) }),
      mk({ id: 'e', title: 'E', updatedAt: dt(4) }),
    ]
    const entries = selectStuckWipItems(items, {}, TODAY)
    expect(formatStuckWipSummaryJa(entries, 3)).toBe(
      '進行中だが停滞: 5 件 (A 10 日 / B 8 日 / C 6 日 / 他 2 件)',
    )
  })

  it('title 欠落は (無題) で fallback', () => {
    const item: StuckWipFields = {
      id: 'a',
      status: 'in_progress',
      updatedAt: dt(5),
      doneAt: null,
      archivedAt: null,
    }
    const entries = selectStuckWipItems([item], {}, TODAY)
    expect(formatStuckWipSummaryJa(entries)).toContain('(無題)')
  })
})

describe('stuckWipSeverity', () => {
  it('0 件 → idle', () => {
    expect(stuckWipSeverity([])).toBe('idle')
  })

  it('全て 7 日未満 → mild', () => {
    const items = [mk({ id: 'a', updatedAt: dt(3) }), mk({ id: 'b', updatedAt: dt(6) })]
    const entries = selectStuckWipItems(items, {}, TODAY)
    expect(stuckWipSeverity(entries)).toBe('mild')
  })

  it('1 件でも 7 日以上 → severe', () => {
    const items = [mk({ id: 'a', updatedAt: dt(3) }), mk({ id: 'b', updatedAt: dt(7) })]
    const entries = selectStuckWipItems(items, {}, TODAY)
    expect(stuckWipSeverity(entries)).toBe('severe')
  })

  it('境界 = 7 日ちょうども severe', () => {
    const items = [mk({ id: 'a', updatedAt: dt(7) })]
    const entries = selectStuckWipItems(items, {}, TODAY)
    expect(stuckWipSeverity(entries)).toBe('severe')
  })
})
