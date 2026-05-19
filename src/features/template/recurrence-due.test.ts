import { describe, expect, it } from 'vitest'

import { classifyRecurrenceDue, pickInstantiationCandidates } from './recurrence-due'

const NOW = new Date('2026-05-19T12:00:00Z')

describe('classifyRecurrenceDue', () => {
  it('paused → kind=paused、即展開しない', () => {
    const r = classifyRecurrenceDue(
      { lastRunAt: null, nextRunAt: new Date('2026-05-18T09:00:00Z'), paused: true },
      NOW,
    )
    expect(r.kind).toBe('paused')
    expect(r.shouldInstantiate).toBe(false)
  })

  it('nextRunAt=null → never-run、設定要確認', () => {
    const r = classifyRecurrenceDue({ lastRunAt: null, nextRunAt: null, paused: false }, NOW)
    expect(r.kind).toBe('never-run')
    expect(r.message).toContain('cron')
  })

  it('nextRunAt が過去 → overdue、shouldInstantiate=true', () => {
    const r = classifyRecurrenceDue(
      { lastRunAt: null, nextRunAt: new Date('2026-05-19T09:00:00Z'), paused: false },
      NOW,
    )
    expect(r.kind).toBe('overdue')
    expect(r.shouldInstantiate).toBe(true)
    expect(r.message).toContain('時間')
  })

  it('nextRunAt が今日中 (1 日以内) → due-today、まだ instantiate しない', () => {
    const r = classifyRecurrenceDue(
      { lastRunAt: null, nextRunAt: new Date('2026-05-19T18:00:00Z'), paused: false },
      NOW,
    )
    expect(r.kind).toBe('due-today')
    expect(r.shouldInstantiate).toBe(false)
    expect(r.message).toContain('時間後')
  })

  it('nextRunAt が 1 日超先 → upcoming', () => {
    const r = classifyRecurrenceDue(
      { lastRunAt: null, nextRunAt: new Date('2026-05-22T09:00:00Z'), paused: false },
      NOW,
    )
    expect(r.kind).toBe('upcoming')
    expect(r.shouldInstantiate).toBe(false)
    expect(r.message).toContain('日後')
  })

  it('paused が true なら nextRunAt が過去でも展開しない', () => {
    const r = classifyRecurrenceDue(
      { lastRunAt: null, nextRunAt: new Date('2026-04-01T00:00:00Z'), paused: true },
      NOW,
    )
    expect(r.kind).toBe('paused')
    expect(r.shouldInstantiate).toBe(false)
  })
})

describe('pickInstantiationCandidates', () => {
  it('overdue のみ抽出 (paused / future は除外)', () => {
    const templates = [
      {
        id: 't1-overdue',
        state: {
          lastRunAt: null,
          nextRunAt: new Date('2026-05-19T09:00:00Z'),
          paused: false,
        },
      },
      {
        id: 't2-future',
        state: {
          lastRunAt: null,
          nextRunAt: new Date('2026-05-22T09:00:00Z'),
          paused: false,
        },
      },
      {
        id: 't3-paused-overdue',
        state: {
          lastRunAt: null,
          nextRunAt: new Date('2026-05-01T09:00:00Z'),
          paused: true,
        },
      },
    ]
    expect(pickInstantiationCandidates(templates, NOW).map((t) => t.id)).toEqual(['t1-overdue'])
  })

  it('空配列 → 空配列', () => {
    expect(pickInstantiationCandidates([], NOW)).toEqual([])
  })

  it('全部 future → 空配列', () => {
    expect(
      pickInstantiationCandidates(
        [
          {
            id: 'a',
            state: {
              lastRunAt: null,
              nextRunAt: new Date('2026-06-01T00:00:00Z'),
              paused: false,
            },
          },
        ],
        NOW,
      ),
    ).toEqual([])
  })
})
