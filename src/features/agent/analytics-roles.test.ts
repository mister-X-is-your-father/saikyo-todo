/**
 * iter790 refactor: analytics-roles の unit test。
 */
import { describe, expect, it } from 'vitest'

import {
  ANALYTICS_AGENT_ROLES,
  type AnalyticsAgentRole,
  analyticsRoleLabelJa,
} from './analytics-roles'

describe('analytics-roles (agent-reliability / cost-monthly-trend 共有 vocabulary)', () => {
  it('ANALYTICS_AGENT_ROLES = ["pm", "researcher"] (順序 stable)', () => {
    expect(ANALYTICS_AGENT_ROLES).toEqual(['pm', 'researcher'])
  })

  it('analyticsRoleLabelJa: pm → "PM" / researcher → "Researcher"', () => {
    expect(analyticsRoleLabelJa('pm')).toBe('PM')
    expect(analyticsRoleLabelJa('researcher')).toBe('Researcher')
  })

  it('AnalyticsAgentRole 型は narrowed (Record exhaustive check)', () => {
    // Record<AnalyticsAgentRole, X> が exhaustive になることを compile-time で保証
    const map: Record<AnalyticsAgentRole, number> = { pm: 1, researcher: 2 }
    expect(map.pm).toBe(1)
    expect(map.researcher).toBe(2)
  })

  it('ANALYTICS_AGENT_ROLES の各 role に必ず label が定義されている (forward-compat 検査)', () => {
    for (const role of ANALYTICS_AGENT_ROLES) {
      const label = analyticsRoleLabelJa(role)
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })
})
