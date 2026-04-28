/**
 * iter294 ai-automation: must-risk pure helper の単体テスト。
 * MUST 絶対落とさない設計の核なので heuristic 違反 (isMust 無視 / done/archive 漏れ)
 * は必ず failure path として固定する。
 */
import { describe, expect, it } from 'vitest'

import { formatAtRiskMustSummary, type MustRiskFields, selectAtRiskMust } from './must-risk'

const TODAY = new Date(2026, 3, 28) // 2026-04-28

function mk(overrides: Partial<MustRiskFields> & { id?: string; title?: string }): MustRiskFields {
  return {
    id: overrides.id ?? 'i',
    title: overrides.title ?? 'untitled',
    priority: overrides.priority ?? 4,
    dueDate: overrides.dueDate ?? null,
    isMust: overrides.isMust ?? false,
    doneAt: overrides.doneAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
  }
}

describe('selectAtRiskMust', () => {
  it('isMust=false は除外', () => {
    const items = [mk({ isMust: false, dueDate: '2026-04-28' })]
    expect(selectAtRiskMust(items, {}, TODAY)).toEqual([])
  })

  it('done/archive 済 MUST は除外', () => {
    const items = [
      mk({ id: 'a', isMust: true, dueDate: '2026-04-25', doneAt: new Date() }),
      mk({ id: 'b', isMust: true, dueDate: '2026-04-25', archivedAt: new Date() }),
    ]
    expect(selectAtRiskMust(items, {}, TODAY)).toEqual([])
  })

  it('dueDate 無 MUST は除外 (本関数の責務外)', () => {
    const items = [mk({ isMust: true, dueDate: null })]
    expect(selectAtRiskMust(items, {}, TODAY)).toEqual([])
  })

  it('期限切れ / 今日 / 明日 / 今週内 の MUST を全部拾う', () => {
    const items = [
      mk({ id: 'overdue', isMust: true, dueDate: '2026-04-25' }),
      mk({ id: 'today', isMust: true, dueDate: '2026-04-28' }),
      mk({ id: 'tomorrow', isMust: true, dueDate: '2026-04-29' }),
      mk({ id: 'thisWeek', isMust: true, dueDate: '2026-05-03' }), // +5
      mk({ id: 'later', isMust: true, dueDate: '2026-05-10' }), // +12
    ]
    const res = selectAtRiskMust(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['overdue', 'today', 'tomorrow', 'thisWeek'])
  })

  it('severity 降順で並ぶ (overdue → today → tomorrow → thisWeek)', () => {
    const items = [
      mk({ id: 'thisWeek', isMust: true, dueDate: '2026-05-03' }),
      mk({ id: 'tomorrow', isMust: true, dueDate: '2026-04-29' }),
      mk({ id: 'today', isMust: true, dueDate: '2026-04-28' }),
      mk({ id: 'overdue', isMust: true, dueDate: '2026-04-20' }),
    ]
    const res = selectAtRiskMust(items, {}, TODAY)
    expect(res.map((e) => e.proximity.kind)).toEqual(['overdue', 'today', 'tomorrow', 'thisWeek'])
  })

  it('同 severity は urgency (priority weight) 降順', () => {
    const items = [
      mk({ id: 'p4', isMust: true, dueDate: '2026-04-28', priority: 4 }),
      mk({ id: 'p1', isMust: true, dueDate: '2026-04-28', priority: 1 }),
      mk({ id: 'p2', isMust: true, dueDate: '2026-04-28', priority: 2 }),
    ]
    const res = selectAtRiskMust(items, {}, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['p1', 'p2', 'p4'])
  })

  it('withinDays=0 で overdue + today のみ (tomorrow / thisWeek 除外)', () => {
    const items = [
      mk({ id: 'overdue', isMust: true, dueDate: '2026-04-20' }),
      mk({ id: 'today', isMust: true, dueDate: '2026-04-28' }),
      mk({ id: 'tomorrow', isMust: true, dueDate: '2026-04-29' }),
    ]
    const res = selectAtRiskMust(items, { withinDays: 0 }, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['overdue', 'today'])
  })

  it('withinDays=2 で overdue / today / tomorrow / +2 まで', () => {
    const items = [
      mk({ id: 'd2', isMust: true, dueDate: '2026-04-30' }), // +2
      mk({ id: 'd5', isMust: true, dueDate: '2026-05-03' }), // +5
    ]
    const res = selectAtRiskMust(items, { withinDays: 2 }, TODAY)
    expect(res.map((e) => e.item.id)).toEqual(['d2'])
  })

  it('analysis bundle に proximity + urgency が乗る', () => {
    const items = [
      mk({ id: 'a', isMust: true, dueDate: '2026-04-20', priority: 1 }), // overdue
    ]
    const [first] = selectAtRiskMust(items, {}, TODAY)
    expect(first?.proximity.kind).toBe('overdue')
    expect(first?.proximity.label).toBe('期限切れ')
    expect(first?.urgency).toBe(100 + 50 + 30) // p1 + overdue + must
  })

  it('today 引数を ISO 文字列でも受け付ける', () => {
    const items = [mk({ id: 'a', isMust: true, dueDate: '2026-04-28' })]
    const res = selectAtRiskMust(items, {}, '2026-04-28')
    expect(res.map((e) => e.item.id)).toEqual(['a'])
  })
})

describe('formatAtRiskMustSummary', () => {
  it('0 件は 該当なし sentinel', () => {
    expect(formatAtRiskMustSummary([])).toBe('MUST at-risk 0 (該当なし)')
  })

  it('1 件 + label/priority 反映', () => {
    const items = [
      mk({ id: 'a', title: 'resume 提出', isMust: true, dueDate: '2026-04-25', priority: 1 }),
    ]
    const entries = selectAtRiskMust(items, {}, TODAY)
    expect(formatAtRiskMustSummary(entries)).toBe('MUST at-risk 1: [期限切れ] resume 提出 (p1)')
  })

  it('複数件は / 区切りで連結', () => {
    const items = [
      mk({ id: 'overdue', title: 'A', isMust: true, dueDate: '2026-04-25', priority: 1 }),
      mk({ id: 'today', title: 'B', isMust: true, dueDate: '2026-04-28', priority: 2 }),
      mk({ id: 'tomorrow', title: 'C', isMust: true, dueDate: '2026-04-29', priority: 3 }),
    ]
    const entries = selectAtRiskMust(items, {}, TODAY)
    expect(formatAtRiskMustSummary(entries)).toBe(
      'MUST at-risk 3: [期限切れ] A (p1) / [今日] B (p2) / [明日] C (p3)',
    )
  })

  it('title 欠落は (無題) で fallback', () => {
    const items: MustRiskFields[] = [
      {
        id: 'a',
        // title 未指定で undefined → format で (無題) に fallback
        priority: 4,
        dueDate: '2026-04-28',
        isMust: true,
        doneAt: null,
        archivedAt: null,
      },
    ]
    const entries = selectAtRiskMust(items, {}, TODAY)
    expect(formatAtRiskMustSummary(entries)).toContain('(無題)')
  })
})
