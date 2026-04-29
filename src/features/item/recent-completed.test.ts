import { describe, expect, it } from 'vitest'

import {
  computeRecentCompletedByPriority,
  formatRecentCompletedByPriorityJa,
  formatRecentCompletedSummaryJa,
  type RecentCompletedEntry,
  type RecentCompletedFields,
  selectRecentCompleted,
} from './recent-completed'

const NOW = new Date('2026-04-29T12:00:00Z')

function hoursAgo(n: number): string {
  return new Date(NOW.getTime() - n * 60 * 60 * 1000).toISOString()
}

describe('selectRecentCompleted', () => {
  it('returns empty when items is empty', () => {
    expect(selectRecentCompleted([], {}, NOW)).toEqual([])
  })

  it('excludes items without doneAt', () => {
    const items: RecentCompletedFields[] = [
      { id: 'a', title: 'A', priority: 1, doneAt: null },
      { id: 'b', title: 'B', priority: 1, doneAt: hoursAgo(2) },
    ]
    const result = selectRecentCompleted(items, {}, NOW)
    expect(result).toHaveLength(1)
    expect(result[0]?.item.id).toBe('b')
  })

  it('excludes items completed before window (default 24h)', () => {
    const items: RecentCompletedFields[] = [
      { id: 'a', title: 'A', priority: 1, doneAt: hoursAgo(2) }, // in
      { id: 'b', title: 'B', priority: 1, doneAt: hoursAgo(48) }, // out
    ]
    const result = selectRecentCompleted(items, {}, NOW)
    expect(result.map((e) => e.item.id)).toEqual(['a'])
  })

  it('respects custom windowHours', () => {
    const items: RecentCompletedFields[] = [
      { id: 'a', title: 'A', priority: 1, doneAt: hoursAgo(1) },
      { id: 'b', title: 'B', priority: 1, doneAt: hoursAgo(5) },
      { id: 'c', title: 'C', priority: 1, doneAt: hoursAgo(72) },
    ]
    expect(selectRecentCompleted(items, { windowHours: 6 }, NOW).map((e) => e.item.id)).toEqual([
      'a',
      'b',
    ])
  })

  it('sorts by doneAt desc, tie-break by priority asc', () => {
    const items: RecentCompletedFields[] = [
      { id: 'a', title: 'A', priority: 3, doneAt: hoursAgo(2) },
      { id: 'b', title: 'B', priority: 1, doneAt: hoursAgo(2) }, // same time, higher priority
      { id: 'c', title: 'C', priority: 1, doneAt: hoursAgo(1) }, // newest
    ]
    const result = selectRecentCompleted(items, {}, NOW)
    expect(result.map((e) => e.item.id)).toEqual(['c', 'b', 'a'])
  })

  it('respects limit option', () => {
    const items: RecentCompletedFields[] = [
      { id: 'a', title: 'A', priority: 1, doneAt: hoursAgo(1) },
      { id: 'b', title: 'B', priority: 1, doneAt: hoursAgo(2) },
      { id: 'c', title: 'C', priority: 1, doneAt: hoursAgo(3) },
      { id: 'd', title: 'D', priority: 1, doneAt: hoursAgo(4) },
    ]
    const result = selectRecentCompleted(items, { limit: 2 }, NOW)
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.item.id)).toEqual(['a', 'b'])
  })

  it('excludes future doneAt (clock skew safety)', () => {
    const items: RecentCompletedFields[] = [
      {
        id: 'future',
        title: 'F',
        priority: 1,
        doneAt: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
      },
    ]
    expect(selectRecentCompleted(items, {}, NOW)).toEqual([])
  })

  it('returns empty for windowHours <= 0', () => {
    const items: RecentCompletedFields[] = [
      { id: 'a', title: 'A', priority: 1, doneAt: hoursAgo(1) },
    ]
    expect(selectRecentCompleted(items, { windowHours: 0 }, NOW)).toEqual([])
    expect(selectRecentCompleted(items, { windowHours: -1 }, NOW)).toEqual([])
  })

  it('normalizes priority null/undefined/out-of-range to p4', () => {
    const items: RecentCompletedFields[] = [
      { id: 'a', title: 'A', priority: null, doneAt: hoursAgo(1) },
      { id: 'b', title: 'B', priority: 99, doneAt: hoursAgo(2) },
    ]
    const result = selectRecentCompleted(items, {}, NOW)
    expect(result.every((e) => e.priority === 4)).toBe(true)
  })
})

describe('formatRecentCompletedSummaryJa', () => {
  it('formats empty as "今日の達成 0 件"', () => {
    expect(formatRecentCompletedSummaryJa([], 0)).toBe('今日の達成 0 件')
  })

  it('formats N items with all titles', () => {
    const entries = [
      {
        item: { id: 'a', title: 'タスクA', priority: 1, doneAt: hoursAgo(1) },
        priority: 1 as const,
        doneAt: NOW,
      },
      {
        item: { id: 'b', title: 'タスクB', priority: 2, doneAt: hoursAgo(2) },
        priority: 2 as const,
        doneAt: NOW,
      },
      {
        item: { id: 'c', title: 'タスクC', priority: 3, doneAt: hoursAgo(3) },
        priority: 3 as const,
        doneAt: NOW,
      },
    ]
    expect(formatRecentCompletedSummaryJa(entries)).toBe(
      '今日の達成: 3 件 — タスクA / タスクB / タスクC',
    )
  })

  it('formats with "他 N 件" tail when totalCount exceeds entries.length', () => {
    const entries = [
      {
        item: { id: 'a', title: 'A', priority: 1, doneAt: hoursAgo(1) },
        priority: 1 as const,
        doneAt: NOW,
      },
      {
        item: { id: 'b', title: 'B', priority: 1, doneAt: hoursAgo(2) },
        priority: 1 as const,
        doneAt: NOW,
      },
      {
        item: { id: 'c', title: 'C', priority: 1, doneAt: hoursAgo(3) },
        priority: 1 as const,
        doneAt: NOW,
      },
    ]
    expect(formatRecentCompletedSummaryJa(entries, 5)).toBe(
      '今日の達成: 5 件 — A / B / C / 他 2 件',
    )
  })

  it('respects limit param (truncates titles)', () => {
    const entries = [
      {
        item: { id: 'a', title: 'A', priority: 1, doneAt: hoursAgo(1) },
        priority: 1 as const,
        doneAt: NOW,
      },
      {
        item: { id: 'b', title: 'B', priority: 1, doneAt: hoursAgo(2) },
        priority: 1 as const,
        doneAt: NOW,
      },
      {
        item: { id: 'c', title: 'C', priority: 1, doneAt: hoursAgo(3) },
        priority: 1 as const,
        doneAt: NOW,
      },
    ]
    expect(formatRecentCompletedSummaryJa(entries, 3, 2)).toBe('今日の達成: 3 件 — A / B / 他 1 件')
  })

  it('falls back to "(無題)" for missing title', () => {
    const entries: Array<{
      item: { id: string; title: string | undefined; priority: number; doneAt: string }
      priority: 1
      doneAt: Date
    }> = [
      {
        item: { id: 'a', title: undefined, priority: 1, doneAt: hoursAgo(1) },
        priority: 1,
        doneAt: NOW,
      },
      {
        item: { id: 'b', title: '', priority: 1, doneAt: hoursAgo(2) },
        priority: 1,
        doneAt: NOW,
      },
    ]
    expect(formatRecentCompletedSummaryJa(entries)).toBe('今日の達成: 2 件 — (無題) / (無題)')
  })
})

describe('integration: items → select → format', () => {
  it('connects pipeline end-to-end', () => {
    const items: RecentCompletedFields[] = [
      { id: 'a', title: 'タスクA', priority: 1, doneAt: hoursAgo(1) },
      { id: 'b', title: 'タスクB', priority: 2, doneAt: hoursAgo(3) },
      { id: 'c', title: 'タスクC', priority: 3, doneAt: hoursAgo(5) },
      { id: 'd', title: 'old', priority: 1, doneAt: hoursAgo(48) }, // out of window
      { id: 'e', title: 'no done', priority: 1, doneAt: null },
    ]
    const all = selectRecentCompleted(items, {}, NOW)
    expect(formatRecentCompletedSummaryJa(all)).toBe(
      '今日の達成: 3 件 — タスクA / タスクB / タスクC',
    )
  })
})

describe('computeRecentCompletedByPriority / formatRecentCompletedByPriorityJa', () => {
  type Item = { id: string; title: string; priority: number; doneAt: string }
  const e = (
    id: string,
    minutesAgo: number,
    priority: 1 | 2 | 3 | 4,
  ): RecentCompletedEntry<Item> => {
    const doneAt = new Date(NOW.getTime() - minutesAgo * 60 * 1000)
    return {
      item: { id, title: `T-${id}`, priority, doneAt: doneAt.toISOString() },
      priority,
      doneAt,
    }
  }

  it('空 → 全 bucket count=0 / latestMinutesAgo=null', () => {
    const r = computeRecentCompletedByPriority([], NOW)
    expect(r).toEqual({
      1: { count: 0, latestMinutesAgo: null },
      2: { count: 0, latestMinutesAgo: null },
      3: { count: 0, latestMinutesAgo: null },
      4: { count: 0, latestMinutesAgo: null },
    })
    expect(formatRecentCompletedByPriorityJa(r)).toBe('今日の達成 0 件')
  })

  it('P1 2 件 (3分前 / 30分前) + P3 1 件 (1時間前) → P1 latest=3 / P3 latest=60', () => {
    const r = computeRecentCompletedByPriority([e('a', 3, 1), e('b', 30, 1), e('c', 60, 3)], NOW)
    expect(r[1]).toEqual({ count: 2, latestMinutesAgo: 3 })
    expect(r[2]).toEqual({ count: 0, latestMinutesAgo: null })
    expect(r[3]).toEqual({ count: 1, latestMinutesAgo: 60 })
    expect(r[4]).toEqual({ count: 0, latestMinutesAgo: null })
    expect(formatRecentCompletedByPriorityJa(r)).toBe(
      '今日の達成: P1 2 件 (最新 3分前) / P3 1 件 (最新 1時間前)',
    )
  })

  it('単一 priority 偏在 → 1 行のみ (5時間前 = 300分)', () => {
    const r = computeRecentCompletedByPriority([e('a', 300, 4)], NOW)
    expect(formatRecentCompletedByPriorityJa(r)).toBe('今日の達成: P4 1 件 (最新 5時間前)')
  })

  it('60 分以上は時間表記、未満は分表記', () => {
    const r1 = computeRecentCompletedByPriority([e('a', 59, 1)], NOW)
    expect(formatRecentCompletedByPriorityJa(r1)).toBe('今日の達成: P1 1 件 (最新 59分前)')
    const r2 = computeRecentCompletedByPriority([e('a', 60, 1)], NOW)
    expect(formatRecentCompletedByPriorityJa(r2)).toBe('今日の達成: P1 1 件 (最新 1時間前)')
  })

  it('未来 doneAt は 0 分前へ clamp (defensive)', () => {
    const future = new Date(NOW.getTime() + 5 * 60 * 1000)
    const entry: RecentCompletedEntry<Item> = {
      item: { id: 'f', title: 'F', priority: 1, doneAt: future.toISOString() },
      priority: 1,
      doneAt: future,
    }
    const r = computeRecentCompletedByPriority([entry], NOW)
    expect(r[1]?.latestMinutesAgo).toBe(0)
  })
})
