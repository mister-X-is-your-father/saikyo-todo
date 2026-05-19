import { describe, expect, it } from 'vitest'

import type { WaitingForState } from './schema'
import { classifyReminderDue, pickReminderTargets } from './waiting-reminder-due'

const NOW = new Date('2026-05-19T12:00:00Z')
const tanaka: WaitingForState = {
  kind: 'internal',
  targetUserId: '11111111-1111-4111-8111-111111111111',
  targetLabel: '田中さん',
  requestedAt: '2026-05-15T09:00:00.000Z', // 4 days ago
  reminderCadenceDays: 3,
}

describe('classifyReminderDue', () => {
  it('cadence 無し → no-cadence', () => {
    const r = classifyReminderDue({ ...tanaka, reminderCadenceDays: null }, NOW)
    expect(r.kind).toBe('no-cadence')
  })

  it('requestedAt + cadence < now + lastReminded 無し → send', () => {
    const r = classifyReminderDue(tanaka, NOW)
    expect(r.kind).toBe('send')
    if (r.kind !== 'send') return
    expect(r.daysElapsed).toBe(4)
  })

  it('lastRemindedAt + cadence > now → too-recent', () => {
    const r = classifyReminderDue(
      { ...tanaka, lastRemindedAt: '2026-05-18T09:00:00.000Z' }, // 1 day ago, cadence 3d → next 2 days later
      NOW,
    )
    expect(r.kind).toBe('too-recent')
    if (r.kind !== 'too-recent') return
    expect(r.nextAt.toISOString()).toBe('2026-05-21T09:00:00.000Z')
  })

  it('lastRemindedAt + cadence < now → send (= cadence 経過後再リマインド)', () => {
    const r = classifyReminderDue(
      { ...tanaka, lastRemindedAt: '2026-05-12T00:00:00.000Z' }, // 7 days ago, cadence 3d → 過ぎてる
      NOW,
    )
    expect(r.kind).toBe('send')
  })

  it('requestedAt + cadence > now + lastReminded 無し → too-recent (= 初回 cadence 未到来)', () => {
    const r = classifyReminderDue(
      {
        ...tanaka,
        requestedAt: '2026-05-18T09:00:00.000Z', // 1 day ago, cadence 3d
      },
      NOW,
    )
    expect(r.kind).toBe('too-recent')
  })
})

describe('pickReminderTargets', () => {
  const items = [
    {
      id: 'due',
      waitingFor: tanaka,
    },
    {
      id: 'no-cadence',
      waitingFor: { ...tanaka, reminderCadenceDays: null } as WaitingForState,
    },
    {
      id: 'too-recent',
      waitingFor: { ...tanaka, lastRemindedAt: '2026-05-18T12:00:00.000Z' } as WaitingForState,
    },
    {
      id: 'not-waiting',
      waitingFor: null,
    },
  ]

  it('send 対象だけ抽出', () => {
    const r = pickReminderTargets(items, NOW)
    expect(r.map((x) => x.item.id)).toEqual(['due'])
    expect(r[0]?.daysElapsed).toBe(4)
  })

  it('空 → 空', () => {
    expect(pickReminderTargets([], NOW)).toEqual([])
  })
})
