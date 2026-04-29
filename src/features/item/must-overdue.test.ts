/**
 * iter372 ai-automation: must-overdue combinator pure helper の単体テスト。
 *
 * isMust filter + overdue active 制約 (computeOverdueActive 流用) の交差を網羅。
 */
import { describe, expect, it } from 'vitest'

import {
  computeMustOverdue,
  formatMustOverdueJa,
  type MustOverdueFields,
  mustOverdueSeverity,
} from './must-overdue'

const TODAY = new Date(2026, 3, 29) // 2026-04-29

function dueDateNDaysAgo(n: number): string {
  const d = new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mk(overrides: Partial<MustOverdueFields>): MustOverdueFields {
  return {
    status: overrides.status ?? 'todo',
    dueDate: 'dueDate' in overrides ? overrides.dueDate : dueDateNDaysAgo(1),
    doneAt: overrides.doneAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    isMust: 'isMust' in overrides ? overrides.isMust : true,
  }
}

describe('computeMustOverdue', () => {
  it('items 空 → total=0', () => {
    expect(computeMustOverdue([], TODAY)).toEqual({ total: 0, oldestOverdueDays: null })
  })

  it('isMust=false / null / undefined は除外', () => {
    const items = [
      mk({ isMust: true, dueDate: dueDateNDaysAgo(5) }),
      mk({ isMust: false, dueDate: dueDateNDaysAgo(10) }),
      mk({ isMust: null, dueDate: dueDateNDaysAgo(10) }),
      mk({ isMust: undefined, dueDate: dueDateNDaysAgo(10) }),
    ]
    const result = computeMustOverdue(items, TODAY)
    expect(result.total).toBe(1)
    expect(result.oldestOverdueDays).toBe(5)
  })

  it('isMust=true でも done/archive/cancelled は除外', () => {
    const items = [
      mk({ dueDate: dueDateNDaysAgo(5), doneAt: new Date() }),
      mk({ dueDate: dueDateNDaysAgo(5), archivedAt: new Date() }),
      mk({ dueDate: dueDateNDaysAgo(5), status: 'cancelled' }),
      mk({ dueDate: dueDateNDaysAgo(5), status: 'todo' }), // active カウント対象
    ]
    expect(computeMustOverdue(items, TODAY).total).toBe(1)
  })

  it('isMust=true でも dueDate >= today は除外', () => {
    const items = [
      mk({ dueDate: dueDateNDaysAgo(0) }), // today exact
      mk({ dueDate: dueDateNDaysAgo(-1) }), // future
    ]
    expect(computeMustOverdue(items, TODAY).total).toBe(0)
  })

  it('複数 MUST overdue → oldestOverdueDays 最大値', () => {
    const items = [
      mk({ dueDate: dueDateNDaysAgo(3) }),
      mk({ dueDate: dueDateNDaysAgo(14) }),
      mk({ dueDate: dueDateNDaysAgo(7) }),
    ]
    const result = computeMustOverdue(items, TODAY)
    expect(result.total).toBe(3)
    expect(result.oldestOverdueDays).toBe(14)
  })
})

describe('formatMustOverdueJa', () => {
  it('total=0 → MUST 期限超過 0 件', () => {
    expect(formatMustOverdueJa({ total: 0, oldestOverdueDays: null })).toBe('MUST 期限超過 0 件')
  })

  it('total>0 + oldest >= 1 → 即対応 tail', () => {
    expect(formatMustOverdueJa({ total: 2, oldestOverdueDays: 14 })).toBe(
      'MUST 期限超過 2 件 (最古 14 日) — 即対応',
    )
  })

  it('total>0 + oldest === 0 → 今日付 tail (短縮形)', () => {
    expect(formatMustOverdueJa({ total: 1, oldestOverdueDays: 0 })).toBe(
      'MUST 期限超過 1 件 (今日付)',
    )
  })
})

describe('mustOverdueSeverity', () => {
  it('total=0 → idle', () => {
    expect(mustOverdueSeverity({ total: 0, oldestOverdueDays: null })).toBe('idle')
  })

  it('total>0 → critical', () => {
    expect(mustOverdueSeverity({ total: 1, oldestOverdueDays: 5 })).toBe('critical')
  })
})
