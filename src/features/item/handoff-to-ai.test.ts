import { describe, expect, it } from 'vitest'

import { planHandoffToAi } from './handoff-to-ai'
import type { AssigneeRef } from './repository'

const aiRef: AssigneeRef = { actorType: 'agent', actorId: 'agent-1' }
const userRef: AssigneeRef = { actorType: 'user', actorId: 'user-1' }

describe('planHandoffToAi', () => {
  it('未着手 (todo) + AI assignee 無 + Plan 無 → 2 step (set-ai + generate)', () => {
    const r = planHandoffToAi({ status: 'todo', assignees: [], hasExistingPlan: false })
    expect(r.actionable).toBe(true)
    expect(r.steps.map((s) => s.kind)).toEqual(['set-ai-assignee', 'generate-plan'])
    expect(r.summary).toContain('AI 担当に設定')
    expect(r.summary).toContain('Plan 生成')
  })

  it('AI assignee 既存 + Plan 無 → 1 step (generate のみ)', () => {
    const r = planHandoffToAi({
      status: 'todo',
      assignees: [aiRef],
      hasExistingPlan: false,
    })
    expect(r.actionable).toBe(true)
    expect(r.steps.map((s) => s.kind)).toEqual(['generate-plan'])
  })

  it('AI assignee 無 + Plan 既存 → 1 step (set-ai のみ)', () => {
    const r = planHandoffToAi({
      status: 'todo',
      assignees: [userRef],
      hasExistingPlan: true,
    })
    expect(r.actionable).toBe(true)
    expect(r.steps.map((s) => s.kind)).toEqual(['set-ai-assignee'])
  })

  it('AI assignee 既存 + Plan 既存 → skip-already', () => {
    const r = planHandoffToAi({
      status: 'in_progress',
      assignees: [aiRef, userRef],
      hasExistingPlan: true,
    })
    expect(r.actionable).toBe(false)
    expect(r.steps.map((s) => s.kind)).toEqual(['skip-already'])
    expect(r.summary).toContain('既に AI')
  })

  it('done な task は blocked-done', () => {
    const r = planHandoffToAi({
      status: 'done',
      assignees: [],
      hasExistingPlan: false,
    })
    expect(r.actionable).toBe(false)
    expect(r.steps.map((s) => s.kind)).toEqual(['blocked-done'])
    expect(r.summary).toContain('完了済')
  })

  it('mixed assignee (AI + user) でも AI 既存と判定', () => {
    const r = planHandoffToAi({
      status: 'todo',
      assignees: [userRef, aiRef],
      hasExistingPlan: false,
    })
    expect(r.steps.map((s) => s.kind)).toEqual(['generate-plan'])
  })

  it('summary が arrow 区切りで読める形に', () => {
    const r = planHandoffToAi({ status: 'todo', assignees: [], hasExistingPlan: false })
    expect(r.summary).toBe('AI 担当に設定 → Plan 生成')
  })
})
