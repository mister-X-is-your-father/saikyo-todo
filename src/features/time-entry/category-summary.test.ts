/**
 * iter307 ai-automation: category-summary pure helper の単体検証。
 */
import { describe, expect, it } from 'vitest'

import {
  type CategorySummaryEntry,
  formatCategorySummary,
  formatMinutes,
  groupTimeEntriesByCategory,
  totalCategoryMinutes,
} from './category-summary'

const e = (
  overrides: Partial<CategorySummaryEntry> & Pick<CategorySummaryEntry, 'durationMinutes'>,
): CategorySummaryEntry => ({
  workDate: '2026-04-27',
  category: 'dev',
  ...overrides,
})

describe('groupTimeEntriesByCategory — 集計', () => {
  it('全 5 カテゴリを 0 で初期化', () => {
    const totals = groupTimeEntriesByCategory([])
    expect(totals).toEqual({ dev: 0, meeting: 0, research: 0, ops: 0, other: 0 })
  })

  it('同 category を sum、異 category は分離', () => {
    const totals = groupTimeEntriesByCategory([
      e({ category: 'dev', durationMinutes: 60 }),
      e({ category: 'dev', durationMinutes: 30 }),
      e({ category: 'meeting', durationMinutes: 45 }),
    ])
    expect(totals.dev).toBe(90)
    expect(totals.meeting).toBe(45)
    expect(totals.research).toBe(0)
  })

  it('未知 category は other に集約', () => {
    const totals = groupTimeEntriesByCategory([
      e({ category: 'unknown-cat', durationMinutes: 30 }),
      e({ category: '', durationMinutes: 15 }),
      e({ category: 'other', durationMinutes: 60 }),
    ])
    expect(totals.other).toBe(105)
  })

  it('不正 durationMinutes (NaN / 負 / Infinity) は 0 加算', () => {
    const totals = groupTimeEntriesByCategory([
      e({ category: 'dev', durationMinutes: Number.NaN }),
      e({ category: 'dev', durationMinutes: -30 }),
      e({ category: 'dev', durationMinutes: Number.POSITIVE_INFINITY }),
      e({ category: 'dev', durationMinutes: 60 }),
    ])
    expect(totals.dev).toBe(60)
  })
})

describe('groupTimeEntriesByCategory — 範囲フィルタ', () => {
  const entries: CategorySummaryEntry[] = [
    e({ workDate: '2026-04-25', category: 'dev', durationMinutes: 30 }),
    e({ workDate: '2026-04-26', category: 'dev', durationMinutes: 60 }),
    e({ workDate: '2026-04-27', category: 'dev', durationMinutes: 90 }),
    e({ workDate: '2026-04-28', category: 'dev', durationMinutes: 120 }),
  ]

  it('from のみで下限 inclusive', () => {
    expect(groupTimeEntriesByCategory(entries, { from: '2026-04-27' }).dev).toBe(90 + 120)
  })

  it('to のみで上限 inclusive', () => {
    expect(groupTimeEntriesByCategory(entries, { to: '2026-04-26' }).dev).toBe(30 + 60)
  })

  it('from + to で範囲指定', () => {
    expect(groupTimeEntriesByCategory(entries, { from: '2026-04-26', to: '2026-04-27' }).dev).toBe(
      60 + 90,
    )
  })

  it('範囲外は 0 件 (from > to)', () => {
    expect(groupTimeEntriesByCategory(entries, { from: '2026-05-01', to: '2026-05-31' }).dev).toBe(
      0,
    )
  })
})

describe('formatMinutes', () => {
  it('60 未満は "Nmin"', () => {
    expect(formatMinutes(0)).toBe('0min')
    expect(formatMinutes(15)).toBe('15min')
    expect(formatMinutes(59)).toBe('59min')
  })

  it('60 以上の整時は "Nh"', () => {
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(120)).toBe('2h')
  })

  it('時 + 分の混在は "Nh Mmin"', () => {
    expect(formatMinutes(90)).toBe('1h 30min')
    expect(formatMinutes(135)).toBe('2h 15min')
  })

  it('NaN / 負 / Infinity は 0min', () => {
    expect(formatMinutes(Number.NaN)).toBe('0min')
    expect(formatMinutes(-30)).toBe('0min')
    expect(formatMinutes(Number.POSITIVE_INFINITY)).toBe('0min')
  })

  it('小数は round で整数に', () => {
    expect(formatMinutes(59.4)).toBe('59min')
    expect(formatMinutes(59.6)).toBe('1h')
  })
})

describe('formatCategorySummary', () => {
  it('全カテゴリ非ゼロは固定順で連結', () => {
    expect(formatCategorySummary({ dev: 240, meeting: 60, research: 30, ops: 90, other: 15 })).toBe(
      '開発 4時間 / MTG 1時間 / 調査 30分 / 運用 1時間30分 / その他 15分',
    )
  })

  it('hideZero (default) で 0 件は省略', () => {
    expect(formatCategorySummary({ dev: 60, meeting: 0, research: 30, ops: 0, other: 0 })).toBe(
      '開発 1時間 / 調査 30分',
    )
  })

  it('hideZero=false で 0 件も含めて全 5 カテゴリ表示', () => {
    expect(
      formatCategorySummary(
        { dev: 60, meeting: 0, research: 30, ops: 0, other: 0 },
        { hideZero: false },
      ),
    ).toBe('開発 1時間 / MTG 0分 / 調査 30分 / 運用 0分 / その他 0分')
  })

  it('全 0 → "0 件"', () => {
    expect(formatCategorySummary({ dev: 0, meeting: 0, research: 0, ops: 0, other: 0 })).toBe(
      '0 件',
    )
  })

  it('単一カテゴリでも順序を保つ (other のみ)', () => {
    expect(formatCategorySummary({ dev: 0, meeting: 0, research: 0, ops: 0, other: 30 })).toBe(
      'その他 30分',
    )
  })

  it('カテゴリ順は dev → meeting → research → ops → other (KEY_ORDER 固定)', () => {
    // 全カテゴリ 1min ずつで順序確認
    const totals = { dev: 1, meeting: 1, research: 1, ops: 1, other: 1 }
    expect(formatCategorySummary(totals)).toBe(
      '開発 1分 / MTG 1分 / 調査 1分 / 運用 1分 / その他 1分',
    )
  })
})

describe('totalCategoryMinutes', () => {
  it('全カテゴリの合計を返す', () => {
    expect(totalCategoryMinutes({ dev: 60, meeting: 30, research: 15, ops: 45, other: 0 })).toBe(
      150,
    )
  })

  it('全 0 は 0', () => {
    expect(totalCategoryMinutes({ dev: 0, meeting: 0, research: 0, ops: 0, other: 0 })).toBe(0)
  })
})

describe('集計 + フォーマット 統合', () => {
  it('groupTimeEntriesByCategory → formatCategorySummary が正しく繋がる', () => {
    const entries: CategorySummaryEntry[] = [
      e({ category: 'dev', durationMinutes: 240 }),
      e({ category: 'meeting', durationMinutes: 60 }),
      e({ category: 'research', durationMinutes: 30 }),
    ]
    const totals = groupTimeEntriesByCategory(entries)
    expect(formatCategorySummary(totals)).toBe('開発 4時間 / MTG 1時間 / 調査 30分')
    expect(totalCategoryMinutes(totals)).toBe(330) // 4h + 1h + 30min = 5h 30min
  })
})
