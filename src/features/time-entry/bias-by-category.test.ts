import { describe, expect, it } from 'vitest'

import {
  computeBiasByCategory,
  formatTopSkewedCategoryJa,
  selectBiasSamplesByCategory,
} from './bias-by-category'
import { buildItemDescriptionLookup } from './bias-selector'
import type { TimeEntry } from './schema'

// --- minimal TimeEntry fixture (schema は createSelectSchema 由来で多列だが
// 集計ヘルパは category / itemId / durationMinutes しか触らないので残りは空文字列等で埋める) ---
const baseEntry = (overrides: Partial<TimeEntry>): TimeEntry =>
  ({
    id: 'tt-' + Math.random().toString(36).slice(2, 10),
    workspaceId: 'ws-1',
    userId: 'u-1',
    itemId: null,
    workDate: '2026-04-25',
    category: 'dev',
    description: '',
    durationMinutes: 30,
    idempotencyKey: '00000000-0000-0000-0000-000000000000',
    createdAt: new Date('2026-04-25T08:00:00Z'),
    updatedAt: new Date('2026-04-25T08:00:00Z'),
    deletedAt: null,
    ...overrides,
  }) as unknown as TimeEntry

const lookup = (pairs: Array<[string, string | null]>) =>
  buildItemDescriptionLookup(pairs.map(([id, description]) => ({ id, description })))

describe('selectBiasSamplesByCategory', () => {
  it('全 5 category を空配列で初期化する', () => {
    const out = selectBiasSamplesByCategory([], lookup([]))
    expect(out.dev).toEqual([])
    expect(out.meeting).toEqual([])
    expect(out.research).toEqual([])
    expect(out.ops).toEqual([])
    expect(out.other).toEqual([])
  })

  it('itemId null の entry は除外する', () => {
    const entries = [
      baseEntry({ category: 'dev', itemId: null, durationMinutes: 60 }),
      baseEntry({ category: 'dev', itemId: 'i1', durationMinutes: 30 }),
    ]
    const out = selectBiasSamplesByCategory(entries, lookup([['i1', '見積: 30分']]))
    expect(out.dev).toHaveLength(1)
    expect(out.dev[0]).toEqual({ actualMinutes: 30, estimateMinutes: 30 })
  })

  it('category ごとに振り分け、estimate を description から抽出する', () => {
    const entries = [
      baseEntry({ category: 'dev', itemId: 'i1', durationMinutes: 60 }),
      baseEntry({ category: 'meeting', itemId: 'i2', durationMinutes: 30 }),
      baseEntry({ category: 'meeting', itemId: 'i2', durationMinutes: 25 }),
    ]
    const out = selectBiasSamplesByCategory(
      entries,
      lookup([
        ['i1', '実装タスク 見積: 30分'],
        ['i2', '相談 見積: 30分'],
      ]),
    )
    expect(out.dev).toEqual([{ actualMinutes: 60, estimateMinutes: 30 }])
    expect(out.meeting).toEqual([
      { actualMinutes: 30, estimateMinutes: 30 },
      { actualMinutes: 25, estimateMinutes: 30 },
    ])
    expect(out.research).toEqual([])
  })

  it('description に見積が無ければ estimateMinutes=null で残す (件数は数える)', () => {
    const entries = [baseEntry({ category: 'ops', itemId: 'i1', durationMinutes: 15 })]
    const out = selectBiasSamplesByCategory(entries, lookup([['i1', null]]))
    expect(out.ops).toEqual([{ actualMinutes: 15, estimateMinutes: null }])
  })

  it('未知 category は other に倒す (defensive)', () => {
    const entries = [
      baseEntry({
        category: 'unknown-category' as unknown as TimeEntry['category'],
        itemId: 'i1',
        durationMinutes: 10,
      }),
    ]
    const out = selectBiasSamplesByCategory(entries, lookup([['i1', '見積: 10分']]))
    expect(out.other).toHaveLength(1)
    expect(out.dev).toEqual([])
  })
})

describe('computeBiasByCategory', () => {
  it('全 category 分の EstimateBiasReport を返す (空 category は unknown)', () => {
    const entries = [baseEntry({ category: 'dev', itemId: 'i1', durationMinutes: 30 })]
    const out = computeBiasByCategory(entries, lookup([['i1', '見積: 30分']]))
    expect(out.dev.totalCount).toBe(1)
    expect(out.dev.tendency).toBe('unknown') // 1 sample < MIN_SAMPLES_FOR_TENDENCY=3
    expect(out.meeting.tendency).toBe('unknown')
    expect(out.meeting.totalCount).toBe(0)
  })

  it('十分な sample があれば category ごとに tendency を出す', () => {
    // dev: 5 件すべて 2× 過小評価 (見積 30 分→ actual 60 分)
    const devEntries = Array.from({ length: 5 }, () =>
      baseEntry({ category: 'dev', itemId: 'i1', durationMinutes: 60 }),
    )
    // meeting: 5 件すべて見積通り (見積 30 分→ actual 30 分)
    const meetingEntries = Array.from({ length: 5 }, () =>
      baseEntry({ category: 'meeting', itemId: 'i2', durationMinutes: 30 }),
    )
    const out = computeBiasByCategory(
      [...devEntries, ...meetingEntries],
      lookup([
        ['i1', '見積: 30分'],
        ['i2', '見積: 30分'],
      ]),
    )
    expect(out.dev.tendency).toBe('underestimating')
    expect(out.dev.calibrationFactor).toBe(2)
    expect(out.meeting.tendency).toBe('on-track')
  })
})

describe('formatTopSkewedCategoryJa', () => {
  const emptyReport = computeBiasByCategory([], lookup([]))

  it('歪みが無ければ null', () => {
    expect(formatTopSkewedCategoryJa(emptyReport)).toBeNull()
  })

  it('underestimating の category を 1 行で返す', () => {
    const devEntries = Array.from({ length: 5 }, () =>
      baseEntry({ category: 'dev', itemId: 'i1', durationMinutes: 60 }),
    )
    const r = computeBiasByCategory(devEntries, lookup([['i1', '見積: 30分']]))
    expect(formatTopSkewedCategoryJa(r)).toBe('開発: 見積を 2.00× 過小評価しがち (5 件)')
  })

  it('overestimating の category も拾う', () => {
    const opsEntries = Array.from({ length: 5 }, () =>
      baseEntry({ category: 'ops', itemId: 'i1', durationMinutes: 30 }),
    )
    const r = computeBiasByCategory(opsEntries, lookup([['i1', '見積: 60分']]))
    expect(formatTopSkewedCategoryJa(r)).toBe('運用: 見積を 0.50× 過大評価しがち (5 件)')
  })

  it('複数 category 歪みのうち distance が最大のものを優先', () => {
    const devEntries = Array.from({ length: 5 }, () =>
      baseEntry({ category: 'dev', itemId: 'i1', durationMinutes: 45 }),
    )
    const opsEntries = Array.from({ length: 5 }, () =>
      baseEntry({ category: 'ops', itemId: 'i2', durationMinutes: 90 }),
    )
    const r = computeBiasByCategory(
      [...devEntries, ...opsEntries],
      lookup([
        ['i1', '見積: 30分'],
        ['i2', '見積: 30分'],
      ]),
    )
    // dev factor=1.5, ops factor=3.0 → ops が distance 大
    expect(formatTopSkewedCategoryJa(r)).toBe('運用: 見積を 3.00× 過小評価しがち (5 件)')
  })

  it('on-track / mixed / unknown は除外する', () => {
    const meetingEntries = Array.from({ length: 5 }, () =>
      baseEntry({ category: 'meeting', itemId: 'i2', durationMinutes: 30 }),
    )
    const r = computeBiasByCategory(meetingEntries, lookup([['i2', '見積: 30分']]))
    expect(r.meeting.tendency).toBe('on-track')
    expect(formatTopSkewedCategoryJa(r)).toBeNull()
  })
})
