import { describe, expect, it } from 'vitest'

import { type AgentBriefSignal, formatBriefSignalsLineJa } from './brief-signal'

describe('formatBriefSignalsLineJa (iter1333)', () => {
  const sig = (text: string): AgentBriefSignal => ({ text, tone: 'info' })

  it('空配列 → default emptyText 「記録なし」', () => {
    expect(formatBriefSignalsLineJa([])).toBe('記録なし')
  })

  it('空配列 + custom emptyText', () => {
    expect(formatBriefSignalsLineJa([], '今日の signal なし')).toBe('今日の signal なし')
  })

  it('1 件 → text のみ (区切り無し)', () => {
    expect(formatBriefSignalsLineJa([sig('overdue 2')])).toBe('overdue 2')
  })

  it('複数 → " / " 連結 (tone は落とす)', () => {
    const line = formatBriefSignalsLineJa([
      { text: '今日 MUST 3', tone: 'urgent' },
      { text: 'overdue 2', tone: 'danger' },
      { text: '点検済', tone: 'success' },
    ])
    expect(line).toBe('今日 MUST 3 / overdue 2 / 点検済')
  })
})
