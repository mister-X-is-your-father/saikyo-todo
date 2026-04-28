import { describe, expect, it } from 'vitest'

import {
  compareUrgency,
  computeUrgency,
  explainUrgency,
  formatUrgencyExplanation,
  selectTopUrgentItems,
  type UrgencyFields,
} from './urgency'

const TODAY = new Date(2026, 3, 27) // Mon 2026-04-27

const item = (overrides: Partial<UrgencyFields>): UrgencyFields => ({
  priority: 4,
  dueDate: null,
  isMust: false,
  doneAt: null,
  archivedAt: null,
  ...overrides,
})

describe('computeUrgency — priority weights', () => {
  it('p1 = 100 + 0 (no due, no must) = 100', () => {
    expect(computeUrgency(item({ priority: 1 }), TODAY)).toBe(100)
  })

  it('p2 = 70', () => {
    expect(computeUrgency(item({ priority: 2 }), TODAY)).toBe(70)
  })

  it('p3 = 40', () => {
    expect(computeUrgency(item({ priority: 3 }), TODAY)).toBe(40)
  })

  it('p4 = 10', () => {
    expect(computeUrgency(item({ priority: 4 }), TODAY)).toBe(10)
  })

  it('未知 priority (5+ 等) は 10 にフォールバック', () => {
    expect(computeUrgency(item({ priority: 5 }), TODAY)).toBe(10)
    expect(computeUrgency(item({ priority: 0 }), TODAY)).toBe(10)
  })
})

describe('computeUrgency — due date proximity', () => {
  it('期限切れ (-1) は +50', () => {
    expect(computeUrgency(item({ priority: 4, dueDate: '2026-04-26' }), TODAY)).toBe(60)
  })

  it('今日が dueDate は +35', () => {
    expect(computeUrgency(item({ priority: 4, dueDate: '2026-04-27' }), TODAY)).toBe(45)
  })

  it('明日 (+1) は +20', () => {
    expect(computeUrgency(item({ priority: 4, dueDate: '2026-04-28' }), TODAY)).toBe(30)
  })

  it('+2..+6 (今週内) は +10', () => {
    expect(computeUrgency(item({ priority: 4, dueDate: '2026-04-29' }), TODAY)).toBe(20)
    expect(computeUrgency(item({ priority: 4, dueDate: '2026-05-03' }), TODAY)).toBe(20)
  })

  it('+7 以降は +0', () => {
    expect(computeUrgency(item({ priority: 4, dueDate: '2026-05-04' }), TODAY)).toBe(10)
    expect(computeUrgency(item({ priority: 4, dueDate: '2026-12-31' }), TODAY)).toBe(10)
  })

  it('dueDate null は +0', () => {
    expect(computeUrgency(item({ priority: 4, dueDate: null }), TODAY)).toBe(10)
  })

  it('dueDate 不正 ISO は +0', () => {
    expect(computeUrgency(item({ priority: 4, dueDate: 'garbage' }), TODAY)).toBe(10)
    expect(computeUrgency(item({ priority: 4, dueDate: '2026-13-99' }), TODAY)).toBe(10)
  })
})

describe('computeUrgency — MUST bonus', () => {
  it('MUST は +30', () => {
    expect(computeUrgency(item({ priority: 3, isMust: true }), TODAY)).toBe(70)
  })

  it('p1 + overdue + MUST 全部入り = 100 + 50 + 30 = 180', () => {
    expect(computeUrgency(item({ priority: 1, dueDate: '2026-04-25', isMust: true }), TODAY)).toBe(
      180,
    )
  })
})

describe('computeUrgency — terminal states', () => {
  it('doneAt あり → 0 (priority/due/must 無視)', () => {
    expect(
      computeUrgency(
        item({
          priority: 1,
          dueDate: '2026-04-25',
          isMust: true,
          doneAt: new Date('2026-04-26'),
        }),
        TODAY,
      ),
    ).toBe(0)
  })

  it('archivedAt あり → 0', () => {
    expect(
      computeUrgency(
        item({ priority: 1, isMust: true, archivedAt: new Date('2026-04-26') }),
        TODAY,
      ),
    ).toBe(0)
  })
})

describe('compareUrgency — sort comparator', () => {
  it('高 urgency が先頭', () => {
    const items = [
      item({ priority: 4, dueDate: null }), // 10
      item({ priority: 1, dueDate: '2026-04-25', isMust: true }), // 180
      item({ priority: 2, dueDate: '2026-04-28' }), // 90
      item({ priority: 3 }), // 40
    ]
    const sorted = [...items].sort(compareUrgency(TODAY))
    expect(sorted.map((s) => computeUrgency(s, TODAY))).toEqual([180, 90, 40, 10])
  })

  it('done item は末尾 (urgency=0)', () => {
    const items = [
      item({ priority: 1 }),
      item({ priority: 1, doneAt: new Date('2026-04-26') }),
      item({ priority: 4 }),
    ]
    const sorted = [...items].sort(compareUrgency(TODAY))
    // [p1=100, p4=10, p1+done=0]
    expect(computeUrgency(sorted[0]!, TODAY)).toBe(100)
    expect(computeUrgency(sorted[1]!, TODAY)).toBe(10)
    expect(computeUrgency(sorted[2]!, TODAY)).toBe(0)
  })
})

describe('selectTopUrgentItems', () => {
  it('上位 N 件を urgency 降順で返す', () => {
    const items = [
      item({ priority: 4 }), // 10
      item({ priority: 1, dueDate: '2026-04-25', isMust: true }), // 180
      item({ priority: 2 }), // 70
      item({ priority: 3 }), // 40
    ]
    const top = selectTopUrgentItems(items, 2, TODAY)
    expect(top).toHaveLength(2)
    expect(computeUrgency(top[0]!, TODAY)).toBe(180)
    expect(computeUrgency(top[1]!, TODAY)).toBe(70)
  })

  it('done / archive (urgency=0) は除外', () => {
    const items = [
      item({ priority: 1 }), // 100
      item({ priority: 1, doneAt: new Date('2026-04-26') }), // 0 — 除外
      item({ priority: 4 }), // 10
    ]
    expect(selectTopUrgentItems(items, 5, TODAY)).toHaveLength(2)
  })

  it('n=0 / 負 → 空配列', () => {
    const items = [item({ priority: 1 })]
    expect(selectTopUrgentItems(items, 0, TODAY)).toEqual([])
    expect(selectTopUrgentItems(items, -3, TODAY)).toEqual([])
  })

  it('n が件数より大きくても全件返す (足りない時は短く)', () => {
    const items = [item({ priority: 1 }), item({ priority: 4 })]
    expect(selectTopUrgentItems(items, 100, TODAY)).toHaveLength(2)
  })

  it('同 urgency は元配列順を保つ (stable)', () => {
    const A = item({ priority: 4 })
    const B = item({ priority: 4 })
    const C = item({ priority: 4 })
    const top = selectTopUrgentItems([A, B, C], 3, TODAY)
    expect(top[0]).toBe(A)
    expect(top[1]).toBe(B)
    expect(top[2]).toBe(C)
  })

  it('全 done なら空配列', () => {
    const items = [
      item({ priority: 1, doneAt: new Date('2026-04-26') }),
      item({ priority: 2, archivedAt: new Date('2026-04-26') }),
    ]
    expect(selectTopUrgentItems(items, 5, TODAY)).toEqual([])
  })
})

describe('explainUrgency', () => {
  it('p1 のみ (期限なし MUST なし) → 1 factor, score=100', () => {
    const e = explainUrgency(item({ priority: 1 }), TODAY)
    expect(e.score).toBe(100)
    expect(e.factors).toEqual([{ label: 'p1 priority', bonus: 100 }])
  })

  it('p3 + 期限切れ → 2 factors, score=90', () => {
    const e = explainUrgency(item({ priority: 3, dueDate: '2026-04-26' }), TODAY)
    expect(e.score).toBe(90)
    expect(e.factors).toEqual([
      { label: 'p3 priority', bonus: 40 },
      { label: '期限切れ', bonus: 50 },
    ])
  })

  it('p1 + 期限当日 + MUST → 3 factors, score=180 (max)', () => {
    const e = explainUrgency(item({ priority: 1, dueDate: '2026-04-27', isMust: true }), TODAY)
    expect(e.score).toBe(165)
    expect(e.factors).toEqual([
      { label: 'p1 priority', bonus: 100 },
      { label: '期限当日', bonus: 35 },
      { label: 'MUST', bonus: 30 },
    ])
  })

  it('p2 + 期限明日', () => {
    const e = explainUrgency(item({ priority: 2, dueDate: '2026-04-28' }), TODAY)
    expect(e.score).toBe(90)
    expect(e.factors).toEqual([
      { label: 'p2 priority', bonus: 70 },
      { label: '期限明日', bonus: 20 },
    ])
  })

  it('p4 + 期限今週内 (+3d)', () => {
    const e = explainUrgency(item({ priority: 4, dueDate: '2026-04-30' }), TODAY)
    expect(e.score).toBe(20)
    expect(e.factors).toEqual([
      { label: 'p4 priority', bonus: 10 },
      { label: '期限今週内', bonus: 10 },
    ])
  })

  it('期限が遠い (+8d) は due bonus を含めない', () => {
    const e = explainUrgency(item({ priority: 2, dueDate: '2026-05-05' }), TODAY)
    expect(e.score).toBe(70)
    expect(e.factors).toEqual([{ label: 'p2 priority', bonus: 70 }])
  })

  it('done 済 → score=0 / factors=[]', () => {
    const e = explainUrgency(
      item({ priority: 1, dueDate: '2026-04-26', isMust: true, doneAt: new Date() }),
      TODAY,
    )
    expect(e.score).toBe(0)
    expect(e.factors).toEqual([])
  })

  it('archive 済 → score=0 / factors=[]', () => {
    const e = explainUrgency(item({ priority: 1, archivedAt: new Date('2026-04-25') }), TODAY)
    expect(e.score).toBe(0)
    expect(e.factors).toEqual([])
  })

  it('不正 priority は p4 weight にフォールバック (computeUrgency と同じ)', () => {
    const e = explainUrgency(item({ priority: 99 }), TODAY)
    expect(e.score).toBe(10)
    expect(e.factors).toEqual([{ label: 'p4 priority', bonus: 10 }])
  })

  it('score は computeUrgency と完全一致 (sanity)', () => {
    const sample = item({ priority: 2, dueDate: '2026-04-26', isMust: true })
    expect(explainUrgency(sample, TODAY).score).toBe(computeUrgency(sample, TODAY))
  })
})

describe('formatUrgencyExplanation', () => {
  it('複数 factor を " / " 区切り + 合計値', () => {
    const e = explainUrgency(item({ priority: 1, dueDate: '2026-04-27', isMust: true }), TODAY)
    expect(formatUrgencyExplanation(e)).toBe('p1 priority +100 / 期限当日 +35 / MUST +30 = 165')
  })

  it('1 factor のみ', () => {
    const e = explainUrgency(item({ priority: 4 }), TODAY)
    expect(formatUrgencyExplanation(e)).toBe('p4 priority +10 = 10')
  })

  it('done/archive は専用 sentinel 文字列', () => {
    const e = explainUrgency(item({ priority: 1, doneAt: new Date() }), TODAY)
    expect(formatUrgencyExplanation(e)).toBe('urgency 0 (完了済 / archive)')
  })
})
