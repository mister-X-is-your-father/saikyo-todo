import { describe, expect, it } from 'vitest'

import { parseQuickAdd } from './nl-parse'

const TODAY = new Date(2026, 3, 25) // Sat 2026-04-25

describe('parseQuickAdd', () => {
  it('no tokens → title のみ', () => {
    const r = parseQuickAdd('買い物', { today: TODAY })
    expect(r.title).toBe('買い物')
    expect(r.priority).toBeUndefined()
    expect(r.dueDate).toBeUndefined()
  })

  it('今日', () => {
    const r = parseQuickAdd('今日 資料レビュー', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-25')
    expect(r.title).toBe('資料レビュー')
  })

  it('明日 + 時刻 + p1 + tag', () => {
    const r = parseQuickAdd('明日 15:00 p1 #会議 打ち合わせ', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-26')
    expect(r.dueTime).toBe('15:00')
    expect(r.priority).toBe(1)
    expect(r.tags).toEqual(['会議'])
    expect(r.title).toBe('打ち合わせ')
  })

  it('15時 の日本語形式', () => {
    const r = parseQuickAdd('明日 15時 レビュー', { today: TODAY })
    expect(r.dueTime).toBe('15:00')
  })

  it('15時30分', () => {
    const r = parseQuickAdd('明日 15時30分 レビュー', { today: TODAY })
    expect(r.dueTime).toBe('15:30')
  })

  it('明後日', () => {
    const r = parseQuickAdd('明後日 出荷', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-27')
  })

  it('来週月曜', () => {
    // Sat 2026-04-25 の来週月曜 = 2026-04-27 (next Monday)
    const r = parseQuickAdd('来週月曜 API レビュー', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-27')
  })

  it('曜日 (次の該当曜日)', () => {
    // Sat 2026-04-25 の次の "金曜" = 2026-05-01
    const r = parseQuickAdd('金曜 デプロイ', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-05-01')
  })

  it('ISO 日付', () => {
    const r = parseQuickAdd('2026-05-10 社内発表', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-05-10')
  })

  it('MUST キーワード', () => {
    const r = parseQuickAdd('MUST 明日 出荷', { today: TODAY })
    expect(r.isMust).toBe(true)
    expect(r.scheduledFor).toBe('2026-04-26')
    expect(r.title).toBe('出荷')
  })

  it('#tag 複数', () => {
    const r = parseQuickAdd('#設計 #API 明日 レビュー', { today: TODAY })
    expect(r.tags).toEqual(['設計', 'API'])
    expect(r.title).toBe('レビュー')
  })

  it('@assignee', () => {
    const r = parseQuickAdd('@tanaka 資料作成', { today: TODAY })
    expect(r.assignees).toEqual(['tanaka'])
    expect(r.title).toBe('資料作成')
  })

  it('p3 優先度', () => {
    const r = parseQuickAdd('p3 メール返信', { today: TODAY })
    expect(r.priority).toBe(3)
    expect(r.title).toBe('メール返信')
  })

  it('末尾 ? で decomposeHint', () => {
    const r = parseQuickAdd('新 API 設計?', { today: TODAY })
    expect(r.decomposeHint).toBe(true)
    expect(r.title).toBe('新 API 設計')
  })

  it('大文字 P も priority として解釈', () => {
    const r = parseQuickAdd('P2 タスク', { today: TODAY })
    expect(r.priority).toBe(2)
  })

  it('p5 は priority として扱わない', () => {
    const r = parseQuickAdd('p5 test', { today: TODAY })
    expect(r.priority).toBeUndefined()
    expect(r.title).toBe('p5 test')
  })

  it('全部乗せ', () => {
    const r = parseQuickAdd('MUST 明日 15:30 p1 #会議 #api @tanaka API 設計レビュー?', {
      today: TODAY,
    })
    expect(r.isMust).toBe(true)
    expect(r.scheduledFor).toBe('2026-04-26')
    expect(r.dueTime).toBe('15:30')
    expect(r.priority).toBe(1)
    expect(r.tags).toEqual(['会議', 'api'])
    expect(r.assignees).toEqual(['tanaka'])
    expect(r.decomposeHint).toBe(true)
    expect(r.title).toBe('API 設計レビュー')
  })

  it('複数空白は 1 個に', () => {
    const r = parseQuickAdd('  明日   レビュー   ', { today: TODAY })
    expect(r.title).toBe('レビュー')
    expect(r.scheduledFor).toBe('2026-04-26')
  })

  it('scheduledFor があれば dueDate も同じ日付', () => {
    const r = parseQuickAdd('明日 提出', { today: TODAY })
    expect(r.dueDate).toBe('2026-04-26')
    expect(r.scheduledFor).toBe('2026-04-26')
  })

  it('時刻のみ (日付なし) → dueTime だけ', () => {
    const r = parseQuickAdd('18:00 会議', { today: TODAY })
    expect(r.dueTime).toBe('18:00')
    expect(r.scheduledFor).toBeUndefined()
  })

  it('小文字 p と # が title 途中にあっても誤認しない', () => {
    const r = parseQuickAdd('supp note', { today: TODAY })
    expect(r.priority).toBeUndefined()
    expect(r.title).toBe('supp note')
  })

  // Phase 6.15 iter 230: Todoist 風の相対日付 +Nd / +Nw
  it('+3d (3 日後)', () => {
    const r = parseQuickAdd('+3d レビュー', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-28')
    expect(r.title).toBe('レビュー')
  })

  it('+2w (2 週後 = 14 日後)', () => {
    const r = parseQuickAdd('+2w 出荷', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-05-09')
    expect(r.title).toBe('出荷')
  })

  it('+1d は明日と同じ日付', () => {
    const r = parseQuickAdd('+1d 提出', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-26')
  })

  it('title 中の +X は date として誤認しない (空白で区切られない)', () => {
    const r = parseQuickAdd('cost+3dollars', { today: TODAY })
    expect(r.scheduledFor).toBeUndefined()
    expect(r.title).toBe('cost+3dollars')
  })

  it('既に日付トークンがあれば +Nd は無視される (先勝ち)', () => {
    const r = parseQuickAdd('明日 +3d レビュー', { today: TODAY })
    // 「明日」が先に消費されるので +3d は title に残る
    expect(r.scheduledFor).toBe('2026-04-26')
    expect(r.title).toBe('+3d レビュー')
  })
})
