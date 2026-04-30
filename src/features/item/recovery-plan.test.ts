import { describe, expect, it } from 'vitest'

import {
  buildRecoveryPlan,
  dayDiffISO,
  formatRecoveryPlanJa,
  recoveryActionKindLabelJa,
  type RecoveryPlanItemFields,
} from './recovery-plan'

const TODAY = '2026-04-30'

function mk(over: Partial<RecoveryPlanItemFields> & { id: string }): RecoveryPlanItemFields {
  return {
    title: `item ${over.id}`,
    status: 'todo',
    dueDate: null,
    isMust: false,
    priority: 4,
    blockedByIds: [],
    estimateMinutes: null,
    assigneeIds: [],
    ...over,
  }
}

describe('buildRecoveryPlan', () => {
  it('isApplicable=false: MUST でない → actions=[]', () => {
    const r = buildRecoveryPlan(mk({ id: 'a', isMust: false, dueDate: '2026-04-25' }), {
      today: TODAY,
    })
    expect(r.isApplicable).toBe(false)
    expect(r.actions).toEqual([])
  })

  it('isApplicable=false: dueDate 未来 → actions=[]', () => {
    const r = buildRecoveryPlan(mk({ id: 'a', isMust: true, dueDate: '2026-05-10' }), {
      today: TODAY,
    })
    expect(r.isApplicable).toBe(false)
  })

  it('isApplicable=false: dueDate 同日 (overdue ではない) → actions=[]', () => {
    const r = buildRecoveryPlan(mk({ id: 'a', isMust: true, dueDate: TODAY }), { today: TODAY })
    expect(r.isApplicable).toBe(false)
  })

  it('isApplicable=false: status=done → actions=[]', () => {
    const r = buildRecoveryPlan(
      mk({ id: 'a', isMust: true, dueDate: '2026-04-25', status: 'done' }),
      { today: TODAY },
    )
    expect(r.isApplicable).toBe(false)
  })

  it('isApplicable=false: status=cancelled → actions=[]', () => {
    const r = buildRecoveryPlan(
      mk({ id: 'a', isMust: true, dueDate: '2026-04-25', status: 'cancelled' }),
      { today: TODAY },
    )
    expect(r.isApplicable).toBe(false)
  })

  it('isApplicable=false: dueDate 無し → actions=[]', () => {
    const r = buildRecoveryPlan(mk({ id: 'a', isMust: true, dueDate: null }), { today: TODAY })
    expect(r.isApplicable).toBe(false)
  })

  it('overdue MUST + 他 action 不発 → reschedule のみ (overdue 自体が必ず reschedule に該当)', () => {
    const r = buildRecoveryPlan(
      mk({
        id: 'a',
        isMust: true,
        dueDate: '2026-04-29', // 1 日 overdue
        priority: 4, // split 不発
        estimateMinutes: 30, // split 不発
        blockedByIds: [], // unblock 不発
        assigneeIds: ['u1'], // 1 人だが heavy ではない
      }),
      { today: TODAY, heavyAssignees: [] },
    )
    expect(r.isApplicable).toBe(true)
    expect(r.actions).toHaveLength(1)
    expect(r.actions[0]?.kind).toBe('reschedule')
  })

  it('overdue MUST + 依存先 → unblock action が rank 1', () => {
    const r = buildRecoveryPlan(
      mk({
        id: 'a',
        isMust: true,
        dueDate: '2026-04-25',
        blockedByIds: ['b1', 'b2'],
      }),
      { today: TODAY },
    )
    expect(r.isApplicable).toBe(true)
    expect(r.actions[0]?.kind).toBe('unblock')
    expect(r.actions[0]?.rank).toBe(1)
    expect(r.actions[0]?.title).toContain('依存先 2 件')
  })

  it('overdue MUST + 1 人担当 + heavy → reassign action が含まれる', () => {
    const r = buildRecoveryPlan(
      mk({
        id: 'a',
        isMust: true,
        dueDate: '2026-04-25',
        assigneeIds: ['u1'],
      }),
      { today: TODAY, heavyAssignees: ['u1'] },
    )
    expect(r.actions.some((a) => a.kind === 'reassign')).toBe(true)
  })

  it('reassign: 担当 2 人なら不発 (1 人 担当 only が条件)', () => {
    const r = buildRecoveryPlan(
      mk({
        id: 'a',
        isMust: true,
        dueDate: '2026-04-25',
        assigneeIds: ['u1', 'u2'],
      }),
      { today: TODAY, heavyAssignees: ['u1'] },
    )
    expect(r.actions.some((a) => a.kind === 'reassign')).toBe(false)
  })

  it('split: priority<=2 + estimate>=60 → split 含まれる', () => {
    const r = buildRecoveryPlan(
      mk({
        id: 'a',
        isMust: true,
        dueDate: '2026-04-25',
        priority: 1,
        estimateMinutes: 90,
      }),
      { today: TODAY },
    )
    expect(r.actions.some((a) => a.kind === 'split')).toBe(true)
  })

  it('split: priority=3 (低) → 不発', () => {
    const r = buildRecoveryPlan(
      mk({
        id: 'a',
        isMust: true,
        dueDate: '2026-04-25',
        priority: 3,
        estimateMinutes: 120,
      }),
      { today: TODAY },
    )
    expect(r.actions.some((a) => a.kind === 'split')).toBe(false)
  })

  it('split: estimate<60 → 不発', () => {
    const r = buildRecoveryPlan(
      mk({
        id: 'a',
        isMust: true,
        dueDate: '2026-04-25',
        priority: 1,
        estimateMinutes: 30,
      }),
      { today: TODAY },
    )
    expect(r.actions.some((a) => a.kind === 'split')).toBe(false)
  })

  it('reschedule: 期限超過 +5d → 必ず含まれる + 日数表示', () => {
    const r = buildRecoveryPlan(mk({ id: 'a', isMust: true, dueDate: '2026-04-25' }), {
      today: TODAY,
    })
    const reschedule = r.actions.find((a) => a.kind === 'reschedule')
    expect(reschedule).toBeDefined()
    expect(reschedule?.title).toContain('5 日超過')
  })

  it('全 action 該当: 上位 3 つに切り詰め (escalate 入らない)', () => {
    const r = buildRecoveryPlan(
      mk({
        id: 'a',
        isMust: true,
        dueDate: '2026-04-25',
        blockedByIds: ['b1'],
        assigneeIds: ['u1'],
        priority: 1,
        estimateMinutes: 90,
      }),
      { today: TODAY, heavyAssignees: ['u1'] },
    )
    expect(r.actions).toHaveLength(3)
    // 順序: unblock → reassign → split → reschedule の上位 3 → escalate は入らない
    expect(r.actions.map((a) => a.kind)).toEqual(['unblock', 'reassign', 'split'])
    expect(r.actions[0]?.rank).toBe(1)
    expect(r.actions[2]?.rank).toBe(3)
  })

  it('rank は 1..N に必ず振り直される', () => {
    const r = buildRecoveryPlan(mk({ id: 'a', isMust: true, dueDate: '2026-04-25' }), {
      today: TODAY,
    })
    for (let i = 0; i < r.actions.length; i++) {
      expect(r.actions[i]?.rank).toBe(i + 1)
    }
  })
})

describe('dayDiffISO', () => {
  it('+ / 0 / -', () => {
    expect(dayDiffISO('2026-04-30', '2026-05-01')).toBe(1)
    expect(dayDiffISO('2026-04-30', '2026-04-30')).toBe(0)
    expect(dayDiffISO('2026-04-30', '2026-04-25')).toBe(-5)
  })
})

describe('recoveryActionKindLabelJa', () => {
  it('5 種すべて Japanese label を返す', () => {
    expect(recoveryActionKindLabelJa('unblock')).toBe('依存先解消')
    expect(recoveryActionKindLabelJa('reassign')).toBe('担当再分配')
    expect(recoveryActionKindLabelJa('split')).toBe('細分化')
    expect(recoveryActionKindLabelJa('reschedule')).toBe('期限再設定')
    expect(recoveryActionKindLabelJa('escalate')).toBe('エスカレーション')
  })
})

describe('formatRecoveryPlanJa', () => {
  it('isApplicable=false → 救済不要', () => {
    const plan = buildRecoveryPlan(mk({ id: 'a' }), { today: TODAY })
    expect(formatRecoveryPlanJa(plan)).toBe('救済不要')
  })

  it('単一 escalate (該当 action 無しで最終手段) → 救済 action 1 件', () => {
    const plan = buildRecoveryPlan(
      mk({ id: 'b', isMust: true, dueDate: '2026-04-25', priority: 4 }),
      { today: TODAY },
    )
    // dueDate 5 日超過 → reschedule が出る
    const out = formatRecoveryPlanJa(plan)
    expect(out).toMatch(/^救済 action /)
  })

  it('複数 action は "/" 区切り', () => {
    const plan = buildRecoveryPlan(
      mk({
        id: 'c',
        isMust: true,
        dueDate: '2026-04-25',
        blockedByIds: ['x', 'y'],
        priority: 1,
        estimateMinutes: 120,
      }),
      { today: TODAY },
    )
    const out = formatRecoveryPlanJa(plan)
    expect(out).toContain('救済 action')
    expect(out).toContain('依存先解消')
    expect(out).toContain('細分化')
    expect(out).toContain('期限再設定')
    expect(out.split(' / ').length).toBe(3)
  })
})
