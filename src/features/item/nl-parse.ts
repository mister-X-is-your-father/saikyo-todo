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
 *   - estimateMinutes: 工数推定 (30m/1h/1.5h/1h30m/30分/1時間/1時間30分)
 */

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
  // JA: `30分` / `1時間` / `1時間30分` (時間と分の連結のみ; 単独「秒」は無視)
  // EN: `30m` / `30min` / `30mins` / `1h` / `1.5h` / `2h30m` / `2H30MIN`
  // 上限 60 時間 (3600 分)、0 分は無視。範囲外は token を消さず title に残す。
  const consumeEstimate = (match: RegExpMatchArray, minutes: number): void => {
    if (minutes > 0 && minutes <= 3600) {
      out.estimateMinutes = minutes
      text = text.replace(match[0], ' ').trim()
    }
  }
  const estJa = text.match(/(^|\s)(\d{1,3})時間(?:(\d{1,2})分)?(\s|$)/)
  if (estJa) {
    consumeEstimate(estJa, Number(estJa[2]) * 60 + Number(estJa[3] ?? '0'))
  } else {
    const estJaMin = text.match(/(^|\s)(\d{1,3})分(\s|$)/)
    if (estJaMin) consumeEstimate(estJaMin, Number(estJaMin[2]))
  }
  if (out.estimateMinutes === undefined) {
    const estEn = text.match(/(^|\s)(\d+(?:\.\d+)?)h(?:(\d{1,2})m(?:in)?s?)?(\s|$)/i)
    if (estEn) {
      const hours = Number(estEn[2])
      const mins = Number(estEn[3] ?? '0')
      consumeEstimate(estEn, Math.round(hours * 60) + mins)
    } else {
      const estEnMin = text.match(/(^|\s)(\d{1,3})m(?:in)?s?(\s|$)/i)
      if (estEnMin) consumeEstimate(estEnMin, Number(estEnMin[2]))
    }
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

  // 日付: 今日 / 明日 / 明後日 / 来週X曜 / X曜 / YYYY-MM-DD
  const today = new Date(opts.today.getFullYear(), opts.today.getMonth(), opts.today.getDate())
  let date: Date | null = null

  if (/(^|\s)今日(\s|$)/.test(text)) {
    date = today
    text = text.replace(/(^|\s)今日(\s|$)/, ' ').trim()
  } else if (/(^|\s)明日(\s|$)/.test(text)) {
    date = addDays(today, 1)
    text = text.replace(/(^|\s)明日(\s|$)/, ' ').trim()
  } else if (/(^|\s)明後日(\s|$)/.test(text)) {
    date = addDays(today, 2)
    text = text.replace(/(^|\s)明後日(\s|$)/, ' ').trim()
  }

  if (!date) {
    const nextWeek = text.match(/(^|\s)来週(日|月|火|水|木|金|土)曜?(\s|$)/)
    if (nextWeek) {
      date = addDays(nextWeekday(today, WEEKDAY_JA[nextWeek[2]!]!), 0)
      text = text.replace(nextWeek[0], ' ').trim()
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

/**
 * 推定分数を日本語の人間表記に整形する (chip / description / aria-label 共有)。
 * 0 や負値は空文字。`90` → `1時間30分` / `60` → `1時間` / `45` → `45分`。
 */
export function formatEstimate(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return ''
  if (minutes < 60) return `${minutes}分`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}
