/**
 * iter680 chore: doc schema (zod) の単体テスト。test 不在解消。
 *
 * CreateDocInput / UpdateDocInput / SoftDeleteDocInput の zod schema を直接
 * unit test。title 1-500、body default ''、idempotencyKey UUID、patch 空 reject。
 */
import { describe, expect, it } from 'vitest'

import { CreateDocInputSchema, SoftDeleteDocInputSchema, UpdateDocInputSchema } from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'
const VALID_UUID_2 = '00000000-0000-4000-8000-000000000001'

describe('CreateDocInputSchema', () => {
  it('valid 入力 (title + idempotencyKey + workspaceId) を accept、body は default 空文字', () => {
    const r = CreateDocInputSchema.parse({
      workspaceId: VALID_UUID,
      title: 'My Doc',
      idempotencyKey: VALID_UUID_2,
    })
    expect(r.body).toBe('')
    expect(r.title).toBe('My Doc')
  })

  it('body 明示で accept', () => {
    const r = CreateDocInputSchema.parse({
      workspaceId: VALID_UUID,
      title: 'x',
      body: '# heading',
      idempotencyKey: VALID_UUID_2,
    })
    expect(r.body).toBe('# heading')
  })

  it('title 空 → reject', () => {
    expect(() =>
      CreateDocInputSchema.parse({
        workspaceId: VALID_UUID,
        title: '',
        idempotencyKey: VALID_UUID_2,
      }),
    ).toThrow(/タイトルを入力/)
  })

  it('title 500 文字超 → reject', () => {
    expect(() =>
      CreateDocInputSchema.parse({
        workspaceId: VALID_UUID,
        title: 'a'.repeat(501),
        idempotencyKey: VALID_UUID_2,
      }),
    ).toThrow()
  })

  it('idempotencyKey UUID 形式不正 → reject', () => {
    expect(() =>
      CreateDocInputSchema.parse({
        workspaceId: VALID_UUID,
        title: 'x',
        idempotencyKey: 'not-uuid',
      }),
    ).toThrow()
  })

  it('sourceTemplateId は null / undefined / UUID 全て accept', () => {
    expect(() =>
      CreateDocInputSchema.parse({
        workspaceId: VALID_UUID,
        title: 'x',
        idempotencyKey: VALID_UUID_2,
        sourceTemplateId: null,
      }),
    ).not.toThrow()
    expect(() =>
      CreateDocInputSchema.parse({
        workspaceId: VALID_UUID,
        title: 'x',
        idempotencyKey: VALID_UUID_2,
        sourceTemplateId: VALID_UUID,
      }),
    ).not.toThrow()
  })
})

describe('UpdateDocInputSchema', () => {
  it('patch.title or patch.body のいずれかで accept', () => {
    expect(() =>
      UpdateDocInputSchema.parse({ id: VALID_UUID, expectedVersion: 0, patch: { title: 't' } }),
    ).not.toThrow()
    expect(() =>
      UpdateDocInputSchema.parse({ id: VALID_UUID, expectedVersion: 0, patch: { body: 'b' } }),
    ).not.toThrow()
  })

  it('patch 空 → reject (refine)', () => {
    expect(() =>
      UpdateDocInputSchema.parse({ id: VALID_UUID, expectedVersion: 0, patch: {} }),
    ).toThrow(/更新する項目がありません/)
  })

  it('expectedVersion 小数 → reject (int)', () => {
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
  it('valid uuid + version で accept', () => {
    expect(() =>
      SoftDeleteDocInputSchema.parse({ id: VALID_UUID, expectedVersion: 0 }),
    ).not.toThrow()
  })

  it('expectedVersion 負値 → reject', () => {
    expect(() => SoftDeleteDocInputSchema.parse({ id: VALID_UUID, expectedVersion: -1 })).toThrow()
  })
})
