import { describe, expect, it } from 'vitest'

import {
  auditActionCategoryLabel,
  type AuditActivityEntry,
  formatAuditActivityBrief,
  formatAuditActivitySummary,
  groupAuditByActor,
  groupAuditByCategory,
} from './audit-activity'

const A = (
  action: string,
  actorId: string,
  ts: string | Date | null = '2026-04-29T12:00:00Z',
  actorType = 'user',
): AuditActivityEntry => ({ action, actorType, actorId, ts })

describe('groupAuditByCategory', () => {
  it('既知 7 カテゴリへの集約 (action-visual と同 vocabulary)', () => {
    const counts = groupAuditByCategory([
      A('create', 'u1'),
      A('update', 'u1'),
      A('set_assignees', 'u1'), // → update
      A('status_change', 'u1'), // → transition
      A('move', 'u1'), // → transition
      A('complete', 'u2'),
      A('uncomplete', 'u2'), // → reopen
      A('delete', 'u2'),
      A('bulk_delete', 'u2'), // → delete
      A('mystery_action', 'u2'), // → other
    ])
    expect(counts).toEqual({
      create: 1,
      update: 2,
      transition: 2,
      complete: 1,
      reopen: 1,
      delete: 2,
      other: 1,
    })
  })

  it('default で actorType=user のみ集計、agent は除外', () => {
    const counts = groupAuditByCategory([
      A('create', 'u1', undefined, 'user'),
      A('create', 'a1', undefined, 'agent'),
      A('create', 'u2', undefined, 'user'),
    ])
    expect(counts.create).toBe(2)
  })

  it('actorTypes=[] (空配列) で全 actorType 集計', () => {
    const counts = groupAuditByCategory(
      [A('create', 'u1', undefined, 'user'), A('create', 'a1', undefined, 'agent')],
      { actorTypes: [] },
    )
    expect(counts.create).toBe(2)
  })

  it("actorTypes=['user','agent'] で両方集計", () => {
    const counts = groupAuditByCategory(
      [
        A('create', 'u1', undefined, 'user'),
        A('create', 'a1', undefined, 'agent'),
        A('create', 'u2', undefined, 'system'),
      ],
      { actorTypes: ['user', 'agent'] },
    )
    expect(counts.create).toBe(2)
  })

  it('since 指定で ts 古い entry を除外', () => {
    const counts = groupAuditByCategory(
      [A('create', 'u1', '2026-04-22T00:00:00Z'), A('create', 'u2', '2026-04-29T00:00:00Z')],
      { since: '2026-04-25T00:00:00Z' },
    )
    expect(counts.create).toBe(1)
  })

  it('since 指定 + 不正 ts は除外', () => {
    const counts = groupAuditByCategory(
      [A('create', 'u1', null), A('create', 'u2', '2026-04-29T00:00:00Z')],
      { since: '2026-04-25T00:00:00Z' },
    )
    expect(counts.create).toBe(1)
  })

  it('since 不指定なら不正 ts も件数に入れる', () => {
    const counts = groupAuditByCategory([A('create', 'u1', null), A('create', 'u2')])
    expect(counts.create).toBe(2)
  })

  it('空 input は全 bucket 0', () => {
    expect(groupAuditByCategory([])).toEqual({
      create: 0,
      update: 0,
      transition: 0,
      complete: 0,
      reopen: 0,
      delete: 0,
      other: 0,
    })
  })

  it('Date instance も string も同 since 判定', () => {
    const since = new Date('2026-04-25T00:00:00Z')
    const counts = groupAuditByCategory(
      [A('create', 'u1', '2026-04-22T00:00:00Z'), A('create', 'u2', '2026-04-26T00:00:00Z')],
      { since },
    )
    expect(counts.create).toBe(1)
  })
})

describe('groupAuditByActor', () => {
  it('actor ごとに count を集計、insertion order 保持', () => {
    const map = groupAuditByActor([
      A('create', 'u1'),
      A('update', 'u2'),
      A('create', 'u1'),
      A('update', 'u3'),
    ])
    expect([...map.entries()]).toEqual([
      ['u1', 2],
      ['u2', 1],
      ['u3', 1],
    ])
  })

  it('default で agent は除外', () => {
    const map = groupAuditByActor([
      A('create', 'u1', undefined, 'user'),
      A('create', 'a1', undefined, 'agent'),
    ])
    expect(map.size).toBe(1)
    expect(map.get('u1')).toBe(1)
  })

  it('since 指定で範囲外を除外', () => {
    const map = groupAuditByActor(
      [A('create', 'u1', '2026-04-22T00:00:00Z'), A('create', 'u2', '2026-04-29T00:00:00Z')],
      { since: '2026-04-25T00:00:00Z' },
    )
    expect(map.size).toBe(1)
    expect(map.has('u2')).toBe(true)
  })

  it('空 input は空 Map', () => {
    expect(groupAuditByActor([]).size).toBe(0)
  })
})

describe('auditActionCategoryLabel', () => {
  it('全 7 カテゴリを日本語 label に対応付ける', () => {
    expect(auditActionCategoryLabel('create')).toBe('作成')
    expect(auditActionCategoryLabel('update')).toBe('更新')
    expect(auditActionCategoryLabel('transition')).toBe('遷移')
    expect(auditActionCategoryLabel('complete')).toBe('完了')
    expect(auditActionCategoryLabel('reopen')).toBe('完了取消')
    expect(auditActionCategoryLabel('delete')).toBe('削除')
    expect(auditActionCategoryLabel('other')).toBe('その他')
  })
})

describe('formatAuditActivitySummary', () => {
  it('既知カテゴリ順 + 0 件省略で 1 行整形', () => {
    expect(
      formatAuditActivitySummary({
        create: 12,
        update: 5,
        transition: 0,
        complete: 4,
        reopen: 0,
        delete: 1,
        other: 0,
      }),
    ).toBe('作成 12 / 更新 5 / 完了 4 / 削除 1')
  })

  it('全 0 → "0 件" sentinel', () => {
    expect(
      formatAuditActivitySummary({
        create: 0,
        update: 0,
        transition: 0,
        complete: 0,
        reopen: 0,
        delete: 0,
        other: 0,
      }),
    ).toBe('0 件')
  })
})

describe('formatAuditActivityBrief', () => {
  it('合計件数 + actor 数 + カテゴリ分布を 1 行に圧縮', () => {
    const entries = [
      A('create', 'u1'),
      A('create', 'u1'),
      A('update', 'u2'),
      A('complete', 'u2'),
      A('delete', 'u3'),
    ]
    expect(formatAuditActivityBrief(entries)).toBe(
      '活動 5 件 (3 名): 作成 2 / 更新 1 / 完了 1 / 削除 1',
    )
  })

  it('0 件は sentinel', () => {
    expect(formatAuditActivityBrief([])).toBe('活動 0 件 (該当なし)')
  })

  it('agent は default 除外なので brief は user 件のみ', () => {
    const entries = [
      A('create', 'u1', undefined, 'user'),
      A('create', 'a1', undefined, 'agent'),
      A('create', 'a2', undefined, 'agent'),
    ]
    expect(formatAuditActivityBrief(entries)).toBe('活動 1 件 (1 名): 作成 1')
  })
})
