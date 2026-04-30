import { describe, expect, it } from 'vitest'

import type { AssigneeRef } from '@/features/item/repository'

import {
  type AiHandoffPhase,
  getAiHandoffPhase,
  getHandoffPhaseDescriptor,
  type HandoffItemFields,
} from './handoff-phase'

const HUMAN: AssigneeRef = { actorType: 'user', actorId: 'u1' }
const AI: AssigneeRef = { actorType: 'agent', actorId: 'a1' }

function mk(over: Partial<HandoffItemFields>): HandoffItemFields {
  return { status: 'todo', assignees: [], ...over }
}

const NO_SIGNALS = { hasPlanComment: false, hasAiReviewComment: false }

describe('getAiHandoffPhase (priority)', () => {
  it("1: status='done' は AI 有無に関わらず completed", () => {
    expect(getAiHandoffPhase(mk({ status: 'done', assignees: [AI] }), NO_SIGNALS)).toBe('completed')
    expect(getAiHandoffPhase(mk({ status: 'done', assignees: [HUMAN] }), NO_SIGNALS)).toBe(
      'completed',
    )
    expect(getAiHandoffPhase(mk({ status: 'done', assignees: [] }), NO_SIGNALS)).toBe('completed')
  })

  it('2: AI assignee 無し → no-ai', () => {
    expect(getAiHandoffPhase(mk({ assignees: [] }), NO_SIGNALS)).toBe('no-ai')
    expect(getAiHandoffPhase(mk({ assignees: [HUMAN] }), NO_SIGNALS)).toBe('no-ai')
    expect(getAiHandoffPhase(mk({ assignees: [HUMAN, HUMAN] }), NO_SIGNALS)).toBe('no-ai')
  })

  it('3: AI 有 + plan comment 無し → pending-handoff', () => {
    expect(getAiHandoffPhase(mk({ assignees: [AI] }), NO_SIGNALS)).toBe('pending-handoff')
    expect(getAiHandoffPhase(mk({ assignees: [HUMAN, AI] }), NO_SIGNALS)).toBe('pending-handoff')
  })

  it('4: AI 有 + plan + review comment → review-requested', () => {
    expect(
      getAiHandoffPhase(mk({ assignees: [AI] }), {
        hasPlanComment: true,
        hasAiReviewComment: true,
      }),
    ).toBe('review-requested')
  })

  it("5: AI 有 + plan + status='in_progress' → in-execution", () => {
    expect(
      getAiHandoffPhase(mk({ assignees: [AI], status: 'in_progress' }), {
        hasPlanComment: true,
        hasAiReviewComment: false,
      }),
    ).toBe('in-execution')
  })

  it("6: AI 有 + plan、status='todo' → plan-ready-for-review", () => {
    expect(
      getAiHandoffPhase(mk({ assignees: [AI], status: 'todo' }), {
        hasPlanComment: true,
        hasAiReviewComment: false,
      }),
    ).toBe('plan-ready-for-review')
  })

  it('priority 検証: review > in-execution (review 済なら status 関わらず review-requested)', () => {
    expect(
      getAiHandoffPhase(mk({ assignees: [AI], status: 'in_progress' }), {
        hasPlanComment: true,
        hasAiReviewComment: true,
      }),
    ).toBe('review-requested')
  })

  it('priority 検証: completed > review (done なら review でも completed)', () => {
    expect(
      getAiHandoffPhase(mk({ assignees: [AI], status: 'done' }), {
        hasPlanComment: true,
        hasAiReviewComment: true,
      }),
    ).toBe('completed')
  })
})

describe('getHandoffPhaseDescriptor', () => {
  it('全 phase で chipLabel + description が空でない', () => {
    const phases: AiHandoffPhase[] = [
      'no-ai',
      'pending-handoff',
      'plan-ready-for-review',
      'in-execution',
      'review-requested',
      'completed',
    ]
    for (const p of phases) {
      const d = getHandoffPhaseDescriptor(p)
      expect(d.chipLabel.length).toBeGreaterThan(0)
      expect(d.description.length).toBeGreaterThan(0)
      expect(['ok', 'info', 'warn', 'muted']).toContain(d.severity)
    }
  })

  it('primaryActionLabel: 終了 phase (completed / in-execution) は null', () => {
    expect(getHandoffPhaseDescriptor('completed').primaryActionLabel).toBeNull()
    expect(getHandoffPhaseDescriptor('in-execution').primaryActionLabel).toBeNull()
  })

  it('primaryActionLabel: ユーザ action 必要な phase は string', () => {
    expect(getHandoffPhaseDescriptor('no-ai').primaryActionLabel).toBe('AI に任せる')
    expect(getHandoffPhaseDescriptor('pending-handoff').primaryActionLabel).toBe('Plan を生成')
    expect(getHandoffPhaseDescriptor('plan-ready-for-review').primaryActionLabel).toBe(
      'Plan を承認',
    )
    expect(getHandoffPhaseDescriptor('review-requested').primaryActionLabel).toBe('Review して完了')
  })

  it('severity: completed=ok, no-ai=muted', () => {
    expect(getHandoffPhaseDescriptor('completed').severity).toBe('ok')
    expect(getHandoffPhaseDescriptor('no-ai').severity).toBe('muted')
  })
})
