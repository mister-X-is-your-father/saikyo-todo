import { describe, expect, it } from 'vitest'

import type { AssigneeRef } from '@/features/item/repository'

import {
  type AiHandoffPhase,
  countItemsByHandoffPhase,
  formatHandoffPhaseStatusJa,
  getAiHandoffPhase,
  getHandoffPhaseDescriptor,
  type HandoffItemFields,
  type HandoffSignals,
  isHandoffActive,
  isHandoffWaitingForUser,
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

describe('isHandoffWaitingForUser', () => {
  it('user action 必要な 3 phase は true', () => {
    expect(isHandoffWaitingForUser('pending-handoff')).toBe(true)
    expect(isHandoffWaitingForUser('plan-ready-for-review')).toBe(true)
    expect(isHandoffWaitingForUser('review-requested')).toBe(true)
  })

  it('それ以外の 3 phase は false', () => {
    expect(isHandoffWaitingForUser('no-ai')).toBe(false)
    expect(isHandoffWaitingForUser('in-execution')).toBe(false)
    expect(isHandoffWaitingForUser('completed')).toBe(false)
  })

  it('全 6 phase で boolean を返す (total coverage)', () => {
    const phases: AiHandoffPhase[] = [
      'no-ai',
      'pending-handoff',
      'plan-ready-for-review',
      'in-execution',
      'review-requested',
      'completed',
    ]
    for (const p of phases) {
      expect(typeof isHandoffWaitingForUser(p)).toBe('boolean')
    }
  })
})

describe('isHandoffActive', () => {
  it('AI workflow 4 phase は true', () => {
    expect(isHandoffActive('pending-handoff')).toBe(true)
    expect(isHandoffActive('plan-ready-for-review')).toBe(true)
    expect(isHandoffActive('in-execution')).toBe(true)
    expect(isHandoffActive('review-requested')).toBe(true)
  })

  it('no-ai / completed は false', () => {
    expect(isHandoffActive('no-ai')).toBe(false)
    expect(isHandoffActive('completed')).toBe(false)
  })

  it('isHandoffWaitingForUser の superset (in-execution だけ違う)', () => {
    const phases: AiHandoffPhase[] = [
      'no-ai',
      'pending-handoff',
      'plan-ready-for-review',
      'in-execution',
      'review-requested',
      'completed',
    ]
    for (const p of phases) {
      if (isHandoffWaitingForUser(p)) {
        expect(isHandoffActive(p)).toBe(true)
      }
    }
    // 差分: in-execution は active だが waiting ではない
    expect(isHandoffActive('in-execution')).toBe(true)
    expect(isHandoffWaitingForUser('in-execution')).toBe(false)
  })
})

describe('formatHandoffPhaseStatusJa', () => {
  it('chip label と description を " — " で連結', () => {
    expect(formatHandoffPhaseStatusJa('no-ai')).toBe(
      '人間担当 — AssigneePicker で AI を選ぶと「AI に任せた」モードに切替',
    )
  })
  it('completed phase', () => {
    expect(formatHandoffPhaseStatusJa('completed')).toBe(
      '完了済 — AI と人間の協業 cycle が完了した item',
    )
  })
  it('全 6 phase が non-empty 文字列', () => {
    const phases: AiHandoffPhase[] = [
      'no-ai',
      'pending-handoff',
      'plan-ready-for-review',
      'in-execution',
      'review-requested',
      'completed',
    ]
    for (const p of phases) {
      expect(formatHandoffPhaseStatusJa(p).length).toBeGreaterThan(0)
      expect(formatHandoffPhaseStatusJa(p)).toContain(' — ')
    }
  })
})

describe('countItemsByHandoffPhase (iter1429 — phase 別件数集計)', () => {
  const noSig: HandoffSignals = { hasPlanComment: false, hasAiReviewComment: false }
  const planSig: HandoffSignals = { hasPlanComment: true, hasAiReviewComment: false }
  const reviewSig: HandoffSignals = { hasPlanComment: true, hasAiReviewComment: true }

  it('空 items → 6 phase すべて 0', () => {
    const counts = countItemsByHandoffPhase<HandoffItemFields>([], () => noSig)
    expect(counts).toEqual({
      'no-ai': 0,
      'pending-handoff': 0,
      'plan-ready-for-review': 0,
      'in-execution': 0,
      'review-requested': 0,
      completed: 0,
    })
  })

  it('単一 item → 該当 phase が 1、他は 0', () => {
    const items = [mk({ assignees: [AI] })] // pending-handoff
    const counts = countItemsByHandoffPhase(items, () => noSig)
    expect(counts['pending-handoff']).toBe(1)
    expect(counts['no-ai']).toBe(0)
    expect(counts.completed).toBe(0)
  })

  it('混合 items → phase 別件数で正しく分配', () => {
    const items: HandoffItemFields[] = [
      mk({ assignees: [HUMAN] }), // no-ai
      mk({ assignees: [HUMAN] }), // no-ai
      mk({ assignees: [AI] }), // pending-handoff (no plan)
      mk({ assignees: [AI], status: 'in_progress' }), // in-execution (after plan)
      mk({ assignees: [AI], status: 'done' }), // completed
    ]
    const signalsById: Record<number, HandoffSignals> = {
      0: noSig,
      1: noSig,
      2: noSig, // no plan → pending-handoff
      3: planSig, // plan exists + in_progress → in-execution
      4: noSig, // status=done overrides → completed
    }
    const counts = countItemsByHandoffPhase(items, (it) => signalsById[items.indexOf(it)]!)
    expect(counts['no-ai']).toBe(2)
    expect(counts['pending-handoff']).toBe(1)
    expect(counts['in-execution']).toBe(1)
    expect(counts.completed).toBe(1)
    // 合計 = items.length
    const total =
      counts['no-ai'] +
      counts['pending-handoff'] +
      counts['plan-ready-for-review'] +
      counts['in-execution'] +
      counts['review-requested'] +
      counts.completed
    expect(total).toBe(items.length)
  })

  it('review-requested + plan-ready-for-review を区別', () => {
    const items: HandoffItemFields[] = [
      mk({ assignees: [AI] }), // plan-ready-for-review (status=todo + plan)
      mk({ assignees: [AI] }), // review-requested (plan + review)
    ]
    const counts = countItemsByHandoffPhase(items, (it) =>
      items.indexOf(it) === 0 ? planSig : reviewSig,
    )
    expect(counts['plan-ready-for-review']).toBe(1)
    expect(counts['review-requested']).toBe(1)
  })

  it('集計値は getAiHandoffPhase の sum と一致 (= phase 解決の semantics 等価)', () => {
    const items: HandoffItemFields[] = [
      mk({ assignees: [AI], status: 'in_progress' }),
      mk({ assignees: [AI] }),
      mk({ assignees: [HUMAN] }),
    ]
    const sig = planSig
    const counts = countItemsByHandoffPhase(items, () => sig)
    // 各 item を単独で getAiHandoffPhase で解いた件数と一致
    const expected: Record<AiHandoffPhase, number> = {
      'no-ai': 0,
      'pending-handoff': 0,
      'plan-ready-for-review': 0,
      'in-execution': 0,
      'review-requested': 0,
      completed: 0,
    }
    for (const it of items) {
      expected[getAiHandoffPhase(it, sig)] += 1
    }
    expect(counts).toEqual(expected)
  })
})
