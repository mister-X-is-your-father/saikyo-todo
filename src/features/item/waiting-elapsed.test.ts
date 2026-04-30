import { describe, expect, it } from 'vitest'

import {
  elapsedWaitingDays,
  formatWaitingStatusJa,
  nextReminderInDays,
  waitingElapsedSeverity,
  type WaitingItemFields,
} from './waiting-elapsed'

const NOW = new Date('2026-04-30T12:00:00Z')

function days(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)
}

describe('elapsedWaitingDays', () => {
  it('5 日前の依頼 → 5', () => {
    expect(elapsedWaitingDays({ requestedAt: days(5) }, NOW)).toBe(5)
  })

  it('null requestedAt → null', () => {
    expect(elapsedWaitingDays({}, NOW)).toBeNull()
  })

  it('未来 requestedAt は 0 clamp', () => {
    const future = new Date(NOW.getTime() + 24 * 60 * 60 * 1000)
    expect(elapsedWaitingDays({ requestedAt: future }, NOW)).toBe(0)
  })

  it('string ISO 受理', () => {
    expect(elapsedWaitingDays({ requestedAt: '2026-04-25T12:00:00Z' }, NOW)).toBe(5)
  })
})

describe('waitingElapsedSeverity', () => {
  it('null → muted', () => {
    expect(waitingElapsedSeverity(null)).toBe('muted')
  })
  it('< 3 days → ok', () => {
    expect(waitingElapsedSeverity(0)).toBe('ok')
    expect(waitingElapsedSeverity(2)).toBe('ok')
  })
  it('3-6 days → warn', () => {
    expect(waitingElapsedSeverity(3)).toBe('warn')
    expect(waitingElapsedSeverity(6)).toBe('warn')
  })
  it('>= 7 days → danger', () => {
    expect(waitingElapsedSeverity(7)).toBe('danger')
    expect(waitingElapsedSeverity(30)).toBe('danger')
  })
})

describe('nextReminderInDays', () => {
  it('cadence null → null (= リマインド OFF)', () => {
    expect(nextReminderInDays({ requestedAt: days(2) }, NOW)).toBeNull()
  })

  it('lastRemindedAt null + cadence あり → cadence days (初回)', () => {
    expect(nextReminderInDays({ requestedAt: days(2), reminderCadenceDays: 3 }, NOW)).toBe(3)
  })

  it('lastRemindedAt 2 日前 + cadence 3 → 1 日後', () => {
    expect(
      nextReminderInDays(
        { requestedAt: days(5), lastRemindedAt: days(2), reminderCadenceDays: 3 },
        NOW,
      ),
    ).toBe(1)
  })

  it('cadence 経過 → 0 (即リマインド時期)', () => {
    expect(
      nextReminderInDays(
        { requestedAt: days(10), lastRemindedAt: days(5), reminderCadenceDays: 3 },
        NOW,
      ),
    ).toBe(0)
  })

  it('cadence 0 / 負値 → null (= 設定不正、無効)', () => {
    expect(nextReminderInDays({ requestedAt: days(2), reminderCadenceDays: 0 }, NOW)).toBeNull()
    expect(nextReminderInDays({ requestedAt: days(2), reminderCadenceDays: -1 }, NOW)).toBeNull()
  })
})

describe('formatWaitingStatusJa', () => {
  it('null requestedAt → "依頼日不明"', () => {
    expect(formatWaitingStatusJa({}, NOW)).toBe('依頼日不明')
  })

  it('5 日経過 + cadence 3 + last 2d 前 → 「次リマインド 1 日後」', () => {
    const item: WaitingItemFields = {
      requestedAt: days(5),
      lastRemindedAt: days(2),
      reminderCadenceDays: 3,
    }
    expect(formatWaitingStatusJa(item, NOW)).toBe('依頼から 5 日経過 (次リマインド 1 日後)')
  })

  it('cadence 経過 → "リマインド時期"', () => {
    const item: WaitingItemFields = {
      requestedAt: days(10),
      lastRemindedAt: days(5),
      reminderCadenceDays: 3,
    }
    expect(formatWaitingStatusJa(item, NOW)).toBe('依頼から 10 日経過 (リマインド時期)')
  })

  it('7 日以上 → escalate hint', () => {
    expect(formatWaitingStatusJa({ requestedAt: days(8) }, NOW)).toBe(
      '依頼から 8 日経過 (escalate 検討)',
    )
  })

  it('cadence なし + 1 日経過', () => {
    expect(formatWaitingStatusJa({ requestedAt: days(1) }, NOW)).toBe('依頼から 1 日経過')
  })
})
