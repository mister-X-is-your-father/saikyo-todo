import { describe, expect, it } from 'vitest'

import {
  buildSprintRiskBoard,
  computeRiskScore,
  dayDiffISO,
  type RiskBoardItemFields,
} from './risk-board'

const TODAY = '2026-04-30'

function mk(over: Partial<RiskBoardItemFields> & { id: string }): RiskBoardItemFields {
  return {
    title: `item ${over.id}`,
    status: 'todo',
    dueDate: null,
    priority: 4,
    isMust: false,
    blockingCount: 0,
    assigneeIds: [],
    ...over,
  }
}

describe('dayDiffISO', () => {
  it('同日 0 / +1 / -1 / 月またぎ', () => {
    expect(dayDiffISO('2026-04-30', '2026-04-30')).toBe(0)
    expect(dayDiffISO('2026-04-30', '2026-05-01')).toBe(1)
    expect(dayDiffISO('2026-04-30', '2026-04-29')).toBe(-1)
    expect(dayDiffISO('2026-04-30', '2026-05-07')).toBe(7)
  })
  it('不正値は NaN', () => {
    expect(Number.isNaN(dayDiffISO('invalid', '2026-04-30'))).toBe(true)
  })
})

describe('computeRiskScore', () => {
  it('全要素 0 → score=0, reasons=[]', () => {
    const r = computeRiskScore(mk({ id: 'a' }), TODAY)
    expect(r.score).toBe(0)
    expect(r.reasons).toEqual([])
  })

  it('overdue 5 日 → score 30 + reason 「期限超過 5 日」', () => {
    const r = computeRiskScore(mk({ id: 'a', dueDate: '2026-04-25' }), TODAY)
    expect(r.score).toBe(30)
    expect(r.reasons).toContain('期限超過 5 日')
  })

  it('dueDate=today → score 25', () => {
    const r = computeRiskScore(mk({ id: 'a', dueDate: TODAY }), TODAY)
    expect(r.score).toBe(25)
    expect(r.reasons).toContain('今日が期限')
  })

  it('dueDate +3d → 18, +7d → 8', () => {
    expect(computeRiskScore(mk({ id: 'a', dueDate: '2026-05-03' }), TODAY).score).toBe(18)
    expect(computeRiskScore(mk({ id: 'a', dueDate: '2026-05-07' }), TODAY).score).toBe(8)
  })

  it('dueDate +30d → 0', () => {
    expect(computeRiskScore(mk({ id: 'a', dueDate: '2026-05-30' }), TODAY).score).toBe(0)
  })

  it('isMust + blocked + priority=1 + blocking=2 を合算', () => {
    const r = computeRiskScore(
      mk({
        id: 'a',
        status: 'blocked',
        isMust: true,
        priority: 1,
        blockingCount: 2,
      }),
      TODAY,
    )
    // 0 + 15 (must) + 25 (blocked) + 12 (priority 1 = (4-1)*4) + 10 (blocking 2*5) = 62
    expect(r.score).toBe(62)
    expect(r.reasons).toEqual(
      expect.arrayContaining(['MUST', 'blocked 状態', 'priority 1', '2 件を blocking']),
    )
  })

  it('priority=4 (default) は priority boost 0、reason に出ない', () => {
    const r = computeRiskScore(mk({ id: 'a', priority: 4 }), TODAY)
    expect(r.score).toBe(0)
    expect(r.reasons).not.toContain('priority 4')
  })

  it('priority=null は priority=4 として扱う', () => {
    const r = computeRiskScore(mk({ id: 'a', priority: null }), TODAY)
    expect(r.score).toBe(0)
  })

  it('today 未指定 → dueProximity 計算 skip', () => {
    const r = computeRiskScore(mk({ id: 'a', dueDate: '2026-04-25' }), undefined)
    expect(r.score).toBe(0)
  })

  it('blockingCount<0 は 0 扱い、null は 0 扱い', () => {
    expect(computeRiskScore(mk({ id: 'a', blockingCount: -3 }), TODAY).score).toBe(0)
    expect(computeRiskScore(mk({ id: 'a', blockingCount: null }), TODAY).score).toBe(0)
  })
})

describe('buildSprintRiskBoard', () => {
  it('空 items → all=[], topRisk=[], assigneeLoad empty', () => {
    const r = buildSprintRiskBoard([], { today: TODAY })
    expect(r.all).toEqual([])
    expect(r.topRisk).toEqual([])
    expect(r.assigneeLoad.size).toBe(0)
  })

  it('all は score 降順 sort', () => {
    const items = [
      mk({ id: 'a', priority: 3 }), // score 4
      mk({ id: 'b', isMust: true }), // score 15
      mk({ id: 'c', dueDate: TODAY }), // score 25
      mk({ id: 'd', status: 'blocked' }), // score 25
    ]
    const r = buildSprintRiskBoard(items, { today: TODAY })
    expect(r.all.map((e) => e.item.id)).toEqual(['c', 'd', 'b', 'a'])
    // tie (c=d=25): dueDate 早い順 → c (TODAY) が d (null='￿') より早い
  })

  it('topRisk は default top5、topN option で変更可', () => {
    const items: RiskBoardItemFields[] = []
    for (let i = 0; i < 10; i++) {
      items.push(mk({ id: `i${i}`, priority: 1, blockingCount: i }))
    }
    const r = buildSprintRiskBoard(items, { today: TODAY })
    expect(r.topRisk).toHaveLength(5)
    const r2 = buildSprintRiskBoard(items, { today: TODAY, topN: 3 })
    expect(r2.topRisk).toHaveLength(3)
  })

  it('assigneeLoad: 担当 1 人に複数 item の itemCount/mustCount/totalScore を合算', () => {
    const items = [
      mk({ id: 'a', assigneeIds: ['u1'], isMust: true }), // score 15
      mk({ id: 'b', assigneeIds: ['u1'], priority: 1 }), // score 12
      mk({ id: 'c', assigneeIds: ['u2'], dueDate: TODAY }), // score 25
    ]
    const r = buildSprintRiskBoard(items, { today: TODAY })
    const u1 = r.assigneeLoad.get('u1')
    expect(u1).toEqual({ itemCount: 2, mustCount: 1, totalScore: 27 })
    const u2 = r.assigneeLoad.get('u2')
    expect(u2).toEqual({ itemCount: 1, mustCount: 0, totalScore: 25 })
  })

  it('複数 assignee の item は両方の load に二重カウント (= 共同担当)', () => {
    const items = [mk({ id: 'a', assigneeIds: ['u1', 'u2'], isMust: true })]
    const r = buildSprintRiskBoard(items, { today: TODAY })
    expect(r.assigneeLoad.get('u1')?.itemCount).toBe(1)
    expect(r.assigneeLoad.get('u2')?.itemCount).toBe(1)
    expect(r.assigneeLoad.get('u1')?.mustCount).toBe(1)
    expect(r.assigneeLoad.get('u2')?.mustCount).toBe(1)
  })

  it('未割当 item は assigneeLoad に出ない', () => {
    const items = [mk({ id: 'a', assigneeIds: [] }), mk({ id: 'b' })]
    const r = buildSprintRiskBoard(items, { today: TODAY })
    expect(r.assigneeLoad.size).toBe(0)
  })

  it('reasons は score 主因を含む (overdue + must + blocking 例)', () => {
    const it = mk({
      id: 'a',
      dueDate: '2026-04-25',
      isMust: true,
      blockingCount: 3,
    })
    const r = buildSprintRiskBoard([it], { today: TODAY })
    expect(r.all[0]?.reasons).toEqual(
      expect.arrayContaining(['期限超過 5 日', 'MUST', '3 件を blocking']),
    )
  })

  it('tie-break: 同 score 同 dueDate は id 昇順', () => {
    const items = [mk({ id: 'b', dueDate: TODAY }), mk({ id: 'a', dueDate: TODAY })]
    const r = buildSprintRiskBoard(items, { today: TODAY })
    expect(r.all.map((e) => e.item.id)).toEqual(['a', 'b'])
  })
})
