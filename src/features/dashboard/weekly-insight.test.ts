import { describe, expect, it } from 'vitest'

import {
  buildWeeklyInsight,
  classifyWeeklyInsightHint,
  dateToISODate,
  dayIndexFromDate,
  formatBestDayJa,
  formatWeeklyInsightHintJa,
  pickBestDayInWeek,
  type WeeklyInsightItemFields,
  weekStartUTC,
} from './weekly-insight'

function mk(over: Partial<WeeklyInsightItemFields>): WeeklyInsightItemFields {
  return {
    doneAt: null,
    status: 'todo',
    dueDate: null,
    tagIds: [],
    ...over,
  }
}

// 2026-04-30 = Thursday (UTC)
// week start (Mon) = 2026-04-27
// prev week start = 2026-04-20
const NOW = new Date('2026-04-30T12:00:00Z')

describe('weekStartUTC', () => {
  it('Mon 始まり: Thu 2026-04-30 → Mon 2026-04-27', () => {
    const ws = weekStartUTC(NOW, true)
    expect(dateToISODate(ws)).toBe('2026-04-27')
  })
  it('Sun 始まり: Thu 2026-04-30 → Sun 2026-04-26', () => {
    const ws = weekStartUTC(NOW, false)
    expect(dateToISODate(ws)).toBe('2026-04-26')
  })
  it('Mon 始まり: Sun 2026-05-03 → Mon 2026-04-27 (Sun は前週末)', () => {
    const sun = new Date('2026-05-03T12:00:00Z')
    expect(dateToISODate(weekStartUTC(sun, true))).toBe('2026-04-27')
  })
  it('Mon 始まり: Mon 自身 → 同日', () => {
    const mon = new Date('2026-04-27T12:00:00Z')
    expect(dateToISODate(weekStartUTC(mon, true))).toBe('2026-04-27')
  })
})

describe('dayIndexFromDate', () => {
  it('Mon 始まりで Mon=0 .. Sun=6', () => {
    expect(dayIndexFromDate(new Date('2026-04-27T00:00:00Z'), true)).toBe(0) // Mon
    expect(dayIndexFromDate(new Date('2026-04-30T00:00:00Z'), true)).toBe(3) // Thu
    expect(dayIndexFromDate(new Date('2026-05-03T00:00:00Z'), true)).toBe(6) // Sun
  })
  it('Sun 始まりで Sun=0 .. Sat=6', () => {
    expect(dayIndexFromDate(new Date('2026-04-26T00:00:00Z'), false)).toBe(0) // Sun
    expect(dayIndexFromDate(new Date('2026-05-02T00:00:00Z'), false)).toBe(6) // Sat
  })
})

describe('buildWeeklyInsight', () => {
  it('空 items: 全 0、anomaly 空', () => {
    const r = buildWeeklyInsight([], NOW)
    expect(r.weekStart).toBe('2026-04-27')
    expect(r.prevWeekStart).toBe('2026-04-20')
    expect(r.currentWeekTotal).toBe(0)
    expect(r.prevWeekTotal).toBe(0)
    expect(r.weekDelta).toEqual({ count: 0, percent: null })
    expect(r.byDay).toHaveLength(7)
    expect(r.byDay[0]).toEqual({ day: 'Mon', dayIndex: 0, current: 0, prev: 0 })
    expect(r.byTagCurrentWeek).toEqual({})
    expect(r.anomalies).toEqual([])
  })

  it('今週分の完了: 該当 day に集計、tag が __notag に集約', () => {
    const items = [
      mk({ doneAt: '2026-04-27T10:00:00Z' }), // Mon
      mk({ doneAt: '2026-04-27T15:00:00Z' }), // Mon
      mk({ doneAt: '2026-04-30T10:00:00Z' }), // Thu
    ]
    const r = buildWeeklyInsight(items, NOW)
    expect(r.byDay[0]?.current).toBe(2) // Mon
    expect(r.byDay[3]?.current).toBe(1) // Thu
    expect(r.currentWeekTotal).toBe(3)
    expect(r.byTagCurrentWeek).toEqual({ __notag: 3 })
  })

  it('tag 別集計: 各 tag に 1 ずつ加算 (item が複数 tag なら全 tag に + 1)', () => {
    const items = [
      mk({ doneAt: '2026-04-27T10:00:00Z', tagIds: ['t1'] }),
      mk({ doneAt: '2026-04-28T10:00:00Z', tagIds: ['t1', 't2'] }),
      mk({ doneAt: '2026-04-29T10:00:00Z', tagIds: [] }),
    ]
    const r = buildWeeklyInsight(items, NOW)
    expect(r.byTagCurrentWeek).toEqual({ t1: 2, t2: 1, __notag: 1 })
  })

  it('前週分: byDay.prev に集計、byTag は前週入れない', () => {
    const items = [
      mk({ doneAt: '2026-04-20T10:00:00Z', tagIds: ['t1'] }), // 前週 Mon
      mk({ doneAt: '2026-04-22T10:00:00Z' }), // 前週 Wed
      mk({ doneAt: '2026-04-27T10:00:00Z' }), // 今週 Mon
    ]
    const r = buildWeeklyInsight(items, NOW)
    expect(r.byDay[0]?.prev).toBe(1) // Mon
    expect(r.byDay[2]?.prev).toBe(1) // Wed
    expect(r.byDay[0]?.current).toBe(1)
    expect(r.prevWeekTotal).toBe(2)
    expect(r.byTagCurrentWeek).toEqual({ __notag: 1 })
  })

  it('前週外 (2 週前) は無視', () => {
    const items = [
      mk({ doneAt: '2026-04-13T10:00:00Z' }), // 2 週前
      mk({ doneAt: '2026-04-27T10:00:00Z' }),
    ]
    const r = buildWeeklyInsight(items, NOW)
    expect(r.prevWeekTotal).toBe(0)
    expect(r.currentWeekTotal).toBe(1)
  })

  it('weekDelta: 今週 vs 前週 count + percent (round)', () => {
    const items = [
      mk({ doneAt: '2026-04-20T10:00:00Z' }),
      mk({ doneAt: '2026-04-21T10:00:00Z' }),
      mk({ doneAt: '2026-04-27T10:00:00Z' }),
      mk({ doneAt: '2026-04-28T10:00:00Z' }),
      mk({ doneAt: '2026-04-29T10:00:00Z' }),
    ]
    const r = buildWeeklyInsight(items, NOW)
    expect(r.currentWeekTotal).toBe(3)
    expect(r.prevWeekTotal).toBe(2)
    expect(r.weekDelta.count).toBe(1)
    expect(r.weekDelta.percent).toBe(50) // 3/2 = 1.5 → +50%
  })

  it('weekDelta percent: prev=0 → null (0 div 回避)', () => {
    const items = [mk({ doneAt: '2026-04-27T10:00:00Z' })]
    const r = buildWeeklyInsight(items, NOW)
    expect(r.weekDelta.percent).toBeNull()
  })

  it('anomaly lowCompletionDay: 今週合計 7+ で平均の半分以下の曜日があれば検出', () => {
    // 今週 7 件 平均 1 件/日。Mon=4, Tue=3, あとは 0 のはず。
    // Mon に 4 件、Wed に 3 件 → 平均 1、1*0.5=0.5、c<=0.5 + c<avg-1=0 で Tue,Thu,Fri,Sat,Sun が anomaly。
    const items: WeeklyInsightItemFields[] = []
    for (let i = 0; i < 4; i++) items.push(mk({ doneAt: '2026-04-27T10:00:00Z' })) // Mon
    for (let i = 0; i < 3; i++) items.push(mk({ doneAt: '2026-04-29T10:00:00Z' })) // Wed
    const r = buildWeeklyInsight(items, NOW)
    expect(r.anomalies.some((a) => a.kind === 'lowCompletionDay')).toBe(true)
  })

  it('anomaly: 今週合計 < 7 → 検出しない (noise floor)', () => {
    const items: WeeklyInsightItemFields[] = []
    for (let i = 0; i < 5; i++) items.push(mk({ doneAt: '2026-04-27T10:00:00Z' }))
    const r = buildWeeklyInsight(items, NOW)
    expect(r.anomalies.some((a) => a.kind === 'lowCompletionDay')).toBe(false)
  })

  it('anomaly overdueSpike: active で dueDate < weekStart の item 5 件以上で発動', () => {
    const items: WeeklyInsightItemFields[] = []
    for (let i = 0; i < 5; i++) {
      items.push(mk({ status: 'todo', dueDate: '2026-04-25', doneAt: null }))
    }
    const r = buildWeeklyInsight(items, NOW)
    expect(r.anomalies.some((a) => a.kind === 'overdueSpike')).toBe(true)
  })

  it('anomaly overdueSpike: 4 件以下なら検出しない', () => {
    const items: WeeklyInsightItemFields[] = []
    for (let i = 0; i < 4; i++) {
      items.push(mk({ status: 'todo', dueDate: '2026-04-25', doneAt: null }))
    }
    const r = buildWeeklyInsight(items, NOW)
    expect(r.anomalies.some((a) => a.kind === 'overdueSpike')).toBe(false)
  })

  it('weekStartsOnMonday=false: Sun 始まり', () => {
    const items = [mk({ doneAt: '2026-04-26T10:00:00Z' })] // Sun
    const r = buildWeeklyInsight(items, NOW, { weekStartsOnMonday: false })
    expect(r.weekStart).toBe('2026-04-26')
    expect(r.byDay[0]?.day).toBe('Sun')
    expect(r.byDay[0]?.current).toBe(1)
  })

  it('doneAt 不正値は無視', () => {
    const items = [mk({ doneAt: 'invalid' }), mk({ doneAt: '2026-04-27T10:00:00Z' })]
    const r = buildWeeklyInsight(items, NOW)
    expect(r.currentWeekTotal).toBe(1)
  })
})

describe('pickBestDayInWeek', () => {
  it('今週合計 0 件 → null', () => {
    const r = buildWeeklyInsight([], NOW)
    expect(pickBestDayInWeek(r)).toBeNull()
  })

  it('単独 max → その曜日を返す', () => {
    const items = [
      mk({ doneAt: '2026-04-27T10:00:00Z' }), // Mon
      mk({ doneAt: '2026-04-29T10:00:00Z' }), // Wed
      mk({ doneAt: '2026-04-29T15:00:00Z' }), // Wed
    ]
    const r = buildWeeklyInsight(items, NOW)
    expect(pickBestDayInWeek(r)).toEqual({ day: 'Wed', dayIndex: 2, current: 2 })
  })

  it('同点 (= 同 max 件数) → 週起点に近い曜日を採用 (Mon vs Fri 同 2 件 → Mon)', () => {
    const items = [
      mk({ doneAt: '2026-04-27T10:00:00Z' }),
      mk({ doneAt: '2026-04-27T15:00:00Z' }),
      mk({ doneAt: '2026-05-01T10:00:00Z' }), // Fri
      mk({ doneAt: '2026-05-01T15:00:00Z' }), // Fri
    ]
    const r = buildWeeklyInsight(items, NOW)
    expect(pickBestDayInWeek(r)).toEqual({ day: 'Mon', dayIndex: 0, current: 2 })
  })

  it('0 件曜日は無視 (= max が確実に > 0)', () => {
    const items = [mk({ doneAt: '2026-04-30T10:00:00Z' })] // Thu
    const r = buildWeeklyInsight(items, NOW)
    expect(pickBestDayInWeek(r)).toEqual({ day: 'Thu', dayIndex: 3, current: 1 })
  })
})

describe('formatBestDayJa', () => {
  it('null → 今週 完了なし', () => {
    expect(formatBestDayJa(null)).toBe('今週 完了なし')
  })

  it('best 値 → 「今週 ベスト: <day> <n> 件」', () => {
    expect(formatBestDayJa({ day: 'Mon', current: 4 })).toBe('今週 ベスト: Mon 4 件')
  })
})

describe('classifyWeeklyInsightHint', () => {
  it('今週/前週とも 0 件 → idle', () => {
    const r = buildWeeklyInsight([], NOW)
    expect(classifyWeeklyInsightHint(r)).toBe('idle')
  })

  it('overdueSpike anomaly あり → severe', () => {
    const items: WeeklyInsightItemFields[] = []
    for (let i = 0; i < 5; i++) {
      items.push(mk({ status: 'todo', dueDate: '2026-04-25', doneAt: null }))
    }
    items.push(mk({ doneAt: '2026-04-27T10:00:00Z' })) // 今週 1 件 (= idle 回避)
    const r = buildWeeklyInsight(items, NOW)
    expect(classifyWeeklyInsightHint(r)).toBe('severe')
  })

  it('lowCompletionDay anomaly あり → moderate', () => {
    // 今週 7+ 件で平均の半分以下の曜日があるパターン (lowCompletionDay)
    const items: WeeklyInsightItemFields[] = []
    for (let i = 0; i < 4; i++) items.push(mk({ doneAt: '2026-04-27T10:00:00Z' })) // Mon
    for (let i = 0; i < 3; i++) items.push(mk({ doneAt: '2026-04-29T10:00:00Z' })) // Wed
    const r = buildWeeklyInsight(items, NOW)
    expect(classifyWeeklyInsightHint(r)).toBe('moderate')
  })

  it('weekDelta -30% 以下 → moderate', () => {
    const items: WeeklyInsightItemFields[] = []
    // 前週 10 件、今週 1 件 → -90%
    for (let i = 0; i < 10; i++) items.push(mk({ doneAt: '2026-04-20T10:00:00Z' }))
    items.push(mk({ doneAt: '2026-04-27T10:00:00Z' }))
    const r = buildWeeklyInsight(items, NOW)
    expect(classifyWeeklyInsightHint(r)).toBe('moderate')
  })

  it('健常範囲 → mild', () => {
    const items = [
      mk({ doneAt: '2026-04-20T10:00:00Z' }),
      mk({ doneAt: '2026-04-27T10:00:00Z' }),
      mk({ doneAt: '2026-04-28T10:00:00Z' }),
    ]
    const r = buildWeeklyInsight(items, NOW)
    expect(classifyWeeklyInsightHint(r)).toBe('mild')
  })
})

describe('formatWeeklyInsightHintJa', () => {
  it('idle / mild / moderate / severe を 1 単語で返す', () => {
    const empty = buildWeeklyInsight([], NOW)
    expect(formatWeeklyInsightHintJa(empty)).toBe('活動なし')

    const items: WeeklyInsightItemFields[] = []
    for (let i = 0; i < 5; i++) {
      items.push(mk({ status: 'todo', dueDate: '2026-04-25', doneAt: null }))
    }
    items.push(mk({ doneAt: '2026-04-27T10:00:00Z' }))
    const sev = buildWeeklyInsight(items, NOW)
    expect(formatWeeklyInsightHintJa(sev)).toBe('異常')
  })
})
