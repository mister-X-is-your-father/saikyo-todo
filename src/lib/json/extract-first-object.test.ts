import { describe, expect, it } from 'vitest'

import { extractFirstJsonObject } from './extract-first-object'

describe('extractFirstJsonObject', () => {
  it('plain JSON 全体', () => {
    expect(extractFirstJsonObject('{"a":1}')).toBe('{"a":1}')
  })

  it('pre/post text を無視', () => {
    expect(extractFirstJsonObject('text { "a": 1 } more')).toBe('{ "a": 1 }')
  })

  it('nested object も対応', () => {
    expect(extractFirstJsonObject('{"a":{"b":2}}')).toBe('{"a":{"b":2}}')
  })

  it('文字列内の {} は無視', () => {
    expect(extractFirstJsonObject('{"s":"{not}"}')).toBe('{"s":"{not}"}')
  })

  it('escape 文字も対応', () => {
    expect(extractFirstJsonObject('{"s":"\\"not\\"\\\\"}')).toBe('{"s":"\\"not\\"\\\\"}')
  })

  it('対応 } 無し → null', () => {
    expect(extractFirstJsonObject('{"a":1')).toBeNull()
  })

  it('{ 無し → null', () => {
    expect(extractFirstJsonObject('plain text')).toBeNull()
  })

  it('code block 形式でも 1 個目の object を返す', () => {
    const s = '```json\n{"x":1}\n```'
    expect(extractFirstJsonObject(s)).toBe('{"x":1}')
  })

  it('複数 object: 1 個目だけ返す', () => {
    expect(extractFirstJsonObject('{"a":1} {"b":2}')).toBe('{"a":1}')
  })
})
