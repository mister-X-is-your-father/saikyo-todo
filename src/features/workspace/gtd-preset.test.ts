import { describe, expect, it } from 'vitest'

import {
  detectGtdPresetState,
  GTD_PRESET_STATUSES,
  pickMissingGtdPresetStatuses,
} from './gtd-preset'

describe('GTD_PRESET_STATUSES', () => {
  it('5 status preset (Next/Project/Waiting/Someday/Reference)', () => {
    expect(GTD_PRESET_STATUSES.map((s) => s.key)).toEqual([
      'gtd_next',
      'gtd_project',
      'gtd_waiting',
      'gtd_someday',
      'gtd_reference',
    ])
  })

  it('order は 10 / 20 / 30 / 40 / 50 で 10 刻み (将来の挿入余地)', () => {
    expect(GTD_PRESET_STATUSES.map((s) => s.order)).toEqual([10, 20, 30, 40, 50])
  })

  it('Waiting は type=in_progress、それ以外は todo', () => {
    const waiting = GTD_PRESET_STATUSES.find((s) => s.key === 'gtd_waiting')!
    expect(waiting.type).toBe('in_progress')
    const others = GTD_PRESET_STATUSES.filter((s) => s.key !== 'gtd_waiting')
    expect(others.every((s) => s.type === 'todo')).toBe(true)
  })

  it('全 status に色 hex (Tailwind palette) が割当', () => {
    expect(GTD_PRESET_STATUSES.every((s) => /^#[0-9a-f]{6}$/.test(s.color))).toBe(true)
  })
})

describe('detectGtdPresetState', () => {
  const allKeys = GTD_PRESET_STATUSES.map((s) => s.key)

  it('全部存在 → installed', () => {
    expect(detectGtdPresetState(allKeys)).toBe('installed')
  })

  it('1 つだけ存在 → partial', () => {
    expect(detectGtdPresetState(['gtd_next'])).toBe('partial')
  })

  it('全部無し → absent', () => {
    expect(detectGtdPresetState(['todo', 'in_progress', 'done'])).toBe('absent')
  })

  it('preset 以外の status だけは absent (= 別 keys を無視)', () => {
    expect(detectGtdPresetState(['custom_a', 'custom_b'])).toBe('absent')
  })

  it('空配列 → absent', () => {
    expect(detectGtdPresetState([])).toBe('absent')
  })
})

describe('pickMissingGtdPresetStatuses', () => {
  it('全部 missing → 5 件全返却', () => {
    expect(pickMissingGtdPresetStatuses([])).toHaveLength(5)
  })

  it('一部 existing → 残りだけ返す', () => {
    const r = pickMissingGtdPresetStatuses(['gtd_next', 'gtd_project'])
    expect(r.map((s) => s.key)).toEqual(['gtd_waiting', 'gtd_someday', 'gtd_reference'])
  })

  it('全部 existing → 0 件', () => {
    const allKeys = GTD_PRESET_STATUSES.map((s) => s.key)
    expect(pickMissingGtdPresetStatuses(allKeys)).toEqual([])
  })

  it('preset 以外の key は無視 (filter 影響なし)', () => {
    const r = pickMissingGtdPresetStatuses(['todo', 'gtd_waiting'])
    expect(r.map((s) => s.key)).toEqual(['gtd_next', 'gtd_project', 'gtd_someday', 'gtd_reference'])
  })
})
