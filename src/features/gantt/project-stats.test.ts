import { describe, expect, it } from 'vitest'

import type { Item } from '@/features/item/schema'

import { computeProjectStats, type DatedItem } from './project-stats'

function makeItem(overrides: Partial<Item> & { id: string }): Item {
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

function row(item: Item, due: string): DatedItem {
  return { item, due: new Date(`${due}T00:00:00Z`) }
}

describe('computeProjectStats', () => {
  it('baseline 未設定 item は baselineCount に入らない', () => {
    const rows = [row(makeItem({ id: 'a' }), '2026-05-10')]
    expect(computeProjectStats(rows)).toEqual({
      baselineCount: 0,
      slipItemCount: 0,
      totalSlipDays: 0,
    })
  })

  it('baseline ありで slip > 0 なら slipItemCount + totalSlipDays', () => {
    const rows = [
      // due 5/10, baselineEnd 5/05 → 5 日遅延
      row(
        makeItem({
          id: 'late',
          baselineStartDate: '2026-05-01',
          baselineEndDate: '2026-05-05',
        }),
        '2026-05-10',
      ),
    ]
    expect(computeProjectStats(rows)).toEqual({
      baselineCount: 1,
      slipItemCount: 1,
      totalSlipDays: 5,
    })
  })

  it('baseline ありで slip ≤ 0 (前倒し / 計画通り) は slipItemCount に入らない', () => {
    const rows = [
      // due 5/05, baselineEnd 5/10 → -5 (前倒し)
      row(
        makeItem({
          id: 'ahead',
          baselineStartDate: '2026-05-01',
          baselineEndDate: '2026-05-10',
        }),
        '2026-05-05',
      ),
      // due == baselineEnd → 0 日 (計画通り)
      row(
        makeItem({
          id: 'on-plan',
          baselineStartDate: '2026-05-01',
          baselineEndDate: '2026-05-10',
        }),
        '2026-05-10',
      ),
    ]
    expect(computeProjectStats(rows)).toEqual({
      baselineCount: 2,
      slipItemCount: 0,
      totalSlipDays: 0,
    })
  })

  it('複数 item の slip 合算', () => {
    const rows = [
      row(
        makeItem({
          id: 'a',
          baselineStartDate: '2026-05-01',
          baselineEndDate: '2026-05-05',
        }),
        '2026-05-08', // +3
      ),
      row(
        makeItem({
          id: 'b',
          baselineStartDate: '2026-05-01',
          baselineEndDate: '2026-05-05',
        }),
        '2026-05-12', // +7
      ),
      row(
        makeItem({
          id: 'on-plan',
          baselineStartDate: '2026-05-01',
          baselineEndDate: '2026-05-05',
        }),
        '2026-05-05', // 0 → スキップ
      ),
    ]
    expect(computeProjectStats(rows)).toEqual({
      baselineCount: 3,
      slipItemCount: 2,
      totalSlipDays: 10,
    })
  })
})
