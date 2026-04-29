import { describe, expect, it } from 'vitest'

import { formatStaleUrgentJa, pickStaleUrgentItems, type StaleUrgentFields } from './stale-urgent'

const TODAY = new Date(2026, 3, 27) // Mon 2026-04-27

const item = (overrides: Partial<StaleUrgentFields>): StaleUrgentFields => ({
  priority: 4,
  dueDate: null,
  isMust: false,
  doneAt: null,
  archivedAt: null,
  createdAt: '2026-04-26', // 1 日経過 = recent (< 7)
  ...overrides,
})

const days = (n: number): string => {
  // n 日前の YYYY-MM-DD (TODAY 基準)
  const d = new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

describe('pickStaleUrgentItems', () => {
  it('critical / high かつ age >= 7 のみ抽出 (default minAgeDays=7)', () => {
    const items = [
      item({ priority: 1, createdAt: days(10) }), // critical (P1=100), age 10 → 採用
      item({ priority: 1, createdAt: days(2) }), // critical, age 2 → stale 不足で除外
      item({ priority: 2, createdAt: days(8) }), // high (P2=70), age 8 → 採用
      item({ priority: 3, createdAt: days(30) }), // medium (P3=40), age 30 → tier 不足
      item({ priority: 4, createdAt: days(60) }), // low (P4=10), age 60 → tier 不足
    ]
    const result = pickStaleUrgentItems(items, { today: TODAY })
    expect(result).toHaveLength(2)
    expect(result[0]!.priority).toBe(1) // critical first
    expect(result[1]!.priority).toBe(2)
  })

  it('done / archive は urgency=0 で除外', () => {
    const items = [
      item({ priority: 1, createdAt: days(20), doneAt: new Date('2026-04-26') }),
      item({ priority: 1, createdAt: days(20), archivedAt: new Date('2026-04-26') }),
      item({ priority: 1, createdAt: days(10) }), // 唯一の 採用
    ]
    const result = pickStaleUrgentItems(items, { today: TODAY })
    expect(result).toHaveLength(1)
  })

  it('createdAt 不正 (unknown 判定) は除外', () => {
    const items = [
      item({ priority: 1, createdAt: null }),
      item({ priority: 1, createdAt: 'garbage' }),
      item({ priority: 1, createdAt: days(10) }), // 採用
    ]
    const result = pickStaleUrgentItems(items, { today: TODAY })
    expect(result).toHaveLength(1)
  })

  it('sort 順は urgency score 降順 → age 降順 (古い順) → 元配列順', () => {
    const A = item({ priority: 2, createdAt: days(20) }) // score 70, age 20
    const B = item({ priority: 1, createdAt: days(7) }) // score 100, age 7 — score 高
    const C = item({ priority: 2, createdAt: days(10) }) // score 70, age 10
    const D = item({ priority: 2, createdAt: days(20) }) // score 70, age 20 — A と完全 tie → idx 順
    const result = pickStaleUrgentItems([A, B, C, D], { today: TODAY })
    expect(result).toEqual([B, A, D, C])
  })

  it('minAgeDays=0 → stale 条件無効化、critical/high 全件採用', () => {
    const items = [
      item({ priority: 1, createdAt: days(0) }), // age 0 でも採用
      item({ priority: 1, createdAt: days(1) }),
      item({ priority: 4, createdAt: days(0) }), // tier 不足で除外
    ]
    const result = pickStaleUrgentItems(items, { minAgeDays: 0, today: TODAY })
    expect(result).toHaveLength(2)
  })

  it('minAgeDays カスタム (e.g. 30) で ancient のみ抽出', () => {
    const items = [
      item({ priority: 1, createdAt: days(10) }), // age 10 < 30 → 除外
      item({ priority: 1, createdAt: days(45) }), // age 45 → 採用
    ]
    const result = pickStaleUrgentItems(items, { minAgeDays: 30, today: TODAY })
    expect(result).toHaveLength(1)
  })

  it('空配列 → 空配列', () => {
    expect(pickStaleUrgentItems([], { today: TODAY })).toEqual([])
  })
})

describe('formatStaleUrgentJa', () => {
  it('複数件 + 緊急 / 高 内訳 + 最古日数', () => {
    const items = [
      item({ priority: 1, createdAt: days(14) }), // critical, age 14
      item({ priority: 2, createdAt: days(8) }), // high, age 8
      item({ priority: 2, createdAt: days(20) }), // high, age 20 (oldest)
    ]
    expect(formatStaleUrgentJa(items, { today: TODAY })).toBe(
      '対応 + 古参 3 件 (緊急 1 / 高 2、最古 20 日)',
    )
  })

  it('緊急のみ', () => {
    const items = [item({ priority: 1, createdAt: days(10) })]
    expect(formatStaleUrgentJa(items, { today: TODAY })).toBe(
      '対応 + 古参 1 件 (緊急 1、最古 10 日)',
    )
  })

  it('高のみ', () => {
    const items = [item({ priority: 2, createdAt: days(15) })]
    expect(formatStaleUrgentJa(items, { today: TODAY })).toBe('対応 + 古参 1 件 (高 1、最古 15 日)')
  })

  it('該当なし → 対応 + 古参 0 件', () => {
    const items = [
      item({ priority: 4, createdAt: days(30) }), // tier 不足
      item({ priority: 1, createdAt: days(2) }), // age 不足
    ]
    expect(formatStaleUrgentJa(items, { today: TODAY })).toBe('対応 + 古参 0 件')
  })

  it('空配列 → 対応 + 古参 0 件', () => {
    expect(formatStaleUrgentJa([], { today: TODAY })).toBe('対応 + 古参 0 件')
  })
})
