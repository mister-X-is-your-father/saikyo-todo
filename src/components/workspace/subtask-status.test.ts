/**
 * Phase 6.15 iter — subtask-status.ts pure helper の単体テスト。
 *
 * 既知 key (todo / in_progress / done / cancelled / blocked) と未知 key の
 * 両方を網羅する。class 文字列の細部はリファクタで揺れるので、ラベルと
 * iconKey は厳密、class は「どの色系統か」を contains で確認する。
 */
import { describe, expect, it } from 'vitest'

import {
  getSubtaskStatusConfig,
  KNOWN_SUBTASK_STATUS_KEYS,
  type SubtaskIconKey,
} from './subtask-status'

describe('getSubtaskStatusConfig', () => {
  it('todo は slate 系 + circle icon', () => {
    const c = getSubtaskStatusConfig('todo')
    expect(c.label).toContain('TODO')
    expect(c.iconKey).toBe<SubtaskIconKey>('circle')
    expect(c.bgClass).toContain('slate')
    expect(c.textClass).toContain('slate')
  })

  it('in_progress は blue 系 + progress icon', () => {
    const c = getSubtaskStatusConfig('in_progress')
    expect(c.label).toBe('進行中')
    expect(c.iconKey).toBe<SubtaskIconKey>('progress')
    expect(c.bgClass).toContain('blue')
    expect(c.textClass).toContain('blue')
  })

  it('done は green 系 + done icon', () => {
    const c = getSubtaskStatusConfig('done')
    expect(c.label).toBe('完了')
    expect(c.iconKey).toBe<SubtaskIconKey>('done')
    expect(c.bgClass).toContain('green')
    expect(c.textClass).toContain('green')
  })

  it('cancelled は zinc 系 + cancel icon + line-through', () => {
    const c = getSubtaskStatusConfig('cancelled')
    expect(c.label).toBe('キャンセル')
    expect(c.iconKey).toBe<SubtaskIconKey>('cancel')
    expect(c.textClass).toContain('line-through')
  })

  it('blocked は amber 系 + block icon', () => {
    const c = getSubtaskStatusConfig('blocked')
    expect(c.iconKey).toBe<SubtaskIconKey>('block')
    expect(c.bgClass).toContain('amber')
    expect(c.label).toContain('依存待ち')
  })

  it('未知 key は unknown config に fallback', () => {
    const c = getSubtaskStatusConfig('custom-foo-bar')
    expect(c.label).toBe('不明')
    expect(c.iconKey).toBe<SubtaskIconKey>('unknown')
    expect(c.bgClass).toContain('zinc')
  })

  it('null / undefined / 空文字も unknown config に fallback (落ちない)', () => {
    expect(getSubtaskStatusConfig(null).iconKey).toBe<SubtaskIconKey>('unknown')
    expect(getSubtaskStatusConfig(undefined).iconKey).toBe<SubtaskIconKey>('unknown')
    expect(getSubtaskStatusConfig('').iconKey).toBe<SubtaskIconKey>('unknown')
  })

  it('KNOWN_SUBTASK_STATUS_KEYS は 5 件 (todo/in_progress/done/cancelled/blocked)', () => {
    expect(KNOWN_SUBTASK_STATUS_KEYS).toHaveLength(5)
    expect(KNOWN_SUBTASK_STATUS_KEYS).toContain('todo')
    expect(KNOWN_SUBTASK_STATUS_KEYS).toContain('in_progress')
    expect(KNOWN_SUBTASK_STATUS_KEYS).toContain('done')
    expect(KNOWN_SUBTASK_STATUS_KEYS).toContain('cancelled')
    expect(KNOWN_SUBTASK_STATUS_KEYS).toContain('blocked')
  })

  it('全既知 key で iconKey が unknown 以外であること', () => {
    for (const k of KNOWN_SUBTASK_STATUS_KEYS) {
      const c = getSubtaskStatusConfig(k)
      expect(c.iconKey).not.toBe<SubtaskIconKey>('unknown')
    }
  })
})
