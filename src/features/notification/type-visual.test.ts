/**
 * iter296 basics: 通知 type 別 visual config の単体テスト。
 * 既知 4 type + 未知 fallback を固定する。
 */
import { describe, expect, it } from 'vitest'

import {
  getNotificationTypeVisual,
  KNOWN_NOTIFICATION_TYPES,
  type NotificationIconKey,
} from './type-visual'

describe('getNotificationTypeVisual', () => {
  it('heartbeat は AlarmClock + red', () => {
    const v = getNotificationTypeVisual('heartbeat')
    expect(v.iconKey).toBe<NotificationIconKey>('alarm')
    expect(v.label).toBe('期限近接')
    expect(v.bgClass).toContain('red')
    expect(v.textClass).toContain('red')
  })

  it('mention は AtSign + blue', () => {
    const v = getNotificationTypeVisual('mention')
    expect(v.iconKey).toBe<NotificationIconKey>('at-sign')
    expect(v.label).toBe('メンション')
    expect(v.bgClass).toContain('blue')
  })

  it('invite は UserPlus + emerald', () => {
    const v = getNotificationTypeVisual('invite')
    expect(v.iconKey).toBe<NotificationIconKey>('user-plus')
    expect(v.label).toBe('招待')
    expect(v.bgClass).toContain('emerald')
  })

  it('sync-failure は AlertCircle + amber', () => {
    const v = getNotificationTypeVisual('sync-failure')
    expect(v.iconKey).toBe<NotificationIconKey>('alert-circle')
    expect(v.label).toBe('同期失敗')
    expect(v.bgClass).toContain('amber')
  })

  it('未知 type は unknown (Bell + zinc) fallback', () => {
    const v = getNotificationTypeVisual('agent-result')
    expect(v.iconKey).toBe<NotificationIconKey>('bell')
    expect(v.label).toBe('通知')
    expect(v.bgClass).toContain('zinc')
  })

  it('null / undefined / 空文字も unknown fallback', () => {
    expect(getNotificationTypeVisual(null).iconKey).toBe('bell')
    expect(getNotificationTypeVisual(undefined).iconKey).toBe('bell')
    expect(getNotificationTypeVisual('').iconKey).toBe('bell')
  })

  it('既知 type list は heartbeat / mention / invite / sync-failure の 4 種', () => {
    expect(KNOWN_NOTIFICATION_TYPES.sort()).toEqual(
      ['heartbeat', 'invite', 'mention', 'sync-failure'].sort(),
    )
  })

  it('全 既知 type が non-zinc な配色 (= 識別可能)', () => {
    for (const t of KNOWN_NOTIFICATION_TYPES) {
      const v = getNotificationTypeVisual(t)
      expect(v.bgClass).not.toContain('zinc')
      expect(v.textClass).not.toContain('zinc')
    }
  })
})
