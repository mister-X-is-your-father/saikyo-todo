/**
 * iter1101 basics: `schedule/schema.ts` の zod schema test を追加。
 *
 * Schedule (二車線 Calendar) 系 schema は item_schedules CRUD + timer の入口で
 * `parse` される最初の防衛線。superRefine の 3 unique rule (end > start / span
 * ≤ 24h / planned は itemId 必須) + 楽観ロック int を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  CreateScheduleInputSchema,
  ListSchedulesByDateInputSchema,
  MoveScheduleInputSchema,
  ScheduleKindSchema,
  SoftDeleteScheduleInputSchema,
  StartTimerInputSchema,
  StopTimerInputSchema,
  UpdateScheduleInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('ScheduleKindSchema', () => {
  it('planned / actual を accept', () => {
    expect(ScheduleKindSchema.parse('planned')).toBe('planned')
    expect(ScheduleKindSchema.parse('actual')).toBe('actual')
  })

  it('未知 kind を reject', () => {
    expect(() => ScheduleKindSchema.parse('estimate')).toThrow()
  })
})

describe('CreateScheduleInputSchema', () => {
  const baseValid = {
    workspaceId: VALID_UUID,
    itemId: VALID_UUID,
    kind: 'planned' as const,
    startAt: '2026-05-22T10:00:00Z',
    endAt: '2026-05-22T11:00:00Z',
  }

  it('正常入力を accept', () => {
    expect(() => CreateScheduleInputSchema.parse(baseValid)).not.toThrow()
  })

  it('end <= start を reject (superRefine)', () => {
    expect(() =>
      CreateScheduleInputSchema.parse({ ...baseValid, endAt: '2026-05-22T09:00:00Z' }),
    ).toThrow(/end は start より後/)
    expect(() =>
      CreateScheduleInputSchema.parse({ ...baseValid, endAt: baseValid.startAt }),
    ).toThrow()
  })

  it('span > 24h を reject (superRefine)', () => {
    expect(() =>
      CreateScheduleInputSchema.parse({
        ...baseValid,
        startAt: '2026-05-22T10:00:00Z',
        endAt: '2026-05-23T10:00:01Z',
      }),
    ).toThrow(/24 時間/)
    // 境界 24h ちょうど OK
    expect(() =>
      CreateScheduleInputSchema.parse({
        ...baseValid,
        startAt: '2026-05-22T10:00:00Z',
        endAt: '2026-05-23T10:00:00Z',
      }),
    ).not.toThrow()
  })

  it('kind=planned + itemId null で reject (superRefine)', () => {
    expect(() => CreateScheduleInputSchema.parse({ ...baseValid, itemId: null })).toThrow(
      /想定スロット/,
    )
  })

  it('kind=actual + itemId null は accept (自由稼働)', () => {
    expect(() =>
      CreateScheduleInputSchema.parse({
        ...baseValid,
        kind: 'actual',
        itemId: null,
      }),
    ).not.toThrow()
  })

  it('startAt / endAt が ISO datetime でないと reject', () => {
    expect(() => CreateScheduleInputSchema.parse({ ...baseValid, startAt: 'not-iso' })).toThrow()
  })
})

describe('MoveScheduleInputSchema', () => {
  it('end > start で accept', () => {
    expect(() =>
      MoveScheduleInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        startAt: '2026-05-22T10:00:00Z',
        endAt: '2026-05-22T11:00:00Z',
      }),
    ).not.toThrow()
  })

  it('end <= start を reject (superRefine)', () => {
    expect(() =>
      MoveScheduleInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        startAt: '2026-05-22T10:00:00Z',
        endAt: '2026-05-22T09:00:00Z',
      }),
    ).toThrow()
  })
})

describe('UpdateScheduleInputSchema', () => {
  it('note のみ patch で accept', () => {
    expect(() =>
      UpdateScheduleInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { note: 'メモ' },
      }),
    ).not.toThrow()
  })

  it('patch 空オブジェクトを reject', () => {
    expect(() =>
      UpdateScheduleInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: {},
      }),
    ).toThrow()
  })
})

describe('StartTimerInputSchema / StopTimerInputSchema', () => {
  it('Start: workspaceId + itemId (nullable) で accept', () => {
    expect(() =>
      StartTimerInputSchema.parse({ workspaceId: VALID_UUID, itemId: null }),
    ).not.toThrow()
    expect(() =>
      StartTimerInputSchema.parse({
        workspaceId: VALID_UUID,
        itemId: VALID_UUID,
        startAt: '2026-05-22T10:00:00Z',
      }),
    ).not.toThrow()
  })

  it('Stop: id + expectedVersion で accept (endAt optional)', () => {
    expect(() => StopTimerInputSchema.parse({ id: VALID_UUID, expectedVersion: 0 })).not.toThrow()
  })
})

describe('ListSchedulesByDateInputSchema', () => {
  it('ISO date で accept', () => {
    expect(
      ListSchedulesByDateInputSchema.parse({
        workspaceId: VALID_UUID,
        date: '2026-05-22',
      }),
    ).toEqual({ workspaceId: VALID_UUID, date: '2026-05-22' })
  })

  it('date が ISO 形式でないと reject', () => {
    expect(() =>
      ListSchedulesByDateInputSchema.parse({
        workspaceId: VALID_UUID,
        date: '2026/5/22',
      }),
    ).toThrow()
  })
})

describe('SoftDeleteScheduleInputSchema', () => {
  it('id + expectedVersion で accept', () => {
    expect(SoftDeleteScheduleInputSchema.parse({ id: VALID_UUID, expectedVersion: 0 })).toEqual({
      id: VALID_UUID,
      expectedVersion: 0,
    })
  })
})
