/**
 * iter402 ai-automation: must-stale combinator pure helper の単体テスト。
 *
 * MUST 制約 + 既存 stale-items 制約 (default 7 日 / done/cancelled 除外 / fail-soft) の
 * 交差を網羅する。
 */
import { describe, expect, it } from 'vitest'

import {
  formatMustStaleJa,
  type MustStaleFields,
  mustStaleSeverity,
  pickMustStaleItems,
} from './must-stale'

const TODAY = new Date(2026, 3, 28) // 2026-04-28
const DAY = 24 * 60 * 60 * 1000

function dt(daysAgo: number): Date {
  return new Date(TODAY.getTime() - daysAgo * DAY)
}

function mk(overrides: Partial<MustStaleFields>): MustStaleFields {
  return {
    id: overrides.id ?? 'i',
    title: overrides.title ?? 'untitled',
    status: overrides.status ?? 'todo',
    updatedAt: overrides.updatedAt ?? dt(0),
    doneAt: overrides.doneAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    isMust: 'isMust' in overrides ? overrides.isMust : true,
  }
}

describe('pickMustStaleItems', () => {
  it('items 空 → 空配列', () => {
    expect(pickMustStaleItems([], {}, TODAY)).toEqual([])
  })

  it('isMust=false / null / undefined は除外', () => {
    const items = [
      mk({ id: 'A', isMust: true, updatedAt: dt(10) }),
      mk({ id: 'B', isMust: false, updatedAt: dt(10) }),
      mk({ id: 'C', isMust: null, updatedAt: dt(10) }),
      mk({ id: 'D', isMust: undefined, updatedAt: dt(10) }),
    ]
    const res = pickMustStaleItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['A'])
  })

  it('isMust=true でも threshold 未満は除外 (default 7 日)', () => {
    const items = [
      mk({ id: 'A', updatedAt: dt(6) }), // 6 日前 < 7 日
      mk({ id: 'B', updatedAt: dt(8) }), // ✓
    ]
    const res = pickMustStaleItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['B'])
  })

  it('isMust=true でも done/archive/cancelled は除外', () => {
    const items = [
      mk({ id: 'A', updatedAt: dt(10) }), // ✓
      mk({ id: 'B', updatedAt: dt(10), doneAt: new Date() }), // done
      mk({ id: 'C', updatedAt: dt(10), archivedAt: new Date() }), // archive
      mk({ id: 'D', updatedAt: dt(10), status: 'cancelled' }), // cancelled
    ]
    const res = pickMustStaleItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['A'])
  })

  it('staleDays desc 並び、同 day は元配列順 stable', () => {
    const items = [
      mk({ id: 'A', updatedAt: dt(8) }),
      mk({ id: 'B', updatedAt: dt(14) }),
      mk({ id: 'C', updatedAt: dt(14) }),
      mk({ id: 'D', updatedAt: dt(10) }),
    ]
    const res = pickMustStaleItems(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['B', 'C', 'D', 'A'])
  })

  it('thresholdDays option で閾値変更可', () => {
    const items = [mk({ id: 'A', updatedAt: dt(10) })] // 10 日前
    const res14 = pickMustStaleItems(items, { thresholdDays: 14 }, TODAY)
    expect(res14).toEqual([]) // 14 日 threshold で 10 日は弾かれる
    const res7 = pickMustStaleItems(items, { thresholdDays: 7 }, TODAY)
    expect(res7).toHaveLength(1)
  })
})

describe('formatMustStaleJa', () => {
  it('0 件 → MUST 古参 0 件', () => {
    expect(formatMustStaleJa([])).toBe('MUST 古参 0 件')
  })

  it('1 件 → 件数 + 1 行', () => {
    const items = [mk({ id: 'A', title: '最古', updatedAt: dt(10) })]
    const entries = pickMustStaleItems(items, {}, TODAY)
    expect(formatMustStaleJa(entries)).toBe('MUST 古参: 1 件 (最古 10 日前)')
  })

  it('複数件 / 区切り (staleDays desc)', () => {
    const items = [
      mk({ id: 'A', title: 'A', updatedAt: dt(8) }),
      mk({ id: 'B', title: 'B', updatedAt: dt(14) }),
    ]
    const entries = pickMustStaleItems(items, {}, TODAY)
    expect(formatMustStaleJa(entries)).toBe('MUST 古参: 2 件 (B 14 日前 / A 8 日前)')
  })

  it('limit 超えは 他 N 件 でまとめる', () => {
    const items = [
      mk({ id: 'A', title: 'A', updatedAt: dt(14) }),
      mk({ id: 'B', title: 'B', updatedAt: dt(12) }),
      mk({ id: 'C', title: 'C', updatedAt: dt(10) }),
      mk({ id: 'D', title: 'D', updatedAt: dt(8) }),
    ]
    const entries = pickMustStaleItems(items, {}, TODAY)
    expect(formatMustStaleJa(entries, 2)).toBe('MUST 古参: 4 件 (A 14 日前 / B 12 日前 / 他 2 件)')
  })

  it('title 欠落は (無題) で fallback', () => {
    const noTitle: MustStaleFields = {
      id: 'X',
      status: 'todo',
      updatedAt: dt(10),
      doneAt: null,
      archivedAt: null,
      isMust: true,
    }
    const entries = pickMustStaleItems([noTitle], {}, TODAY)
    expect(formatMustStaleJa(entries)).toContain('(無題)')
  })
})

describe('mustStaleSeverity', () => {
  it('0 件 → idle', () => {
    expect(mustStaleSeverity([])).toBe('idle')
  })

  it('1 件以上 → critical (red 警報)', () => {
    const items = [mk({ id: 'A', updatedAt: dt(10) })]
    const entries = pickMustStaleItems(items, {}, TODAY)
    expect(mustStaleSeverity(entries)).toBe('critical')
  })
})
