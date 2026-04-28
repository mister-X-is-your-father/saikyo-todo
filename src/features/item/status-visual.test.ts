/**
 * Phase 6.15 iter — status-visual.ts pure helper の単体テスト。
 *
 * subtask-status.ts から昇格 + shortLabel 追加 + done 配色を slate→emerald に
 * 寄せた (既存 status-badge.tsx の配色と整合)。
 */
import { describe, expect, it } from 'vitest'

import {
  getStatusVisual,
  KNOWN_STATUS_KEYS,
  type StatusIconKey,
} from './status-visual'

describe('getStatusVisual', () => {
  it('todo は slate 系 + circle icon', () => {
    const c = getStatusVisual('todo')
    expect(c.label).toContain('TODO')
    expect(c.shortLabel).toBe('TODO')
    expect(c.iconKey).toBe<StatusIconKey>('circle')
    expect(c.bgClass).toContain('slate')
    expect(c.textClass).toContain('slate')
  })

  it('in_progress は blue 系 + progress icon', () => {
    const c = getStatusVisual('in_progress')
    expect(c.label).toBe('進行中')
    expect(c.shortLabel).toBe('進行中')
    expect(c.iconKey).toBe<StatusIconKey>('progress')
    expect(c.bgClass).toContain('blue')
    expect(c.textClass).toContain('blue')
  })

  it('done は emerald 系 + done icon', () => {
    const c = getStatusVisual('done')
    expect(c.label).toBe('完了')
    expect(c.iconKey).toBe<StatusIconKey>('done')
    expect(c.bgClass).toContain('emerald')
    expect(c.textClass).toContain('emerald')
  })

  it('cancelled は zinc 系 + cancel icon + line-through', () => {
    const c = getStatusVisual('cancelled')
    expect(c.label).toBe('キャンセル')
    expect(c.iconKey).toBe<StatusIconKey>('cancel')
    expect(c.textClass).toContain('line-through')
  })

  it('blocked は amber 系 + block icon + 短縮ラベル "blocked"', () => {
    const c = getStatusVisual('blocked')
    expect(c.iconKey).toBe<StatusIconKey>('block')
    expect(c.bgClass).toContain('amber')
    expect(c.label).toContain('依存待ち')
    expect(c.shortLabel).toBe('blocked')
  })

  it('未知 key は unknown config に fallback', () => {
    const c = getStatusVisual('custom-foo-bar')
    expect(c.label).toBe('不明')
    expect(c.iconKey).toBe<StatusIconKey>('unknown')
    expect(c.bgClass).toContain('zinc')
  })

  it('null / undefined / 空文字も unknown config に fallback (落ちない)', () => {
    expect(getStatusVisual(null).iconKey).toBe<StatusIconKey>('unknown')
    expect(getStatusVisual(undefined).iconKey).toBe<StatusIconKey>('unknown')
    expect(getStatusVisual('').iconKey).toBe<StatusIconKey>('unknown')
  })

  it('KNOWN_STATUS_KEYS は 5 件 (todo/in_progress/done/cancelled/blocked)', () => {
    expect(KNOWN_STATUS_KEYS).toHaveLength(5)
    expect(KNOWN_STATUS_KEYS).toContain('todo')
    expect(KNOWN_STATUS_KEYS).toContain('in_progress')
    expect(KNOWN_STATUS_KEYS).toContain('done')
    expect(KNOWN_STATUS_KEYS).toContain('cancelled')
    expect(KNOWN_STATUS_KEYS).toContain('blocked')
  })

  it('全既知 key で iconKey が unknown 以外 + shortLabel が空でない', () => {
    for (const k of KNOWN_STATUS_KEYS) {
      const c = getStatusVisual(k)
      expect(c.iconKey).not.toBe<StatusIconKey>('unknown')
      expect(c.shortLabel.length).toBeGreaterThan(0)
    }
  })
})
