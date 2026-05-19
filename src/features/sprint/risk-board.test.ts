import { describe, expect, it } from 'vitest'

import {
  assigneeLoadSeverity,
  buildSprintRiskBoard,
  computeRiskScore,
  countAssigneesBySeverity,
  dayDiffISO,
  extractHeavyAssignees,
  formatAssigneeLoadJa,
  formatAssigneeLoadSeverityCountsJa,
  formatRiskBoardCountsJa,
  formatSprintRiskBoardAlertJa,
  formatSprintRiskBoardJa,
  pickMostLoadedAssignee,
  pickRiskiestItem,
  type RiskBoardItemFields,
  summarizeRiskBoardCounts,
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

describe('assigneeLoadSeverity', () => {
  it('score 100+ → overloaded', () => {
    expect(assigneeLoadSeverity({ itemCount: 3, mustCount: 2, totalScore: 100 })).toBe('overloaded')
    expect(assigneeLoadSeverity({ itemCount: 5, mustCount: 0, totalScore: 250 })).toBe('overloaded')
  })

  it('score 50-99 → busy', () => {
    expect(assigneeLoadSeverity({ itemCount: 2, mustCount: 0, totalScore: 50 })).toBe('busy')
    expect(assigneeLoadSeverity({ itemCount: 4, mustCount: 1, totalScore: 99 })).toBe('busy')
  })

  it('score 20-49 → normal', () => {
    expect(assigneeLoadSeverity({ itemCount: 1, mustCount: 0, totalScore: 20 })).toBe('normal')
    expect(assigneeLoadSeverity({ itemCount: 2, mustCount: 0, totalScore: 49 })).toBe('normal')
  })

  it('score 0-19 → light', () => {
    expect(assigneeLoadSeverity({ itemCount: 1, mustCount: 0, totalScore: 0 })).toBe('light')
    expect(assigneeLoadSeverity({ itemCount: 2, mustCount: 0, totalScore: 19 })).toBe('light')
  })

  it('itemCount=0 は totalScore 関係なく light', () => {
    expect(assigneeLoadSeverity({ itemCount: 0, mustCount: 0, totalScore: 0 })).toBe('light')
  })
})

describe('formatAssigneeLoadJa', () => {
  it('item 0 件 → "余裕 (item 0 件)"', () => {
    expect(formatAssigneeLoadJa({ itemCount: 0, mustCount: 0, totalScore: 0 })).toBe(
      '余裕 (item 0 件)',
    )
  })

  it('overloaded で MUST 込み', () => {
    expect(formatAssigneeLoadJa({ itemCount: 5, mustCount: 2, totalScore: 120 })).toBe(
      '高負荷 (item 5 件 / MUST 2 件 / 累積 score 120)',
    )
  })

  it('normal label', () => {
    expect(formatAssigneeLoadJa({ itemCount: 2, mustCount: 0, totalScore: 30 })).toBe(
      '通常 (item 2 件 / MUST 0 件 / 累積 score 30)',
    )
  })
})

describe('formatSprintRiskBoardJa', () => {
  it('全 score 0 → "安全 (リスク item なし)"', () => {
    const summary = buildSprintRiskBoard([mk({ id: 'a' })], { today: TODAY })
    expect(formatSprintRiskBoardJa(summary)).toBe('安全 (リスク item なし)')
  })

  it('top 2 reason + score を 1 行', () => {
    const items = [
      mk({ id: 'a', dueDate: '2026-04-20' }), // overdue 10
      mk({ id: 'b', dueDate: TODAY }), // today
      mk({ id: 'c' }), // 0
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const out = formatSprintRiskBoardJa(summary)
    expect(out).toMatch(/^リスクあり 2 件 \(top: /)
    expect(out).toContain('期限超過 10 日')
    expect(out).toContain('今日が期限')
  })
})

describe('extractHeavyAssignees', () => {
  it('default threshold "busy" → overloaded + busy のみ抽出', () => {
    // u1: overloaded (totalScore 120), u2: busy (50), u3: normal (25), u4: light (5)
    const items: RiskBoardItemFields[] = [
      // u1 = 高負荷: overdue + must + blocked (priority 1) で 1 item で 100 超え
      mk({
        id: 'a',
        assigneeIds: ['u1'],
        dueDate: '2026-04-20',
        isMust: true,
        priority: 1,
        status: 'blocked',
        blockingCount: 2,
      }),
      // u2 = busy: today (25) + must (15) + must (15) で 50 超え
      mk({ id: 'b', assigneeIds: ['u2'], dueDate: TODAY, isMust: true }),
      mk({ id: 'c', assigneeIds: ['u2'], isMust: true }),
      mk({ id: 'd', assigneeIds: ['u2'], isMust: true }),
      // u3 = normal: today=25 のみ
      mk({ id: 'e', assigneeIds: ['u3'], dueDate: TODAY }),
      // u4 = light: priority 3 (4 score)
      mk({ id: 'f', assigneeIds: ['u4'], priority: 3 }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(extractHeavyAssignees(summary)).toEqual(['u1', 'u2'])
  })

  it('threshold "overloaded" → overloaded のみ抽出', () => {
    // u1: 30(overdue) + 15(must) + 12(p1) + 25(blocked) + 25(blocking 5) = 107 → overloaded
    // u2: 25(today) + 15(must) + 15(must) + 15(must) = 70 → busy (overloaded には届かない)
    const items: RiskBoardItemFields[] = [
      mk({
        id: 'a',
        assigneeIds: ['u1'],
        dueDate: '2026-04-20',
        isMust: true,
        priority: 1,
        status: 'blocked',
        blockingCount: 5,
      }),
      mk({ id: 'b', assigneeIds: ['u2'], dueDate: TODAY, isMust: true }),
      mk({ id: 'c', assigneeIds: ['u2'], isMust: true }),
      mk({ id: 'd', assigneeIds: ['u2'], isMust: true }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(extractHeavyAssignees(summary, 'overloaded')).toEqual(['u1'])
  })

  it('threshold "normal" → light 以外を抽出', () => {
    const items: RiskBoardItemFields[] = [
      mk({ id: 'a', assigneeIds: ['u1'], dueDate: TODAY }), // 25 → normal
      mk({ id: 'b', assigneeIds: ['u2'], priority: 3 }), // 4 → light
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(extractHeavyAssignees(summary, 'normal')).toEqual(['u1'])
  })

  it('threshold "light" → 全担当抽出 (light も含む)', () => {
    const items: RiskBoardItemFields[] = [
      mk({ id: 'a', assigneeIds: ['u1'], dueDate: TODAY }),
      mk({ id: 'b', assigneeIds: ['u2'], priority: 3 }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(extractHeavyAssignees(summary, 'light').sort()).toEqual(['u1', 'u2'])
  })

  it('totalScore 降順 + tie は id 昇順 で deterministic', () => {
    // u1, u2, u3 を全員 busy (50) tie にして id 順を確認
    const items: RiskBoardItemFields[] = [
      mk({ id: 'i3', assigneeIds: ['u3'], dueDate: TODAY, isMust: true }),
      mk({ id: 'i3b', assigneeIds: ['u3'], isMust: true }),
      mk({ id: 'i3c', assigneeIds: ['u3'], isMust: true }),
      mk({ id: 'i1', assigneeIds: ['u1'], dueDate: TODAY, isMust: true }),
      mk({ id: 'i1b', assigneeIds: ['u1'], isMust: true }),
      mk({ id: 'i1c', assigneeIds: ['u1'], isMust: true }),
      mk({ id: 'i2', assigneeIds: ['u2'], dueDate: TODAY, isMust: true }),
      mk({ id: 'i2b', assigneeIds: ['u2'], isMust: true }),
      mk({ id: 'i2c', assigneeIds: ['u2'], isMust: true }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    // 全員 totalScore 55 で tie → id 昇順
    expect(extractHeavyAssignees(summary)).toEqual(['u1', 'u2', 'u3'])
  })

  it('空 assigneeLoad → []', () => {
    const summary = buildSprintRiskBoard([mk({ id: 'a', assigneeIds: [] })], { today: TODAY })
    expect(extractHeavyAssignees(summary)).toEqual([])
  })

  it('該当無し (全員 light) → []', () => {
    const items: RiskBoardItemFields[] = [
      mk({ id: 'a', assigneeIds: ['u1'], priority: 3 }), // 4
      mk({ id: 'b', assigneeIds: ['u2'], priority: 4 }), // 0
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(extractHeavyAssignees(summary)).toEqual([])
  })

  it('降順: totalScore 高い側が先', () => {
    // u1 = overloaded (高 score), u2 = busy (低 score)
    const items: RiskBoardItemFields[] = [
      mk({
        id: 'a',
        assigneeIds: ['u1'],
        dueDate: '2026-04-20',
        isMust: true,
        priority: 1,
        status: 'blocked',
        blockingCount: 5,
      }),
      mk({ id: 'b', assigneeIds: ['u2'], dueDate: TODAY, isMust: true }),
      mk({ id: 'c', assigneeIds: ['u2'], isMust: true }),
      mk({ id: 'd', assigneeIds: ['u2'], isMust: true }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(extractHeavyAssignees(summary)).toEqual(['u1', 'u2'])
  })
})

describe('countAssigneesBySeverity (iter952)', () => {
  it('担当無し → 全 0', () => {
    const items: RiskBoardItemFields[] = []
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(countAssigneesBySeverity(summary)).toEqual({
      overloaded: 0,
      busy: 0,
      normal: 0,
      light: 0,
    })
  })

  it('4 severity が各 1 人ずつ → 4 軸 1 ずつ', () => {
    // 各 user に score 別の item を割り当て
    const items: RiskBoardItemFields[] = [
      // u1 overloaded: overdue 30 + must 15 + blocked 25 + priority 1 = 12 + blocking 5 = 87 + dueDate 過去多日... 1 個で OK
      mk({
        id: 'a',
        assigneeIds: ['u1'],
        dueDate: '2026-04-20',
        isMust: true,
        priority: 1,
        status: 'blocked',
        blockingCount: 10,
      }),
      // u2 busy: today+must = 25+15 = 40, +2 個で 80
      mk({ id: 'b1', assigneeIds: ['u2'], dueDate: TODAY, isMust: true }),
      mk({ id: 'b2', assigneeIds: ['u2'], dueDate: TODAY, isMust: true }),
      // u3 normal: today only = 25
      mk({ id: 'c', assigneeIds: ['u3'], dueDate: TODAY }),
      // u4 light: priority 4 のみ = 0、すなわち itemCount > 0 だが score 0 → light
      mk({ id: 'd', assigneeIds: ['u4'] }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(countAssigneesBySeverity(summary)).toEqual({
      overloaded: 1,
      busy: 1,
      normal: 1,
      light: 1,
    })
  })

  it('全員 light (= score 0) → light のみカウント', () => {
    const items: RiskBoardItemFields[] = [
      mk({ id: 'a', assigneeIds: ['u1'] }),
      mk({ id: 'b', assigneeIds: ['u2'] }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(countAssigneesBySeverity(summary)).toEqual({
      overloaded: 0,
      busy: 0,
      normal: 0,
      light: 2,
    })
  })

  it('1 item 複数 assignee は両方の load に二重カウント (= 共同担当)', () => {
    // u1, u2 共同で 1 item 担当 → 各々が itemCount=1
    const items: RiskBoardItemFields[] = [mk({ id: 'a', assigneeIds: ['u1', 'u2'] })]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(countAssigneesBySeverity(summary)).toEqual({
      overloaded: 0,
      busy: 0,
      normal: 0,
      light: 2,
    })
  })
})

describe('formatAssigneeLoadSeverityCountsJa (iter952)', () => {
  it('全 0 → 「担当なし」', () => {
    expect(
      formatAssigneeLoadSeverityCountsJa({ overloaded: 0, busy: 0, normal: 0, light: 0 }),
    ).toBe('担当なし')
  })

  it('4 軸 全 1 → 「高負荷 1人 / 繁忙 1人 / 通常 1人 / 余裕 1人」', () => {
    expect(
      formatAssigneeLoadSeverityCountsJa({ overloaded: 1, busy: 1, normal: 1, light: 1 }),
    ).toBe('高負荷 1人 / 繁忙 1人 / 通常 1人 / 余裕 1人')
  })

  it('一部 0 → その軸は省略 (視覚 noise 削減)', () => {
    expect(
      formatAssigneeLoadSeverityCountsJa({ overloaded: 2, busy: 1, normal: 3, light: 0 }),
    ).toBe('高負荷 2人 / 繁忙 1人 / 通常 3人')
  })

  it('全員 light → 「余裕 N人」', () => {
    expect(
      formatAssigneeLoadSeverityCountsJa({ overloaded: 0, busy: 0, normal: 0, light: 5 }),
    ).toBe('余裕 5人')
  })
})

describe('pickMostLoadedAssignee (iter958)', () => {
  it('担当無し → null', () => {
    const summary = buildSprintRiskBoard([], { today: TODAY })
    expect(pickMostLoadedAssignee(summary)).toBeNull()
  })

  it('単一 assignee → その人を返す', () => {
    const items: RiskBoardItemFields[] = [mk({ id: 'a', assigneeIds: ['u1'], dueDate: TODAY })]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const top = pickMostLoadedAssignee(summary)
    expect(top).not.toBeNull()
    expect(top!.id).toBe('u1')
    expect(top!.severity).toBe('normal') // today due 25 score → normal
  })

  it('totalScore 高い側を返す (u1 overloaded vs u2 light)', () => {
    const items: RiskBoardItemFields[] = [
      mk({
        id: 'a',
        assigneeIds: ['u1'],
        dueDate: '2026-04-20',
        isMust: true,
        priority: 1,
        status: 'blocked',
        blockingCount: 5,
      }),
      mk({ id: 'b', assigneeIds: ['u2'] }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const top = pickMostLoadedAssignee(summary)
    expect(top!.id).toBe('u1')
    expect(top!.severity).toBe('overloaded')
  })

  it('tie-break: 同 totalScore は id 昇順 (deterministic)', () => {
    // u2 と u3 が同 totalScore (= 各 today due item を 1 個ずつ)、id 昇順で u2 が勝つ
    const items: RiskBoardItemFields[] = [
      mk({ id: 'a', assigneeIds: ['u3'], dueDate: TODAY }),
      mk({ id: 'b', assigneeIds: ['u2'], dueDate: TODAY }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const top = pickMostLoadedAssignee(summary)
    expect(top!.id).toBe('u2')
  })

  it('全員 light (= score 0) でも先頭 1 人を返す (= severity 別判定は caller 責務)', () => {
    const items: RiskBoardItemFields[] = [
      mk({ id: 'a', assigneeIds: ['u2'] }),
      mk({ id: 'b', assigneeIds: ['u1'] }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const top = pickMostLoadedAssignee(summary)
    // 同 score 0 のため tie-break で u1 (id 昇順)
    expect(top!.id).toBe('u1')
    expect(top!.severity).toBe('light')
  })
})

describe('pickRiskiestItem (iter959)', () => {
  it('空 items → null', () => {
    const summary = buildSprintRiskBoard([], { today: TODAY })
    expect(pickRiskiestItem(summary)).toBeNull()
  })

  it('全 score 0 (= 安全 sprint) → null (= alert 非表示判断)', () => {
    const items: RiskBoardItemFields[] = [mk({ id: 'a' }), mk({ id: 'b' })]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(pickRiskiestItem(summary)).toBeNull()
  })

  it('複数 item で最高 score を返す (= summary.topRisk[0])', () => {
    const items: RiskBoardItemFields[] = [
      mk({ id: 'low', dueDate: TODAY }), // score 25 (today due)
      mk({
        id: 'high',
        dueDate: '2026-04-20', // overdue 10d → score 30
        isMust: true, // +15
        priority: 1, // +12
        status: 'blocked', // +25
      }),
      mk({ id: 'safe', dueDate: '2026-05-30' }), // > 7d future → score 0
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const top = pickRiskiestItem(summary)
    expect(top).not.toBeNull()
    expect(top!.item.id).toBe('high')
    expect(top!.riskScore).toBeGreaterThan(50)
  })

  it('返却は summary.topRisk[0] と同一 reference', () => {
    const items: RiskBoardItemFields[] = [mk({ id: 'a', dueDate: TODAY })]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(pickRiskiestItem(summary)).toBe(summary.topRisk[0])
  })
})

describe('formatSprintRiskBoardAlertJa (iter962)', () => {
  it('空 sprint → 「安全 sprint」 sentinel', () => {
    const summary = buildSprintRiskBoard([], { today: TODAY })
    expect(formatSprintRiskBoardAlertJa(summary)).toBe('安全 sprint (リスク item / 担当負荷なし)')
  })

  it('全 score 0 + 全員 light → 「安全 sprint」 sentinel', () => {
    const items: RiskBoardItemFields[] = [mk({ id: 'a', assigneeIds: ['u1'] })]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    expect(formatSprintRiskBoardAlertJa(summary)).toBe('安全 sprint (リスク item / 担当負荷なし)')
  })

  it('リスク item + 高負荷担当の両方 → 「最重 item: ... / 最重担当: ...」', () => {
    const items: RiskBoardItemFields[] = [
      mk({
        id: 'a',
        assigneeIds: ['u1'],
        dueDate: '2026-04-20',
        isMust: true,
        priority: 1,
        status: 'blocked',
        blockingCount: 5,
      }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const line = formatSprintRiskBoardAlertJa(summary)
    expect(line).toContain('最重 item:')
    expect(line).toContain('score')
    expect(line).toContain('最重担当:')
    expect(line).toContain(' / ')
  })

  it('リスク item のみ (担当無し) → 「最重 item: ...」 only', () => {
    const items: RiskBoardItemFields[] = [
      mk({ id: 'a', dueDate: '2026-04-20', isMust: true, priority: 1 }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const line = formatSprintRiskBoardAlertJa(summary)
    expect(line).toContain('最重 item:')
    expect(line).not.toContain('最重担当:')
    expect(line).not.toContain(' / ')
  })

  it('assigneeNames 渡し → user id ではなく表示名で出力', () => {
    const items: RiskBoardItemFields[] = [
      mk({
        id: 'a',
        assigneeIds: ['u1'],
        dueDate: '2026-04-20',
        isMust: true,
        priority: 1,
        status: 'blocked',
      }),
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const line = formatSprintRiskBoardAlertJa(summary, { u1: 'Alice' })
    expect(line).toContain('最重担当: Alice')
  })

  it('iter967: light severity 担当のみ (= 最重担当が low load) → 「最重担当」 出力に含めない (= alert 必要なし)', () => {
    // risk item は high score、担当は priority 4 1 件 → light
    const items: RiskBoardItemFields[] = [
      mk({
        id: 'a',
        dueDate: '2026-04-20',
        isMust: true,
        priority: 1,
        status: 'blocked',
      }), // 担当無し risk item
      mk({ id: 'b', assigneeIds: ['u_light'] }), // light な担当 (score 0)
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const line = formatSprintRiskBoardAlertJa(summary)
    expect(line).toContain('最重 item:')
    expect(line).not.toContain('最重担当:') // light は除外
  })
})

describe('summarizeRiskBoardCounts (iter1006)', () => {
  it('空 sprint → total=0 / risky=0 / safe=0 / totalRiskScore=0', () => {
    const summary = buildSprintRiskBoard([], { today: TODAY })
    const counts = summarizeRiskBoardCounts(summary)
    expect(counts).toEqual({ total: 0, risky: 0, safe: 0, totalRiskScore: 0 })
  })

  it('全 safe (score 0) → risky=0 / safe=N', () => {
    const items = [mk({ id: 'a' }), mk({ id: 'b' })]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const counts = summarizeRiskBoardCounts(summary)
    expect(counts.total).toBe(2)
    expect(counts.risky).toBe(0)
    expect(counts.safe).toBe(2)
    expect(counts.totalRiskScore).toBe(0)
  })

  it('mix: risky 2 件 / safe 1 件 + totalRiskScore 累計', () => {
    const items = [
      mk({ id: 'a' }), // 0
      mk({ id: 'b', isMust: true }), // 15
      mk({ id: 'c', status: 'blocked' }), // 25
    ]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const counts = summarizeRiskBoardCounts(summary)
    expect(counts.total).toBe(3)
    expect(counts.risky).toBe(2)
    expect(counts.safe).toBe(1)
    expect(counts.totalRiskScore).toBe(40)
  })

  it('safe = total - risky の invariant', () => {
    const items = [mk({ id: 'a' }), mk({ id: 'b', isMust: true }), mk({ id: 'c', dueDate: TODAY })]
    const summary = buildSprintRiskBoard(items, { today: TODAY })
    const counts = summarizeRiskBoardCounts(summary)
    expect(counts.safe).toBe(counts.total - counts.risky)
  })
})

describe('formatRiskBoardCountsJa (iter1006)', () => {
  it('total=0 → 「対象なし」', () => {
    expect(formatRiskBoardCountsJa({ total: 0, risky: 0, safe: 0, totalRiskScore: 0 })).toBe(
      '対象なし',
    )
  })

  it('risky=0 (total > 0) → 「安全 (リスク item なし)」', () => {
    expect(formatRiskBoardCountsJa({ total: 5, risky: 0, safe: 5, totalRiskScore: 0 })).toBe(
      '安全 (リスク item なし)',
    )
  })

  it('risky > 0 → 「リスク risky/total 件 (合計 score N)」', () => {
    expect(formatRiskBoardCountsJa({ total: 12, risky: 3, safe: 9, totalRiskScore: 75 })).toBe(
      'リスク 3/12 件 (合計 score 75)',
    )
  })
})
