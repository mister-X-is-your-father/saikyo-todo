import { describe, expect, it } from 'vitest'

import type { Item, WaitingForState } from './schema'
import { aggregateWaitingList } from './waiting-list-aggregate'

const NOW = new Date('2026-05-19T12:00:00Z')

function mk(over: Partial<Item> & { id: string; waitingFor?: WaitingForState | null }): Item {
  const { waitingFor, ...rest } = over
  return {
    workspaceId: 'ws',
    title: `item ${over.id}`,
    description: '',
    status: 'todo',
    parentPath: '',
    startDate: null,
    dueDate: null,
    dueTime: null,
    scheduledFor: null,
    baselineStartDate: null,
    baselineEndDate: null,
    baselineTakenAt: null,
    priority: 4,
    isMust: false,
    dod: null,
    goal: null,
    position: 'a0',
    customFields: {},
    archivedAt: null,
    doneAt: null,
    startedAt: null,
    completedAt: null,
    waitingFor: (waitingFor ?? null) as unknown as Record<string, unknown> | null,
    sprintId: null,
    keyResultId: null,
    createdByActorType: 'user',
    createdByActorId: 'u',
    deletedAt: null,
    version: 0,
    createdAt: new Date('2026-05-15T00:00:00Z'),
    updatedAt: new Date('2026-05-15T00:00:00Z'),
    ...rest,
  } as Item
}

const tanaka: WaitingForState = {
  kind: 'internal',
  targetUserId: '11111111-1111-4111-8111-111111111111',
  targetLabel: '田中さん',
  requestedAt: '2026-05-17T09:00:00.000Z', // 2 days ago
}

const tanakaOld: WaitingForState = {
  ...tanaka,
  requestedAt: '2026-05-10T09:00:00.000Z', // 9 days ago = longOverdue
}

const sato: WaitingForState = {
  kind: 'internal',
  targetUserId: '22222222-2222-4222-8222-222222222222',
  targetLabel: '佐藤さん',
  requestedAt: '2026-05-16T09:00:00.000Z',
}

const yamada: WaitingForState = {
  kind: 'external',
  targetContactId: '33333333-3333-4333-8333-333333333333',
  targetLabel: '山田さん (Acme)',
  requestedAt: '2026-05-18T09:00:00.000Z', // 1 day ago
  reminderCadenceDays: 3,
}

describe('aggregateWaitingList', () => {
  it('空 items は all 0', () => {
    const r = aggregateWaitingList([], NOW)
    expect(r.internal).toEqual([])
    expect(r.external).toEqual([])
    expect(r.total).toBe(0)
    expect(r.longOverdue).toBe(0)
  })

  it('waitingFor 無い item は無視', () => {
    const r = aggregateWaitingList([mk({ id: 'a' })], NOW)
    expect(r.total).toBe(0)
  })

  it('done / archived / deleted は active 集合から除外', () => {
    const r = aggregateWaitingList(
      [
        mk({ id: 'a', waitingFor: tanaka, doneAt: new Date() }),
        mk({ id: 'b', waitingFor: tanaka, archivedAt: new Date() }),
        mk({ id: 'c', waitingFor: tanaka, deletedAt: new Date() }),
        mk({ id: 'd', waitingFor: tanaka }),
      ],
      NOW,
    )
    expect(r.total).toBe(1)
    expect(r.internal[0]?.rows[0]?.item.id).toBe('d')
  })

  it('internal / external に分離、同 target はまとめる', () => {
    const r = aggregateWaitingList(
      [
        mk({ id: 'a', waitingFor: tanaka }),
        mk({ id: 'b', waitingFor: tanaka }),
        mk({ id: 'c', waitingFor: sato }),
        mk({ id: 'd', waitingFor: yamada }),
      ],
      NOW,
    )
    expect(r.total).toBe(4)
    expect(r.internal).toHaveLength(2)
    const tanakaGroup = r.internal.find((g) => g.targetLabel === '田中さん')!
    expect(tanakaGroup.rows.map((row) => row.item.id).sort()).toEqual(['a', 'b'])
    expect(r.external).toHaveLength(1)
    expect(r.external[0]?.rows[0]?.item.id).toBe('d')
  })

  it('group 内は経過日数降順 (古い依頼が上)', () => {
    const r = aggregateWaitingList(
      [
        mk({ id: 'new', waitingFor: tanaka }), // 2 days
        mk({ id: 'old', waitingFor: tanakaOld }), // 9 days
      ],
      NOW,
    )
    const tanakaGroup = r.internal.find((g) => g.targetLabel === '田中さん')!
    expect(tanakaGroup.rows.map((r) => r.item.id)).toEqual(['old', 'new'])
  })

  it('longOverdue: 7 日以上経過 row の count', () => {
    const r = aggregateWaitingList(
      [
        mk({ id: 'old1', waitingFor: tanakaOld }), // 9 d
        mk({ id: 'old2', waitingFor: { ...sato, requestedAt: '2026-05-11T09:00:00.000Z' } }), // 8 d
        mk({ id: 'new', waitingFor: tanaka }), // 2 d
      ],
      NOW,
    )
    expect(r.longOverdue).toBe(2)
    expect(r.total).toBe(3)
  })

  it('nextReminderAt: lastRemindedAt あれば +cadence、無ければ requestedAt+cadence', () => {
    const r = aggregateWaitingList(
      [
        mk({
          id: 'never-reminded',
          waitingFor: {
            ...yamada,
            requestedAt: '2026-05-18T09:00:00.000Z',
            reminderCadenceDays: 3,
          },
        }),
        mk({
          id: 'reminded',
          waitingFor: {
            ...yamada,
            requestedAt: '2026-05-10T09:00:00.000Z',
            reminderCadenceDays: 3,
            lastRemindedAt: '2026-05-15T09:00:00.000Z',
          },
        }),
      ],
      NOW,
    )
    // 1 group になる (同 yamada)
    const yamadaGroup = r.external.find((g) => g.targetLabel === '山田さん (Acme)')!
    const neverReminded = yamadaGroup.rows.find((r) => r.item.id === 'never-reminded')!
    expect(neverReminded.nextReminderAt?.toISOString()).toBe('2026-05-21T09:00:00.000Z')
    const reminded = yamadaGroup.rows.find((r) => r.item.id === 'reminded')!
    expect(reminded.nextReminderAt?.toISOString()).toBe('2026-05-18T09:00:00.000Z')
  })

  it('reminderCadenceDays 無し → nextReminderAt は null', () => {
    const r = aggregateWaitingList([mk({ id: 'no-cadence', waitingFor: tanaka })], NOW)
    expect(r.internal[0]?.rows[0]?.nextReminderAt).toBeNull()
  })

  it('group 順: max daysElapsed 降順 (古い依頼を持つ group 上)', () => {
    const r = aggregateWaitingList(
      [
        mk({ id: 'sato', waitingFor: sato }), // 3 d
        mk({ id: 'tanakaOld', waitingFor: tanakaOld }), // 9 d
      ],
      NOW,
    )
    expect(r.internal.map((g) => g.targetLabel)).toEqual(['田中さん', '佐藤さん'])
  })
})
