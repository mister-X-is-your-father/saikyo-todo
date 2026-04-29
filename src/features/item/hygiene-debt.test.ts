import { describe, expect, it } from 'vitest'

import {
  computeHygieneDebt,
  formatHygieneDebtJa,
  hygieneDebtTone,
  pickHygieneDebtItems,
} from './hygiene-debt'

interface Item {
  doneAt: Date | string | null
  archivedAt: Date | string | null
  dueDate: string | null
  dod: string | null
  description: string | null
}

function item(p: Partial<Item> = {}): Item {
  return { doneAt: null, archivedAt: null, dueDate: null, dod: null, description: null, ...p }
}

describe('computeHygieneDebt', () => {
  it('returns EMPTY when no items', () => {
    expect(computeHygieneDebt([])).toEqual({ total: 0, debtCount: 0, rate: null })
  })

  it('counts items missing all 3 hygiene fields as debt', () => {
    const items: Item[] = [item(), item(), item()]
    const r = computeHygieneDebt(items)
    expect(r.total).toBe(3)
    expect(r.debtCount).toBe(3)
    expect(r.rate).toBe(1)
  })

  it('does not count items with at least 1 hygiene field set', () => {
    const items: Item[] = [
      item({ dueDate: '2026-05-01' }),
      item({ dod: 'ok' }),
      item({ description: 'desc' }),
      item(), // debt
    ]
    const r = computeHygieneDebt(items)
    expect(r.total).toBe(4)
    expect(r.debtCount).toBe(1)
    expect(r.rate).toBe(0.25)
  })

  it('skips done / archived items from total', () => {
    const items: Item[] = [
      item({ doneAt: new Date() }),
      item({ archivedAt: new Date() }),
      item(), // debt
    ]
    const r = computeHygieneDebt(items)
    expect(r.total).toBe(1)
    expect(r.debtCount).toBe(1)
  })

  it('treats whitespace-only dod / description as unset', () => {
    const items: Item[] = [item({ dod: '   ', description: '\n\n' })]
    const r = computeHygieneDebt(items)
    expect(r.debtCount).toBe(1)
  })

  it('treats invalid ISO dueDate as unset', () => {
    const items: Item[] = [item({ dueDate: 'not-a-date' })]
    const r = computeHygieneDebt(items)
    expect(r.debtCount).toBe(1)
  })
})

describe('formatHygieneDebtJa', () => {
  it('formats empty as "未完了 0 件 (該当なし)"', () => {
    expect(formatHygieneDebtJa(computeHygieneDebt([]))).toBe('未完了 0 件 (該当なし)')
  })

  it('formats zero debt as "全 item に planning fields あり"', () => {
    const r = computeHygieneDebt([item({ dueDate: '2026-05-01' })])
    expect(formatHygieneDebtJa(r)).toBe('Hygiene Debt: 0 件 (全 item に planning fields あり)')
  })

  it('formats debt as count / total with percent + suffix', () => {
    const r = computeHygieneDebt([
      item(),
      item(),
      item(),
      item({ dueDate: '2026-05-01' }),
      item({ dueDate: '2026-05-02' }),
      item({ dueDate: '2026-05-03' }),
      item({ dueDate: '2026-05-04' }),
      item({ dueDate: '2026-05-05' }),
      item({ dueDate: '2026-05-06' }),
      item({ dueDate: '2026-05-07' }),
    ])
    expect(formatHygieneDebtJa(r)).toBe(
      'Hygiene Debt: 3 / 10 件 (30%) — title だけ items が triage 待ち',
    )
  })
})

describe('hygieneDebtTone', () => {
  it('returns "warn" for rate >= 0.3', () => {
    const items: Item[] = [item(), item(), item(), item({ dueDate: '2026-05-01' })]
    expect(hygieneDebtTone(computeHygieneDebt(items))).toBe('warn')
  })

  it('returns "neutral" for 0.1 <= rate < 0.3', () => {
    const items: Item[] = [
      item(),
      ...Array(9)
        .fill(0)
        .map(() => item({ dueDate: '2026-05-01' })),
    ]
    expect(hygieneDebtTone(computeHygieneDebt(items))).toBe('neutral')
  })

  it('returns "good" for rate < 0.1', () => {
    const items: Item[] = [
      item(),
      ...Array(20)
        .fill(0)
        .map(() => item({ dueDate: '2026-05-01' })),
    ]
    expect(hygieneDebtTone(computeHygieneDebt(items))).toBe('good')
  })

  it('returns "neutral" for empty (rate=null)', () => {
    expect(hygieneDebtTone(computeHygieneDebt([]))).toBe('neutral')
  })
})

describe('pickHygieneDebtItems', () => {
  it('returns items with all 3 hygiene fields unset, in stable order', () => {
    const a = item()
    const b = item({ dueDate: '2026-05-01' })
    const c = item()
    expect(pickHygieneDebtItems([a, b, c])).toEqual([a, c])
  })

  it('skips done / archived items', () => {
    const items: Item[] = [item({ doneAt: new Date() }), item({ archivedAt: new Date() }), item()]
    expect(pickHygieneDebtItems(items)).toHaveLength(1)
  })
})
