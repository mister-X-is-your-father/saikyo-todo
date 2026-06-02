import { describe, expect, it } from 'vitest'

import {
  countItemsByDueProximity,
  dueProximityChipClasses,
  dueProximityCountsToSeverityCounts,
  dueProximityLabel,
  dueProximitySeverity,
  dueProximityTone,
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

describe('dueProximityTone (graphical 波及 — chip tone token)', () => {
  it('overdue → danger (rose、強警戒)', () => {
    expect(dueProximityTone('overdue')).toBe('danger')
  })

  it('today → urgent / tomorrow → warn (amber 系で行動喚起)', () => {
    expect(dueProximityTone('today')).toBe('urgent')
    expect(dueProximityTone('tomorrow')).toBe('warn')
  })

  it('thisWeek → info / later → idle / noDate → idle (計画余裕)', () => {
    expect(dueProximityTone('thisWeek')).toBe('info')
    expect(dueProximityTone('later')).toBe('idle')
    expect(dueProximityTone('noDate')).toBe('idle')
  })
})

describe('dueProximityChipClasses (tone → Tailwind 3 軸 class)', () => {
  it('overdue → rose 系 (bg / text / ring)', () => {
    const c = dueProximityChipClasses('overdue')
    expect(c.bgClass).toBe('bg-rose-100')
    expect(c.textClass).toBe('text-rose-700')
    expect(c.ringClass).toBe('ring-rose-300')
  })

  it('today → amber 強、tomorrow → amber 薄 (urgent vs warn 区別)', () => {
    expect(dueProximityChipClasses('today').bgClass).toBe('bg-amber-100')
    expect(dueProximityChipClasses('tomorrow').bgClass).toBe('bg-amber-50')
  })

  it('thisWeek / noDate は別 tone でも class が定まっている', () => {
    expect(dueProximityChipClasses('thisWeek').textClass).toBe('text-blue-700')
    expect(dueProximityChipClasses('noDate').textClass).toBe('text-slate-600')
  })
})

describe('dueProximitySeverity — 5 段共通 Severity bridge', () => {
  it('overdue → danger (赤、最深刻)', () => {
    expect(dueProximitySeverity('overdue')).toBe('danger')
  })

  it('today → warn (黄、行動喚起、overdue を danger 専用に維持)', () => {
    expect(dueProximitySeverity('today')).toBe('warn')
  })

  it('tomorrow → info (青、計画範囲内)', () => {
    expect(dueProximitySeverity('tomorrow')).toBe('info')
  })

  it('thisWeek → info (青、計画範囲内、tomorrow と同階層)', () => {
    expect(dueProximitySeverity('thisWeek')).toBe('info')
  })

  it('later → muted (グレー、計画余裕)', () => {
    expect(dueProximitySeverity('later')).toBe('muted')
  })

  it('noDate → muted (グレー、対象外)', () => {
    expect(dueProximitySeverity('noDate')).toBe('muted')
  })

  it('全 DueProximityKind 値で 5 段階 Severity のいずれかを返す', () => {
    const all: Array<'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'noDate'> = [
      'overdue',
      'today',
      'tomorrow',
      'thisWeek',
      'later',
      'noDate',
    ]
    const validSev = ['ok', 'info', 'warn', 'danger', 'muted']
    for (const k of all) {
      expect(validSev).toContain(dueProximitySeverity(k))
    }
  })
})

describe('dueProximityCountsToSeverityCounts', () => {
  it('期限近接 counts を 5 段 severity counts に集約', () => {
    expect(
      dueProximityCountsToSeverityCounts({
        overdue: 2,
        today: 1,
        tomorrow: 0,
        thisWeek: 3,
        later: 5,
        noDate: 1,
      }),
    ).toEqual({
      ok: 0,
      info: 3, // tomorrow + thisWeek
      warn: 1, // today
      danger: 2, // overdue
      muted: 6, // later + noDate
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(
      dueProximityCountsToSeverityCounts({
        overdue: 0,
        today: 0,
        tomorrow: 0,
        thisWeek: 0,
        later: 0,
        noDate: 0,
      }),
    ).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
  })

  it('合計が DueProximityKind 件数の合計と一致', () => {
    const counts = { overdue: 2, today: 1, tomorrow: 1, thisWeek: 3, later: 5, noDate: 1 }
    const sevCounts = dueProximityCountsToSeverityCounts(counts)
    const kindTotal = Object.values(counts).reduce((a, b) => a + b, 0)
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(kindTotal)
  })

  it('期限近接は ok bucket には出ない (期限軸 ≠ 達成度軸)', () => {
    const r = dueProximityCountsToSeverityCounts({
      overdue: 1,
      today: 1,
      tomorrow: 1,
      thisWeek: 1,
      later: 1,
      noDate: 1,
    })
    expect(r.ok).toBe(0)
  })

  // iter1687 refactor regression guard: aggregateCountsBySeverity 委譲後も
  // dueProximitySeverity の domain mapping が経由されることを assert (= 入力 key 順
  // 違いでも合算は順序不変、object spread でも結果同一)。
  it('入力 key 順を変えても結果同一 (集約は加算的、順序不変)', () => {
    const a = dueProximityCountsToSeverityCounts({
      overdue: 2,
      today: 1,
      tomorrow: 1,
      thisWeek: 3,
      later: 5,
      noDate: 1,
    })
    const b = dueProximityCountsToSeverityCounts({
      noDate: 1,
      later: 5,
      thisWeek: 3,
      tomorrow: 1,
      today: 1,
      overdue: 2,
    })
    expect(a).toEqual(b)
  })
})
