/**
 * today-board-summary pure helper の単体 test。
 *
 * 観点:
 *  - overdue: dueDate < today + active のみ、overdueDays 降順、top N で切れる
 *  - mustToday: isMust + dueDate=today + active、time 昇順
 *  - dueToday: dueDate=today + active superset (mustToday を含む)
 *  - doneIn24h: doneAt が now-24h 内、新しい順
 *  - active filter: doneAt / archivedAt / status='done'/'cancelled' は除外
 */
import { describe, expect, it } from 'vitest'

import { buildTodayBoardSummary, type TodayBoardItemFields } from './today-board-summary'

const NOW = new Date('2026-04-30T10:00:00+09:00')

interface Sample extends TodayBoardItemFields {
  id: string
  title: string
}

function mk(over: Partial<Sample>): Sample {
  return {
    id: over.id ?? 'i',
    title: over.title ?? '',
    status: over.status ?? 'todo',
    dueDate: over.dueDate ?? null,
    dueTime: over.dueTime ?? null,
    doneAt: over.doneAt ?? null,
    archivedAt: over.archivedAt ?? null,
    isMust: over.isMust ?? false,
    priority: over.priority ?? 3,
    createdAt: over.createdAt ?? null,
  }
}

describe('buildTodayBoardSummary', () => {
  it('空配列なら全 panel total=0', () => {
    const out = buildTodayBoardSummary([], NOW)
    expect(out.overdue.total).toBe(0)
    expect(out.mustToday.total).toBe(0)
    expect(out.dueToday.total).toBe(0)
    expect(out.doneIn24h.total).toBe(0)
  })

  it('overdue は dueDate < today + active のみ、overdueDays 降順 + top N', () => {
    const items: Sample[] = [
      mk({ id: '1', dueDate: '2026-04-29' }), // 1 日前
      mk({ id: '2', dueDate: '2026-04-25' }), // 5 日前
      mk({ id: '3', dueDate: '2026-04-15' }), // 15 日前
      mk({ id: '4', dueDate: '2026-04-30' }), // today (overdue ではない)
      mk({ id: '5', dueDate: '2026-04-20', doneAt: NOW }), // 完了済 → 除外
      mk({ id: '6', dueDate: '2026-04-20', status: 'cancelled' }), // 除外
    ]
    const out = buildTodayBoardSummary(items, NOW, { topLimit: 2 })
    expect(out.overdue.total).toBe(3)
    expect(out.overdue.top.map((e) => e.item.id)).toEqual(['3', '2'])
    expect(out.overdue.top[0]!.overdueDays).toBe(15)
  })

  it('mustToday は isMust + dueDate=today + active のみ', () => {
    const items: Sample[] = [
      mk({ id: 'm1', dueDate: '2026-04-30', isMust: true }),
      mk({ id: 'm2', dueDate: '2026-04-30', isMust: false }), // 除外 (must で無い)
      mk({ id: 'm3', dueDate: '2026-04-29', isMust: true }), // 除外 (today で無い)
      mk({ id: 'm4', dueDate: '2026-04-30', isMust: true, doneAt: NOW }), // 除外 (done)
    ]
    const out = buildTodayBoardSummary(items, NOW)
    expect(out.mustToday.total).toBe(1)
    expect(out.mustToday.top[0]!.id).toBe('m1')
  })

  it('dueToday は mustToday の superset (isMust に関係なく today)', () => {
    const items: Sample[] = [
      mk({ id: 'a', dueDate: '2026-04-30', isMust: true, dueTime: '10:30' }),
      mk({ id: 'b', dueDate: '2026-04-30', isMust: false, dueTime: '09:00' }),
      mk({ id: 'c', dueDate: '2026-04-30', isMust: false, dueTime: null }),
    ]
    const out = buildTodayBoardSummary(items, NOW)
    expect(out.dueToday.total).toBe(3)
    // dueTime 昇順 + 未指定は末尾
    expect(out.dueToday.top.map((i) => i.id)).toEqual(['b', 'a', 'c'])
    expect(out.mustToday.total).toBe(1)
    expect(out.mustToday.top[0]!.id).toBe('a')
  })

  it('doneIn24h は doneAt が now-24h 内、新しい順、top N', () => {
    const items: Sample[] = [
      mk({ id: 'd1', doneAt: new Date(NOW.getTime() - 1 * 60 * 60 * 1000), priority: 2 }),
      mk({ id: 'd2', doneAt: new Date(NOW.getTime() - 5 * 60 * 60 * 1000), priority: 1 }),
      mk({ id: 'd3', doneAt: new Date(NOW.getTime() - 30 * 60 * 60 * 1000) }), // 30h 前 → 除外
      mk({ id: 'd4', doneAt: new Date(NOW.getTime() - 12 * 60 * 60 * 1000), priority: 3 }),
    ]
    const out = buildTodayBoardSummary(items, NOW, { topLimit: 2 })
    expect(out.doneIn24h.total).toBe(3)
    expect(out.doneIn24h.top.map((i) => i.id)).toEqual(['d1', 'd2'])
  })

  it('archivedAt 済 / status=done は overdue / dueToday から除外', () => {
    const items: Sample[] = [
      mk({ id: 'x', dueDate: '2026-04-30', archivedAt: NOW }),
      mk({ id: 'y', dueDate: '2026-04-30', status: 'done' }),
      mk({ id: 'z', dueDate: '2026-04-30', status: 'in_progress' }),
    ]
    const out = buildTodayBoardSummary(items, NOW)
    expect(out.dueToday.total).toBe(1)
    expect(out.dueToday.top[0]!.id).toBe('z')
  })

  it('topLimit のデフォルトは 3', () => {
    const items: Sample[] = Array.from({ length: 5 }, (_, i) =>
      mk({ id: `o${i}`, dueDate: `2026-04-${20 - i}` }),
    )
    const out = buildTodayBoardSummary(items, NOW)
    expect(out.overdue.total).toBe(5)
    expect(out.overdue.top).toHaveLength(3)
  })

  it('dueDate 不正 ISO は黙って除外', () => {
    const items: Sample[] = [
      mk({ id: 'bad1', dueDate: 'not-a-date' }),
      mk({ id: 'bad2', dueDate: '2026/04/30' }),
      mk({ id: 'ok', dueDate: '2026-04-30' }),
    ]
    const out = buildTodayBoardSummary(items, NOW)
    expect(out.dueToday.total).toBe(1)
    expect(out.dueToday.top[0]!.id).toBe('ok')
  })
})
