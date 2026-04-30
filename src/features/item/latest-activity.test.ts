/**
 * iter463 latest-activity の unit test。pure helper のみ、DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import { uuidToLabel } from '@/lib/db/ltree-path'

import { findLatestUpdatedAt, formatLatestActivityJa } from './latest-activity'

const PARENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CHILD_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const GRAND_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const SIBLING_OUTSIDE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

const PARENT_LABEL = uuidToLabel(PARENT_ID)
const CHILD_LABEL = uuidToLabel(CHILD_ID)

describe('findLatestUpdatedAt', () => {
  it('parent のみ + 子孫なし → parent.updatedAt を返す', () => {
    const parentTs = new Date('2026-04-30T10:00:00Z')
    const r = findLatestUpdatedAt({ id: PARENT_ID, updatedAt: parentTs }, PARENT_LABEL, [])
    expect(r?.toISOString()).toBe(parentTs.toISOString())
  })

  it('子孫の方が新しい → 子孫の updatedAt を返す', () => {
    const parentTs = new Date('2026-04-29T10:00:00Z')
    const childTs = new Date('2026-04-30T15:00:00Z')
    const r = findLatestUpdatedAt({ id: PARENT_ID, updatedAt: parentTs }, PARENT_LABEL, [
      { id: CHILD_ID, parentPath: PARENT_LABEL, updatedAt: childTs },
    ])
    expect(r?.toISOString()).toBe(childTs.toISOString())
  })

  it('parent の方が新しい → parent.updatedAt を返す', () => {
    const parentTs = new Date('2026-04-30T15:00:00Z')
    const childTs = new Date('2026-04-30T10:00:00Z')
    const r = findLatestUpdatedAt({ id: PARENT_ID, updatedAt: parentTs }, PARENT_LABEL, [
      { id: CHILD_ID, parentPath: PARENT_LABEL, updatedAt: childTs },
    ])
    expect(r?.toISOString()).toBe(parentTs.toISOString())
  })

  it('孫 (2 階層) の方が最新 → 孫の updatedAt を返す', () => {
    const parentTs = new Date('2026-04-29T10:00:00Z')
    const childTs = new Date('2026-04-29T15:00:00Z')
    const grandTs = new Date('2026-04-30T18:00:00Z')
    const r = findLatestUpdatedAt({ id: PARENT_ID, updatedAt: parentTs }, PARENT_LABEL, [
      { id: CHILD_ID, parentPath: PARENT_LABEL, updatedAt: childTs },
      { id: GRAND_ID, parentPath: `${PARENT_LABEL}.${CHILD_LABEL}`, updatedAt: grandTs },
    ])
    expect(r?.toISOString()).toBe(grandTs.toISOString())
  })

  it('deletedAt なし子孫だけ集計 (deleted は除外)', () => {
    const parentTs = new Date('2026-04-29T10:00:00Z')
    const liveChildTs = new Date('2026-04-30T10:00:00Z')
    const deletedChildTs = new Date('2026-04-30T20:00:00Z')
    const r = findLatestUpdatedAt({ id: PARENT_ID, updatedAt: parentTs }, PARENT_LABEL, [
      { id: CHILD_ID, parentPath: PARENT_LABEL, updatedAt: liveChildTs },
      {
        id: GRAND_ID,
        parentPath: PARENT_LABEL,
        updatedAt: deletedChildTs,
        deletedAt: new Date('2026-04-30T21:00:00Z'),
      },
    ])
    expect(r?.toISOString()).toBe(liveChildTs.toISOString())
  })

  it('parent の id と一致する candidate (parent 自身が混入) は除外', () => {
    const parentTs = new Date('2026-04-29T10:00:00Z')
    const r = findLatestUpdatedAt({ id: PARENT_ID, updatedAt: parentTs }, PARENT_LABEL, [
      { id: PARENT_ID, parentPath: '', updatedAt: new Date('2026-05-01T00:00:00Z') },
    ])
    expect(r?.toISOString()).toBe(parentTs.toISOString())
  })

  it('別 subtree の Item (parentFullPath で始まらない) は除外', () => {
    const parentTs = new Date('2026-04-29T10:00:00Z')
    const r = findLatestUpdatedAt({ id: PARENT_ID, updatedAt: parentTs }, PARENT_LABEL, [
      {
        id: SIBLING_OUTSIDE_ID,
        parentPath: 'someotherpath',
        updatedAt: new Date('2026-05-01T00:00:00Z'),
      },
    ])
    expect(r?.toISOString()).toBe(parentTs.toISOString())
  })

  it('updatedAt が null / 不正 ISO の candidate は集計から除外', () => {
    const parentTs = new Date('2026-04-30T10:00:00Z')
    const r = findLatestUpdatedAt({ id: PARENT_ID, updatedAt: parentTs }, PARENT_LABEL, [
      { id: CHILD_ID, parentPath: PARENT_LABEL, updatedAt: null },
      { id: GRAND_ID, parentPath: PARENT_LABEL, updatedAt: 'not-a-date' },
    ])
    expect(r?.toISOString()).toBe(parentTs.toISOString())
  })

  it('parent.updatedAt が null + 子孫もなし → null', () => {
    const r = findLatestUpdatedAt({ id: PARENT_ID, updatedAt: null }, PARENT_LABEL, [])
    expect(r).toBeNull()
  })

  it('updatedAt は ISO string でも Date でも受け付ける', () => {
    const r = findLatestUpdatedAt(
      { id: PARENT_ID, updatedAt: '2026-04-30T10:00:00Z' },
      PARENT_LABEL,
      [{ id: CHILD_ID, parentPath: PARENT_LABEL, updatedAt: '2026-04-30T15:00:00Z' }],
    )
    expect(r?.toISOString()).toBe(new Date('2026-04-30T15:00:00Z').toISOString())
  })
})

describe('formatLatestActivityJa', () => {
  const now = new Date('2026-04-30T12:00:00Z')
  const fakeFormatter = (d: Date, n: Date): string => {
    const diffMin = Math.floor((n.getTime() - d.getTime()) / 60000)
    return `${diffMin} 分前`
  }

  it('null → "最終更新なし"', () => {
    expect(formatLatestActivityJa(null, now, fakeFormatter)).toBe('最終更新なし')
  })

  it('5 分前 (formatRelativeTime mock)', () => {
    const d = new Date('2026-04-30T11:55:00Z')
    expect(formatLatestActivityJa(d, now, fakeFormatter)).toBe('最終更新: 5 分前')
  })
})
