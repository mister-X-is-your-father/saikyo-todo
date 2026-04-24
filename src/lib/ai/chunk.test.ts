import { describe, expect, it } from 'vitest'

import { chunkText } from './chunk'

describe('chunkText', () => {
  it('空文字列は空配列', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n\n  ')).toEqual([])
  })

  it('maxChars 以下は 1 要素配列', () => {
    expect(chunkText('hello', { maxChars: 10, overlap: 2 })).toEqual(['hello'])
    const exact = 'a'.repeat(500)
    expect(chunkText(exact)).toEqual([exact])
  })

  it('maxChars を超えると overlap 付きでスライス', () => {
    const chunks = chunkText('0123456789', { maxChars: 4, overlap: 1 })
    // stride = 3 → start 0,3,6 → chunk end 4,7,10 → 最終 chunk で break
    expect(chunks).toEqual(['0123', '3456', '6789'])
  })

  it('overlap=0 なら重複無し', () => {
    const chunks = chunkText('0123456789', { maxChars: 4, overlap: 0 })
    expect(chunks).toEqual(['0123', '4567', '89'])
  })

  it('日本語 (マルチバイト) も文字単位で分割', () => {
    const text = 'あいうえおかきくけこ'
    const chunks = chunkText(text, { maxChars: 4, overlap: 1 })
    expect(chunks).toEqual(['あいうえ', 'えおかき', 'きくけこ'])
  })

  it('前後の空白は trim される (1 要素のケース)', () => {
    expect(chunkText('   hello\n  ')).toEqual(['hello'])
  })

  it('maxChars <= 0 は Error', () => {
    expect(() => chunkText('abc', { maxChars: 0 })).toThrow(/maxChars/)
    expect(() => chunkText('abc', { maxChars: -1 })).toThrow(/maxChars/)
  })

  it('overlap >= maxChars は Error (無限ループ防止)', () => {
    expect(() => chunkText('abc', { maxChars: 4, overlap: 4 })).toThrow(/overlap/)
    expect(() => chunkText('abc', { maxChars: 4, overlap: 10 })).toThrow(/overlap/)
  })

  it('デフォルト設定でも長文を正しく分割できる', () => {
    const longText = 'a'.repeat(1_200)
    const chunks = chunkText(longText)
    // maxChars=500, overlap=50, stride=450
    // start: 0, 450, 900 → chunk lengths: 500, 500, 300
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toHaveLength(500)
    expect(chunks[1]).toHaveLength(500)
    expect(chunks[2]).toHaveLength(300)
  })
})
