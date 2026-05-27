import { describe, expect, it } from 'vitest'

import { type WaitingForState } from './schema'
import { buildWaitingReminderMessage } from './waiting-reminder-message'

function state(over: Partial<WaitingForState> = {}): WaitingForState {
  return {
    kind: 'internal',
    targetUserId: '00000000-0000-0000-0000-000000000001',
    targetLabel: '田中さん',
    requestedAt: '2026-05-01T00:00:00.000Z',
    ...over,
  } as WaitingForState
}

describe('buildWaitingReminderMessage', () => {
  it('依頼先 + 経過日数 を本文に', () => {
    const m = buildWaitingReminderMessage({
      itemTitle: '見積書の確認',
      waitingFor: state(),
      daysElapsed: 3,
    })
    expect(m.title).toBe('連絡待ちリマインド: 見積書の確認')
    expect(m.body).toBe('「見積書の確認」 は 田中さん からの返答待ちです (依頼から 3 日経過)。')
  })

  it('daysElapsed 0 → 本日依頼', () => {
    const m = buildWaitingReminderMessage({
      itemTitle: 'X',
      waitingFor: state(),
      daysElapsed: 0,
    })
    expect(m.body).toContain('(本日依頼)')
  })

  it('itemUrl があれば改行して付与', () => {
    const m = buildWaitingReminderMessage({
      itemTitle: 'X',
      waitingFor: state(),
      daysElapsed: 1,
      itemUrl: 'https://todo.example/w/1/item/abc',
    })
    expect(m.body.endsWith('\nhttps://todo.example/w/1/item/abc')).toBe(true)
  })

  it('targetLabel 空 → 「相手」 fallback', () => {
    const m = buildWaitingReminderMessage({
      itemTitle: 'X',
      waitingFor: state({ targetLabel: '   ' }),
      daysElapsed: 2,
    })
    expect(m.body).toContain('相手 からの返答待ち')
  })

  it('長い title は title で truncate (本文はフル)', () => {
    const long = 'あ'.repeat(80)
    const m = buildWaitingReminderMessage({
      itemTitle: long,
      waitingFor: state(),
      daysElapsed: 1,
    })
    expect(m.title.endsWith('…')).toBe(true)
    expect(m.title.length).toBeLessThan(long.length)
    expect(m.body).toContain(long) // 本文は省略しない
  })

  it('external の依頼先 label も同様に使う', () => {
    const m = buildWaitingReminderMessage({
      itemTitle: '請求書',
      waitingFor: {
        kind: 'external',
        targetContactId: '00000000-0000-0000-0000-000000000009',
        targetLabel: '取引先A',
        requestedAt: '2026-05-01T00:00:00.000Z',
      } as WaitingForState,
      daysElapsed: 5,
    })
    expect(m.body).toContain('取引先A からの返答待ち')
  })
})
