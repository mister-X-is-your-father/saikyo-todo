/**
 * iter485 chip-tone の unit test。pure helper のみ、DOM / domain 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  type ChipTone,
  chipToneAttentionRank,
  compareChipTones,
  getChipToneClasses,
} from './chip-tone'

describe('getChipToneClasses', () => {
  it('6 tone × 3 軸の class が定まっている (iter486 で success 追加)', () => {
    const tones: ChipTone[] = ['danger', 'urgent', 'warn', 'info', 'idle', 'success']
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

  it('success → emerald 薄 (達成 / 余裕 / 完了 / 健全、severity 軸と直交)', () => {
    const c = getChipToneClasses('success')
    expect(c.bgClass).toBe('bg-emerald-50')
    expect(c.textClass).toBe('text-emerald-700')
    expect(c.ringClass).toBe('ring-emerald-200')
  })
})

describe('chipToneAttentionRank (sort 用 attention 数値)', () => {
  it('danger=5 / urgent=4 / warn=3 / info=2 / idle=1 / success=0 (= 危ない順)', () => {
    expect(chipToneAttentionRank('danger')).toBe(5)
    expect(chipToneAttentionRank('urgent')).toBe(4)
    expect(chipToneAttentionRank('warn')).toBe(3)
    expect(chipToneAttentionRank('info')).toBe(2)
    expect(chipToneAttentionRank('idle')).toBe(1)
    expect(chipToneAttentionRank('success')).toBe(0)
  })
})

describe('compareChipTones (sort comparator、危ない順)', () => {
  it('danger > urgent > warn > info > idle > success の順で sort', () => {
    const tones: ChipTone[] = ['idle', 'danger', 'success', 'warn', 'urgent', 'info']
    const sorted = [...tones].sort(compareChipTones)
    expect(sorted).toEqual(['danger', 'urgent', 'warn', 'info', 'idle', 'success'])
  })

  it('同 tone は元順保持 (stable sort)', () => {
    const tones: ChipTone[] = ['warn', 'warn', 'danger', 'warn']
    const sorted = [...tones].sort(compareChipTones)
    expect(sorted).toEqual(['danger', 'warn', 'warn', 'warn'])
  })
})
