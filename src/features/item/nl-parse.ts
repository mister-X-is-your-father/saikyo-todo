/**
 * 自然言語クイック追加パーサ (pure)。
 *
 * 入力例:
 *   "明日15時 p1 #会議 @tanaka MUST 買い物 1時間"
 *   "来週月曜 API レビュー 2h"
 *   "今日 18:00 資料レビュー #doc 30分"
 *
 * 出力:
 *   - title: 残ったテキスト
 *   - scheduledFor / dueDate / dueTime
 *   - priority (1-4)
 *   - tags (#xxx)
 *   - assignee hints (@xxx) — id 解決は呼び出し側で
 *   - isMust (MUST キーワード)
 *   - decomposeHint: 末尾 '?' — Researcher decompose フラグ
 *   - estimateMinutes: 工数推定 (`./estimate.ts` で純粋関数化)
 */

import { parseEstimateFromText } from './estimate'

// estimate / 表示ヘルパは `./estimate` に同居。後方互換のため re-export。
export { extractEstimateMinutes, formatEstimate } from './estimate'

export interface ParsedQuickAdd {
  title: string
  scheduledFor?: string // YYYY-MM-DD
  dueDate?: string
  dueTime?: string // HH:MM
  priority?: 1 | 2 | 3 | 4
  tags: string[]
  assignees: string[]
  isMust: boolean
  decomposeHint: boolean
  /**
   * 推定作業時間 (分単位、整数)。`30m` / `1h` / `1.5h` / `1h30m` / `30分` /
   * `1時間` / `1時間30分` を抽出。1分未満や上限超 (60h=3600分) は捨てる。
   * timer Stop 時の actual と比較した variance 計算に使う想定 (description に
   * 注記して保存)。
   */
  estimateMinutes?: number
}

export interface ParseOptions {
  today: Date
}

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
 * iter254 ai-automation: 英語キーワード対応 (国際チーム / Todoist 互換)。
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

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function nextWeekday(base: Date, weekday: number): Date {
  const cur = base.getDay()
  let delta = (weekday - cur + 7) % 7
  if (delta === 0) delta = 7
  return addDays(base, delta)
}

/**
 * 入力テキストから様々な token を抽出する。見つけたら remove。
 */
export function parseQuickAdd(input: string, opts: ParseOptions): ParsedQuickAdd {
  let text = input.trim()
  const out: ParsedQuickAdd = {
    title: '',
    tags: [],
    assignees: [],
    isMust: false,
    decomposeHint: false,
  }

  // 末尾 '?' で Researcher 分解依頼 (入力全体の chomped ? に限定)
  if (text.endsWith('?')) {
    out.decomposeHint = true
    text = text.slice(0, -1).trim()
  }

  // MUST キーワード (単語境界、英字大文字のみ)
  const mustRe = /(^|\s)MUST(\s|$)/
  if (mustRe.test(text)) {
    out.isMust = true
    text = text.replace(mustRe, ' ').trim()
  }

  // 優先度 p1-p4 (全半角)
  const prioRe = /(^|\s)[pP]([1-4])(\s|$)/
  const prioMatch = text.match(prioRe)
  if (prioMatch) {
    out.priority = Number(prioMatch[2]) as 1 | 2 | 3 | 4
    text = text.replace(prioRe, ' ').trim()
  }

  // tags #xxx
  out.tags = Array.from(text.matchAll(/(^|\s)#(\S+)/g)).map((m) => m[2]!)
  text = text.replace(/(^|\s)#\S+/g, ' ').trim()

  // assignees @xxx
  out.assignees = Array.from(text.matchAll(/(^|\s)@(\S+)/g)).map((m) => m[2]!)
  text = text.replace(/(^|\s)@\S+/g, ' ').trim()

  // 工数推定 (時刻より先に処理して `1時間` を `1時` と取り違えないため)。
  // 詳細パターンは `./estimate.ts` の parseEstimateFromText に分離済。
  // 範囲外 (>60 時間 / <=0) は null を返してくるので token は消さない (title に残る)。
  const est = parseEstimateFromText(text)
  if (est) {
    out.estimateMinutes = est.minutes
    text = text.replace(est.matched, ' ').trim()
  }

  // 時刻 HH:MM / HH時(MM分)?
  const timeCol = text.match(/(^|\s)(\d{1,2}):(\d{2})(\s|$)/)
  if (timeCol) {
    const hh = String(timeCol[2]).padStart(2, '0')
    const mm = timeCol[3]!
    out.dueTime = `${hh}:${mm}`
    text = text.replace(timeCol[0], ' ').trim()
  } else {
    const timeJa = text.match(/(^|\s)(\d{1,2})時(?:(\d{1,2})分?)?(\s|$)/)
    if (timeJa) {
      const hh = String(timeJa[2]).padStart(2, '0')
      const mm = String(timeJa[3] ?? '0').padStart(2, '0')
      out.dueTime = `${hh}:${mm}`
      text = text.replace(timeJa[0], ' ').trim()
    }
  }

  // 日付: 今日 / 明日 / 明後日 / today / tomorrow / 来週X曜 / next monday /
  //       X曜 / monday / YYYY-MM-DD
  // iter254 ai-automation: 英語キーワード `today` / `tomorrow` / `tmr` / `tmrw`
  // / `tonight` / `mon..sun` / `next monday..sunday` を Todoist 互換で追加。
  // case-insensitive で word boundary (^|\s) ... (\s|$) に限定。
  const today = new Date(opts.today.getFullYear(), opts.today.getMonth(), opts.today.getDate())
  let date: Date | null = null

  const todayRe = /(^|\s)(今日|today|tonight)(\s|$)/i
  const tomorrowRe = /(^|\s)(明日|tomorrow|tmrw|tmr|tomo)(\s|$)/i
  const dayAfterRe = /(^|\s)明後日(\s|$)/

  if (todayRe.test(text)) {
    date = today
    text = text.replace(todayRe, ' ').trim()
  } else if (tomorrowRe.test(text)) {
    date = addDays(today, 1)
    text = text.replace(tomorrowRe, ' ').trim()
  } else if (dayAfterRe.test(text)) {
    date = addDays(today, 2)
    text = text.replace(dayAfterRe, ' ').trim()
  }

  if (!date) {
    const nextWeek = text.match(/(^|\s)来週(日|月|火|水|木|金|土)曜?(\s|$)/)
    if (nextWeek) {
      date = addDays(nextWeekday(today, WEEKDAY_JA[nextWeek[2]!]!), 0)
      text = text.replace(nextWeek[0], ' ').trim()
    }
  }

  // iter254: `next monday` / `next mon` (Todoist 互換)。「次の同曜日」は
  // nextWeekday の delta=0→7 ロジックに任せる (= JA の 来週X曜 と同じ挙動)。
  if (!date) {
    const nextEn = text.match(new RegExp(`(^|\\s)next\\s+(${WEEKDAY_EN_PATTERN})(\\s|$)`, 'i'))
    if (nextEn) {
      date = nextWeekday(today, WEEKDAY_EN[nextEn[2]!.toLowerCase()]!)
      text = text.replace(nextEn[0], ' ').trim()
    }
  }

  // Phase 6.15 iter 233: 「今週末」 = 今週土曜 (今日が土曜なら来週土曜にせず今日)。
  // 「月末」 = 当月の最終日。Todoist の "this weekend" / "end of month" 相当。
  if (!date) {
    if (/(^|\s)今週末(\s|$)/.test(text)) {
      const cur = today.getDay() // 0=Sun..6=Sat
      const delta = (6 - cur + 7) % 7 // 次の (今日含む) 土曜
      date = addDays(today, delta)
      text = text.replace(/(^|\s)今週末(\s|$)/, ' ').trim()
    } else if (/(^|\s)月末(\s|$)/.test(text)) {
      // 当月最終日 (next month の 0 日 = current month 末日)
      date = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      text = text.replace(/(^|\s)月末(\s|$)/, ' ').trim()
    }
  }

  if (!date) {
    const wd = text.match(/(^|\s)(日|月|火|水|木|金|土)曜(\s|$)/)
    if (wd) {
      date = nextWeekday(today, WEEKDAY_JA[wd[2]!]!)
      text = text.replace(wd[0], ' ').trim()
    }
  }

  // iter254: 単体の英語 weekday (`monday` / `mon`)。`next` 接頭辞は上で消費済みなので
  // ここに来るのは「next なし、単独」のケース。挙動は JA と同じく次の該当曜日。
  if (!date) {
    const wdEn = text.match(new RegExp(`(^|\\s)(${WEEKDAY_EN_PATTERN})(\\s|$)`, 'i'))
    if (wdEn) {
      date = nextWeekday(today, WEEKDAY_EN[wdEn[2]!.toLowerCase()]!)
      text = text.replace(wdEn[0], ' ').trim()
    }
  }

  if (!date) {
    const iso = text.match(/(^|\s)(\d{4}-\d{2}-\d{2})(\s|$)/)
    if (iso) {
      date = new Date(iso[2]!)
      text = text.replace(iso[0], ' ').trim()
    }
  }

  // Phase 6.15 iter 230: Todoist 風の相対日付 "+3d" (3 日後) / "+2w" (2 週後)。
  // ASCII '+' のみ受ける (数値は半角)、w は 7 日換算。先頭または空白の後から始まる
  // ものに限定 (title 中の '+' との誤認を防ぐ)。
  if (!date) {
    const rel = text.match(/(^|\s)\+(\d{1,3})([dw])(\s|$)/)
    if (rel) {
      const n = Number(rel[2])
      const days = rel[3] === 'w' ? n * 7 : n
      date = addDays(today, days)
      text = text.replace(rel[0], ' ').trim()
    }
  }

  if (date) {
    out.scheduledFor = isoDate(date)
    // dueDate も埋める (Today ビュー / overdue 判定に使える)
    out.dueDate = out.scheduledFor
  }

  // 余計なスペースを畳む
  out.title = text.replace(/\s+/g, ' ').trim()
  return out
}
