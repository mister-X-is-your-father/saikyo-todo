/**
 * iter1091 basics: `comment/schema.ts` の zod schema test を追加。
 *
 * Comment 系 4 schema (CreateOnItem / CreateOnDoc / Update / SoftDelete) は
 * comment CRUD action の入口で `parse` される最初の防衛線。body 範囲 (1〜10000)
 * + UUID 形式 + 楽観ロック int + Update の「最低 1 件 patch」 refine を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  CreateCommentOnDocInputSchema,
  CreateCommentOnItemInputSchema,
  SoftDeleteCommentInputSchema,
  UpdateCommentInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('CreateCommentOnItemInputSchema', () => {
  const baseValid = { itemId: VALID_UUID, body: '進捗 OK', idempotencyKey: VALID_UUID }

  it('正常入力を accept', () => {
    expect(CreateCommentOnItemInputSchema.parse(baseValid)).toEqual(baseValid)
  })

  it('body 空文字を reject', () => {
    expect(() => CreateCommentOnItemInputSchema.parse({ ...baseValid, body: '' })).toThrow()
  })

  it('body 10000 文字超過を reject', () => {
    expect(() =>
      CreateCommentOnItemInputSchema.parse({ ...baseValid, body: 'x'.repeat(10_001) }),
    ).toThrow()
    // 境界 OK
    expect(() =>
      CreateCommentOnItemInputSchema.parse({ ...baseValid, body: 'x'.repeat(10_000) }),
    ).not.toThrow()
  })

  it('itemId が UUID でないと reject', () => {
    expect(() =>
      CreateCommentOnItemInputSchema.parse({ ...baseValid, itemId: 'not-uuid' }),
    ).toThrow()
  })
})

describe('CreateCommentOnDocInputSchema', () => {
  it('docId + body + idempotencyKey で accept', () => {
    expect(() =>
      CreateCommentOnDocInputSchema.parse({
        docId: VALID_UUID,
        body: 'コメント',
        idempotencyKey: VALID_UUID,
      }),
    ).not.toThrow()
  })

  it('docId が UUID でないと reject', () => {
    expect(() =>
      CreateCommentOnDocInputSchema.parse({
        docId: 'bad',
        body: 'x',
        idempotencyKey: VALID_UUID,
      }),
    ).toThrow()
  })
})

describe('UpdateCommentInputSchema', () => {
  it('body のみ patch でも OK', () => {
    expect(() =>
      UpdateCommentInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { body: '修正' },
      }),
    ).not.toThrow()
  })

  it('patch 空オブジェクトを reject (refine `keys > 0`)', () => {
    expect(() =>
      UpdateCommentInputSchema.parse({ id: VALID_UUID, expectedVersion: 0, patch: {} }),
    ).toThrow()
  })

  it('expectedVersion が負だと reject', () => {
    expect(() =>
      UpdateCommentInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: -1,
        patch: { body: 'x' },
      }),
    ).toThrow()
  })

  it('body が空文字 patch だと reject (min 1)', () => {
    expect(() =>
      UpdateCommentInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { body: '' },
      }),
    ).toThrow()
  })
})

describe('SoftDeleteCommentInputSchema', () => {
  it('id + expectedVersion 揃えば accept', () => {
    expect(SoftDeleteCommentInputSchema.parse({ id: VALID_UUID, expectedVersion: 0 })).toEqual({
      id: VALID_UUID,
      expectedVersion: 0,
    })
  })

  it('expectedVersion 欠落で reject', () => {
    expect(() => SoftDeleteCommentInputSchema.parse({ id: VALID_UUID })).toThrow()
  })
})
