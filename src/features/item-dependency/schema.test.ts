/**
 * iter1096 basics: `item-dependency/schema.ts` の zod schema test を追加。
 *
 * Item 依存 (blocks / relates_to) の Add / Remove input は依存管理 panel の
 * 入口で `parse` される最初の防衛線。type enum + 自己依存 superRefine ("from
 * === to" 禁止) + UUID 形式を回帰防止。**自己依存禁止は循環防止の最後の砦**。
 */
import { describe, expect, it } from 'vitest'

import {
  AddItemDependencyInputSchema,
  ItemDependencyTypeSchema,
  RemoveItemDependencyInputSchema,
} from './schema'

const UUID_A = '00000000-0000-4000-8000-000000000001'
const UUID_B = '00000000-0000-4000-8000-000000000002'

describe('ItemDependencyTypeSchema', () => {
  it('2 つの enum 値を accept', () => {
    expect(ItemDependencyTypeSchema.parse('blocks')).toBe('blocks')
    expect(ItemDependencyTypeSchema.parse('relates_to')).toBe('relates_to')
  })

  it('未知 type を reject', () => {
    expect(() => ItemDependencyTypeSchema.parse('depends_on')).toThrow()
    expect(() => ItemDependencyTypeSchema.parse('')).toThrow()
  })
})

describe('AddItemDependencyInputSchema', () => {
  it('正常入力を accept、type default は blocks', () => {
    const parsed = AddItemDependencyInputSchema.parse({
      fromItemId: UUID_A,
      toItemId: UUID_B,
    })
    expect(parsed.type).toBe('blocks')
    expect(parsed.fromItemId).toBe(UUID_A)
    expect(parsed.toItemId).toBe(UUID_B)
  })

  it('type=relates_to を明示で accept', () => {
    expect(() =>
      AddItemDependencyInputSchema.parse({
        fromItemId: UUID_A,
        toItemId: UUID_B,
        type: 'relates_to',
      }),
    ).not.toThrow()
  })

  it('自己依存 (from === to) を reject (superRefine の循環防止)', () => {
    expect(() =>
      AddItemDependencyInputSchema.parse({
        fromItemId: UUID_A,
        toItemId: UUID_A,
      }),
    ).toThrow(/自分自身への依存/)
  })

  it('UUID 形式 NG で reject', () => {
    expect(() =>
      AddItemDependencyInputSchema.parse({ fromItemId: 'bad', toItemId: UUID_B }),
    ).toThrow()
    expect(() =>
      AddItemDependencyInputSchema.parse({ fromItemId: UUID_A, toItemId: 'bad' }),
    ).toThrow()
  })
})

describe('RemoveItemDependencyInputSchema', () => {
  it('type 明示が必須 (default 無し)', () => {
    expect(() =>
      RemoveItemDependencyInputSchema.parse({
        fromItemId: UUID_A,
        toItemId: UUID_B,
        type: 'blocks',
      }),
    ).not.toThrow()
    // type 欠落で reject
    expect(() =>
      RemoveItemDependencyInputSchema.parse({ fromItemId: UUID_A, toItemId: UUID_B }),
    ).toThrow()
  })

  it('自己依存削除は許容 (循環チェックは Add 側のみ、Remove は cleanup 用途)', () => {
    expect(() =>
      RemoveItemDependencyInputSchema.parse({
        fromItemId: UUID_A,
        toItemId: UUID_A,
        type: 'blocks',
      }),
    ).not.toThrow()
  })
})
