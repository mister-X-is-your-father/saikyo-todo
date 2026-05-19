import { describe, expect, it } from 'vitest'

import {
  dedupeRelatedResources,
  organizeRelatedResources,
  type RelatedResourceRow,
} from './related-resources-scoring'

function mk(over: Partial<RelatedResourceRow> & { resourceId: string }): RelatedResourceRow {
  return { kind: 'doc', label: `r ${over.resourceId}`, pinned: false, score: 0.5, ...over }
}

describe('organizeRelatedResources', () => {
  it('pinned + suggested の 2 段に分ける', () => {
    const rows = [
      mk({ resourceId: 'pin1', pinned: true, score: 0.1 }),
      mk({ resourceId: 's1', pinned: false, score: 0.8 }),
      mk({ resourceId: 's2', pinned: false, score: 0.6 }),
    ]
    const r = organizeRelatedResources(rows)
    expect(r.pinned.map((p) => p.resourceId)).toEqual(['pin1'])
    expect(r.suggested.map((s) => s.resourceId)).toEqual(['s1', 's2'])
    expect(r.total).toBe(3)
  })

  it('suggested は score 降順', () => {
    const rows = [
      mk({ resourceId: 'a', score: 0.5 }),
      mk({ resourceId: 'b', score: 0.9 }),
      mk({ resourceId: 'c', score: 0.7 }),
    ]
    const r = organizeRelatedResources(rows)
    expect(r.suggested.map((s) => s.resourceId)).toEqual(['b', 'c', 'a'])
  })

  it('score 閾値未満は除外 (default 0.4)', () => {
    const rows = [mk({ resourceId: 'low', score: 0.3 }), mk({ resourceId: 'high', score: 0.7 })]
    const r = organizeRelatedResources(rows)
    expect(r.suggested.map((s) => s.resourceId)).toEqual(['high'])
  })

  it('閾値 override 可能', () => {
    const rows = [mk({ resourceId: 'a', score: 0.2 })]
    const r = organizeRelatedResources(rows, { suggestedScoreThreshold: 0.1 })
    expect(r.suggested).toHaveLength(1)
  })

  it('limit で suggested を切る (pinned は無制限)', () => {
    const rows: RelatedResourceRow[] = []
    for (let i = 0; i < 15; i++) {
      rows.push(mk({ resourceId: `s${i}`, score: 0.5 + (i % 3) * 0.1 }))
    }
    const r = organizeRelatedResources(rows, { suggestedLimit: 5 })
    expect(r.suggested).toHaveLength(5)
  })

  it('byKind 別カウント', () => {
    const rows = [
      mk({ resourceId: 'a', kind: 'doc', score: 0.8 }),
      mk({ resourceId: 'b', kind: 'doc', score: 0.8 }),
      mk({ resourceId: 'c', kind: 'url', score: 0.8 }),
      mk({ resourceId: 'd', kind: 'item', pinned: true, score: 0 }),
    ]
    const r = organizeRelatedResources(rows)
    expect(r.byKind.doc).toBe(2)
    expect(r.byKind.url).toBe(1)
    expect(r.byKind.item).toBe(1)
    expect(r.byKind.comment).toBe(0)
  })

  it('pinned は score 低くても残る', () => {
    const rows = [mk({ resourceId: 'p', pinned: true, score: 0.01 })]
    const r = organizeRelatedResources(rows)
    expect(r.pinned).toHaveLength(1)
  })

  it('空 → 空の view', () => {
    const r = organizeRelatedResources([])
    expect(r.total).toBe(0)
    expect(r.byKind.doc).toBe(0)
  })
})

describe('dedupeRelatedResources', () => {
  it('同 (kind, resourceId) は 1 件にまとめる、pinned 優先', () => {
    const rows = [
      mk({ resourceId: 'd1', kind: 'doc', pinned: false, score: 0.9 }),
      mk({ resourceId: 'd1', kind: 'doc', pinned: true, score: 0.1 }),
    ]
    const r = dedupeRelatedResources(rows)
    expect(r).toHaveLength(1)
    expect(r[0]?.pinned).toBe(true)
  })

  it('kind が違えば dedup されない', () => {
    const rows = [
      mk({ resourceId: 'x', kind: 'doc', pinned: false, score: 0.9 }),
      mk({ resourceId: 'x', kind: 'url', pinned: false, score: 0.9 }),
    ]
    const r = dedupeRelatedResources(rows)
    expect(r).toHaveLength(2)
  })

  it('空 → 空', () => {
    expect(dedupeRelatedResources([])).toEqual([])
  })
})
