import { describe, expect, it } from 'vitest'

import {
  assigneeLoadSeverityToSeverity,
  buildFourStateHintChip,
  checklistStatusToSeverity,
  fourStateHintToSeverity,
  improvementSeverityToSeverity,
  pdcaPhaseSeverityToSeverity,
} from './severity-bridges'

describe('assigneeLoadSeverityToSeverity', () => {
  it('overloaded → danger', () => {
    expect(assigneeLoadSeverityToSeverity('overloaded')).toBe('danger')
  })
  it('busy → warn', () => {
    expect(assigneeLoadSeverityToSeverity('busy')).toBe('warn')
  })
  it('normal → info', () => {
    expect(assigneeLoadSeverityToSeverity('normal')).toBe('info')
  })
  it('light → ok', () => {
    expect(assigneeLoadSeverityToSeverity('light')).toBe('ok')
  })
})

describe('pdcaPhaseSeverityToSeverity', () => {
  it('overdue → danger', () => {
    expect(pdcaPhaseSeverityToSeverity('overdue')).toBe('danger')
  })
  it('stale → warn', () => {
    expect(pdcaPhaseSeverityToSeverity('stale')).toBe('warn')
  })
  it('on_track → info', () => {
    expect(pdcaPhaseSeverityToSeverity('on_track')).toBe('info')
  })
  it('fresh → info (on_track と同一)', () => {
    expect(pdcaPhaseSeverityToSeverity('fresh')).toBe('info')
  })
  it('closed → muted', () => {
    expect(pdcaPhaseSeverityToSeverity('closed')).toBe('muted')
  })
})

describe('improvementSeverityToSeverity', () => {
  it('high → danger', () => {
    expect(improvementSeverityToSeverity('high')).toBe('danger')
  })
  it('medium → warn', () => {
    expect(improvementSeverityToSeverity('medium')).toBe('warn')
  })
  it('low → info', () => {
    expect(improvementSeverityToSeverity('low')).toBe('info')
  })
})

describe('fourStateHintToSeverity', () => {
  it('idle → muted', () => {
    expect(fourStateHintToSeverity('idle')).toBe('muted')
  })
  it('mild → ok', () => {
    expect(fourStateHintToSeverity('mild')).toBe('ok')
  })
  it('moderate → warn', () => {
    expect(fourStateHintToSeverity('moderate')).toBe('warn')
  })
  it('severe → danger', () => {
    expect(fourStateHintToSeverity('severe')).toBe('danger')
  })
})

describe('buildFourStateHintChip', () => {
  it('classify + format から {label, severity, chipClass} 3 件を返す', () => {
    const r = buildFourStateHintChip(
      { count: 5 },
      (i) => (i.count >= 5 ? 'severe' : 'mild'),
      (i) => `${i.count} 件`,
    )
    expect(r.label).toBe('5 件')
    expect(r.severity).toBe('danger')
    expect(r.chipClass).toContain('rose')
  })

  it('idle → muted (slate)', () => {
    const r = buildFourStateHintChip(
      0,
      () => 'idle',
      () => '空',
    )
    expect(r.severity).toBe('muted')
    expect(r.chipClass).toContain('slate')
  })
})

describe('checklistStatusToSeverity', () => {
  it('ok → ok (緑、合格)', () => {
    expect(checklistStatusToSeverity('ok')).toBe('ok')
  })

  it('warn → warn (黄、要注意)', () => {
    expect(checklistStatusToSeverity('warn')).toBe('warn')
  })

  it('fail → danger (赤、要対策)', () => {
    expect(checklistStatusToSeverity('fail')).toBe('danger')
  })
})
