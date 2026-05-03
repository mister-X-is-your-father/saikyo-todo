import { describe, expect, it } from 'vitest'

import { buildCharCountAria } from './char-count-aria'

describe('buildCharCountAria', () => {
  it('value 空 → emptyLabel をそのまま返す', () => {
    expect(
      buildCharCountAria({
        emptyLabel: 'Sprint ゴール (任意、最大 500 文字、Cmd/Ctrl+Enter で作成)',
        fieldName: 'Sprint ゴール',
        value: '',
        maxLength: 500,
        nearMaxAt: 480,
        filledSuffix: '、Cmd/Ctrl+Enter で作成',
      }),
    ).toBe('Sprint ゴール (任意、最大 500 文字、Cmd/Ctrl+Enter で作成)')
  })

  it('通常 filled (count <= nearMax) → 現在 N / max 文字 + filledSuffix', () => {
    expect(
      buildCharCountAria({
        emptyLabel: '空',
        fieldName: 'Sprint ゴール',
        value: '短いゴール',
        maxLength: 500,
        nearMaxAt: 480,
        filledSuffix: '、Cmd/Ctrl+Enter で作成',
      }),
    ).toBe('Sprint ゴール (現在 5 / 500 文字、Cmd/Ctrl+Enter で作成)')
  })

  it('上限近接 (count > nearMax) → 上限近接 + suffix', () => {
    const value = 'あ'.repeat(490)
    expect(
      buildCharCountAria({
        emptyLabel: '空',
        fieldName: 'Sprint ゴール',
        value,
        maxLength: 500,
        nearMaxAt: 480,
        filledSuffix: '、Cmd/Ctrl+Enter で作成',
      }),
    ).toBe('Sprint ゴール (現在 490 / 500 文字、上限近接、Cmd/Ctrl+Enter で作成)')
  })

  it('whitespaceOnlySuffix 指定時 + value が空白のみ → 空白のみは不正 path', () => {
    expect(
      buildCharCountAria({
        emptyLabel: 'コメント本文 (必須、最大 10000 文字)',
        fieldName: 'コメント本文',
        value: '   ',
        maxLength: 10000,
        nearMaxAt: 9500,
        filledSuffix: '、Cmd/Ctrl+Enter で投稿',
        whitespaceOnlySuffix: '空白のみは不正',
      }),
    ).toBe('コメント本文 (現在 3 / 10000 文字、空白のみは不正)')
  })

  it('whitespaceOnlySuffix 指定 + 通常 filled → trim check 通過後 normal path', () => {
    expect(
      buildCharCountAria({
        emptyLabel: '空',
        fieldName: 'コメント本文',
        value: 'こんにちは',
        maxLength: 10000,
        nearMaxAt: 9500,
        filledSuffix: '、Cmd/Ctrl+Enter で投稿',
        whitespaceOnlySuffix: '空白のみは不正',
      }),
    ).toBe('コメント本文 (現在 5 / 10000 文字、Cmd/Ctrl+Enter で投稿)')
  })

  it('whitespaceOnlySuffix 未指定 + 空白のみ → trim check は走らず normal filled path', () => {
    expect(
      buildCharCountAria({
        emptyLabel: '空',
        fieldName: 'チームコンテキスト',
        value: '   ',
        maxLength: 4000,
        nearMaxAt: 3800,
        filledSuffix: '、Cmd/Ctrl+Enter で保存',
      }),
    ).toBe('チームコンテキスト (現在 3 / 4000 文字、Cmd/Ctrl+Enter で保存)')
  })

  it('nearMaxSuffix で 上限近接時 のみ別 suffix を指定可能', () => {
    const value = 'a'.repeat(99)
    expect(
      buildCharCountAria({
        emptyLabel: '空',
        fieldName: 'Field',
        value,
        maxLength: 100,
        nearMaxAt: 95,
        filledSuffix: '、normal suffix',
        nearMaxSuffix: '、別 suffix',
      }),
    ).toBe('Field (現在 99 / 100 文字、上限近接、別 suffix)')
  })

  it('nearMaxAt 未指定 → ceil(maxLength * 0.96) が default 境界', () => {
    // 100 * 0.96 = 96, ceil → 96。length 96 は境界、97 から 上限近接。
    expect(
      buildCharCountAria({
        emptyLabel: '空',
        fieldName: 'F',
        value: 'a'.repeat(96),
        maxLength: 100,
      }),
    ).toBe('F (現在 96 / 100 文字)')
    expect(
      buildCharCountAria({
        emptyLabel: '空',
        fieldName: 'F',
        value: 'a'.repeat(97),
        maxLength: 100,
      }),
    ).toBe('F (現在 97 / 100 文字、上限近接)')
  })

  it('filledSuffix / nearMaxSuffix どちらも未指定 → suffix なし', () => {
    expect(
      buildCharCountAria({
        emptyLabel: '空',
        fieldName: 'X',
        value: 'a',
        maxLength: 100,
        nearMaxAt: 90,
      }),
    ).toBe('X (現在 1 / 100 文字)')
  })

  it('境界 length === nearMaxAt は 上限近接 ではない (> 厳密比較)', () => {
    expect(
      buildCharCountAria({
        emptyLabel: '空',
        fieldName: 'X',
        value: 'a'.repeat(480),
        maxLength: 500,
        nearMaxAt: 480,
        filledSuffix: '、suffix',
      }),
    ).toBe('X (現在 480 / 500 文字、suffix)')
  })
})
