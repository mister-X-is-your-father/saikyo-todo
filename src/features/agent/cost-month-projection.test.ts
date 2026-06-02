/**
 * iter479 cost-month-projection の unit test。pure helper のみ、DB / DOM 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  computeCostMonthProjection,
  costMonthProjectionChipClasses,
  costMonthProjectionToBriefSignal,
  costMonthProjectionTone,
  formatCostMonthProjectionCompactJa,
  formatCostMonthProjectionJa,
} from './cost-month-projection'

describe('computeCostMonthProjection (月末コスト線形予測)', () => {
  it('月初 10 日で $1、4月 30 日 → 月末予測 $3', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 1,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    expect(r.thisMonthUsd).toBe(1)
    expect(r.daysElapsed).toBe(10)
    expect(r.daysInMonth).toBe(30)
    expect(r.daysRemaining).toBe(20)
    expect(r.projectedUsd).toBe(3) // 1 / 10 * 30
    expect(r.riskLevel).toBe('safe') // 3 < 5 * 0.8 = 4
    expect(r.warnTriggered).toBe(false)
  })

  it('limit*warn 超過 → riskLevel=warn', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 1.5,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    // projected = 1.5/10*30 = 4.5、warn = 5*0.8 = 4 ≤ 4.5 < 5 = limit
    expect(r.projectedUsd).toBe(4.5)
    expect(r.riskLevel).toBe('warn')
    expect(r.warnTriggered).toBe(true)
    expect(r.exceedsLimit).toBe(false)
  })

  it('limit 超過予測 → riskLevel=over', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 2,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    // projected = 2/10*30 = 6 >= 5 = over
    expect(r.projectedUsd).toBe(6)
    expect(r.riskLevel).toBe('over')
    expect(r.exceedsLimit).toBe(true)
  })

  it('limit=null → safe 固定 + projection だけ返す', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 100,
      today: '2026-04-10',
      monthlyLimitUsd: null,
    })
    expect(r.limitUsd).toBeNull()
    expect(r.riskLevel).toBe('safe')
    expect(r.projectedUsd).toBe(300)
  })

  it('today 不正 → idle (projection なし)', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 1,
      today: 'not-a-date',
      monthlyLimitUsd: 5,
    })
    expect(r.riskLevel).toBe('idle')
    expect(r.daysElapsed).toBe(0)
    expect(r.projectedUsd).toBe(0)
  })

  it('thisMonthUsd<=0 / NaN → 0 にクランプ + projection=0', () => {
    const r1 = computeCostMonthProjection({
      thisMonthUsd: -5,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    expect(r1.thisMonthUsd).toBe(0)
    expect(r1.projectedUsd).toBe(0)
    expect(r1.riskLevel).toBe('safe')

    const r2 = computeCostMonthProjection({
      thisMonthUsd: NaN,
      today: '2026-04-10',
    })
    expect(r2.thisMonthUsd).toBe(0)
    expect(r2.projectedUsd).toBe(0)
  })

  it('月末当日 → daysRemaining=0、projected≈thisMonthUsd', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 4.5,
      today: '2026-04-30',
      monthlyLimitUsd: 5,
    })
    expect(r.daysElapsed).toBe(30)
    expect(r.daysInMonth).toBe(30)
    expect(r.daysRemaining).toBe(0)
    expect(r.projectedUsd).toBe(4.5)
    expect(r.riskLevel).toBe('warn') // 4.5 >= 5*0.8 = 4
  })

  it('うるう年 2 月 (29 日)', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 1,
      today: '2024-02-10',
      monthlyLimitUsd: 5,
    })
    expect(r.daysInMonth).toBe(29)
    // projected = 1/10*29 = 2.9
    expect(r.projectedUsd).toBeCloseTo(2.9, 5)
  })

  it('warnThresholdRatio カスタム (0.5) → 早めに warn', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 1,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
      warnThresholdRatio: 0.5,
    })
    // projected = 3、warn = 5*0.5 = 2.5 ≤ 3 < 5
    expect(r.riskLevel).toBe('warn')
  })
})

describe('formatCostMonthProjectionJa', () => {
  it('idle → 不明文言', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 1,
      today: 'invalid',
    })
    expect(formatCostMonthProjectionJa(r)).toBe('AI コスト予測: 不明 (today 不正)')
  })

  it('limit なし → 「今月予測 X (現在 Y / 残 Z 日)」', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 0.4,
      today: '2026-04-10',
      monthlyLimitUsd: null,
    })
    // projected = 0.4/10*30 = 1.2
    expect(formatCostMonthProjectionJa(r)).toBe('今月予測 $1.20 (現在 $0.400 / 残 20 日)')
  })

  it('safe → 「今月予測 X / 上限 Y (現在 Z / 残 N 日)」', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 0.4,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    expect(formatCostMonthProjectionJa(r)).toBe(
      '今月予測 $1.20 / 上限 $5.00 (現在 $0.400 / 残 20 日)',
    )
  })

  it('warn → ⚠ 警告ライン文言', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 1.5,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    expect(formatCostMonthProjectionJa(r)).toBe(
      '⚠ 今月予測 $4.50 / 上限 $5.00 — 警告ライン超過見込み (現在 $1.50 / 残 20 日)',
    )
  })

  it('over → 🚨 月末超過文言', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 2,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    expect(formatCostMonthProjectionJa(r)).toBe(
      '🚨 今月予測 $6.00 / 上限 $5.00 — 月末超過見込み (現在 $2.00 / 残 20 日)',
    )
  })
})

describe('formatCostMonthProjectionCompactJa (compact dashboard / Slack 用)', () => {
  it('idle → 不明', () => {
    const r = computeCostMonthProjection({ thisMonthUsd: 1, today: 'invalid' })
    expect(formatCostMonthProjectionCompactJa(r)).toBe('AI コスト: 不明 (today 不正)')
  })

  it('制限なし → 今月予測のみ', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 0.4,
      today: '2026-04-10',
      monthlyLimitUsd: null,
    })
    expect(formatCostMonthProjectionCompactJa(r)).toBe('AI コスト: 今月予測 $1.20')
  })

  it('safe → 「安全 X / Y」', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 0.4,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    expect(formatCostMonthProjectionCompactJa(r)).toBe('AI コスト: 安全 $1.20 / $5.00')
  })

  it('warn → 「警告 X / Y」', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 1.5,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    expect(formatCostMonthProjectionCompactJa(r)).toBe('AI コスト: 警告 $4.50 / $5.00')
  })

  it('over → 「超過予測 X / Y」', () => {
    const r = computeCostMonthProjection({
      thisMonthUsd: 2,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    expect(formatCostMonthProjectionCompactJa(r)).toBe('AI コスト: 超過予測 $6.00 / $5.00')
  })
})

describe('costMonthProjectionTone (graphical 波及 — risk → chip tone token)', () => {
  it('over → danger / warn → warn / safe → info / idle → idle', () => {
    expect(costMonthProjectionTone('over')).toBe('danger')
    expect(costMonthProjectionTone('warn')).toBe('warn')
    expect(costMonthProjectionTone('safe')).toBe('info')
    expect(costMonthProjectionTone('idle')).toBe('idle')
  })
})

// iter1702 fix: iter1531 chip-tone `light dark:dark` 拡張への追従 (iter1701 due-proximity と同 sweep)。
describe('costMonthProjectionChipClasses (Tailwind 3 軸 class、iter481 dueProximity と整合)', () => {
  it('over → rose 3 軸 (bg / text / ring)', () => {
    const c = costMonthProjectionChipClasses('over')
    expect(c.bgClass).toBe('bg-rose-100 dark:bg-rose-950/40')
    expect(c.textClass).toBe('text-rose-700 dark:text-rose-300')
    expect(c.ringClass).toBe('ring-rose-300 dark:ring-rose-900/50')
  })

  it('warn → amber 強 / safe → blue 薄 (urgent vs info の区別)', () => {
    expect(costMonthProjectionChipClasses('warn').bgClass).toBe('bg-amber-100 dark:bg-amber-950/40')
    expect(costMonthProjectionChipClasses('safe').bgClass).toBe('bg-blue-50 dark:bg-blue-950/30')
  })

  it('idle (today 不正) → slate (計算不能を視覚で控えめに表現)', () => {
    const c = costMonthProjectionChipClasses('idle')
    expect(c.textClass).toBe('text-slate-600 dark:text-slate-400')
    expect(c.ringClass).toBe('ring-slate-200 dark:ring-slate-700/50')
  })
})

describe('costMonthProjectionToBriefSignal (iter794 — AgentBriefSignal 形式 compose)', () => {
  it('safe → text=compactJa、tone=info (= 共有 ChipTone vocab)', () => {
    const p = computeCostMonthProjection({
      thisMonthUsd: 1,
      today: '2026-04-10',
      monthlyLimitUsd: 5,
    })
    expect(p.riskLevel).toBe('safe')
    const sig = costMonthProjectionToBriefSignal(p)
    expect(sig.text).toBe(formatCostMonthProjectionCompactJa(p))
    expect(sig.tone).toBe('info')
  })

  it('warn → tone=urgent (= chip 配色と一致、costMonthProjectionChipClasses("warn") が amber-100 = ChipTone urgent)', () => {
    const p = computeCostMonthProjection({
      thisMonthUsd: 4.5,
      today: '2026-04-30',
      monthlyLimitUsd: 5,
    })
    expect(p.riskLevel).toBe('warn')
    const sig = costMonthProjectionToBriefSignal(p)
    expect(sig.tone).toBe('urgent')
  })

  it('over → tone=danger (= 月末超過見込み)', () => {
    const p = computeCostMonthProjection({
      thisMonthUsd: 6,
      today: '2026-04-30',
      monthlyLimitUsd: 5,
    })
    expect(p.riskLevel).toBe('over')
    const sig = costMonthProjectionToBriefSignal(p)
    expect(sig.tone).toBe('danger')
  })

  it('idle (today 不正) → tone=idle、text=compact idle 文言', () => {
    const p = computeCostMonthProjection({
      thisMonthUsd: 1,
      today: 'garbage',
    })
    expect(p.riskLevel).toBe('idle')
    const sig = costMonthProjectionToBriefSignal(p)
    expect(sig.tone).toBe('idle')
    expect(sig.text).toBe('AI コスト: 不明 (today 不正)')
  })
})
