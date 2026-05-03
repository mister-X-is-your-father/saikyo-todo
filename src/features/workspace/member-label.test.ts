import { describe, expect, it } from 'vitest'

import { memberLabel, memberLabelFromRow } from './member-label'

describe('memberLabel', () => {
  const members = [
    { userId: 'user-001-fullid-uuid', displayName: 'Alice' },
    { userId: 'user-002-fullid-uuid', displayName: 'Bob' },
    { userId: 'user-003-noname-uuid', displayName: null },
  ]

  it('一致する member の displayName を返す', () => {
    expect(memberLabel(members, 'user-001-fullid-uuid')).toBe('Alice')
    expect(memberLabel(members, 'user-002-fullid-uuid')).toBe('Bob')
  })

  it('displayName が null の member は userId 頭 6 文字を返す', () => {
    expect(memberLabel(members, 'user-003-noname-uuid')).toBe('user-0')
  })

  it('該当しない userId は userId 頭 6 文字を返す (= short-id fallback)', () => {
    expect(memberLabel(members, 'unknown-user-id')).toBe('unknow')
  })

  it('members が undefined → userId 頭 6 文字を返す', () => {
    expect(memberLabel(undefined, 'user-001-fullid-uuid')).toBe('user-0')
  })

  it('members が null → userId 頭 6 文字を返す', () => {
    expect(memberLabel(null, 'user-001-fullid-uuid')).toBe('user-0')
  })

  it('members が空配列 → userId 頭 6 文字を返す', () => {
    expect(memberLabel([], 'user-001-fullid-uuid')).toBe('user-0')
  })

  it('userId が 6 文字未満の異常 input は そのまま slice の結果 (= 元文字列) を返す', () => {
    // userId が 6 文字未満は実環境では起きないが behavior の固定 (defensive 不要)
    expect(memberLabel([], 'abc')).toBe('abc')
  })
})

describe('memberLabelFromRow', () => {
  it('row.displayName を返す', () => {
    expect(memberLabelFromRow({ userId: 'user-001-fullid-uuid', displayName: 'Alice' })).toBe(
      'Alice',
    )
  })

  it('row.displayName が null → row.userId 頭 6 文字 fallback', () => {
    expect(memberLabelFromRow({ userId: 'user-001-fullid-uuid', displayName: null })).toBe('user-0')
  })

  it('memberLabel(members, userId) と memberLabelFromRow(row) は同 row に対して同じ結果', () => {
    const m = { userId: 'user-001-fullid-uuid', displayName: 'Alice' }
    expect(memberLabelFromRow(m)).toBe(memberLabel([m], m.userId))
  })
})
