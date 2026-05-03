import { describe, expect, it } from 'vitest'

import { buildDateRangeAria } from './date-range-aria'

describe('buildDateRangeAria', () => {
  it('value 空 → emptyLabel をそのまま返す', () => {
    expect(
      buildDateRangeAria({
        emptyLabel: 'Sprint 開始日 (必須、終了日以前)',
        fieldName: 'Sprint 開始日',
        value: '',
        otherFieldName: '終了日',
        otherValue: '2026-05-10',
        position: 'start',
        isInvalid: false,
      }),
    ).toBe('Sprint 開始日 (必須、終了日以前)')
  })

  it('start position で isInvalid → 「より後で不正」', () => {
    expect(
      buildDateRangeAria({
        emptyLabel: '空',
        fieldName: 'Sprint 開始日',
        value: '2026-05-15',
        otherFieldName: '終了日',
        otherValue: '2026-05-10',
        position: 'start',
        isInvalid: true,
      }),
    ).toBe('Sprint 開始日 (現在: 2026-05-15、終了日 2026-05-10 より後で不正)')
  })

  it('end position で isInvalid → 「より前で不正」', () => {
    expect(
      buildDateRangeAria({
        emptyLabel: '空',
        fieldName: 'Sprint 終了日',
        value: '2026-05-05',
        otherFieldName: '開始日',
        otherValue: '2026-05-10',
        position: 'end',
        isInvalid: true,
      }),
    ).toBe('Sprint 終了日 (現在: 2026-05-05、開始日 2026-05-10 より前で不正)')
  })

  it('valid (isInvalid=false) → 「現在: <value>」 のみ', () => {
    expect(
      buildDateRangeAria({
        emptyLabel: '空',
        fieldName: 'Goal 開始日',
        value: '2026-01-01',
        otherFieldName: '終了日',
        otherValue: '2026-12-31',
        position: 'start',
        isInvalid: false,
      }),
    ).toBe('Goal 開始日 (現在: 2026-01-01)')
  })

  it('valueDisplay 指定で 曜日併記 等 pre-format 値を表示', () => {
    expect(
      buildDateRangeAria({
        emptyLabel: '空',
        fieldName: 'Sprint 開始日',
        value: '2026-05-04',
        valueDisplay: '2026-05-04 (月)',
        otherFieldName: '終了日',
        otherValue: '2026-05-17',
        position: 'start',
        isInvalid: false,
      }),
    ).toBe('Sprint 開始日 (現在: 2026-05-04 (月))')
  })

  it('valueDisplay + isInvalid = 不正 message 内も pre-format 値を使う', () => {
    expect(
      buildDateRangeAria({
        emptyLabel: '空',
        fieldName: 'Sprint 開始日',
        value: '2026-05-15',
        valueDisplay: '2026-05-15 (金)',
        otherFieldName: '終了日',
        otherValue: '2026-05-10',
        position: 'start',
        isInvalid: true,
      }),
    ).toBe('Sprint 開始日 (現在: 2026-05-15 (金)、終了日 2026-05-10 より後で不正)')
  })

  it('item-edit-dialog: fieldName=期限 / position=end でも整合', () => {
    expect(
      buildDateRangeAria({
        emptyLabel: '期限 (任意、開始日以降、MUST item は期限 + Heartbeat 通知が必須)',
        fieldName: '期限',
        value: '2026-04-01',
        otherFieldName: '開始日',
        otherValue: '2026-05-10',
        position: 'end',
        isInvalid: true,
      }),
    ).toBe('期限 (現在: 2026-04-01、開始日 2026-05-10 より前で不正)')
  })
})
