import { describe, expect, it } from 'vitest'

import { summarizeDiff } from './diff-summary'
import type { Schedule } from './schema'

function mkSchedule(opts: {
  id?: string
  itemId: string | null
  kind: 'planned' | 'actual'
  startMin: number
  durMin: number
}): Schedule {
  const start = new Date('2026-04-30T09:00:00.000Z')
  start.setUTCMinutes(start.getUTCMinutes() + opts.startMin)
  const end = new Date(start.getTime() + opts.durMin * 60 * 1000)
  return {
    id: opts.id ?? crypto.randomUUID(),
    workspaceId: '00000000-0000-0000-0000-000000000000',
    itemId: opts.itemId,
    kind: opts.kind,
    startAt: start,
    endAt: end,
    note: null,
    createdBy: '00000000-0000-0000-0000-000000000001',
    deletedAt: null,
    version: 0,
    createdAt: start,
    updatedAt: start,
  }
}

describe('summarizeDiff', () => {
  it('aggregates planned and actual per item', () => {
    const A = '11111111-1111-1111-1111-111111111111'
    const rows = summarizeDiff([
      mkSchedule({ itemId: A, kind: 'planned', startMin: 0, durMin: 60 }),
      mkSchedule({ itemId: A, kind: 'actual', startMin: 60, durMin: 90 }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.itemId).toBe(A)
    expect(rows[0]?.plannedMinutes).toBe(60)
    expect(rows[0]?.actualMinutes).toBe(90)
    expect(rows[0]?.deltaMinutes).toBe(30)
    expect(rows[0]?.severity).toBe('warn')
  })

  it('marks ok when actual within 110% of planned', () => {
    const A = '22222222-2222-2222-2222-222222222222'
    const rows = summarizeDiff([
      mkSchedule({ itemId: A, kind: 'planned', startMin: 0, durMin: 60 }),
      mkSchedule({ itemId: A, kind: 'actual', startMin: 60, durMin: 65 }),
    ])
    expect(rows[0]?.severity).toBe('ok')
  })

  it('marks danger when actual exceeds 150% of planned', () => {
    const A = '33333333-3333-3333-3333-333333333333'
    const rows = summarizeDiff([
      mkSchedule({ itemId: A, kind: 'planned', startMin: 0, durMin: 60 }),
      mkSchedule({ itemId: A, kind: 'actual', startMin: 60, durMin: 120 }),
    ])
    expect(rows[0]?.severity).toBe('danger')
  })

  it('marks not_done when planned exists but actual is 0', () => {
    const A = '44444444-4444-4444-4444-444444444444'
    const rows = summarizeDiff([
      mkSchedule({ itemId: A, kind: 'planned', startMin: 0, durMin: 60 }),
    ])
    expect(rows[0]?.severity).toBe('not_done')
    expect(rows[0]?.actualMinutes).toBe(0)
  })

  it('groups null-item actuals as interrupt and pushes to end', () => {
    const A = '55555555-5555-5555-5555-555555555555'
    const rows = summarizeDiff([
      mkSchedule({ itemId: null, kind: 'actual', startMin: 0, durMin: 30 }),
      mkSchedule({ itemId: A, kind: 'planned', startMin: 30, durMin: 60 }),
      mkSchedule({ itemId: A, kind: 'actual', startMin: 90, durMin: 60 }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.itemId).toBe(A)
    expect(rows[1]?.itemId).toBeNull()
    expect(rows[1]?.severity).toBe('interrupt')
    expect(rows[1]?.actualMinutes).toBe(30)
  })

  it('sums multiple slots of the same kind for one item', () => {
    const A = '66666666-6666-6666-6666-666666666666'
    const rows = summarizeDiff([
      mkSchedule({ itemId: A, kind: 'planned', startMin: 0, durMin: 30 }),
      mkSchedule({ itemId: A, kind: 'planned', startMin: 60, durMin: 30 }),
      mkSchedule({ itemId: A, kind: 'actual', startMin: 30, durMin: 30 }),
    ])
    expect(rows[0]?.plannedMinutes).toBe(60)
    expect(rows[0]?.actualMinutes).toBe(30)
    expect(rows[0]?.deltaMinutes).toBe(-30)
  })

  it('handles actual-only (no planned) as warn', () => {
    const A = '77777777-7777-7777-7777-777777777777'
    const rows = summarizeDiff([mkSchedule({ itemId: A, kind: 'actual', startMin: 0, durMin: 45 })])
    expect(rows[0]?.plannedMinutes).toBe(0)
    expect(rows[0]?.actualMinutes).toBe(45)
    expect(rows[0]?.severity).toBe('warn')
    expect(rows[0]?.ratio).toBe(Number.POSITIVE_INFINITY)
  })
})
