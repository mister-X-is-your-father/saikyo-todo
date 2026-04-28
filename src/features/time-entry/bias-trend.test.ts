import { describe, expect, it } from 'vitest'

import type { EstimateBiasReport } from './bias'
import { buildItemDescriptionLookup } from './bias-selector'
import {
  computeBiasTrend,
  formatBiasTrendBadge,
  formatBiasTrendJa,
  splitSamplesByDate,
} from './bias-trend'
import type { TimeEntry } from './schema'

// iter270 refactor: 元実装は `as unknown as TimeEntry` の二重 cast に頼っていたが
// TimeEntry の実フィールドと fixture を揃えれば直接代入できる (idempotencyKey は
// schema 側に存在しないので削除、syncStatus / syncAttempts / syncError /
// externalRef / version を schema (mutationMarkers + timestamps) と一致させた)。
const entry = (overrides: Partial<TimeEntry>): TimeEntry => ({
  id: 'tt-' + Math.random().toString(36).slice(2, 10),
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
  createdAt: new Date('2026-04-25T08:00:00Z'),
  updatedAt: new Date('2026-04-25T08:00:00Z'),
  deletedAt: null,
  version: 0,
  ...overrides,
})

const report = (overrides: Partial<EstimateBiasReport>): EstimateBiasReport => ({
  totalCount: 5,
  withEstimateCount: 5,
  underCount: 0,
  onCount: 0,
  overCount: 5,
  medianRatio: null,
  meanRatio: null,
  calibrationFactor: null,
  tendency: 'unknown',
  summary: '',
  ...overrides,
})

describe('splitSamplesByDate', () => {
  const lookup = buildItemDescriptionLookup([{ id: 'i1', description: '見積: 30分' }])

  it('workDate < splitISO は prior、それ以降は recent', () => {
    const entries = [
      entry({ workDate: '2026-04-01', itemId: 'i1', durationMinutes: 60 }),
      entry({ workDate: '2026-04-15', itemId: 'i1', durationMinutes: 50 }),
      entry({ workDate: '2026-04-20', itemId: 'i1', durationMinutes: 30 }),
      entry({ workDate: '2026-04-25', itemId: 'i1', durationMinutes: 35 }),
    ]
    const out = splitSamplesByDate(entries, lookup, '2026-04-20')
    expect(out.prior).toHaveLength(2)
    expect(out.recent).toHaveLength(2)
    expect(out.prior.map((s) => s.actualMinutes)).toEqual([60, 50])
    expect(out.recent.map((s) => s.actualMinutes)).toEqual([30, 35])
  })

  it('itemId null は両期間とも除外', () => {
    const entries = [
      entry({ workDate: '2026-04-01', itemId: null }),
      entry({ workDate: '2026-04-25', itemId: null }),
    ]
    const out = splitSamplesByDate(entries, lookup, '2026-04-20')
    expect(out.prior).toEqual([])
    expect(out.recent).toEqual([])
  })

  it('境界の splitISO は recent 側', () => {
    const entries = [
      entry({ workDate: '2026-04-19', itemId: 'i1', durationMinutes: 30 }),
      entry({ workDate: '2026-04-20', itemId: 'i1', durationMinutes: 30 }),
    ]
    const out = splitSamplesByDate(entries, lookup, '2026-04-20')
    expect(out.prior).toHaveLength(1)
    expect(out.recent).toHaveLength(1)
  })
})

describe('computeBiasTrend', () => {
  it('factor の距離が大きく縮まれば improving', () => {
    const prior = report({ calibrationFactor: 1.5 })
    const recent = report({ calibrationFactor: 1.2 })
    const t = computeBiasTrend(recent, prior)
    expect(t.direction).toBe('improving')
    expect(t.priorFactor).toBe(1.5)
    expect(t.recentFactor).toBe(1.2)
    // distance: 0.5 → 0.2、delta = 0.3
    expect(t.distanceDelta).toBeCloseTo(0.3)
  })

  it('factor の距離が大きく開けば worsening', () => {
    const prior = report({ calibrationFactor: 1.1 })
    const recent = report({ calibrationFactor: 1.5 })
    const t = computeBiasTrend(recent, prior)
    expect(t.direction).toBe('worsening')
    expect(t.distanceDelta).toBeCloseTo(-0.4)
  })

  it('factor 距離変化が ±0.05 未満なら stable', () => {
    const prior = report({ calibrationFactor: 1.2 })
    const recent = report({ calibrationFactor: 1.22 })
    const t = computeBiasTrend(recent, prior)
    expect(t.direction).toBe('stable')
  })

  it('over 側でも改善判定が効く (1.0 に近付くか)', () => {
    const prior = report({ calibrationFactor: 0.5 }) // 距離 0.5
    const recent = report({ calibrationFactor: 0.8 }) // 距離 0.2
    const t = computeBiasTrend(recent, prior)
    expect(t.direction).toBe('improving')
  })

  it('over 側で 0.8 → 0.5 は worsening', () => {
    const prior = report({ calibrationFactor: 0.8 })
    const recent = report({ calibrationFactor: 0.5 })
    const t = computeBiasTrend(recent, prior)
    expect(t.direction).toBe('worsening')
  })

  it('片方 calibrationFactor が null なら inconclusive', () => {
    const prior = report({ calibrationFactor: 1.5 })
    const recent = report({ calibrationFactor: null })
    expect(computeBiasTrend(recent, prior).direction).toBe('inconclusive')
    expect(computeBiasTrend(prior, recent).direction).toBe('inconclusive')
  })

  it('両方 null は inconclusive で priorFactor / recentFactor も null', () => {
    const t = computeBiasTrend(report({}), report({}))
    expect(t.direction).toBe('inconclusive')
    expect(t.priorFactor).toBeNull()
    expect(t.recentFactor).toBeNull()
    expect(t.distanceDelta).toBeNull()
  })

  it('side が逆 (under → over) でも 1.0 を跨ぐ改善は improving', () => {
    const prior = report({ calibrationFactor: 1.4 }) // 距離 0.4
    const recent = report({ calibrationFactor: 0.9 }) // 距離 0.1
    const t = computeBiasTrend(recent, prior)
    expect(t.direction).toBe('improving')
  })
})

describe('formatBiasTrendJa', () => {
  it('improving は ja で 1 行', () => {
    const t = computeBiasTrend(
      report({ calibrationFactor: 1.2 }),
      report({ calibrationFactor: 1.5 }),
    )
    expect(formatBiasTrendJa(t)).toBe('見積精度の変化: 改善 (1.50× → 1.20×)')
  })

  it('worsening', () => {
    const t = computeBiasTrend(
      report({ calibrationFactor: 1.5 }),
      report({ calibrationFactor: 1.1 }),
    )
    expect(formatBiasTrendJa(t)).toBe('見積精度の変化: 悪化 (1.10× → 1.50×)')
  })

  it('stable', () => {
    const t = computeBiasTrend(
      report({ calibrationFactor: 1.22 }),
      report({ calibrationFactor: 1.2 }),
    )
    expect(formatBiasTrendJa(t)).toBe('見積精度の変化: 安定 (1.20× → 1.22×)')
  })

  it('inconclusive', () => {
    const t = computeBiasTrend(report({}), report({}))
    expect(formatBiasTrendJa(t)).toBe(
      '見積精度の変化: データ不足で判定不能 (各期間 3 件以上のサンプルが必要)',
    )
  })
})

// iter274 ai-automation: Slack reaction / dashboard sparkline / pm-agent prompt
// 用の最小 label。「↑ 改善」「↓ 悪化」「→ 安定」「· データ不足」
describe('formatBiasTrendBadge', () => {
  it('improving → ↑ 改善', () => {
    expect(formatBiasTrendBadge('improving')).toEqual({ glyph: '↑', label: '改善' })
  })
  it('worsening → ↓ 悪化', () => {
    expect(formatBiasTrendBadge('worsening')).toEqual({ glyph: '↓', label: '悪化' })
  })
  it('stable → → 安定', () => {
    expect(formatBiasTrendBadge('stable')).toEqual({ glyph: '→', label: '安定' })
  })
  it('inconclusive → · データ不足', () => {
    expect(formatBiasTrendBadge('inconclusive')).toEqual({ glyph: '·', label: 'データ不足' })
  })
})
