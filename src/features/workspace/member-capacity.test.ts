/**
 * iter465 member-capacity の unit test。pure helper のみ、DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  computeMemberCapacityLoad,
  formatMemberCapacityLoadJa,
  memberCapacityChipClasses,
  memberCapacityTone,
} from './member-capacity'

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

  it('free 50% → "余裕あり: 残 4時間 / capacity 8時間 (50%)" (iter808 ja-throughout)', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 240, status: 'todo' }], 480, DONE)
    expect(formatMemberCapacityLoadJa(r)).toBe('余裕あり: 残 4時間 / capacity 8時間 (50%)')
  })

  it('overloaded 120% → "オーバー: 1時間36分超 / capacity 8時間 (120%)" (iter808 ja-throughout)', () => {
    const r = computeMemberCapacityLoad([{ estimateMinutes: 576, status: 'todo' }], 480, DONE)
    expect(formatMemberCapacityLoadJa(r)).toBe('オーバー: 1時間36分超 / capacity 8時間 (120%)')
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
    expect(formatMemberCapacityLoadJa(r)).toBe(
      '余裕あり: 残 4時間 / capacity 8時間 (50%) / 未見積 2 件',
    )
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

describe('memberCapacityTone (graphical 波及 — load status → chip tone token)', () => {
  it('5 status → 5 tone (success が free に登場)', () => {
    expect(memberCapacityTone('overloaded')).toBe('danger')
    expect(memberCapacityTone('tight')).toBe('urgent')
    expect(memberCapacityTone('comfortable')).toBe('info')
    expect(memberCapacityTone('free')).toBe('success')
    expect(memberCapacityTone('unknown')).toBe('idle')
  })
})

// iter1702 fix: iter1531 chip-tone `light dark:dark` 拡張への追従 (iter1701 due-proximity と同 sweep)。
describe('memberCapacityChipClasses (Tailwind 3 軸 class、iter485 chip-tone と整合)', () => {
  it('overloaded → rose、free → emerald (success tone 初登場)', () => {
    const overloaded = memberCapacityChipClasses('overloaded')
    expect(overloaded.bgClass).toBe('bg-rose-100 dark:bg-rose-950/40')
    expect(overloaded.textClass).toBe('text-rose-700 dark:text-rose-300')

    const free = memberCapacityChipClasses('free')
    expect(free.bgClass).toBe('bg-emerald-50 dark:bg-emerald-950/30')
    expect(free.textClass).toBe('text-emerald-700 dark:text-emerald-300')
    expect(free.ringClass).toBe('ring-emerald-200 dark:ring-emerald-900/50')
  })

  it('tight (強amber) と comfortable (blue) で区別', () => {
    expect(memberCapacityChipClasses('tight').bgClass).toBe('bg-amber-100 dark:bg-amber-950/40')
    expect(memberCapacityChipClasses('comfortable').textClass).toBe(
      'text-blue-700 dark:text-blue-300',
    )
  })

  it('unknown → slate (計算不能)', () => {
    expect(memberCapacityChipClasses('unknown').textClass).toBe(
      'text-slate-600 dark:text-slate-400',
    )
  })
})
