/**
 * iter487 agent-reliability の unit test。pure helper のみ、DB / DOM 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  agentReliabilityChipClasses,
  agentReliabilityTone,
  computeAgentReliability,
  formatAgentReliabilityJa,
} from './agent-reliability'

describe('computeAgentReliability', () => {
  it('空 rows → 全 role idle、totalInvocations=0', () => {
    const r = computeAgentReliability([])
    expect(r.totalInvocations).toBe(0)
    expect(r.reliabilityLevel).toBe('idle')
    expect(r.byRole.pm.reliabilityLevel).toBe('idle')
    expect(r.byRole.researcher.reliabilityLevel).toBe('idle')
  })

  it('PM 14/15 → warn (93% は healthy 95% 未満)', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 15, completed: 14, failed: 1 }])
    expect(r.byRole.pm.successRate).toBeCloseTo(14 / 15, 3)
    expect(r.byRole.pm.reliabilityLevel).toBe('warn')
    expect(r.byRole.researcher.reliabilityLevel).toBe('idle')
  })

  it('PM 19/20 (95%) → healthy', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 20, completed: 19, failed: 1 }])
    expect(r.byRole.pm.successRate).toBe(0.95)
    expect(r.byRole.pm.reliabilityLevel).toBe('healthy')
  })

  it('PM 6/10 (60%) → critical', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 10, completed: 6, failed: 4 }])
    expect(r.byRole.pm.reliabilityLevel).toBe('critical')
  })

  it('複数月 row を sum (PM 8/10 + 5/5 = 13/15 → warn)', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 8, failed: 2 },
      { role: 'pm', invocations: 5, completed: 5, failed: 0 },
    ])
    expect(r.byRole.pm.invocations).toBe(15)
    expect(r.byRole.pm.completed).toBe(13)
    expect(r.byRole.pm.successRate).toBeCloseTo(13 / 15, 3)
    expect(r.byRole.pm.reliabilityLevel).toBe('warn')
  })

  it('未知 role は除外 (forward compatible)', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 5, completed: 5, failed: 0 },
      { role: 'engineer', invocations: 100, completed: 0, failed: 100 }, // 除外
    ])
    expect(r.totalInvocations).toBe(5)
    expect(r.byRole.pm.reliabilityLevel).toBe('healthy')
  })

  it('不正値 (負 / NaN) は 0 にクランプ', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: -5, completed: NaN, failed: -1 },
      { role: 'pm', invocations: 10, completed: 9, failed: 1 },
    ])
    expect(r.byRole.pm.invocations).toBe(10)
    expect(r.byRole.pm.completed).toBe(9)
    expect(r.byRole.pm.failed).toBe(1)
  })

  it('total reliability は role 別 sum で判定 (PM healthy + Researcher critical → 全体 warn)', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 20, completed: 20, failed: 0 }, // 100% healthy
      { role: 'researcher', invocations: 10, completed: 5, failed: 5 }, // 50% critical
    ])
    // total: 25/30 = 83.3% → warn (>= 80%)
    expect(r.successRate).toBeCloseTo(25 / 30, 3)
    expect(r.reliabilityLevel).toBe('warn')
  })
})

describe('formatAgentReliabilityJa', () => {
  it('idle → 「AI 信頼性: 記録なし」', () => {
    expect(formatAgentReliabilityJa(computeAgentReliability([]))).toBe('AI 信頼性: 記録なし')
  })

  it('PM healthy + Researcher healthy → 健全 chip', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 15, failed: 0 },
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    expect(formatAgentReliabilityJa(r)).toBe(
      'AI 信頼性: PM 15/15 (100%) 健全・Researcher 8/8 (100%) 健全',
    )
  })

  it('PM warn + Researcher idle → 注意 + 記録なし', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 13, failed: 2 }, // 86.6% → warn
    ])
    const out = formatAgentReliabilityJa(r)
    expect(out).toContain('PM 13/15 (87%) 注意')
    expect(out).toContain('Researcher 記録なし')
  })

  it('PM critical → 要調査文言', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 10, completed: 5, failed: 5 }])
    expect(formatAgentReliabilityJa(r)).toContain('PM 5/10 (50%) 要調査')
  })
})

describe('agentReliabilityTone (graphical 波及 — level → ChipTone)', () => {
  it('critical→danger / warn→warn / healthy→success / idle→idle', () => {
    expect(agentReliabilityTone('critical')).toBe('danger')
    expect(agentReliabilityTone('warn')).toBe('warn')
    expect(agentReliabilityTone('healthy')).toBe('success')
    expect(agentReliabilityTone('idle')).toBe('idle')
  })
})

describe('agentReliabilityChipClasses (Tailwind 3 軸)', () => {
  it('critical → rose、healthy → emerald (iter486 success tone 2 件目活用)', () => {
    const crit = agentReliabilityChipClasses('critical')
    expect(crit.bgClass).toBe('bg-rose-100')
    const healthy = agentReliabilityChipClasses('healthy')
    expect(healthy.bgClass).toBe('bg-emerald-50')
    expect(healthy.textClass).toBe('text-emerald-700')
  })

  it('warn → amber 薄、idle → slate 薄', () => {
    expect(agentReliabilityChipClasses('warn').bgClass).toBe('bg-amber-50')
    expect(agentReliabilityChipClasses('idle').bgClass).toBe('bg-slate-50')
  })
})
