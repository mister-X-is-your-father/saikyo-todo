import { describe, expect, it } from 'vitest'

import {
  computeMustHygiene,
  formatMustHygieneJa,
  type MustHygieneFields,
  mustHygieneSeverity,
} from './must-hygiene'

describe('computeMustHygiene', () => {
  it('returns empty when no MUST items', () => {
    const items: MustHygieneFields[] = [
      { isMust: false, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { isMust: null, doneAt: null, archivedAt: null, dueDate: null },
    ]
    expect(computeMustHygiene(items)).toEqual({
      total: 0,
      withDueDate: 0,
      withoutDueDate: 0,
      coverageRate: null,
    })
  })

  it('excludes done MUST items', () => {
    const items: MustHygieneFields[] = [
      { isMust: true, doneAt: '2026-04-29T10:00:00Z', archivedAt: null, dueDate: '2026-04-29' },
      { isMust: true, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
    ]
    expect(computeMustHygiene(items).total).toBe(1)
  })

  it('excludes archived MUST items', () => {
    const items: MustHygieneFields[] = [
      { isMust: true, doneAt: null, archivedAt: '2026-04-29T10:00:00Z', dueDate: '2026-04-29' },
      { isMust: true, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
    ]
    expect(computeMustHygiene(items).total).toBe(1)
  })

  it('counts withDueDate when dueDate is valid YYYY-MM-DD', () => {
    const items: MustHygieneFields[] = [
      { isMust: true, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { isMust: true, doneAt: null, archivedAt: null, dueDate: '2026-12-31' },
    ]
    expect(computeMustHygiene(items)).toEqual({
      total: 2,
      withDueDate: 2,
      withoutDueDate: 0,
      coverageRate: 1,
    })
  })

  it('counts withoutDueDate when dueDate is null / undefined / invalid', () => {
    const items: MustHygieneFields[] = [
      { isMust: true, doneAt: null, archivedAt: null, dueDate: null },
      { isMust: true, doneAt: null, archivedAt: null, dueDate: '' },
      { isMust: true, doneAt: null, archivedAt: null, dueDate: '2026-99-99' },
    ]
    expect(computeMustHygiene(items)).toEqual({
      total: 3,
      withDueDate: 0,
      withoutDueDate: 3,
      coverageRate: 0,
    })
  })

  it('mixes coverage with correct rate', () => {
    const items: MustHygieneFields[] = [
      { isMust: true, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { isMust: true, doneAt: null, archivedAt: null, dueDate: '2026-05-01' },
      { isMust: true, doneAt: null, archivedAt: null, dueDate: null },
    ]
    expect(computeMustHygiene(items)).toEqual({
      total: 3,
      withDueDate: 2,
      withoutDueDate: 1,
      coverageRate: 2 / 3,
    })
  })
})

describe('formatMustHygieneJa', () => {
  it('formats empty as "MUST 0 件"', () => {
    expect(
      formatMustHygieneJa({ total: 0, withDueDate: 0, withoutDueDate: 0, coverageRate: null }),
    ).toBe('MUST 0 件')
  })

  it('formats clean as "全て期限付き"', () => {
    expect(
      formatMustHygieneJa({ total: 5, withDueDate: 5, withoutDueDate: 0, coverageRate: 1 }),
    ).toBe('MUST: 5 件 (全て期限付き)')
  })

  it('formats fully-uncovered as "全て期限なし — 重大な計画漏れ"', () => {
    expect(
      formatMustHygieneJa({ total: 3, withDueDate: 0, withoutDueDate: 3, coverageRate: 0 }),
    ).toBe('MUST: 3 件 (全て期限なし — 重大な計画漏れ)')
  })

  it('formats partial coverage with "計画化推奨"', () => {
    expect(
      formatMustHygieneJa({ total: 3, withDueDate: 2, withoutDueDate: 1, coverageRate: 2 / 3 }),
    ).toBe('MUST: 3 件 (期限付 2 / 期限なし 1 — 計画化推奨)')
  })
})

describe('mustHygieneSeverity', () => {
  it('returns "idle" for total=0', () => {
    expect(
      mustHygieneSeverity({ total: 0, withDueDate: 0, withoutDueDate: 0, coverageRate: null }),
    ).toBe('idle')
  })

  it('returns "clean" when all MUST have dueDate', () => {
    expect(
      mustHygieneSeverity({ total: 5, withDueDate: 5, withoutDueDate: 0, coverageRate: 1 }),
    ).toBe('clean')
  })

  it('returns "severe" when coverage < 50%', () => {
    expect(
      mustHygieneSeverity({ total: 3, withDueDate: 1, withoutDueDate: 2, coverageRate: 1 / 3 }),
    ).toBe('severe')
    expect(
      mustHygieneSeverity({ total: 5, withDueDate: 0, withoutDueDate: 5, coverageRate: 0 }),
    ).toBe('severe')
  })

  it('returns "mild" when coverage >= 50% but some without', () => {
    expect(
      mustHygieneSeverity({ total: 3, withDueDate: 2, withoutDueDate: 1, coverageRate: 2 / 3 }),
    ).toBe('mild')
  })
})

describe('integration: items → compute → format', () => {
  it('connects pipeline end-to-end', () => {
    const items: MustHygieneFields[] = [
      { isMust: true, doneAt: null, archivedAt: null, dueDate: '2026-04-29' },
      { isMust: true, doneAt: null, archivedAt: null, dueDate: null },
      { isMust: false, doneAt: null, archivedAt: null, dueDate: null }, // not MUST
      { isMust: true, doneAt: '2026-04-25T10:00:00Z', archivedAt: null, dueDate: null }, // done
    ]
    const stats = computeMustHygiene(items)
    expect(formatMustHygieneJa(stats)).toBe('MUST: 2 件 (期限付 1 / 期限なし 1 — 計画化推奨)')
    expect(mustHygieneSeverity(stats)).toBe('mild')
  })
})
