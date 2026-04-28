/**
 * 自然言語から「日付トークン」を抽出する pure 関数。iter255 で nl-parse.ts から分離。
 *
 * - `parseDateFromText(text, today)`: 最初に見つかった日付パターンを返す。
 *   `{ date: Date; matched: string }` を返すので、呼び出し側は `text.replace(matched, ' ')`
 *   で消すだけ。
 *
 * 受理パターン (上から順、先勝ち):
 *   1. JA: `今日` / `明日` / `明後日`、EN: `today` / `tonight` / `tomorrow` / `tmr` / `tmrw` / `tomo`
 *   2. JA: `来週(日月火水木金土)曜?`
 *   3. EN: `next monday` / `next mon` 等 (略形含む)
 *   4. JA: `今週末` (今週土曜) / `月末` (当月最終日)
 *   5. JA: `(日月火水木金土)曜` 単独 (次の同曜日; 今日が同曜日なら +7)
 *   6. EN: `monday` / `mon` 単独 (同上)
 *   7. ISO: `YYYY-MM-DD`
 *   8. 相対: `+3d` / `+2w`
 */

const WEEKDAY_JA: Record<string, number> = {
  日: 0,
  月: 1,
  火: 2,
  水: 3,
  木: 4,
  金: 5,
  土: 6,
  日曜: 0,
  月曜: 1,
  火曜: 2,
  水曜: 3,
  木曜: 4,
  金曜: 5,
  土曜: 6,
}

/**
 * iter254 ai-automation: 英語 weekday 対応 (国際チーム / Todoist 互換)。
 * weekday は短縮 / フル両方を受ける。lookup は lower-case 化してから引く。
 */
const WEEKDAY_EN: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
}
const WEEKDAY_EN_PATTERN =
  '(?:sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)'

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** 次の同曜日を返す (今日が同曜日なら +7)。Todoist 互換。 */
export function nextWeekday(base: Date, weekday: number): Date {
  const cur = base.getDay()
  let delta = (weekday - cur + 7) % 7
  if (delta === 0) delta = 7
  return addDays(base, delta)
}

export interface ParsedDate {
  date: Date
  matched: string
}

/**
 * `today` 基準で最初に見つかった日付トークンを返す。マッチしなければ null。
 *
 * `today` は呼び出し側で normalize (時分秒 0) する想定だが、本関数も内部で
 * year/month/date のみ取り出して安全側に倒す (Date 比較の罠回避)。
 */
export function parseDateFromText(text: string, today: Date): ParsedDate | null {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // 1. 今日 / 明日 / 明後日 / today / tonight / tomorrow ...
  const todayRe = /(^|\s)(今日|today|tonight)(\s|$)/i
  const tomorrowRe = /(^|\s)(明日|tomorrow|tmrw|tmr|tomo)(\s|$)/i
  const dayAfterRe = /(^|\s)明後日(\s|$)/
  const todayMatch = text.match(todayRe)
  if (todayMatch) return { date: base, matched: todayMatch[0] }
  const tomorrowMatch = text.match(tomorrowRe)
  if (tomorrowMatch) return { date: addDays(base, 1), matched: tomorrowMatch[0] }
  const dayAfterMatch = text.match(dayAfterRe)
  if (dayAfterMatch) return { date: addDays(base, 2), matched: dayAfterMatch[0] }

  // 2. 来週X曜
  const nextWeek = text.match(/(^|\s)来週(日|月|火|水|木|金|土)曜?(\s|$)/)
  if (nextWeek) {
    return { date: nextWeekday(base, WEEKDAY_JA[nextWeek[2]!]!), matched: nextWeek[0] }
  }

  // 3. next monday / next mon (Todoist 互換)
  const nextEn = text.match(new RegExp(`(^|\\s)next\\s+(${WEEKDAY_EN_PATTERN})(\\s|$)`, 'i'))
  if (nextEn) {
    return {
      date: nextWeekday(base, WEEKDAY_EN[nextEn[2]!.toLowerCase()]!),
      matched: nextEn[0],
    }
  }

  // 4. 今週末 = 今週土曜 (今日含む) / 月末 = 当月最終日
  // Phase 6.15 iter 233 で導入。Todoist の "this weekend" / "end of month" 相当。
  const weekendMatch = text.match(/(^|\s)今週末(\s|$)/)
  if (weekendMatch) {
    const cur = base.getDay()
    const delta = (6 - cur + 7) % 7
    return { date: addDays(base, delta), matched: weekendMatch[0] }
  }
  const endOfMonth = text.match(/(^|\s)月末(\s|$)/)
  if (endOfMonth) {
    return {
      date: new Date(base.getFullYear(), base.getMonth() + 1, 0),
      matched: endOfMonth[0],
    }
  }

  // 5. JA 単独 weekday
  const wd = text.match(/(^|\s)(日|月|火|水|木|金|土)曜(\s|$)/)
  if (wd) {
    return { date: nextWeekday(base, WEEKDAY_JA[wd[2]!]!), matched: wd[0] }
  }

  // 6. EN 単独 weekday (next 接頭辞は上で消費済み)
  const wdEn = text.match(new RegExp(`(^|\\s)(${WEEKDAY_EN_PATTERN})(\\s|$)`, 'i'))
  if (wdEn) {
    return {
      date: nextWeekday(base, WEEKDAY_EN[wdEn[2]!.toLowerCase()]!),
      matched: wdEn[0],
    }
  }

  // 7. ISO YYYY-MM-DD
  const iso = text.match(/(^|\s)(\d{4}-\d{2}-\d{2})(\s|$)/)
  if (iso) {
    return { date: new Date(iso[2]!), matched: iso[0] }
  }

  // 8. 相対 +Nd / +Nw (Phase 6.15 iter 230)
  const rel = text.match(/(^|\s)\+(\d{1,3})([dw])(\s|$)/)
  if (rel) {
    const n = Number(rel[2])
    const days = rel[3] === 'w' ? n * 7 : n
    return { date: addDays(base, days), matched: rel[0] }
  }

  return null
}
