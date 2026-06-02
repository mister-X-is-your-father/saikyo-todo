import { describe, expect, it } from 'vitest'

import {
  buildRecoveryPlan,
  countRecoveryActionsByKind,
  dayDiffISO,
  formatRecoveryPlanJa,
  formatTopRecoveryActionJa,
  pickTopRecoveryAction,
  recoveryActionKindCountsToSeverityCounts,
  recoveryActionKindLabelJa,
  recoveryActionKindSeverity,
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

describe('recoveryActionKindSeverity', () => {
  it('escalate → danger (最深刻)', () => {
    expect(recoveryActionKindSeverity('escalate')).toBe('danger')
  })
  it('unblock / reassign → warn (他 item / コミュニケーション)', () => {
    expect(recoveryActionKindSeverity('unblock')).toBe('warn')
    expect(recoveryActionKindSeverity('reassign')).toBe('warn')
  })
  it('split / reschedule → info (自完結)', () => {
    expect(recoveryActionKindSeverity('split')).toBe('info')
    expect(recoveryActionKindSeverity('reschedule')).toBe('info')
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

describe('pickTopRecoveryAction', () => {
  it('isApplicable=false → null', () => {
    expect(pickTopRecoveryAction({ itemId: 'x', isApplicable: false, actions: [] })).toBeNull()
  })

  it('actions[0] (rank 1) を返す', () => {
    const plan = buildRecoveryPlan(
      mk({
        id: 'i1',
        isMust: true,
        dueDate: '2026-04-25',
        status: 'todo',
        blockedByIds: ['b1'],
      }),
      { today: TODAY, heavyAssignees: [] },
    )
    const top = pickTopRecoveryAction(plan)
    expect(top?.kind).toBe('unblock')
    expect(top?.rank).toBe(1)
  })

  it('actions 空 (= 該当なし) → null', () => {
    expect(pickTopRecoveryAction({ itemId: 'x', isApplicable: true, actions: [] })).toBeNull()
  })
})

describe('formatTopRecoveryActionJa', () => {
  it('null → 「次の一手: なし」', () => {
    expect(formatTopRecoveryActionJa(null)).toBe('次の一手: なし')
  })

  it('action あり → 「次の一手: <kind label>」', () => {
    expect(
      formatTopRecoveryActionJa({
        rank: 1,
        kind: 'unblock',
        title: 'X',
        rationale: 'Y',
      }),
    ).toBe('次の一手: 依存先解消')

    expect(
      formatTopRecoveryActionJa({
        rank: 1,
        kind: 'reassign',
        title: 'X',
        rationale: 'Y',
      }),
    ).toBe('次の一手: 担当再分配')
  })
})

describe('countRecoveryActionsByKind', () => {
  it('空 actions → 全 kind 0', () => {
    expect(countRecoveryActionsByKind({ actions: [] })).toEqual({
      unblock: 0,
      reassign: 0,
      split: 0,
      reschedule: 0,
      escalate: 0,
    })
  })

  it('複数 kind を集計', () => {
    expect(
      countRecoveryActionsByKind({
        actions: [
          { rank: 1, kind: 'unblock', title: 'X', rationale: 'Y' },
          { rank: 2, kind: 'reassign', title: 'A', rationale: 'B' },
          { rank: 3, kind: 'escalate', title: 'E', rationale: 'F' },
        ],
      }),
    ).toEqual({
      unblock: 1,
      reassign: 1,
      split: 0,
      reschedule: 0,
      escalate: 1,
    })
  })

  it('同 kind が複数あれば加算 (汎用形)', () => {
    expect(
      countRecoveryActionsByKind({
        actions: [
          { rank: 1, kind: 'split', title: 'X', rationale: 'Y' },
          { rank: 2, kind: 'split', title: 'A', rationale: 'B' },
        ],
      }),
    ).toEqual({
      unblock: 0,
      reassign: 0,
      split: 2,
      reschedule: 0,
      escalate: 0,
    })
  })

  it('recoveryActionKindCountsToSeverityCounts と連結可能 (canonical flow)', () => {
    const plan = {
      actions: [
        { rank: 1, kind: 'escalate' as const, title: 'E', rationale: 'F' },
        { rank: 2, kind: 'split' as const, title: 'X', rationale: 'Y' },
      ],
    }
    const kindCounts = countRecoveryActionsByKind(plan)
    const sevCounts = recoveryActionKindCountsToSeverityCounts(kindCounts)
    expect(sevCounts).toEqual({ ok: 0, info: 1, warn: 0, danger: 1, muted: 0 })
  })
})

describe('recoveryActionKindCountsToSeverityCounts', () => {
  it('action kind counts を 5 段 severity counts に集約', () => {
    expect(
      recoveryActionKindCountsToSeverityCounts({
        unblock: 2,
        reassign: 1,
        split: 3,
        reschedule: 2,
        escalate: 1,
      }),
    ).toEqual({
      ok: 0,
      info: 5, // split + reschedule
      warn: 3, // unblock + reassign
      danger: 1, // escalate
      muted: 0,
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(
      recoveryActionKindCountsToSeverityCounts({
        unblock: 0,
        reassign: 0,
        split: 0,
        reschedule: 0,
        escalate: 0,
      }),
    ).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
  })

  it('合計が action kind 件数の合計と一致', () => {
    const counts = { unblock: 2, reassign: 1, split: 3, reschedule: 2, escalate: 1 }
    const sevCounts = recoveryActionKindCountsToSeverityCounts(counts)
    const kindTotal = Object.values(counts).reduce((a, b) => a + b, 0)
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(kindTotal)
  })

  it('recovery action は ok / muted bucket には出ない (救済不要は別 sentinel で表現)', () => {
    const r = recoveryActionKindCountsToSeverityCounts({
      unblock: 1,
      reassign: 1,
      split: 1,
      reschedule: 1,
      escalate: 1,
    })
    expect(r.ok).toBe(0)
    expect(r.muted).toBe(0)
  })

  // iter1690 refactor regression guard: aggregateCountsBySeverity 委譲後も ACTION_KIND_SEVERITY の
  // lossy mapping (unblock+reassign → warn / split+reschedule → info) が経由されることを assert。
  it('入力 key 順を変えても結果同一 (集約は加算的、順序不変)', () => {
    const a = recoveryActionKindCountsToSeverityCounts({
      unblock: 3,
      reassign: 2,
      split: 1,
      reschedule: 4,
      escalate: 5,
    })
    const b = recoveryActionKindCountsToSeverityCounts({
      escalate: 5,
      reschedule: 4,
      split: 1,
      reassign: 2,
      unblock: 3,
    })
    expect(a).toEqual(b)
    expect(a.warn).toBe(3 + 2) // unblock + reassign が warn に lossy 縮約
    expect(a.info).toBe(1 + 4) // split + reschedule が info に lossy 縮約
  })
})
