/**
 * iter1095 basics: `api-key/schema.ts` の zod schema test を追加。
 *
 * REST API + MCP server 化 substrate (FEEDBACK_QUEUE.md P0 entry) の認証 key
 * 系 3 schema (Create / Revoke / List)。scope enum + label 範囲 + scope 配列範囲
 * (min 1 max 3) + expiresAt ISO datetime オプショナルを回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  ApiKeyScopeSchema,
  CreateApiKeyInputSchema,
  ListApiKeysInputSchema,
  RevokeApiKeyInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('ApiKeyScopeSchema', () => {
  it('3 つの scope を accept', () => {
    expect(ApiKeyScopeSchema.parse('read')).toBe('read')
    expect(ApiKeyScopeSchema.parse('write')).toBe('write')
    expect(ApiKeyScopeSchema.parse('admin')).toBe('admin')
  })

  it('未知 scope を reject', () => {
    expect(() => ApiKeyScopeSchema.parse('owner')).toThrow()
    expect(() => ApiKeyScopeSchema.parse('')).toThrow()
  })
})

describe('CreateApiKeyInputSchema', () => {
  const baseValid = {
    workspaceId: VALID_UUID,
    label: 'CI bot key',
    scopes: ['read', 'write'] as const,
  }

  it('正常入力を accept (expiresAt 省略可)', () => {
    expect(CreateApiKeyInputSchema.parse(baseValid)).toMatchObject(baseValid)
  })

  it('expiresAt は ISO datetime / null / 省略可', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({ ...baseValid, expiresAt: '2026-12-31T23:59:59Z' }),
    ).not.toThrow()
    expect(() => CreateApiKeyInputSchema.parse({ ...baseValid, expiresAt: null })).not.toThrow()
    expect(() => CreateApiKeyInputSchema.parse({ ...baseValid, expiresAt: '2026-12-31' })).toThrow()
  })

  it('label 空文字 / 120 文字超過で reject', () => {
    expect(() => CreateApiKeyInputSchema.parse({ ...baseValid, label: '' })).toThrow()
    expect(() => CreateApiKeyInputSchema.parse({ ...baseValid, label: 'x'.repeat(121) })).toThrow()
    // 境界 OK
    expect(() =>
      CreateApiKeyInputSchema.parse({ ...baseValid, label: 'x'.repeat(120) }),
    ).not.toThrow()
  })

  it('scopes 配列が空 / 重複で reject されず、enum 外 NG', () => {
    // 空配列は min(1) で reject
    expect(() => CreateApiKeyInputSchema.parse({ ...baseValid, scopes: [] })).toThrow()
    // 4 件以上は max(3) で reject (重複も可)
    expect(() =>
      CreateApiKeyInputSchema.parse({
        ...baseValid,
        scopes: ['read', 'write', 'admin', 'read'],
      }),
    ).toThrow()
    // 未知 enum は reject
    expect(() => CreateApiKeyInputSchema.parse({ ...baseValid, scopes: ['owner'] })).toThrow()
    // 3 件まで OK (重複も current schema 上 OK)
    expect(() =>
      CreateApiKeyInputSchema.parse({ ...baseValid, scopes: ['read', 'write', 'admin'] }),
    ).not.toThrow()
  })

  it('workspaceId が UUID でないと reject', () => {
    expect(() => CreateApiKeyInputSchema.parse({ ...baseValid, workspaceId: 'bad' })).toThrow()
  })
})

describe('RevokeApiKeyInputSchema', () => {
  it('UUID id で accept', () => {
    expect(RevokeApiKeyInputSchema.parse({ id: VALID_UUID })).toEqual({ id: VALID_UUID })
  })

  it('UUID でないと reject', () => {
    expect(() => RevokeApiKeyInputSchema.parse({ id: '123' })).toThrow()
  })
})

describe('ListApiKeysInputSchema', () => {
  it('workspaceId のみで OK、includeRevoked default false', () => {
    const parsed = ListApiKeysInputSchema.parse({ workspaceId: VALID_UUID })
    expect(parsed.includeRevoked).toBe(false)
  })

  it('includeRevoked true 明示で accept', () => {
    const parsed = ListApiKeysInputSchema.parse({
      workspaceId: VALID_UUID,
      includeRevoked: true,
    })
    expect(parsed.includeRevoked).toBe(true)
  })
})
