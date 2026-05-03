/**
 * iter677 chore: workspace schema (zod) の単体テスト。test 不在解消。
 *
 * Workspace 作成 form (CreateWorkspaceInput) の name + slug validation rule を
 * 構造的に固定する。slug は URL に使うため英小文字 / 数字 / ハイフンのみ.
 */
import { describe, expect, it } from 'vitest'

import { CreateWorkspaceInputSchema } from './schema'

describe('CreateWorkspaceInputSchema', () => {
  it('valid name + slug を accept', () => {
    expect(CreateWorkspaceInputSchema.parse({ name: 'チーム A', slug: 'team-a' })).toEqual({
      name: 'チーム A',
      slug: 'team-a',
    })
  })

  it('数字のみ slug も accept', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ name: 'x', slug: '123' })).not.toThrow()
  })

  it('name 空 → reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ name: '', slug: 'a-b' })).toThrow(
      /Workspace 名を入力してください/,
    )
  })

  it('name 100 文字超 → reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ name: 'a'.repeat(101), slug: 'a-b' })).toThrow()
  })

  it('slug が 1 文字 → reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ name: 'x', slug: 'a' })).toThrow(/2 文字以上/)
  })

  it('slug が 50 文字超 → reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ name: 'x', slug: 'a'.repeat(51) })).toThrow()
  })

  it('slug に大文字 → reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ name: 'x', slug: 'Team-A' })).toThrow(
      /英小文字 \/ 数字 \/ ハイフン/,
    )
  })

  it('slug に空白 → reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ name: 'x', slug: 'a b' })).toThrow()
  })

  it('slug に日本語 → reject', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ name: 'x', slug: 'チーム' })).toThrow()
  })

  it('slug にアンダースコア → reject (ハイフンのみ許容)', () => {
    expect(() => CreateWorkspaceInputSchema.parse({ name: 'x', slug: 'team_a' })).toThrow()
  })
})
