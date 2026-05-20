import { describe, expect, it } from 'vitest'

import {
  type AgingKind,
  agingLabel,
  agingSeverity,
  classifyBacklogAgingHint,
  countAgingItemsOlderThanWeek,
  countItemsByAge,
  countItemsByAgeByPriority,
  formatAgingByPriorityJa,
  formatAgingCounts,
  formatAgingSeverityCompactJa,
  formatBacklogAgingHintJa,
  getItemAge,
  groupItemsByAge,
  oldestAgeDaysOf,
} from './backlog-aging'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysAgo(n: number, base = Date.now()): string {
  return new Date(base - n * MS_PER_DAY).toISOString()
}

const TODAY = new Date('2026-04-29T00:00:00Z')

describe('getItemAge', () => {
  it('returns "new" for createdAt = today (ageDays=0)', () => {
    const age = getItemAge('2026-04-29T10:00:00Z', TODAY)
    expect(age.kind).toBe('new')
    expect(age.ageDays).toBe(0)
    expect(age.label).toBe('新規')
  })

  it('classifies 1 day old → recent', () => {
    const age = getItemAge('2026-04-28T00:00:00Z', TODAY)
    expect(age.kind).toBe('recent')
    expect(age.ageDays).toBe(1)
  })

  it('classifies 6 days → recent (just within 7-day window)', () => {
    const age = getItemAge('2026-04-23T00:00:00Z', TODAY)
    expect(age.kind).toBe('recent')
    expect(age.ageDays).toBe(6)
  })

  it('classifies 7 days → stale (boundary)', () => {
    const age = getItemAge('2026-04-22T00:00:00Z', TODAY)
    expect(age.kind).toBe('stale')
    expect(age.ageDays).toBe(7)
  })

  it('classifies 29 days → stale', () => {
    const age = getItemAge('2026-03-31T00:00:00Z', TODAY)
    expect(age.kind).toBe('stale')
    expect(age.ageDays).toBe(29)
  })

  it('classifies 30 days → ancient (boundary)', () => {
    const age = getItemAge('2026-03-30T00:00:00Z', TODAY)
    expect(age.kind).toBe('ancient')
    expect(age.ageDays).toBe(30)
  })

  it('classifies 100 days → ancient', () => {
    const age = getItemAge('2026-01-19T00:00:00Z', TODAY)
    expect(age.kind).toBe('ancient')
    expect(age.ageDays).toBe(100)
  })

  it('returns "unknown" when createdAt is null/undefined/invalid', () => {
    expect(getItemAge(null, TODAY).kind).toBe('unknown')
    expect(getItemAge(undefined, TODAY).kind).toBe('unknown')
    expect(getItemAge('not-a-date', TODAY).kind).toBe('unknown')
    expect(getItemAge(null, TODAY).ageDays).toBeUndefined()
    expect(getItemAge(null, TODAY).label).toBe('年齢不明')
  })

  it('clamps future createdAt (clock skew) to ageDays=0 / new', () => {
    const future = new Date(TODAY.getTime() + 5 * MS_PER_DAY).toISOString()
    const age = getItemAge(future, TODAY)
    expect(age.kind).toBe('new')
    expect(age.ageDays).toBe(0)
  })

  it('accepts Date instance for both args', () => {
    const created = new Date('2026-04-25T00:00:00Z')
    const age = getItemAge(created, TODAY)
    expect(age.ageDays).toBe(4)
    expect(age.kind).toBe('recent')
  })

  it('uses new Date() when today is omitted (formatted only)', () => {
    const age = getItemAge(daysAgo(0))
    expect(age.kind).toBe('new')
  })
})

describe('agingLabel', () => {
  it('returns Japanese label for each kind', () => {
    expect(agingLabel('new')).toBe('新規')
    expect(agingLabel('recent')).toBe('直近')
    expect(agingLabel('stale')).toBe('停滞')
    expect(agingLabel('ancient')).toBe('古参')
    expect(agingLabel('unknown')).toBe('年齢不明')
  })
})

describe('groupItemsByAge', () => {
  it('initializes all 5 buckets even when empty', () => {
    const groups = groupItemsByAge([], TODAY)
    expect(groups.new).toEqual([])
    expect(groups.recent).toEqual([])
    expect(groups.stale).toEqual([])
    expect(groups.ancient).toEqual([])
    expect(groups.unknown).toEqual([])
  })

  it('places items in correct buckets based on createdAt', () => {
    const items = [
      { id: 'a', createdAt: '2026-04-29T05:00:00Z' }, // new (today)
      { id: 'b', createdAt: '2026-04-26T00:00:00Z' }, // recent (3 days)
      { id: 'c', createdAt: '2026-04-15T00:00:00Z' }, // stale (14 days)
      { id: 'd', createdAt: '2026-01-01T00:00:00Z' }, // ancient (>30 days)
      { id: 'e', createdAt: null }, // unknown
    ]
    const groups = groupItemsByAge(items, TODAY)
    expect(groups.new.map((i) => i.id)).toEqual(['a'])
    expect(groups.recent.map((i) => i.id)).toEqual(['b'])
    expect(groups.stale.map((i) => i.id)).toEqual(['c'])
    expect(groups.ancient.map((i) => i.id)).toEqual(['d'])
    expect(groups.unknown.map((i) => i.id)).toEqual(['e'])
  })

  it('preserves original order within each bucket (stable)', () => {
    const items = [
      { id: 'a', createdAt: '2026-04-15T00:00:00Z' }, // stale
      { id: 'b', createdAt: '2026-04-15T00:00:00Z' }, // stale
      { id: 'c', createdAt: '2026-04-15T00:00:00Z' }, // stale
    ]
    expect(groupItemsByAge(items, TODAY).stale.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('countItemsByAge', () => {
  it('counts each bucket correctly', () => {
    const counts = countItemsByAge(
      [
        { createdAt: '2026-04-29T05:00:00Z' },
        { createdAt: '2026-04-29T08:00:00Z' },
        { createdAt: '2026-04-26T00:00:00Z' },
        { createdAt: '2026-04-10T00:00:00Z' },
        { createdAt: null },
      ],
      TODAY,
    )
    expect(counts).toEqual({ new: 2, recent: 1, stale: 1, ancient: 0, unknown: 1 })
  })

  it('returns all-zero when items empty', () => {
    expect(countItemsByAge([], TODAY)).toEqual({
      new: 0,
      recent: 0,
      stale: 0,
      ancient: 0,
      unknown: 0,
    })
  })
})

describe('formatAgingCounts', () => {
  it('hides zero buckets and joins with /', () => {
    expect(formatAgingCounts({ new: 3, recent: 0, stale: 5, ancient: 12, unknown: 0 })).toBe(
      '新規 3 / 停滞 5 / 古参 12',
    )
  })

  it('returns "0 件" when all zero', () => {
    expect(formatAgingCounts({ new: 0, recent: 0, stale: 0, ancient: 0, unknown: 0 })).toBe('0 件')
  })

  it('preserves new→recent→stale→ancient→unknown order', () => {
    const out = formatAgingCounts({ new: 1, recent: 2, stale: 3, ancient: 4, unknown: 5 })
    expect(out).toBe('新規 1 / 直近 2 / 停滞 3 / 古参 4 / 年齢不明 5')
  })
})

describe('countAgingItemsOlderThanWeek', () => {
  it('sums stale + ancient', () => {
    expect(
      countAgingItemsOlderThanWeek({ new: 3, recent: 5, stale: 8, ancient: 12, unknown: 0 }),
    ).toBe(20)
  })

  it('excludes unknown bucket', () => {
    expect(
      countAgingItemsOlderThanWeek({ new: 0, recent: 0, stale: 0, ancient: 0, unknown: 99 }),
    ).toBe(0)
  })
})

describe('integration: items → counts → format', () => {
  it('flows end-to-end (group → count → format)', () => {
    const items = [
      { createdAt: daysAgo(0) }, // new
      { createdAt: daysAgo(3) }, // recent
      { createdAt: daysAgo(10) }, // stale
      { createdAt: daysAgo(50) }, // ancient
      { createdAt: daysAgo(100) }, // ancient
    ]
    const counts = countItemsByAge(items)
    expect(counts.new).toBe(1)
    expect(counts.recent).toBe(1)
    expect(counts.stale).toBe(1)
    expect(counts.ancient).toBe(2)
    const summary = formatAgingCounts(counts)
    expect(summary).toBe('新規 1 / 直近 1 / 停滞 1 / 古参 2')
    expect(countAgingItemsOlderThanWeek(counts)).toBe(3)
  })
})

describe('countItemsByAgeByPriority', () => {
  it('returns empty buckets for empty input', () => {
    const r = countItemsByAgeByPriority([], TODAY)
    expect(r[1]).toEqual({ new: 0, recent: 0, stale: 0, ancient: 0, unknown: 0 })
    expect(r[2].new).toBe(0)
    expect(r[3].new).toBe(0)
    expect(r[4].new).toBe(0)
  })

  it('counts items by priority × age bucket', () => {
    const items = [
      { priority: 1, createdAt: daysAgo(45, TODAY.getTime()) }, // P1 ancient
      { priority: 1, createdAt: daysAgo(0, TODAY.getTime()) }, // P1 new
      { priority: 3, createdAt: daysAgo(10, TODAY.getTime()) }, // P3 stale
      { priority: 3, createdAt: daysAgo(2, TODAY.getTime()) }, // P3 recent
    ]
    const r = countItemsByAgeByPriority(items, TODAY)
    expect(r[1].ancient).toBe(1)
    expect(r[1].new).toBe(1)
    expect(r[3].stale).toBe(1)
    expect(r[3].recent).toBe(1)
  })

  it('normalizes null/out-of-range priority to P4', () => {
    const items = [
      { priority: null, createdAt: daysAgo(45, TODAY.getTime()) },
      { priority: 9, createdAt: daysAgo(10, TODAY.getTime()) },
    ]
    const r = countItemsByAgeByPriority(items, TODAY)
    expect(r[4].ancient).toBe(1)
    expect(r[4].stale).toBe(1)
  })
})

describe('formatAgingByPriorityJa', () => {
  it('formats stagnant counts per priority (stale + ancient sum)', () => {
    const items = [
      { priority: 1, createdAt: daysAgo(45, TODAY.getTime()) }, // P1 ancient
      { priority: 1, createdAt: daysAgo(15, TODAY.getTime()) }, // P1 stale
      { priority: 1, createdAt: daysAgo(0, TODAY.getTime()) }, // P1 new (excluded)
      { priority: 3, createdAt: daysAgo(35, TODAY.getTime()) }, // P3 ancient
    ]
    const r = countItemsByAgeByPriority(items, TODAY)
    expect(formatAgingByPriorityJa(r)).toBe('停滞: P1 2 件 / P3 1 件')
  })

  it('formats empty as "停滞 0 件"', () => {
    expect(formatAgingByPriorityJa(countItemsByAgeByPriority([], TODAY))).toBe('停滞 0 件')
  })

  it('skips priorities with stagnant=0', () => {
    const items = [
      { priority: 1, createdAt: daysAgo(0, TODAY.getTime()) }, // P1 new
      { priority: 3, createdAt: daysAgo(45, TODAY.getTime()) }, // P3 ancient
    ]
    const r = countItemsByAgeByPriority(items, TODAY)
    expect(formatAgingByPriorityJa(r)).toBe('停滞: P3 1 件')
  })
})

describe('oldestAgeDaysOf', () => {
  it('returns max ageDays across items', () => {
    const items = [
      { createdAt: daysAgo(3, TODAY.getTime()) },
      { createdAt: daysAgo(45, TODAY.getTime()) },
      { createdAt: daysAgo(10, TODAY.getTime()) },
    ]
    expect(oldestAgeDaysOf(items, TODAY)).toBe(45)
  })

  it('returns null for empty array', () => {
    expect(oldestAgeDaysOf([], TODAY)).toBeNull()
  })

  it('returns null when all createdAt are unknown (null / invalid)', () => {
    const items = [
      { createdAt: null },
      { createdAt: 'garbage' as string },
      { createdAt: undefined },
    ]
    expect(oldestAgeDaysOf(items, TODAY)).toBeNull()
  })

  it('skips unknown items, returns max of remaining valid', () => {
    const items = [
      { createdAt: null },
      { createdAt: daysAgo(7, TODAY.getTime()) },
      { createdAt: 'garbage' as string },
      { createdAt: daysAgo(20, TODAY.getTime()) },
    ]
    expect(oldestAgeDaysOf(items, TODAY)).toBe(20)
  })

  it('single item returns its ageDays', () => {
    const items = [{ createdAt: daysAgo(15, TODAY.getTime()) }]
    expect(oldestAgeDaysOf(items, TODAY)).toBe(15)
  })

  it('future createdAt clamps to 0 (getItemAge contract)', () => {
    // 未来 createdAt は ageDays=0 で扱われる
    const future = new Date(TODAY.getTime() + 5 * MS_PER_DAY).toISOString()
    expect(oldestAgeDaysOf([{ createdAt: future }], TODAY)).toBe(0)
  })
})

describe('classifyBacklogAgingHint / formatBacklogAgingHintJa (iter447)', () => {
  const c = (
    overrides: Partial<Record<'new' | 'recent' | 'stale' | 'ancient' | 'unknown', number>>,
  ) => ({
    new: 0,
    recent: 0,
    stale: 0,
    ancient: 0,
    unknown: 0,
    ...overrides,
  })

  it('stagnant=0 → fresh / "新鮮 (停滞なし)"', () => {
    expect(classifyBacklogAgingHint(c({ new: 5, recent: 3 }))).toBe('fresh')
    expect(formatBacklogAgingHintJa(c({}))).toBe('新鮮 (停滞なし)')
  })

  it('stagnant 1-4 かつ ancient < 3 → mild', () => {
    expect(classifyBacklogAgingHint(c({ stale: 2 }))).toBe('mild')
    expect(classifyBacklogAgingHint(c({ stale: 2, ancient: 2 }))).toBe('mild')
    expect(formatBacklogAgingHintJa(c({ stale: 1 }))).toBe('軽微停滞')
  })

  it('stagnant ≥ 5 → moderate (ancient < 5)', () => {
    expect(classifyBacklogAgingHint(c({ stale: 5 }))).toBe('moderate')
    expect(classifyBacklogAgingHint(c({ stale: 3, ancient: 2 }))).toBe('moderate')
    expect(formatBacklogAgingHintJa(c({ stale: 5 }))).toBe('停滞多め')
  })

  it('ancient 3-4 → moderate (stagnant < 5 でも)', () => {
    expect(classifyBacklogAgingHint(c({ ancient: 3 }))).toBe('moderate')
    expect(classifyBacklogAgingHint(c({ ancient: 4 }))).toBe('moderate')
  })

  it('ancient ≥ 5 → severe', () => {
    expect(classifyBacklogAgingHint(c({ ancient: 5 }))).toBe('severe')
    expect(classifyBacklogAgingHint(c({ ancient: 10 }))).toBe('severe')
    expect(formatBacklogAgingHintJa(c({ ancient: 5 }))).toBe('深刻 (古参累積)')
  })

  it('unknown は集計対象外 (stagnant に含まない)', () => {
    expect(classifyBacklogAgingHint(c({ unknown: 100 }))).toBe('fresh')
  })
})

describe('agingSeverity (iter1018)', () => {
  function c(over: Partial<Record<AgingKind, number>>): Record<AgingKind, number> {
    return { new: 0, recent: 0, stale: 0, ancient: 0, unknown: 0, ...over }
  }

  it('全 0 → ok', () => {
    expect(agingSeverity(c({}))).toBe('ok')
  })

  it('全 new/recent → ok', () => {
    expect(agingSeverity(c({ new: 3, recent: 5 }))).toBe('ok')
  })

  it('stale 1-4 → info', () => {
    expect(agingSeverity(c({ stale: 1 }))).toBe('info')
    expect(agingSeverity(c({ stale: 4 }))).toBe('info')
  })

  it('stale >= 5 → warn (ancient なし)', () => {
    expect(agingSeverity(c({ stale: 5 }))).toBe('warn')
  })

  it('ancient 1-4 → warn', () => {
    expect(agingSeverity(c({ ancient: 1 }))).toBe('warn')
    expect(agingSeverity(c({ ancient: 4 }))).toBe('warn')
  })

  it('ancient >= 5 → danger', () => {
    expect(agingSeverity(c({ ancient: 5 }))).toBe('danger')
    expect(agingSeverity(c({ ancient: 10 }))).toBe('danger')
  })

  it('unknown は severity 判定に含めない', () => {
    expect(agingSeverity(c({ unknown: 100 }))).toBe('ok')
  })
})

describe('formatAgingSeverityCompactJa (iter1023)', () => {
  function c(over: Partial<Record<AgingKind, number>>): Record<AgingKind, number> {
    return { new: 0, recent: 0, stale: 0, ancient: 0, unknown: 0, ...over }
  }

  it('全 0 → "新鮮"', () => {
    expect(formatAgingSeverityCompactJa(c({}))).toBe('新鮮')
  })

  it('全 new/recent → "新鮮" (停滞なし)', () => {
    expect(formatAgingSeverityCompactJa(c({ new: 3, recent: 5 }))).toBe('新鮮')
  })

  it('stale 1-4 (info) → "軽微 停滞 N 件"', () => {
    expect(formatAgingSeverityCompactJa(c({ stale: 1 }))).toBe('軽微 停滞 1 件')
    expect(formatAgingSeverityCompactJa(c({ stale: 4 }))).toBe('軽微 停滞 4 件')
  })

  it('stale >= 5 (warn, ancient なし) → "注意 停滞 N 件"', () => {
    expect(formatAgingSeverityCompactJa(c({ stale: 5 }))).toBe('注意 停滞 5 件')
    expect(formatAgingSeverityCompactJa(c({ stale: 8 }))).toBe('注意 停滞 8 件')
  })

  it('ancient 1-4 (warn) → "注意 停滞 N 件 (古参 M)"', () => {
    expect(formatAgingSeverityCompactJa(c({ ancient: 1 }))).toBe('注意 停滞 1 件 (古参 1)')
    expect(formatAgingSeverityCompactJa(c({ stale: 2, ancient: 3 }))).toBe(
      '注意 停滞 5 件 (古参 3)',
    )
  })

  it('ancient >= 5 (danger) → "危険 古参 N 件"', () => {
    expect(formatAgingSeverityCompactJa(c({ ancient: 5 }))).toBe('危険 古参 5 件')
    expect(formatAgingSeverityCompactJa(c({ stale: 3, ancient: 10 }))).toBe('危険 古参 10 件')
  })

  it('unknown は表示に含めない (severity 判定対象外)', () => {
    expect(formatAgingSeverityCompactJa(c({ unknown: 100 }))).toBe('新鮮')
  })
})
