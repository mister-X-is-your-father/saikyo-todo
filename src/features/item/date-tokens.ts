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
 *   4. JA: `今週末` (今週土曜) / `来週末` (+1 週) / `月末` (当月最終日)
 *      EN alias: `this weekend` / `next weekend` / `end of month` / `eom`
 *   5. JA: `(日月火水木金土)曜` 単独 (次の同曜日; 今日が同曜日なら +7)
 *   6. EN: `monday` / `mon` 単独 (同上)
 *   7. EN 月名 絶対日付: `Apr 30` / `April 30` / `30 Apr` / `Apr 30, 2026`
 *      (年省略時は今年、ただし当日より前の月日なら来年に繰り上げ — Todoist 互換)
 *   8. ISO: `YYYY-MM-DD`
 *   9. M/D スラッシュ: `3/15` / `12/31` / `3/15/2027` / `3/15/27` (US convention)
 *  10. 相対: `+3d` / `+2w`
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

/**
 * iter256 basics: 英語月名 (短縮 / フル) → 0-index 月 (Jan=0)。Todoist の "Apr 30"
 * / "30 Apr" / "April 30, 2026" 互換。lookup は lower-case 化してから引く。
 */
const MONTH_EN: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}
const MONTH_EN_PATTERN =
  '(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)'

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

/**
 * iter256 basics: 月日のみ指定 (年省略) で次の出現日を返す。Todoist 互換 ——
 * 今年の同月日が過去なら翌年に繰り上げ、未来なら今年。当日 (==base) は今年扱い。
 *
 * 例: base=2026-04-25 で month=2 (Mar) day=10 → 2027-03-10、month=11 (Dec) day=1
 *     → 2026-12-01、month=3 (Apr) day=25 → 2026-04-25 (当日扱い)。
 *
 * 31 日が無い月 (Apr 31 等) は JS Date が翌月 1 日に巻き戻すため、明示的に
 * `month+1, 0` で月末を上限に丸める (`Feb 30` → `Feb 28/29`)。
 */
export function rollForwardMonthDay(base: Date, month: number, day: number): Date {
  const lastDayThisYear = new Date(base.getFullYear(), month + 1, 0).getDate()
  const safeDay = Math.min(day, lastDayThisYear)
  const candidate = new Date(base.getFullYear(), month, safeDay)
  if (candidate.getTime() < base.getTime()) {
    const lastDayNextYear = new Date(base.getFullYear() + 1, month + 1, 0).getDate()
    return new Date(base.getFullYear() + 1, month, Math.min(day, lastDayNextYear))
  }
  return candidate
}

export interface ParsedDate {
  date: Date
  matched: string
}

const WEEKDAY_LABEL_JA = ['日', '月', '火', '水', '木', '金', '土']
const WEEKDAY_LABEL_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * iter256 basics: ISO 日付を「今日 / 明日 / 明後日 / 4/30 (木) / 2027-04-30 (木)」の
 * ような人間に優しい表記に整形する pure 関数。QuickAdd preview chip / Item 行で使う。
 *
 * - 当日 / +1 / +2 は 今日 / 明日 / 明後日 (JA) または Today / Tomorrow / Day after (EN)
 * - 同年内は `M/D (曜)` (JA) または `Mon Apr 30` (EN)
 * - 別年は `YYYY-MM-DD (曜)` (JA) または `Apr 30 2027 (Mon)` (EN)
 *
 * locale は `'ja' | 'en'` のみ。デフォルトは 'ja'。`today` はカレンダー日のみ
 * (時分秒は無視) で比較するので呼び出し側で normalize しなくてよい。
 *
 * 不正 ISO (`new Date(iso)` が NaN) は元の `iso` 文字列をそのまま返す (fail-safe)。
 */
export function formatFriendlyDate(iso: string, today: Date, locale: 'ja' | 'en' = 'ja'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const baseToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const baseTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((baseTarget.getTime() - baseToday.getTime()) / (24 * 60 * 60 * 1000))

  if (locale === 'en') {
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    const wd = WEEKDAY_LABEL_EN[d.getDay()]!
    const monthShort = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][d.getMonth()]!
    if (d.getFullYear() === baseToday.getFullYear()) {
      return `${wd} ${monthShort} ${d.getDate()}`
    }
    return `${wd} ${monthShort} ${d.getDate()} ${d.getFullYear()}`
  }

  // JA
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '明日'
  if (diffDays === 2) return '明後日'
  if (diffDays === -1) return '昨日'
  const wd = WEEKDAY_LABEL_JA[d.getDay()]!
  if (d.getFullYear() === baseToday.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()} (${wd})`
  }
  return `${iso} (${wd})`
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
  // iter256: EN alias `this weekend` / `next weekend` / `end of month` / `eom` を併設。
  const weekendMatch = text.match(/(^|\s)(今週末|this\s+weekend)(\s|$)/i)
  if (weekendMatch) {
    const cur = base.getDay()
    const delta = (6 - cur + 7) % 7
    return { date: addDays(base, delta), matched: weekendMatch[0] }
  }
  const nextWeekendMatch = text.match(/(^|\s)(来週末|next\s+weekend)(\s|$)/i)
  if (nextWeekendMatch) {
    // 「次の土曜のさらに次の土曜」 — `this weekend` の +7 日。
    // Todoist は `next weekend` を「来週の土曜」として扱うので互換させる。
    const cur = base.getDay()
    const delta = ((6 - cur + 7) % 7) + 7
    return { date: addDays(base, delta), matched: nextWeekendMatch[0] }
  }
  const endOfMonth = text.match(/(^|\s)(月末|end\s+of\s+month|eom)(\s|$)/i)
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

  // 7. EN 月名 絶対日付 (Phase 6.15 iter 256)
  //    Todoist 互換: `Apr 30` / `April 30` / `30 Apr` / `Apr 30, 2026`。
  //    年は省略可 — 省略時は今年で、過去なら来年に繰り上げる。
  //    "Month Day" を先に試して "Day Month" にフォールバック (両方マッチ可能な
  //    入力では Month Day を優先 — Todoist UI 表示と揃える)。
  const monthDay = text.match(
    new RegExp(`(^|\\s)(${MONTH_EN_PATTERN})\\s+(\\d{1,2})(?:(?:,\\s*|\\s+)(\\d{4}))?(\\s|$)`, 'i'),
  )
  if (monthDay) {
    const m = MONTH_EN[monthDay[2]!.toLowerCase()]!
    const d = Number(monthDay[3])
    const yearStr = monthDay[4]
    if (d >= 1 && d <= 31) {
      const date = yearStr
        ? new Date(Number(yearStr), m, Math.min(d, new Date(Number(yearStr), m + 1, 0).getDate()))
        : rollForwardMonthDay(base, m, d)
      return { date, matched: monthDay[0] }
    }
  }
  const dayMonth = text.match(
    new RegExp(`(^|\\s)(\\d{1,2})\\s+(${MONTH_EN_PATTERN})(?:(?:,\\s*|\\s+)(\\d{4}))?(\\s|$)`, 'i'),
  )
  if (dayMonth) {
    const d = Number(dayMonth[2])
    const m = MONTH_EN[dayMonth[3]!.toLowerCase()]!
    const yearStr = dayMonth[4]
    if (d >= 1 && d <= 31) {
      const date = yearStr
        ? new Date(Number(yearStr), m, Math.min(d, new Date(Number(yearStr), m + 1, 0).getDate()))
        : rollForwardMonthDay(base, m, d)
      return { date, matched: dayMonth[0] }
    }
  }

  // 8. ISO YYYY-MM-DD
  const iso = text.match(/(^|\s)(\d{4}-\d{2}-\d{2})(\s|$)/)
  if (iso) {
    return { date: new Date(iso[2]!), matched: iso[0] }
  }

  // 9. M/D スラッシュ形式 (Todoist / Things 互換 — US convention)。
  //    `3/15` / `12/31` / `3/15/2027` / `3/15/27` を受理。
  //    年省略時は MMM DD と同じ "未来なら今年、過去なら来年" ルール。
  //    2-digit 年は 2000 + N (Y2K pivot)。月/日が範囲外なら拒否 (誤検出防止)。
  const slashMd = text.match(/(^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(\s|$)/)
  if (slashMd) {
    const m = Number(slashMd[2]) - 1
    const d = Number(slashMd[3])
    const yearStr = slashMd[4]
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
      const year = yearStr
        ? yearStr.length === 2
          ? 2000 + Number(yearStr)
          : Number(yearStr)
        : null
      let date: Date
      if (year !== null) {
        const lastDay = new Date(year, m + 1, 0).getDate()
        date = new Date(year, m, Math.min(d, lastDay))
      } else {
        date = rollForwardMonthDay(base, m, d)
      }
      return { date, matched: slashMd[0] }
    }
  }

  // 10. 相対 +Nd / +Nw (Phase 6.15 iter 230)
  const rel = text.match(/(^|\s)\+(\d{1,3})([dw])(\s|$)/)
  if (rel) {
    const n = Number(rel[2])
    const days = rel[3] === 'w' ? n * 7 : n
    return { date: addDays(base, days), matched: rel[0] }
  }

  return null
}
