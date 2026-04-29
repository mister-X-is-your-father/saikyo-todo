/**
 * iter367 ai-automation: overdue-active pure helper の単体テスト。
 *
 * dueDate < today 判定 / status 4 bucket / done-cancelled 除外 / archive 除外 /
 * fail-soft / oldestOverdueDays 計算 / format / severity 分岐 を網羅する。
 */
import { describe, expect, it } from 'vitest'

import {
  computeOverdueActive,
  computeOverdueActiveByPriority,
  formatOverdueActiveByPriorityJa,
  formatOverdueActiveJa,
  formatOverdueActiveTitlesJa,
  type OverdueActiveFields,
  overdueActiveSeverity,
  pickOverdueActiveItems,
} from './overdue-active'

const TODAY = new Date(2026, 3, 29) // 2026-04-29

function dueDateNDaysAgo(n: number): string {
  const d = new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mk(overrides: Partial<OverdueActiveFields>): OverdueActiveFields {
  return {
    status: overrides.status ?? 'todo',
    dueDate: 'dueDate' in overrides ? overrides.dueDate : dueDateNDaysAgo(1),
    doneAt: overrides.doneAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
  }
}

describe('computeOverdueActive', () => {
  it('items 空 → total=0', () => {
    expect(computeOverdueActive([], TODAY)).toEqual({
      total: 0,
      byStatus: { todo: 0, in_progress: 0, blocked: 0, unknown: 0 },
      oldestOverdueDays: null,
    })
  })

  it('dueDate >= today (= overdue ではない) は除外', () => {
    const items = [
      mk({ dueDate: dueDateNDaysAgo(0) }), // today exact = not overdue
      mk({ dueDate: dueDateNDaysAgo(-1) }), // future = not overdue
    ]
    expect(computeOverdueActive(items, TODAY).total).toBe(0)
  })

  it('done / archive は除外', () => {
    const items = [
      mk({ dueDate: dueDateNDaysAgo(5), doneAt: new Date() }),
      mk({ dueDate: dueDateNDaysAgo(5), archivedAt: new Date() }),
      mk({ dueDate: dueDateNDaysAgo(5) }), // active = カウント対象
    ]
    expect(computeOverdueActive(items, TODAY).total).toBe(1)
  })

  it('status=done / cancelled は除外', () => {
    const items = [
      mk({ status: 'done', dueDate: dueDateNDaysAgo(5) }),
      mk({ status: 'cancelled', dueDate: dueDateNDaysAgo(5) }),
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(5) }),
    ]
    expect(computeOverdueActive(items, TODAY).total).toBe(1)
  })

  it('byStatus に 4 bucket (todo / in_progress / blocked / unknown) 集計', () => {
    const items = [
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(2) }),
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(3) }),
      mk({ status: 'in_progress', dueDate: dueDateNDaysAgo(5) }),
      mk({ status: 'blocked', dueDate: dueDateNDaysAgo(7) }),
      mk({ status: 'wat', dueDate: dueDateNDaysAgo(10) }), // unknown bucket
    ]
    const result = computeOverdueActive(items, TODAY)
    expect(result.total).toBe(5)
    expect(result.byStatus).toEqual({ todo: 2, in_progress: 1, blocked: 1, unknown: 1 })
    expect(result.oldestOverdueDays).toBe(10)
  })

  it('dueDate が不正 ISO は除外', () => {
    const items = [
      mk({ dueDate: 'not-a-date' }),
      mk({ dueDate: null }),
      mk({ dueDate: undefined }),
      mk({ dueDate: '' }),
    ]
    expect(computeOverdueActive(items, TODAY).total).toBe(0)
  })

  it('today 不正 → EMPTY', () => {
    const items = [mk({ dueDate: dueDateNDaysAgo(5) })]
    expect(computeOverdueActive(items, 'invalid-date').total).toBe(0)
  })

  it('today を ISO 文字列でも受付', () => {
    const items = [mk({ dueDate: '2026-04-25', status: 'todo' })] // 4 日前
    const result = computeOverdueActive(items, '2026-04-29')
    expect(result.total).toBe(1)
    expect(result.oldestOverdueDays).toBe(4)
  })
})

describe('formatOverdueActiveJa', () => {
  it('total=0 → 期限超過 0 件', () => {
    expect(
      formatOverdueActiveJa({
        total: 0,
        byStatus: { todo: 0, in_progress: 0, blocked: 0, unknown: 0 },
        oldestOverdueDays: null,
      }),
    ).toBe('期限超過 0 件')
  })

  it('複数 status 集計 + 最古 N 日', () => {
    const items = [
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(3) }),
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(2) }),
      mk({ status: 'in_progress', dueDate: dueDateNDaysAgo(14) }),
    ]
    const stats = computeOverdueActive(items, TODAY)
    expect(formatOverdueActiveJa(stats)).toBe('期限超過 3 件 (TODO 2 / 進行中 1) — 最古 14 日')
  })

  it('単一 status / oldest 1 日 → 最古 N 日 tail も付く', () => {
    const items = [mk({ status: 'todo', dueDate: dueDateNDaysAgo(1) })]
    const stats = computeOverdueActive(items, TODAY)
    expect(formatOverdueActiveJa(stats)).toBe('期限超過 1 件 (TODO 1) — 最古 1 日')
  })

  it('count=0 の bucket は breakdown から省略', () => {
    const items = [
      mk({ status: 'in_progress', dueDate: dueDateNDaysAgo(2) }),
      mk({ status: 'in_progress', dueDate: dueDateNDaysAgo(5) }),
    ]
    const stats = computeOverdueActive(items, TODAY)
    expect(formatOverdueActiveJa(stats)).toBe('期限超過 2 件 (進行中 2) — 最古 5 日')
  })
})

describe('overdueActiveSeverity', () => {
  it('total=0 → idle', () => {
    expect(
      overdueActiveSeverity({
        total: 0,
        byStatus: { todo: 0, in_progress: 0, blocked: 0, unknown: 0 },
        oldestOverdueDays: null,
      }),
    ).toBe('idle')
  })

  it('1 件 + 全て 7 日未満 + 件数 < 5 → mild', () => {
    const items = [mk({ status: 'todo', dueDate: dueDateNDaysAgo(3) })]
    const stats = computeOverdueActive(items, TODAY)
    expect(overdueActiveSeverity(stats)).toBe('mild')
  })

  it('7 日以上 overdue が 1 件あれば severe', () => {
    const items = [mk({ status: 'todo', dueDate: dueDateNDaysAgo(7) })]
    const stats = computeOverdueActive(items, TODAY)
    expect(overdueActiveSeverity(stats)).toBe('severe')
  })

  it('件数 ≥ 5 で全て < 7 日でも severe', () => {
    const items = [
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(1) }),
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(2) }),
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(3) }),
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(4) }),
      mk({ status: 'todo', dueDate: dueDateNDaysAgo(5) }),
    ]
    const stats = computeOverdueActive(items, TODAY)
    expect(overdueActiveSeverity(stats)).toBe('severe')
  })
})

type OverdueActiveFieldsWithPriority = OverdueActiveFields & {
  priority: number | null | undefined
}

function mkP(overrides: Partial<OverdueActiveFieldsWithPriority>): OverdueActiveFieldsWithPriority {
  return {
    status: overrides.status ?? 'todo',
    dueDate: 'dueDate' in overrides ? overrides.dueDate : dueDateNDaysAgo(1),
    doneAt: overrides.doneAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    priority: overrides.priority ?? 4,
  }
}

describe('computeOverdueActiveByPriority', () => {
  it('items 空 → 全 P bucket count=0', () => {
    const result = computeOverdueActiveByPriority([], TODAY)
    expect(result[1]).toEqual({ count: 0, oldestOverdueDays: null })
    expect(result[2]).toEqual({ count: 0, oldestOverdueDays: null })
    expect(result[3]).toEqual({ count: 0, oldestOverdueDays: null })
    expect(result[4]).toEqual({ count: 0, oldestOverdueDays: null })
  })

  it('priority 別 overdue 集計 + 最古日数', () => {
    const items = [
      mkP({ priority: 1, dueDate: dueDateNDaysAgo(14), status: 'todo' }),
      mkP({ priority: 1, dueDate: dueDateNDaysAgo(5), status: 'in_progress' }),
      mkP({ priority: 3, dueDate: dueDateNDaysAgo(8), status: 'todo' }),
    ]
    const result = computeOverdueActiveByPriority(items, TODAY)
    expect(result[1]).toEqual({ count: 2, oldestOverdueDays: 14 })
    expect(result[3]).toEqual({ count: 1, oldestOverdueDays: 8 })
    expect(result[2]).toEqual({ count: 0, oldestOverdueDays: null })
  })

  it('priority null/範囲外 は p4', () => {
    const items = [
      mkP({ priority: null, dueDate: dueDateNDaysAgo(3), status: 'todo' }),
      mkP({ priority: 99 as number, dueDate: dueDateNDaysAgo(7), status: 'todo' }),
    ]
    const result = computeOverdueActiveByPriority(items, TODAY)
    expect(result[4]).toEqual({ count: 2, oldestOverdueDays: 7 })
  })
})

describe('formatOverdueActiveByPriorityJa', () => {
  it('全 P count=0 → 期限超過 0 件', () => {
    const empty = computeOverdueActiveByPriority([], TODAY)
    expect(formatOverdueActiveByPriorityJa(empty)).toBe('期限超過 0 件')
  })

  it('複数 P 分散 → 番号順 / 区切り、count=0 P 省略', () => {
    const items = [
      mkP({ priority: 1, dueDate: dueDateNDaysAgo(14), status: 'todo' }),
      mkP({ priority: 3, dueDate: dueDateNDaysAgo(5), status: 'todo' }),
    ]
    const byP = computeOverdueActiveByPriority(items, TODAY)
    expect(formatOverdueActiveByPriorityJa(byP)).toBe('P1 1 件 (最古 14日) / P3 1 件 (最古 5日)')
  })
})

describe('pickOverdueActiveItems', () => {
  it('overdue items を overdueDays 降順で返す', () => {
    const items = [
      { ...mk({ dueDate: dueDateNDaysAgo(3) }), title: '中期' },
      { ...mk({ dueDate: dueDateNDaysAgo(14) }), title: '最古' },
      { ...mk({ dueDate: dueDateNDaysAgo(1) }), title: '直近' },
    ]
    const result = pickOverdueActiveItems(items, TODAY)
    expect(result.map((e) => e.item.title)).toEqual(['最古', '中期', '直近'])
    expect(result.map((e) => e.overdueDays)).toEqual([14, 3, 1])
  })

  it('done / archive / cancelled / 未来日 / 不正日付 は除外', () => {
    const items = [
      mk({ dueDate: dueDateNDaysAgo(5), doneAt: new Date() }), // done
      mk({ dueDate: dueDateNDaysAgo(5), archivedAt: new Date() }), // archived
      mk({ dueDate: dueDateNDaysAgo(5), status: 'cancelled' }), // cancelled
      mk({ dueDate: dueDateNDaysAgo(5), status: 'done' }), // status=done
      mk({ dueDate: dueDateNDaysAgo(-3) }), // 未来日 (= -3 = 3 日後)
      mk({ dueDate: 'not-a-date' }), // 不正
      mk({ dueDate: null }), // null
      mk({ dueDate: dueDateNDaysAgo(2) }), // ✓ 唯一 overdue
    ]
    const result = pickOverdueActiveItems(items, TODAY)
    expect(result.length).toBe(1)
    expect(result[0]!.overdueDays).toBe(2)
  })

  it('today が不正なら空配列', () => {
    const items = [mk({ dueDate: dueDateNDaysAgo(5) })]
    expect(pickOverdueActiveItems(items, 'invalid-date')).toEqual([])
  })
})

describe('formatOverdueActiveTitlesJa', () => {
  it('0 件 sentinel', () => {
    expect(formatOverdueActiveTitlesJa([])).toBe('期限超過 0 件')
  })

  it('上位 limit 件 + 残りは "他 N 件"', () => {
    const items = [
      { ...mk({ dueDate: dueDateNDaysAgo(14) }), title: 'A' },
      { ...mk({ dueDate: dueDateNDaysAgo(10) }), title: 'B' },
      { ...mk({ dueDate: dueDateNDaysAgo(5) }), title: 'C' },
      { ...mk({ dueDate: dueDateNDaysAgo(2) }), title: 'D' },
    ]
    const entries = pickOverdueActiveItems(items, TODAY)
    expect(formatOverdueActiveTitlesJa(entries, 2)).toBe('期限超過: A 14日 / B 10日 / 他 2 件')
  })

  it('title 欠落 → "(無題)"', () => {
    const items = [
      { ...mk({ dueDate: dueDateNDaysAgo(7) }), title: null },
      { ...mk({ dueDate: dueDateNDaysAgo(3) }), title: '' },
    ]
    const entries = pickOverdueActiveItems(items, TODAY)
    expect(formatOverdueActiveTitlesJa(entries)).toBe('期限超過: (無題) 7日 / (無題) 3日')
  })

  it('default limit=3', () => {
    const items = [
      { ...mk({ dueDate: dueDateNDaysAgo(14) }), title: 'A' },
      { ...mk({ dueDate: dueDateNDaysAgo(10) }), title: 'B' },
      { ...mk({ dueDate: dueDateNDaysAgo(5) }), title: 'C' },
    ]
    const entries = pickOverdueActiveItems(items, TODAY)
    expect(formatOverdueActiveTitlesJa(entries)).toBe('期限超過: A 14日 / B 10日 / C 5日')
  })
})
