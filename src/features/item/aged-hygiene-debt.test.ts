import { describe, expect, it } from 'vitest'

import {
  computeAgedHygieneDebt,
  formatAgedHygieneDebtJa,
  pickStagnantDebtItems,
} from './aged-hygiene-debt'

interface Item {
  doneAt: Date | string | null
  archivedAt: Date | string | null
  dueDate: string | null
  dod: string | null
  description: string | null
  createdAt: Date | string | null
}

function item(p: Partial<Item> = {}): Item {
  return {
    doneAt: null,
    archivedAt: null,
    dueDate: null,
    dod: null,
    description: null,
    createdAt: null,
    ...p,
  }
}

const TODAY = '2026-04-29'

function daysAgoIso(n: number): string {
  const d = new Date('2026-04-29T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

describe('computeAgedHygieneDebt', () => {
  it('returns empty stats when no items', () => {
    const r = computeAgedHygieneDebt([], TODAY)
    expect(r.totalDebt).toBe(0)
    expect(r.byAge).toEqual({ new: 0, recent: 0, stale: 0, ancient: 0, unknown: 0 })
    expect(r.oldestAgeDays).toBe(null)
    expect(r.stagnantDebtCount).toBe(0)
  })

  it('counts debt items grouped by age', () => {
    const items: Item[] = [
      item({ createdAt: daysAgoIso(0) }), // new
      item({ createdAt: daysAgoIso(3) }), // recent
      item({ createdAt: daysAgoIso(15) }), // stale
      item({ createdAt: daysAgoIso(45) }), // ancient
      item({ createdAt: daysAgoIso(45), dueDate: '2026-05-01' }), // ancient but not debt
    ]
    const r = computeAgedHygieneDebt(items, TODAY)
    expect(r.totalDebt).toBe(4)
    expect(r.byAge.new).toBe(1)
    expect(r.byAge.recent).toBe(1)
    expect(r.byAge.stale).toBe(1)
    expect(r.byAge.ancient).toBe(1)
    expect(r.oldestAgeDays).toBe(45)
    expect(r.stagnantDebtCount).toBe(2) // ancient 1 + stale 1
  })

  it('skips done / archived items from debt set', () => {
    const items: Item[] = [
      item({ createdAt: daysAgoIso(45), doneAt: new Date() }),
      item({ createdAt: daysAgoIso(45), archivedAt: new Date() }),
      item({ createdAt: daysAgoIso(10) }),
    ]
    const r = computeAgedHygieneDebt(items, TODAY)
    expect(r.totalDebt).toBe(1)
    expect(r.oldestAgeDays).toBe(10)
  })

  it('handles unknown createdAt (debt counted, oldestAgeDays excludes unknown)', () => {
    const items: Item[] = [item({ createdAt: null }), item({ createdAt: daysAgoIso(5) })]
    const r = computeAgedHygieneDebt(items, TODAY)
    expect(r.totalDebt).toBe(2)
    expect(r.byAge.unknown).toBe(1)
    expect(r.oldestAgeDays).toBe(5)
  })
})

describe('formatAgedHygieneDebtJa', () => {
  it('formats empty as "未完了 Debt 0 件 (該当なし)"', () => {
    expect(formatAgedHygieneDebtJa(computeAgedHygieneDebt([], TODAY))).toBe(
      '未完了 Debt 0 件 (該当なし)',
    )
  })

  it('formats new-only debt as "全件新規 — 停滞無し"', () => {
    const items: Item[] = [item({ createdAt: daysAgoIso(0) })]
    expect(formatAgedHygieneDebtJa(computeAgedHygieneDebt(items, TODAY))).toBe(
      'Debt: 1 件 / 全件新規 — 停滞無し',
    )
  })

  it('formats stagnant debt with breakdown + oldest', () => {
    const items: Item[] = [
      item({ createdAt: daysAgoIso(45) }),
      item({ createdAt: daysAgoIso(35) }),
      item({ createdAt: daysAgoIso(15) }),
    ]
    expect(formatAgedHygieneDebtJa(computeAgedHygieneDebt(items, TODAY))).toBe(
      '停滞 Debt: 3 件 (古参 2 / 停滞 1) — 最古 45 日',
    )
  })
})

describe('pickStagnantDebtItems', () => {
  it('returns ancient + stale debt items in stable order', () => {
    const a = item({ createdAt: daysAgoIso(45) })
    const b = item({ createdAt: daysAgoIso(3) }) // recent (not stagnant)
    const c = item({ createdAt: daysAgoIso(15) }) // stale
    expect(pickStagnantDebtItems([a, b, c], TODAY)).toEqual([a, c])
  })

  it('returns empty array when no debt', () => {
    const items: Item[] = [item({ createdAt: daysAgoIso(45), dueDate: '2026-05-01' })]
    expect(pickStagnantDebtItems(items, TODAY)).toEqual([])
  })
})
