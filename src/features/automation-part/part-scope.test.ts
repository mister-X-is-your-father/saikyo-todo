import { describe, expect, it } from 'vitest'

import { filterManifestForScopes, requiredScopeForSideEffect, scopesAllowPart } from './part-scope'
import type { PartSideEffect } from './types'

describe('requiredScopeForSideEffect', () => {
  it('read → read / write → write / external → write', () => {
    expect(requiredScopeForSideEffect('read')).toBe('read')
    expect(requiredScopeForSideEffect('write')).toBe('write')
    expect(requiredScopeForSideEffect('external')).toBe('write')
  })
})

describe('scopesAllowPart', () => {
  it('read scope: read part のみ可', () => {
    expect(scopesAllowPart(['read'], 'read')).toBe(true)
    expect(scopesAllowPart(['read'], 'write')).toBe(false)
    expect(scopesAllowPart(['read'], 'external')).toBe(false)
  })
  it('write scope: read + write + external 可 (階層 read ⊆ write)', () => {
    expect(scopesAllowPart(['write'], 'read')).toBe(true)
    expect(scopesAllowPart(['write'], 'write')).toBe(true)
    expect(scopesAllowPart(['write'], 'external')).toBe(true)
  })
  it('admin scope: 全 sideEffect 可', () => {
    expect(scopesAllowPart(['admin'], 'read')).toBe(true)
    expect(scopesAllowPart(['admin'], 'write')).toBe(true)
    expect(scopesAllowPart(['admin'], 'external')).toBe(true)
  })
  it('scope 空 → 全て不可', () => {
    expect(scopesAllowPart([], 'read')).toBe(false)
  })
  it('未知 scope 文字列は無視', () => {
    expect(scopesAllowPart(['bogus'], 'read')).toBe(false)
    expect(scopesAllowPart(['bogus', 'write'], 'write')).toBe(true)
  })
})

describe('filterManifestForScopes', () => {
  const entries: Array<{ id: string; sideEffect: PartSideEffect }> = [
    { id: 'item.list', sideEffect: 'read' },
    { id: 'item.create', sideEffect: 'write' },
    { id: 'webhook.post', sideEffect: 'external' },
  ]

  it('read scope → read part のみ', () => {
    expect(filterManifestForScopes(entries, ['read']).map((e) => e.id)).toEqual(['item.list'])
  })
  it('write scope → 全 part', () => {
    expect(filterManifestForScopes(entries, ['write']).map((e) => e.id)).toEqual([
      'item.list',
      'item.create',
      'webhook.post',
    ])
  })
  it('scope 空 → 空配列', () => {
    expect(filterManifestForScopes(entries, [])).toEqual([])
  })
})
