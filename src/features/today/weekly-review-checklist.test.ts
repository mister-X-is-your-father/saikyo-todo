import { describe, expect, it } from 'vitest'

import type { Item } from '@/features/item/schema'

import { buildWeeklyReviewChecklist, classifyWeeklyReviewDue } from './weekly-review-checklist'

const TODAY = '2026-05-19'

function mk(over: Partial<Item> & { id: string }): Item {
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
    waitingFor: null,
    sprintId: null,
    keyResultId: null,
    createdByActorType: 'user',
    createdByActorId: 'u',
    deletedAt: null,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as Item
}

describe('buildWeeklyReviewChecklist', () => {
  it('5 step 全部返す', () => {
    const r = buildWeeklyReviewChecklist({ items: [], today: TODAY })
    expect(r.map((s) => s.step)).toEqual(['collect', 'process', 'organize', 'review', 'engage'])
  })

  it('process: Inbox item (status=todo) を count', () => {
    const r = buildWeeklyReviewChecklist({
      items: [
        mk({ id: '1', status: 'todo' }),
        mk({ id: '2', status: 'todo' }),
        mk({ id: 'done', status: 'todo', doneAt: new Date() }),
      ],
      today: TODAY,
    })
    const process = r.find((s) => s.step === 'process')!
    expect(process.count).toBe(2)
    expect(process.needsAttention).toBe(true)
  })

  it('organize: dueDate / scheduledFor 両 null の active item を count', () => {
    const r = buildWeeklyReviewChecklist({
      items: [
        mk({ id: '1' }), // 両 null
        mk({ id: '2', dueDate: '2026-05-25' }), // dueDate set
        mk({ id: '3', scheduledFor: '2026-05-20' }), // sched set
      ],
      today: TODAY,
    })
    expect(r.find((s) => s.step === 'organize')?.count).toBe(1)
  })

  it('review: Waiting status + waiting_for jsonb + overdue を合算', () => {
    const r = buildWeeklyReviewChecklist({
      items: [
        mk({ id: '1', status: 'gtd_waiting' }),
        mk({
          id: '2',
          waitingFor: {
            kind: 'internal',
            targetUserId: 'u',
            targetLabel: 't',
            requestedAt: TODAY,
          } as unknown as Record<string, unknown>,
        }),
        mk({ id: '3', dueDate: '2026-05-10' }), // overdue
        mk({ id: '4', dueDate: '2026-06-10' }), // future
      ],
      today: TODAY,
    })
    const review = r.find((s) => s.step === 'review')!
    expect(review.count).toBe(3) // 1 + 2 (waiting OR waitingFor) + 3 overdue
  })

  it('engage: Someday item を count', () => {
    const r = buildWeeklyReviewChecklist({
      items: [
        mk({ id: '1', status: 'gtd_someday' }),
        mk({ id: '2', status: 'gtd_someday' }),
        mk({ id: '3', status: 'gtd_next' }),
      ],
      today: TODAY,
    })
    expect(r.find((s) => s.step === 'engage')?.count).toBe(2)
  })

  it('collect は常に needsAttention=true (外部依存、ユーザ判断)', () => {
    const r = buildWeeklyReviewChecklist({ items: [], today: TODAY })
    expect(r[0]?.needsAttention).toBe(true)
  })

  it('archived / deleted item は除外', () => {
    const r = buildWeeklyReviewChecklist({
      items: [
        mk({ id: '1', status: 'todo', archivedAt: new Date() }),
        mk({ id: '2', status: 'todo', deletedAt: new Date() }),
      ],
      today: TODAY,
    })
    expect(r.find((s) => s.step === 'process')?.count).toBe(0)
  })
})

describe('classifyWeeklyReviewDue', () => {
  const NOW = new Date('2026-05-19T12:00:00Z')

  it('lastReviewAt 無し → never-reviewed', () => {
    expect(classifyWeeklyReviewDue({ lastReviewAt: null, now: NOW })).toBe('never-reviewed')
  })

  it('7 日以上経過 → overdue', () => {
    expect(
      classifyWeeklyReviewDue({
        lastReviewAt: new Date('2026-05-10T12:00:00Z'), // 9 days ago
        now: NOW,
      }),
    ).toBe('overdue')
  })

  it('7 日以内 → recent', () => {
    expect(
      classifyWeeklyReviewDue({
        lastReviewAt: new Date('2026-05-15T12:00:00Z'), // 4 days ago
        now: NOW,
      }),
    ).toBe('recent')
  })

  it('境界 7 日ちょうど → recent', () => {
    expect(
      classifyWeeklyReviewDue({
        lastReviewAt: new Date('2026-05-12T12:00:00Z'), // 7 days exactly
        now: NOW,
      }),
    ).toBe('recent')
  })
})
