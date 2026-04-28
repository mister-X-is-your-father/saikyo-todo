import { describe, expect, it } from 'vitest'

import { compareUrgency, computeUrgency, type UrgencyFields } from './urgency'

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
