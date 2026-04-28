import { describe, expect, it } from 'vitest'

import { moveCursor } from './list-cursor'

describe('moveCursor', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as const

  it('空配列なら null を返す (direction を問わず)', () => {
    expect(moveCursor([], null, 'down')).toBeNull()
    expect(moveCursor([], 'a', 'up')).toBeNull()
  })

  it('currentId=null + down で先頭の id', () => {
    expect(moveCursor(items, null, 'down')).toBe('a')
  })

  it('currentId=null + up で末尾の id', () => {
    expect(moveCursor(items, null, 'up')).toBe('c')
  })

  it('真ん中から down/up で隣接 id に動く', () => {
    expect(moveCursor(items, 'b', 'down')).toBe('c')
    expect(moveCursor(items, 'b', 'up')).toBe('a')
  })

  it('末尾で down は末尾のまま (wrap しない)', () => {
    expect(moveCursor(items, 'c', 'down')).toBe('c')
  })

  it('先頭で up は先頭のまま (wrap しない)', () => {
    expect(moveCursor(items, 'a', 'up')).toBe('a')
  })

  it('stale な currentId は先頭にリセット', () => {
    expect(moveCursor(items, 'gone', 'down')).toBe('a')
    expect(moveCursor(items, 'gone', 'up')).toBe('a')
  })

  it('単一要素なら up/down ともに同じ id を維持', () => {
    const one = [{ id: 'x' }] as const
    expect(moveCursor(one, 'x', 'down')).toBe('x')
    expect(moveCursor(one, 'x', 'up')).toBe('x')
    expect(moveCursor(one, null, 'down')).toBe('x')
    expect(moveCursor(one, null, 'up')).toBe('x')
  })
})
