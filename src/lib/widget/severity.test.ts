import { describe, expect, it } from 'vitest'

import {
  severityChipClass,
  severityClasses,
  severityFromAchievement,
  severityFromOverdueDays,
  severityFromRatio,
  severityToChipTone3,
} from './severity'

describe('severityFromRatio', () => {
  it('actual / expected ≤ 1.1 → ok', () => {
    expect(severityFromRatio(60, 60)).toBe('ok')
    expect(severityFromRatio(65, 60)).toBe('ok') // 1.083
    expect(severityFromRatio(66, 60)).toBe('ok') // 1.1 boundary
  })

  it('1.1 < ratio ≤ 1.5 → warn', () => {
    expect(severityFromRatio(70, 60)).toBe('warn') // 1.166
    expect(severityFromRatio(90, 60)).toBe('warn') // 1.5 boundary
  })

  it('ratio > 1.5 → danger', () => {
    expect(severityFromRatio(91, 60)).toBe('danger')
    expect(severityFromRatio(180, 60)).toBe('danger')
  })

  it('expected ≤ 0 → muted', () => {
    expect(severityFromRatio(45, 0)).toBe('muted')
    expect(severityFromRatio(45, -10)).toBe('muted')
  })

  it('actual = 0, expected > 0 → muted (未実行)', () => {
    expect(severityFromRatio(0, 60)).toBe('muted')
  })

  it('thresholds で境界 override 可能', () => {
    // ratio = 64/60 = 1.0666... default (warn=1.1) では ok、override warn=1.05 では warn
    expect(severityFromRatio(64, 60, { warn: 1.05 })).toBe('warn')
    expect(severityFromRatio(64, 60)).toBe('ok')
    // ratio = 75/60 = 1.25 default (danger=1.5) では warn、override danger=1.2 では danger
    expect(severityFromRatio(75, 60, { warn: 1.05, danger: 1.2 })).toBe('danger')
  })
})

describe('severityFromOverdueDays', () => {
  it('マイナス (余裕あり) → ok', () => {
    expect(severityFromOverdueDays(-1)).toBe('ok')
    expect(severityFromOverdueDays(-7)).toBe('ok')
  })

  it('0 日 (今日) → info', () => {
    expect(severityFromOverdueDays(0)).toBe('info')
  })

  it('1–3 日 overdue → warn', () => {
    expect(severityFromOverdueDays(1)).toBe('warn')
    expect(severityFromOverdueDays(3)).toBe('warn')
  })

  it('4 日以上 overdue → danger', () => {
    expect(severityFromOverdueDays(4)).toBe('danger')
    expect(severityFromOverdueDays(30)).toBe('danger')
  })
})

describe('severityFromAchievement', () => {
  it('0 → muted (未着手)', () => {
    expect(severityFromAchievement(0)).toBe('muted')
  })

  it('0 < rate < 0.6 → danger', () => {
    expect(severityFromAchievement(0.1)).toBe('danger')
    expect(severityFromAchievement(0.59)).toBe('danger')
  })

  it('0.6 ≤ rate < 0.9 → warn', () => {
    expect(severityFromAchievement(0.6)).toBe('warn')
    expect(severityFromAchievement(0.89)).toBe('warn')
  })

  it('0.9 ≤ rate → ok', () => {
    expect(severityFromAchievement(0.9)).toBe('ok')
    expect(severityFromAchievement(1.0)).toBe('ok')
    expect(severityFromAchievement(1.5)).toBe('ok') // > 1 (超過達成) も ok
  })
})

describe('severityClasses', () => {
  it('5 severity 全てに class set がある', () => {
    for (const s of ['ok', 'info', 'warn', 'danger', 'muted'] as const) {
      const c = severityClasses(s)
      expect(c.border).toMatch(/^border-/)
      expect(c.bg).toMatch(/^bg-/)
      expect(c.text).toMatch(/^text-/)
      expect(c.ring).toBeDefined()
    }
  })

  it('ok = emerald 系、warn = amber 系、danger = rose 系', () => {
    expect(severityClasses('ok').text).toContain('emerald')
    expect(severityClasses('warn').text).toContain('amber')
    expect(severityClasses('danger').text).toContain('rose')
  })
})

describe('severityToChipTone3 (legacy bridge)', () => {
  it('ok → good', () => {
    expect(severityToChipTone3('ok')).toBe('good')
  })

  it('warn / danger → warn (lossy 縮約)', () => {
    expect(severityToChipTone3('warn')).toBe('warn')
    expect(severityToChipTone3('danger')).toBe('warn')
  })

  it('info / muted → neutral', () => {
    expect(severityToChipTone3('info')).toBe('neutral')
    expect(severityToChipTone3('muted')).toBe('neutral')
  })
})

describe('severityChipClass', () => {
  it('5 severity すべてで bg + text + border の Tailwind class string を返す', () => {
    const all: ReadonlyArray<'ok' | 'info' | 'warn' | 'danger' | 'muted'> = [
      'ok',
      'info',
      'warn',
      'danger',
      'muted',
    ]
    for (const s of all) {
      const cls = severityChipClass(s)
      expect(cls).toMatch(/bg-/)
      expect(cls).toMatch(/text-/)
      expect(cls).toMatch(/border-/)
    }
  })

  it('severityClasses と同じ class 値を含む (連結のみで lossless)', () => {
    const c = severityClasses('warn')
    const joined = severityChipClass('warn')
    expect(joined).toContain(c.bg)
    expect(joined).toContain(c.text)
    expect(joined).toContain(c.border)
  })

  it('ring class は含まない (focus 用なので chip 静的配色には不要)', () => {
    const cls = severityChipClass('ok')
    expect(cls).not.toContain('ring-')
  })
})
