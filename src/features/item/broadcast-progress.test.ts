import { describe, expect, it } from 'vitest'

import {
  isBroadcastCandidate,
  pendingBroadcastAssignees,
  summarizeBroadcastProgress,
} from './broadcast-progress'
import type { AssigneeRef } from './repository'

const alice: AssigneeRef = { actorType: 'user', actorId: 'alice' }
const bob: AssigneeRef = { actorType: 'user', actorId: 'bob' }
const carol: AssigneeRef = { actorType: 'user', actorId: 'carol' }
const ai: AssigneeRef = { actorType: 'agent', actorId: 'ai-1' }

const T1 = new Date('2026-05-19T09:00:00Z')
const T2 = new Date('2026-05-19T10:00:00Z')

describe('summarizeBroadcastProgress', () => {
  it('空 assignees → total 0', () => {
    const r = summarizeBroadcastProgress([], [])
    expect(r.total).toBe(0)
    expect(r.doneCount).toBe(0)
    expect(r.ratio).toBe(0)
    expect(r.fullyDone).toBe(false)
    expect(r.label).toBe('0/0 完了')
  })

  it('3 人 assignee + 1 人 done → 1/3', () => {
    const r = summarizeBroadcastProgress(
      [alice, bob, carol],
      [{ actorType: 'user', actorId: 'alice', doneAt: T1 }],
    )
    expect(r.total).toBe(3)
    expect(r.doneCount).toBe(1)
    expect(r.ratio).toBeCloseTo(1 / 3)
    expect(r.fullyDone).toBe(false)
    expect(r.label).toBe('1/3 完了')
    expect(r.rows.find((row) => row.ref.actorId === 'alice')?.done).toBe(true)
    expect(r.rows.find((row) => row.ref.actorId === 'bob')?.done).toBe(false)
  })

  it('全員 done → fullyDone=true', () => {
    const r = summarizeBroadcastProgress(
      [alice, bob],
      [
        { actorType: 'user', actorId: 'alice', doneAt: T1 },
        { actorType: 'user', actorId: 'bob', doneAt: T2 },
      ],
    )
    expect(r.fullyDone).toBe(true)
    expect(r.ratio).toBe(1)
  })

  it('progress に無い ref → done=false', () => {
    const r = summarizeBroadcastProgress([alice], [])
    expect(r.rows[0]?.done).toBe(false)
    expect(r.rows[0]?.doneAt).toBeNull()
  })

  it('progress にあって assignees に無い ref → 無視', () => {
    const r = summarizeBroadcastProgress(
      [alice],
      [
        { actorType: 'user', actorId: 'alice', doneAt: T1 },
        { actorType: 'user', actorId: 'ghost', doneAt: T1 },
      ],
    )
    expect(r.total).toBe(1)
    expect(r.doneCount).toBe(1)
  })

  it('同 ref の progress 重複 → 最新 doneAt 採用', () => {
    const r = summarizeBroadcastProgress(
      [alice],
      [
        { actorType: 'user', actorId: 'alice', doneAt: T1 },
        { actorType: 'user', actorId: 'alice', doneAt: T2 },
      ],
    )
    expect(r.rows[0]?.doneAt).toEqual(T2)
  })

  it('AI agent と user が mixed assignee でも判定する', () => {
    const r = summarizeBroadcastProgress(
      [alice, ai],
      [{ actorType: 'agent', actorId: 'ai-1', doneAt: T1 }],
    )
    expect(r.total).toBe(2)
    expect(r.doneCount).toBe(1)
    expect(r.rows.find((row) => row.ref.actorType === 'agent')?.done).toBe(true)
  })

  it('doneAt=null な progress row は done=false (= 取り下げ)', () => {
    const r = summarizeBroadcastProgress(
      [alice],
      [{ actorType: 'user', actorId: 'alice', doneAt: null }],
    )
    expect(r.rows[0]?.done).toBe(false)
  })
})

describe('pendingBroadcastAssignees (iter1337)', () => {
  it('一部 done → 未完了 ref のみ (表示順保持)', () => {
    const r = summarizeBroadcastProgress(
      [alice, bob, carol],
      [{ actorType: 'user', actorId: 'bob', doneAt: T1 }],
    )
    expect(pendingBroadcastAssignees(r)).toEqual([alice, carol])
  })

  it('全員 done → 空配列', () => {
    const r = summarizeBroadcastProgress(
      [alice, bob],
      [
        { actorType: 'user', actorId: 'alice', doneAt: T1 },
        { actorType: 'user', actorId: 'bob', doneAt: T2 },
      ],
    )
    expect(pendingBroadcastAssignees(r)).toEqual([])
  })

  it('全員未完了 → 全 ref', () => {
    const r = summarizeBroadcastProgress([alice, ai], [])
    expect(pendingBroadcastAssignees(r)).toEqual([alice, ai])
  })

  it('total 0 → 空配列', () => {
    expect(pendingBroadcastAssignees(summarizeBroadcastProgress([], []))).toEqual([])
  })
})

describe('isBroadcastCandidate', () => {
  it('2 人以上 → true', () => {
    expect(isBroadcastCandidate([alice, bob])).toBe(true)
    expect(isBroadcastCandidate([alice, bob, carol])).toBe(true)
  })

  it('1 人以下 → false', () => {
    expect(isBroadcastCandidate([alice])).toBe(false)
    expect(isBroadcastCandidate([])).toBe(false)
  })
})
