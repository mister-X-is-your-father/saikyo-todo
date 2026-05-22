import { describe, expect, it } from 'vitest'

import {
  GetGoalInputSchema,
  type Period,
  periodLabelJa,
  PeriodSchema,
  UpsertGoalInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('periodLabelJa', () => {
  it('全 3 period の JA label を返す', () => {
    expect(periodLabelJa('day')).toBe('日次')
    expect(periodLabelJa('week')).toBe('週次')
    expect(periodLabelJa('month')).toBe('月次')
  })

  it('全 Period 値が空文字列でない (網羅性ガード)', () => {
    const all: Period[] = ['day', 'week', 'month']
    for (const p of all) {
      expect(periodLabelJa(p).length).toBeGreaterThan(0)
    }
  })
})

// iter1111 basics: zod 入力 schema の boundary test を追加 (既存 periodLabelJa
// test に隣接配置)。Upsert/Get 入口の楽観ロック int / periodKey 範囲 / text 長
// が壊れないことを回帰防止。
describe('PeriodSchema', () => {
  it('day / week / month を accept、それ以外を reject', () => {
    expect(PeriodSchema.parse('day')).toBe('day')
    expect(() => PeriodSchema.parse('quarter')).toThrow()
    expect(() => PeriodSchema.parse('')).toThrow()
  })
})

describe('UpsertGoalInputSchema', () => {
  const baseValid = {
    workspaceId: VALID_UUID,
    period: 'day' as const,
    periodKey: '2026-04-27',
    text: '今日の目標',
    expectedVersion: 0,
  }

  it('正常入力を accept', () => {
    expect(() => UpsertGoalInputSchema.parse(baseValid)).not.toThrow()
  })

  it('periodKey 空 / 20 文字超過で reject、境界 1/20 で accept', () => {
    expect(() => UpsertGoalInputSchema.parse({ ...baseValid, periodKey: '' })).toThrow()
    expect(() => UpsertGoalInputSchema.parse({ ...baseValid, periodKey: 'x'.repeat(21) })).toThrow()
    expect(() => UpsertGoalInputSchema.parse({ ...baseValid, periodKey: 'a' })).not.toThrow()
    expect(() =>
      UpsertGoalInputSchema.parse({ ...baseValid, periodKey: 'x'.repeat(20) }),
    ).not.toThrow()
  })

  it('ISO week 表記 (2026-W18) も accept', () => {
    expect(() =>
      UpsertGoalInputSchema.parse({
        ...baseValid,
        period: 'week',
        periodKey: '2026-W18',
      }),
    ).not.toThrow()
  })

  it('text 2000 文字超過で reject、境界 2000 で accept', () => {
    expect(() => UpsertGoalInputSchema.parse({ ...baseValid, text: 'x'.repeat(2001) })).toThrow()
    expect(() =>
      UpsertGoalInputSchema.parse({ ...baseValid, text: 'x'.repeat(2000) }),
    ).not.toThrow()
  })

  it('expectedVersion 負 / 小数で reject (楽観ロック int 制約)', () => {
    expect(() => UpsertGoalInputSchema.parse({ ...baseValid, expectedVersion: -1 })).toThrow()
    expect(() => UpsertGoalInputSchema.parse({ ...baseValid, expectedVersion: 1.5 })).toThrow()
  })
})

describe('GetGoalInputSchema', () => {
  it('期間 + periodKey で accept', () => {
    expect(() =>
      GetGoalInputSchema.parse({
        workspaceId: VALID_UUID,
        period: 'month',
        periodKey: '2026-04',
      }),
    ).not.toThrow()
  })

  it('period 不正で reject', () => {
    expect(() =>
      GetGoalInputSchema.parse({
        workspaceId: VALID_UUID,
        period: 'invalid',
        periodKey: '2026-04',
      }),
    ).toThrow()
  })
})
