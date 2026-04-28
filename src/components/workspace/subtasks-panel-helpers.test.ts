/**
 * iter255 refactor: subtasks-panel 抽出に伴う pure helper 検証。
 * Component 本体は project policy で test しないが、bulk 入力 parser は
 * UI から切り離せて UI 動作の前提となるので unit test で押さえる。
 */
import { describe, expect, it } from 'vitest'

import { parseBulkSubtaskTitles } from './subtasks-panel-helpers'

describe('parseBulkSubtaskTitles', () => {
  it('改行区切りで分割し空行を除外する', () => {
    const text = ['仕様書を読む', 'スキーマ設計', 'プロトタイプ実装'].join('\n')
    expect(parseBulkSubtaskTitles(text)).toEqual([
      '仕様書を読む',
      'スキーマ設計',
      'プロトタイプ実装',
    ])
  })

  it('行頭・行末の空白は trim して保持', () => {
    const text = '  foo  \n\tbar\t'
    expect(parseBulkSubtaskTitles(text)).toEqual(['foo', 'bar'])
  })

  it('空行 (空白のみを含む) は完全に除外', () => {
    const text = ['', '   ', '\t\t', 'one', '', 'two', '   ', ''].join('\n')
    expect(parseBulkSubtaskTitles(text)).toEqual(['one', 'two'])
  })

  it('空文字 / 改行のみの入力は空配列', () => {
    expect(parseBulkSubtaskTitles('')).toEqual([])
    expect(parseBulkSubtaskTitles('\n\n\n')).toEqual([])
    expect(parseBulkSubtaskTitles('   ')).toEqual([])
  })

  it('単行 (改行なし) も処理できる', () => {
    expect(parseBulkSubtaskTitles('only-one')).toEqual(['only-one'])
  })

  it('日本語 / emoji / 半角混在を保持', () => {
    expect(parseBulkSubtaskTitles('🚀 リリース\n設計レビュー\nQA pass')).toEqual([
      '🚀 リリース',
      '設計レビュー',
      'QA pass',
    ])
  })
})
