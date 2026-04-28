import { describe, expect, it } from 'vitest'

import {
  formatPeriodCompletion,
  type PeriodCompletionFields,
  summarizePeriodCompletion,
} from './period-completion'

const item = (overrides: Partial<PeriodCompletionFields> = {}): PeriodCompletionFields => ({
  isMust: false,
  doneAt: null,
  createdAt: null,
  archivedAt: null,
  ...overrides,
})

describe('summarizePeriodCompletion', () => {
  const period = { from: '2026-04-22', to: '2026-04-28' }

  it('期間内の完了 / 追加を集計、外は除外', () => {
    const r = summarizePeriodCompletion(
      [
        item({ doneAt: '2026-04-25T10:00:00Z', createdAt: '2026-04-20T00:00:00Z' }), // 完了 + 追加=外
        item({ doneAt: '2026-04-29T10:00:00Z', createdAt: '2026-04-25T00:00:00Z' }), // 完了=外 + 追加
        item({ doneAt: null, createdAt: '2026-04-23T00:00:00Z' }), // 追加のみ
        item({ doneAt: '2026-04-22T00:00:00Z', createdAt: '2026-04-22T00:00:00Z' }), // 完了 + 追加 (両端 inclusive)
      ],
      period,
    )
    expect(r.itemsCompleted).toBe(2)
    expect(r.itemsAdded).toBe(3) // 04-25 / 04-23 / 04-22 が period 内
    expect(r.periodDays).toBe(7)
  })

  it('MUST 完了件数も集計', () => {
    const r = summarizePeriodCompletion(
      [
        item({ doneAt: '2026-04-25', isMust: true, createdAt: '2026-04-20' }),
        item({ doneAt: '2026-04-26', isMust: false, createdAt: '2026-04-20' }),
        item({ doneAt: '2026-04-27', isMust: true, createdAt: '2026-04-20' }),
      ],
      period,
    )
    expect(r.itemsCompleted).toBe(3)
    expect(r.mustCompletedCount).toBe(2)
  })

  it('avgCompletionDays: doneAt - createdAt の平均 (1 桁 round)', () => {
    const r = summarizePeriodCompletion(
      [
        // created 2 日前 → 2 日所要
        item({ doneAt: '2026-04-25T00:00:00Z', createdAt: '2026-04-23T00:00:00Z' }),
        // created 4 日前 → 4 日所要
        item({ doneAt: '2026-04-26T00:00:00Z', createdAt: '2026-04-22T00:00:00Z' }),
      ],
      period,
    )
    // (2 + 4) / 2 = 3.0
    expect(r.avgCompletionDays).toBe(3)
  })

  it('完了 0 件は avgCompletionDays=null', () => {
    const r = summarizePeriodCompletion([item({ createdAt: '2026-04-23' })], period)
    expect(r.itemsCompleted).toBe(0)
    expect(r.avgCompletionDays).toBe(null)
  })

  it('createdAt 不正な item は avg 計算から除外 (count は計上)', () => {
    const r = summarizePeriodCompletion(
      [
        item({ doneAt: '2026-04-25T00:00:00Z', createdAt: 'garbage' }),
        item({ doneAt: '2026-04-26T00:00:00Z', createdAt: '2026-04-22T00:00:00Z' }),
      ],
      period,
    )
    expect(r.itemsCompleted).toBe(2)
    expect(r.avgCompletionDays).toBe(4) // 2 件目のみで計算 → 4 日
  })

  it('from > to は全 0 + null', () => {
    const r = summarizePeriodCompletion([item({ doneAt: '2026-04-25', createdAt: '2026-04-22' })], {
      from: '2026-04-30',
      to: '2026-04-22',
    })
    expect(r.itemsCompleted).toBe(0)
    expect(r.itemsAdded).toBe(0)
    expect(r.avgCompletionDays).toBe(null)
  })

  it('不正 ISO は全 0 + null + periodDays=1', () => {
    const r = summarizePeriodCompletion([], { from: 'garbage', to: 'garbage' })
    expect(r.itemsCompleted).toBe(0)
    expect(r.periodDays).toBe(1)
  })

  it('to 日の 23:59:59 まで inclusive (UTC)', () => {
    const r = summarizePeriodCompletion(
      [item({ doneAt: '2026-04-28T23:59:00Z', createdAt: '2026-04-25T00:00:00Z' })],
      period,
    )
    expect(r.itemsCompleted).toBe(1)
  })
})

describe('formatPeriodCompletion', () => {
  it('全 0 件: "直近 N 日: 完了 0 件 / 新規追加 0 件"', () => {
    expect(
      formatPeriodCompletion({
        itemsCompleted: 0,
        mustCompletedCount: 0,
        itemsAdded: 0,
        avgCompletionDays: null,
        periodDays: 7,
      }),
    ).toBe('直近 7 日: 完了 0 件 / 新規追加 0 件')
  })

  it('完了あり + MUST あり + avg あり', () => {
    expect(
      formatPeriodCompletion({
        itemsCompleted: 12,
        mustCompletedCount: 3,
        itemsAdded: 5,
        avgCompletionDays: 3.2,
        periodDays: 7,
      }),
    ).toBe('直近 7 日: 完了 12 件 (MUST 3) / 新規追加 5 件 / 平均所要 3.2 日')
  })

  it('完了あり + MUST 0 + avg なし', () => {
    expect(
      formatPeriodCompletion({
        itemsCompleted: 4,
        mustCompletedCount: 0,
        itemsAdded: 2,
        avgCompletionDays: null,
        periodDays: 30,
      }),
    ).toBe('直近 30 日: 完了 4 件 / 新規追加 2 件')
  })

  it('periodDays=0 (異常系) は sentinel', () => {
    expect(
      formatPeriodCompletion({
        itemsCompleted: 0,
        mustCompletedCount: 0,
        itemsAdded: 0,
        avgCompletionDays: null,
        periodDays: 0,
      }),
    ).toBe('直近 0 日: (集計なし)')
  })
})
