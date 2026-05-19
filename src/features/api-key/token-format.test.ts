import { describe, expect, it } from 'vitest'

import {
  extractBearerToken,
  extractKeyPrefix,
  hasRequiredScope,
  isValidApiTokenFormat,
  maskToken,
} from './token-format'

const VALID_TOKEN = 'sk_' + 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8'
const INVALID_NO_PREFIX = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8'
const INVALID_TOO_SHORT = 'sk_short'

describe('isValidApiTokenFormat', () => {
  it('valid prefix + length → true', () => {
    expect(isValidApiTokenFormat(VALID_TOKEN)).toBe(true)
  })

  it('prefix 無し → false', () => {
    expect(isValidApiTokenFormat(INVALID_NO_PREFIX)).toBe(false)
  })

  it('短すぎる → false', () => {
    expect(isValidApiTokenFormat(INVALID_TOO_SHORT)).toBe(false)
  })

  it('空文字 → false', () => {
    expect(isValidApiTokenFormat('')).toBe(false)
  })
})

describe('extractKeyPrefix', () => {
  it('valid token → 先頭 12 文字', () => {
    expect(extractKeyPrefix(VALID_TOKEN)).toBe(VALID_TOKEN.slice(0, 12))
    expect(extractKeyPrefix(VALID_TOKEN).startsWith('sk_')).toBe(true)
  })

  it('invalid token → 空文字', () => {
    expect(extractKeyPrefix('invalid')).toBe('')
  })
})

describe('hasRequiredScope', () => {
  it('read 必要 + scopes に read 有 → true', () => {
    expect(hasRequiredScope(['read'], 'read')).toBe(true)
  })

  it('read 必要 + scopes に write 有 → true (write は read を含む)', () => {
    expect(hasRequiredScope(['write'], 'read')).toBe(true)
  })

  it('read 必要 + scopes に admin 有 → true (admin は全権)', () => {
    expect(hasRequiredScope(['admin'], 'read')).toBe(true)
  })

  it('write 必要 + scopes に read のみ → false', () => {
    expect(hasRequiredScope(['read'], 'write')).toBe(false)
  })

  it('admin 必要 + scopes に write のみ → false', () => {
    expect(hasRequiredScope(['write'], 'admin')).toBe(false)
  })

  it('空 scopes → 全 required で false', () => {
    expect(hasRequiredScope([], 'read')).toBe(false)
    expect(hasRequiredScope([], 'write')).toBe(false)
    expect(hasRequiredScope([], 'admin')).toBe(false)
  })

  it('未知 scope は無視', () => {
    expect(hasRequiredScope(['unknown'], 'read')).toBe(false)
  })

  it('複数 scopes は max を採用', () => {
    expect(hasRequiredScope(['read', 'admin'], 'write')).toBe(true)
  })
})

describe('extractBearerToken', () => {
  it('Bearer prefix + valid token → token 返却', () => {
    expect(extractBearerToken(`Bearer ${VALID_TOKEN}`)).toBe(VALID_TOKEN)
  })

  it('case-insensitive Bearer', () => {
    expect(extractBearerToken(`bearer ${VALID_TOKEN}`)).toBe(VALID_TOKEN)
  })

  it('null / undefined / 空 → null', () => {
    expect(extractBearerToken(null)).toBeNull()
    expect(extractBearerToken(undefined)).toBeNull()
    expect(extractBearerToken('')).toBeNull()
  })

  it('Bearer 無し → null', () => {
    expect(extractBearerToken(VALID_TOKEN)).toBeNull()
  })

  it('Basic auth は reject', () => {
    expect(extractBearerToken(`Basic ${VALID_TOKEN}`)).toBeNull()
  })

  it('format invalid token → null', () => {
    expect(extractBearerToken(`Bearer ${INVALID_NO_PREFIX}`)).toBeNull()
  })
})

describe('maskToken', () => {
  it('valid token → prefix + ****** + ...tail4', () => {
    const masked = maskToken(VALID_TOKEN)
    expect(masked.startsWith('sk_')).toBe(true)
    expect(masked).toContain('******')
    expect(masked.endsWith(VALID_TOKEN.slice(-4))).toBe(true)
  })

  it('invalid token → "****"', () => {
    expect(maskToken('invalid')).toBe('****')
  })
})
