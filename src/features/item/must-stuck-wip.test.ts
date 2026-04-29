/**
 * iter364 ai-automation: must-stuck-wip combinator pure helper の単体テスト。
 *
 * MUST 制約 + 既存 wip-stuck 制約 (default 3 日 / status='in_progress' / done/archive
 * 除外 / fail-soft) の交差を網羅する。
 */
import { describe, expect, it } from 'vitest'

import {
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
