import { describe, expect, it } from 'vitest'

import { TREND_GLYPH, type TrendDirection, trendGlyph, trendToneClass } from './trend-tone'

describe('TREND_GLYPH', () => {
  it('exposes 4 universal glyphs', () => {
    expect(TREND_GLYPH).toEqual({
      up: '↑',
      down: '↓',
      flat: '→',
      idle: '·',
    })
  })

  it('trendGlyph helper returns same value for each direction', () => {
    const dirs: TrendDirection[] = ['up', 'down', 'flat', 'idle']
    for (const d of dirs) {
      expect(trendGlyph(d)).toBe(TREND_GLYPH[d])
    }
  })
})

describe('trendToneClass: positive polarity (default)', () => {
  // iter1536: source の trend tone class に dark variant 併記、expected strings を新形式に更新。
  // テスト意図 (light 配色 token + polarity 別の semantic が変わらず維持) は新形式の light 部分で satisfy。
  it('up → blue', () => {
    expect(trendToneClass('up')).toBe(
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50',
    )
    expect(trendToneClass('up', 'positive')).toBe(
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50',
    )
  })

  it('down → red', () => {
    expect(trendToneClass('down')).toBe(
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50',
    )
  })

  it('flat → muted', () => {
    expect(trendToneClass('flat')).toBe('bg-muted text-muted-foreground border-border')
  })

  it('idle → muted (same as flat)', () => {
    expect(trendToneClass('idle')).toBe('bg-muted text-muted-foreground border-border')
  })
})

describe('trendToneClass: negative polarity (cost / error 軸)', () => {
  it('up → amber (warning)', () => {
    expect(trendToneClass('up', 'negative')).toBe(
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50',
    )
  })

  it('down → emerald (improvement)', () => {
    expect(trendToneClass('down', 'negative')).toBe(
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    )
  })

  it('flat → muted (polarity 不問)', () => {
    expect(trendToneClass('flat', 'negative')).toBe('bg-muted text-muted-foreground border-border')
  })

  it('idle → muted (polarity 不問)', () => {
    expect(trendToneClass('idle', 'negative')).toBe('bg-muted text-muted-foreground border-border')
  })
})

describe('positive vs negative differ only on up/down', () => {
  it('flat / idle classes are identical regardless of polarity', () => {
    expect(trendToneClass('flat', 'positive')).toBe(trendToneClass('flat', 'negative'))
    expect(trendToneClass('idle', 'positive')).toBe(trendToneClass('idle', 'negative'))
  })

  it('up class differs between polarities (blue vs amber)', () => {
    expect(trendToneClass('up', 'positive')).not.toBe(trendToneClass('up', 'negative'))
  })

  it('down class differs between polarities (red vs emerald)', () => {
    expect(trendToneClass('down', 'positive')).not.toBe(trendToneClass('down', 'negative'))
  })
})
