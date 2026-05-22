/**
 * iter1093 basics: `search/schema.ts` の zod schema test を追加。
 *
 * Semantic / FullText / Hybrid search の入力 schema は検索 UI から呼ばれる
 * Server Action の入口で `parse` される最初の防衛線。query trim + 長さ + limit
 * 上限 + templateBoost 範囲 + default 値の整合を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LIMIT,
  DEFAULT_TEMPLATE_BOOST,
  FullTextSearchInputSchema,
  HybridSearchInputSchema,
  MAX_LIMIT,
  RRF_K,
  SemanticSearchInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('search 定数', () => {
  it('default 値が文書化された invariant と一致', () => {
    expect(DEFAULT_LIMIT).toBe(20)
    expect(MAX_LIMIT).toBe(100)
    expect(DEFAULT_TEMPLATE_BOOST).toBe(1.2)
    expect(RRF_K).toBe(60)
  })
})

describe('SemanticSearchInputSchema', () => {
  it('正常入力 + default 値展開', () => {
    const parsed = SemanticSearchInputSchema.parse({
      workspaceId: VALID_UUID,
      query: 'タスク管理',
    })
    expect(parsed.limit).toBe(DEFAULT_LIMIT)
    expect(parsed.templateBoost).toBe(DEFAULT_TEMPLATE_BOOST)
  })

  it('query 前後空白を trim', () => {
    const parsed = SemanticSearchInputSchema.parse({
      workspaceId: VALID_UUID,
      query: '  検索  ',
    })
    expect(parsed.query).toBe('検索')
  })

  it('query trim 後空文字を reject', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: '   ' }),
    ).toThrow()
  })

  it('query 500 文字超過を reject', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'x'.repeat(501),
      }),
    ).toThrow()
    // 境界 OK
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'x'.repeat(500),
      }),
    ).not.toThrow()
  })

  it('limit が MAX_LIMIT (100) 超過で reject', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'x',
        limit: MAX_LIMIT + 1,
      }),
    ).toThrow()
    // 境界 OK
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'x',
        limit: MAX_LIMIT,
      }),
    ).not.toThrow()
  })

  it('limit が 0 / 負 / 小数で reject', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: 'x', limit: 0 }),
    ).toThrow()
    expect(() =>
      SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: 'x', limit: -1 }),
    ).toThrow()
    expect(() =>
      SemanticSearchInputSchema.parse({ workspaceId: VALID_UUID, query: 'x', limit: 1.5 }),
    ).toThrow()
  })

  it('templateBoost が 0 / 負 / >5 で reject', () => {
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'x',
        templateBoost: 0,
      }),
    ).toThrow()
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'x',
        templateBoost: 5.01,
      }),
    ).toThrow()
    // 境界 OK
    expect(() =>
      SemanticSearchInputSchema.parse({
        workspaceId: VALID_UUID,
        query: 'x',
        templateBoost: 5,
      }),
    ).not.toThrow()
  })
})

describe('FullTextSearchInputSchema', () => {
  it('SemanticSearchInputSchema と同じ shape を期待', () => {
    expect(() =>
      FullTextSearchInputSchema.parse({ workspaceId: VALID_UUID, query: 'foo' }),
    ).not.toThrow()
  })

  it('query 必須', () => {
    expect(() => FullTextSearchInputSchema.parse({ workspaceId: VALID_UUID, query: '' })).toThrow()
  })
})

describe('HybridSearchInputSchema', () => {
  it('SemanticSearchInputSchema と同一 (alias)', () => {
    expect(HybridSearchInputSchema).toBe(SemanticSearchInputSchema)
  })
})
