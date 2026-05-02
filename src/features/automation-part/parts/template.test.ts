/**
 * iter637 ai-automation: template.* part の input schema 単体テスト。
 */
import { describe, expect, it } from 'vitest'

import { templateListPart } from './template'

describe('templateListPart input schema', () => {
  it('空 object で valid (filter なし)', () => {
    const r = templateListPart.input.safeParse({})
    expect(r.success).toBe(true)
  })

  it('kind=manual / recurring で valid', () => {
    expect(templateListPart.input.safeParse({ kind: 'manual' }).success).toBe(true)
    expect(templateListPart.input.safeParse({ kind: 'recurring' }).success).toBe(true)
  })

  it('kind=bogus で invalid (enum 外)', () => {
    expect(templateListPart.input.safeParse({ kind: 'bogus' }).success).toBe(false)
  })

  it('part metadata: id / sideEffect=read / category=item', () => {
    expect(templateListPart.id).toBe('template.list')
    expect(templateListPart.sideEffect).toBe('read')
    expect(templateListPart.category).toBe('item')
  })
})
