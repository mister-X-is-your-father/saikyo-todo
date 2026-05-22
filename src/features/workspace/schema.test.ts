/**
 * iter1087 basics: `workspace/schema.ts` の zod schema test を追加。
 *
 * `CreateWorkspaceInputSchema` は Workspace 新規作成 Server Action の入口で
 * `parse` される最初の防衛線。create-workspace-form の HTML pattern attribute
 * (`^[a-z0-9-]+$` / minLength=2) と整合する zod 規則を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import { CreateWorkspaceInputSchema } from './schema'

describe('CreateWorkspaceInputSchema', () => {
  const baseValid = { name: 'チーム A', slug: 'team-a' }

  it('正常入力を accept', () => {
    expect(CreateWorkspaceInputSchema.parse(baseValid)).toEqual(baseValid)
  })

  it('name 空文字を reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, name: '' })).toThrow()
  })

  it('name max 50 文字超過を reject (iter1092: form HTML maxLength={50} / hint "最大 50 文字" と整合)', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, name: 'x'.repeat(51) })).toThrow()
    // 境界値 OK
    expect(() =>
      CreateWorkspaceInputSchema.parse({ ...baseValid, name: 'x'.repeat(50) }),
    ).not.toThrow()
  })

  it('slug が大文字を含むと reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'Team-A' })).toThrow()
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'TEAM' })).toThrow()
  })

  it('slug に空白 / 特殊文字 / 日本語が含まれると reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'team a' })).toThrow()
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'team_a' })).toThrow()
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'team.a' })).toThrow()
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'チームA' })).toThrow()
  })

  it('slug が 1 文字だと reject (min 2)', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'a' })).toThrow()
    // 境界値 OK
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'ab' })).not.toThrow()
  })

  it('slug max 50 文字超過を reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'a'.repeat(51) })).toThrow()
    // 境界値 OK
    expect(() =>
      CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'a'.repeat(50) }),
    ).not.toThrow()
  })

  it('数字 / ハイフン混在 slug は OK', () => {
    expect(() =>
      CreateWorkspaceInputSchema.parse({ ...baseValid, slug: 'team-2026' }),
    ).not.toThrow()
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: '123' })).not.toThrow()
    expect(() => CreateWorkspaceInputSchema.parse({ ...baseValid, slug: '----' })).not.toThrow()
  })
})
