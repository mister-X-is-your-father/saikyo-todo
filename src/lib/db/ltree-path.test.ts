import { describe, expect, it } from 'vitest'

import { computeMovedPath, fullPathOf, isPathDescendantOf, uuidToLabel } from './ltree-path'

describe('uuidToLabel', () => {
  it('strips all hyphens', () => {
    expect(uuidToLabel('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400e29b41d4a716446655440000',
    )
  })

  it('is a no-op for an already stripped label', () => {
    expect(uuidToLabel('abc123')).toBe('abc123')
  })
})

describe('fullPathOf', () => {
  it('returns just the label for a root item (empty parentPath)', () => {
    expect(fullPathOf({ id: '550e8400-e29b-41d4-a716-446655440000', parentPath: '' })).toBe(
      '550e8400e29b41d4a716446655440000',
    )
  })

  it('concatenates parentPath and label with a dot', () => {
    expect(fullPathOf({ id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', parentPath: 'aaa.bbb' })).toBe(
      'aaa.bbb.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    )
  })
})

describe('computeMovedPath', () => {
  it('moves to root (empty newParentFull)', () => {
    const r = computeMovedPath({ id: '550e8400-e29b-41d4-a716-446655440000' }, '')
    expect(r.newParentPath).toBe('')
    expect(r.newFullPath).toBe('550e8400e29b41d4a716446655440000')
  })

  it('moves under a non-root parent', () => {
    const r = computeMovedPath({ id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }, 'aaa.xxx')
    expect(r.newParentPath).toBe('aaa.xxx')
    expect(r.newFullPath).toBe('aaa.xxx.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
  })
})

describe('isPathDescendantOf', () => {
  it('直下の子 (parentPath === parentFull) → true', () => {
    expect(isPathDescendantOf('aaa', 'aaa')).toBe(true)
  })

  it('孫 (parentPath が parentFull. で始まる) → true', () => {
    expect(isPathDescendantOf('aaa.bbb', 'aaa')).toBe(true)
    expect(isPathDescendantOf('aaa.bbb.ccc', 'aaa')).toBe(true)
  })

  it('別 parent の子 → false', () => {
    expect(isPathDescendantOf('xxx', 'aaa')).toBe(false)
    expect(isPathDescendantOf('xxx.yyy', 'aaa')).toBe(false)
  })

  it('別 parent の prefix-match に見えるが非 ltree-segment 境界 → false', () => {
    // 'aaa2.xxx' は 'aaa' で始まるが、segment 境界で見ると 'aaa2' は別 segment
    // (prefix '${parentFull}.' = 'aaa.' で始まらない)
    expect(isPathDescendantOf('aaa2', 'aaa')).toBe(false)
    expect(isPathDescendantOf('aaa2.xxx', 'aaa')).toBe(false)
  })

  it('root parentFull (空文字) は限定的にしか動かない', () => {
    // 仕様: parentFull='' で itemParentPath='' なら true (root === root の trivial case)
    expect(isPathDescendantOf('', '')).toBe(true)
    // それ以外は startsWith('.') で false (= '.x' で始まる ltree は無効)
    expect(isPathDescendantOf('aaa', '')).toBe(false)
  })
})
