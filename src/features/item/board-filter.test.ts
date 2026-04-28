import { describe, expect, it } from 'vitest'

import { applyBoardFilters } from './board-filter'
import type { Item } from './schema'

function item(overrides: Partial<Item>): Item {
  return {
    id: 'aaaa',
    workspaceId: 'ws',
    title: 't',
    description: '',
    status: 'todo',
    priority: 4,
    isMust: false,
    parentItemId: null,
    parentPath: '',
    position: 'm',
    sprintId: null,
    keyResultId: null,
    dueDate: null,
    startDate: null,
    scheduledFor: null,
    dod: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    archivedAt: null,
    doneAt: null,
    version: 1,
    createdBy: 'u',
    ...overrides,
  } as unknown as Item
}

const I = (id: string, overrides: Partial<Item> = {}) => item({ id, ...overrides })

describe('applyBoardFilters', () => {
  it('全 default フィルタは全件を返す (deletedAt なし)', () => {
    const items = [I('a'), I('b'), I('c')]
    const r = applyBoardFilters({
      items,
      must: false,
      statusFilter: null,
      sprintFilter: null,
      activeSprintId: null,
    })
    expect(r).toHaveLength(3)
  })

  it('deletedAt あり item は常に除外', () => {
    const items = [I('a'), I('b', { deletedAt: new Date() }), I('c')]
    const r = applyBoardFilters({
      items,
      must: false,
      statusFilter: null,
      sprintFilter: null,
      activeSprintId: null,
    })
    expect(r.map((i) => i.id)).toEqual(['a', 'c'])
  })

  it('must=true は isMust=true のみ', () => {
    const items = [I('a'), I('b', { isMust: true }), I('c')]
    const r = applyBoardFilters({
      items,
      must: true,
      statusFilter: null,
      sprintFilter: null,
      activeSprintId: null,
    })
    expect(r.map((i) => i.id)).toEqual(['b'])
  })

  it('statusFilter は同 status のみ通す', () => {
    const items = [I('a', { status: 'todo' }), I('b', { status: 'done' }), I('c')]
    const r = applyBoardFilters({
      items,
      must: false,
      statusFilter: 'done',
      sprintFilter: null,
      activeSprintId: null,
    })
    expect(r.map((i) => i.id)).toEqual(['b'])
  })

  it("sprintFilter='active' は activeSprintId 一致のみ", () => {
    const items = [
      I('a', { sprintId: 'sp-1' }),
      I('b', { sprintId: 'sp-2' }),
      I('c', { sprintId: null }),
    ]
    const r = applyBoardFilters({
      items,
      must: false,
      statusFilter: null,
      sprintFilter: 'active',
      activeSprintId: 'sp-1',
    })
    expect(r.map((i) => i.id)).toEqual(['a'])
  })

  it("sprintFilter='active' で activeSprintId が null なら全除外", () => {
    const items = [I('a', { sprintId: 'sp-1' }), I('b', { sprintId: null })]
    const r = applyBoardFilters({
      items,
      must: false,
      statusFilter: null,
      sprintFilter: 'active',
      activeSprintId: null,
    })
    expect(r).toHaveLength(0)
  })

  it("sprintFilter='none' は sprintId が falsy のみ", () => {
    const items = [
      I('a', { sprintId: 'sp-1' }),
      I('b', { sprintId: null }),
      I('c', { sprintId: '' as unknown as string }),
    ]
    const r = applyBoardFilters({
      items,
      must: false,
      statusFilter: null,
      sprintFilter: 'none',
      activeSprintId: null,
    })
    expect(r.map((i) => i.id)).toEqual(['b', 'c'])
  })

  it('sprintFilter が任意 uuid なら同 sprintId のみ', () => {
    const items = [
      I('a', { sprintId: 'sp-1' }),
      I('b', { sprintId: 'sp-2' }),
      I('c', { sprintId: null }),
    ]
    const r = applyBoardFilters({
      items,
      must: false,
      statusFilter: null,
      sprintFilter: 'sp-2',
      activeSprintId: null,
    })
    expect(r.map((i) => i.id)).toEqual(['b'])
  })

  it("sprintFilter が空文字 '' は無条件パス (null と同義)", () => {
    const items = [I('a', { sprintId: 'sp-1' }), I('b')]
    const r = applyBoardFilters({
      items,
      must: false,
      statusFilter: null,
      sprintFilter: '',
      activeSprintId: null,
    })
    expect(r).toHaveLength(2)
  })

  it('複数フィルタを AND で合成 (must + status + sprint)', () => {
    const items = [
      I('a', { isMust: true, status: 'todo', sprintId: 'sp-1' }),
      I('b', { isMust: true, status: 'done', sprintId: 'sp-1' }),
      I('c', { isMust: false, status: 'todo', sprintId: 'sp-1' }),
      I('d', { isMust: true, status: 'todo', sprintId: 'sp-2' }),
    ]
    const r = applyBoardFilters({
      items,
      must: true,
      statusFilter: 'todo',
      sprintFilter: 'sp-1',
      activeSprintId: null,
    })
    expect(r.map((i) => i.id)).toEqual(['a'])
  })

  it('元配列を mutate しない (filter は新配列)', () => {
    const items = [I('a'), I('b', { deletedAt: new Date() })]
    applyBoardFilters({
      items,
      must: false,
      statusFilter: null,
      sprintFilter: null,
      activeSprintId: null,
    })
    expect(items).toHaveLength(2)
  })
})
