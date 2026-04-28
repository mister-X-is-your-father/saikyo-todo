import { describe, expect, it } from 'vitest'

import { parseTimeFromText } from './time-tokens'

describe('parseTimeFromText', () => {
  describe('HH:MM colon (24h)', () => {
    it('9:30 / 14:00 / 23:59', () => {
      expect(parseTimeFromText('9:30 meeting')?.time).toBe('09:30')
      expect(parseTimeFromText('14:00 retro')?.time).toBe('14:00')
      expect(parseTimeFromText('23:59 deadline')?.time).toBe('23:59')
    })

    it('範囲外 (24:00 / 9:60) は無視', () => {
      expect(parseTimeFromText('24:00 invalid')).toBeNull()
      expect(parseTimeFromText('9:60 invalid')).toBeNull()
    })
  })

  describe('AM/PM', () => {
    it('9am / 9 am → 09:00 (case-insensitive)', () => {
      expect(parseTimeFromText('9am meeting')?.time).toBe('09:00')
      expect(parseTimeFromText('9 AM standup')?.time).toBe('09:00')
    })

    it('2pm / 2 pm → 14:00', () => {
      expect(parseTimeFromText('2pm review')?.time).toBe('14:00')
      expect(parseTimeFromText('2 PM retro')?.time).toBe('14:00')
    })

    it('12am = 00:00 / 12pm = 12:00 (US 慣習)', () => {
      expect(parseTimeFromText('12am midnight job')?.time).toBe('00:00')
      expect(parseTimeFromText('12pm lunch')?.time).toBe('12:00')
    })

    it('2:30pm → 14:30 (分付き)', () => {
      expect(parseTimeFromText('2:30pm review')?.time).toBe('14:30')
      expect(parseTimeFromText('11:45am standup')?.time).toBe('11:45')
    })

    it('範囲外 (13am / 0pm) は無視', () => {
      expect(parseTimeFromText('13am invalid')).toBeNull()
      expect(parseTimeFromText('0pm invalid')).toBeNull()
    })
  })

  describe('JA HH時 MM分', () => {
    it('15時 → 15:00 / 9時30分 → 09:30', () => {
      expect(parseTimeFromText('15時 会議')?.time).toBe('15:00')
      expect(parseTimeFromText('9時30分 朝会')?.time).toBe('09:30')
    })
  })

  describe('JA alias', () => {
    it('朝/昼/夕方/夜 (今夜 は date-tokens 側で today に解釈されるので意図的に除外)', () => {
      expect(parseTimeFromText('朝 散歩')?.time).toBe('09:00')
      expect(parseTimeFromText('昼 ランチ')?.time).toBe('12:00')
      expect(parseTimeFromText('夕方 review')?.time).toBe('18:00')
      expect(parseTimeFromText('夜 retro')?.time).toBe('20:00')
      // 今夜 は time alias に含めない (date-tokens が today に倒すため)
      expect(parseTimeFromText('今夜 deploy')).toBeNull()
    })
  })

  describe('EN alias', () => {
    it('morning / noon / afternoon / evening / night / midnight (tonight は意図的に除外)', () => {
      expect(parseTimeFromText('morning standup')?.time).toBe('09:00')
      expect(parseTimeFromText('noon lunch')?.time).toBe('12:00')
      expect(parseTimeFromText('afternoon review')?.time).toBe('14:00')
      expect(parseTimeFromText('evening retro')?.time).toBe('18:00')
      expect(parseTimeFromText('night job')?.time).toBe('20:00')
      expect(parseTimeFromText('midnight cron')?.time).toBe('00:00')
      // tonight は date-tokens で today に倒される
      expect(parseTimeFromText('tonight deploy')).toBeNull()
    })

    it('case-insensitive: NIGHT / Morning も OK', () => {
      expect(parseTimeFromText('NIGHT a')?.time).toBe('20:00')
      expect(parseTimeFromText('Morning a')?.time).toBe('09:00')
    })
  })

  describe('matched は前後 boundary を含む (replace で安全に消せる)', () => {
    it('14:00 で前後 space を消費', () => {
      const r = parseTimeFromText('会議 14:00 議事録')
      expect(r?.matched).toBe(' 14:00 ')
      const after = ('会議 14:00 議事録'.replace(r!.matched, ' ') as string)
        .replace(/\s+/g, ' ')
        .trim()
      expect(after).toBe('会議 議事録')
    })
  })

  describe('上から順 (colon が AM/PM より先)', () => {
    it('14:00 と morning が混在 → colon 14:00 を優先', () => {
      // colon は最上位 (パターン 1)、alias EN は最下位 (パターン 5)
      expect(parseTimeFromText('14:00 morning')?.time).toBe('14:00')
    })

    it('JA alias (朝) と HH時 が混在 → HH時 を優先 (パターン 3 が 4 より上)', () => {
      expect(parseTimeFromText('15時 朝')?.time).toBe('15:00')
    })
  })

  describe('該当なし', () => {
    it('時刻トークン無しの普通の文 → null', () => {
      expect(parseTimeFromText('普通のタスク')).toBeNull()
      expect(parseTimeFromText('hello world')).toBeNull()
    })
  })
})
