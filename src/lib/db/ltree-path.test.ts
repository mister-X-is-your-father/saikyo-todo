import { describe, expect, it } from 'vitest'

import { computeMovedPath, fullPathOf, uuidToLabel } from './ltree-path'

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
