/**
 * iter1089 basics: `tag/schema.ts` の zod schema test を追加。
 *
 * Tag 系 3 schema (Create / Update / Delete) は tag-picker / tag CRUD action の
 * 入口で `parse` される最初の防衛線。color hex regex (#RRGGBB) + name 範囲 + UUID
 * 形式 + Update の「最低 1 件 patch」 refine が壊れないことを回帰防止。
 */
import { describe, expect, it } from 'vitest'

import { CreateTagInputSchema, DeleteTagInputSchema, UpdateTagInputSchema } from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('CreateTagInputSchema', () => {
  const baseValid = {
    workspaceId: VALID_UUID,
    name: '重要',
    color: '#ff0000',
  }

  it('正常入力を accept', () => {
    expect(CreateTagInputSchema.parse(baseValid)).toEqual(baseValid)
  })

  it('color 省略時は default `#64748b` (slate-500)', () => {
    const { color: _color, ...rest } = baseValid as {
      workspaceId: string
      name: string
      color?: string
    }
    void _color
    const parsed = CreateTagInputSchema.parse(rest)
    expect(parsed.color).toBe('#64748b')
  })

  it('name 空文字を reject', () => {
    expect(() => CreateTagInputSchema.parse({ ...baseValid, name: '' })).toThrow()
  })

  it('name 60 文字超過を reject', () => {
    expect(() => CreateTagInputSchema.parse({ ...baseValid, name: 'x'.repeat(61) })).toThrow()
    // 境界 OK
    expect(() => CreateTagInputSchema.parse({ ...baseValid, name: 'x'.repeat(60) })).not.toThrow()
  })

  it('color が #RRGGBB 以外を reject', () => {
    expect(() => CreateTagInputSchema.parse({ ...baseValid, color: 'red' })).toThrow()
    expect(() => CreateTagInputSchema.parse({ ...baseValid, color: '#fff' })).toThrow() // 3 桁短縮 NG
    expect(() => CreateTagInputSchema.parse({ ...baseValid, color: '#FFFFFFFF' })).toThrow() // alpha 付き NG
    expect(() => CreateTagInputSchema.parse({ ...baseValid, color: 'rgb(255,0,0)' })).toThrow()
  })

  it('workspaceId が UUID でないと reject', () => {
    expect(() => CreateTagInputSchema.parse({ ...baseValid, workspaceId: 'not-uuid' })).toThrow()
  })
})

describe('UpdateTagInputSchema', () => {
  it('name のみ patch でも OK', () => {
    expect(UpdateTagInputSchema.parse({ id: VALID_UUID, patch: { name: '新名' } })).toMatchObject({
      id: VALID_UUID,
      patch: { name: '新名' },
    })
  })

  it('color のみ patch でも OK', () => {
    expect(
      UpdateTagInputSchema.parse({ id: VALID_UUID, patch: { color: '#000000' } }),
    ).toMatchObject({ id: VALID_UUID, patch: { color: '#000000' } })
  })

  it('patch が空オブジェクトだと reject (refine `Object.keys.length > 0`)', () => {
    expect(() => UpdateTagInputSchema.parse({ id: VALID_UUID, patch: {} })).toThrow()
  })

  it('id が UUID でないと reject', () => {
    expect(() => UpdateTagInputSchema.parse({ id: 'not-uuid', patch: { name: 'x' } })).toThrow()
  })
})

describe('DeleteTagInputSchema', () => {
  it('UUID id を accept', () => {
    expect(DeleteTagInputSchema.parse({ id: VALID_UUID })).toEqual({ id: VALID_UUID })
  })

  it('UUID でないと reject', () => {
    expect(() => DeleteTagInputSchema.parse({ id: '123' })).toThrow()
  })
})
