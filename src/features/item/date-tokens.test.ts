import { describe, expect, it } from 'vitest'

import {
  addDays,
  formatFriendlyDate,
  isoDate,
  nextWeekday,
  parseDateFromText,
  rollForwardMonthDay,
} from './date-tokens'

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

  // iter256 basics: 英語月名 絶対日付 (Apr 30 / 30 Apr / April 30, 2026)
  describe('EN 月名 絶対日付', () => {
    it('Month Day (Apr 30) — 当年で未来なら今年', () => {
      // base=2026-04-25 → Apr 30 はまだ未来 (5 日後)
      expect(isoDate(parseDateFromText('Apr 30 release', SAT)!.date)).toBe('2026-04-30')
      expect(isoDate(parseDateFromText('April 30 milestone', SAT)!.date)).toBe('2026-04-30')
    })

    it('Day Month (30 Apr) も EU 風で受理', () => {
      expect(isoDate(parseDateFromText('30 Apr deadline', SAT)!.date)).toBe('2026-04-30')
    })

    it('明示年付き Apr 30, 2027', () => {
      expect(isoDate(parseDateFromText('Apr 30, 2027 release', SAT)!.date)).toBe('2027-04-30')
      // カンマ無しスペース 2 個もOK
      expect(isoDate(parseDateFromText('Apr 30 2027 release', SAT)!.date)).toBe('2027-04-30')
    })

    it('過去日 (Mar 10) は来年に繰り上げ — Todoist 互換', () => {
      // base=2026-04-25 → Mar 10 は過去 → 2027-03-10
      expect(isoDate(parseDateFromText('Mar 10 review', SAT)!.date)).toBe('2027-03-10')
    })

    it('当日 (Apr 25) は当日扱い — 今年', () => {
      expect(isoDate(parseDateFromText('Apr 25 standup', SAT)!.date)).toBe('2026-04-25')
    })

    it('case-insensitive: APRIL / april / Apr 全部 OK', () => {
      expect(isoDate(parseDateFromText('APRIL 30 a', SAT)!.date)).toBe('2026-04-30')
      expect(isoDate(parseDateFromText('april 30 a', SAT)!.date)).toBe('2026-04-30')
    })

    it('存在しない日 (Feb 30) は月末に丸める', () => {
      // 2026 は閏年でない → Feb 末 = 28 日
      expect(isoDate(parseDateFromText('Feb 30 retro', SAT)!.date)).toBe('2027-02-28')
    })

    it('matched は ISO YYYY-MM-DD より優先 (パターン 7 が 8 より上)', () => {
      // ISO は普通 4 桁年 → MMM DD と被らない。混在させて MMM DD が勝つことを確認
      const r = parseDateFromText('Apr 30 2026-12-31', SAT)
      expect(isoDate(r!.date)).toBe('2026-04-30')
    })

    it('数字だけ (30 単独) や月名だけ (Apr 単独) は無視 (誤検出防止)', () => {
      expect(parseDateFromText('30 buy bread', SAT)).toBeNull()
      // "Apr" 単独だけだと weekday/その他に該当しないので EN 月名にも該当しない (要 Day)
      expect(parseDateFromText('Apr meeting', SAT)).toBeNull()
    })
  })
})

// iter256 basics: 英語 weekend alias (this weekend / next weekend)
describe('weekend EN alias', () => {
  // SAT = 2026-04-25 (土)。this weekend = 当日 (Sat=6 → delta 0)、next weekend = +7 = 2026-05-02
  it('this weekend (Sat 当日なら今日)', () => {
    expect(isoDate(parseDateFromText('this weekend cleanup', SAT)!.date)).toBe('2026-04-25')
    expect(isoDate(parseDateFromText('THIS WEEKEND a', SAT)!.date)).toBe('2026-04-25')
  })

  it('next weekend は this weekend の +7 日', () => {
    // SAT+7 = 2026-05-02
    expect(isoDate(parseDateFromText('next weekend trip', SAT)!.date)).toBe('2026-05-02')
    expect(isoDate(parseDateFromText('NEXT WEEKEND a', SAT)!.date)).toBe('2026-05-02')
  })

  it('来週末 は next weekend と同義 (JA alias)', () => {
    expect(isoDate(parseDateFromText('来週末 旅行', SAT)!.date)).toBe('2026-05-02')
  })

  it('木曜日 base での this weekend は +2 (次の土曜)', () => {
    const THU = new Date(2026, 3, 23) // Thu 2026-04-23
    expect(isoDate(parseDateFromText('this weekend a', THU)!.date)).toBe('2026-04-25')
    expect(isoDate(parseDateFromText('next weekend a', THU)!.date)).toBe('2026-05-02')
  })

  it('end of month / eom も alias (= 月末)', () => {
    expect(isoDate(parseDateFromText('end of month review', SAT)!.date)).toBe('2026-04-30')
    expect(isoDate(parseDateFromText('eom report', SAT)!.date)).toBe('2026-04-30')
    expect(isoDate(parseDateFromText('EOM report', SAT)!.date)).toBe('2026-04-30')
  })

  it('weekend だけ (this/next 接頭辞なし) は誤検出を起こさない', () => {
    // bare "weekend" は曜日でも何でもないので無視 (parseDateFromText が null)
    expect(parseDateFromText('weekend cleanup', SAT)).toBeNull()
  })
})

// iter256 basics: M/D スラッシュ形式 (US convention)
describe('M/D スラッシュ形式', () => {
  it('未来の M/D は今年扱い', () => {
    expect(isoDate(parseDateFromText('5/15 release', SAT)!.date)).toBe('2026-05-15')
    expect(isoDate(parseDateFromText('12/31 holiday', SAT)!.date)).toBe('2026-12-31')
  })

  it('過去の M/D は来年に繰り上げ', () => {
    // SAT=2026-04-25 → 3/10 は過去 → 2027-03-10
    expect(isoDate(parseDateFromText('3/10 retro', SAT)!.date)).toBe('2027-03-10')
  })

  it('当日 M/D は当日扱い', () => {
    expect(isoDate(parseDateFromText('4/25 standup', SAT)!.date)).toBe('2026-04-25')
  })

  it('明示年 (M/D/YYYY)', () => {
    expect(isoDate(parseDateFromText('3/15/2028 release', SAT)!.date)).toBe('2028-03-15')
  })

  it('2-digit 年 (M/D/YY) は 20YY と解釈', () => {
    expect(isoDate(parseDateFromText('3/15/27 release', SAT)!.date)).toBe('2027-03-15')
  })

  it('範囲外 (13/1, 0/15, 5/32) は無視', () => {
    expect(parseDateFromText('13/1 invalid', SAT)).toBeNull()
    expect(parseDateFromText('0/15 invalid', SAT)).toBeNull()
    expect(parseDateFromText('5/32 invalid', SAT)).toBeNull()
  })

  it('Feb 30 系 (2/30) は当該年の月末に丸める', () => {
    // 2026 平年 → Feb 末 = 28、しかし 2/30 なら未来は無いので来年 → 2027-02-28
    expect(isoDate(parseDateFromText('2/30 retro', SAT)!.date)).toBe('2027-02-28')
  })

  it('ISO YYYY-MM-DD は 9 より前の 8 で消費される (混在時)', () => {
    // ISO の方が上 (パターン 8) なので 4 桁年付きの ISO が勝つ
    const r = parseDateFromText('2026-12-31 5/15', SAT)
    expect(isoDate(r!.date)).toBe('2026-12-31')
  })
})

// iter256 basics: friendly date formatter (preview chip / Item 行表示用)
describe('formatFriendlyDate', () => {
  // SAT = 2026-04-25 (Sat)
  it('JA: 当日 / 翌日 / 翌々日 / 昨日 を専用ラベル化', () => {
    expect(formatFriendlyDate('2026-04-25', SAT)).toBe('今日')
    expect(formatFriendlyDate('2026-04-26', SAT)).toBe('明日')
    expect(formatFriendlyDate('2026-04-27', SAT)).toBe('明後日')
    expect(formatFriendlyDate('2026-04-24', SAT)).toBe('昨日')
  })

  it('JA: 同年は M/D (曜) 形式', () => {
    expect(formatFriendlyDate('2026-05-01', SAT)).toBe('5/1 (金)')
    expect(formatFriendlyDate('2026-12-31', SAT)).toBe('12/31 (木)')
  })

  it('JA: 別年は YYYY-MM-DD (曜) で年を残す', () => {
    expect(formatFriendlyDate('2027-04-30', SAT)).toBe('2027-04-30 (金)')
    expect(formatFriendlyDate('2025-12-31', SAT)).toBe('2025-12-31 (水)')
  })

  it('EN: Today / Tomorrow / Yesterday', () => {
    expect(formatFriendlyDate('2026-04-25', SAT, 'en')).toBe('Today')
    expect(formatFriendlyDate('2026-04-26', SAT, 'en')).toBe('Tomorrow')
    expect(formatFriendlyDate('2026-04-24', SAT, 'en')).toBe('Yesterday')
  })

  it('EN: 同年は "Wed Apr 30" 形式', () => {
    expect(formatFriendlyDate('2026-04-30', SAT, 'en')).toBe('Thu Apr 30')
    expect(formatFriendlyDate('2026-12-31', SAT, 'en')).toBe('Thu Dec 31')
  })

  it('EN: 別年は year を末尾に', () => {
    expect(formatFriendlyDate('2027-04-30', SAT, 'en')).toBe('Fri Apr 30 2027')
  })

  it('不正 ISO は元の文字列をそのまま返す (fail-safe)', () => {
    expect(formatFriendlyDate('not-a-date', SAT)).toBe('not-a-date')
  })

  it('today に時分秒があっても結果に影響しない', () => {
    const todayWithTime = new Date(2026, 3, 25, 23, 59, 59)
    expect(formatFriendlyDate('2026-04-25', todayWithTime)).toBe('今日')
    expect(formatFriendlyDate('2026-04-26', todayWithTime)).toBe('明日')
  })
})

describe('rollForwardMonthDay', () => {
  it('未来は今年, 過去は来年', () => {
    expect(isoDate(rollForwardMonthDay(SAT, 4, 1))).toBe('2026-05-01') // May 1 = 未来
    expect(isoDate(rollForwardMonthDay(SAT, 0, 15))).toBe('2027-01-15') // Jan 15 = 過去
    expect(isoDate(rollForwardMonthDay(SAT, 3, 25))).toBe('2026-04-25') // 当日
  })

  it('Feb 30 は当該年の月末 (閏年 / 平年で挙動差なし — 30 > 29/28 のため)', () => {
    // 2026 (平年) → Feb 28
    expect(isoDate(rollForwardMonthDay(SAT, 1, 30))).toBe('2027-02-28')
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
