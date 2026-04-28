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

import { isoDate, parseDateFromText } from './date-tokens'
import { parseEstimateFromText } from './estimate'
import { parseTimeFromText } from './time-tokens'

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

/**
 * 入力テキストから様々な token を抽出する。見つけたら remove。
 *
 * 日付トークン (今日 / 来週月曜 / next monday / +3d / YYYY-MM-DD …) と
 * 工数推定 (1時間30分 / 1.5h …) はそれぞれ `./date-tokens.ts` /
 * `./estimate.ts` に分離した pure helper を呼ぶ。
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

  // 時刻 — colon / AM/PM / JA HH時 / JA alias / EN alias を 1 関数に集約 (iter266)。
  // 詳細パターンは `./time-tokens.ts` の parseTimeFromText を参照。
  const timeResult = parseTimeFromText(text)
  if (timeResult) {
    out.dueTime = timeResult.time
    text = text.replace(timeResult.matched, ' ').trim()
  }

  // 日付: 今日 / 明日 / 明後日 / today / tomorrow / 来週X曜 / next monday /
  //       X曜 / monday / YYYY-MM-DD / +3d / +2w / 今週末 / 月末。
  // 詳細パターンは `./date-tokens.ts` の parseDateFromText に分離済 (上から順、先勝ち)。
  const dateResult = parseDateFromText(text, opts.today)
  if (dateResult) {
    out.scheduledFor = isoDate(dateResult.date)
    // dueDate も埋める (Today ビュー / overdue 判定に使える)
    out.dueDate = out.scheduledFor
    text = text.replace(dateResult.matched, ' ').trim()
  }

  // 余計なスペースを畳む
  out.title = text.replace(/\s+/g, ' ').trim()
  return out
}
