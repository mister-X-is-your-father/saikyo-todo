/**
 * iter683 chore: search schema (zod) の単体テスト。test 不在解消。
 *
 * SemanticSearchInput / FullTextSearchInput / HybridSearchInput の validation を
 * 構造的に固定する。query 1-500 / limit positive int max 100 / templateBoost
 * positive max 5 の境界を確認。
 */
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LIMIT,
  DEFAULT_TEMPLATE_BOOST,
  FullTextSearchInputSchema,
  HybridSearchInputSchema,
  MAX_LIMIT,
  SemanticSearchInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('SemanticSearchInputSchema', () => {
  it('valid 入力 で default 適用', () => {
    const r = SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: 'test' })
    expect(r.limit).toBe(DEFAULT_LIMIT)
    expect(r.templateBoost).toBe(DEFAULT_TEMPLATE_BOOST)
  })

  it('query を trim', () => {
    const r = SemanticSearchInputSchema.parse({
      workspaceId: VALID_UUID,
      query: '  query  ',
    })
    expect(r.query).toBe('query')
  })

  it('query 空 → reject', () => {
    expect(() => SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: '' })).toThrow(
      /検索語を入力/,
    )
  })

  it('query 空白のみ (trim 後 0 文字) → reject', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: '   ' }),
    ).toThrow(/検索語を入力/)
  })

  it('query 501 文字 → reject', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: 'a'.repeat(501) }),
    ).toThrow()
  })

  it('limit 0 / 負値 → reject (positive)', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: 'q', limit: 0 }),
    ).toThrow()
    expect(() =>
      SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: 'q', limit: -1 }),
    ).toThrow()
  })

  it('limit MAX_LIMIT 超 → reject', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'q',
        limit: MAX_LIMIT + 1,
      }),
    ).toThrow()
  })

  it('limit MAX_LIMIT (境界) → accept', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'q',
        limit: MAX_LIMIT,
      }),
    ).not.toThrow()
  })

  it('templateBoost 0 / 負値 → reject (positive)', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'q',
        templateBoost: 0,
      }),
    ).toThrow()
  })

  it('templateBoost > 5 → reject', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'q',
        templateBoost: 5.1,
      }),
    ).toThrow()
  })

  it('limit 小数 → reject (int)', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'q',
        limit: 5.5,
      }),
    ).toThrow()
  })
})

describe('FullTextSearchInputSchema', () => {
  it('Semantic と同 shape (default 適用)', () => {
    const r = FullTextSearchInputSchema.parse({ workspaceId: VALID_UUID, query: 'q' })
    expect(r.limit).toBe(DEFAULT_LIMIT)
    expect(r.templateBoost).toBe(DEFAULT_TEMPLATE_BOOST)
  })
})

describe('HybridSearchInputSchema (= SemanticSearchInputSchema)', () => {
  it('Semantic と同一 schema (alias)', () => {
    expect(HybridSearchInputSchema).toBe(SemanticSearchInputSchema)
  })
})
