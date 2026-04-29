import { describe, expect, it } from 'vitest'

import {
  computeWipByPriority,
  formatWipByPriorityJa,
  wipBiasKind,
  type WipByPriorityFields,
} from './wip-by-priority'

describe('computeWipByPriority', () => {
  it('returns empty when items is empty', () => {
    const r = computeWipByPriority([])
    expect(r.total).toBe(0)
    expect(r.topPriority).toBe(null)
    expect(r.byPriority).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 })
  })

  it('only counts status === "in_progress"', () => {
    const items: WipByPriorityFields[] = [
      { status: 'todo', priority: 1 },
      { status: 'done', priority: 2 },
      { status: 'blocked', priority: 3 },
      { status: 'in_progress', priority: 1 },
      { status: 'in_progress', priority: 3 },
    ]
    const r = computeWipByPriority(items)
    expect(r.total).toBe(2)
    expect(r.byPriority[1]).toBe(1)
    expect(r.byPriority[3]).toBe(1)
  })

  it('normalizes null/undefined/out-of-range priority to p4', () => {
    const items: WipByPriorityFields[] = [
      { status: 'in_progress', priority: null },
      { status: 'in_progress', priority: undefined },
      { status: 'in_progress', priority: 99 },
    ]
    const r = computeWipByPriority(items)
    expect(r.byPriority[4]).toBe(3)
  })

  it('picks topPriority by max count', () => {
    const items: WipByPriorityFields[] = [
      { status: 'in_progress', priority: 1 },
      { status: 'in_progress', priority: 3 },
      { status: 'in_progress', priority: 3 },
      { status: 'in_progress', priority: 3 },
    ]
    const r = computeWipByPriority(items)
    expect(r.topPriority).toBe(3)
  })

  it('breaks ties by lower number (higher priority preferred)', () => {
    const items: WipByPriorityFields[] = [
      { status: 'in_progress', priority: 1 },
      { status: 'in_progress', priority: 4 },
    ]
    const r = computeWipByPriority(items)
    // both = 1 each, P1 wins (lower number)
    expect(r.topPriority).toBe(1)
  })

  it('returns null topPriority for empty', () => {
    expect(computeWipByPriority([]).topPriority).toBe(null)
  })
})

describe('formatWipByPriorityJa', () => {
  it('formats empty as "WIP 0 件"', () => {
    expect(
      formatWipByPriorityJa({
        total: 0,
        byPriority: { 1: 0, 2: 0, 3: 0, 4: 0 },
        topPriority: null,
      }),
    ).toBe('WIP 0 件')
  })

  it('formats single-priority concentration with short form', () => {
    expect(
      formatWipByPriorityJa({
        total: 3,
        byPriority: { 1: 0, 2: 0, 3: 3, 4: 0 },
        topPriority: 3,
      }),
    ).toBe('WIP: 3 件 (P3: 3)')
  })

  it('formats spread across multiple priorities with full breakdown', () => {
    expect(
      formatWipByPriorityJa({
        total: 5,
        byPriority: { 1: 0, 2: 1, 3: 4, 4: 0 },
        topPriority: 3,
      }),
    ).toBe('WIP: 5 件 (P1: 0 / P2: 1 / P3: 4 / P4: 0)')
  })
})

describe('wipBiasKind', () => {
  it('returns "idle" for total=0', () => {
    expect(
      wipBiasKind({
        total: 0,
        byPriority: { 1: 0, 2: 0, 3: 0, 4: 0 },
        topPriority: null,
      }),
    ).toBe('idle')
  })

  it('returns "has-high-priority" when P1 or P2 > 0', () => {
    expect(
      wipBiasKind({
        total: 1,
        byPriority: { 1: 1, 2: 0, 3: 0, 4: 0 },
        topPriority: 1,
      }),
    ).toBe('has-high-priority')
    expect(
      wipBiasKind({
        total: 2,
        byPriority: { 1: 0, 2: 1, 3: 1, 4: 0 },
        topPriority: 2,
      }),
    ).toBe('has-high-priority')
  })

  it('returns "low-priority-only" when P3 or P4 > 0 but no high', () => {
    expect(
      wipBiasKind({
        total: 5,
        byPriority: { 1: 0, 2: 0, 3: 4, 4: 1 },
        topPriority: 3,
      }),
    ).toBe('low-priority-only')
  })
})

describe('integration: items → compute → format', () => {
  it('connects pipeline end-to-end', () => {
    const items: WipByPriorityFields[] = [
      { status: 'in_progress', priority: 1 },
      { status: 'in_progress', priority: 3 },
      { status: 'in_progress', priority: 3 },
      { status: 'todo', priority: 1 }, // excluded (todo)
      { status: 'done', priority: 2 }, // excluded (done)
    ]
    const stats = computeWipByPriority(items)
    expect(formatWipByPriorityJa(stats)).toBe('WIP: 3 件 (P1: 1 / P2: 0 / P3: 2 / P4: 0)')
    expect(wipBiasKind(stats)).toBe('has-high-priority')
  })
})
