import { describe, expect, it } from 'vitest'

import {
  buildCycleCheckStats,
  buildCyclePaceSignal,
  type CycleCheckItemFields,
  cycleCheckSeverity,
  type CycleCheckStats,
  formatCycleCheckCompactJa,
  formatCycleCheckStatsJa,
  median,
  parseDateLike,
} from './cycle-check-stats'

function mk(over: Partial<CycleCheckItemFields> & { id: string }): CycleCheckItemFields {
  return {
    status: 'todo',
    createdAt: '2026-04-25T00:00:00Z',
    doneAt: null,
    dueDate: null,
    ...over,
  }
}

const CYCLE_START = '2026-04-25'
const CYCLE_END = '2026-04-30'

describe('parseDateLike', () => {
  it('valid Date / string / null', () => {
    expect(parseDateLike(new Date('2026-04-25'))).not.toBeNull()
    expect(parseDateLike('2026-04-25')).not.toBeNull()
    expect(parseDateLike(null)).toBeNull()
    expect(parseDateLike(undefined)).toBeNull()
  })
  it('invalid string → null', () => {
    expect(parseDateLike('invalid')).toBeNull()
  })
})

describe('median', () => {
  it('odd length: 中央値', () => {
    expect(median([1, 2, 3])).toBe(2)
    expect(median([5])).toBe(5)
  })
  it('even length: 中央 2 つの平均', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
  it('空配列 → null', () => {
    expect(median([])).toBeNull()
  })
})

describe('buildCycleCheckStats', () => {
  it('空 items: 全 0 + leadTime null', () => {
    const r = buildCycleCheckStats([], {
      cycleStartedAt: CYCLE_START,
      cycleEndedAt: CYCLE_END,
    })
    expect(r.total).toBe(0)
    expect(r.done).toBe(0)
    expect(r.completionRate).toBe(0)
    expect(r.leadTimeAvgHours).toBeNull()
    expect(r.leadTimeMedianHours).toBeNull()
    expect(r.lateCompletionCount).toBe(0)
    expect(r.inFlightOverdueCount).toBe(0)
    // 6 day cycle (4-25 to 4-30 inclusive)
    expect(r.cycleDurationDays).toBe(6)
  })

  it('status 別 count: done / cancelled / inProgressOrTodo', () => {
    const items = [
      mk({ id: 'a', status: 'done', doneAt: '2026-04-28T10:00:00Z' }),
      mk({ id: 'b', status: 'cancelled' }),
      mk({ id: 'c', status: 'todo' }),
      mk({ id: 'd', status: 'in_progress' }),
      mk({ id: 'e', status: 'blocked' }),
    ]
    const r = buildCycleCheckStats(items, {
      cycleStartedAt: CYCLE_START,
      cycleEndedAt: CYCLE_END,
    })
    expect(r.total).toBe(5)
    expect(r.done).toBe(1)
    expect(r.cancelled).toBe(1)
    expect(r.inProgressOrTodo).toBe(3)
    expect(r.completionRate).toBe(20) // 1/5
  })

  it('leadTime 平均 + 中央値 (時間単位、小数 1 桁 round)', () => {
    const items = [
      // 24h
      mk({
        id: 'a',
        status: 'done',
        createdAt: '2026-04-25T00:00:00Z',
        doneAt: '2026-04-26T00:00:00Z',
      }),
      // 48h
      mk({
        id: 'b',
        status: 'done',
        createdAt: '2026-04-25T00:00:00Z',
        doneAt: '2026-04-27T00:00:00Z',
      }),
      // 72h
      mk({
        id: 'c',
        status: 'done',
        createdAt: '2026-04-25T00:00:00Z',
        doneAt: '2026-04-28T00:00:00Z',
      }),
    ]
    const r = buildCycleCheckStats(items)
    // avg = (24+48+72)/3 = 48
    expect(r.leadTimeAvgHours).toBe(48)
    expect(r.leadTimeMedianHours).toBe(48)
  })

  it('lateCompletionCount: done で doneAt > dueDate', () => {
    const items = [
      // due 4-26、done 4-28 → late
      mk({
        id: 'a',
        status: 'done',
        dueDate: '2026-04-26',
        createdAt: '2026-04-25T00:00:00Z',
        doneAt: '2026-04-28T10:00:00Z',
      }),
      // due 4-30、done 4-28 → on-time
      mk({
        id: 'b',
        status: 'done',
        dueDate: '2026-04-30',
        createdAt: '2026-04-25T00:00:00Z',
        doneAt: '2026-04-28T10:00:00Z',
      }),
      // dueDate 無し、done → on-time 扱い
      mk({
        id: 'c',
        status: 'done',
        createdAt: '2026-04-25T00:00:00Z',
        doneAt: '2026-04-28T10:00:00Z',
      }),
    ]
    const r = buildCycleCheckStats(items)
    expect(r.lateCompletionCount).toBe(1)
  })

  it('inFlightOverdueCount: 未完了で dueDate < cycleEnd', () => {
    const items = [
      mk({ id: 'a', status: 'todo', dueDate: '2026-04-26' }), // overdue (cycle end 4-30)
      mk({ id: 'b', status: 'in_progress', dueDate: '2026-05-05' }), // ok
      mk({ id: 'c', status: 'blocked', dueDate: '2026-04-28' }), // overdue
      mk({ id: 'd', status: 'todo' }), // dueDate 無し → ok
    ]
    const r = buildCycleCheckStats(items, { cycleEndedAt: CYCLE_END })
    expect(r.inFlightOverdueCount).toBe(2)
  })

  it('cycleDurationDays: 両端含む、最低 1', () => {
    const r = buildCycleCheckStats([], {
      cycleStartedAt: '2026-04-30',
      cycleEndedAt: '2026-04-30',
    })
    // 同日 = 1 日
    expect(r.cycleDurationDays).toBe(1)
  })

  it('cycleStartedAt / cycleEndedAt 未指定 → default 7 日前から今日', () => {
    const r = buildCycleCheckStats([])
    expect(r.cycleDurationDays).toBe(8) // 7 day diff inclusive
  })

  it('doneAt 不正値は leadTime 集計から除外', () => {
    const items = [
      mk({
        id: 'a',
        status: 'done',
        createdAt: '2026-04-25T00:00:00Z',
        doneAt: 'invalid',
      }),
      mk({
        id: 'b',
        status: 'done',
        createdAt: '2026-04-25T00:00:00Z',
        doneAt: '2026-04-26T00:00:00Z',
      }),
    ]
    const r = buildCycleCheckStats(items)
    expect(r.done).toBe(2)
    expect(r.leadTimeAvgHours).toBe(24) // 'b' 1 件のみ
  })

  it('leadTime 負値は除外 (createdAt > doneAt の異常 data 防止)', () => {
    const items = [
      mk({
        id: 'a',
        status: 'done',
        createdAt: '2026-04-30T00:00:00Z',
        doneAt: '2026-04-25T00:00:00Z',
      }),
      mk({
        id: 'b',
        status: 'done',
        createdAt: '2026-04-25T00:00:00Z',
        doneAt: '2026-04-26T00:00:00Z',
      }),
    ]
    const r = buildCycleCheckStats(items)
    expect(r.leadTimeAvgHours).toBe(24) // 'b' 1 件のみ
  })

  it('completionRate は cancelled も母数に含む', () => {
    const items = [
      mk({ id: 'a', status: 'done', doneAt: '2026-04-28T00:00:00Z' }),
      mk({ id: 'b', status: 'cancelled' }),
      mk({ id: 'c', status: 'todo' }),
    ]
    const r = buildCycleCheckStats(items)
    expect(r.completionRate).toBe(33) // 1/3 = 33
  })
})

describe('formatCycleCheckStatsJa', () => {
  it('total=0 → 完了 item なし', () => {
    const stats: CycleCheckStats = {
      total: 0,
      done: 0,
      cancelled: 0,
      inProgressOrTodo: 0,
      completionRate: 0,
      leadTimeAvgHours: null,
      leadTimeMedianHours: null,
      lateCompletionCount: 0,
      inFlightOverdueCount: 0,
      cycleDurationDays: 1,
    }
    expect(formatCycleCheckStatsJa(stats)).toBe('完了率 0% (0/0) — 完了 item なし')
  })

  it('完了率 / lead / 遅延 / overdue を 1 行', () => {
    const stats: CycleCheckStats = {
      total: 5,
      done: 4,
      cancelled: 0,
      inProgressOrTodo: 1,
      completionRate: 80,
      leadTimeAvgHours: 12,
      leadTimeMedianHours: 10,
      lateCompletionCount: 1,
      inFlightOverdueCount: 0,
      cycleDurationDays: 7,
    }
    expect(formatCycleCheckStatsJa(stats)).toBe(
      '完了率 80% (4/5) — 平均 lead 12h / 遅延完了 1 / 期限内 active 0',
    )
  })

  it('leadTimeAvgHours=null → 未計測', () => {
    const stats: CycleCheckStats = {
      total: 3,
      done: 0,
      cancelled: 0,
      inProgressOrTodo: 3,
      completionRate: 0,
      leadTimeAvgHours: null,
      leadTimeMedianHours: null,
      lateCompletionCount: 0,
      inFlightOverdueCount: 1,
      cycleDurationDays: 5,
    }
    expect(formatCycleCheckStatsJa(stats)).toContain('平均 lead 未計測')
  })
})

describe('cycleCheckSeverity', () => {
  function mkStats(over: Partial<CycleCheckStats>): CycleCheckStats {
    return {
      total: 5,
      done: 0,
      cancelled: 0,
      inProgressOrTodo: 0,
      completionRate: 0,
      leadTimeAvgHours: null,
      leadTimeMedianHours: null,
      lateCompletionCount: 0,
      inFlightOverdueCount: 0,
      cycleDurationDays: 7,
      ...over,
    }
  }

  it('total=0 → warn (empty cycle 注意)', () => {
    expect(cycleCheckSeverity(mkStats({ total: 0 }))).toBe('warn')
  })
  it('completionRate >= 75 → ok', () => {
    expect(cycleCheckSeverity(mkStats({ completionRate: 75 }))).toBe('ok')
    expect(cycleCheckSeverity(mkStats({ completionRate: 100 }))).toBe('ok')
  })
  it('50-74 → info', () => {
    expect(cycleCheckSeverity(mkStats({ completionRate: 50 }))).toBe('info')
    expect(cycleCheckSeverity(mkStats({ completionRate: 74 }))).toBe('info')
  })
  it('25-49 → warn', () => {
    expect(cycleCheckSeverity(mkStats({ completionRate: 25 }))).toBe('warn')
    expect(cycleCheckSeverity(mkStats({ completionRate: 49 }))).toBe('warn')
  })
  it('< 25 → danger', () => {
    expect(cycleCheckSeverity(mkStats({ completionRate: 0 }))).toBe('danger')
    expect(cycleCheckSeverity(mkStats({ completionRate: 24 }))).toBe('danger')
  })
})

describe('formatCycleCheckCompactJa (iter1013)', () => {
  function mkStats(over: Partial<CycleCheckStats>): CycleCheckStats {
    return {
      total: 5,
      done: 0,
      cancelled: 0,
      inProgressOrTodo: 0,
      completionRate: 0,
      leadTimeAvgHours: null,
      leadTimeMedianHours: null,
      lateCompletionCount: 0,
      inFlightOverdueCount: 0,
      cycleDurationDays: 7,
      ...over,
    }
  }

  it('total=0 → 「空 cycle」', () => {
    expect(formatCycleCheckCompactJa(mkStats({ total: 0 }))).toBe('空 cycle')
  })

  it('ok (>= 75%) → 「順調」', () => {
    expect(formatCycleCheckCompactJa(mkStats({ total: 5, done: 4, completionRate: 80 }))).toBe(
      '順調 80% (4/5)',
    )
  })

  it('info (50-74) → 「進行」', () => {
    expect(formatCycleCheckCompactJa(mkStats({ total: 4, done: 2, completionRate: 50 }))).toBe(
      '進行 50% (2/4)',
    )
  })

  it('warn (25-49) → 「注意」', () => {
    expect(formatCycleCheckCompactJa(mkStats({ total: 10, done: 3, completionRate: 30 }))).toBe(
      '注意 30% (3/10)',
    )
  })

  it('danger (< 25) → 「危険」', () => {
    expect(formatCycleCheckCompactJa(mkStats({ total: 10, done: 1, completionRate: 10 }))).toBe(
      '危険 10% (1/10)',
    )
  })
})

describe('buildCyclePaceSignal', () => {
  function mkStats(over: Partial<CycleCheckStats>): CycleCheckStats {
    return {
      total: 5,
      done: 0,
      cancelled: 0,
      inProgressOrTodo: 0,
      completionRate: 0,
      leadTimeAvgHours: null,
      leadTimeMedianHours: null,
      lateCompletionCount: 0,
      inFlightOverdueCount: 0,
      cycleDurationDays: 7,
      ...over,
    }
  }

  const START = '2026-04-25T00:00:00Z'
  const END = '2026-04-30T00:00:00Z' // 5 日窓
  const MID = '2026-04-27T12:00:00Z' // 経過 50%

  it('空 cycle (total=0) → idle', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 0 }), {
      startedAt: START,
      endsAt: END,
      now: MID,
    })
    expect(s.status).toBe('idle')
    expect(s.tone).toBe('info')
    expect(s.text).toBe('空 cycle — 進捗未計測')
  })

  it('期間未設定 (start/end 欠落) → idle', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 5, completionRate: 40 }), { now: MID })
    expect(s.status).toBe('idle')
    expect(s.text).toBe('期間未設定 — ペース計測不可')
  })

  it('end <= start (不正窓) → idle', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 5, completionRate: 40 }), {
      startedAt: END,
      endsAt: START,
      now: MID,
    })
    expect(s.status).toBe('idle')
  })

  it('前倒し: 経過 50% / 完了 80% → ahead / ok', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 5, done: 4, completionRate: 80 }), {
      startedAt: START,
      endsAt: END,
      now: MID,
    })
    expect(s.status).toBe('ahead')
    expect(s.tone).toBe('ok')
    expect(s.elapsedPct).toBe(50)
    expect(s.paceGap).toBe(30)
    expect(s.text).toBe('前倒し (完了 80% / 経過 50%)')
  })

  it('オンペース: 経過 50% / 完了 50% → on-pace / info', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 4, done: 2, completionRate: 50 }), {
      startedAt: START,
      endsAt: END,
      now: MID,
    })
    expect(s.status).toBe('on-pace')
    expect(s.tone).toBe('info')
    expect(s.paceGap).toBe(0)
    expect(s.text).toBe('オンペース (完了 50% / 経過 50%)')
  })

  it('やや遅れ: 経過 50% / 完了 30% (gap -20) → behind / warn', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 10, done: 3, completionRate: 30 }), {
      startedAt: START,
      endsAt: END,
      now: MID,
    })
    expect(s.status).toBe('behind')
    expect(s.tone).toBe('warn')
    expect(s.paceGap).toBe(-20)
    expect(s.text).toBe('やや遅れ (完了 30% / 経過 50%)')
  })

  it('遅れ: 経過 50% / 完了 5% (gap -45) → at-risk / danger', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 20, done: 1, completionRate: 5 }), {
      startedAt: START,
      endsAt: END,
      now: MID,
    })
    expect(s.status).toBe('at-risk')
    expect(s.tone).toBe('danger')
    expect(s.text).toBe('遅れ (完了 5% / 経過 50%)')
  })

  it('期間超過で未完 → at-risk / danger (経過 100% 超表示)', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 5, done: 2, completionRate: 40 }), {
      startedAt: START,
      endsAt: END,
      now: '2026-05-02T00:00:00Z', // 7 日経過 / 5 日窓 = 140%
    })
    expect(s.status).toBe('at-risk')
    expect(s.tone).toBe('danger')
    expect(s.elapsedPct).toBe(140)
    expect(s.text).toBe('期間超過・未完 (完了 40% / 経過 140%)')
  })

  it('完了率 100% は期間超過でも ok (完了済 最優先)', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 5, done: 5, completionRate: 100 }), {
      startedAt: START,
      endsAt: END,
      now: '2026-05-02T00:00:00Z',
    })
    expect(s.status).toBe('ahead')
    expect(s.tone).toBe('ok')
    expect(s.text).toBe('完了済 (100%)')
  })

  it('開始前 (now < start) → 経過 0% / 完了 0% は on-pace', () => {
    const s = buildCyclePaceSignal(mkStats({ total: 5, completionRate: 0 }), {
      startedAt: START,
      endsAt: END,
      now: '2026-04-24T00:00:00Z',
    })
    expect(s.elapsedPct).toBe(0)
    expect(s.status).toBe('on-pace')
  })
})
