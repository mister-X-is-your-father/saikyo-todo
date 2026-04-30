/**
 * iter470 swim-lane conflict detection の unit test。pure helper のみ、DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  collectConflictedItemIds,
  detectLaneConflicts,
  formatLaneConflictsJa,
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
