/**
 * iter679 chore: comment schema (zod) の単体テスト。test 不在解消。
 *
 * CreateCommentOnItem / CreateCommentOnDoc / UpdateComment / SoftDeleteComment
 * の zod schema を直接 unit test。body min 1 / max 10000、idempotencyKey UUID、
 * patch 空 reject。
 */
import { describe, expect, it } from 'vitest'

import {
  CreateCommentOnDocInputSchema,
  CreateCommentOnItemInputSchema,
  SoftDeleteCommentInputSchema,
  UpdateCommentInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'
const VALID_UUID_2 = '00000000-0000-4000-8000-000000000001'

describe('CreateCommentOnItemInputSchema', () => {
  it('valid 入力 を accept', () => {
    expect(
      CreateCommentOnItemInputSchema.parse({
        itemId: VALID_UUID,
        body: 'hello',
        idempotencyKey: VALID_UUID_2,
      }),
    ).toEqual({ itemId: VALID_UUID, body: 'hello', idempotencyKey: VALID_UUID_2 })
  })

  it('body 空 → reject', () => {
    expect(() =>
      CreateCommentOnItemInputSchema.parse({
        itemId: VALID_UUID,
        body: '',
        idempotencyKey: VALID_UUID_2,
      }),
    ).toThrow(/本文を入力/)
  })

  it('body 10000 文字超 → reject', () => {
    expect(() =>
      CreateCommentOnItemInputSchema.parse({
        itemId: VALID_UUID,
        body: 'a'.repeat(10_001),
        idempotencyKey: VALID_UUID_2,
      }),
    ).toThrow()
  })

  it('idempotencyKey が UUID 形式でない → reject', () => {
    expect(() =>
      CreateCommentOnItemInputSchema.parse({
        itemId: VALID_UUID,
        body: 'hi',
        idempotencyKey: 'not-uuid',
      }),
    ).toThrow()
  })
})

describe('CreateCommentOnDocInputSchema', () => {
  it('valid 入力 を accept', () => {
    expect(
      CreateCommentOnDocInputSchema.parse({
        docId: VALID_UUID,
        body: 'hi',
        idempotencyKey: VALID_UUID_2,
      }),
    ).toBeTruthy()
  })

  it('body 10000 文字 (境界) → accept', () => {
    expect(() =>
      CreateCommentOnDocInputSchema.parse({
        docId: VALID_UUID,
        body: 'a'.repeat(10_000),
        idempotencyKey: VALID_UUID_2,
      }),
    ).not.toThrow()
  })
})

describe('UpdateCommentInputSchema', () => {
  it('patch.body 入りで accept', () => {
    expect(() =>
      UpdateCommentInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 1,
        patch: { body: 'updated' },
      }),
    ).not.toThrow()
  })

  it('patch 空 → reject (refine)', () => {
    expect(() =>
      UpdateCommentInputSchema.parse({ id: VALID_UUID, expectedVersion: 1, patch: {} }),
    ).toThrow(/更新する項目がありません/)
  })

  it('expectedVersion 負値 → reject', () => {
    expect(() =>
      UpdateCommentInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: -1,
        patch: { body: 'x' },
      }),
    ).toThrow()
  })
})

describe('SoftDeleteCommentInputSchema', () => {
  it('valid uuid + version で accept', () => {
    expect(() =>
      SoftDeleteCommentInputSchema.parse({ id: VALID_UUID, expectedVersion: 0 }),
    ).not.toThrow()
  })

  it('expectedVersion 不在 → reject', () => {
    expect(() => SoftDeleteCommentInputSchema.parse({ id: VALID_UUID })).toThrow()
  })
})
