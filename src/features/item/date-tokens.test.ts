import { describe, expect, it } from 'vitest'

import { addDays, isoDate, nextWeekday, parseDateFromText } from './date-tokens'

// iter255 refactor: nl-parse.ts から date-token 抽出を切り出した際の補強。
// 既存の nl-parse.test.ts (parseQuickAdd 経由) は同じ関数を踏むので、ここでは
// 「parseDateFromText の単体契約」と date helper の境界条件を焦点化する。
const SAT = new Date(2026, 3, 25) // Sat 2026-04-25

describe('parseDateFromText (pure helper)', () => {
  it('一致なしは null', () => {
    expect(parseDateFromText('特になし', SAT)).toBeNull()
    expect(parseDateFromText('', SAT)).toBeNull()
  })

  it('JA 今日 / 明日 / 明後日 のオフセットが正しい', () => {
    expect(isoDate(parseDateFromText('今日 a', SAT)!.date)).toBe('2026-04-25')
    expect(isoDate(parseDateFromText('明日 a', SAT)!.date)).toBe('2026-04-26')
    expect(isoDate(parseDateFromText('明後日 a', SAT)!.date)).toBe('2026-04-27')
  })

  it('EN today / tomorrow / tonight (case-insensitive)', () => {
    expect(isoDate(parseDateFromText('Today review', SAT)!.date)).toBe('2026-04-25')
    expect(isoDate(parseDateFromText('TOMORROW deploy', SAT)!.date)).toBe('2026-04-26')
    expect(isoDate(parseDateFromText('tonight bug fix', SAT)!.date)).toBe('2026-04-25')
  })

  it('JA 来週月曜 (Sat→次の Mon = +2)', () => {
    expect(isoDate(parseDateFromText('来週月曜 設計 review', SAT)!.date)).toBe('2026-04-27')
  })

  it('EN next monday は同じく +2', () => {
    expect(isoDate(parseDateFromText('next monday review', SAT)!.date)).toBe('2026-04-27')
  })

  it('単独 monday (next 接頭辞なし) も次の Mon', () => {
    expect(isoDate(parseDateFromText('monday plan', SAT)!.date)).toBe('2026-04-27')
  })

  it('今週末 (Sat 当日なら今日が weekend)', () => {
    expect(isoDate(parseDateFromText('今週末 掃除', SAT)!.date)).toBe('2026-04-25')
  })

  it('月末 = 当月最終日 (4 月なら 4/30)', () => {
    expect(isoDate(parseDateFromText('月末 締め', SAT)!.date)).toBe('2026-04-30')
  })

  it('ISO YYYY-MM-DD', () => {
    expect(isoDate(parseDateFromText('2026-12-31 release', SAT)!.date)).toBe('2026-12-31')
  })

  it('+3d / +2w 相対日付', () => {
    expect(isoDate(parseDateFromText('+3d follow up', SAT)!.date)).toBe('2026-04-28')
    expect(isoDate(parseDateFromText('+2w retrospective', SAT)!.date)).toBe('2026-05-09')
  })

  it('matched は前後 word boundary を含み replace で安全に消せる', () => {
    const text = '会議 明日 議事録'
    const r = parseDateFromText(text, SAT)
    expect(r).not.toBeNull()
    const after = text.replace(r!.matched, ' ').replace(/\s+/g, ' ').trim()
    expect(after).toBe('会議 議事録')
  })

  it('複数候補がある場合は上から順 (今日 > 明日 > 来週月曜) で最初の 1 件のみ', () => {
    // 今日 が先に拾われ、来週月曜 は残る (parseQuickAdd は 1 入力 1 日付で揃える)
    const r = parseDateFromText('今日 来週月曜 mixed', SAT)
    expect(isoDate(r!.date)).toBe('2026-04-25')
    expect(r!.matched).toMatch(/今日/)
  })
})

describe('isoDate / addDays / nextWeekday', () => {
  it('isoDate は YYYY-MM-DD で 0 padding', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(isoDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('addDays は元 Date を破壊しない', () => {
    const d = new Date(2026, 3, 25)
    const e = addDays(d, 7)
    expect(isoDate(e)).toBe('2026-05-02')
    expect(isoDate(d)).toBe('2026-04-25') // 元が変わらない
  })

  it('nextWeekday は同曜日なら +7 する', () => {
    // SAT = 2026-04-25 (Sat=6)。同曜日 Sat を求めると 2026-05-02
    expect(isoDate(nextWeekday(SAT, 6))).toBe('2026-05-02')
  })
})
