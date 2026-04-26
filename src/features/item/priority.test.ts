import { describe, expect, it } from 'vitest'

import { priorityClass, priorityLabel } from './priority'

describe('priority helpers', () => {
  it('priorityClass: 各 priority に対応する Tailwind class を返す', () => {
    expect(priorityClass(1)).toBe('bg-red-500')
    expect(priorityClass(2)).toBe('bg-amber-500')
    expect(priorityClass(3)).toBe('bg-blue-500')
    expect(priorityClass(4)).toBe('bg-slate-400')
  })

  it('priorityClass: null / undefined / 範囲外は p4 (slate) にフォールバック', () => {
    expect(priorityClass(null)).toBe('bg-slate-400')
    expect(priorityClass(undefined)).toBe('bg-slate-400')
    expect(priorityClass(99)).toBe('bg-slate-400')
  })

  it('priorityLabel: SR 向け日本語ラベルを返す', () => {
    expect(priorityLabel(1)).toBe('優先度: 最優先 (p1)')
    expect(priorityLabel(2)).toBe('優先度: 高 (p2)')
    expect(priorityLabel(3)).toBe('優先度: 中 (p3)')
    expect(priorityLabel(4)).toBe('優先度: 低 (p4)')
  })

  it('priorityLabel: null / undefined は p4 (低) として扱う', () => {
    expect(priorityLabel(null)).toBe('優先度: 低 (p4)')
    expect(priorityLabel(undefined)).toBe('優先度: 低 (p4)')
  })
})
