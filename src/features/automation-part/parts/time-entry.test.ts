/**
 * iter597 ai-automation: time_entry.* part の input schema 単体テスト。
 *
 * part.run() は timeEntryService 経由で実 Supabase を叩くため、本 file は input
 * schema の validation のみを検証 (= service / repository は別 test で網羅済)。
 */
import { describe, expect, it } from 'vitest'

import { timeEntryCreatePart } from './time-entry'

const validId = '01234567-89ab-4123-89ab-0123456789ab'

describe('timeEntryCreatePart input schema', () => {
  it('最小 (workDate + category + durationMinutes + idempotencyKey) で valid', () => {
    const r = timeEntryCreatePart.input.safeParse({
      workDate: '2026-05-01',
      category: 'dev',
      durationMinutes: 60,
      idempotencyKey: validId,
    })
    expect(r.success).toBe(true)
  })

  it('itemId 紐付けあり / description 込みで valid', () => {
    const r = timeEntryCreatePart.input.safeParse({
      itemId: validId,
      workDate: '2026-05-01',
      category: 'meeting',
      description: 'スプリント計画',
      durationMinutes: 90,
      idempotencyKey: validId,
    })
    expect(r.success).toBe(true)
  })

  it('workDate が ISO date 不正 → invalid', () => {
    const r = timeEntryCreatePart.input.safeParse({
      workDate: '2026/05/01',
      category: 'dev',
      durationMinutes: 60,
      idempotencyKey: validId,
    })
    expect(r.success).toBe(false)
  })

  it('category が enum 外 → invalid', () => {
    const r = timeEntryCreatePart.input.safeParse({
      workDate: '2026-05-01',
      category: 'bogus',
      durationMinutes: 60,
      idempotencyKey: validId,
    })
    expect(r.success).toBe(false)
  })

  it('durationMinutes 0 / 1441 / 非整数 → invalid', () => {
    expect(
      timeEntryCreatePart.input.safeParse({
        workDate: '2026-05-01',
        category: 'dev',
        durationMinutes: 0,
        idempotencyKey: validId,
      }).success,
    ).toBe(false)
    expect(
      timeEntryCreatePart.input.safeParse({
        workDate: '2026-05-01',
        category: 'dev',
        durationMinutes: 24 * 60 + 1,
        idempotencyKey: validId,
      }).success,
    ).toBe(false)
    expect(
      timeEntryCreatePart.input.safeParse({
        workDate: '2026-05-01',
        category: 'dev',
        durationMinutes: 30.5,
        idempotencyKey: validId,
      }).success,
    ).toBe(false)
  })

  it('description 2001 文字 → invalid (max 2000)', () => {
    const r = timeEntryCreatePart.input.safeParse({
      workDate: '2026-05-01',
      category: 'dev',
      description: 'a'.repeat(2001),
      durationMinutes: 60,
      idempotencyKey: validId,
    })
    expect(r.success).toBe(false)
  })

  it('idempotencyKey が uuid 不正 → invalid', () => {
    const r = timeEntryCreatePart.input.safeParse({
      workDate: '2026-05-01',
      category: 'dev',
      durationMinutes: 60,
      idempotencyKey: 'bogus',
    })
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect / category', () => {
    expect(timeEntryCreatePart.id).toBe('time_entry.create')
    expect(timeEntryCreatePart.sideEffect).toBe('write')
    expect(timeEntryCreatePart.category).toBe('time')
  })
})
