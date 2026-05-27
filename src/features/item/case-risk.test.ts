import { describe, expect, it } from 'vitest'

import { caseRiskTone, computeCaseRiskScore, formatCaseRiskJa } from './case-risk'

describe('computeCaseRiskScore', () => {
  it('健全 (超過/blocked/停滞なし) → score 0 / low', () => {
    const r = computeCaseRiskScore({
      totalSubtasks: 5,
      overdueSubtasks: 0,
      blockedSubtasks: 0,
      daysSinceLastActivity: null,
    })
    expect(r.score).toBe(0)
    expect(r.tier).toBe('low')
    expect(r.reasons).toEqual([])
  })

  it('全 subtask 期限超過 → 40 / medium', () => {
    const r = computeCaseRiskScore({
      totalSubtasks: 5,
      overdueSubtasks: 5,
      blockedSubtasks: 0,
      daysSinceLastActivity: null,
    })
    expect(r.score).toBe(40)
    expect(r.tier).toBe('medium')
    expect(r.reasons).toEqual(['期限超過 5/5 件'])
  })

  it('超過 + blocked + 停滞 max → 100 / high', () => {
    const r = computeCaseRiskScore({
      totalSubtasks: 5,
      overdueSubtasks: 5,
      blockedSubtasks: 5,
      daysSinceLastActivity: 14,
    })
    expect(r.score).toBe(100)
    expect(r.tier).toBe('high')
    expect(r.reasons).toEqual(['期限超過 5/5 件', 'blocked 5/5 件', '最終更新から 14 日'])
  })

  it('停滞は 14 日で満点 (それ以上は clamp)', () => {
    const r = computeCaseRiskScore({
      totalSubtasks: 0,
      overdueSubtasks: 0,
      blockedSubtasks: 0,
      daysSinceLastActivity: 28,
    })
    expect(r.score).toBe(30) // stale 1.0 * 30
    expect(r.tier).toBe('medium')
  })

  it('停滞 7 日未満は reason に出さない (寄与はする)', () => {
    const r = computeCaseRiskScore({
      totalSubtasks: 0,
      overdueSubtasks: 0,
      blockedSubtasks: 0,
      daysSinceLastActivity: 5,
    })
    expect(r.score).toBe(11) // round(5/14*30)=round(10.71)
    expect(r.reasons).toEqual([])
  })

  it('reasons は寄与 (weight×ratio) 大きい順', () => {
    const r = computeCaseRiskScore({
      totalSubtasks: 10,
      overdueSubtasks: 2, // 0.2*40 = 8
      blockedSubtasks: 5, // 0.5*30 = 15
      daysSinceLastActivity: null,
    })
    expect(r.score).toBe(23)
    expect(r.reasons).toEqual(['blocked 5/10 件', '期限超過 2/10 件'])
  })

  it('total 0 でも停滞のみで算出 (ratio は 0)', () => {
    const r = computeCaseRiskScore({
      totalSubtasks: 0,
      overdueSubtasks: 0,
      blockedSubtasks: 0,
      daysSinceLastActivity: null,
    })
    expect(r.score).toBe(0)
  })
})

describe('caseRiskTone', () => {
  it('tier → tone', () => {
    expect(caseRiskTone('low')).toBe('ok')
    expect(caseRiskTone('medium')).toBe('warn')
    expect(caseRiskTone('high')).toBe('danger')
  })
})

describe('formatCaseRiskJa', () => {
  it('reasons あり', () => {
    const r = computeCaseRiskScore({
      totalSubtasks: 5,
      overdueSubtasks: 3,
      blockedSubtasks: 1,
      daysSinceLastActivity: null,
    })
    expect(formatCaseRiskJa(r)).toBe('着地リスク 中 (30): 期限超過 3/5 件 / blocked 1/5 件')
  })
  it('reasons 無し → score のみ', () => {
    const r = computeCaseRiskScore({
      totalSubtasks: 3,
      overdueSubtasks: 0,
      blockedSubtasks: 0,
      daysSinceLastActivity: null,
    })
    expect(formatCaseRiskJa(r)).toBe('着地リスク 低 (0)')
  })
})
