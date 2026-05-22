/**
 * iter1104 basics: `dashboard/schema.ts` の zod schema test を追加。
 *
 * Dashboard `GetBurndownInput` schema は burndown chart の Server Action 入口。
 * days 範囲 (1〜90 整数) + default 14 + workspaceId UUID 形式を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import { GetBurndownInputSchema } from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('GetBurndownInputSchema', () => {
  it('workspaceId のみで OK、days default 14', () => {
    const parsed = GetBurndownInputSchema.parse({ workspaceId: VALID_UUID })
    expect(parsed.days).toBe(14)
  })

  it('days 範囲外で reject (≤0 / >90 / 小数)', () => {
    expect(() => GetBurndownInputSchema.parse({ workspaceId: VALID_UUID, days: 0 })).toThrow()
    expect(() => GetBurndownInputSchema.parse({ workspaceId: VALID_UUID, days: -1 })).toThrow()
    expect(() => GetBurndownInputSchema.parse({ workspaceId: VALID_UUID, days: 91 })).toThrow()
    expect(() => GetBurndownInputSchema.parse({ workspaceId: VALID_UUID, days: 7.5 })).toThrow()
  })

  it('days 境界値 (1 / 90) は accept', () => {
    expect(() => GetBurndownInputSchema.parse({ workspaceId: VALID_UUID, days: 1 })).not.toThrow()
    expect(() => GetBurndownInputSchema.parse({ workspaceId: VALID_UUID, days: 90 })).not.toThrow()
  })

  it('workspaceId が UUID でないと reject', () => {
    expect(() => GetBurndownInputSchema.parse({ workspaceId: 'bad' })).toThrow()
  })
})
