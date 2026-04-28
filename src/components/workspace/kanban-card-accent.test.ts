/**
 * iter303 basics: Kanban カード status 視覚 hint helper の単体検証。
 */
import { describe, expect, it } from 'vitest'

import { getCardStatusAccent } from './kanban-card-accent'

describe('getCardStatusAccent — known statuses', () => {
  it('blocked → 左 amber border + amber 背景', () => {
    const a = getCardStatusAccent('blocked')
    expect(a.borderClass).toContain('border-l-4')
    expect(a.borderClass).toContain('amber')
    expect(a.bgClass).toContain('amber')
  })

  it('done → 左 emerald border + emerald 背景', () => {
    const a = getCardStatusAccent('done')
    expect(a.borderClass).toContain('border-l-4')
    expect(a.borderClass).toContain('emerald')
    expect(a.bgClass).toContain('emerald')
  })
})

describe('getCardStatusAccent — default (装飾なし)', () => {
  it('todo は装飾なし (empty border + bg-background)', () => {
    expect(getCardStatusAccent('todo')).toEqual({
      borderClass: '',
      bgClass: 'bg-background',
    })
  })

  it('in_progress は装飾なし', () => {
    expect(getCardStatusAccent('in_progress')).toEqual({
      borderClass: '',
      bgClass: 'bg-background',
    })
  })

  it('cancelled は装飾なし', () => {
    expect(getCardStatusAccent('cancelled')).toEqual({
      borderClass: '',
      bgClass: 'bg-background',
    })
  })

  it('未知 status は装飾なし (fail-soft)', () => {
    expect(getCardStatusAccent('weird-state')).toEqual({
      borderClass: '',
      bgClass: 'bg-background',
    })
  })

  it('null は装飾なし', () => {
    expect(getCardStatusAccent(null)).toEqual({
      borderClass: '',
      bgClass: 'bg-background',
    })
  })

  it('undefined は装飾なし', () => {
    expect(getCardStatusAccent(undefined)).toEqual({
      borderClass: '',
      bgClass: 'bg-background',
    })
  })

  it('空文字は装飾なし', () => {
    expect(getCardStatusAccent('')).toEqual({
      borderClass: '',
      bgClass: 'bg-background',
    })
  })
})

describe('getCardStatusAccent — class 整合', () => {
  it('blocked と done の border/bg は別の色 family', () => {
    const blocked = getCardStatusAccent('blocked')
    const done = getCardStatusAccent('done')
    expect(blocked.borderClass).not.toBe(done.borderClass)
    expect(blocked.bgClass).not.toBe(done.bgClass)
  })

  it('装飾あり 2 status は dark 変種を bg に持つ', () => {
    expect(getCardStatusAccent('blocked').bgClass).toContain('dark:')
    expect(getCardStatusAccent('done').bgClass).toContain('dark:')
  })
})
