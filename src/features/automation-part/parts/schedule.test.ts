/**
 * iter589 ai-automation: schedule.* part の input schema 単体テスト。
 *
 * part.run() は scheduleService 経由で実 Supabase を叩くため、本 file は input
 * schema の validation のみを検証 (= service / repository は別 test で網羅済)。
 */
import { describe, expect, it } from 'vitest'

import {
  scheduleCreatePart,
  scheduleStartTimerPart,
  scheduleStopTimerPart,
  scheduleUpdatePart,
} from './schedule'
import { VALID_FIXTURE_ID } from './test-fixtures'

const validId = VALID_FIXTURE_ID

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

describe('scheduleStopTimerPart input schema', () => {
  it('id + expectedVersion で valid (endAt 省略可 = サーバ now)', () => {
    const r = scheduleStopTimerPart.input.safeParse({
      id: validId,
      expectedVersion: 0,
    })
    expect(r.success).toBe(true)
  })

  it('id + expectedVersion + endAt 明示で valid', () => {
    const r = scheduleStopTimerPart.input.safeParse({
      id: validId,
      expectedVersion: 1,
      endAt: '2026-05-01T12:00:00Z',
    })
    expect(r.success).toBe(true)
  })

  it('id が uuid 不正 → invalid', () => {
    const r = scheduleStopTimerPart.input.safeParse({
      id: 'bogus',
      expectedVersion: 0,
    })
    expect(r.success).toBe(false)
  })

  it('expectedVersion 負数 → invalid', () => {
    const r = scheduleStopTimerPart.input.safeParse({
      id: validId,
      expectedVersion: -1,
    })
    expect(r.success).toBe(false)
  })

  it('endAt が ISO 不正 → invalid', () => {
    const r = scheduleStopTimerPart.input.safeParse({
      id: validId,
      expectedVersion: 0,
      endAt: 'not-a-date',
    })
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect / category', () => {
    expect(scheduleStopTimerPart.id).toBe('schedule.stop_timer')
    expect(scheduleStopTimerPart.sideEffect).toBe('write')
    expect(scheduleStopTimerPart.category).toBe('schedule')
  })
})

describe('scheduleUpdatePart input schema', () => {
  it('id + expectedVersion + 1 patch field で valid', () => {
    const r = scheduleUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: 0,
      patch: { startAt: '2026-05-01T10:30:00Z' },
    })
    expect(r.success).toBe(true)
  })

  it('patch 空 object → invalid', () => {
    const r = scheduleUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: 1,
      patch: {},
    })
    expect(r.success).toBe(false)
  })

  it('itemId null で clear 可能 (nullish)', () => {
    const r = scheduleUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: 0,
      patch: { itemId: null },
    })
    expect(r.success).toBe(true)
  })

  it('startAt が ISO 不正 → invalid', () => {
    const r = scheduleUpdatePart.input.safeParse({
      id: validId,
      expectedVersion: 0,
      patch: { startAt: 'bogus' },
    })
    expect(r.success).toBe(false)
  })

  it('id uuid 不正 → invalid', () => {
    const r = scheduleUpdatePart.input.safeParse({
      id: 'bogus',
      expectedVersion: 0,
      patch: { startAt: '2026-05-01T10:30:00Z' },
    })
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect / category', () => {
    expect(scheduleUpdatePart.id).toBe('schedule.update')
    expect(scheduleUpdatePart.sideEffect).toBe('write')
    expect(scheduleUpdatePart.category).toBe('schedule')
  })
})
