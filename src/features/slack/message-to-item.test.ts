import { describe, expect, it } from 'vitest'

import { buildItemFromSlackMessage } from './message-to-item'

describe('buildItemFromSlackMessage', () => {
  it('title = 最初の非空行、description = 引用 + footer', () => {
    const r = buildItemFromSlackMessage({
      text: '本番デプロイの確認お願いします\n金曜までに',
      permalink: 'https://slack.com/archives/C1/p123',
      channelName: 'general',
      userName: '田中',
    })
    expect(r.title).toBe('本番デプロイの確認お願いします')
    expect(r.description).toBe(
      '> 本番デプロイの確認お願いします\n> 金曜までに\n\n元メッセージ: https://slack.com/archives/C1/p123\n投稿: #general / 田中',
    )
  })

  it('permalink / channel / user 無し → 引用のみ', () => {
    const r = buildItemFromSlackMessage({ text: 'メモ' })
    expect(r.title).toBe('メモ')
    expect(r.description).toBe('> メモ')
  })

  it('空 text → デフォルト title + 本文なし', () => {
    const r = buildItemFromSlackMessage({ text: '   ' })
    expect(r.title).toBe('Slack メッセージ')
    expect(r.description).toBe('> (本文なし)')
  })

  it('先頭空行はスキップして title 抽出', () => {
    const r = buildItemFromSlackMessage({ text: '\n\n  実装相談  \n詳細...' })
    expect(r.title).toBe('実装相談')
  })

  it('長い 1 行目は 80 文字で truncate', () => {
    const long = 'あ'.repeat(100)
    const r = buildItemFromSlackMessage({ text: long })
    expect(r.title.endsWith('…')).toBe(true)
    expect(r.title.length).toBe(80)
  })

  it('channel だけ / user だけでも footer に出る', () => {
    expect(buildItemFromSlackMessage({ text: 'x', channelName: 'dev' }).description).toContain(
      '投稿: #dev',
    )
    expect(buildItemFromSlackMessage({ text: 'x', userName: '佐藤' }).description).toContain(
      '投稿: 佐藤',
    )
  })

  it('本文中の空行は > のみの行に', () => {
    const r = buildItemFromSlackMessage({ text: 'A\n\nB' })
    expect(r.description).toBe('> A\n>\n> B')
  })
})
