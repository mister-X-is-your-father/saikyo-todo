import { describe, expect, it } from 'vitest'

import {
  classifyNotificationActivityHint,
  formatNotificationActivityHintJa,
  formatNotificationActivitySummary,
  groupNotificationsByType,
  NOTIFICATION_TYPE_KEYS,
  type NotificationActivityEntry,
  type NotificationCountByType,
  notificationTypeLabel,
} from './notification-activity'

const N = (
  type: string,
  readAt: Date | string | null,
  createdAt: Date | string | null,
): NotificationActivityEntry => ({ type, readAt, createdAt })

describe('groupNotificationsByType', () => {
  it('既知 4 type を bucket に振り分ける', () => {
    const counts = groupNotificationsByType([
      N('heartbeat', null, '2026-04-29T12:00:00Z'),
      N('mention', null, '2026-04-29T12:00:00Z'),
      N('invite', null, '2026-04-29T12:00:00Z'),
      N('sync-failure', null, '2026-04-29T12:00:00Z'),
    ])
    expect(counts).toEqual({
      heartbeat: 1,
      mention: 1,
      invite: 1,
      'sync-failure': 1,
      unknown: 0,
    })
  })

  it('未知 type は unknown bucket', () => {
    const counts = groupNotificationsByType([
      N('reminder', null, '2026-04-29T12:00:00Z'),
      N('', null, '2026-04-29T12:00:00Z'),
    ])
    expect(counts.unknown).toBe(2)
  })

  it('onlyUnread=true で readAt!=null は除外', () => {
    const counts = groupNotificationsByType(
      [
        N('heartbeat', null, '2026-04-29'),
        N('heartbeat', '2026-04-29', '2026-04-28'),
        N('mention', new Date(), '2026-04-29'),
      ],
      { onlyUnread: true },
    )
    expect(counts.heartbeat).toBe(1)
    expect(counts.mention).toBe(0)
  })

  it('onlyUnread=false (default) で全件集計', () => {
    const counts = groupNotificationsByType([
      N('heartbeat', null, '2026-04-29'),
      N('heartbeat', '2026-04-29', '2026-04-29'),
    ])
    expect(counts.heartbeat).toBe(2)
  })

  it('since 指定で createdAt 古い entry を除外', () => {
    const counts = groupNotificationsByType(
      [N('heartbeat', null, '2026-04-22T00:00:00Z'), N('heartbeat', null, '2026-04-29T00:00:00Z')],
      { since: '2026-04-25T00:00:00Z' },
    )
    expect(counts.heartbeat).toBe(1)
  })

  it('since 指定 + 不正 createdAt は除外 (集計から消える)', () => {
    const counts = groupNotificationsByType(
      [
        N('heartbeat', null, null),
        N('heartbeat', null, ''),
        N('heartbeat', null, 'not-a-date'),
        N('heartbeat', null, '2026-04-29T00:00:00Z'),
      ],
      { since: '2026-04-25T00:00:00Z' },
    )
    expect(counts.heartbeat).toBe(1)
  })

  it('since 不指定なら不正 createdAt も件数に入れる (見落とし防止)', () => {
    const counts = groupNotificationsByType([
      N('heartbeat', null, null),
      N('heartbeat', null, '2026-04-29'),
    ])
    expect(counts.heartbeat).toBe(2)
  })

  it('空 input は全 bucket 0', () => {
    expect(groupNotificationsByType([])).toEqual({
      heartbeat: 0,
      mention: 0,
      invite: 0,
      'sync-failure': 0,
      unknown: 0,
    })
  })

  it('Date instance / ISO 文字列 / Unix epoch ms (Number) 経由 — Date と string で同 createdAt 判定', () => {
    const dateInstance = new Date('2026-04-29T00:00:00Z')
    const counts = groupNotificationsByType(
      [N('heartbeat', null, dateInstance), N('mention', null, '2026-04-29T00:00:00Z')],
      { since: dateInstance },
    )
    expect(counts.heartbeat).toBe(1)
    expect(counts.mention).toBe(1)
  })
})

describe('notificationTypeLabel', () => {
  it('全 5 type を日本語 label に対応付ける', () => {
    expect(notificationTypeLabel('heartbeat')).toBe('期限近接')
    expect(notificationTypeLabel('mention')).toBe('メンション')
    expect(notificationTypeLabel('invite')).toBe('招待')
    expect(notificationTypeLabel('sync-failure')).toBe('同期失敗')
    expect(notificationTypeLabel('unknown')).toBe('その他')
  })

  it('NOTIFICATION_TYPE_KEYS は 5 種で順序固定 (heartbeat → mention → invite → sync-failure → unknown)', () => {
    expect(NOTIFICATION_TYPE_KEYS).toEqual([
      'heartbeat',
      'mention',
      'invite',
      'sync-failure',
      'unknown',
    ])
  })
})

describe('formatNotificationActivitySummary', () => {
  it('既知 type 順 + 0 件省略で 1 行整形', () => {
    expect(
      formatNotificationActivitySummary({
        heartbeat: 3,
        mention: 2,
        invite: 0,
        'sync-failure': 1,
        unknown: 0,
      }),
    ).toBe('期限近接 3 / メンション 2 / 同期失敗 1')
  })

  it('全 0 → default sentinel "0 件"', () => {
    expect(
      formatNotificationActivitySummary({
        heartbeat: 0,
        mention: 0,
        invite: 0,
        'sync-failure': 0,
        unknown: 0,
      }),
    ).toBe('0 件')
  })

  it('emptySentinel を override できる', () => {
    expect(
      formatNotificationActivitySummary(
        {
          heartbeat: 0,
          mention: 0,
          invite: 0,
          'sync-failure': 0,
          unknown: 0,
        },
        '未読 0 件',
      ),
    ).toBe('未読 0 件')
  })
})

describe('統合: group → format', () => {
  it('「未読 + 直近 7 日」の summary を出せる', () => {
    const since = '2026-04-22T00:00:00Z'
    const counts = groupNotificationsByType(
      [
        N('heartbeat', null, '2026-04-29T00:00:00Z'),
        N('heartbeat', null, '2026-04-29T00:00:00Z'),
        N('heartbeat', '2026-04-29', '2026-04-29T00:00:00Z'), // 既読は onlyUnread で除外
        N('mention', null, '2026-04-21T00:00:00Z'), // 範囲外
        N('invite', null, '2026-04-29T00:00:00Z'),
      ],
      { onlyUnread: true, since },
    )
    expect(formatNotificationActivitySummary(counts)).toBe('期限近接 2 / 招待 1')
  })
})

describe('classifyNotificationActivityHint', () => {
  function counts(over: Partial<NotificationCountByType>): NotificationCountByType {
    return { heartbeat: 0, mention: 0, invite: 0, 'sync-failure': 0, unknown: 0, ...over }
  }

  it('全 0 → idle', () => {
    expect(classifyNotificationActivityHint(counts({}))).toBe('idle')
  })

  it('sync-failure >= 1 → severe', () => {
    expect(classifyNotificationActivityHint(counts({ 'sync-failure': 1 }))).toBe('severe')
  })

  it('合計 >= 50 → severe', () => {
    expect(classifyNotificationActivityHint(counts({ heartbeat: 50 }))).toBe('severe')
  })

  it('合計 >= 20 → moderate', () => {
    expect(classifyNotificationActivityHint(counts({ heartbeat: 20 }))).toBe('moderate')
  })

  it('mention >= 5 → moderate', () => {
    expect(classifyNotificationActivityHint(counts({ mention: 5 }))).toBe('moderate')
  })

  it('健全範囲 → mild', () => {
    expect(classifyNotificationActivityHint(counts({ heartbeat: 3, mention: 2 }))).toBe('mild')
  })
})

describe('formatNotificationActivityHintJa', () => {
  function counts(over: Partial<NotificationCountByType>): NotificationCountByType {
    return { heartbeat: 0, mention: 0, invite: 0, 'sync-failure': 0, unknown: 0, ...over }
  }

  it('idle / mild / moderate / severe を 1 単語で返す', () => {
    expect(formatNotificationActivityHintJa(counts({}))).toBe('通知なし')
    expect(formatNotificationActivityHintJa(counts({ heartbeat: 3 }))).toBe('通常')
    expect(formatNotificationActivityHintJa(counts({ mention: 5 }))).toBe('多め')
    expect(formatNotificationActivityHintJa(counts({ 'sync-failure': 1 }))).toBe('異常')
  })
})
