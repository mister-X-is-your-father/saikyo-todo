/**
 * iter1103 basics: `template/schema.ts` の zod schema test を追加。
 *
 * Template 系 schema (Create/Update/SoftDelete + AddTemplateItem superRefine
 * + UpdateTemplateItem + CreateFromItem + Instantiate)。recurring kind 時の
 * scheduleCron 必須 + isMust 時の dod 必須 superRefine + Update 「最低 1 件
 * patch」 refine を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  AddTemplateItemInputSchema,
  CreateTemplateFromItemInputSchema,
  CreateTemplateInputSchema,
  InstantiateTemplateInputSchema,
  RemoveTemplateItemInputSchema,
  SoftDeleteTemplateInputSchema,
  UpdateTemplateInputSchema,
  UpdateTemplateItemInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('CreateTemplateInputSchema', () => {
  const baseValid = {
    workspaceId: VALID_UUID,
    name: 'Sprint 開始セット',
    idempotencyKey: VALID_UUID,
  }

  it('manual kind は scheduleCron 不要 (default 展開) で accept', () => {
    const parsed = CreateTemplateInputSchema.parse(baseValid)
    expect(parsed.kind).toBe('manual')
    expect(parsed.description).toBe('')
    expect(parsed.tags).toEqual([])
  })

  it('recurring kind + scheduleCron 欠落で reject (superRefine)', () => {
    expect(() => CreateTemplateInputSchema.parse({ ...baseValid, kind: 'recurring' })).toThrow(
      /recurring/,
    )
    expect(() =>
      CreateTemplateInputSchema.parse({
        ...baseValid,
        kind: 'recurring',
        scheduleCron: '   ', // 空白のみも NG (trim 後 0 文字)
      }),
    ).toThrow()
  })

  it('recurring kind + scheduleCron 有で accept', () => {
    expect(() =>
      CreateTemplateInputSchema.parse({
        ...baseValid,
        kind: 'recurring',
        scheduleCron: '0 9 * * 1',
      }),
    ).not.toThrow()
  })

  it('name 空文字 / 200 文字超過で reject', () => {
    expect(() => CreateTemplateInputSchema.parse({ ...baseValid, name: '' })).toThrow()
    expect(() => CreateTemplateInputSchema.parse({ ...baseValid, name: 'x'.repeat(201) })).toThrow()
  })
})

describe('UpdateTemplateInputSchema / SoftDeleteTemplateInputSchema', () => {
  it('Update: patch 空オブジェクトを reject', () => {
    expect(() =>
      UpdateTemplateInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: {},
      }),
    ).toThrow()
  })

  it('Update: name のみ patch で accept', () => {
    expect(() =>
      UpdateTemplateInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { name: '新名' },
      }),
    ).not.toThrow()
  })

  it('SoftDelete: id + expectedVersion で accept', () => {
    expect(() =>
      SoftDeleteTemplateInputSchema.parse({ id: VALID_UUID, expectedVersion: 0 }),
    ).not.toThrow()
  })
})

describe('AddTemplateItemInputSchema (superRefine MUST→DoD)', () => {
  const baseValid = {
    templateId: VALID_UUID,
    title: '要件確認',
  }

  it('isMust false + dod 無し で accept', () => {
    expect(() => AddTemplateItemInputSchema.parse(baseValid)).not.toThrow()
  })

  it('isMust true + dod 有り で accept', () => {
    expect(() =>
      AddTemplateItemInputSchema.parse({ ...baseValid, isMust: true, dod: '確認会で承認' }),
    ).not.toThrow()
  })

  it('isMust true + dod 欠落で reject (superRefine)', () => {
    expect(() => AddTemplateItemInputSchema.parse({ ...baseValid, isMust: true })).toThrow(/MUST/)
    expect(() =>
      AddTemplateItemInputSchema.parse({ ...baseValid, isMust: true, dod: '   ' }),
    ).toThrow()
  })

  it('title 空文字 / 500 文字超過で reject', () => {
    expect(() => AddTemplateItemInputSchema.parse({ ...baseValid, title: '' })).toThrow()
    expect(() =>
      AddTemplateItemInputSchema.parse({ ...baseValid, title: 'x'.repeat(501) }),
    ).toThrow()
  })

  it('dueOffsetDays は整数のみ', () => {
    expect(() => AddTemplateItemInputSchema.parse({ ...baseValid, dueOffsetDays: 1.5 })).toThrow()
    expect(() => AddTemplateItemInputSchema.parse({ ...baseValid, dueOffsetDays: 3 })).not.toThrow()
  })
})

describe('UpdateTemplateItemInputSchema / RemoveTemplateItemInputSchema', () => {
  it('Update: patch 空で reject、title のみ patch で accept', () => {
    expect(() => UpdateTemplateItemInputSchema.parse({ id: VALID_UUID, patch: {} })).toThrow()
    expect(() =>
      UpdateTemplateItemInputSchema.parse({
        id: VALID_UUID,
        patch: { title: '更新' },
      }),
    ).not.toThrow()
  })

  it('Remove: id のみで accept', () => {
    expect(() => RemoveTemplateItemInputSchema.parse({ id: VALID_UUID })).not.toThrow()
  })
})

describe('CreateTemplateFromItemInputSchema', () => {
  it('itemId のみ最小入力で accept (name/description は省略可)', () => {
    expect(() => CreateTemplateFromItemInputSchema.parse({ itemId: VALID_UUID })).not.toThrow()
  })

  it('name 200 文字超過 / description 2000 文字超過で reject', () => {
    expect(() =>
      CreateTemplateFromItemInputSchema.parse({
        itemId: VALID_UUID,
        name: 'x'.repeat(201),
      }),
    ).toThrow()
    expect(() =>
      CreateTemplateFromItemInputSchema.parse({
        itemId: VALID_UUID,
        description: 'x'.repeat(2001),
      }),
    ).toThrow()
  })
})

describe('InstantiateTemplateInputSchema', () => {
  it('templateId のみ最小入力で accept、variables default 空 record', () => {
    const parsed = InstantiateTemplateInputSchema.parse({ templateId: VALID_UUID })
    expect(parsed.variables).toEqual({})
  })

  it('cronRunId 空文字で reject (min 1)', () => {
    expect(() =>
      InstantiateTemplateInputSchema.parse({ templateId: VALID_UUID, cronRunId: '' }),
    ).toThrow()
  })
})
