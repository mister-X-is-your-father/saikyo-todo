/**
 * iter465 member-capacity の unit test。pure helper のみ、DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import { computeMemberCapacityLoad, formatMemberCapacityLoadJa } from './member-capacity'

const DONE = new Set(['done', 'cancelled'])

describe('computeMemberCapacityLoad', () => {
  it('items 空 → ゼロ load (unknown ではなく free? 仕様: capacity > 0 で used=0 → free)', () => {
    const r = computeMemberCapacityLoad([], 480, DONE)
    expect(r.usedMinutes).toBe(0)
    expect(r.remainingMinutes).toBe(480)
    expect(r.utilizationPct).toBe(0)
    expect(r.loadStatus).toBe('free')
  })

  it('capacity = 0 → unknown sentinel', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 30, status: 'todo' }], 0, DONE)
    expect(r.loadStatus).toBe('unknown')
    expect(r.utilizationPct).toBe(0)
    expect(r.totalItemCount).toBe(1)
  })

  it('capacity 負の数 → unknown sentinel', () => {
    const r = computeMemberCapacityLoad([], -1, DONE)
    expect(r.loadStatus).toBe('unknown')
  })

  it('1日 8h capacity, 4h used (50%) → free', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 240, status: 'todo' }], 480, DONE)
    expect(r.usedMinutes).toBe(240)
    expect(r.remainingMinutes).toBe(240)
    expect(r.utilizationPct).toBe(50)
    expect(r.loadStatus).toBe('free')
  })

  it('70% util → comfortable', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 336, status: 'todo' }], 480, DONE)
    expect(r.utilizationPct).toBe(70)
    expect(r.loadStatus).toBe('comfortable')
  })

  it('95% util → tight', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 456, status: 'todo' }], 480, DONE)
    expect(r.utilizationPct).toBe(95)
    expect(r.loadStatus).toBe('tight')
  })

  it('120% util → overloaded、remainingMinutes は負', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 576, status: 'todo' }], 480, DONE)
    expect(r.utilizationPct).toBe(120)
    expect(r.loadStatus).toBe('overloaded')
    expect(r.remainingMinutes).toBe(-96)
  })

  it('done item は used から除外、doneItemCount で別 count', () => {
    const r = computeMemberCapacityLoad(
      [
        { estimateMinutes: 240, status: 'todo' },
        { estimateMinutes: 1000, status: 'done' },
      ],
      480,
      DONE,
    )
    expect(r.usedMinutes).toBe(240)
    expect(r.doneItemCount).toBe(1)
    expect(r.estimatedItemCount).toBe(1)
  })

  it('cancelled item も done と同様に扱う', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 999, status: 'cancelled' }], 480, DONE)
    expect(r.usedMinutes).toBe(0)
    expect(r.doneItemCount).toBe(1)
  })

  it('estimateMinutes が null / undefined / 不正 → unestimatedCount に集計、used に未算入', () => {
    const r = computeMemberCapacityLoad(
      [
        { estimateMinutes: null, status: 'todo' },
        { estimateMinutes: undefined, status: 'todo' },
        { estimateMinutes: NaN, status: 'todo' },
        { estimateMinutes: -10, status: 'todo' },
        { estimateMinutes: 0, status: 'todo' },
      ],
      480,
      DONE,
    )
    expect(r.unestimatedCount).toBe(5)
    expect(r.usedMinutes).toBe(0)
    expect(r.estimatedItemCount).toBe(0)
  })

  it('totalItemCount は items.length と一致 (done / 未見積も含む)', () => {
    const r = computeMemberCapacityLoad(
      [
        { estimateMinutes: 60, status: 'todo' },
        { estimateMinutes: null, status: 'todo' },
        { estimateMinutes: 30, status: 'done' },
      ],
      480,
      DONE,
    )
    expect(r.totalItemCount).toBe(3)
    expect(r.estimatedItemCount).toBe(1)
    expect(r.unestimatedCount).toBe(1)
    expect(r.doneItemCount).toBe(1)
  })
})

describe('formatMemberCapacityLoadJa', () => {
  it('unknown sentinel', () => {
    const r = computeMemberCapacityLoad([], 0, DONE)
    expect(formatMemberCapacityLoadJa(r)).toContain('余裕時間 算定不能')
  })

  it('free 50% → "余裕あり: 残 4h / capacity 8h (50%)"', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 240, status: 'todo' }], 480, DONE)
    expect(formatMemberCapacityLoadJa(r)).toBe('余裕あり: 残 4h / capacity 8h (50%)')
  })

  it('overloaded 120% → "オーバー: 1h 36min超 / capacity 8h (120%)"', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 576, status: 'todo' }], 480, DONE)
    expect(formatMemberCapacityLoadJa(r)).toBe('オーバー: 1h 36min超 / capacity 8h (120%)')
  })

  it('未見積 N 件は末尾 chip で付与', () => {
    const r = computeMemberCapacityLoad(
      [
        { estimateMinutes: 240, status: 'todo' },
        { estimateMinutes: null, status: 'todo' },
        { estimateMinutes: null, status: 'todo' },
      ],
      480,
      DONE,
    )
    expect(formatMemberCapacityLoadJa(r)).toBe('余裕あり: 残 4h / capacity 8h (50%) / 未見積 2 件')
  })

  it('未見積 0 件は chip 省略', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 240, status: 'todo' }], 480, DONE)
    expect(formatMemberCapacityLoadJa(r)).not.toContain('未見積')
  })

  it('tight 95% → "ギリギリ"', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 456, status: 'todo' }], 480, DONE)
    expect(formatMemberCapacityLoadJa(r)).toContain('ギリギリ')
  })
})
