import { describe, expect, it } from 'vitest'

import {
  type CapacityRebalanceMemberInput,
  formatRebalanceSuggestionJa,
  suggestCapacityRebalance,
} from './capacity-rebalance'
import type { CapacityLoadStatus, MemberCapacityLoad } from './member-capacity'
import type { TeamCapacityMember } from './team-capacity'

function member(actorId: string, displayName?: string): TeamCapacityMember {
  return { actorType: 'user', actorId, displayName: displayName ?? null }
}

function load(remainingMinutes: number, loadStatus: CapacityLoadStatus): MemberCapacityLoad {
  return {
    capacityMinutes: 480,
    usedMinutes: 480 - remainingMinutes,
    remainingMinutes,
    utilizationPct: 0,
    totalItemCount: 0,
    estimatedItemCount: 0,
    unestimatedCount: 0,
    doneItemCount: 0,
    loadStatus,
  }
}

function row(
  actorId: string,
  remainingMinutes: number,
  loadStatus: CapacityLoadStatus,
): CapacityRebalanceMemberInput {
  return { member: member(actorId), load: load(remainingMinutes, loadStatus) }
}

describe('suggestCapacityRebalance', () => {
  it('overload なし → 提案なし', () => {
    expect(suggestCapacityRebalance([row('a', 100, 'free'), row('b', 50, 'comfortable')])).toEqual(
      [],
    )
  })

  it('donor なし → 提案なし', () => {
    expect(suggestCapacityRebalance([row('a', -60, 'overloaded')])).toEqual([])
  })

  it('1 overload → 1 donor に超過分を移管', () => {
    const s = suggestCapacityRebalance([row('a', -60, 'overloaded'), row('b', 100, 'free')])
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ minutes: 60 })
    expect(s[0]!.from.actorId).toBe('a')
    expect(s[0]!.to.actorId).toBe('b')
  })

  it('超過 > donor slack → 複数 donor に分配 (slack 多い順)', () => {
    const s = suggestCapacityRebalance([
      row('over', -120, 'overloaded'),
      row('d1', 100, 'free'),
      row('d2', 30, 'comfortable'),
    ])
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({ minutes: 100 }) // slack 多い d1 から
    expect(s[0]!.to.actorId).toBe('d1')
    expect(s[1]).toMatchObject({ minutes: 20 }) // 残 20 を d2
    expect(s[1]!.to.actorId).toBe('d2')
  })

  it('donor slack は逐次減算され 2 人目 overload に引き継ぐ', () => {
    const s = suggestCapacityRebalance([
      row('o1', -80, 'overloaded'),
      row('o2', -50, 'overloaded'),
      row('d', 100, 'free'),
    ])
    // o1 (超過大) が先、d slack 100 → o1 80 移管、残 20 → o2 に 20 だけ
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({ minutes: 80 })
    expect(s[0]!.from.actorId).toBe('o1')
    expect(s[1]).toMatchObject({ minutes: 20 })
    expect(s[1]!.from.actorId).toBe('o2')
  })

  it('tight / overloaded member は donor にしない (remaining>0 でも)', () => {
    const s = suggestCapacityRebalance([row('o', -30, 'overloaded'), row('t', 10, 'tight')])
    expect(s).toEqual([])
  })
})

describe('formatRebalanceSuggestionJa', () => {
  it('displayName を使い分数を ja 整形', () => {
    const s = {
      from: member('a', '田中'),
      to: member('b', '佐藤'),
      minutes: 90,
    }
    expect(formatRebalanceSuggestionJa(s)).toBe('田中 → 佐藤: 1時間30分 移管')
  })
  it('displayName 無しは actorId fallback', () => {
    const s = { from: member('u-a'), to: member('u-b'), minutes: 45 }
    expect(formatRebalanceSuggestionJa(s)).toBe('u-a → u-b: 45分 移管')
  })
})
