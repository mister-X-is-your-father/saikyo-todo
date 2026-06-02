import { describe, expect, it } from 'vitest'

import {
  bucketByPriorityWith,
  countItemsByPriority,
  countNonEmptyCountPriorityBuckets,
  countNonEmptyPriorityBuckets,
  countNonEmptyPriorityBucketsBy,
  formatPriorityBuckets,
  formatPriorityBucketsCountWithDays,
  formatPriorityBucketsLabeled,
  formatPriorityCounts,
  groupItemsByPriority,
  initPriorityRecord,
  priorityClass,
  priorityCountsToSeverityCounts,
  priorityDetailSuffix,
  priorityLabel,
  prioritySeverity,
} from './priority'

describe('priority helpers', () => {
  it('priorityClass: 各 priority に対応する Tailwind class を返す', () => {
    expect(priorityClass(1)).toBe('bg-red-500')
    expect(priorityClass(2)).toBe('bg-amber-500')
    expect(priorityClass(3)).toBe('bg-blue-500')
    expect(priorityClass(4)).toBe('bg-slate-400')
  })

  it('priorityClass: null / undefined / 範囲外は p4 (slate) にフォールバック', () => {
    expect(priorityClass(null)).toBe('bg-slate-400')
    expect(priorityClass(undefined)).toBe('bg-slate-400')
    expect(priorityClass(99)).toBe('bg-slate-400')
  })

  it('priorityLabel: SR 向け日本語ラベルを返す', () => {
    expect(priorityLabel(1)).toBe('優先度: 最優先 (p1)')
    expect(priorityLabel(2)).toBe('優先度: 高 (p2)')
    expect(priorityLabel(3)).toBe('優先度: 中 (p3)')
    expect(priorityLabel(4)).toBe('優先度: 低 (p4)')
  })

  it('priorityLabel: null / undefined は p4 (低) として扱う', () => {
    expect(priorityLabel(null)).toBe('優先度: 低 (p4)')
    expect(priorityLabel(undefined)).toBe('優先度: 低 (p4)')
  })
})

describe('groupItemsByPriority', () => {
  it('priority 別に items を振り分け、順序は元配列順を保つ', () => {
    const items = [
      { id: 'a', priority: 1 },
      { id: 'b', priority: 3 },
      { id: 'c', priority: 1 },
      { id: 'd', priority: 2 },
      { id: 'e', priority: 4 },
    ]
    const groups = groupItemsByPriority(items)
    expect(groups[1].map((i) => i.id)).toEqual(['a', 'c'])
    expect(groups[2].map((i) => i.id)).toEqual(['d'])
    expect(groups[3].map((i) => i.id)).toEqual(['b'])
    expect(groups[4].map((i) => i.id)).toEqual(['e'])
  })

  it('priority null / undefined / 範囲外は p4 バケットに集約 (priorityClass のフォールバックと一貫)', () => {
    const items = [
      { id: 'a', priority: null },
      { id: 'b', priority: undefined },
      { id: 'c', priority: 99 },
      { id: 'd', priority: 0 },
      { id: 'e', priority: 4 },
    ]
    const groups = groupItemsByPriority(items)
    expect(groups[4].map((i) => i.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(groups[1]).toEqual([])
    expect(groups[2]).toEqual([])
    expect(groups[3]).toEqual([])
  })

  it('空配列でも 4 つの bucket が空配列で初期化される (undefined チェック不要)', () => {
    const groups = groupItemsByPriority([])
    expect(groups[1]).toEqual([])
    expect(groups[2]).toEqual([])
    expect(groups[3]).toEqual([])
    expect(groups[4]).toEqual([])
  })
})

describe('countItemsByPriority', () => {
  it('priority 別に件数を集計', () => {
    const items = [
      { priority: 1 },
      { priority: 1 },
      { priority: 2 },
      { priority: 3 },
      { priority: 3 },
      { priority: 3 },
      { priority: 4 },
    ]
    expect(countItemsByPriority(items)).toEqual({ 1: 2, 2: 1, 3: 3, 4: 1 })
  })

  it('null / undefined / 範囲外は p4 件数に加算', () => {
    const items = [{ priority: null }, { priority: undefined }, { priority: 99 }, { priority: 1 }]
    expect(countItemsByPriority(items)).toEqual({ 1: 1, 2: 0, 3: 0, 4: 3 })
  })

  it('空配列は全 0', () => {
    expect(countItemsByPriority([])).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 })
  })
})

describe('formatPriorityCounts', () => {
  it('AI prompt 用の 1 行 summary を返す (件数 0 の bucket は省略)', () => {
    expect(formatPriorityCounts({ 1: 2, 2: 1, 3: 3, 4: 1 })).toBe('最優先 2 / 高 1 / 中 3 / 低 1')
  })

  it('一部の bucket だけ件数があれば、その分だけ表示', () => {
    expect(formatPriorityCounts({ 1: 0, 2: 5, 3: 0, 4: 2 })).toBe('高 5 / 低 2')
    expect(formatPriorityCounts({ 1: 1, 2: 0, 3: 0, 4: 0 })).toBe('最優先 1')
  })

  it('全 0 件は "0 件"', () => {
    expect(formatPriorityCounts({ 1: 0, 2: 0, 3: 0, 4: 0 })).toBe('0 件')
  })

  it('priority 順 (1→2→3→4) で並ぶ — 入力 record の key 順に依存しない', () => {
    expect(formatPriorityCounts({ 4: 1, 3: 2, 2: 3, 1: 4 })).toBe('最優先 4 / 高 3 / 中 2 / 低 1')
  })
})

describe('bucketByPriorityWith', () => {
  it('returns initial values from compute() for empty bucket', () => {
    const r = bucketByPriorityWith([] as Array<{ priority: number; v: number }>, (g) => g.length)
    expect(r).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 })
  })

  it('groups items by priority and applies compute() to each bucket', () => {
    const items = [
      { priority: 1, v: 10 },
      { priority: 1, v: 20 },
      { priority: 3, v: 30 },
      { priority: 4, v: 40 },
    ]
    const r = bucketByPriorityWith(items, (g) => g.reduce((s, it) => s + it.v, 0))
    expect(r).toEqual({ 1: 30, 2: 0, 3: 30, 4: 40 })
  })

  it('normalizes null/undefined/out-of-range priority to p4', () => {
    const items = [
      { priority: null as null | number, v: 1 },
      { priority: undefined as undefined | number, v: 2 },
      { priority: 99, v: 3 },
    ]
    const r = bucketByPriorityWith(items, (g) => g.length)
    expect(r).toEqual({ 1: 0, 2: 0, 3: 0, 4: 3 })
  })

  it('preserves item order within bucket (stable)', () => {
    const items = [
      { priority: 1, v: 'a' },
      { priority: 1, v: 'b' },
      { priority: 1, v: 'c' },
    ]
    const r = bucketByPriorityWith(items, (g) => g.map((it) => it.v).join(''))
    expect(r[1]).toBe('abc')
  })
})

describe('countNonEmptyPriorityBuckets / countNonEmptyPriorityBucketsBy', () => {
  it('countNonEmptyPriorityBuckets: counts buckets with total > 0', () => {
    const r = countNonEmptyPriorityBuckets({
      1: { total: 3 },
      2: { total: 0 },
      3: { total: 1 },
      4: { total: 0 },
    })
    expect(r).toBe(2)
  })

  it('countNonEmptyPriorityBucketsBy: applies custom predicate', () => {
    const byPriority: Record<1 | 2 | 3 | 4, { score: number | null }> = {
      1: { score: 80 },
      2: { score: null },
      3: { score: 30 },
      4: { score: null },
    }
    expect(countNonEmptyPriorityBucketsBy(byPriority, (s) => s.score !== null)).toBe(2)
  })

  it('countNonEmptyPriorityBucketsBy: returns 0 when all buckets empty by predicate', () => {
    expect(
      countNonEmptyPriorityBucketsBy(
        { 1: { count: 0 }, 2: { count: 0 }, 3: { count: 0 }, 4: { count: 0 } },
        (s) => s.count > 0,
      ),
    ).toBe(0)
  })

  describe('countNonEmptyCountPriorityBuckets', () => {
    it('全 bucket count=0 → 0', () => {
      expect(
        countNonEmptyCountPriorityBuckets({
          1: { count: 0 },
          2: { count: 0 },
          3: { count: 0 },
          4: { count: 0 },
        }),
      ).toBe(0)
    })

    it('単一 priority 偏在 → 1', () => {
      expect(
        countNonEmptyCountPriorityBuckets({
          1: { count: 0 },
          2: { count: 5 },
          3: { count: 0 },
          4: { count: 0 },
        }),
      ).toBe(1)
    })

    it('複数 priority 分散 → 2+', () => {
      expect(
        countNonEmptyCountPriorityBuckets({
          1: { count: 2 },
          2: { count: 0 },
          3: { count: 3 },
          4: { count: 1 },
        }),
      ).toBe(3)
    })
  })

  describe('formatPriorityBuckets', () => {
    it('全 P null → emptySentinel', () => {
      const byP = { 1: { count: 0 }, 2: { count: 0 }, 3: { count: 0 }, 4: { count: 0 } }
      expect(
        formatPriorityBuckets(byP, (_k, s) => (s.count > 0 ? `non-empty` : null), '0 件'),
      ).toBe('0 件')
    })

    it('複数 P 分散 → / 区切りで join', () => {
      const byP = { 1: { count: 2 }, 2: { count: 0 }, 3: { count: 1 }, 4: { count: 0 } }
      expect(
        formatPriorityBuckets(byP, (k, s) => (s.count > 0 ? `P${k} ${s.count}` : null), '0 件'),
      ).toBe('P1 2 / P3 1')
    })

    it('単一 P → そのまま 1 つだけ', () => {
      const byP = { 1: { count: 0 }, 2: { count: 5 }, 3: { count: 0 }, 4: { count: 0 } }
      expect(
        formatPriorityBuckets(byP, (k, s) => (s.count > 0 ? `P${k} ${s.count}` : null), '0 件'),
      ).toBe('P2 5')
    })

    it('separator option 反映', () => {
      const byP = { 1: { count: 1 }, 2: { count: 1 }, 3: { count: 0 }, 4: { count: 0 } }
      expect(
        formatPriorityBuckets(byP, (k, s) => (s.count > 0 ? `P${k}` : null), '0 件', ', '),
      ).toBe('P1, P2')
    })
  })

  describe('formatPriorityBucketsCountWithDays', () => {
    it('全 P count=0 → emptySentinel', () => {
      const byP = {
        1: { count: 0, days: null },
        2: { count: 0, days: null },
        3: { count: 0, days: null },
        4: { count: 0, days: null },
      }
      expect(
        formatPriorityBucketsCountWithDays(
          byP,
          (s) => s.count,
          (s) => s.days,
          '最古',
          'foo 0 件',
        ),
      ).toBe('foo 0 件')
    })

    it('複数 P 分散 → 番号順 / 区切り、count=0 P 省略', () => {
      const byP: Record<1 | 2 | 3 | 4, { count: number; days: number | null }> = {
        1: { count: 2, days: 14 },
        2: { count: 0, days: null },
        3: { count: 1, days: 5 },
        4: { count: 0, days: null },
      }
      expect(
        formatPriorityBucketsCountWithDays(
          byP,
          (s) => s.count,
          (s) => s.days,
          '最古',
          'X 0 件',
        ),
      ).toBe('P1 2 件 (最古 14日) / P3 1 件 (最古 5日)')
    })

    it('count > 0 でも days=null は skip (= 不正値 fail-soft)', () => {
      const byP = {
        1: { count: 2, days: null },
        2: { count: 0, days: null },
        3: { count: 0, days: null },
        4: { count: 0, days: null },
      }
      expect(
        formatPriorityBucketsCountWithDays(
          byP,
          (s) => s.count,
          (s) => s.days,
          '最古',
          'sentinel',
        ),
      ).toBe('sentinel')
    })

    it('daysLabel は caller 側で差し替え可能 (最長 / 最大 等)', () => {
      const byP: Record<1 | 2 | 3 | 4, { c: number; d: number | null }> = {
        1: { c: 2, d: 7 },
        2: { c: 0, d: null },
        3: { c: 0, d: null },
        4: { c: 0, d: null },
      }
      expect(
        formatPriorityBucketsCountWithDays(
          byP,
          (s) => s.c,
          (s) => s.d,
          '最長',
          'empty',
        ),
      ).toBe('P1 2 件 (最長 7日)')
    })
  })

  describe('priorityDetailSuffix', () => {
    it('bucket=0 → 空文字', () => {
      expect(priorityDetailSuffix(0, () => 'P1 2件')).toBe('')
    })

    it('bucket=1 (単一 P 偏在) → 空文字', () => {
      expect(priorityDetailSuffix(1, () => 'P1 2件')).toBe('')
    })

    it('bucket=2+ → " — ${formatter()}"', () => {
      expect(priorityDetailSuffix(2, () => 'P1 2件 / P3 1件')).toBe(' — P1 2件 / P3 1件')
    })

    it('formatter は遅延 evaluation (bucket <= 1 で呼ばれない)', () => {
      let called = 0
      priorityDetailSuffix(0, () => {
        called += 1
        return 'expensive'
      })
      priorityDetailSuffix(1, () => {
        called += 1
        return 'expensive'
      })
      expect(called).toBe(0)
      // bucket=2 で呼ばれる
      priorityDetailSuffix(2, () => {
        called += 1
        return 'expensive'
      })
      expect(called).toBe(1)
    })
  })

  describe('initPriorityRecord (iter440)', () => {
    it('factory を 4 回呼んで 4-key Record を返す', () => {
      let called = 0
      const r = initPriorityRecord(() => {
        called += 1
        return { v: called }
      })
      expect(called).toBe(4)
      expect(r[1].v).toBe(1)
      expect(r[2].v).toBe(2)
      expect(r[3].v).toBe(3)
      expect(r[4].v).toBe(4)
    })

    it('factory が新インスタンスを返せば bucket 間で mutable state は共有されない', () => {
      const r = initPriorityRecord(() => ({ count: 0 }))
      r[1].count = 99
      expect(r[2].count).toBe(0)
      expect(r[3].count).toBe(0)
      expect(r[4].count).toBe(0)
    })

    it('プリミティブ値も factory から返せる (sums Record etc)', () => {
      const r = initPriorityRecord(() => 0)
      expect(r).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 })
    })
  })

  describe('formatPriorityBucketsLabeled (iter435)', () => {
    const byP = {
      1: { count: 2, days: 14 },
      2: { count: 0, days: null as number | null },
      3: { count: 1, days: 8 },
      4: { count: 0, days: null as number | null },
    }

    it('全 bucket null → emptySentinel そのまま (prefix 付与なし)', () => {
      const empty = {
        1: { count: 0, days: null as number | null },
        2: { count: 0, days: null as number | null },
        3: { count: 0, days: null as number | null },
        4: { count: 0, days: null as number | null },
      }
      expect(
        formatPriorityBucketsLabeled(
          empty,
          (k, s) => (s.count > 0 && s.days !== null ? `P${k} ${s.count} 件` : null),
          'XXX',
          'XXX 0 件',
        ),
      ).toBe('XXX 0 件')
    })

    it('1+ entry → "${prefix}: ${body}" を返す', () => {
      expect(
        formatPriorityBucketsLabeled(
          byP,
          (k, s) => (s.count > 0 && s.days !== null ? `P${k} ${s.count} 件 (${s.days}日)` : null),
          '遅延',
          '遅延 0 件',
        ),
      ).toBe('遅延: P1 2 件 (14日) / P3 1 件 (8日)')
    })

    it('prefix と sentinel は非対称でも OK (例: parent-items-progress の "進行中" / "進行中の案件 0 件")', () => {
      const empty = {
        1: { count: 0, days: null as number | null },
        2: { count: 0, days: null as number | null },
        3: { count: 0, days: null as number | null },
        4: { count: 0, days: null as number | null },
      }
      expect(formatPriorityBucketsLabeled(empty, () => null, '進行中', '進行中の案件 0 件')).toBe(
        '進行中の案件 0 件',
      )
      expect(
        formatPriorityBucketsLabeled(
          { 1: { count: 1, days: 5 as number | null }, 2: empty[2], 3: empty[3], 4: empty[4] },
          (k, s) => (s.count > 0 ? `P${k}: ${s.days}` : null),
          '進行中',
          '進行中の案件 0 件',
        ),
      ).toBe('進行中: P1: 5')
    })
  })

  describe('prioritySeverity', () => {
    it('p1 → danger (赤、最優先)', () => {
      expect(prioritySeverity(1)).toBe('danger')
    })

    it('p2 → warn (黄、高)', () => {
      expect(prioritySeverity(2)).toBe('warn')
    })

    it('p3 → info (青、中)', () => {
      expect(prioritySeverity(3)).toBe('info')
    })

    it('p4 → muted (グレー、低)', () => {
      expect(prioritySeverity(4)).toBe('muted')
    })

    it('null/undefined/範囲外は p4 (muted) に集約', () => {
      expect(prioritySeverity(null)).toBe('muted')
      expect(prioritySeverity(undefined)).toBe('muted')
      expect(prioritySeverity(0)).toBe('muted')
      expect(prioritySeverity(5)).toBe('muted')
      expect(prioritySeverity(-1)).toBe('muted')
    })

    it('全 priority 1-4 で 5 段階 Severity のいずれかを返す', () => {
      const validSev = ['ok', 'info', 'warn', 'danger', 'muted']
      for (const p of [1, 2, 3, 4]) {
        expect(validSev).toContain(prioritySeverity(p))
      }
    })
  })

  describe('priorityCountsToSeverityCounts', () => {
    it('priority counts を 5 段 severity counts に集約 (p1→danger / p2→warn / p3→info / p4→muted)', () => {
      expect(priorityCountsToSeverityCounts({ 1: 3, 2: 1, 3: 2, 4: 4 })).toEqual({
        danger: 3,
        warn: 1,
        info: 2,
        muted: 4,
        ok: 0,
      })
    })

    it('全 0 → 全 severity 0', () => {
      expect(priorityCountsToSeverityCounts({ 1: 0, 2: 0, 3: 0, 4: 0 })).toEqual({
        danger: 0,
        warn: 0,
        info: 0,
        muted: 0,
        ok: 0,
      })
    })

    it('priority は ok bucket に出ない (重要度軸 ≠ 達成度軸)', () => {
      const r = priorityCountsToSeverityCounts({ 1: 5, 2: 5, 3: 5, 4: 5 })
      expect(r.ok).toBe(0)
    })

    it('合計が priority 件数の合計と一致 (集約だけで増減しない)', () => {
      const counts = { 1: 3, 2: 1, 3: 2, 4: 4 }
      const sevCounts = priorityCountsToSeverityCounts(counts)
      const priorityTotal = counts[1] + counts[2] + counts[3] + counts[4]
      const sevTotal =
        sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
      expect(sevTotal).toBe(priorityTotal)
    })

    // iter1694 refactor regression guard: aggregateCountsBySeverity を `K extends PropertyKey` に
    // 汎用化したため number key (PriorityKey) でも domain mapping (p1→danger / p2→warn /
    // p3→info / p4→muted) が経由されることを assert。
    it('number key でも入力 key 順を変えても結果同一 (集約は加算的、順序不変)', () => {
      const a = priorityCountsToSeverityCounts({ 1: 3, 2: 1, 3: 2, 4: 4 })
      const b = priorityCountsToSeverityCounts({ 4: 4, 3: 2, 2: 1, 1: 3 })
      expect(a).toEqual(b)
    })
  })
})
