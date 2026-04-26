import { describe, expect, it } from 'vitest'

import type { Item } from '@/features/item/schema'

import { buildTodayGroups, shiftISO } from './build-groups'

const TODAY = '2026-04-27'

function makeItem(overrides: Partial<Item> & { id: string }): Item {
  // 必要最小限の Item shape — 残りは any cast で埋める
  return {
    workspaceId: 'ws',
    title: overrides.id,
    description: '',
    status: 'todo',
    priority: 4,
    parentPath: '',
    isMust: false,
    dod: null,
    position: 'a0',
    customFields: {},
    archivedAt: null,
    doneAt: null,
    sprintId: null,
    keyResultId: null,
    startDate: null,
    dueDate: null,
    dueTime: null,
    scheduledFor: null,
    baselineStartDate: null,
    baselineEndDate: null,
    baselineTakenAt: null,
    createdByActorType: 'user',
    createdByActorId: '00000000-0000-0000-0000-000000000000',
    deletedAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Item
}

describe('buildTodayGroups', () => {
  it('期限超過 / 今日 / 明日 / 今週内 の 4 group に正しく分類する', () => {
    const items = [
      makeItem({ id: 'overdue', dueDate: shiftISO(TODAY, -3) }),
      makeItem({ id: 'today', dueDate: TODAY }),
      makeItem({ id: 'tomorrow', dueDate: shiftISO(TODAY, 1) }),
      makeItem({ id: 'thisweek', dueDate: shiftISO(TODAY, 4) }),
      makeItem({ id: 'far_future', dueDate: shiftISO(TODAY, 10) }), // 表示対象外
    ]
    const groups = buildTodayGroups(items, TODAY)
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['overdue'])
    expect(groups[1]!.items.map((i) => i.id)).toEqual(['today'])
    expect(groups[2]!.items.map((i) => i.id)).toEqual(['tomorrow'])
    expect(groups[3]!.items.map((i) => i.id)).toEqual(['thisweek'])
  })

  it('doneAt あり item は全 group から除外', () => {
    const items = [
      makeItem({ id: 'overdue-done', dueDate: shiftISO(TODAY, -1), doneAt: new Date() }),
      makeItem({ id: 'today-done', dueDate: TODAY, doneAt: new Date() }),
    ]
    const groups = buildTodayGroups(items, TODAY)
    for (const g of groups) expect(g.items.length).toBe(0)
  })

  it('priority 昇順でソート (1=最高 → 4=最低)', () => {
    const items = [
      makeItem({ id: 'a-p4', dueDate: TODAY, priority: 4 }),
      makeItem({ id: 'b-p1', dueDate: TODAY, priority: 1 }),
      makeItem({ id: 'c-p2', dueDate: TODAY, priority: 2 }),
    ]
    const groups = buildTodayGroups(items, TODAY)
    expect(groups[1]!.items.map((i) => i.id)).toEqual(['b-p1', 'c-p2', 'a-p4'])
  })

  it('scheduledFor も dueDate と同じ扱いで bucket 振り分け', () => {
    const items = [
      makeItem({ id: 'sched-today', scheduledFor: TODAY }),
      makeItem({ id: 'sched-tomorrow', scheduledFor: shiftISO(TODAY, 1) }),
    ]
    const groups = buildTodayGroups(items, TODAY)
    expect(groups[1]!.items.map((i) => i.id)).toEqual(['sched-today'])
    expect(groups[2]!.items.map((i) => i.id)).toEqual(['sched-tomorrow'])
  })
})
