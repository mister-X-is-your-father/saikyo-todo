import { describe, expect, it } from 'vitest'

import {
  buildSprintRetroSummary,
  completionRateSeverity,
  completionRateSeverityLabelJa,
  formatSprintRetroSummaryJa,
  retroCompletionSeverityCountsToSeverityCounts,
  type SprintRetroItemFields,
} from './retro-summary'

function mk(over: Partial<SprintRetroItemFields>): SprintRetroItemFields {
  return { status: 'todo', dueDate: null, doneAt: null, ...over }
}

describe('buildSprintRetroSummary', () => {
  it('空 items は total=0 + 全項目 0 + comparisonWithPrev null (prev 未指定)', () => {
    const r = buildSprintRetroSummary([])
    expect(r.total).toBe(0)
    expect(r.statusBreakdown).toEqual({
      todo: 0,
      inProgress: 0,
      blocked: 0,
      done: 0,
      cancelled: 0,
      other: 0,
    })
    expect(r.completionRate).toBe(0)
    expect(r.plannedVsDelivered).toEqual({ planned: 0, delivered: 0, delta: 0 })
    expect(r.rootCauses).toEqual({
      overdueDelivery: 0,
      incompleteOnTime: 0,
      cancelledMid: 0,
      blockedAtClose: 0,
    })
    expect(r.comparisonWithPrev).toBeNull()
  })

  it('status 分布 が 5 既知 + unknown=other に集約される', () => {
    const items = [
      mk({ status: 'todo' }),
      mk({ status: 'in_progress' }),
      mk({ status: 'blocked' }),
      mk({ status: 'done' }),
      mk({ status: 'cancelled' }),
      mk({ status: '謎' }),
      mk({ status: null }),
    ]
    const r = buildSprintRetroSummary(items)
    expect(r.statusBreakdown).toEqual({
      todo: 1,
      inProgress: 1,
      blocked: 1,
      done: 1,
      cancelled: 1,
      other: 2,
    })
    expect(r.total).toBe(7)
  })

  it('completionRate = done / total を round して % 化、cancelled も母数に含む', () => {
    const items = [
      mk({ status: 'done' }),
      mk({ status: 'done' }),
      mk({ status: 'todo' }),
      mk({ status: 'cancelled' }),
    ]
    const r = buildSprintRetroSummary(items)
    expect(r.completionRate).toBe(50) // 2/4
  })

  it('plannedVsDelivered: planned = total - cancelled, delivered = done, delta = delivered-planned', () => {
    const items = [
      mk({ status: 'done' }),
      mk({ status: 'done' }),
      mk({ status: 'todo' }),
      mk({ status: 'cancelled' }),
      mk({ status: 'cancelled' }),
    ]
    const r = buildSprintRetroSummary(items)
    expect(r.plannedVsDelivered).toEqual({ planned: 3, delivered: 2, delta: -1 })
  })

  it('overdueDelivery: done で doneAt > dueDate なら count', () => {
    const items = [
      mk({ status: 'done', dueDate: '2026-04-20', doneAt: '2026-04-22T10:00:00Z' }),
      mk({ status: 'done', dueDate: '2026-04-22', doneAt: '2026-04-22T10:00:00Z' }),
      mk({ status: 'done', dueDate: '2026-04-25', doneAt: '2026-04-22T10:00:00Z' }), // 早期完了
      mk({ status: 'done', dueDate: null, doneAt: '2026-04-22T10:00:00Z' }), // dueDate 無しは除外
    ]
    const r = buildSprintRetroSummary(items)
    expect(r.rootCauses.overdueDelivery).toBe(1)
  })

  it('incompleteOnTime: 未完了で dueDate <= sprintEnd なら count', () => {
    const items = [
      mk({ status: 'todo', dueDate: '2026-04-20' }),
      mk({ status: 'in_progress', dueDate: '2026-04-25' }),
      mk({ status: 'blocked', dueDate: '2026-04-30' }),
      mk({ status: 'todo', dueDate: '2026-05-05' }), // sprintEnd 過ぎた後の dueDate
      mk({ status: 'todo', dueDate: null }), // null は除外
      mk({ status: 'done', dueDate: '2026-04-20' }), // done は対象外
    ]
    const r = buildSprintRetroSummary(items, { sprintEndISO: '2026-04-30' })
    expect(r.rootCauses.incompleteOnTime).toBe(3)
  })

  it('cancelledMid + blockedAtClose は status から直接 count', () => {
    const items = [
      mk({ status: 'cancelled' }),
      mk({ status: 'cancelled' }),
      mk({ status: 'blocked' }),
      mk({ status: 'todo' }),
    ]
    const r = buildSprintRetroSummary(items)
    expect(r.rootCauses.cancelledMid).toBe(2)
    expect(r.rootCauses.blockedAtClose).toBe(1)
  })

  it('comparisonWithPrev: prev 指定で trend up/down/flat + delta が出る', () => {
    const prev = [mk({ status: 'done' }), mk({ status: 'done' }), mk({ status: 'todo' })]
    // prev: done=2, total=3, completionRate=67
    const curr = [
      mk({ status: 'done' }),
      mk({ status: 'done' }),
      mk({ status: 'done' }),
      mk({ status: 'todo' }),
    ]
    // curr: done=3, total=4, completionRate=75
    const r = buildSprintRetroSummary(curr, { prevItems: prev })
    expect(r.comparisonWithPrev).not.toBeNull()
    expect(r.comparisonWithPrev?.trend).toBe('up')
    expect(r.comparisonWithPrev?.completionDelta).toBe(75 - 67) // = 8
    expect(r.comparisonWithPrev?.doneDelta).toBe(1)
  })

  it('comparisonWithPrev: completionRate 同値なら flat', () => {
    const prev = [mk({ status: 'done' }), mk({ status: 'todo' })]
    const curr = [mk({ status: 'done' }), mk({ status: 'todo' })]
    const r = buildSprintRetroSummary(curr, { prevItems: prev })
    expect(r.comparisonWithPrev?.trend).toBe('flat')
    expect(r.comparisonWithPrev?.completionDelta).toBe(0)
  })

  it('comparisonWithPrev: completionRate 下がれば down', () => {
    const prev = [mk({ status: 'done' }), mk({ status: 'done' })] // 100%
    const curr = [mk({ status: 'done' }), mk({ status: 'todo' })] // 50%
    const r = buildSprintRetroSummary(curr, { prevItems: prev })
    expect(r.comparisonWithPrev?.trend).toBe('down')
    expect(r.comparisonWithPrev?.completionDelta).toBe(-50)
  })

  it('overdueDelivery: doneAt が dueDate と同日なら除外 (24h grace)', () => {
    const items = [
      mk({
        status: 'done',
        dueDate: '2026-04-22',
        doneAt: '2026-04-22T23:00:00Z',
      }),
    ]
    const r = buildSprintRetroSummary(items)
    expect(r.rootCauses.overdueDelivery).toBe(0)
  })

  it('overdueDelivery: doneAt 不正値 / null は無視', () => {
    const items = [
      mk({ status: 'done', dueDate: '2026-04-20', doneAt: null }),
      mk({ status: 'done', dueDate: '2026-04-20', doneAt: 'invalid' }),
    ]
    const r = buildSprintRetroSummary(items)
    expect(r.rootCauses.overdueDelivery).toBe(0)
  })

  it('total 大型 + cancelled 多めでも completionRate は cancelled も母数に含めて round', () => {
    const items: SprintRetroItemFields[] = []
    // done: 3, todo: 5, cancelled: 2 → completionRate = round(3/10*100) = 30
    for (let i = 0; i < 3; i++) items.push(mk({ status: 'done' }))
    for (let i = 0; i < 5; i++) items.push(mk({ status: 'todo' }))
    for (let i = 0; i < 2; i++) items.push(mk({ status: 'cancelled' }))
    const r = buildSprintRetroSummary(items)
    expect(r.total).toBe(10)
    expect(r.completionRate).toBe(30)
    expect(r.plannedVsDelivered.planned).toBe(8)
    expect(r.plannedVsDelivered.delivered).toBe(3)
    expect(r.plannedVsDelivered.delta).toBe(-5)
  })
})

describe('completionRateSeverity', () => {
  it('rate >= 75 → ok', () => {
    expect(completionRateSeverity(75)).toBe('ok')
    expect(completionRateSeverity(100)).toBe('ok')
  })
  it('50 <= rate < 75 → info', () => {
    expect(completionRateSeverity(50)).toBe('info')
    expect(completionRateSeverity(74)).toBe('info')
  })
  it('25 <= rate < 50 → warn', () => {
    expect(completionRateSeverity(25)).toBe('warn')
    expect(completionRateSeverity(49)).toBe('warn')
  })
  it('rate < 25 → danger', () => {
    expect(completionRateSeverity(0)).toBe('danger')
    expect(completionRateSeverity(24)).toBe('danger')
  })
})

describe('completionRateSeverityLabelJa', () => {
  it('4 段の Japanese label', () => {
    expect(completionRateSeverityLabelJa('ok')).toBe('順調')
    expect(completionRateSeverityLabelJa('info')).toBe('良好')
    expect(completionRateSeverityLabelJa('warn')).toBe('注意')
    expect(completionRateSeverityLabelJa('danger')).toBe('要対策')
  })
})

describe('formatSprintRetroSummaryJa', () => {
  it('empty (total=0) は完了率 0% / danger / 計画 0 件 / 納品 0 件', () => {
    const summary = buildSprintRetroSummary([])
    expect(formatSprintRetroSummaryJa(summary)).toBe('完了率 0% (要対策) — 計画 0 件 / 納品 0 件')
  })
  it('80% / ok severity / 計画 + 納品 表示', () => {
    const items: SprintRetroItemFields[] = []
    for (let i = 0; i < 8; i++) items.push(mk({ status: 'done' }))
    for (let i = 0; i < 2; i++) items.push(mk({ status: 'todo' }))
    const summary = buildSprintRetroSummary(items)
    expect(formatSprintRetroSummaryJa(summary)).toBe('完了率 80% (順調) — 計画 10 件 / 納品 8 件')
  })
  it('prev 指定で trend tail 付加', () => {
    const items: SprintRetroItemFields[] = []
    for (let i = 0; i < 7; i++) items.push(mk({ status: 'done' }))
    for (let i = 0; i < 3; i++) items.push(mk({ status: 'todo' }))
    const prev: SprintRetroItemFields[] = []
    for (let i = 0; i < 5; i++) prev.push(mk({ status: 'done' }))
    for (let i = 0; i < 5; i++) prev.push(mk({ status: 'todo' }))
    const summary = buildSprintRetroSummary(items, { prevItems: prev })
    expect(formatSprintRetroSummaryJa(summary)).toContain('改善 +20pt')
  })
})

describe('retroCompletionSeverityCountsToSeverityCounts', () => {
  it('retro 完了率 counts を 5 段 severity counts に集約 (identity + muted 0 padding)', () => {
    expect(
      retroCompletionSeverityCountsToSeverityCounts({
        ok: 3,
        info: 2,
        warn: 1,
        danger: 1,
      }),
    ).toEqual({
      ok: 3,
      info: 2,
      warn: 1,
      danger: 1,
      muted: 0,
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(
      retroCompletionSeverityCountsToSeverityCounts({ ok: 0, info: 0, warn: 0, danger: 0 }),
    ).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
  })

  it('muted は常に 0 (retro completion 4 段に muted 概念なし)', () => {
    const r = retroCompletionSeverityCountsToSeverityCounts({ ok: 1, info: 1, warn: 1, danger: 1 })
    expect(r.muted).toBe(0)
  })

  it('合計が retro 件数の合計と一致', () => {
    const counts = { ok: 3, info: 2, warn: 1, danger: 1 }
    const sevCounts = retroCompletionSeverityCountsToSeverityCounts(counts)
    const total = counts.ok + counts.info + counts.warn + counts.danger
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(total)
  })

  // iter1693 refactor regression guard: aggregateCountsBySeverity 委譲後も identity copy
  // (RetroCompletionSeverity ⊂ Severity の subset、muted は 0 padding) が保証されることを assert。
  it('入力 key 順を変えても結果同一 + muted は常に 0', () => {
    const a = retroCompletionSeverityCountsToSeverityCounts({ ok: 3, info: 2, warn: 1, danger: 1 })
    const b = retroCompletionSeverityCountsToSeverityCounts({ danger: 1, warn: 1, info: 2, ok: 3 })
    expect(a).toEqual(b)
    expect(a.muted).toBe(0)
  })
})
