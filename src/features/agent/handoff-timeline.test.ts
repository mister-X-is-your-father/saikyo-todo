import { describe, expect, it } from 'vitest'

import {
  buildHandoffTimeline,
  formatHandoffTimelineSummaryJa,
  type HandoffEvent,
} from './handoff-timeline'

function ev(
  over: Partial<HandoffEvent> & { actorType: HandoffEvent['actorType']; at: string },
): HandoffEvent {
  return { action: 'commented', ...over }
}

describe('buildHandoffTimeline', () => {
  it('空 events → 空 timeline', () => {
    const t = buildHandoffTimeline([])
    expect(t.turns).toEqual([])
    expect(t.summary.totalEvents).toBe(0)
    expect(t.summary.lastActorType).toBeNull()
  })

  it('連続する同 actor を 1 ターンに畳む', () => {
    const t = buildHandoffTimeline([
      ev({ actorType: 'human', action: 'created', at: '2026-05-01T00:00:00Z' }),
      ev({ actorType: 'human', action: 'assigned_ai', at: '2026-05-01T01:00:00Z' }),
      ev({ actorType: 'ai', action: 'plan_generated', at: '2026-05-01T02:00:00Z' }),
    ])
    expect(t.turns).toHaveLength(2)
    expect(t.turns[0]!.actorType).toBe('human')
    expect(t.turns[0]!.actions).toEqual(['created', 'assigned_ai'])
    expect(t.turns[0]!.startedAt).toBe('2026-05-01T00:00:00.000Z')
    expect(t.turns[0]!.endedAt).toBe('2026-05-01T01:00:00.000Z')
    expect(t.turns[1]!.actorType).toBe('ai')
  })

  it('handoffCount = actor 切替回数 (turnCount-1)', () => {
    const t = buildHandoffTimeline([
      ev({ actorType: 'human', at: '2026-05-01T00:00:00Z' }),
      ev({ actorType: 'ai', at: '2026-05-01T01:00:00Z' }),
      ev({ actorType: 'human', at: '2026-05-01T02:00:00Z' }),
      ev({ actorType: 'ai', at: '2026-05-01T03:00:00Z' }),
    ])
    expect(t.summary.turnCount).toBe(4)
    expect(t.summary.handoffCount).toBe(3)
    expect(t.summary.aiEventCount).toBe(2)
    expect(t.summary.humanEventCount).toBe(2)
    expect(t.summary.lastActorType).toBe('ai')
  })

  it('時刻順にソート (入力が逆順でも)', () => {
    const t = buildHandoffTimeline([
      ev({ actorType: 'ai', action: 'late', at: '2026-05-01T05:00:00Z' }),
      ev({ actorType: 'human', action: 'early', at: '2026-05-01T01:00:00Z' }),
    ])
    expect(t.turns[0]!.actions).toEqual(['early'])
    expect(t.turns[1]!.actions).toEqual(['late'])
  })

  it('parse 不能な at の event は除外', () => {
    const t = buildHandoffTimeline([
      ev({ actorType: 'human', at: 'invalid' }),
      ev({ actorType: 'ai', at: '2026-05-01T01:00:00Z' }),
    ])
    expect(t.summary.totalEvents).toBe(1)
    expect(t.turns).toHaveLength(1)
    expect(t.turns[0]!.actorType).toBe('ai')
  })

  it('actorLabel 省略時は default ラベル', () => {
    const t = buildHandoffTimeline([
      ev({ actorType: 'ai', at: '2026-05-01T00:00:00Z' }),
      ev({ actorType: 'human', actorLabel: '田中', at: '2026-05-01T01:00:00Z' }),
    ])
    expect(t.turns[0]!.actorLabel).toBe('AI')
    expect(t.turns[1]!.actorLabel).toBe('田中')
  })
})

describe('formatHandoffTimelineSummaryJa', () => {
  it('event あり → 1 行 summary', () => {
    const t = buildHandoffTimeline([
      ev({ actorType: 'human', at: '2026-05-01T00:00:00Z' }),
      ev({ actorType: 'ai', at: '2026-05-01T01:00:00Z' }),
      ev({ actorType: 'ai', at: '2026-05-01T02:00:00Z' }),
    ])
    expect(formatHandoffTimelineSummaryJa(t.summary)).toBe(
      'AI 2 / 人 1 操作・受け渡し 1 回・今の手番: AI',
    )
  })
  it('event 0 → 操作なし', () => {
    expect(formatHandoffTimelineSummaryJa(buildHandoffTimeline([]).summary)).toBe('操作なし')
  })
})
