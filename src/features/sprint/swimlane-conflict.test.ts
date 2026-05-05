/**
 * iter470 swim-lane conflict detection の unit test。pure helper のみ、DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  collectConflictedItemIds,
  detectLaneConflicts,
  formatLaneConflictsJa,
  formatLaneLoadJa,
  summarizeLaneLoad,
} from './swimlane-conflict'

describe('detectLaneConflicts', () => {
  it('items 空 → 空配列', () => {
    expect(detectLaneConflicts([])).toEqual([])
  })

  it('1 件のみ → 重複なし', () => {
    expect(
      detectLaneConflicts([{ id: 'a', startDate: '2026-04-30', dueDate: '2026-05-02' }]),
    ).toEqual([])
  })

  it('完全重複 (両者同期間) → 1 ペア', () => {
    const r = detectLaneConflicts([
      { id: 'a', startDate: '2026-04-30', dueDate: '2026-05-02' },
      { id: 'b', startDate: '2026-04-30', dueDate: '2026-05-02' },
    ])
    expect(r).toEqual([{ a: 'a', b: 'b', overlapDays: 3 }])
  })

  it('部分重複 (1 日のみ重なる) → overlapDays=1', () => {
    const r = detectLaneConflicts([
      { id: 'a', startDate: '2026-04-30', dueDate: '2026-05-02' },
      { id: 'b', startDate: '2026-05-02', dueDate: '2026-05-04' },
    ])
    expect(r).toEqual([{ a: 'a', b: 'b', overlapDays: 1 }])
  })

  it('完全分離 → 空配列', () => {
    const r = detectLaneConflicts([
      { id: 'a', startDate: '2026-04-30', dueDate: '2026-05-02' },
      { id: 'b', startDate: '2026-05-03', dueDate: '2026-05-05' },
    ])
    expect(r).toEqual([])
  })

  it('3 件中 1 件だけ全期間重複 → 2 ペア検出', () => {
    const r = detectLaneConflicts([
      { id: 'a', startDate: '2026-04-30', dueDate: '2026-05-10' },
      { id: 'b', startDate: '2026-05-01', dueDate: '2026-05-02' },
      { id: 'c', startDate: '2026-05-04', dueDate: '2026-05-05' },
    ])
    expect(r).toHaveLength(2)
    expect(r[0]!.a).toBe('a')
    expect(r[0]!.b).toBe('b')
    expect(r[1]!.a).toBe('a')
    expect(r[1]!.b).toBe('c')
  })

  it('id 昇順で安定 sort', () => {
    const r = detectLaneConflicts([
      { id: 'z', startDate: '2026-04-30', dueDate: '2026-05-02' },
      { id: 'a', startDate: '2026-04-30', dueDate: '2026-05-02' },
    ])
    expect(r[0]!.a).toBe('a')
    expect(r[0]!.b).toBe('z')
  })

  it('startDate / dueDate 片方 null → 検出対象外', () => {
    expect(
      detectLaneConflicts([
        { id: 'a', startDate: null, dueDate: '2026-05-02' },
        { id: 'b', startDate: '2026-04-30', dueDate: '2026-05-02' },
      ]),
    ).toEqual([])
  })

  it('不正 ISO は除外', () => {
    expect(
      detectLaneConflicts([
        { id: 'a', startDate: 'bad', dueDate: '2026-05-02' },
        { id: 'b', startDate: '2026-04-30', dueDate: '2026-05-02' },
      ]),
    ).toEqual([])
  })

  it('dueDate < startDate (不正範囲) は対象外', () => {
    expect(
      detectLaneConflicts([
        { id: 'a', startDate: '2026-05-05', dueDate: '2026-05-01' },
        { id: 'b', startDate: '2026-04-30', dueDate: '2026-05-02' },
      ]),
    ).toEqual([])
  })

  it('境界 1 日のみ重複 (a.due === b.start)', () => {
    const r = detectLaneConflicts([
      { id: 'a', startDate: '2026-04-30', dueDate: '2026-05-01' },
      { id: 'b', startDate: '2026-05-01', dueDate: '2026-05-03' },
    ])
    expect(r).toEqual([{ a: 'a', b: 'b', overlapDays: 1 }])
  })
})

describe('collectConflictedItemIds', () => {
  it('空 → 空 Set', () => {
    expect(collectConflictedItemIds([]).size).toBe(0)
  })

  it('複数ペアの両 endpoint を収集 (重複は dedup)', () => {
    const ids = collectConflictedItemIds([
      { a: 'a', b: 'b', overlapDays: 1 },
      { a: 'a', b: 'c', overlapDays: 1 },
    ])
    expect(ids.has('a')).toBe(true)
    expect(ids.has('b')).toBe(true)
    expect(ids.has('c')).toBe(true)
    expect(ids.size).toBe(3)
  })
})

describe('summarizeLaneLoad', () => {
  it('空 lane → 全 0', () => {
    const r = summarizeLaneLoad([], new Map())
    expect(r).toEqual({
      itemCount: 0,
      estimateMinutesTotal: 0,
      conflictPairCount: 0,
      conflictTotalDays: 0,
    })
  })

  it('見積あり / 重複なし', () => {
    const items = [
      { id: 'a', startDate: '2026-04-30', dueDate: '2026-05-01' },
      { id: 'b', startDate: '2026-05-03', dueDate: '2026-05-04' },
    ]
    const est = new Map([
      ['a', 240],
      ['b', 240],
    ])
    const r = summarizeLaneLoad(items, est)
    expect(r.itemCount).toBe(2)
    expect(r.estimateMinutesTotal).toBe(480)
    expect(r.conflictPairCount).toBe(0)
  })

  it('見積 + 重複あり', () => {
    const items = [
      { id: 'a', startDate: '2026-04-30', dueDate: '2026-05-02' },
      { id: 'b', startDate: '2026-05-01', dueDate: '2026-05-03' },
    ]
    const est = new Map([
      ['a', 240],
      ['b', 120],
    ])
    const r = summarizeLaneLoad(items, est)
    expect(r.estimateMinutesTotal).toBe(360)
    expect(r.conflictPairCount).toBe(1)
    expect(r.conflictTotalDays).toBe(2)
  })

  it('見積 不正 (NaN / 負 / 0) は集計除外', () => {
    const items = [{ id: 'a', startDate: '2026-04-30', dueDate: '2026-05-02' }]
    const est = new Map([['a', NaN]])
    const r = summarizeLaneLoad(items, est)
    expect(r.estimateMinutesTotal).toBe(0)
  })
})

describe('formatLaneLoadJa', () => {
  it('全 0 → "0 件 / 見積なし / 重複なし"', () => {
    expect(
      formatLaneLoadJa({
        itemCount: 0,
        estimateMinutesTotal: 0,
        conflictPairCount: 0,
        conflictTotalDays: 0,
      }),
    ).toBe('0 件 / 見積なし / 重複なし')
  })

  it('見積あり / 重複なし → "5 件 / 8時間 / 重複なし" (iter809 ja-throughout)', () => {
    expect(
      formatLaneLoadJa({
        itemCount: 5,
        estimateMinutesTotal: 480,
        conflictPairCount: 0,
        conflictTotalDays: 0,
      }),
    ).toBe('5 件 / 8時間 / 重複なし')
  })

  it('見積 + 重複あり (iter809 ja-throughout)', () => {
    expect(
      formatLaneLoadJa({
        itemCount: 3,
        estimateMinutesTotal: 270,
        conflictPairCount: 2,
        conflictTotalDays: 4,
      }),
    ).toBe('3 件 / 4時間30分 / 重複 2 ペア (合計 4 日)')
  })

  it('30 分単位 (iter809 ja-throughout)', () => {
    expect(
      formatLaneLoadJa({
        itemCount: 1,
        estimateMinutesTotal: 30,
        conflictPairCount: 0,
        conflictTotalDays: 0,
      }),
    ).toBe('1 件 / 30分 / 重複なし')
  })
})

describe('formatLaneConflictsJa', () => {
  it('0 ペア → "時間重複なし"', () => {
    expect(formatLaneConflictsJa([])).toBe('時間重複なし')
  })

  it('1 ペア → "時間重複: 1 ペア (合計 3 日)"', () => {
    expect(formatLaneConflictsJa([{ a: 'a', b: 'b', overlapDays: 3 }])).toBe(
      '時間重複: 1 ペア (合計 3 日)',
    )
  })

  it('複数ペア → 合計日数', () => {
    expect(
      formatLaneConflictsJa([
        { a: 'a', b: 'b', overlapDays: 3 },
        { a: 'a', b: 'c', overlapDays: 2 },
      ]),
    ).toBe('時間重複: 2 ペア (合計 5 日)')
  })
})
