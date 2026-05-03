import { describe, expect, it } from 'vitest'

import { buildJsonTextareaAria } from './json-textarea-aria'

describe('buildJsonTextareaAria', () => {
  it('value 空 → emptyLabel をそのまま返す', () => {
    expect(
      buildJsonTextareaAria({
        emptyLabel:
          'graph JSON (workflow の node 定義を JSON で記述、上のプリセット button で skeleton 追加可)',
        fieldName: 'graph JSON',
        value: '',
        isParseError: false,
        filledSuffix: 'node 定義 JSON',
      }),
    ).toBe(
      'graph JSON (workflow の node 定義を JSON で記述、上のプリセット button で skeleton 追加可)',
    )
  })

  it('通常 filled (isParseError=false) → 現在 N 文字 + filledSuffix', () => {
    const value = '{"nodes": []}'
    expect(
      buildJsonTextareaAria({
        emptyLabel: '空',
        fieldName: 'graph JSON',
        value,
        isParseError: false,
        filledSuffix: 'node 定義 JSON',
      }),
    ).toBe(`graph JSON (現在 ${value.length} 文字、node 定義 JSON)`)
  })

  it('isParseError=true → JSON parse error あり', () => {
    const value = '{ broken'
    expect(
      buildJsonTextareaAria({
        emptyLabel: '空',
        fieldName: 'graph JSON',
        value,
        isParseError: true,
        filledSuffix: 'node 定義 JSON',
      }),
    ).toBe(`graph JSON (現在 ${value.length} 文字、JSON parse error あり)`)
  })

  it('isParseError=true は空 value に対しては影響しない (empty path 優先)', () => {
    expect(
      buildJsonTextareaAria({
        emptyLabel: '空 hint',
        fieldName: 'graph JSON',
        value: '',
        isParseError: true,
        filledSuffix: 'node 定義 JSON',
      }),
    ).toBe('空 hint')
  })

  it('trigger JSON 用途で fieldName / filledSuffix を切替可能', () => {
    const value = '{"kind":"manual"}'
    expect(
      buildJsonTextareaAria({
        emptyLabel: '空',
        fieldName: 'trigger JSON',
        value,
        isParseError: false,
        filledSuffix: '起動条件 JSON',
      }),
    ).toBe(`trigger JSON (現在 ${value.length} 文字、起動条件 JSON)`)
  })
})
