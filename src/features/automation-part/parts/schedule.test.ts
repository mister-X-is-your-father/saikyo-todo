/**
 * iter589 ai-automation: schedule.* part の input schema 単体テスト。
 *
 * part.run() は scheduleService 経由で実 Supabase を叩くため、本 file は input
 * schema の validation のみを検証 (= service / repository は別 test で網羅済)。
 */
import { describe, expect, it } from 'vitest'

import { scheduleCreatePart, scheduleStartTimerPart } from './schedule'

const validId = '01234567-89ab-4123-89ab-0123456789ab'

describe('scheduleCreatePart input schema', () => {
  it('最小 (planned + itemId + startAt/endAt) で valid', () => {
    const r = scheduleCreatePart.input.safeParse({
      itemId: validId,
      kind: 'planned',
      startAt: '2026-05-01T10:00:00Z',
      endAt: '2026-05-01T11:00:00Z',
    })
    expect(r.success).toBe(true)
  })

  it('actual + itemId なし (=自由計測) で valid', () => {
    const r = scheduleCreatePart.input.safeParse({
      itemId: null,
      kind: 'actual',
      startAt: '2026-05-01T10:00:00Z',
      endAt: '2026-05-01T11:00:00Z',
    })
    expect(r.success).toBe(true)
  })

  it('kind が enum 外 → invalid', () => {
    const r = scheduleCreatePart.input.safeParse({
      itemId: validId,
      kind: 'bogus',
      startAt: '2026-05-01T10:00:00Z',
      endAt: '2026-05-01T11:00:00Z',
    })
    expect(r.success).toBe(false)
  })

  it('startAt が ISO 不正 → invalid', () => {
    const r = scheduleCreatePart.input.safeParse({
      itemId: validId,
      kind: 'planned',
      startAt: 'not-a-date',
      endAt: '2026-05-01T11:00:00Z',
    })
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect / category', () => {
    expect(scheduleCreatePart.id).toBe('schedule.create')
    expect(scheduleCreatePart.sideEffect).toBe('write')
    expect(scheduleCreatePart.category).toBe('schedule')
  })
})

describe('scheduleStartTimerPart input schema', () => {
  it('itemId=null (=自由計測) で valid (startAt 省略可)', () => {
    const r = scheduleStartTimerPart.input.safeParse({ itemId: null })
    expect(r.success).toBe(true)
  })

  it('itemId=uuid + startAt 指定で valid', () => {
    const r = scheduleStartTimerPart.input.safeParse({
      itemId: validId,
      startAt: '2026-05-01T10:00:00Z',
    })
    expect(r.success).toBe(true)
  })

  it('itemId が undefined → invalid (nullable は明示 null 必要)', () => {
    const r = scheduleStartTimerPart.input.safeParse({})
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect / category', () => {
    expect(scheduleStartTimerPart.id).toBe('schedule.start_timer')
    expect(scheduleStartTimerPart.sideEffect).toBe('write')
    expect(scheduleStartTimerPart.category).toBe('schedule')
  })
})
