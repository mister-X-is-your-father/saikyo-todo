import { describe, expect, it } from 'vitest'

import {
  assigneeLoadSeverityToSeverity,
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
