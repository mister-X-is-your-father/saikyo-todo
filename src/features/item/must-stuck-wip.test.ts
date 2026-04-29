/**
 * iter364 ai-automation: must-stuck-wip combinator pure helper の単体テスト。
 *
 * MUST 制約 + 既存 wip-stuck 制約 (default 3 日 / status='in_progress' / done/archive
 * 除外 / fail-soft) の交差を網羅する。
 */
import { describe, expect, it } from 'vitest'

import {
  computeMustStuckWipByPriority,
  formatMustStuckWipByPriorityJa,
  formatMustStuckWipJa,
  type MustStuckWipFields,
  mustStuckWipSeverity,
  pickMustStuckWipItems,
} from './must-stuck-wip'

const TODAY = new Date(2026, 3, 29) // 2026-04-29
const DAY = 24 * 60 * 60 * 1000

function dt(daysAgo: number): Date {
  return new Date(TODAY.getTime() - daysAgo * DAY)
}

function mk(overrides: Partial<MustStuckWipFields>): MustStuckWipFields {
  return {
    id: overrides.id ?? 'i',
    title: overrides.title ?? 'untitled',
    status: overrides.status ?? 'in_progress',
    updatedAt: overrides.updatedAt ?? dt(0),
    doneAt: overrides.doneAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    isMust: 'isMust' in overrides ? overrides.isMust : true,
  }
}

describe('pickMustStuckWipItems', () => {
  it('items 空 → 空配列', () => {
    expect(pickMustStuckWipItems([], {}, TODAY)).toEqual([])
  })

  it('isMust=false / null / undefined は除外', () => {
    const items = [
      mk({ id: 'm', isMust: true, updatedAt: dt(5) }),
      mk({ id: 'n', isMust: false, updatedAt: dt(10) }),
      mk({ id: 'u', isMust: null, updatedAt: dt(10) }),
      mk({ id: 'x', isMust: undefined, updatedAt: dt(10) }),
    ]
    const res = pickMustStuckWipItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['m'])
  })

  it('isMust=true でも non-WIP / done / archive は除外', () => {
    const items = [
      mk({ id: 't', status: 'todo', updatedAt: dt(10) }),
      mk({ id: 'd', updatedAt: dt(10), doneAt: new Date() }),
      mk({ id: 'a', updatedAt: dt(10), archivedAt: new Date() }),
      mk({ id: 'w', status: 'in_progress', updatedAt: dt(10) }),
    ]
    const res = pickMustStuckWipItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['w'])
  })

  it('threshold 未満 (default 3 日) は除外', () => {
    const items = [mk({ id: 'a', updatedAt: dt(2) }), mk({ id: 'b', updatedAt: dt(3) })]
    const res = pickMustStuckWipItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['b'])
  })

  it('thresholdDays カスタム = 7 で 7 日以上のみ', () => {
    const items = [
      mk({ id: '3', updatedAt: dt(3) }),
      mk({ id: '7', updatedAt: dt(7) }),
      mk({ id: '14', updatedAt: dt(14) }),
    ]
    const res = pickMustStuckWipItems(items, { thresholdDays: 7 }, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['14', '7'])
  })

  it('停滞日数 desc に並び、同 day は元配列順 stable', () => {
    const items = [
      mk({ id: 'a', updatedAt: dt(5) }),
      mk({ id: 'b', updatedAt: dt(10) }),
      mk({ id: 'c', updatedAt: dt(10) }),
    ]
    const res = pickMustStuckWipItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('formatMustStuckWipJa', () => {
  it('0 件は sentinel', () => {
    expect(formatMustStuckWipJa([])).toBe('MUST 進行中だが停滞 0 件')
  })

  it('複数件 / 区切り (停滞日数 desc)', () => {
    const items = [
      mk({ id: 'a', title: 'A', updatedAt: dt(5) }),
      mk({ id: 'b', title: 'B', updatedAt: dt(7) }),
    ]
    const entries = pickMustStuckWipItems(items, {}, TODAY)
    expect(formatMustStuckWipJa(entries)).toBe('MUST 進行中だが停滞: 2 件 (B 7 日 / A 5 日)')
  })

  it('limit 超えは 他 N 件 でまとめる', () => {
    const items = [
      mk({ id: 'a', title: 'A', updatedAt: dt(10) }),
      mk({ id: 'b', title: 'B', updatedAt: dt(8) }),
      mk({ id: 'c', title: 'C', updatedAt: dt(6) }),
      mk({ id: 'd', title: 'D', updatedAt: dt(5) }),
    ]
    const entries = pickMustStuckWipItems(items, {}, TODAY)
    expect(formatMustStuckWipJa(entries, 2)).toBe(
      'MUST 進行中だが停滞: 4 件 (A 10 日 / B 8 日 / 他 2 件)',
    )
  })

  it('title 欠落は (無題) で fallback', () => {
    const item: MustStuckWipFields = {
      id: 'a',
      status: 'in_progress',
      updatedAt: dt(5),
      doneAt: null,
      archivedAt: null,
      isMust: true,
    }
    const entries = pickMustStuckWipItems([item], {}, TODAY)
    expect(formatMustStuckWipJa(entries)).toContain('(無題)')
  })
})

describe('mustStuckWipSeverity', () => {
  it('0 件 → idle', () => {
    expect(mustStuckWipSeverity([])).toBe('idle')
  })

  it('1 件以上 → critical (red 警報)', () => {
    const items = [mk({ id: 'a', updatedAt: dt(3) })]
    const entries = pickMustStuckWipItems(items, {}, TODAY)
    expect(mustStuckWipSeverity(entries)).toBe('critical')
  })
})

describe('computeMustStuckWipByPriority', () => {
  function mkP(
    overrides: Partial<MustStuckWipFields & { priority: number | null }>,
  ): MustStuckWipFields & { priority: number | null } {
    return { ...mk(overrides), priority: overrides.priority ?? 4 }
  }

  it('items 空 → 全 P count=0', () => {
    const result = computeMustStuckWipByPriority([], {}, TODAY)
    expect(result[1]).toEqual({ count: 0, maxStuckDays: null })
    expect(result[2]).toEqual({ count: 0, maxStuckDays: null })
    expect(result[3]).toEqual({ count: 0, maxStuckDays: null })
    expect(result[4]).toEqual({ count: 0, maxStuckDays: null })
  })

  it('priority 別に集計、isMust=false / 短期 / done は除外', () => {
    const items = [
      mkP({ id: 'a', priority: 1, updatedAt: dt(7) }), // ✓ P1 7日
      mkP({ id: 'b', priority: 1, updatedAt: dt(4) }), // ✓ P1 4日
      mkP({ id: 'c', priority: 3, updatedAt: dt(5) }), // ✓ P3 5日
      mkP({ id: 'd', priority: 1, updatedAt: dt(7), isMust: false }), // not must
      mkP({ id: 'e', priority: 2, updatedAt: dt(2) }), // 短期 (2 < 3 日)
      mkP({ id: 'f', priority: 4, updatedAt: dt(8), doneAt: new Date() }), // done
    ]
    const result = computeMustStuckWipByPriority(items, {}, TODAY)
    expect(result[1]).toEqual({ count: 2, maxStuckDays: 7 })
    expect(result[3]).toEqual({ count: 1, maxStuckDays: 5 })
    expect(result[2]).toEqual({ count: 0, maxStuckDays: null })
    expect(result[4]).toEqual({ count: 0, maxStuckDays: null })
  })

  it('priority null/範囲外 は p4', () => {
    const items = [
      mkP({ id: 'a', priority: null, updatedAt: dt(3) }),
      mkP({ id: 'b', priority: 99 as number, updatedAt: dt(7) }),
    ]
    const result = computeMustStuckWipByPriority(items, {}, TODAY)
    expect(result[4]).toEqual({ count: 2, maxStuckDays: 7 })
  })
})

describe('formatMustStuckWipByPriorityJa', () => {
  it('全 P count=0 → MUST 進行中だが停滞 0 件', () => {
    const empty = computeMustStuckWipByPriority([], {}, TODAY)
    expect(formatMustStuckWipByPriorityJa(empty)).toBe('MUST 進行中だが停滞 0 件')
  })

  it('複数 P 分散 → 番号順 / 区切り、count=0 P 省略', () => {
    function mkP(
      overrides: Partial<MustStuckWipFields & { priority: number }>,
    ): MustStuckWipFields & { priority: number } {
      return { ...mk(overrides), priority: overrides.priority ?? 4 }
    }
    const items = [
      mkP({ id: 'a', priority: 1, updatedAt: dt(7) }),
      mkP({ id: 'b', priority: 3, updatedAt: dt(4) }),
    ]
    const byP = computeMustStuckWipByPriority(items, {}, TODAY)
    expect(formatMustStuckWipByPriorityJa(byP)).toBe('P1 1 件 (最長 7日) / P3 1 件 (最長 4日)')
  })
})
