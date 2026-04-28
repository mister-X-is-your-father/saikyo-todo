import { describe, expect, it } from 'vitest'

import { describeItemForPrompt, describeItemsForPrompt } from './describe-for-prompt'

const TODAY = new Date(2026, 3, 27) // Mon 2026-04-27

const item = (overrides: Partial<Parameters<typeof describeItemForPrompt>[0]> = {}) => ({
  title: 'サンプル Item',
  priority: 4,
  dueDate: null,
  isMust: false,
  status: 'todo',
  doneAt: null,
  archivedAt: null,
  description: '',
  ...overrides,
})

describe('describeItemForPrompt — フォーマット', () => {
  it('全部 default + 期限なし', () => {
    expect(describeItemForPrompt(item({ title: 'foo' }), { today: TODAY })).toBe(
      '[p4] [due:なし] [status:todo] [est:なし] foo',
    )
  })

  it('p1 + MUST + 期限当日 + status=in_progress + 30 分見積', () => {
    expect(
      describeItemForPrompt(
        item({
          priority: 1,
          isMust: true,
          dueDate: '2026-04-27',
          status: 'in_progress',
          description: '見積: 30分',
          title: '緊急タスク',
        }),
        { today: TODAY },
      ),
    ).toBe('[p1] [MUST] [due:今日(0d)] [status:in_progress] [est:30m] 緊急タスク')
  })

  it('期限切れ -3 日', () => {
    const s = describeItemForPrompt(item({ priority: 2, dueDate: '2026-04-24' }), { today: TODAY })
    expect(s).toContain('[due:期限切れ(-3d)]')
  })

  it('明日 (+1d)', () => {
    const s = describeItemForPrompt(item({ dueDate: '2026-04-28' }), { today: TODAY })
    expect(s).toContain('[due:明日(+1d)]')
  })

  it('今週内 (+3d)', () => {
    const s = describeItemForPrompt(item({ dueDate: '2026-04-30' }), { today: TODAY })
    expect(s).toContain('[due:今週内(+3d)]')
  })

  it('今後 (+10d)', () => {
    const s = describeItemForPrompt(item({ dueDate: '2026-05-07' }), { today: TODAY })
    expect(s).toContain('[due:今後(+10d)]')
  })

  it('不正 ISO は due:なし にフォールバック', () => {
    const s = describeItemForPrompt(item({ dueDate: 'garbage' }), { today: TODAY })
    expect(s).toContain('[due:なし]')
  })

  it('description に 1時間30分見積 → 1.5h 形式', () => {
    const s = describeItemForPrompt(item({ description: '見積: 1時間30分' }), { today: TODAY })
    expect(s).toContain('[est:1.5h]')
  })

  it('description に 60 分見積 → 1h 整数形式', () => {
    const s = describeItemForPrompt(item({ description: '見積: 1時間' }), { today: TODAY })
    expect(s).toContain('[est:1h]')
  })

  it('withEstimate=false で est を含めない (token 節約)', () => {
    const s = describeItemForPrompt(item({ description: '見積: 30分' }), {
      today: TODAY,
      withEstimate: false,
    })
    expect(s).not.toContain('[est:')
  })

  it('priority が範囲外 (5, 0) は p4 にフォールバック', () => {
    expect(describeItemForPrompt(item({ priority: 5 }), { today: TODAY })).toContain('[p4]')
    expect(describeItemForPrompt(item({ priority: 0 }), { today: TODAY })).toContain('[p4]')
  })

  it('title の改行を半角スペースに置換', () => {
    const s = describeItemForPrompt(item({ title: 'line1\nline2\tline3' }), { today: TODAY })
    expect(s).toContain('line1 line2 line3')
    expect(s).not.toContain('\n')
  })

  it('title 上限 (default 120) を超えたら "..." で切る', () => {
    const long = 'あ'.repeat(150)
    const s = describeItemForPrompt(item({ title: long }), { today: TODAY })
    // 末尾 3 文字 = "..."
    expect(s.endsWith('...')).toBe(true)
    // 切られた title 自体は 120 文字以下
    const titlePart = s.split('] ').pop() ?? ''
    expect(titlePart.length).toBeLessThanOrEqual(120)
  })

  it('maxTitleLen=10 で短く切る', () => {
    const s = describeItemForPrompt(item({ title: 'long title here' }), {
      today: TODAY,
      maxTitleLen: 10,
    })
    expect(s.endsWith('long ti...')).toBe(true)
  })
})

describe('describeItemsForPrompt — bullet list', () => {
  it('空 → デフォルト fallback', () => {
    expect(describeItemsForPrompt([], { today: TODAY })).toBe('(現在 active な Item はありません)')
  })

  it('空 + 独自 fallback', () => {
    expect(describeItemsForPrompt([], { today: TODAY, emptyFallback: 'no items' })).toBe('no items')
  })

  it('done / archive (urgency=0) は除外、active のみ urgency 降順で出す', () => {
    const items = [
      item({ title: 'A', priority: 4 }), // urgency 10
      item({ title: 'B', priority: 1, isMust: true }), // urgency 130
      item({ title: 'C', priority: 1, doneAt: new Date() }), // urgency 0 → 除外
    ]
    const s = describeItemsForPrompt(items, { today: TODAY })
    const lines = s.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('B')
    expect(lines[1]).toContain('A')
    expect(s).not.toContain('C')
  })

  it('limit で件数を制限', () => {
    const items = [
      item({ title: 'A', priority: 1 }),
      item({ title: 'B', priority: 2 }),
      item({ title: 'C', priority: 3 }),
      item({ title: 'D', priority: 4 }),
    ]
    const s = describeItemsForPrompt(items, { today: TODAY, limit: 2 })
    const lines = s.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('A')
    expect(lines[1]).toContain('B')
  })

  it('全 done のリストは fallback', () => {
    const items = [
      item({ title: 'A', doneAt: new Date() }),
      item({ title: 'B', archivedAt: new Date() }),
    ]
    expect(describeItemsForPrompt(items, { today: TODAY })).toContain('現在 active な Item')
  })

  it('各行は "- " で始まる markdown bullet', () => {
    const items = [item({ title: 'X', priority: 1 })]
    const s = describeItemsForPrompt(items, { today: TODAY })
    expect(s.startsWith('- ')).toBe(true)
  })
})
