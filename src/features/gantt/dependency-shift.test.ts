import { describe, expect, it } from 'vitest'

import type { CpmEdge } from './critical-path'
import {
  computeTransitiveSuccessors,
  planDependencyShift,
  type ShiftableItem,
} from './dependency-shift'

// A → B → C, A → D  (A が前提)
const EDGES: CpmEdge[] = [
  { fromId: 'A', toId: 'B' },
  { fromId: 'B', toId: 'C' },
  { fromId: 'A', toId: 'D' },
]

describe('computeTransitiveSuccessors', () => {
  it('root + 全後続を BFS 順で返す', () => {
    expect(computeTransitiveSuccessors('A', EDGES)).toEqual(['A', 'B', 'D', 'C'])
  })
  it('途中 node から → そこから先のみ', () => {
    expect(computeTransitiveSuccessors('B', EDGES)).toEqual(['B', 'C'])
  })
  it('葉 node → 自分のみ', () => {
    expect(computeTransitiveSuccessors('C', EDGES)).toEqual(['C'])
  })
  it('edge に存在しない root → 自分のみ', () => {
    expect(computeTransitiveSuccessors('Z', EDGES)).toEqual(['Z'])
  })
  it('cycle があっても停止 (重複なし)', () => {
    const cyclic: CpmEdge[] = [
      { fromId: 'X', toId: 'Y' },
      { fromId: 'Y', toId: 'X' },
    ]
    expect(computeTransitiveSuccessors('X', cyclic).sort()).toEqual(['X', 'Y'])
  })
  it('合流 (diamond) でも 1 回だけ', () => {
    // A→B, A→C, B→D, C→D
    const diamond: CpmEdge[] = [
      { fromId: 'A', toId: 'B' },
      { fromId: 'A', toId: 'C' },
      { fromId: 'B', toId: 'D' },
      { fromId: 'C', toId: 'D' },
    ]
    const r = computeTransitiveSuccessors('A', diamond)
    expect(r.filter((x) => x === 'D')).toHaveLength(1)
    expect(r.sort()).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('planDependencyShift', () => {
  const items: ShiftableItem[] = [
    { id: 'A', startDate: '2026-05-01', dueDate: '2026-05-03' },
    { id: 'B', startDate: '2026-05-04', dueDate: '2026-05-06' },
    { id: 'C', startDate: '2026-05-07', dueDate: '2026-05-09' },
    { id: 'D', startDate: null, dueDate: '2026-05-05' },
  ]

  it('root + 後続を deltaDays 平行 shift', () => {
    const r = planDependencyShift(items, 'A', EDGES, 2)
    expect(r).toHaveLength(4) // A,B,C,D 全部後続
    const a = r.find((x) => x.id === 'A')!
    expect(a.startDate).toBe('2026-05-03')
    expect(a.dueDate).toBe('2026-05-05')
  })

  it('途中 node から → 後続のみ shift', () => {
    const r = planDependencyShift(items, 'B', EDGES, 1)
    expect(r.map((x) => x.id).sort()).toEqual(['B', 'C'])
  })

  it('null date は null のまま、非 null のみ shift', () => {
    const r = planDependencyShift(items, 'A', EDGES, 3)
    const d = r.find((x) => x.id === 'D')!
    expect(d.startDate).toBeNull()
    expect(d.dueDate).toBe('2026-05-08')
  })

  it('負の deltaDays (前倒し) も可', () => {
    const r = planDependencyShift(items, 'C', EDGES, -2)
    const c = r.find((x) => x.id === 'C')!
    expect(c.startDate).toBe('2026-05-05')
  })

  it('deltaDays 0 → no-op (空配列)', () => {
    expect(planDependencyShift(items, 'A', EDGES, 0)).toEqual([])
  })

  it('月境界を跨ぐ shift', () => {
    const r = planDependencyShift(
      [{ id: 'A', startDate: '2026-05-30', dueDate: '2026-05-31' }],
      'A',
      [],
      3,
    )
    expect(r[0]!.startDate).toBe('2026-06-02')
    expect(r[0]!.dueDate).toBe('2026-06-03')
  })
})
