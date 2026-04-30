/**
 * iter474 group-assignees pure helper の unit test。DB 非依存。
 */
import { describe, expect, it } from 'vitest'

import { type AssigneeRow, groupAssigneesByItemId } from './group-assignees'

describe('groupAssigneesByItemId', () => {
  it('空配列 → 空 record', () => {
    expect(groupAssigneesByItemId([])).toEqual({})
  })

  it('1 item 1 assignee → key 1 件 / list 1 件', () => {
    const rows: AssigneeRow[] = [{ itemId: 'i1', actorType: 'user', actorId: 'u1' }]
    expect(groupAssigneesByItemId(rows)).toEqual({
      i1: [{ actorType: 'user', actorId: 'u1' }],
    })
  })

  it('1 item 複数 assignee → 同 key の list に push 順序保持', () => {
    const rows: AssigneeRow[] = [
      { itemId: 'i1', actorType: 'user', actorId: 'u1' },
      { itemId: 'i1', actorType: 'user', actorId: 'u2' },
      { itemId: 'i1', actorType: 'agent', actorId: 'a1' },
    ]
    expect(groupAssigneesByItemId(rows)).toEqual({
      i1: [
        { actorType: 'user', actorId: 'u1' },
        { actorType: 'user', actorId: 'u2' },
        { actorType: 'agent', actorId: 'a1' },
      ],
    })
  })

  it('複数 item → 各 key 別 list に分離', () => {
    const rows: AssigneeRow[] = [
      { itemId: 'i1', actorType: 'user', actorId: 'u1' },
      { itemId: 'i2', actorType: 'user', actorId: 'u2' },
      { itemId: 'i1', actorType: 'user', actorId: 'u3' },
    ]
    const grouped = groupAssigneesByItemId(rows)
    expect(grouped.i1).toEqual([
      { actorType: 'user', actorId: 'u1' },
      { actorType: 'user', actorId: 'u3' },
    ])
    expect(grouped.i2).toEqual([{ actorType: 'user', actorId: 'u2' }])
  })

  it('itemId が同じで actorType / actorId 完全一致 row → 重複保持 (caller 責任で de-dup)', () => {
    const rows: AssigneeRow[] = [
      { itemId: 'i1', actorType: 'user', actorId: 'u1' },
      { itemId: 'i1', actorType: 'user', actorId: 'u1' },
    ]
    expect(groupAssigneesByItemId(rows)).toEqual({
      i1: [
        { actorType: 'user', actorId: 'u1' },
        { actorType: 'user', actorId: 'u1' },
      ],
    })
  })

  it('itemId に欠損が無いことを caller に強制 (= 入力 row.itemId を 100% trust)', () => {
    const rows: AssigneeRow[] = [
      { itemId: '', actorType: 'user', actorId: 'u1' },
      { itemId: 'i1', actorType: 'user', actorId: 'u2' },
    ]
    const grouped = groupAssigneesByItemId(rows)
    expect(grouped['']).toEqual([{ actorType: 'user', actorId: 'u1' }])
    expect(grouped.i1).toEqual([{ actorType: 'user', actorId: 'u2' }])
  })
})
