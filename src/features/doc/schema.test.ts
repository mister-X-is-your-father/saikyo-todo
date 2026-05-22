/**
 * iter1090 basics: `doc/schema.ts` の zod schema test を追加。
 *
 * Doc 系 3 schema (Create / Update / SoftDelete) は doc CRUD action の入口で
 * `parse` される最初の防衛線。title 範囲 + body default + expectedVersion 楽観
 * ロック整数 + Update の「最低 1 件 patch」 refine を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import { CreateDocInputSchema, SoftDeleteDocInputSchema, UpdateDocInputSchema } from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('CreateDocInputSchema', () => {
  const baseValid = {
    workspaceId: VALID_UUID,
    title: '設計書',
    body: '# 概要',
    idempotencyKey: VALID_UUID,
  }

  it('正常入力を accept', () => {
    expect(CreateDocInputSchema.parse(baseValid)).toMatchObject(baseValid)
  })

  it('body 省略時は default 空文字', () => {
    const rest = { ...baseValid }
    delete (rest as Partial<typeof baseValid>).body
    const parsed = CreateDocInputSchema.parse(rest)
    expect(parsed.body).toBe('')
  })

  it('title 空文字を reject', () => {
    expect(() => CreateDocInputSchema.parse({ ...baseValid, title: '' })).toThrow()
  })

  it('title 500 文字超過を reject', () => {
    expect(() => CreateDocInputSchema.parse({ ...baseValid, title: 'x'.repeat(501) })).toThrow()
    // 境界 OK
    expect(() => CreateDocInputSchema.parse({ ...baseValid, title: 'x'.repeat(500) })).not.toThrow()
  })

  it('sourceTemplateId は省略 / null / UUID 可', () => {
    expect(() => CreateDocInputSchema.parse(baseValid)).not.toThrow()
    expect(() => CreateDocInputSchema.parse({ ...baseValid, sourceTemplateId: null })).not.toThrow()
    expect(() =>
      CreateDocInputSchema.parse({ ...baseValid, sourceTemplateId: VALID_UUID }),
    ).not.toThrow()
    expect(() =>
      CreateDocInputSchema.parse({ ...baseValid, sourceTemplateId: 'not-uuid' }),
    ).toThrow()
  })

  it('idempotencyKey が UUID でないと reject', () => {
    expect(() => CreateDocInputSchema.parse({ ...baseValid, idempotencyKey: '123' })).toThrow()
  })
})

describe('UpdateDocInputSchema', () => {
  it('title のみ patch でも OK', () => {
    expect(
      UpdateDocInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 1,
        patch: { title: '新タイトル' },
      }),
    ).toMatchObject({ id: VALID_UUID, expectedVersion: 1, patch: { title: '新タイトル' } })
  })

  it('body のみ patch でも OK (空文字許容)', () => {
    expect(() =>
      UpdateDocInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { body: '' },
      }),
    ).not.toThrow()
  })

  it('patch 空オブジェクトを reject', () => {
    expect(() =>
      UpdateDocInputSchema.parse({ id: VALID_UUID, expectedVersion: 0, patch: {} }),
    ).toThrow()
  })

  it('expectedVersion が負だと reject', () => {
    expect(() =>
      UpdateDocInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: -1,
        patch: { title: 'x' },
      }),
    ).toThrow()
  })

  it('expectedVersion が小数だと reject (int 制約)', () => {
    expect(() =>
      UpdateDocInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 1.5,
        patch: { title: 'x' },
      }),
    ).toThrow()
  })
})

describe('SoftDeleteDocInputSchema', () => {
  it('id + expectedVersion 揃えば accept', () => {
    expect(SoftDeleteDocInputSchema.parse({ id: VALID_UUID, expectedVersion: 0 })).toEqual({
      id: VALID_UUID,
      expectedVersion: 0,
    })
  })

  it('expectedVersion 欠落で reject', () => {
    expect(() => SoftDeleteDocInputSchema.parse({ id: VALID_UUID })).toThrow()
  })
})
