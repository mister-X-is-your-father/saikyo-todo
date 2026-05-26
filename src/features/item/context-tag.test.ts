import { describe, expect, it } from 'vitest'

import {
  contextTagKey,
  inferTagKindFromName,
  normalizeTagKind,
  pickContextTags,
  stripContextPrefix,
} from './context-tag'

describe('inferTagKindFromName', () => {
  it('`@` ASCII prefix → context', () => {
    expect(inferTagKindFromName('@home')).toBe('context')
    expect(inferTagKindFromName('@office')).toBe('context')
    expect(inferTagKindFromName('@phone')).toBe('context')
  })

  it('`＠` 全角 prefix → context (日本語 IME 配慮)', () => {
    expect(inferTagKindFromName('＠会社')).toBe('context')
  })

  it('prefix 無し → normal', () => {
    expect(inferTagKindFromName('urgent')).toBe('normal')
    expect(inferTagKindFromName('内部')).toBe('normal')
  })

  it('空文字 / null / undefined → normal (安全側)', () => {
    expect(inferTagKindFromName('')).toBe('normal')
    expect(inferTagKindFromName('  ')).toBe('normal')
    expect(inferTagKindFromName(null)).toBe('normal')
    expect(inferTagKindFromName(undefined)).toBe('normal')
  })

  it('先頭 trim される (前後空白許容)', () => {
    expect(inferTagKindFromName('  @home  ')).toBe('context')
  })
})

describe('stripContextPrefix', () => {
  it('`@home` → `home`', () => {
    expect(stripContextPrefix('@home')).toBe('home')
  })

  it('全角 `＠会社` → `会社`', () => {
    expect(stripContextPrefix('＠会社')).toBe('会社')
  })

  it('prefix 無しはそのまま', () => {
    expect(stripContextPrefix('urgent')).toBe('urgent')
  })

  it('`@@nested` → `@nested` (1 文字だけ strip)', () => {
    expect(stripContextPrefix('@@nested')).toBe('@nested')
  })

  it('空文字 → 空文字', () => {
    expect(stripContextPrefix('')).toBe('')
    expect(stripContextPrefix('  ')).toBe('')
  })
})

describe('pickContextTags', () => {
  const tags = [
    { id: '1', name: 'urgent', kind: 'normal' as const },
    { id: '2', name: '@home', kind: 'context' as const },
    { id: '3', name: 'red', kind: 'normal' as const },
    { id: '4', name: '@office', kind: 'context' as const },
  ]

  it('kind=context だけ抽出', () => {
    expect(pickContextTags(tags).map((t) => t.id)).toEqual(['2', '4'])
  })

  it('全 normal なら空配列', () => {
    expect(pickContextTags(tags.filter((t) => t.kind === 'normal'))).toEqual([])
  })

  it('空入力 → 空配列', () => {
    expect(pickContextTags([])).toEqual([])
  })
})

describe('normalizeTagKind', () => {
  it('@-prefix 名 + kind=normal → kind=context に補正', () => {
    const r = normalizeTagKind({ id: '1', name: '@home', kind: 'normal' })
    expect(r.kind).toBe('context')
  })

  it('既に kind=context なら不変', () => {
    const tag = { id: '1', name: '@home', kind: 'context' as const }
    expect(normalizeTagKind(tag)).toBe(tag) // referential equality
  })

  it('prefix 無し + kind=normal は不変', () => {
    const tag = { id: '1', name: 'urgent', kind: 'normal' as const }
    expect(normalizeTagKind(tag)).toBe(tag)
  })
})

describe('contextTagKey (iter1382)', () => {
  it('大小・全半角・trim ゆれを吸収して同一 key に', () => {
    expect(contextTagKey('@Home')).toBe('home')
    expect(contextTagKey('@home ')).toBe('home')
    expect(contextTagKey('＠HOME')).toBe('home')
    expect(contextTagKey('@Home')).toBe(contextTagKey('@home'))
  })

  it('prefix 無し通常 tag も trim+lower のみで安全に key 化', () => {
    expect(contextTagKey('Backend')).toBe('backend')
    expect(contextTagKey('  Backend  ')).toBe('backend')
  })

  it('空 / prefix のみ → 空文字', () => {
    expect(contextTagKey('')).toBe('')
    expect(contextTagKey('@')).toBe('')
  })
})
