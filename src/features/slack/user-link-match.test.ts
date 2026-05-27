import { describe, expect, it } from 'vitest'

import { matchSlackUsersByEmail } from './user-link-match'

const members = [
  { userId: 'u1', email: 'alice@example.com' },
  { userId: 'u2', email: 'Bob@Example.com' },
  { userId: 'u3', email: null },
]

describe('matchSlackUsersByEmail', () => {
  it('email 一致で候補化', () => {
    const r = matchSlackUsersByEmail([{ slackUserId: 'S1', email: 'alice@example.com' }], members)
    expect(r).toEqual([{ slackUserId: 'S1', userId: 'u1', matchedEmail: 'alice@example.com' }])
  })

  it('大小無視 + trim で突合', () => {
    const r = matchSlackUsersByEmail([{ slackUserId: 'S2', email: '  BOB@example.COM ' }], members)
    expect(r).toHaveLength(1)
    expect(r[0]!.userId).toBe('u2')
  })

  it('email 無い slack user / member は対象外', () => {
    expect(matchSlackUsersByEmail([{ slackUserId: 'S3', email: null }], members)).toEqual([])
    expect(matchSlackUsersByEmail([{ slackUserId: 'S4', email: '' }], members)).toEqual([])
  })

  it('一致 member なし → 候補なし', () => {
    expect(
      matchSlackUsersByEmail([{ slackUserId: 'S5', email: 'nobody@example.com' }], members),
    ).toEqual([])
  })

  it('複数 slack user を一括突合', () => {
    const r = matchSlackUsersByEmail(
      [
        { slackUserId: 'S1', email: 'alice@example.com' },
        { slackUserId: 'S2', email: 'bob@example.com' },
        { slackUserId: 'S3', email: 'ghost@example.com' },
      ],
      members,
    )
    expect(r.map((s) => s.slackUserId)).toEqual(['S1', 'S2'])
  })

  it('同一 slack user 重複入力は先勝ちで 1 件', () => {
    const r = matchSlackUsersByEmail(
      [
        { slackUserId: 'S1', email: 'alice@example.com' },
        { slackUserId: 'S1', email: 'alice@example.com' },
      ],
      members,
    )
    expect(r).toHaveLength(1)
  })

  it('member 側の重複 email は先勝ち', () => {
    const dupMembers = [
      { userId: 'first', email: 'x@example.com' },
      { userId: 'second', email: 'x@example.com' },
    ]
    const r = matchSlackUsersByEmail([{ slackUserId: 'S1', email: 'x@example.com' }], dupMembers)
    expect(r[0]!.userId).toBe('first')
  })
})
