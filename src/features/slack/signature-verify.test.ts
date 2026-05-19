import { describe, expect, it } from 'vitest'

import {
  buildSignatureBaseString,
  isReplayAttack,
  parseSignatureHeader,
  timingSafeEqualHex,
} from './signature-verify'

describe('buildSignatureBaseString', () => {
  it('v0:ts:body 形式で組立', () => {
    expect(buildSignatureBaseString({ timestamp: '1234567890', rawBody: 'foo=bar' })).toBe(
      'v0:1234567890:foo=bar',
    )
  })

  it('空 body も accept', () => {
    expect(buildSignatureBaseString({ timestamp: '0', rawBody: '' })).toBe('v0:0:')
  })
})

describe('parseSignatureHeader', () => {
  const validHex = 'a'.repeat(64)

  it('v0=<64 hex> → 分解できる', () => {
    const r = parseSignatureHeader(`v0=${validHex}`)
    expect(r).toEqual({ version: 'v0', hash: validHex })
  })

  it('hex 大文字 → lower-case に正規化', () => {
    const r = parseSignatureHeader(`v0=${'A'.repeat(64)}`)
    expect(r?.hash).toBe('a'.repeat(64))
  })

  it('hash 長さ不正 → null', () => {
    expect(parseSignatureHeader('v0=short')).toBeNull()
  })

  it('version 不正 → null', () => {
    expect(parseSignatureHeader(`v1=${validHex}`)).toBeNull()
  })

  it('= 抜け → null', () => {
    expect(parseSignatureHeader('v0' + validHex)).toBeNull()
  })

  it('null / undefined / 空 → null', () => {
    expect(parseSignatureHeader(null)).toBeNull()
    expect(parseSignatureHeader(undefined)).toBeNull()
    expect(parseSignatureHeader('')).toBeNull()
  })
})

describe('isReplayAttack', () => {
  const NOW_MS = 1234567890_000

  it('差 5 分以内 → not replay', () => {
    expect(isReplayAttack(1234567890, NOW_MS)).toBe(false)
    expect(isReplayAttack(1234567890 - 299, NOW_MS)).toBe(false) // 4:59 前
  })

  it('5 分超 → replay 判定', () => {
    expect(isReplayAttack(1234567890 - 301, NOW_MS)).toBe(true)
  })

  it('未来 5 分超 → replay (clock skew 対策)', () => {
    expect(isReplayAttack(1234567890 + 301, NOW_MS)).toBe(true)
  })

  it('NaN / Infinity → replay 扱い (= 安全側)', () => {
    expect(isReplayAttack(NaN, NOW_MS)).toBe(true)
    expect(isReplayAttack(Infinity, NOW_MS)).toBe(true)
  })

  it('window 拡張可能', () => {
    expect(isReplayAttack(1234567890 - 400, NOW_MS, 600)).toBe(false)
  })
})

describe('timingSafeEqualHex', () => {
  it('完全一致 → true', () => {
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true)
  })

  it('長さ違う → false', () => {
    expect(timingSafeEqualHex('abcd', 'abcde')).toBe(false)
  })

  it('1 文字違い → false', () => {
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false)
  })

  it('空文字同士 → true', () => {
    expect(timingSafeEqualHex('', '')).toBe(true)
  })
})
