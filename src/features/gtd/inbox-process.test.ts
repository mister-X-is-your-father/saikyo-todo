import { describe, expect, it } from 'vitest'

import {
  classifyInboxHealthHint,
  classifyInboxItem,
  formatInboxBucketsJa,
  formatInboxHealthHintJa,
  gtdBucketLabelJa,
  gtdBucketSeverity,
  type InboxItemFields,
  summarizeInbox,
} from './inbox-process'

function mk(over: Partial<InboxItemFields> & { id: string; title: string }): InboxItemFields {
  return {
    dod: null,
    estimateMin: null,
    assigneeIds: ['me'],
    stakeholderIds: [],
    hasSubtasks: false,
    dueDate: null,
    contextTag: null,
    isReference: false,
    isSomeday: false,
    isEmptyOrUnclear: false,
    ...over,
  }
}

describe('classifyInboxItem (priority order)', () => {
  it('1: trash (isEmptyOrUnclear) が他全ての条件に優先', () => {
    const r = classifyInboxItem(
      mk({ id: 'a', title: 'a', isEmptyOrUnclear: true, isReference: true, estimateMin: 1 }),
    )
    expect(r.bucket).toBe('trash')
  })

  it('2: reference (isReference)', () => {
    const r = classifyInboxItem(mk({ id: 'a', title: 'doc', isReference: true }))
    expect(r.bucket).toBe('reference')
    expect(r.suggestedAction).toBeNull()
  })

  it('3: someday', () => {
    const r = classifyInboxItem(mk({ id: 'a', title: 'maybe', isSomeday: true }))
    expect(r.bucket).toBe('someday')
  })

  it('4: immediate — estimate <= 2 min', () => {
    const r = classifyInboxItem(mk({ id: 'a', title: 'reply', estimateMin: 2 }))
    expect(r.bucket).toBe('immediate')
    expect(r.reason).toContain('2 分')
    expect(r.suggestedAction).toBe('今すぐやる')
  })

  it('4: immediate — 1 min も該当', () => {
    expect(classifyInboxItem(mk({ id: 'a', title: 'a', estimateMin: 1 })).bucket).toBe('immediate')
  })

  it('4: not immediate — 3 min', () => {
    expect(classifyInboxItem(mk({ id: 'a', title: 'a', estimateMin: 3 })).bucket).not.toBe(
      'immediate',
    )
  })

  it('4: not immediate — estimate=0 or null', () => {
    expect(classifyInboxItem(mk({ id: 'a', title: 'a', estimateMin: 0 })).bucket).not.toBe(
      'immediate',
    )
    expect(classifyInboxItem(mk({ id: 'a', title: 'a', estimateMin: null })).bucket).not.toBe(
      'immediate',
    )
  })

  it('5: waiting-for — 担当 0 + stakeholder あり', () => {
    const r = classifyInboxItem(
      mk({ id: 'a', title: 'wait', assigneeIds: [], stakeholderIds: ['u1', 'u2'] }),
    )
    expect(r.bucket).toBe('waiting-for')
    expect(r.reason).toContain('2 件')
  })

  it('5: not waiting-for — 担当 自分 ありなら即 next-action 等へ', () => {
    const r = classifyInboxItem(
      mk({ id: 'a', title: 'mine', assigneeIds: ['me'], stakeholderIds: ['u1'] }),
    )
    expect(r.bucket).not.toBe('waiting-for')
  })

  it('6: project — hasSubtasks=true', () => {
    const r = classifyInboxItem(mk({ id: 'a', title: 'big', hasSubtasks: true }))
    expect(r.bucket).toBe('project')
    expect(r.suggestedAction).toContain('action')
  })

  it('7: scheduled — dueDate あり', () => {
    const r = classifyInboxItem(mk({ id: 'a', title: 'sched', dueDate: '2026-05-10' }))
    expect(r.bucket).toBe('scheduled')
    expect(r.reason).toContain('2026-05-10')
  })

  it('8: next-action default + context tag を reason に含む', () => {
    const r = classifyInboxItem(
      mk({ id: 'a', title: 'do x', contextTag: '@office', dod: 'final pdf' }),
    )
    expect(r.bucket).toBe('next-action')
    expect(r.reason).toContain('@office')
    expect(r.suggestedAction).toBe('final pdf')
  })

  it('優先順検証: scheduled より project が先 (subtasks 優先)', () => {
    const r = classifyInboxItem(
      mk({ id: 'a', title: 'multi', dueDate: '2026-05-10', hasSubtasks: true }),
    )
    expect(r.bucket).toBe('project')
  })

  it('優先順検証: 2-min rule は project より先', () => {
    const r = classifyInboxItem(mk({ id: 'a', title: 'quick', estimateMin: 1, hasSubtasks: true }))
    expect(r.bucket).toBe('immediate')
  })
})

describe('summarizeInbox', () => {
  it('空 items: 8 buckets 全て 0', () => {
    const r = summarizeInbox([])
    for (const k of [
      'immediate',
      'next-action',
      'project',
      'waiting-for',
      'reference',
      'someday',
      'scheduled',
      'trash',
    ] as const) {
      expect(r.counts[k]).toBe(0)
      expect(r.buckets[k]).toEqual([])
    }
  })

  it('count + bucket 配置が一致', () => {
    const items = [
      mk({ id: 'a', title: 'quick', estimateMin: 1 }),
      mk({ id: 'b', title: 'big', hasSubtasks: true }),
      mk({ id: 'c', title: 'doc', isReference: true }),
      mk({ id: 'd', title: 'plain' }),
      mk({ id: 'e', title: 'plain2' }),
    ]
    const r = summarizeInbox(items)
    expect(r.counts.immediate).toBe(1)
    expect(r.counts.project).toBe(1)
    expect(r.counts.reference).toBe(1)
    expect(r.counts['next-action']).toBe(2)
    expect(r.buckets.immediate[0]?.id).toBe('a')
  })

  it('twoMinRuleSuggestions: estimate 短い順、最大 5', () => {
    const items: InboxItemFields[] = []
    for (let i = 0; i < 8; i++) {
      items.push(mk({ id: `i${i}`, title: `t${i}`, estimateMin: 1 + (i % 2) }))
    }
    const r = summarizeInbox(items)
    expect(r.twoMinRuleSuggestions).toHaveLength(5)
    // estimate 短い順 = 1 min が先
    for (let i = 0; i < 4; i++) {
      const cur = r.twoMinRuleSuggestions[i]?.estimateMin ?? 0
      const next = r.twoMinRuleSuggestions[i + 1]?.estimateMin ?? 0
      expect(cur).toBeLessThanOrEqual(next)
    }
  })

  it('twoMinRuleSuggestions: 空 (immediate=0) なら []', () => {
    const r = summarizeInbox([mk({ id: 'a', title: 'a' })])
    expect(r.twoMinRuleSuggestions).toEqual([])
  })
})

describe('gtdBucketLabelJa', () => {
  it('8 bucket 全て Japanese label', () => {
    expect(gtdBucketLabelJa('immediate')).toBe('即実行')
    expect(gtdBucketLabelJa('next-action')).toBe('次の action')
    expect(gtdBucketLabelJa('project')).toBe('プロジェクト')
    expect(gtdBucketLabelJa('waiting-for')).toBe('関係者待ち')
    expect(gtdBucketLabelJa('reference')).toBe('参考資料')
    expect(gtdBucketLabelJa('someday')).toBe('いつか / もしかしたら')
    expect(gtdBucketLabelJa('scheduled')).toBe('予定済')
    expect(gtdBucketLabelJa('trash')).toBe('削除候補')
  })
})

describe('gtdBucketSeverity', () => {
  it('attention 軸の bucket → warn (immediate / waiting-for)', () => {
    expect(gtdBucketSeverity('immediate')).toBe('warn')
    expect(gtdBucketSeverity('waiting-for')).toBe('warn')
  })
  it('進行軸の bucket → info (next-action / project / scheduled)', () => {
    expect(gtdBucketSeverity('next-action')).toBe('info')
    expect(gtdBucketSeverity('project')).toBe('info')
    expect(gtdBucketSeverity('scheduled')).toBe('info')
  })
  it('attention 不要の bucket → muted (reference / someday / trash)', () => {
    expect(gtdBucketSeverity('reference')).toBe('muted')
    expect(gtdBucketSeverity('someday')).toBe('muted')
    expect(gtdBucketSeverity('trash')).toBe('muted')
  })
})

describe('formatInboxBucketsJa', () => {
  it('total=0 → "(空)"', () => {
    expect(formatInboxBucketsJa(summarizeInbox([]))).toBe('Inbox 0 件 (空)')
  })

  it('count 降順で bucket を連結 ("/" 区切り)', () => {
    const items: InboxItemFields[] = [
      mk({ id: 'p1', title: 'project1', hasSubtasks: true }),
      mk({ id: 'p2', title: 'project2', hasSubtasks: true }),
      mk({ id: 'p3', title: 'project3', hasSubtasks: true }),
      mk({ id: 'n1', title: 'next1' }),
      mk({ id: 'n2', title: 'next2' }),
      mk({ id: 'i1', title: 'imm', estimateMin: 2 }),
    ]
    const out = formatInboxBucketsJa(summarizeInbox(items))
    expect(out).toMatch(/^Inbox 6 件: /)
    expect(out).toContain('プロジェクト 3')
    expect(out).toContain('次の action 2')
    expect(out).toContain('即実行 1')
    // 順序: project (3) が先に出る
    expect(out.indexOf('プロジェクト')).toBeLessThan(out.indexOf('次の action'))
  })
})

describe('classifyInboxHealthHint', () => {
  it('総数 0 → idle', () => {
    const r = summarizeInbox([])
    expect(classifyInboxHealthHint(r)).toBe('idle')
  })

  it('waiting-for >= 5 → severe', () => {
    const items: InboxItemFields[] = []
    for (let i = 0; i < 5; i++) {
      // waiting-for = assignee 0 + stakeholder >= 1
      items.push(
        mk({
          id: `w${i}`,
          title: `w${i}`,
          assigneeIds: [],
          stakeholderIds: ['someone'],
        }),
      )
    }
    const r = summarizeInbox(items)
    expect(classifyInboxHealthHint(r)).toBe('severe')
  })

  it('total >= 100 → severe', () => {
    const items: InboxItemFields[] = []
    for (let i = 0; i < 100; i++) {
      items.push(mk({ id: `n${i}`, title: `t${i}` }))
    }
    const r = summarizeInbox(items)
    expect(classifyInboxHealthHint(r)).toBe('severe')
  })

  it('total >= 30 で waiting-for < 5 → moderate', () => {
    const items: InboxItemFields[] = []
    for (let i = 0; i < 30; i++) {
      items.push(mk({ id: `n${i}`, title: `t${i}` }))
    }
    const r = summarizeInbox(items)
    expect(classifyInboxHealthHint(r)).toBe('moderate')
  })

  it('immediate >= 5 → moderate', () => {
    const items: InboxItemFields[] = []
    for (let i = 0; i < 5; i++) {
      // immediate = estimateMin <= 2 で 2-min rule 候補
      items.push(mk({ id: `i${i}`, title: `t${i}`, estimateMin: 1 }))
    }
    const r = summarizeInbox(items)
    expect(classifyInboxHealthHint(r)).toBe('moderate')
  })

  it('健全範囲 → mild', () => {
    const items = [
      mk({ id: '1', title: 'a' }),
      mk({ id: '2', title: 'b' }),
      mk({ id: '3', title: 'c' }),
    ]
    const r = summarizeInbox(items)
    expect(classifyInboxHealthHint(r)).toBe('mild')
  })
})

describe('formatInboxHealthHintJa', () => {
  it('idle / mild / moderate / severe を 1 単語で返す', () => {
    const empty = summarizeInbox([])
    expect(formatInboxHealthHintJa(empty)).toBe('空 (process 済)')

    const items: InboxItemFields[] = []
    for (let i = 0; i < 100; i++) items.push(mk({ id: `n${i}`, title: `t${i}` }))
    const sev = summarizeInbox(items)
    expect(formatInboxHealthHintJa(sev)).toBe('要 process')
  })
})
