import { describe, expect, it } from 'vitest'

import {
  compareUrgency,
  computeUrgency,
  countItemsByUrgencyTier,
  explainUrgency,
  formatTopUrgentTitlesJa,
  formatUrgencyExplanation,
  formatUrgencyTierCounts,
  groupItemsByUrgencyTier,
  pickItemsByUrgencyTiers,
  selectTopUrgentItems,
  type UrgencyFields,
  type UrgencyTier,
  urgencyTier,
  urgencyTierChipClasses,
  urgencyTierCountsChipTone,
  urgencyTierCountsSeverity,
  urgencyTierCountsToBriefSignal,
  urgencyTierLabel,
  urgencyTierOf,
  urgencyTierTone,
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

// ----------------------------------------------------------------------
// iter294 ai-automation: urgencyTier + group/count/format
// ----------------------------------------------------------------------

describe('urgencyTier — score → bucket', () => {
  it('score >= 100 は critical (緊急)', () => {
    expect(urgencyTier(100)).toBe<UrgencyTier>('critical')
    expect(urgencyTier(180)).toBe<UrgencyTier>('critical') // p1+overdue+must の最大値
    expect(urgencyTier(150)).toBe<UrgencyTier>('critical') // p1+overdue
  })

  it('50 ≤ score < 100 は high (高)', () => {
    expect(urgencyTier(50)).toBe<UrgencyTier>('high')
    expect(urgencyTier(70)).toBe<UrgencyTier>('high') // p2 単独
    expect(urgencyTier(90)).toBe<UrgencyTier>('high') // p3+overdue
    expect(urgencyTier(99)).toBe<UrgencyTier>('high')
  })

  it('20 ≤ score < 50 は medium (中)', () => {
    expect(urgencyTier(20)).toBe<UrgencyTier>('medium')
    expect(urgencyTier(40)).toBe<UrgencyTier>('medium') // p3 単独
    expect(urgencyTier(45)).toBe<UrgencyTier>('medium') // p4+today
    expect(urgencyTier(49)).toBe<UrgencyTier>('medium')
  })

  it('0 < score < 20 は low (低)', () => {
    expect(urgencyTier(1)).toBe<UrgencyTier>('low')
    expect(urgencyTier(10)).toBe<UrgencyTier>('low') // p4 単独
    expect(urgencyTier(19)).toBe<UrgencyTier>('low')
  })

  it('score = 0 / 負値 / NaN / Infinity は none (対象外)', () => {
    expect(urgencyTier(0)).toBe<UrgencyTier>('none')
    expect(urgencyTier(-5)).toBe<UrgencyTier>('none')
    expect(urgencyTier(Number.NaN)).toBe<UrgencyTier>('none')
    expect(urgencyTier(Number.POSITIVE_INFINITY)).toBe<UrgencyTier>('none')
    expect(urgencyTier(Number.NEGATIVE_INFINITY)).toBe<UrgencyTier>('none')
  })

  it('境界 (100/50/20) は上位 tier に属する (= 大なりイコール側)', () => {
    expect(urgencyTier(99)).toBe<UrgencyTier>('high')
    expect(urgencyTier(100)).toBe<UrgencyTier>('critical')
    expect(urgencyTier(49)).toBe<UrgencyTier>('medium')
    expect(urgencyTier(50)).toBe<UrgencyTier>('high')
    expect(urgencyTier(19)).toBe<UrgencyTier>('low')
    expect(urgencyTier(20)).toBe<UrgencyTier>('medium')
  })
})

describe('urgencyTierOf', () => {
  it('item → tier の 1 hop shorthand (urgencyTier(computeUrgency()) と等価)', () => {
    expect(urgencyTierOf(item({ priority: 1 }), TODAY)).toBe<UrgencyTier>('critical')
    expect(urgencyTierOf(item({ priority: 2 }), TODAY)).toBe<UrgencyTier>('high')
    expect(urgencyTierOf(item({ priority: 3 }), TODAY)).toBe<UrgencyTier>('medium')
    expect(urgencyTierOf(item({ priority: 4 }), TODAY)).toBe<UrgencyTier>('low')
    expect(
      urgencyTierOf(item({ priority: 1, doneAt: new Date('2026-04-26') }), TODAY),
    ).toBe<UrgencyTier>('none')
  })

  it('proximity bonus / MUST も合成 score 経由で正しく tier 化', () => {
    // p4 + overdue + must = 10+50+30 = 90 → high
    expect(
      urgencyTierOf(item({ priority: 4, dueDate: '2026-04-26', isMust: true }), TODAY),
    ).toBe<UrgencyTier>('high')
  })
})

describe('urgencyTierLabel', () => {
  it('5 tier の日本語短ラベルを返す', () => {
    expect(urgencyTierLabel('critical')).toBe('緊急')
    expect(urgencyTierLabel('high')).toBe('高')
    expect(urgencyTierLabel('medium')).toBe('中')
    expect(urgencyTierLabel('low')).toBe('低')
    expect(urgencyTierLabel('none')).toBe('対象外')
  })
})

describe('groupItemsByUrgencyTier', () => {
  it('各 tier に正しく振り分ける (computeUrgency 経由)', () => {
    const items = [
      item({ priority: 1 }), // 100 → critical
      item({ priority: 2 }), // 70 → high
      item({ priority: 3 }), // 40 → medium
      item({ priority: 4 }), // 10 → low
      item({ priority: 1, doneAt: new Date('2026-04-26') }), // 0 → none
      item({ priority: 2, archivedAt: new Date('2026-04-26') }), // 0 → none
    ]
    const groups = groupItemsByUrgencyTier(items, TODAY)
    expect(groups.critical.map((i) => i.priority)).toEqual([1])
    expect(groups.high.map((i) => i.priority)).toEqual([2])
    expect(groups.medium.map((i) => i.priority)).toEqual([3])
    expect(groups.low.map((i) => i.priority)).toEqual([4])
    expect(groups.none).toHaveLength(2)
  })

  it('空配列 → 全 tier 空配列で初期化されている', () => {
    const groups = groupItemsByUrgencyTier([], TODAY)
    expect(groups.critical).toEqual([])
    expect(groups.high).toEqual([])
    expect(groups.medium).toEqual([])
    expect(groups.low).toEqual([])
    expect(groups.none).toEqual([])
  })

  it('元配列順を保つ stable group 化 (同 tier 内)', () => {
    const A = item({ priority: 1 })
    const B = item({ priority: 1, isMust: true }) // 130 → critical
    const C = item({ priority: 1, dueDate: '2026-04-27' }) // 135 → critical
    const groups = groupItemsByUrgencyTier([A, B, C], TODAY)
    expect(groups.critical[0]).toBe(A)
    expect(groups.critical[1]).toBe(B)
    expect(groups.critical[2]).toBe(C)
  })

  it('proximity bonus で tier 上昇 (p4+overdue+must = 90 → high)', () => {
    const items = [
      item({ priority: 4, dueDate: '2026-04-26', isMust: true }), // 10+50+30=90 → high
      item({ priority: 4, dueDate: '2026-04-27' }), // 10+35=45 → medium
    ]
    const groups = groupItemsByUrgencyTier(items, TODAY)
    expect(groups.high).toHaveLength(1)
    expect(groups.medium).toHaveLength(1)
  })
})

describe('countItemsByUrgencyTier', () => {
  it('tier 別件数を返す (group の個数版)', () => {
    const items = [
      item({ priority: 1 }), // critical
      item({ priority: 1 }), // critical
      item({ priority: 2 }), // high
      item({ priority: 4 }), // low
      item({ priority: 4, doneAt: new Date('2026-04-26') }), // none
    ]
    expect(countItemsByUrgencyTier(items, TODAY)).toEqual({
      critical: 2,
      high: 1,
      medium: 0,
      low: 1,
      none: 1,
    })
  })

  it('空配列 → 全 tier 0', () => {
    expect(countItemsByUrgencyTier([], TODAY)).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    })
  })
})

describe('formatUrgencyTierCounts', () => {
  it('件数 0 の tier は省略し、tier 順で連結', () => {
    expect(formatUrgencyTierCounts({ critical: 2, high: 1, medium: 0, low: 4, none: 8 })).toBe(
      '緊急 2 / 高 1 / 低 4 / 対象外 8',
    )
  })

  it('全 0 → "0 件"', () => {
    expect(formatUrgencyTierCounts({ critical: 0, high: 0, medium: 0, low: 0, none: 0 })).toBe(
      '0 件',
    )
  })

  it('単一 tier のみでも順序を保つ', () => {
    expect(formatUrgencyTierCounts({ critical: 0, high: 0, medium: 5, low: 0, none: 0 })).toBe(
      '中 5',
    )
  })

  it('tier 順は critical → high → medium → low → none', () => {
    expect(formatUrgencyTierCounts({ critical: 1, high: 0, medium: 0, low: 0, none: 1 })).toBe(
      '緊急 1 / 対象外 1',
    )
  })
})

describe('pickItemsByUrgencyTiers', () => {
  it('returns empty array when tiers is empty', () => {
    const items: UrgencyFields[] = [item({ priority: 1, isMust: true, dueDate: '2026-04-25' })]
    expect(pickItemsByUrgencyTiers(items, [], TODAY)).toEqual([])
  })

  it('returns only items matching specified tiers (single tier)', () => {
    const a = item({ priority: 1, isMust: true, dueDate: '2026-04-25' }) // critical (overdue+must)
    const b = item({ priority: 4 }) // low
    const c = item({ priority: 2 }) // high (P2)
    const result = pickItemsByUrgencyTiers([a, b, c], ['critical'], TODAY)
    expect(result).toEqual([a])
  })

  it('returns items matching any of multiple tiers (actionable subset)', () => {
    const a = item({ priority: 1, isMust: true, dueDate: '2026-04-25' }) // critical
    const b = item({ priority: 4 }) // low
    const c = item({ priority: 2 }) // high
    const result = pickItemsByUrgencyTiers([a, b, c], ['critical', 'high'], TODAY)
    // a (critical) and c (high) — stable order
    expect(result).toEqual([a, c])
  })

  it('preserves stable element order from input', () => {
    const a = item({ priority: 2 }) // high
    const b = item({ priority: 4 }) // low (excluded)
    const c = item({ priority: 2 }) // high
    const result = pickItemsByUrgencyTiers([a, b, c], ['high'], TODAY)
    expect(result).toEqual([a, c])
  })

  it('treats done items as none tier (excluded from active filter)', () => {
    const a = item({ priority: 1, doneAt: new Date() }) // none (done)
    const b = item({ priority: 1 }) // high (P1)
    const result = pickItemsByUrgencyTiers([a, b], ['critical', 'high'], TODAY)
    expect(result).toEqual([b])
  })
})

describe('urgencyTierCountsSeverity', () => {
  it('critical > 0 で severe (high の有無に依存しない)', () => {
    expect(urgencyTierCountsSeverity({ critical: 1, high: 0, medium: 0, low: 0, none: 0 })).toBe(
      'severe',
    )
    expect(urgencyTierCountsSeverity({ critical: 2, high: 5, medium: 0, low: 0, none: 0 })).toBe(
      'severe',
    )
  })

  it('critical = 0 かつ high > 0 で warn', () => {
    expect(urgencyTierCountsSeverity({ critical: 0, high: 1, medium: 0, low: 0, none: 0 })).toBe(
      'warn',
    )
    expect(urgencyTierCountsSeverity({ critical: 0, high: 5, medium: 10, low: 20, none: 3 })).toBe(
      'warn',
    )
  })

  it('critical = 0 かつ high = 0 で idle (= chip 非表示状態、medium/low/none のみ)', () => {
    expect(urgencyTierCountsSeverity({ critical: 0, high: 0, medium: 5, low: 10, none: 2 })).toBe(
      'idle',
    )
  })

  it('全件 0 で idle (= active item 0、UI 静か)', () => {
    expect(urgencyTierCountsSeverity({ critical: 0, high: 0, medium: 0, low: 0, none: 0 })).toBe(
      'idle',
    )
  })
})

describe('formatTopUrgentTitlesJa', () => {
  const titled = (overrides: Partial<UrgencyFields> & { title: string }) => ({
    priority: 4 as const,
    dueDate: null,
    isMust: false,
    doneAt: null,
    archivedAt: null,
    ...overrides,
  })

  it('上位 N 件を tier ラベル付きで 1 行に format', () => {
    const items = [
      titled({ title: 'やばい', priority: 1, dueDate: '2026-04-25', isMust: true }), // critical
      titled({ title: '普通の作業', priority: 4 }), // low
      titled({ title: '急ぎ', priority: 2 }), // high
      titled({ title: '中程度', priority: 3 }), // medium
    ]
    expect(formatTopUrgentTitlesJa(items, 2, TODAY)).toBe('上位 urgent: やばい (緊急) / 急ぎ (高)')
  })

  it('全 done / archive (urgency=0) → 緊急対応 0 件', () => {
    const items = [
      titled({ title: '完了', priority: 1, doneAt: new Date('2026-04-26') }),
      titled({ title: 'archive', priority: 2, archivedAt: new Date('2026-04-26') }),
    ]
    expect(formatTopUrgentTitlesJa(items, 3, TODAY)).toBe('緊急対応 0 件')
  })

  it('n <= 0 → 緊急対応 0 件', () => {
    const items = [titled({ title: 'やばい', priority: 1 })]
    expect(formatTopUrgentTitlesJa(items, 0, TODAY)).toBe('緊急対応 0 件')
    expect(formatTopUrgentTitlesJa(items, -3, TODAY)).toBe('緊急対応 0 件')
  })

  it('n が件数より大きくても全件 format (短く)', () => {
    const items = [titled({ title: 'A', priority: 1 }), titled({ title: 'B', priority: 4 })]
    expect(formatTopUrgentTitlesJa(items, 100, TODAY)).toBe('上位 urgent: A (緊急) / B (低)')
  })

  it('空配列 → 緊急対応 0 件', () => {
    expect(formatTopUrgentTitlesJa([], 5, TODAY)).toBe('緊急対応 0 件')
  })

  it('proximity bonus で tier 上昇した item も正しい tier で format', () => {
    const items = [
      titled({ title: '期限切れ p4', priority: 4, dueDate: '2026-04-26', isMust: true }), // 90 → high
    ]
    expect(formatTopUrgentTitlesJa(items, 1, TODAY)).toBe('上位 urgent: 期限切れ p4 (高)')
  })
})

describe('urgencyTierTone (graphical 波及 — tier → chip tone token)', () => {
  it('5 段階 tone 全使用 (critical→danger / high→urgent / medium→warn / low→info / none→idle)', () => {
    expect(urgencyTierTone('critical')).toBe('danger')
    expect(urgencyTierTone('high')).toBe('urgent')
    expect(urgencyTierTone('medium')).toBe('warn')
    expect(urgencyTierTone('low')).toBe('info')
    expect(urgencyTierTone('none')).toBe('idle')
  })
})

// iter1702 fix: iter1531 chip-tone `light dark:dark` 拡張への追従 (iter1701 due-proximity と同 sweep)。
describe('urgencyTierChipClasses (Tailwind 3 軸 class、iter481/482 と整合)', () => {
  it('critical → rose 3 軸 (iter481 dueProximity overdue と同色)', () => {
    const c = urgencyTierChipClasses('critical')
    expect(c.bgClass).toBe('bg-rose-100 dark:bg-rose-950/40')
    expect(c.textClass).toBe('text-rose-700 dark:text-rose-300')
    expect(c.ringClass).toBe('ring-rose-300 dark:ring-rose-900/50')
  })

  it('high vs medium で amber 強弱を区別 (urgent 100 vs warn 50)', () => {
    expect(urgencyTierChipClasses('high').bgClass).toBe('bg-amber-100 dark:bg-amber-950/40')
    expect(urgencyTierChipClasses('medium').bgClass).toBe('bg-amber-50 dark:bg-amber-950/30')
  })

  it('low → blue 薄、none → slate 薄 (計画範囲内 vs 対象外を区別)', () => {
    expect(urgencyTierChipClasses('low').textClass).toBe('text-blue-700 dark:text-blue-300')
    expect(urgencyTierChipClasses('none').textClass).toBe('text-slate-600 dark:text-slate-400')
  })
})

describe('urgencyTierCountsChipTone (iter1056)', () => {
  const empty: Record<UrgencyTier, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  }

  it('全 0 → idle tone', () => {
    expect(urgencyTierCountsChipTone(empty)).toBe('idle')
  })

  it('medium/low/none のみ → idle tone (= chip 非表示 progressive disclosure)', () => {
    expect(urgencyTierCountsChipTone({ ...empty, medium: 5, low: 3, none: 10 })).toBe('idle')
  })

  it('high > 0 + critical = 0 → warn tone', () => {
    expect(urgencyTierCountsChipTone({ ...empty, high: 2 })).toBe('warn')
  })

  it('critical > 0 → danger tone (= 強警告)', () => {
    expect(urgencyTierCountsChipTone({ ...empty, critical: 1 })).toBe('danger')
    expect(urgencyTierCountsChipTone({ ...empty, critical: 3, high: 5 })).toBe('danger')
  })
})

describe('urgencyTierCountsToBriefSignal (iter1056)', () => {
  const empty: Record<UrgencyTier, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  }

  it('全 0 → idle tone + "0 件" sentinel', () => {
    const signal = urgencyTierCountsToBriefSignal(empty)
    expect(signal.tone).toBe('idle')
    expect(signal.text).toBe('0 件')
  })

  it('critical 含む → danger tone + summary text', () => {
    const signal = urgencyTierCountsToBriefSignal({ ...empty, critical: 2, high: 3 })
    expect(signal.tone).toBe('danger')
    expect(signal.text).toContain('緊急 2')
    expect(signal.text).toContain('高 3')
  })

  it('high のみ (critical なし) → warn tone', () => {
    const signal = urgencyTierCountsToBriefSignal({ ...empty, high: 1 })
    expect(signal.tone).toBe('warn')
    expect(signal.text).toContain('高 1')
  })
})
