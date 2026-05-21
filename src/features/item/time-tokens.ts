/**
 * 自然言語から「時刻トークン」を抽出する pure 関数 (iter266 で nl-parse.ts から分離 + 拡張)。
 *
 * `parseTimeFromText(text): { time: 'HH:MM'; matched: string } | null` を返す。
 * 呼び出し側は `text.replace(matched, ' ')` で消すだけ。
 *
 * 受理パターン (上から順、先勝ち):
 *   1. `HH:MM` (24h colon、`9:30` / `14:00`)
 *   2. `HH:MMam` / `HH:MMpm` / `HHam` / `HHpm` (空白許容、case-insensitive — Todoist 互換)
 *   3. `HH時(MM分)?` (JA — 24h 表記)
 *   4. JA alias: `朝` (09:00) / `昼` (12:00) / `夕方` (18:00) / `夜` (20:00) / `今夜` (20:00)
 *   5. EN alias: `morning` (09:00) / `noon` (12:00) / `afternoon` (14:00) /
 *      `evening` (18:00) / `night` (20:00) / `tonight` (20:00) / `midnight` (00:00)
 *
 * 範囲外 (HH>=24, MM>=60) は null。AM/PM は `12am=00:00` / `12pm=12:00` の慣習に従う。
 */

import { pad2 } from '@/lib/date/iso'

export interface ParsedTime {
  /** `HH:MM` 24h 表記 (常に 0 padding 済み) */
  time: string
  /** マッチ全体 (前後の word boundary を含む)。replace 用 */
  matched: string
}

// 注意: `tonight` / `今夜` は date-tokens.ts 側で「今日」として扱われ
// (今日 + 暗黙の time 無し) — ここで時刻 alias に入れると date と time の
// 取り合いになるので、time-tokens では意図的に除外。`tonight 9pm` のような
// 二語入力は date が tonight、time が 9pm を消費してそれぞれ動く。
const ALIAS_JA: Record<string, string> = {
  朝: '09:00',
  昼: '12:00',
  夕方: '18:00',
  夜: '20:00',
}

const ALIAS_EN: Record<string, string> = {
  morning: '09:00',
  noon: '12:00',
  afternoon: '14:00',
  evening: '18:00',
  night: '20:00',
  midnight: '00:00',
}

const ALIAS_JA_PATTERN = '(?:朝|昼|夕方|夜)'
const ALIAS_EN_PATTERN = '(?:morning|noon|afternoon|evening|night|midnight)'

export function parseTimeFromText(text: string): ParsedTime | null {
  // 1. HH:MM (24h colon) — `9:30` / `14:00`
  const colon = text.match(/(^|\s)(\d{1,2}):(\d{2})(\s|$)/)
  if (colon) {
    const hh = Number(colon[2])
    const mm = Number(colon[3])
    if (hh < 24 && mm < 60) {
      return { time: `${pad2(hh)}:${pad2(mm)}`, matched: colon[0] }
    }
  }

  // 2. HH(:MM)?am / HH(:MM)?pm — `9am` / `9 am` / `2:30pm`
  const ampm = text.match(/(^|\s)(\d{1,2})(?::(\d{2}))?\s?(am|pm)(\s|$)/i)
  if (ampm) {
    const h12 = Number(ampm[2])
    const mm = Number(ampm[3] ?? '0')
    const isPm = ampm[4]!.toLowerCase() === 'pm'
    if (h12 >= 1 && h12 <= 12 && mm < 60) {
      // 12am = 00:00、12pm = 12:00 (US 慣習)
      const hh = h12 === 12 ? (isPm ? 12 : 0) : isPm ? h12 + 12 : h12
      return { time: `${pad2(hh)}:${pad2(mm)}`, matched: ampm[0] }
    }
  }

  // 3. JA `HH時(MM分)?`
  const timeJa = text.match(/(^|\s)(\d{1,2})時(?:(\d{1,2})分?)?(\s|$)/)
  if (timeJa) {
    const hh = Number(timeJa[2])
    const mm = Number(timeJa[3] ?? '0')
    if (hh < 24 && mm < 60) {
      return { time: `${pad2(hh)}:${pad2(mm)}`, matched: timeJa[0] }
    }
  }

  // 4. JA alias
  const aliasJa = text.match(new RegExp(`(^|\\s)${ALIAS_JA_PATTERN}(\\s|$)`))
  if (aliasJa) {
    const key = aliasJa[0].trim()
    const time = ALIAS_JA[key]
    if (time) return { time, matched: aliasJa[0] }
  }

  // 5. EN alias
  const aliasEn = text.match(new RegExp(`(^|\\s)${ALIAS_EN_PATTERN}(\\s|$)`, 'i'))
  if (aliasEn) {
    const key = aliasEn[0].trim().toLowerCase()
    const time = ALIAS_EN[key]
    if (time) return { time, matched: aliasEn[0] }
  }

  return null
}
