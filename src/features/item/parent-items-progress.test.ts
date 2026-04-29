import { describe, expect, it } from 'vitest'

import { uuidToLabel } from '@/lib/db/ltree-path'

import {
  formatParentItemsProgressBriefJa,
  pickIncompleteParentItems,
} from './parent-items-progress'

const NOW = new Date('2026-04-29T00:00:00Z')

const PARENT_A = '00000000-0000-0000-0000-00000000aaaa'
const PARENT_A_FULL = uuidToLabel(PARENT_A)
const PARENT_B = '00000000-0000-0000-0000-00000000bbbb'
const PARENT_B_FULL = uuidToLabel(PARENT_B)

interface TestItem {
  id: string
  title: string
  parentPath: string
  status: string | null | undefined
  deletedAt?: Date | null
}

const item = (id: string, overrides: Partial<TestItem> = {}): TestItem => ({
  id,
  title: `T-${id}`,
  parentPath: '',
  status: 'todo',
  deletedAt: null,
  ...overrides,
})

describe('pickIncompleteParentItems', () => {
  it('items 空 → []', () => {
    expect(pickIncompleteParentItems([])).toEqual([])
  })

  it('子ゼロの parent (= 末端) は除外', () => {
    const r = pickIncompleteParentItems([item(PARENT_A, { title: 'lonely' })])
    expect(r).toEqual([])
  })

  it('1 parent + 子 5 (うち done 2) → 1 entry', () => {
    const items = [
      item(PARENT_A, { title: 'parent-A' }),
      item('c1', { parentPath: PARENT_A_FULL, status: 'done' }),
      item('c2', { parentPath: PARENT_A_FULL, status: 'done' }),
      item('c3', { parentPath: PARENT_A_FULL, status: 'todo' }),
      item('c4', { parentPath: PARENT_A_FULL, status: 'in_progress' }),
      item('c5', { parentPath: PARENT_A_FULL, status: 'blocked' }),
    ]
    const r = pickIncompleteParentItems(items)
    expect(r).toHaveLength(1)
    expect(r[0]?.parent.id).toBe(PARENT_A)
    expect(r[0]?.progress.total).toBe(5)
    expect(r[0]?.progress.done).toBe(2)
    expect(r[0]?.progress.pctDone).toBe(40)
    expect(r[0]?.progress.isComplete).toBe(false)
  })

  it('全 done parent (isComplete) は除外', () => {
    const r = pickIncompleteParentItems([
      item(PARENT_A, { title: 'done-parent' }),
      item('c1', { parentPath: PARENT_A_FULL, status: 'done' }),
      item('c2', { parentPath: PARENT_A_FULL, status: 'done' }),
    ])
    expect(r).toEqual([])
  })

  it('parent.deletedAt → 除外', () => {
    const r = pickIncompleteParentItems([
      item(PARENT_A, { title: 'deleted', deletedAt: NOW }),
      item('c1', { parentPath: PARENT_A_FULL, status: 'todo' }),
    ])
    expect(r).toEqual([])
  })

  it('複数 parent → pctDone 昇順 (低進捗が先)', () => {
    const r = pickIncompleteParentItems([
      // A: 10% (1/10)
      item(PARENT_A, { title: 'A' }),
      ...Array.from({ length: 9 }, (_, i) =>
        item(`a${i}`, { parentPath: PARENT_A_FULL, status: 'todo' }),
      ),
      item('aDone', { parentPath: PARENT_A_FULL, status: 'done' }),
      // B: 60% (6/10)
      item(PARENT_B, { title: 'B' }),
      ...Array.from({ length: 4 }, (_, i) =>
        item(`b${i}`, { parentPath: PARENT_B_FULL, status: 'todo' }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        item(`bDone${i}`, { parentPath: PARENT_B_FULL, status: 'done' }),
      ),
    ])
    expect(r).toHaveLength(2)
    expect(r[0]?.parent.id).toBe(PARENT_A)
    expect(r[0]?.progress.pctDone).toBe(10)
    expect(r[1]?.parent.id).toBe(PARENT_B)
    expect(r[1]?.progress.pctDone).toBe(60)
  })

  it('同 pctDone は title 昇順 (ja)', () => {
    const r = pickIncompleteParentItems([
      item(PARENT_A, { title: 'りんご' }),
      item('a1', { parentPath: PARENT_A_FULL, status: 'todo' }),
      item('a2', { parentPath: PARENT_A_FULL, status: 'done' }),
      item(PARENT_B, { title: 'あんず' }),
      item('b1', { parentPath: PARENT_B_FULL, status: 'todo' }),
      item('b2', { parentPath: PARENT_B_FULL, status: 'done' }),
    ])
    expect(r.map((e) => e.parent.id)).toEqual([PARENT_B, PARENT_A]) // あんず → りんご
  })
})

describe('formatParentItemsProgressBriefJa', () => {
  it('空 → "進行中の案件 0 件"', () => {
    expect(formatParentItemsProgressBriefJa([])).toBe('進行中の案件 0 件')
  })

  it('1 件 → "進行中: A 30% (3/10)"', () => {
    expect(
      formatParentItemsProgressBriefJa([
        {
          parent: item(PARENT_A, { title: 'リリース準備' }),
          progress: {
            total: 10,
            done: 3,
            inProgress: 0,
            blocked: 0,
            todo: 7,
            cancelled: 0,
            unknown: 0,
            pctDone: 30,
            isComplete: false,
          },
        },
      ]),
    ).toBe('進行中: リリース準備 30% (3/10)')
  })

  it('limit 超過 → "他 K 件" tail', () => {
    const entries = ['A', 'B', 'C', 'D', 'E'].map((title, i) => ({
      parent: item(`p${i}`, { title }),
      progress: {
        total: 10,
        done: i,
        inProgress: 0,
        blocked: 0,
        todo: 10 - i,
        cancelled: 0,
        unknown: 0,
        pctDone: i * 10,
        isComplete: false,
      },
    }))
    expect(formatParentItemsProgressBriefJa(entries, 3)).toBe(
      '進行中: A 0% (0/10) / B 10% (1/10) / C 20% (2/10) / 他 2 件',
    )
  })

  it('title 空 → "(無題)"', () => {
    expect(
      formatParentItemsProgressBriefJa([
        {
          parent: item(PARENT_A, { title: '' }),
          progress: {
            total: 5,
            done: 1,
            inProgress: 0,
            blocked: 0,
            todo: 4,
            cancelled: 0,
            unknown: 0,
            pctDone: 20,
            isComplete: false,
          },
        },
      ]),
    ).toBe('進行中: (無題) 20% (1/5)')
  })
})
