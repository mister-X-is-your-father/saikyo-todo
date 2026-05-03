/**
 * iter676 chore: tag schema (zod) の単体テスト。test 不在解消。
 *
 * Tag は名前 + #RRGGBB 色 のシンプル構造だが validation rule (max 60 / regex /
 * patch refine) が複数あるため zod schema を直接 unit test して invariant を固定。
 */
import { describe, expect, it } from 'vitest'

import { CreateTagInputSchema, DeleteTagInputSchema, UpdateTagInputSchema } from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('CreateTagInputSchema', () => {
  it('最小入力 (workspaceId + name) で accept、color は default', () => {
    const r = CreateTagInputSchema.parse({ workspaceId: VALID_UUID, name: 'urgent' })
    expect(r.color).toBe('#64748b')
    expect(r.name).toBe('urgent')
  })

  it('color 明示指定で accept', () => {
    const r = CreateTagInputSchema.parse({
      workspaceId: VALID_UUID,
      name: 'urgent',
      color: '#ff0000',
    })
    expect(r.color).toBe('#ff0000')
  })

  it('name 空文字 → reject', () => {
    expect(() => CreateTagInputSchema.parse({ workspaceId: VALID_UUID, name: '' })).toThrow()
  })

  it('name 60 文字超過 → reject', () => {
    expect(() =>
      CreateTagInputSchema.parse({ workspaceId: VALID_UUID, name: 'a'.repeat(61) }),
    ).toThrow()
  })

  it('color 不正形式 → reject (#RGB / #RRGGBBA / 名前色)', () => {
    expect(() =>
      CreateTagInputSchema.parse({ workspaceId: VALID_UUID, name: 'x', color: 'red' }),
    ).toThrow()
    expect(() =>
      CreateTagInputSchema.parse({ workspaceId: VALID_UUID, name: 'x', color: '#fff' }),
    ).toThrow()
    expect(() =>
      CreateTagInputSchema.parse({ workspaceId: VALID_UUID, name: 'x', color: '#FF000000' }),
    ).toThrow()
  })

  it('workspaceId が UUID 形式でない → reject', () => {
    expect(() => CreateTagInputSchema.parse({ workspaceId: 'not-uuid', name: 'x' })).toThrow()
  })
})

describe('UpdateTagInputSchema', () => {
  it('patch 1 件以上の field で accept', () => {
    expect(() =>
      UpdateTagInputSchema.parse({ id: VALID_UUID, patch: { name: 'new' } }),
    ).not.toThrow()
    expect(() =>
      UpdateTagInputSchema.parse({ id: VALID_UUID, patch: { color: '#abcdef' } }),
    ).not.toThrow()
  })

  it('patch 空 object → reject (refine)', () => {
    expect(() => UpdateTagInputSchema.parse({ id: VALID_UUID, patch: {} })).toThrow(
      /更新する項目がありません/,
    )
  })
})

describe('DeleteTagInputSchema', () => {
  it('valid uuid で accept', () => {
    expect(DeleteTagInputSchema.parse({ id: VALID_UUID })).toEqual({ id: VALID_UUID })
  })

  it('UUID 形式でない → reject', () => {
    expect(() => DeleteTagInputSchema.parse({ id: 'bad' })).toThrow()
  })
})
