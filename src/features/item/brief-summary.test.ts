/**
 * iter304 ai-automation: brief-summary combinator の単体検証。
 *
 * 既存 substrate (must-risk / stale-items / velocity / selectTopUrgentItems) は
 * 個別に test 済なので、本 test は **combinator が同 today を 4 substrate に
 * 一貫して渡すか** + **textSummary が 4 行に整形されるか** を中心に押さえる。
 */
import { describe, expect, it } from 'vitest'

import { type BriefItemFields, buildBriefSummary, formatTopUrgentLine } from './brief-summary'

const TODAY = new Date(2026, 3, 27) // 2026-04-27 (Mon)

function item(overrides: Partial<BriefItemFields> & { id: string }): BriefItemFields {
  const base: BriefItemFields = {
    id: overrides.id,
    title: `item-${overrides.id}`,
    status: 'todo',
    priority: 4,
    dueDate: null,
    isMust: false,
    doneAt: null,
    archivedAt: null,
    updatedAt: TODAY,
  }
  return { ...base, ...overrides }
}

describe('buildBriefSummary — 4 substrate 統合', () => {
  it('topUrgent / mustAtRisk / stale / velocity を同 today で揃えて返す', () => {
    const items: BriefItemFields[] = [
      item({
        id: 'A',
        priority: 1,
        dueDate: '2026-04-25',
        isMust: true,
        updatedAt: '2026-04-26',
      }), // urgent + must-at-risk (overdue)
      item({
        id: 'B',
        priority: 2,
        dueDate: '2026-04-27',
        updatedAt: '2026-04-26',
      }), // urgent (today)
      item({
        id: 'C',
        priority: 4,
        updatedAt: new Date(2026, 3, 5),
      }), // stale (22 日前)
      item({
        id: 'D',
        priority: 4,
        doneAt: new Date(2026, 3, 26),
      }), // velocity (1 日前)
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.topUrgent.length).toBeGreaterThanOrEqual(1)
    expect(r.mustAtRisk.length).toBe(1) // A
    expect(r.stale.length).toBe(1) // C
    expect(r.velocity.total).toBe(1) // D
  })

  it('空 items でも crash せず、各軸を 0 件で返す', () => {
    const r = buildBriefSummary([], {}, TODAY)
    expect(r.topUrgent).toEqual([])
    expect(r.mustAtRisk).toEqual([])
    expect(r.stale).toEqual([])
    expect(r.velocity.total).toBe(0)
    expect(r.textSummary).toContain('urgent 上位 0')
    expect(r.textSummary).toContain('MUST at-risk 0')
    expect(r.textSummary).toContain('stale 0')
    expect(r.textSummary).toContain('velocity')
  })

  it('options で各軸の閾値を制御できる', () => {
    const items: BriefItemFields[] = [
      item({ id: 'A', priority: 1 }), // urgent
      item({ id: 'B', priority: 2 }), // urgent
      item({ id: 'C', priority: 3 }), // urgent
      item({ id: 'D', priority: 4 }), // urgent
    ]
    const r = buildBriefSummary(items, { topUrgentN: 2 }, TODAY)
    expect(r.topUrgent).toHaveLength(2)
  })

  it('staleThresholdDays = 30 にすると 22 日前は stale 扱いされない', () => {
    const items: BriefItemFields[] = [
      item({ id: 'A', updatedAt: new Date(2026, 3, 5) }), // 22 日前
    ]
    const r = buildBriefSummary(items, { staleThresholdDays: 30 }, TODAY)
    expect(r.stale).toHaveLength(0)
  })
})

describe('buildBriefSummary — textSummary フォーマット', () => {
  it('textSummary は 7 行 (改行区切り、iter374 で 3 軸追加)', () => {
    const r = buildBriefSummary([], {}, TODAY)
    const lines = r.textSummary.split('\n')
    expect(lines).toHaveLength(7)
  })

  it('順序は urgent → must-at-risk → stale → velocity → stuckWip → overdue → must-overdue', () => {
    const r = buildBriefSummary([], {}, TODAY)
    const lines = r.textSummary.split('\n')
    expect(lines[0]).toMatch(/^urgent /)
    expect(lines[1]).toMatch(/^MUST at-risk /)
    expect(lines[2]).toMatch(/^stale /)
    expect(lines[3]).toMatch(/^直近 /)
    expect(lines[4]).toMatch(/^進行中だが停滞 /)
    expect(lines[5]).toMatch(/^期限超過 /)
    expect(lines[6]).toMatch(/^MUST 期限超過 /)
  })

  it('1 件以上ある場合は title が含まれる', () => {
    const items: BriefItemFields[] = [item({ id: 'A', priority: 1, title: 'リリース準備' })]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.textSummary).toContain('リリース準備')
  })
})

describe('buildBriefSummary — headline', () => {
  it('全 axis idle → top urgent 1 行', () => {
    const r = buildBriefSummary([], {}, TODAY)
    expect(r.headline).toBe('urgent 上位 0 (該当なし)')
  })

  it('mustOverdue がある → 最深刻 MUST 期限超過 が headline', () => {
    const items: BriefItemFields[] = [
      item({
        id: 'M',
        priority: 1,
        isMust: true,
        dueDate: '2026-04-20', // 7 日 overdue
        updatedAt: '2026-04-26',
      }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.headline).toMatch(/^MUST 期限超過 /)
  })

  it('mustOverdue 無し + mustAtRisk あり → MUST at-risk が headline', () => {
    const items: BriefItemFields[] = [
      item({
        id: 'A',
        priority: 1,
        isMust: true,
        dueDate: '2026-05-01', // 4 日先 (within 6)
        updatedAt: TODAY,
      }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.headline).toMatch(/^MUST at-risk /)
  })

  it('MUST 系無し + overdueActive あり → 期限超過 が headline', () => {
    const items: BriefItemFields[] = [
      item({
        id: 'O',
        priority: 2,
        isMust: false, // not MUST
        dueDate: '2026-04-20', // 7 日 overdue
        updatedAt: '2026-04-26',
      }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.headline).toMatch(/^期限超過 /)
  })

  it('overdue 無し + stuckWip あり → 進行中だが停滞 が headline', () => {
    const items: BriefItemFields[] = [
      item({
        id: 'S',
        priority: 3,
        status: 'in_progress',
        updatedAt: new Date(2026, 3, 22), // 5 日前 (>= 3 日 threshold)
      }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.headline.startsWith('進行中だが停滞')).toBe(true)
  })

  it('stuck 無し + stale あり → stale が headline', () => {
    const items: BriefItemFields[] = [
      item({
        id: 'St',
        priority: 4,
        updatedAt: new Date(2026, 3, 5), // 22 日前
      }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.headline).toMatch(/^stale /)
  })

  it('全 alert 無し + topUrgent あり → urgent 上位 が headline', () => {
    const items: BriefItemFields[] = [
      item({ id: 'U', priority: 1, title: 'タスクA', updatedAt: TODAY }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.headline).toMatch(/^urgent 上位 /)
  })
})

describe('formatTopUrgentLine', () => {
  it('1 件以上は title + urgency を区切って整形', () => {
    const items: BriefItemFields[] = [
      item({ id: 'A', priority: 1, title: 'A' }), // urgency 100
      item({ id: 'B', priority: 2, title: 'B' }), // urgency 70
    ]
    const r = buildBriefSummary(items, { topUrgentN: 2 }, TODAY)
    expect(formatTopUrgentLine(r.topUrgent)).toBe('urgent 上位 2: A (urgency 100) / B (urgency 70)')
  })

  it('0 件は "urgent 上位 0 (該当なし)"', () => {
    expect(formatTopUrgentLine([])).toBe('urgent 上位 0 (該当なし)')
  })

  it('title 欠落は (無題) で fallback', () => {
    const noTitle: BriefItemFields = item({ id: 'X', priority: 1 })
    delete (noTitle as { title?: string }).title
    const line = formatTopUrgentLine([{ item: noTitle, urgency: 100 }])
    expect(line).toContain('(無題)')
  })

  it('複数件は " / " 区切り', () => {
    const A = item({ id: 'A', priority: 1, title: 'A' })
    const B = item({ id: 'B', priority: 2, title: 'B' })
    const C = item({ id: 'C', priority: 3, title: 'C' })
    const line = formatTopUrgentLine([
      { item: A, urgency: 100 },
      { item: B, urgency: 70 },
      { item: C, urgency: 40 },
    ])
    expect(line.split(' / ')).toHaveLength(3)
  })
})

describe('buildBriefSummary — substrate 一貫性 (regression guard)', () => {
  it('today を文字列で渡しても Date と同じ結果', () => {
    const items: BriefItemFields[] = [
      item({ id: 'A', priority: 1, dueDate: '2026-04-25', isMust: true }),
    ]
    const rDate = buildBriefSummary(items, {}, TODAY)
    const rString = buildBriefSummary(items, {}, '2026-04-27')
    expect(rString.mustAtRisk).toHaveLength(rDate.mustAtRisk.length)
    expect(rString.topUrgent).toHaveLength(rDate.topUrgent.length)
  })

  it('done item は urgent から消えるが velocity に乗る', () => {
    const items: BriefItemFields[] = [item({ id: 'A', priority: 1, doneAt: new Date(2026, 3, 26) })]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.topUrgent).toHaveLength(0) // doneAt → urgency=0 で除外
    expect(r.velocity.total).toBe(1) // 1 日前 done なので window 内
  })

  it('archive 済 item は urgent / must-at-risk / stale から消える', () => {
    const items: BriefItemFields[] = [
      item({
        id: 'A',
        priority: 1,
        isMust: true,
        archivedAt: new Date(2026, 3, 25),
        updatedAt: new Date(2026, 3, 1),
      }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.topUrgent).toHaveLength(0)
    expect(r.mustAtRisk).toHaveLength(0)
    expect(r.stale).toHaveLength(0)
  })
})

describe('buildBriefSummary — iter387 mustOverdueEntries / overdueActiveEntries', () => {
  it('mustOverdueEntries は isMust + overdue な item の具体名 + overdueDays を返す', () => {
    const items: BriefItemFields[] = [
      item({ id: 'M1', isMust: true, dueDate: '2026-04-13', title: '提出書類' }), // 14 日 overdue
      item({ id: 'M2', isMust: true, dueDate: '2026-04-22', title: '連絡' }), // 5 日 overdue
      item({ id: 'X', isMust: false, dueDate: '2026-04-13', title: '通常タスク' }), // not must
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.mustOverdueEntries.length).toBe(2)
    expect(r.mustOverdueEntries[0]!.item.title).toBe('提出書類') // overdueDays desc
    expect(r.mustOverdueEntries[0]!.overdueDays).toBe(14)
    expect(r.mustOverdueEntries[1]!.item.title).toBe('連絡')
    expect(r.mustOverdueEntries[1]!.overdueDays).toBe(5)
  })

  it('overdueActiveEntries は must 関係なく overdue 全般を返す (must 含む)', () => {
    const items: BriefItemFields[] = [
      item({ id: 'M', isMust: true, dueDate: '2026-04-13', title: 'MUST 急ぎ' }),
      item({ id: 'N', isMust: false, dueDate: '2026-04-22', title: '通常急ぎ' }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.overdueActiveEntries.length).toBe(2)
    expect(r.overdueActiveEntries.map((e) => e.item.title)).toEqual(['MUST 急ぎ', '通常急ぎ'])
  })

  it('overdue が無ければ entries は空配列', () => {
    const items: BriefItemFields[] = [
      item({ id: 'F', dueDate: '2026-05-10', title: '未来' }),
      item({ id: 'D', dueDate: '2026-04-20', doneAt: new Date(2026, 3, 25), title: '完了済' }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.mustOverdueEntries).toEqual([])
    expect(r.overdueActiveEntries).toEqual([])
  })

  it('stats と entries が同 today で同期される (= mustOverdue.total === mustOverdueEntries.length)', () => {
    const items: BriefItemFields[] = [
      item({ id: 'A', isMust: true, dueDate: '2026-04-20' }),
      item({ id: 'B', isMust: true, dueDate: '2026-04-25' }),
      item({ id: 'C', dueDate: '2026-04-22' }),
    ]
    const r = buildBriefSummary(items, {}, TODAY)
    expect(r.mustOverdue.total).toBe(r.mustOverdueEntries.length)
    expect(r.overdueActive.total).toBe(r.overdueActiveEntries.length)
  })
})
