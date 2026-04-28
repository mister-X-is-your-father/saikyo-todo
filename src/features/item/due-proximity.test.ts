import { describe, expect, it } from 'vitest'

import {
  countItemsByDueProximity,
  dueProximityLabel,
  formatDueProximityCounts,
  getDueProximity,
  groupItemsByDueProximity,
} from './due-proximity'

const TODAY = '2026-04-27'

describe('getDueProximity — kind 分類', () => {
  it('期限切れ (1 日前) → overdue / diff=-1', () => {
    const r = getDueProximity('2026-04-26', TODAY)
    expect(r.kind).toBe('overdue')
    expect(r.diffDays).toBe(-1)
    expect(r.label).toBe('期限切れ')
  })

  it('期限切れ (5 日前) → overdue / diff=-5', () => {
    const r = getDueProximity('2026-04-22', TODAY)
    expect(r.kind).toBe('overdue')
    expect(r.diffDays).toBe(-5)
  })

  it('今日 (=today) → today / diff=0', () => {
    const r = getDueProximity('2026-04-27', TODAY)
    expect(r.kind).toBe('today')
    expect(r.diffDays).toBe(0)
    expect(r.label).toBe('今日')
  })

  it('明日 (+1) → tomorrow / diff=1', () => {
    const r = getDueProximity('2026-04-28', TODAY)
    expect(r.kind).toBe('tomorrow')
    expect(r.diffDays).toBe(1)
    expect(r.label).toBe('明日')
  })

  it('今週内 +2 → thisWeek', () => {
    const r = getDueProximity('2026-04-29', TODAY)
    expect(r.kind).toBe('thisWeek')
    expect(r.diffDays).toBe(2)
    expect(r.label).toBe('今週内')
  })

  it('今週内 境界 +6 → thisWeek', () => {
    const r = getDueProximity('2026-05-03', TODAY)
    expect(r.kind).toBe('thisWeek')
    expect(r.diffDays).toBe(6)
  })

  it('境界 +7 → later (今週内には含まない)', () => {
    const r = getDueProximity('2026-05-04', TODAY)
    expect(r.kind).toBe('later')
    expect(r.diffDays).toBe(7)
    expect(r.label).toBe('今後')
  })

  it('遠未来 +30 → later', () => {
    const r = getDueProximity('2026-05-27', TODAY)
    expect(r.kind).toBe('later')
    expect(r.diffDays).toBe(30)
  })
})

describe('getDueProximity — fail-soft', () => {
  it('null → noDate / diffDays=undefined / label="未設定"', () => {
    const r = getDueProximity(null, TODAY)
    expect(r.kind).toBe('noDate')
    expect(r.diffDays).toBeUndefined()
    expect(r.label).toBe('未設定')
  })

  it('undefined → noDate', () => {
    expect(getDueProximity(undefined, TODAY).kind).toBe('noDate')
  })

  it('空文字 → noDate', () => {
    expect(getDueProximity('', TODAY).kind).toBe('noDate')
  })

  it('不正 ISO ("garbage") → noDate', () => {
    expect(getDueProximity('garbage', TODAY).kind).toBe('noDate')
  })

  it('不正な月 ("2026-13-01") → noDate', () => {
    expect(getDueProximity('2026-13-01', TODAY).kind).toBe('noDate')
  })

  it('不正な日 ("2026-04-32") → noDate', () => {
    expect(getDueProximity('2026-04-32', TODAY).kind).toBe('noDate')
  })

  it('不正 today も noDate にフォールバック', () => {
    expect(getDueProximity('2026-04-30', 'garbage').kind).toBe('noDate')
  })
})

describe('getDueProximity — Date today / 省略', () => {
  it('today を Date object で渡してもよい', () => {
    const today = new Date(2026, 3, 27) // 0-index month: 3=4月
    const r = getDueProximity('2026-04-28', today)
    expect(r.kind).toBe('tomorrow')
    expect(r.diffDays).toBe(1)
  })

  it('today 省略時はエラーを投げず動く (今日は今日)', () => {
    // 結果は今日の日付に依存するので kind だけ確認
    const r = getDueProximity('2026-04-27')
    expect(['overdue', 'today', 'tomorrow', 'thisWeek', 'later']).toContain(r.kind)
  })
})

describe('dueProximityLabel', () => {
  it('全 kind に label が引ける', () => {
    expect(dueProximityLabel('overdue')).toBe('期限切れ')
    expect(dueProximityLabel('today')).toBe('今日')
    expect(dueProximityLabel('tomorrow')).toBe('明日')
    expect(dueProximityLabel('thisWeek')).toBe('今週内')
    expect(dueProximityLabel('later')).toBe('今後')
    expect(dueProximityLabel('noDate')).toBe('未設定')
  })
})

describe('groupItemsByDueProximity', () => {
  const items = [
    { id: 'a', dueDate: '2026-04-22' }, // overdue
    { id: 'b', dueDate: '2026-04-27' }, // today
    { id: 'c', dueDate: '2026-04-28' }, // tomorrow
    { id: 'd', dueDate: '2026-04-30' }, // thisWeek (+3)
    { id: 'e', dueDate: '2026-05-04' }, // later (+7)
    { id: 'f', dueDate: null }, // noDate
    { id: 'g', dueDate: 'garbage' }, // noDate
  ]

  it('全 6 kind が空配列で初期化される', () => {
    const groups = groupItemsByDueProximity([], TODAY)
    expect(groups.overdue).toEqual([])
    expect(groups.today).toEqual([])
    expect(groups.tomorrow).toEqual([])
    expect(groups.thisWeek).toEqual([])
    expect(groups.later).toEqual([])
    expect(groups.noDate).toEqual([])
  })

  it('閾値どおりに振り分け', () => {
    const groups = groupItemsByDueProximity(items, TODAY)
    expect(groups.overdue.map((i) => i.id)).toEqual(['a'])
    expect(groups.today.map((i) => i.id)).toEqual(['b'])
    expect(groups.tomorrow.map((i) => i.id)).toEqual(['c'])
    expect(groups.thisWeek.map((i) => i.id)).toEqual(['d'])
    expect(groups.later.map((i) => i.id)).toEqual(['e'])
    expect(groups.noDate.map((i) => i.id)).toEqual(['f', 'g'])
  })

  it('元配列順を保つ (stable)', () => {
    const reversed = [
      { id: 'd', dueDate: '2026-04-30' },
      { id: 'b', dueDate: '2026-04-27' },
      { id: 'a', dueDate: '2026-04-22' },
    ]
    const groups = groupItemsByDueProximity(reversed, TODAY)
    expect(groups.thisWeek.map((i) => i.id)).toEqual(['d'])
    expect(groups.today.map((i) => i.id)).toEqual(['b'])
    expect(groups.overdue.map((i) => i.id)).toEqual(['a'])
  })
})

describe('countItemsByDueProximity', () => {
  it('全 0 で初期化される', () => {
    const c = countItemsByDueProximity([], TODAY)
    expect(c).toEqual({ overdue: 0, today: 0, tomorrow: 0, thisWeek: 0, later: 0, noDate: 0 })
  })

  it('items の数だけ増える', () => {
    const items = [
      { dueDate: '2026-04-22' },
      { dueDate: '2026-04-22' },
      { dueDate: '2026-04-27' },
      { dueDate: null },
    ]
    const c = countItemsByDueProximity(items, TODAY)
    expect(c.overdue).toBe(2)
    expect(c.today).toBe(1)
    expect(c.noDate).toBe(1)
    expect(c.tomorrow).toBe(0)
  })
})

describe('formatDueProximityCounts', () => {
  it('全 0 → "0 件"', () => {
    expect(
      formatDueProximityCounts({
        overdue: 0,
        today: 0,
        tomorrow: 0,
        thisWeek: 0,
        later: 0,
        noDate: 0,
      }),
    ).toBe('0 件')
  })

  it('0 件の bucket は省略 / kind 順を保つ', () => {
    const s = formatDueProximityCounts({
      overdue: 3,
      today: 0,
      tomorrow: 1,
      thisWeek: 4,
      later: 0,
      noDate: 2,
    })
    expect(s).toBe('期限切れ 3 / 明日 1 / 今週内 4 / 未設定 2')
  })

  it('1 bucket のみ', () => {
    expect(
      formatDueProximityCounts({
        overdue: 0,
        today: 5,
        tomorrow: 0,
        thisWeek: 0,
        later: 0,
        noDate: 0,
      }),
    ).toBe('今日 5')
  })
})
