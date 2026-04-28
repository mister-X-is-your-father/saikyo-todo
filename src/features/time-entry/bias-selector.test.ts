import { describe, expect, it } from 'vitest'

import { buildItemDescriptionLookup, selectBiasSamples } from './bias-selector'
import type { TimeEntry } from './schema'

const entry = (overrides: Partial<TimeEntry>): TimeEntry =>
  ({
    id: 'e-' + Math.random().toString(36).slice(2),
    workspaceId: 'ws-1',
    userId: 'u-1',
    itemId: null,
    workDate: '2026-04-25',
    category: 'dev',
    description: '',
    durationMinutes: 30,
    syncStatus: 'pending',
    syncAttempts: 0,
    syncError: null,
    externalRef: null,
    createdAt: new Date('2026-04-25T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  }) as TimeEntry

describe('selectBiasSamples', () => {
  it('itemId 無しの entry は除外', () => {
    const entries = [entry({ itemId: null, durationMinutes: 30 })]
    const lookup = buildItemDescriptionLookup([])
    expect(selectBiasSamples(entries, lookup)).toEqual([])
  })

  it('item description から estimate を抽出', () => {
    const items = [{ id: 'i-1', description: '見積: 30分\n本文' }]
    const entries = [entry({ itemId: 'i-1', durationMinutes: 35 })]
    const samples = selectBiasSamples(entries, buildItemDescriptionLookup(items))
    expect(samples).toEqual([{ actualMinutes: 35, estimateMinutes: 30 }])
  })

  it('description に見積行が無ければ estimateMinutes=null (sample には残す)', () => {
    const items = [{ id: 'i-1', description: '本文だけ' }]
    const entries = [entry({ itemId: 'i-1', durationMinutes: 50 })]
    const samples = selectBiasSamples(entries, buildItemDescriptionLookup(items))
    expect(samples).toEqual([{ actualMinutes: 50, estimateMinutes: null }])
  })

  it('lookup miss (item が削除済 等) も estimateMinutes=null', () => {
    const entries = [entry({ itemId: 'i-missing', durationMinutes: 25 })]
    const samples = selectBiasSamples(entries, buildItemDescriptionLookup([]))
    expect(samples).toEqual([{ actualMinutes: 25, estimateMinutes: null }])
  })

  it('description が null でも安全に null sample を返す', () => {
    const items = [{ id: 'i-1', description: null }]
    const entries = [entry({ itemId: 'i-1', durationMinutes: 20 })]
    const samples = selectBiasSamples(entries, buildItemDescriptionLookup(items))
    expect(samples).toEqual([{ actualMinutes: 20, estimateMinutes: null }])
  })

  it('複数 entry の混在 (itemId null / lookup miss / 見積あり) を 1 pass で処理', () => {
    const items = [
      { id: 'i-1', description: '見積: 30分' },
      { id: 'i-2', description: '本文だけ' },
    ]
    const entries = [
      entry({ itemId: null, durationMinutes: 60 }), // 除外
      entry({ itemId: 'i-1', durationMinutes: 35 }), // estimate=30
      entry({ itemId: 'i-2', durationMinutes: 40 }), // estimate=null
      entry({ itemId: 'i-missing', durationMinutes: 20 }), // estimate=null
    ]
    const samples = selectBiasSamples(entries, buildItemDescriptionLookup(items))
    expect(samples).toEqual([
      { actualMinutes: 35, estimateMinutes: 30 },
      { actualMinutes: 40, estimateMinutes: null },
      { actualMinutes: 20, estimateMinutes: null },
    ])
  })

  it('同一 item の複数 entry は別 sample として保持 (集計側に任せる)', () => {
    const items = [{ id: 'i-1', description: '見積: 30分' }]
    const entries = [
      entry({ itemId: 'i-1', durationMinutes: 25 }),
      entry({ itemId: 'i-1', durationMinutes: 35 }),
      entry({ itemId: 'i-1', durationMinutes: 30 }),
    ]
    const samples = selectBiasSamples(entries, buildItemDescriptionLookup(items))
    expect(samples).toHaveLength(3)
    expect(samples.every((s) => s.estimateMinutes === 30)).toBe(true)
  })
})

describe('buildItemDescriptionLookup', () => {
  it('id → description の Map ベースの lookup を返す', () => {
    const items = [
      { id: 'a', description: 'A 本文' },
      { id: 'b', description: null },
    ]
    const lookup = buildItemDescriptionLookup(items)
    expect(lookup.get('a')).toBe('A 本文')
    expect(lookup.get('b')).toBeNull()
    expect(lookup.get('missing')).toBeUndefined()
  })
})
