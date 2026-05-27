import { describe, expect, it } from 'vitest'

import {
  canAdvancePhase,
  type CyclePhaseFields,
  nextPhase,
  PDCA_PHASE_ORDER,
  phaseLabelJa,
} from './cycle-phase'

describe('nextPhase', () => {
  it('plan→do→check→act→closed の順', () => {
    expect(nextPhase('plan')).toBe('do')
    expect(nextPhase('do')).toBe('check')
    expect(nextPhase('check')).toBe('act')
    expect(nextPhase('act')).toBe('closed')
  })
  it('closed は終端 → null', () => {
    expect(nextPhase('closed')).toBeNull()
  })
  it('PDCA_PHASE_ORDER は 5 段階', () => {
    expect([...PDCA_PHASE_ORDER]).toEqual(['plan', 'do', 'check', 'act', 'closed'])
  })
})

describe('phaseLabelJa', () => {
  it('各 phase の日本語ラベル', () => {
    expect(phaseLabelJa('plan')).toBe('Plan (計画)')
    expect(phaseLabelJa('closed')).toBe('Closed (凍結)')
  })
})

describe('canAdvancePhase', () => {
  function mk(
    over: Partial<CyclePhaseFields> & { status: CyclePhaseFields['status'] },
  ): CyclePhaseFields {
    return { hypothesis: '', actualValue: '', checkFindings: '', actDecisions: '', ...over }
  }

  it('plan: hypothesis 空 → advance 不可 (missing 仮説)', () => {
    const r = canAdvancePhase(mk({ status: 'plan' }))
    expect(r.ok).toBe(false)
    expect(r.nextPhase).toBe('do')
    expect(r.missing).toContain('仮説 (hypothesis)')
  })
  it('plan: hypothesis 有り → advance 可', () => {
    const r = canAdvancePhase(mk({ status: 'plan', hypothesis: '昼 standup で完了率上がる' }))
    expect(r.ok).toBe(true)
    expect(r.missing).toEqual([])
  })
  it('plan: 空白のみ hypothesis は blank 扱い', () => {
    expect(canAdvancePhase(mk({ status: 'plan', hypothesis: '   ' })).ok).toBe(false)
  })

  it('do: 追加必須なし → 常に advance 可', () => {
    const r = canAdvancePhase(mk({ status: 'do' }))
    expect(r.ok).toBe(true)
    expect(r.nextPhase).toBe('check')
  })

  it('check: actualValue / checkFindings 両空 → 不可', () => {
    const r = canAdvancePhase(mk({ status: 'check' }))
    expect(r.ok).toBe(false)
    expect(r.missing[0]).toContain('実測値')
  })
  it('check: actualValue だけでも可', () => {
    expect(canAdvancePhase(mk({ status: 'check', actualValue: '完了 16 件' })).ok).toBe(true)
  })
  it('check: checkFindings だけでも可', () => {
    expect(canAdvancePhase(mk({ status: 'check', checkFindings: 'レビュー待ちが課題' })).ok).toBe(
      true,
    )
  })

  it('act: actDecisions 空 → 不可', () => {
    const r = canAdvancePhase(mk({ status: 'act' }))
    expect(r.ok).toBe(false)
    expect(r.missing).toContain('改善決定 (actDecisions)')
  })
  it('act: actDecisions 有り → 可 (next=closed)', () => {
    const r = canAdvancePhase(mk({ status: 'act', actDecisions: 'SLA 短縮' }))
    expect(r.ok).toBe(true)
    expect(r.nextPhase).toBe('closed')
  })

  it('closed: 終端 → advance 不可 / nextPhase null', () => {
    const r = canAdvancePhase(mk({ status: 'closed' }))
    expect(r.ok).toBe(false)
    expect(r.nextPhase).toBeNull()
    expect(r.missing).toEqual([])
  })
})
