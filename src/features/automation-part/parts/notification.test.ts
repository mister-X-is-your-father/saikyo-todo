/**
 * iter639 ai-automation: notification.* part の input schema 単体テスト。
 */
import { describe, expect, it } from 'vitest'

import { notificationListPart } from './notification'

describe('notificationListPart input schema', () => {
  it('空 object で valid (filter なし)', () => {
    const r = notificationListPart.input.safeParse({})
    expect(r.success).toBe(true)
  })

  it('unreadOnly + limit 指定で valid', () => {
    const r = notificationListPart.input.safeParse({ unreadOnly: true, limit: 100 })
    expect(r.success).toBe(true)
  })

  it('limit 範囲外 (0 / 201) は invalid', () => {
    expect(notificationListPart.input.safeParse({ limit: 0 }).success).toBe(false)
    expect(notificationListPart.input.safeParse({ limit: 201 }).success).toBe(false)
  })

  it('part metadata: id / sideEffect=read / category=notify', () => {
    expect(notificationListPart.id).toBe('notification.list')
    expect(notificationListPart.sideEffect).toBe('read')
    expect(notificationListPart.category).toBe('notify')
  })
})
