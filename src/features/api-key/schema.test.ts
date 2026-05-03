/**
 * iter681 chore: api-key schema (zod) の単体テスト。test 不在解消。
 *
 * REST API / MCP server の認証 substrate。Create / Revoke / List input の
 * validation invariant を構造的に固定。scope は ['read', 'write', 'admin'] の
 * enum 限定、scopes 配列は 1-3 件 (空 / 4 件以上 reject)。
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
  it('既知 scope を accept', () => {
    expect(ApiKeyScopeSchema.parse('read')).toBe('read')
    expect(ApiKeyScopeSchema.parse('write')).toBe('write')
    expect(ApiKeyScopeSchema.parse('admin')).toBe('admin')
  })

  it('未知 scope は reject', () => {
    expect(() => ApiKeyScopeSchema.parse('superuser')).toThrow()
    expect(() => ApiKeyScopeSchema.parse('')).toThrow()
  })
})

describe('CreateApiKeyInputSchema', () => {
  it('valid 入力 (1 scope) を accept', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({
        workspaceId: VALID_UUID,
        label: 'CI bot',
        scopes: ['read'],
      }),
    ).not.toThrow()
  })

  it('3 scope 全部 (max 境界) を accept', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({
        workspaceId: VALID_UUID,
        label: 'admin key',
        scopes: ['read', 'write', 'admin'],
      }),
    ).not.toThrow()
  })

  it('scopes 空配列 → reject', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({
        workspaceId: VALID_UUID,
        label: 'x',
        scopes: [],
      }),
    ).toThrow()
  })

  it('label 空 → reject', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({
        workspaceId: VALID_UUID,
        label: '',
        scopes: ['read'],
      }),
    ).toThrow()
  })

  it('label 120 文字超 → reject', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({
        workspaceId: VALID_UUID,
        label: 'a'.repeat(121),
        scopes: ['read'],
      }),
    ).toThrow()
  })

  it('expiresAt が ISO datetime 不正 → reject', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({
        workspaceId: VALID_UUID,
        label: 'x',
        scopes: ['read'],
        expiresAt: 'invalid-datetime',
      }),
    ).toThrow()
  })

  it('expiresAt が ISO datetime 正常 → accept', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({
        workspaceId: VALID_UUID,
        label: 'x',
        scopes: ['read'],
        expiresAt: '2026-12-31T23:59:59Z',
      }),
    ).not.toThrow()
  })
})

describe('RevokeApiKeyInputSchema', () => {
  it('valid uuid で accept', () => {
    expect(RevokeApiKeyInputSchema.parse({ id: VALID_UUID })).toEqual({ id: VALID_UUID })
  })

  it('UUID 不正 → reject', () => {
    expect(() => RevokeApiKeyInputSchema.parse({ id: 'bad' })).toThrow()
  })
})

describe('ListApiKeysInputSchema', () => {
  it('workspaceId のみ で includeRevoked default false', () => {
    const r = ListApiKeysInputSchema.parse({ workspaceId: VALID_UUID })
    expect(r.includeRevoked).toBe(false)
  })

  it('includeRevoked=true 明示で accept', () => {
    const r = ListApiKeysInputSchema.parse({ workspaceId: VALID_UUID, includeRevoked: true })
    expect(r.includeRevoked).toBe(true)
  })
})
