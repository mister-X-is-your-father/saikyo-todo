/**
 * iter485 chip-tone の unit test。pure helper のみ、DOM / domain 非依存。
 */
import { describe, expect, it } from 'vitest'

import { type ChipTone, getChipToneClasses } from './chip-tone'

describe('getChipToneClasses', () => {
  it('5 tone × 3 軸の class が定まっている', () => {
    const tones: ChipTone[] = ['danger', 'urgent', 'warn', 'info', 'idle']
    for (const tone of tones) {
      const c = getChipToneClasses(tone)
      expect(c.bgClass).toMatch(/^bg-/)
      expect(c.textClass).toMatch(/^text-/)
      expect(c.ringClass).toMatch(/^ring-/)
    }
  })

  it('danger → rose 系 (期限切れ / 超過 / 緊急)', () => {
    const c = getChipToneClasses('danger')
    expect(c.bgClass).toBe('bg-rose-100')
    expect(c.textClass).toBe('text-rose-700')
    expect(c.ringClass).toBe('ring-rose-300')
  })

  it('urgent (強amber) と warn (薄amber) で強弱を区別', () => {
    expect(getChipToneClasses('urgent').bgClass).toBe('bg-amber-100')
    expect(getChipToneClasses('warn').bgClass).toBe('bg-amber-50')
    expect(getChipToneClasses('urgent').textClass).toBe('text-amber-800')
    expect(getChipToneClasses('warn').textClass).toBe('text-amber-700')
  })

  it('info → blue 薄 (計画範囲内)、idle → slate 薄 (対象外)', () => {
    expect(getChipToneClasses('info').textClass).toBe('text-blue-700')
    expect(getChipToneClasses('idle').textClass).toBe('text-slate-600')
  })
})
