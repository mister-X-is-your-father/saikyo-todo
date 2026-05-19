import { describe, expect, it } from 'vitest'

import {
  classifyWaitingHint,
  elapsedWaitingDays,
  formatOldestWaitingDaysJa,
  formatWaitingHintJa,
  formatWaitingStatusJa,
  formatWaitingSummaryJa,
  nextReminderInDays,
  pickOldestWaitingItem,
  summarizeWaitingItems,
  waitingElapsedSeverity,
  type WaitingItemFields,
  type WaitingSummary,
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

describe('summarizeWaitingItems', () => {
  it('空 → 全 0、oldestDays null', () => {
    const r = summarizeWaitingItems([], NOW)
    expect(r.total).toBe(0)
    expect(r.bySeverity).toEqual({ ok: 0, warn: 0, danger: 0, muted: 0 })
    expect(r.oldestDays).toBeNull()
    expect(r.dueRemindCount).toBe(0)
  })

  it('混在: severity 別件数 + oldestDays', () => {
    const r = summarizeWaitingItems(
      [
        { requestedAt: days(1) }, // ok
        { requestedAt: days(4) }, // warn
        { requestedAt: days(10) }, // danger
        { requestedAt: days(12) }, // danger
        { requestedAt: null }, // muted
      ],
      NOW,
    )
    expect(r.total).toBe(5)
    expect(r.bySeverity).toEqual({ ok: 1, warn: 1, danger: 2, muted: 1 })
    expect(r.oldestDays).toBe(12)
  })

  it('dueRemindCount: nextReminderInDays === 0 を数える', () => {
    const r = summarizeWaitingItems(
      [
        // lastRemindedAt が cadence 超過 = nxt 0 (リマインド時期)
        { requestedAt: days(5), lastRemindedAt: days(10), reminderCadenceDays: 3 },
        // not yet, cadence 中 = nxt > 0
        { requestedAt: days(2), lastRemindedAt: days(1), reminderCadenceDays: 5 },
      ],
      NOW,
    )
    expect(r.dueRemindCount).toBe(1)
  })
})

describe('formatWaitingSummaryJa', () => {
  it('total 0 → 「連絡待ちなし」', () => {
    expect(
      formatWaitingSummaryJa({
        total: 0,
        bySeverity: { ok: 0, warn: 0, danger: 0, muted: 0 },
        oldestDays: null,
        dueRemindCount: 0,
      }),
    ).toBe('連絡待ちなし')
  })

  it('escalate あり → 「連絡待ち N 件 (escalate Y、最長 D 日)」', () => {
    expect(
      formatWaitingSummaryJa({
        total: 5,
        bySeverity: { ok: 1, warn: 1, danger: 2, muted: 1 },
        oldestDays: 12,
        dueRemindCount: 3,
      }),
    ).toBe('連絡待ち 5 件 (escalate 2、最長 12 日)')
  })

  it('escalate なし + リマインド推奨 → 「連絡待ち N 件 (リマインド推奨 X)」', () => {
    expect(
      formatWaitingSummaryJa({
        total: 3,
        bySeverity: { ok: 1, warn: 2, danger: 0, muted: 0 },
        oldestDays: 4,
        dueRemindCount: 2,
      }),
    ).toBe('連絡待ち 3 件 (リマインド推奨 2)')
  })

  it('健全のみ → 「連絡待ち N 件」', () => {
    expect(
      formatWaitingSummaryJa({
        total: 1,
        bySeverity: { ok: 1, warn: 0, danger: 0, muted: 0 },
        oldestDays: 1,
        dueRemindCount: 0,
      }),
    ).toBe('連絡待ち 1 件')
  })
})

describe('classifyWaitingHint', () => {
  function summary(over: Partial<WaitingSummary>): WaitingSummary {
    return {
      total: 0,
      bySeverity: { ok: 0, warn: 0, danger: 0, muted: 0 },
      oldestDays: null,
      dueRemindCount: 0,
      ...over,
    }
  }

  it('total 0 → idle', () => {
    expect(classifyWaitingHint(summary({}))).toBe('idle')
  })

  it('danger >= 3 → severe', () => {
    expect(
      classifyWaitingHint(
        summary({ total: 3, bySeverity: { ok: 0, warn: 0, danger: 3, muted: 0 } }),
      ),
    ).toBe('severe')
  })

  it('oldestDays >= 14 → severe', () => {
    expect(
      classifyWaitingHint(
        summary({
          total: 1,
          bySeverity: { ok: 1, warn: 0, danger: 0, muted: 0 },
          oldestDays: 14,
        }),
      ),
    ).toBe('severe')
  })

  it('danger 1 件 → moderate', () => {
    expect(
      classifyWaitingHint(
        summary({ total: 1, bySeverity: { ok: 0, warn: 0, danger: 1, muted: 0 } }),
      ),
    ).toBe('moderate')
  })

  it('dueRemindCount >= 1 → moderate', () => {
    expect(
      classifyWaitingHint(
        summary({
          total: 2,
          bySeverity: { ok: 1, warn: 1, danger: 0, muted: 0 },
          dueRemindCount: 1,
        }),
      ),
    ).toBe('moderate')
  })

  it('健全 → mild', () => {
    expect(
      classifyWaitingHint(
        summary({ total: 1, bySeverity: { ok: 1, warn: 0, danger: 0, muted: 0 } }),
      ),
    ).toBe('mild')
  })
})

describe('pickOldestWaitingItem', () => {
  it('空 → null', () => {
    expect(pickOldestWaitingItem([], NOW)).toBeNull()
  })

  it('全 requestedAt null → null', () => {
    expect(
      pickOldestWaitingItem([{ requestedAt: null }, { requestedAt: undefined }], NOW),
    ).toBeNull()
  })

  it('最大 days を 1 件抽出 + severity bind', () => {
    const items = [
      { id: 'a', requestedAt: days(2) }, // 2d ok
      { id: 'b', requestedAt: days(10) }, // 10d danger
      { id: 'c', requestedAt: days(5) }, // 5d warn
    ]
    const r = pickOldestWaitingItem(items, NOW)
    expect(r?.item.id).toBe('b')
    expect(r?.days).toBe(10)
    expect(r?.severity).toBe('danger')
  })

  it('null requestedAt は除外して比較', () => {
    const items = [
      { id: 'a', requestedAt: null },
      { id: 'b', requestedAt: days(4) },
    ]
    expect(pickOldestWaitingItem(items, NOW)?.item.id).toBe('b')
  })

  it('同 days は insertion order 先頭 (deterministic)', () => {
    const items = [
      { id: 'first', requestedAt: days(5) },
      { id: 'second', requestedAt: days(5) },
    ]
    expect(pickOldestWaitingItem(items, NOW)?.item.id).toBe('first')
  })
})

describe('formatOldestWaitingDaysJa', () => {
  it('null → 「なし」', () => {
    expect(formatOldestWaitingDaysJa(null)).toBe('なし')
  })

  it('< 7d → escalate hint なし', () => {
    expect(formatOldestWaitingDaysJa({ days: 3 })).toBe('最古: 3 日経過')
  })

  it('>= 7d → escalate hint 付与', () => {
    expect(formatOldestWaitingDaysJa({ days: 12 })).toBe('最古: 12 日経過 (escalate 検討)')
  })

  it('境界 (7d ぴったり) も escalate hint 付与', () => {
    expect(formatOldestWaitingDaysJa({ days: 7 })).toBe('最古: 7 日経過 (escalate 検討)')
  })
})

describe('formatWaitingHintJa', () => {
  function summary(over: Partial<WaitingSummary>): WaitingSummary {
    return {
      total: 0,
      bySeverity: { ok: 0, warn: 0, danger: 0, muted: 0 },
      oldestDays: null,
      dueRemindCount: 0,
      ...over,
    }
  }

  it('idle / mild / moderate / severe を 1 単語で返す', () => {
    expect(formatWaitingHintJa(summary({}))).toBe('連絡待ちなし')
    expect(
      formatWaitingHintJa(
        summary({ total: 1, bySeverity: { ok: 1, warn: 0, danger: 0, muted: 0 } }),
      ),
    ).toBe('進行中')
    expect(
      formatWaitingHintJa(
        summary({ total: 1, bySeverity: { ok: 0, warn: 0, danger: 1, muted: 0 } }),
      ),
    ).toBe('注意')
    expect(
      formatWaitingHintJa(
        summary({ total: 3, bySeverity: { ok: 0, warn: 0, danger: 3, muted: 0 } }),
      ),
    ).toBe('異常')
  })
})
