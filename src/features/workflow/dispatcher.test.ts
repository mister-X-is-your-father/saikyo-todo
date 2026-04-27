/**
 * Phase 6.15 iter152: dispatcher の matcher 単体テスト (純関数中心)。
 * findItemEventMatchingWorkflows は実 Supabase 経路だが、本テストでは
 * 純関数 (isItemEventTrigger / itemMatchesFilter) のみをまず固める。
 */
import { describe, expect, it } from 'vitest'

import type { Item } from '@/features/item/schema'

import { isItemEventTrigger, itemMatchesFilter } from './dispatcher'

describe('isItemEventTrigger', () => {
  it('item-event trigger は true', () => {
    expect(isItemEventTrigger({ kind: 'item-event', event: 'create', filter: {} })).toBe(true)
  })

  it('manual / cron / webhook は false', () => {
    expect(isItemEventTrigger({ kind: 'manual' })).toBe(false)
    expect(isItemEventTrigger({ kind: 'cron', cron: '0 9 * * *' })).toBe(false)
    expect(isItemEventTrigger({ kind: 'webhook', secret: 'xxxxxxxx' })).toBe(false)
  })

  it('未知の event 名は false', () => {
    expect(isItemEventTrigger({ kind: 'item-event', event: 'unknown' })).toBe(false)
  })

  it('null / 文字列 / 配列は false', () => {
    expect(isItemEventTrigger(null)).toBe(false)
    expect(isItemEventTrigger('not an object')).toBe(false)
    expect(isItemEventTrigger([])).toBe(false)
  })
})

function makeItem(overrides: Partial<Item> = {}): Item {
  const base = {
    id: 'item-1',
    workspaceId: 'ws-1',
    title: 't',
    description: '',
    status: 'todo',
    isMust: false,
    dod: null,
    priority: 4,
    dueDate: null,
    dueTime: null,
    scheduledFor: null,
    startDate: null,
    baselineStartDate: null,
    baselineEndDate: null,
    parentId: null,
    parentPath: null,
    keyResultId: null,
    sprintId: null,
    position: 'a0',
    tagIds: [],
    archivedAt: null,
    deletedAt: null,
    doneAt: null,
    completedAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByActorType: 'user',
    createdByActorId: 'u-1',
  }
  return { ...base, ...overrides } as unknown as Item
}

describe('itemMatchesFilter', () => {
  it('filter 空は常に true', () => {
    expect(itemMatchesFilter(makeItem(), {})).toBe(true)
  })

  it('isMust=true が一致するときだけ true', () => {
    expect(itemMatchesFilter(makeItem({ isMust: true }), { isMust: true })).toBe(true)
    expect(itemMatchesFilter(makeItem({ isMust: false }), { isMust: true })).toBe(false)
  })

  it('複数 filter は AND', () => {
    const it1 = makeItem({ isMust: true, status: 'todo' })
    expect(itemMatchesFilter(it1, { isMust: true, status: 'todo' })).toBe(true)
    expect(itemMatchesFilter(it1, { isMust: true, status: 'done' })).toBe(false)
  })

  it('item に存在しない key は undefined と扱う (一致しない)', () => {
    expect(itemMatchesFilter(makeItem(), { somethingExtra: 'x' })).toBe(false)
  })
})
