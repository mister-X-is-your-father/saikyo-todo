import { describe, expect, it } from 'vitest'

import { formatNotificationBody, formatRelativeTime } from './format'
import type { Notification } from './schema'

function n<T>(type: Notification['type'], payload: T): Notification {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    userId: '00000000-0000-0000-0000-000000000000',
    workspaceId: '00000000-0000-0000-0000-000000000000',
    type,
    payload: payload as never,
    readAt: null,
    createdAt: new Date('2026-04-27T00:00:00Z'),
  } as Notification
}

describe('formatNotificationBody', () => {
  it('heartbeat: 期限超過は "期限を N 日超過"', () => {
    const body = formatNotificationBody(
      n('heartbeat', {
        itemId: '00000000-0000-0000-0000-000000000000',
        stage: 'overdue',
        dueDate: '2026-04-20',
        daysUntilDue: -3,
      }),
    )
    expect(body).toBe('MUST Item の期限を 3 日超過しています (2026-04-20)')
  })

  it('heartbeat: 7d は "7 日後 に迫っています"', () => {
    const body = formatNotificationBody(
      n('heartbeat', {
        itemId: '00000000-0000-0000-0000-000000000000',
        stage: '7d',
        dueDate: '2026-05-04',
        daysUntilDue: 7,
      }),
    )
    expect(body).toBe('MUST Item の期限が 7 日後 に迫っています (2026-05-04)')
  })

  it('mention: preview 40 文字超過は "…" 末尾', () => {
    const long = 'あ'.repeat(50)
    const body = formatNotificationBody(
      n('mention', {
        commentId: '00000000-0000-0000-0000-000000000000',
        itemId: '00000000-0000-0000-0000-000000000000',
        itemTitle: 'X',
        mentionedBy: 'alice',
        preview: long,
      }),
    )
    expect(body).toContain('alice')
    expect(body.endsWith('…"')).toBe(true)
    // 40 文字の slice + ellipsis
    expect(body).toContain('あ'.repeat(40))
  })

  it('invite: workspace 名と role を含む', () => {
    const body = formatNotificationBody(
      n('invite', {
        workspaceId: '00000000-0000-0000-0000-000000000000',
        workspaceName: 'Team A',
        invitedBy: 'alice',
        role: 'member',
      }),
    )
    expect(body).toBe('Workspace「Team A」に招待されました (member)')
  })

  it('sync-failure: source / reason を含む', () => {
    const body = formatNotificationBody(
      n('sync-failure', {
        source: 'time-entry',
        entryId: '00000000-0000-0000-0000-000000000000',
        reason: 'creds expired',
      }),
    )
    expect(body).toBe('time-entry の同期に失敗: creds expired')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-04-27T12:00:00Z')

  it('< 60s は "たった今"', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 30 * 1000), now)).toBe('たった今')
  })

  it('5 分前', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60 * 1000), now)).toBe('5 分前')
  })

  it('2 時間前', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 2 * 60 * 60 * 1000), now)).toBe('2 時間前')
  })

  it('3 日前', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), now)).toBe(
      '3 日前',
    )
  })

  it('30 日以上は ja-JP 日付', () => {
    const old = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)
    const out = formatRelativeTime(old, now)
    expect(out).not.toContain('日前')
    // 数字 + / で構成されることを確認
    expect(out).toMatch(/\d+\/\d+/)
  })
})
