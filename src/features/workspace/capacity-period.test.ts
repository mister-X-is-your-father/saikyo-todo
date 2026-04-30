/**
 * iter466 capacity-period の unit test。pure helper のみ、DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  getDayRange,
  getIsoWeekRange,
  getRollingDayRange,
  isDueDateInRange,
  selectItemsByDueDateInRange,
} from './capacity-period'

describe('getIsoWeekRange', () => {
  it('月曜 → from=月曜、to=日曜', () => {
    // 2026-04-27 (月)
    const r = getIsoWeekRange(new Date(2026, 3, 27))
    expect(r).toEqual({ from: '2026-04-27', to: '2026-05-03' })
  })

  it('木曜 → from=月曜、to=日曜', () => {
    // 2026-04-30 (木)
    const r = getIsoWeekRange(new Date(2026, 3, 30))
    expect(r).toEqual({ from: '2026-04-27', to: '2026-05-03' })
  })

  it('日曜 → 同週の月曜 〜 当日 (= 6 日前 〜 今日)', () => {
    // 2026-05-03 (日)
    const r = getIsoWeekRange(new Date(2026, 4, 3))
    expect(r).toEqual({ from: '2026-04-27', to: '2026-05-03' })
  })

  it('不正 Date → null', () => {
    expect(getIsoWeekRange(new Date('invalid'))).toBeNull()
  })

  it('月跨ぎ (4/30 木 → 5/3 日)', () => {
    const r = getIsoWeekRange(new Date(2026, 3, 30))
    expect(r?.to).toBe('2026-05-03')
  })
})

describe('getDayRange', () => {
  it('from = to = 今日', () => {
    const r = getDayRange(new Date(2026, 3, 30))
    expect(r).toEqual({ from: '2026-04-30', to: '2026-04-30' })
  })

  it('不正 Date → null', () => {
    expect(getDayRange(new Date('invalid'))).toBeNull()
  })
})

describe('getRollingDayRange', () => {
  it('today + 1 日 → today のみ', () => {
    const r = getRollingDayRange(new Date(2026, 3, 30), 1)
    expect(r).toEqual({ from: '2026-04-30', to: '2026-04-30' })
  })

  it('today + 7 日 → today から 6 日後まで', () => {
    const r = getRollingDayRange(new Date(2026, 3, 30), 7)
    expect(r).toEqual({ from: '2026-04-30', to: '2026-05-06' })
  })

  it('days=0 → null', () => {
    expect(getRollingDayRange(new Date(2026, 3, 30), 0)).toBeNull()
  })

  it('days 負 → null', () => {
    expect(getRollingDayRange(new Date(2026, 3, 30), -1)).toBeNull()
  })

  it('不正 Date → null', () => {
    expect(getRollingDayRange(new Date('invalid'), 7)).toBeNull()
  })
})

describe('isDueDateInRange', () => {
  const range = { from: '2026-04-27', to: '2026-05-03' }

  it('range 内 (両端 inclusive)', () => {
    expect(isDueDateInRange('2026-04-27', range)).toBe(true)
    expect(isDueDateInRange('2026-04-30', range)).toBe(true)
    expect(isDueDateInRange('2026-05-03', range)).toBe(true)
  })

  it('range 外', () => {
    expect(isDueDateInRange('2026-04-26', range)).toBe(false)
    expect(isDueDateInRange('2026-05-04', range)).toBe(false)
  })

  it('null / 空 / range null', () => {
    expect(isDueDateInRange(null, range)).toBe(false)
    expect(isDueDateInRange('', range)).toBe(false)
    expect(isDueDateInRange(undefined, range)).toBe(false)
    expect(isDueDateInRange('2026-04-30', null)).toBe(false)
  })
})

describe('selectItemsByDueDateInRange', () => {
  const range = { from: '2026-04-27', to: '2026-05-03' }
  const items = [
    { id: 'a', dueDate: '2026-04-27' },
    { id: 'b', dueDate: '2026-04-30' },
    { id: 'c', dueDate: '2026-05-03' },
    { id: 'd', dueDate: '2026-05-04' },
    { id: 'e', dueDate: null },
  ]

  it('range 内のみ抽出', () => {
    const r = selectItemsByDueDateInRange(items, range)
    expect(r.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('range null → 空配列 (UI で chip 非表示用)', () => {
    expect(selectItemsByDueDateInRange(items, null)).toEqual([])
  })

  it('items 空 → 空配列', () => {
    expect(selectItemsByDueDateInRange([], range)).toEqual([])
  })
})
