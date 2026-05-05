/**
 * iter472 swim-lane orchestrator の unit test。pure helper のみ、DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  computeSprintSwimlane,
  formatSprintSwimlanePopulationJa,
  type SprintSwimlaneInput,
  summarizeSprintSwimlanePopulation,
} from './swimlane-orchestrator'

const SPRINT = { startDate: '2026-04-27', endDate: '2026-05-10' } // 14 日

interface TestItem {
  id: string
  startDate: string | null
  dueDate: string | null
}

function makeInput(
  items: TestItem[],
  assignees: Record<string, Array<{ actorType: string; actorId: string }>>,
  estimates?: Record<string, number>,
): SprintSwimlaneInput<TestItem> {
  return {
    sprint: SPRINT,
    items,
    getAssignees: (id) => assignees[id] ?? [],
    estimateMinutesByItemId: estimates ? new Map(Object.entries(estimates)) : undefined,
  }
}

describe('computeSprintSwimlane', () => {
  it('items 空 → rows 空', () => {
    const rows = computeSprintSwimlane(makeInput([], {}))
    expect(rows).toEqual([])
  })

  it('1 lane / 1 item → rows 1 件、items 1 件、loadSummaryJa 整形', () => {
    const rows = computeSprintSwimlane(
      makeInput(
        [{ id: 'i1', startDate: '2026-04-27', dueDate: '2026-05-10' }],
        { i1: [{ actorType: 'user', actorId: 'u1' }] },
        { i1: 480 },
      ),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!.laneKey).toBe('user:u1')
    expect(rows[0]!.assigneeRef).toEqual({ actorType: 'user', actorId: 'u1' })
    expect(rows[0]!.items).toHaveLength(1)
    expect(rows[0]!.items[0]!.position.leftPct).toBe(0)
    expect(rows[0]!.items[0]!.position.widthPct).toBe(100)
    expect(rows[0]!.items[0]!.conflicted).toBe(false)
    expect(rows[0]!.loadSummaryJa).toBe('1 件 / 8時間 / 重複なし')
    expect(rows[0]!.conflictsJa).toBe('時間重複なし')
  })

  it('sprint 完全範囲外の item → row 内 items から除外 (lane 自体は残る)', () => {
    const rows = computeSprintSwimlane(
      makeInput(
        [
          { id: 'in', startDate: '2026-04-28', dueDate: '2026-05-02' },
          { id: 'out', startDate: '2026-06-01', dueDate: '2026-06-05' }, // sprint 外
        ],
        {
          in: [{ actorType: 'user', actorId: 'u1' }],
          out: [{ actorType: 'user', actorId: 'u1' }],
        },
      ),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!.items.map((i) => i.item.id)).toEqual(['in'])
    // ただし groupByAssigneeKey は out も lane に含めるため loadSummary には反映
    expect(rows[0]!.loadSummary.itemCount).toBe(2)
  })

  it('複数 lane → actorType:actorId 昇順 sort、未割当は最後', () => {
    const rows = computeSprintSwimlane(
      makeInput(
        [
          { id: 'i_unassigned', startDate: '2026-04-27', dueDate: '2026-04-30' },
          { id: 'i_b', startDate: '2026-04-27', dueDate: '2026-04-30' },
          { id: 'i_a', startDate: '2026-04-27', dueDate: '2026-04-30' },
        ],
        {
          i_a: [{ actorType: 'user', actorId: 'aaa' }],
          i_b: [{ actorType: 'user', actorId: 'bbb' }],
          i_unassigned: [],
        },
      ),
    )
    expect(rows.map((r) => r.laneKey)).toEqual(['user:aaa', 'user:bbb', null])
  })

  it('1 item を 2 assignee → 各 lane に entry', () => {
    const rows = computeSprintSwimlane(
      makeInput([{ id: 'shared', startDate: '2026-04-27', dueDate: '2026-04-30' }], {
        shared: [
          { actorType: 'user', actorId: 'u1' },
          { actorType: 'user', actorId: 'u2' },
        ],
      }),
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]!.items[0]!.item.id).toBe('shared')
    expect(rows[1]!.items[0]!.item.id).toBe('shared')
  })

  it('lane 内 時間重複 → conflicted flag + conflictsJa 整形', () => {
    const rows = computeSprintSwimlane(
      makeInput(
        [
          { id: 'a', startDate: '2026-04-27', dueDate: '2026-05-02' },
          { id: 'b', startDate: '2026-04-30', dueDate: '2026-05-05' },
        ],
        {
          a: [{ actorType: 'user', actorId: 'u1' }],
          b: [{ actorType: 'user', actorId: 'u1' }],
        },
      ),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!.items.find((i) => i.item.id === 'a')!.conflicted).toBe(true)
    expect(rows[0]!.items.find((i) => i.item.id === 'b')!.conflicted).toBe(true)
    expect(rows[0]!.conflicts).toHaveLength(1)
    // 4/30 - 5/2 = 3 日 重複
    expect(rows[0]!.conflictsJa).toBe('時間重複: 1 ペア (合計 3 日)')
  })

  it('lane 内 items は visibleStart 昇順 sort、同点は id 昇順', () => {
    const rows = computeSprintSwimlane(
      makeInput(
        [
          { id: 'late', startDate: '2026-05-05', dueDate: '2026-05-08' },
          { id: 'mid_b', startDate: '2026-04-29', dueDate: '2026-05-01' },
          { id: 'mid_a', startDate: '2026-04-29', dueDate: '2026-05-01' },
          { id: 'early', startDate: '2026-04-27', dueDate: '2026-04-28' },
        ],
        {
          early: [{ actorType: 'user', actorId: 'u1' }],
          mid_a: [{ actorType: 'user', actorId: 'u1' }],
          mid_b: [{ actorType: 'user', actorId: 'u1' }],
          late: [{ actorType: 'user', actorId: 'u1' }],
        },
      ),
    )
    expect(rows[0]!.items.map((i) => i.item.id)).toEqual(['early', 'mid_a', 'mid_b', 'late'])
  })

  it('estimate 指定なし → loadSummary 全 0、loadSummaryJa は "見積なし"', () => {
    const rows = computeSprintSwimlane(
      makeInput([{ id: 'i1', startDate: '2026-04-27', dueDate: '2026-04-30' }], {
        i1: [{ actorType: 'user', actorId: 'u1' }],
      }),
    )
    expect(rows[0]!.loadSummary.estimateMinutesTotal).toBe(0)
    expect(rows[0]!.loadSummaryJa).toBe('1 件 / 見積なし / 重複なし')
  })

  it('clip 範囲跨ぎ item → position.clippedAtStart / End flag が立つ', () => {
    const rows = computeSprintSwimlane(
      makeInput([{ id: 'spans', startDate: '2026-04-20', dueDate: '2026-05-15' }], {
        spans: [{ actorType: 'user', actorId: 'u1' }],
      }),
    )
    expect(rows[0]!.items[0]!.position.clippedAtStart).toBe(true)
    expect(rows[0]!.items[0]!.position.clippedAtEnd).toBe(true)
    expect(rows[0]!.items[0]!.position.leftPct).toBe(0)
    expect(rows[0]!.items[0]!.position.widthPct).toBe(100)
  })

  it('actorType 違いの同 actorId は別 lane', () => {
    const rows = computeSprintSwimlane(
      makeInput(
        [
          { id: 'i1', startDate: '2026-04-27', dueDate: '2026-04-30' },
          { id: 'i2', startDate: '2026-04-27', dueDate: '2026-04-30' },
        ],
        {
          i1: [{ actorType: 'user', actorId: 'shared' }],
          i2: [{ actorType: 'agent', actorId: 'shared' }],
        },
      ),
    )
    expect(rows.map((r) => r.laneKey)).toEqual(['agent:shared', 'user:shared'])
  })

  it('actorId に ":" を含む key は actorType と actorId に正しく split', () => {
    // groupItemsByAssigneeKey は単純 ${actorType}:${actorId} で結合 → parse 側は
    // 最初の ":" で 2 分割するので actorId 内 ":" は actorId 側に保持される
    const rows = computeSprintSwimlane(
      makeInput([{ id: 'i1', startDate: '2026-04-27', dueDate: '2026-04-30' }], {
        i1: [{ actorType: 'user', actorId: 'a:b:c' }],
      }),
    )
    expect(rows[0]!.assigneeRef).toEqual({ actorType: 'user', actorId: 'a:b:c' })
  })
})

describe('summarizeSprintSwimlanePopulation', () => {
  it('rows 空 → 全 0', () => {
    const pop = summarizeSprintSwimlanePopulation([])
    expect(pop).toEqual({
      laneCount: 0,
      unassignedLaneCount: 0,
      totalItemCount: 0,
      uniqueItemCount: 0,
      estimateMinutesTotal: 0,
      conflictedLaneCount: 0,
      conflictPairTotal: 0,
    })
  })

  it('1 lane 1 item (見積 480) → unique=1 / total=1 / 480 分', () => {
    const rows = computeSprintSwimlane(
      makeInput(
        [{ id: 'i1', startDate: '2026-04-27', dueDate: '2026-04-30' }],
        { i1: [{ actorType: 'user', actorId: 'u1' }] },
        { i1: 480 },
      ),
    )
    const pop = summarizeSprintSwimlanePopulation(rows)
    expect(pop.laneCount).toBe(1)
    expect(pop.unassignedLaneCount).toBe(0)
    expect(pop.totalItemCount).toBe(1)
    expect(pop.uniqueItemCount).toBe(1)
    expect(pop.estimateMinutesTotal).toBe(480)
    expect(pop.conflictedLaneCount).toBe(0)
    expect(pop.conflictPairTotal).toBe(0)
  })

  it('1 item 2 assignee → totalItemCount=2 / uniqueItemCount=1 (重複除外)', () => {
    const rows = computeSprintSwimlane(
      makeInput([{ id: 'shared', startDate: '2026-04-27', dueDate: '2026-04-30' }], {
        shared: [
          { actorType: 'user', actorId: 'u1' },
          { actorType: 'user', actorId: 'u2' },
        ],
      }),
    )
    const pop = summarizeSprintSwimlanePopulation(rows)
    expect(pop.laneCount).toBe(2)
    expect(pop.totalItemCount).toBe(2)
    expect(pop.uniqueItemCount).toBe(1)
  })

  it('未割当 lane あり → unassignedLaneCount に算入', () => {
    const rows = computeSprintSwimlane(
      makeInput(
        [
          { id: 'a', startDate: '2026-04-27', dueDate: '2026-04-29' },
          { id: 'unassigned', startDate: '2026-04-27', dueDate: '2026-04-29' },
        ],
        {
          a: [{ actorType: 'user', actorId: 'u1' }],
          unassigned: [],
        },
      ),
    )
    const pop = summarizeSprintSwimlanePopulation(rows)
    expect(pop.laneCount).toBe(2)
    expect(pop.unassignedLaneCount).toBe(1)
  })

  it('lane 内 重複あり → conflictedLaneCount + conflictPairTotal 算入', () => {
    const rows = computeSprintSwimlane(
      makeInput(
        [
          { id: 'a', startDate: '2026-04-27', dueDate: '2026-05-02' },
          { id: 'b', startDate: '2026-04-30', dueDate: '2026-05-05' },
        ],
        {
          a: [{ actorType: 'user', actorId: 'u1' }],
          b: [{ actorType: 'user', actorId: 'u1' }],
        },
      ),
    )
    const pop = summarizeSprintSwimlanePopulation(rows)
    expect(pop.conflictedLaneCount).toBe(1)
    expect(pop.conflictPairTotal).toBe(1)
  })
})

describe('formatSprintSwimlanePopulationJa', () => {
  it('空 sprint → "0 lane / 0 件"', () => {
    expect(
      formatSprintSwimlanePopulationJa({
        laneCount: 0,
        unassignedLaneCount: 0,
        totalItemCount: 0,
        uniqueItemCount: 0,
        estimateMinutesTotal: 0,
        conflictedLaneCount: 0,
        conflictPairTotal: 0,
      }),
    ).toBe('0 lane / 0 件')
  })

  it('通常 sprint → "3 lane / 12 件 / 80時間" (iter810 ja-throughout)', () => {
    expect(
      formatSprintSwimlanePopulationJa({
        laneCount: 3,
        unassignedLaneCount: 0,
        totalItemCount: 12,
        uniqueItemCount: 12,
        estimateMinutesTotal: 4800,
        conflictedLaneCount: 0,
        conflictPairTotal: 0,
      }),
    ).toBe('3 lane / 12 件 / 80時間')
  })

  it('延べ count が unique と異なる場合は両方表記 (iter810 ja-throughout)', () => {
    expect(
      formatSprintSwimlanePopulationJa({
        laneCount: 3,
        unassignedLaneCount: 0,
        totalItemCount: 14,
        uniqueItemCount: 12,
        estimateMinutesTotal: 4800,
        conflictedLaneCount: 0,
        conflictPairTotal: 0,
      }),
    ).toBe('3 lane / 12 件 (延べ 14) / 80時間')
  })

  it('重複あり → "重複 N lane (M ペア)" 末尾追加 (iter810 ja-throughout)', () => {
    expect(
      formatSprintSwimlanePopulationJa({
        laneCount: 3,
        unassignedLaneCount: 0,
        totalItemCount: 12,
        uniqueItemCount: 12,
        estimateMinutesTotal: 4800,
        conflictedLaneCount: 2,
        conflictPairTotal: 3,
      }),
    ).toBe('3 lane / 12 件 / 80時間 / 重複 2 lane (3 ペア)')
  })

  it('見積 0 → "見積なし"', () => {
    expect(
      formatSprintSwimlanePopulationJa({
        laneCount: 3,
        unassignedLaneCount: 0,
        totalItemCount: 12,
        uniqueItemCount: 12,
        estimateMinutesTotal: 0,
        conflictedLaneCount: 0,
        conflictPairTotal: 0,
      }),
    ).toBe('3 lane / 12 件 / 見積なし')
  })

  it('未割当 lane あり → "・未割当 N lane" 末尾追加', () => {
    expect(
      formatSprintSwimlanePopulationJa({
        laneCount: 3,
        unassignedLaneCount: 1,
        totalItemCount: 12,
        uniqueItemCount: 12,
        estimateMinutesTotal: 4800,
        conflictedLaneCount: 0,
        conflictPairTotal: 0,
      }),
    ).toBe('3 lane / 12 件 / 80時間・未割当 1 lane')
  })

  it('全部入り (重複 + 未割当 + 延べ != unique)', () => {
    expect(
      formatSprintSwimlanePopulationJa({
        laneCount: 4,
        unassignedLaneCount: 1,
        totalItemCount: 14,
        uniqueItemCount: 12,
        estimateMinutesTotal: 4830, // 80h 30min
        conflictedLaneCount: 2,
        conflictPairTotal: 3,
      }),
    ).toBe('4 lane / 12 件 (延べ 14) / 80時間30分 / 重複 2 lane (3 ペア)・未割当 1 lane')
  })

  it('estimateMinutesTotal < 60 → "N分" 表記 (iter810 ja-throughout)', () => {
    expect(
      formatSprintSwimlanePopulationJa({
        laneCount: 1,
        unassignedLaneCount: 0,
        totalItemCount: 1,
        uniqueItemCount: 1,
        estimateMinutesTotal: 45,
        conflictedLaneCount: 0,
        conflictPairTotal: 0,
      }),
    ).toBe('1 lane / 1 件 / 45分')
  })
})
