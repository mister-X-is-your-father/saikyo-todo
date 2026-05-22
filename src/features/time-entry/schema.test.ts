/**
 * iter1086 basics: `schema.ts` の zod schema test を追加。
 *
 * `CreateTimeEntryInputSchema` / `ListTimeEntriesInputSchema` は Server Action
 * 入口 (`actions.ts`) で `parse` される最初の防衛線。invalid 入力を弾く invariant を
 * 回帰防止。validation 規則は spec docs/spec-time-entries.md §4 由来:
 * - workDate は YYYY-MM-DD ISO
 * - durationMinutes は 1〜1440 (24h)
 * - description max 2000
 * - category は固定 5 enum (categories.ts と整合)
 */
import { describe, expect, it } from 'vitest'

import { CreateTimeEntryInputSchema, ListTimeEntriesInputSchema } from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('CreateTimeEntryInputSchema', () => {
  const baseValid = {
    workspaceId: VALID_UUID,
    itemId: null,
    workDate: '2026-05-22',
    category: 'dev' as const,
    description: '実装作業',
    durationMinutes: 60,
    idempotencyKey: VALID_UUID,
  }

  it('正常入力を accept', () => {
    expect(CreateTimeEntryInputSchema.parse(baseValid)).toMatchObject(baseValid)
  })

  it('description は default 空文字', () => {
    const rest = { ...baseValid }
    delete (rest as Partial<typeof baseValid>).description
    const parsed = CreateTimeEntryInputSchema.parse(rest)
    expect(parsed.description).toBe('')
  })

  it('workDate が ISO 形式でないと reject', () => {
    expect(() =>
      CreateTimeEntryInputSchema.parse({ ...baseValid, workDate: '2026/5/22' }),
    ).toThrow()
    expect(() =>
      CreateTimeEntryInputSchema.parse({ ...baseValid, workDate: '22-05-2026' }),
    ).toThrow()
    expect(() => CreateTimeEntryInputSchema.parse({ ...baseValid, workDate: 'invalid' })).toThrow()
  })

  it('durationMinutes 範囲外 (≤0 / >1440) を reject', () => {
    expect(() => CreateTimeEntryInputSchema.parse({ ...baseValid, durationMinutes: 0 })).toThrow()
    expect(() => CreateTimeEntryInputSchema.parse({ ...baseValid, durationMinutes: -1 })).toThrow()
    expect(() =>
      CreateTimeEntryInputSchema.parse({ ...baseValid, durationMinutes: 1441 }),
    ).toThrow()
    // 境界値 OK
    expect(() =>
      CreateTimeEntryInputSchema.parse({ ...baseValid, durationMinutes: 1 }),
    ).not.toThrow()
    expect(() =>
      CreateTimeEntryInputSchema.parse({ ...baseValid, durationMinutes: 1440 }),
    ).not.toThrow()
  })

  it('description max 2000 文字超過で reject', () => {
    const tooLong = 'x'.repeat(2001)
    expect(() => CreateTimeEntryInputSchema.parse({ ...baseValid, description: tooLong })).toThrow()
    // 境界値 OK
    expect(() =>
      CreateTimeEntryInputSchema.parse({ ...baseValid, description: 'x'.repeat(2000) }),
    ).not.toThrow()
  })

  it('category が enum 外で reject', () => {
    expect(() => CreateTimeEntryInputSchema.parse({ ...baseValid, category: 'unknown' })).toThrow()
  })

  it('workspaceId / idempotencyKey が UUID でないと reject', () => {
    expect(() =>
      CreateTimeEntryInputSchema.parse({ ...baseValid, workspaceId: 'not-uuid' }),
    ).toThrow()
    expect(() =>
      CreateTimeEntryInputSchema.parse({ ...baseValid, idempotencyKey: '123' }),
    ).toThrow()
  })
})

describe('ListTimeEntriesInputSchema', () => {
  it('workspaceId のみで OK、limit default は 100', () => {
    const parsed = ListTimeEntriesInputSchema.parse({ workspaceId: VALID_UUID })
    expect(parsed.limit).toBe(100)
  })

  it('limit 範囲外 (<1 / >500) を reject', () => {
    expect(() => ListTimeEntriesInputSchema.parse({ workspaceId: VALID_UUID, limit: 0 })).toThrow()
    expect(() =>
      ListTimeEntriesInputSchema.parse({ workspaceId: VALID_UUID, limit: 501 }),
    ).toThrow()
  })

  it('from / to が ISO 形式でないと reject', () => {
    expect(() =>
      ListTimeEntriesInputSchema.parse({ workspaceId: VALID_UUID, from: '2026/5/22' }),
    ).toThrow()
    expect(() => ListTimeEntriesInputSchema.parse({ workspaceId: VALID_UUID, to: 'bad' })).toThrow()
  })
})
