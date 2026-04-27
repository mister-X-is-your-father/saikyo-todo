/**
 * Phase 6.15 iter155: Workflow cron worker の matcher (pure function) test。
 *
 * shouldFireInLastMinute は cron-parser ベースで「直近 1 分以内に発火対象だったか」を
 * 判定する。tick が毎分回るので、これが true の workflow を起動する。
 */
import { describe, expect, it } from 'vitest'

import { shouldFireInLastMinute } from './cron-worker'

describe('shouldFireInLastMinute', () => {
  it('cron が一致する分 (sec=30) は fire 対象', () => {
    // 毎日 09:00 → now=2026-01-15 09:00:30 → prev=09:00:00 (30s 前)
    const now = new Date('2026-01-15T09:00:30')
    expect(shouldFireInLastMinute('0 9 * * *', now)).toBe(true)
  })

  it('cron が一致した直後 (sec=0) も fire 対象', () => {
    const now = new Date('2026-01-15T09:00:00')
    expect(shouldFireInLastMinute('0 9 * * *', now)).toBe(true)
  })

  it('cron が一致しない分 (10:00) は fire 対象外', () => {
    // 毎日 09:00 → now=10:00 → prev=09:00 (1h 前)
    const now = new Date('2026-01-15T10:00:00')
    expect(shouldFireInLastMinute('0 9 * * *', now)).toBe(false)
  })

  it('毎分 cron は常に true', () => {
    const now = new Date('2026-01-15T09:30:15')
    expect(shouldFireInLastMinute('* * * * *', now)).toBe(true)
  })

  it('5 分おき cron — 一致分は true', () => {
    const now = new Date('2026-01-15T09:35:10') // 09:35 ちょうどの 10s 後
    expect(shouldFireInLastMinute('*/5 * * * *', now)).toBe(true)
  })

  it('5 分おき cron — 一致しない分は false', () => {
    const now = new Date('2026-01-15T09:37:00') // 09:35 と 09:40 の中間
    expect(shouldFireInLastMinute('*/5 * * * *', now)).toBe(false)
  })

  it('不正な cron 表現は false (throw しない)', () => {
    const now = new Date('2026-01-15T09:00:00')
    expect(shouldFireInLastMinute('not-a-cron', now)).toBe(false)
    expect(shouldFireInLastMinute('', now)).toBe(false)
  })
})
