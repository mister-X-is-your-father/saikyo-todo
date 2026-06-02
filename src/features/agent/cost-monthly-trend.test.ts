import { describe, expect, it } from 'vitest'

import {
  computeMonthlyCostTrend,
  computeMonthlyCostTrendByRole,
  type CostMonthEntry,
  formatMonthlyCostTrendByRoleJa,
  formatMonthlyCostTrendCompactJa,
  formatMonthlyCostTrendJa,
  monthlyCostTrendChipClasses,
  monthlyCostTrendToBriefSignal,
  monthlyCostTrendTone,
  rollupCostByMonth,
} from './cost-monthly-trend'

describe('rollupCostByMonth', () => {
  it('returns empty array when no rows', () => {
    expect(rollupCostByMonth([])).toEqual([])
  })

  it('sums same-month rows (e.g. role-split rows)', () => {
    const rolled = rollupCostByMonth([
      { month: '2026-04', costUsd: 1.2 },
      { month: '2026-04', costUsd: 0.3 }, // pm + researcher 想定
      { month: '2026-03', costUsd: 0.8 },
    ])
    expect(rolled).toEqual([
      { month: '2026-04', costUsd: 1.5 },
      { month: '2026-03', costUsd: 0.8 },
    ])
  })

  it('sorts month desc', () => {
    const rolled = rollupCostByMonth([
      { month: '2025-12', costUsd: 1 },
      { month: '2026-04', costUsd: 1 },
      { month: '2026-01', costUsd: 1 },
    ])
    expect(rolled.map((r) => r.month)).toEqual(['2026-04', '2026-01', '2025-12'])
  })

  it('skips invalid month and clamps invalid costUsd', () => {
    const rolled = rollupCostByMonth([
      { month: 'not-a-month', costUsd: 1 },
      { month: '2026-04-27', costUsd: 1 }, // 日付付きは月単位 not match
      { month: '2026-04', costUsd: Number.NaN },
      { month: '2026-04', costUsd: -5 },
      { month: '2026-04', costUsd: Infinity },
      { month: '2026-04', costUsd: 0.5 },
    ])
    expect(rolled).toEqual([{ month: '2026-04', costUsd: 0.5 }])
  })
})

describe('computeMonthlyCostTrend', () => {
  it('returns idle when this & prior month both zero', () => {
    const trend = computeMonthlyCostTrend([], '2026-04-29')
    expect(trend.direction).toBe('idle')
    expect(trend.thisMonth).toBe('2026-04')
    expect(trend.priorMonth).toBe('2026-03')
    expect(trend.deltaUsd).toBe(0)
    expect(trend.deltaPct).toBeNull()
  })

  it('returns idle nullish months when today is malformed', () => {
    const trend = computeMonthlyCostTrend([], 'garbage')
    expect(trend.thisMonth).toBeNull()
    expect(trend.priorMonth).toBeNull()
    expect(trend.direction).toBe('idle')
  })

  it('detects "up" with positive delta', () => {
    const entries: CostMonthEntry[] = [
      { month: '2026-04', costUsd: 1.5 },
      { month: '2026-03', costUsd: 1.0 },
    ]
    const trend = computeMonthlyCostTrend(entries, '2026-04-29')
    expect(trend.thisMonthUsd).toBe(1.5)
    expect(trend.priorMonthUsd).toBe(1.0)
    expect(trend.deltaUsd).toBe(0.5)
    expect(trend.deltaPct).toBe(50)
    expect(trend.direction).toBe('up')
  })

  it('detects "down" with negative delta', () => {
    const trend = computeMonthlyCostTrend(
      [
        { month: '2026-04', costUsd: 0.5 },
        { month: '2026-03', costUsd: 1.0 },
      ],
      '2026-04-29',
    )
    expect(trend.deltaUsd).toBe(-0.5)
    expect(trend.deltaPct).toBe(-50)
    expect(trend.direction).toBe('down')
  })

  it('detects "flat" within ±5% threshold', () => {
    const trend = computeMonthlyCostTrend(
      [
        { month: '2026-04', costUsd: 1.02 },
        { month: '2026-03', costUsd: 1.0 },
      ],
      '2026-04-29',
    )
    expect(trend.deltaPct).toBe(2)
    expect(trend.direction).toBe('flat')
  })

  it('returns "up" with deltaPct=null when prior=0 and this>0 (recovery from idle)', () => {
    const trend = computeMonthlyCostTrend([{ month: '2026-04', costUsd: 0.5 }], '2026-04-29')
    expect(trend.priorMonthUsd).toBe(0)
    expect(trend.thisMonthUsd).toBe(0.5)
    expect(trend.deltaPct).toBeNull()
    expect(trend.direction).toBe('up')
  })

  it('returns "down" when prior>0 but this=0', () => {
    const trend = computeMonthlyCostTrend([{ month: '2026-03', costUsd: 1.0 }], '2026-04-29')
    expect(trend.priorMonthUsd).toBe(1.0)
    expect(trend.thisMonthUsd).toBe(0)
    expect(trend.deltaUsd).toBe(-1.0)
    expect(trend.direction).toBe('down')
  })

  it('handles year boundary (Jan vs prior Dec)', () => {
    const trend = computeMonthlyCostTrend(
      [
        { month: '2026-01', costUsd: 0.5 },
        { month: '2025-12', costUsd: 0.4 },
      ],
      '2026-01-15',
    )
    expect(trend.thisMonth).toBe('2026-01')
    expect(trend.priorMonth).toBe('2025-12')
    expect(trend.thisMonthUsd).toBe(0.5)
    expect(trend.priorMonthUsd).toBe(0.4)
    expect(trend.direction).toBe('up')
  })

  it('skips entries outside this/prior month window', () => {
    const trend = computeMonthlyCostTrend(
      [
        { month: '2026-04', costUsd: 1.0 },
        { month: '2026-02', costUsd: 5.0 }, // 2 ヶ月前は無視
        { month: '2026-05', costUsd: 5.0 }, // 未来も無視
      ],
      '2026-04-29',
    )
    expect(trend.thisMonthUsd).toBe(1.0)
    expect(trend.priorMonthUsd).toBe(0)
  })

  it('accepts today in YYYY-MM format directly', () => {
    const trend = computeMonthlyCostTrend(
      [
        { month: '2026-04', costUsd: 1 },
        { month: '2026-03', costUsd: 1 },
      ],
      '2026-04',
    )
    expect(trend.thisMonth).toBe('2026-04')
    expect(trend.direction).toBe('flat')
  })
})

describe('formatMonthlyCostTrendJa', () => {
  it('idle → 記録なし sentinel', () => {
    expect(
      formatMonthlyCostTrendJa({
        thisMonth: '2026-04',
        thisMonthUsd: 0,
        priorMonth: '2026-03',
        priorMonthUsd: 0,
        deltaUsd: 0,
        deltaPct: null,
        direction: 'idle',
      }),
    ).toBe('AI コスト: 先月今月とも記録なし')
  })

  it('flat → 安定文言', () => {
    const out = formatMonthlyCostTrendJa({
      thisMonth: '2026-04',
      thisMonthUsd: 1.02,
      priorMonth: '2026-03',
      priorMonthUsd: 1.0,
      deltaUsd: 0.02,
      deltaPct: 2,
      direction: 'flat',
    })
    expect(out).toContain('安定')
    expect(out).toContain('$1.00')
    expect(out).toContain('$1.02')
  })

  it('up → 増加文言 + sign + pct', () => {
    const out = formatMonthlyCostTrendJa({
      thisMonth: '2026-04',
      thisMonthUsd: 1.5,
      priorMonth: '2026-03',
      priorMonthUsd: 1.0,
      deltaUsd: 0.5,
      deltaPct: 50,
      direction: 'up',
    })
    expect(out).toContain('増加')
    expect(out).toContain('+$0.500')
    expect(out).toContain('+50%')
  })

  it('down → 減少文言', () => {
    const out = formatMonthlyCostTrendJa({
      thisMonth: '2026-04',
      thisMonthUsd: 0.5,
      priorMonth: '2026-03',
      priorMonthUsd: 1.0,
      deltaUsd: -0.5,
      deltaPct: -50,
      direction: 'down',
    })
    expect(out).toContain('減少')
    expect(out).toContain('-$0.500')
    expect(out).toContain('-50%')
  })

  it('up with deltaPct=null (recovery from $0) — % 部分は省略', () => {
    const out = formatMonthlyCostTrendJa({
      thisMonth: '2026-04',
      thisMonthUsd: 0.5,
      priorMonth: '2026-03',
      priorMonthUsd: 0,
      deltaUsd: 0.5,
      deltaPct: null,
      direction: 'up',
    })
    expect(out).toContain('増加')
    expect(out).toContain('+$0.500')
    expect(out).not.toContain('%')
  })

  it('uses 2 decimals for >=$1, 3 decimals for <$1', () => {
    expect(
      formatMonthlyCostTrendJa({
        thisMonth: '2026-04',
        thisMonthUsd: 12.5,
        priorMonth: '2026-03',
        priorMonthUsd: 10,
        deltaUsd: 2.5,
        deltaPct: 25,
        direction: 'up',
      }),
    ).toContain('$12.50')
  })
})

describe('integration: rollup → trend → format', () => {
  it('connects all 3 helpers end-to-end (role-split rows → 1 行 summary)', () => {
    const rows = [
      { month: '2026-04', costUsd: 0.8 },
      { month: '2026-04', costUsd: 0.7 }, // pm role
      { month: '2026-03', costUsd: 1.0 },
    ]
    const rolled = rollupCostByMonth(rows)
    const trend = computeMonthlyCostTrend(rolled, '2026-04-29')
    expect(trend.thisMonthUsd).toBe(1.5)
    expect(trend.priorMonthUsd).toBe(1.0)
    expect(trend.direction).toBe('up')
    const out = formatMonthlyCostTrendJa(trend)
    expect(out).toContain('増加')
    expect(out).toContain('$1.50')
    expect(out).toContain('$1.00')
  })
})

describe('computeMonthlyCostTrendByRole (role 別 trend、AI brief / dashboard widget 共通)', () => {
  it('PM 増加 / Researcher 安定 を別々 trend で取り出す', () => {
    const rows = [
      { month: '2026-04', role: 'pm', costUsd: 0.8 },
      { month: '2026-03', role: 'pm', costUsd: 0.5 },
      { month: '2026-04', role: 'researcher', costUsd: 0.3 },
      { month: '2026-03', role: 'researcher', costUsd: 0.3 }, // 安定 = flat
    ]
    const trends = computeMonthlyCostTrendByRole(rows, '2026-04-29')
    expect(trends.pm.direction).toBe('up')
    expect(trends.pm.thisMonthUsd).toBe(0.8)
    expect(trends.pm.priorMonthUsd).toBe(0.5)
    expect(trends.researcher.direction).toBe('flat')
    expect(trends.researcher.thisMonthUsd).toBe(0.3)
    expect(trends.researcher.priorMonthUsd).toBe(0.3)
  })

  it('role 不在は idle trend で埋まる (caller は undefined check 不要)', () => {
    const rows = [{ month: '2026-04', role: 'pm', costUsd: 0.5 }]
    const trends = computeMonthlyCostTrendByRole(rows, '2026-04-29')
    expect(trends.pm.direction).toBe('up') // 先月 0 → 今月 0.5
    expect(trends.researcher.direction).toBe('idle')
    expect(trends.researcher.thisMonthUsd).toBe(0)
  })

  it('未知 role / 不正 month を skip', () => {
    const rows = [
      { month: '2026-04', role: 'pm', costUsd: 0.5 },
      { month: '2026-04', role: 'engineer' as const, costUsd: 100 }, // 未知 role 想定
      { month: 'not-a-month', role: 'pm', costUsd: 1 },
    ]
    const trends = computeMonthlyCostTrendByRole(rows, '2026-04-29')
    expect(trends.pm.thisMonthUsd).toBe(0.5)
  })
})

describe('formatMonthlyCostTrendByRoleJa', () => {
  it('全 role idle → 「先月今月とも記録なし」', () => {
    const trends = computeMonthlyCostTrendByRole([], '2026-04-29')
    expect(formatMonthlyCostTrendByRoleJa(trends)).toBe('AI コスト: 先月今月とも記録なし')
  })

  it('PM 増加 + Researcher 安定 → 「AI コスト: PM 増加・Researcher 安定」', () => {
    const rows = [
      { month: '2026-04', role: 'pm', costUsd: 0.8 },
      { month: '2026-03', role: 'pm', costUsd: 0.5 },
      { month: '2026-04', role: 'researcher', costUsd: 0.3 },
      { month: '2026-03', role: 'researcher', costUsd: 0.3 },
    ]
    const trends = computeMonthlyCostTrendByRole(rows, '2026-04-29')
    expect(formatMonthlyCostTrendByRoleJa(trends)).toBe('AI コスト: PM 増加・Researcher 安定')
  })

  it('PM のみ entry → 「PM 増加・Researcher 記録なし」', () => {
    const rows = [{ month: '2026-04', role: 'pm', costUsd: 0.5 }]
    const trends = computeMonthlyCostTrendByRole(rows, '2026-04-29')
    expect(formatMonthlyCostTrendByRoleJa(trends)).toBe('AI コスト: PM 増加・Researcher 記録なし')
  })

  it('PM 減少 + Researcher 減少', () => {
    const rows = [
      { month: '2026-04', role: 'pm', costUsd: 0.3 },
      { month: '2026-03', role: 'pm', costUsd: 0.8 },
      { month: '2026-04', role: 'researcher', costUsd: 0.1 },
      { month: '2026-03', role: 'researcher', costUsd: 0.5 },
    ]
    const trends = computeMonthlyCostTrendByRole(rows, '2026-04-29')
    expect(formatMonthlyCostTrendByRoleJa(trends)).toBe('AI コスト: PM 減少・Researcher 減少')
  })
})

describe('formatMonthlyCostTrendCompactJa (iter792 — chip / Slack 用 短縮形)', () => {
  it('idle → 「AI コスト: 記録なし」', () => {
    const trend = computeMonthlyCostTrend([], '2026-04-29')
    expect(trend.direction).toBe('idle')
    expect(formatMonthlyCostTrendCompactJa(trend)).toBe('AI コスト: 記録なし')
  })

  it('flat → 「AI コスト: 安定」 (delta 詳細省略)', () => {
    const entries: CostMonthEntry[] = [
      { month: '2026-04', costUsd: 1.0 },
      { month: '2026-03', costUsd: 1.0 },
    ]
    const trend = computeMonthlyCostTrend(entries, '2026-04-29')
    expect(trend.direction).toBe('flat')
    expect(formatMonthlyCostTrendCompactJa(trend)).toBe('AI コスト: 安定')
  })

  it('up + deltaPct あり → 「AI コスト: 増加 (+N%)」', () => {
    const entries: CostMonthEntry[] = [
      { month: '2026-04', costUsd: 1.5 },
      { month: '2026-03', costUsd: 1.0 },
    ]
    const trend = computeMonthlyCostTrend(entries, '2026-04-29')
    expect(trend.direction).toBe('up')
    expect(formatMonthlyCostTrendCompactJa(trend)).toBe('AI コスト: 増加 (+50%)')
  })

  it('up + deltaPct=null (先月 0 → 今月 +α) → 「AI コスト: 増加 (新規)」', () => {
    const entries: CostMonthEntry[] = [{ month: '2026-04', costUsd: 1.5 }]
    const trend = computeMonthlyCostTrend(entries, '2026-04-29')
    expect(trend.direction).toBe('up')
    expect(trend.deltaPct).toBeNull()
    expect(formatMonthlyCostTrendCompactJa(trend)).toBe('AI コスト: 増加 (新規)')
  })

  it('down → 「AI コスト: 減少 (-N%)」', () => {
    const entries: CostMonthEntry[] = [
      { month: '2026-04', costUsd: 0.5 },
      { month: '2026-03', costUsd: 1.0 },
    ]
    const trend = computeMonthlyCostTrend(entries, '2026-04-29')
    expect(trend.direction).toBe('down')
    expect(formatMonthlyCostTrendCompactJa(trend)).toBe('AI コスト: 減少 (-50%)')
  })

  it('down + 今月 0 → deltaPct=-100% (down + prior>0 なら必ず数値)', () => {
    const entries: CostMonthEntry[] = [{ month: '2026-03', costUsd: 1.0 }]
    const trend = computeMonthlyCostTrend(entries, '2026-04-29')
    expect(trend.direction).toBe('down')
    expect(trend.deltaPct).toBe(-100)
    expect(formatMonthlyCostTrendCompactJa(trend)).toBe('AI コスト: 減少 (-100%)')
  })
})

// iter1702 fix: iter1531 chip-tone `light dark:dark` 拡張への追従 (iter1701 due-proximity と同 sweep)。
describe('monthlyCostTrendTone / monthlyCostTrendChipClasses (iter792 — graphical chip)', () => {
  it('up → warn (amber、コスト増 = 注意)', () => {
    expect(monthlyCostTrendTone('up')).toBe('warn')
    expect(monthlyCostTrendChipClasses('up').bgClass).toBe('bg-amber-50 dark:bg-amber-950/30')
  })

  it('down → success (emerald、コスト減 = 改善)', () => {
    expect(monthlyCostTrendTone('down')).toBe('success')
    expect(monthlyCostTrendChipClasses('down').bgClass).toBe('bg-emerald-50 dark:bg-emerald-950/30')
  })

  it('flat → info (blue、安定)', () => {
    expect(monthlyCostTrendTone('flat')).toBe('info')
  })

  it('idle → idle (slate、記録なし)', () => {
    expect(monthlyCostTrendTone('idle')).toBe('idle')
  })
})

describe('monthlyCostTrendToBriefSignal (iter795 — AgentBriefSignal compose)', () => {
  it('idle → tone=idle、text=記録なし', () => {
    const trend = computeMonthlyCostTrend([], '2026-04-29')
    const sig = monthlyCostTrendToBriefSignal(trend)
    expect(sig.tone).toBe('idle')
    expect(sig.text).toBe('AI コスト: 記録なし')
  })

  it('up → tone=warn (= chip 配色 amber と一致、cost 増 = 警戒)', () => {
    const entries: CostMonthEntry[] = [
      { month: '2026-04', costUsd: 1.5 },
      { month: '2026-03', costUsd: 1.0 },
    ]
    const trend = computeMonthlyCostTrend(entries, '2026-04-29')
    expect(trend.direction).toBe('up')
    const sig = monthlyCostTrendToBriefSignal(trend)
    expect(sig.tone).toBe('warn')
    expect(sig.text).toContain('増加')
  })

  it('down → tone=success (= chip 配色 emerald と一致、cost 減 = 改善)', () => {
    const entries: CostMonthEntry[] = [
      { month: '2026-04', costUsd: 0.5 },
      { month: '2026-03', costUsd: 1.0 },
    ]
    const trend = computeMonthlyCostTrend(entries, '2026-04-29')
    expect(trend.direction).toBe('down')
    const sig = monthlyCostTrendToBriefSignal(trend)
    expect(sig.tone).toBe('success')
    expect(sig.text).toContain('減少')
  })

  it('flat → tone=info (安定)', () => {
    const entries: CostMonthEntry[] = [
      { month: '2026-04', costUsd: 1.0 },
      { month: '2026-03', costUsd: 1.0 },
    ]
    const trend = computeMonthlyCostTrend(entries, '2026-04-29')
    expect(trend.direction).toBe('flat')
    const sig = monthlyCostTrendToBriefSignal(trend)
    expect(sig.tone).toBe('info')
  })
})
