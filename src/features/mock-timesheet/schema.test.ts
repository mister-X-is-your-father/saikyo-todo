/**
 * iter1094 basics: `mock-timesheet/schema.ts` の zod schema test を追加。
 *
 * mock-timesheet は社内向け 工数 mock 入力 form。submit input は ISO date
 * regex / category enum / description 範囲 / **0.25h 倍数制約** が壊れないこと
 * を回帰防止 (15 分刻み validation は spec 由来、UI side の input step=0.25 と
 * 一貫させる)。login schema は trim + 日本語 validation message を整合確認。
 */
import { describe, expect, it } from 'vitest'

import { MockTimesheetLoginInputSchema, MockTimesheetSubmitInputSchema } from './schema'

describe('MockTimesheetLoginInputSchema', () => {
  it('正常入力を accept', () => {
    expect(
      MockTimesheetLoginInputSchema.parse({
        email: 'user@example.com',
        password: 'anything',
      }),
    ).toEqual({ email: 'user@example.com', password: 'anything' })
  })

  it('email 前後空白を trim', () => {
    const parsed = MockTimesheetLoginInputSchema.parse({
      email: '  user@example.com  ',
      password: 'x',
    })
    expect(parsed.email).toBe('user@example.com')
  })

  it('email RFC invalid だと reject', () => {
    expect(() => MockTimesheetLoginInputSchema.parse({ email: 'bad', password: 'x' })).toThrow()
  })

  it('password 空文字だと reject', () => {
    expect(() => MockTimesheetLoginInputSchema.parse({ email: 'a@b.c', password: '' })).toThrow()
  })
})

describe('MockTimesheetSubmitInputSchema', () => {
  const baseValid = {
    workDate: '2026-05-22',
    category: 'dev' as const,
    description: '実装作業',
    hoursDecimal: 4.5,
  }

  it('正常入力を accept', () => {
    expect(MockTimesheetSubmitInputSchema.parse(baseValid)).toEqual(baseValid)
  })

  it('workDate ISO 形式以外を reject', () => {
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, workDate: '2026/5/22' }),
    ).toThrow()
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, workDate: '22-05-2026' }),
    ).toThrow()
  })

  it('hoursDecimal 0.25 未満で reject', () => {
    expect(() => MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 0 })).toThrow()
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 0.1 }),
    ).toThrow()
    // 境界 OK
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 0.25 }),
    ).not.toThrow()
  })

  it('hoursDecimal 24 超過で reject', () => {
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 24.25 }),
    ).toThrow()
    // 境界 OK
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 24 }),
    ).not.toThrow()
  })

  it('hoursDecimal が 0.25 倍数でないと reject (15 分刻み)', () => {
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 1.1 }),
    ).toThrow()
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 2.6 }),
    ).toThrow()
    // 0.25 倍数は OK
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 0.5 }),
    ).not.toThrow()
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 1.75 }),
    ).not.toThrow()
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, hoursDecimal: 8.0 }),
    ).not.toThrow()
  })

  it('description max 2000 文字超過で reject', () => {
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({
        ...baseValid,
        description: 'x'.repeat(2001),
      }),
    ).toThrow()
    // 境界 OK
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({
        ...baseValid,
        description: 'x'.repeat(2000),
      }),
    ).not.toThrow()
  })

  it('category 不正で reject', () => {
    expect(() =>
      MockTimesheetSubmitInputSchema.parse({ ...baseValid, category: 'invalid' }),
    ).toThrow()
  })
})
