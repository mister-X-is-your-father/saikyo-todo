/**
 * Sprint の簡易 Burndown 算出 (iter285 で `sprints-panel.tsx` SprintCard から
 * 抽出 / 単体テスト化)。
 *
 * UI の SprintCard / 将来の AI brief / dashboard widget が「経過率」「完了率」
 * 「on-track かどうか」を一貫した式で判定できるよう pure 関数化する。
 *
 * 入出力:
 *   - 全日数は `daysBetween` (UTC 基準) で算出。totalDays は両端含む (= +1)、
 *     最低 1 (start = end の Sprint で 0 除算しない)。
 *   - elapsedDays は `[0, totalDays]` に clamp。今日が start より前 → 0、
 *     end を過ぎた → totalDays。
 *   - remainingDays は `[0, ∞)` に clamp。end を過ぎたら 0。
 *   - 完了率 (completionPct) = round(done/total * 100)、total=0 → 0。
 *   - 経過率 (elapsedPct) = round(elapsedDays/totalDays * 100)。
 *   - isOnTrack = total=0 → true (= 未割当の Sprint は遅れ警告しない)、
 *     それ以外は completionPct ≥ elapsedPct - 10 (10% 余裕)。
 *
 * 注意: today を未指定 → `todayISO()` (端末ローカル TZ)。テストは `today`
 * を必ず明示してくれ (タイミング依存の flake を避けるため)。
 */

import { rateToPct } from '@/lib/format-rate'

import { addDaysISO, daysBetween, todayISO } from './sprint-date-helpers'

export interface BurndownInput {
  /** ISO `YYYY-MM-DD` */
  startDate: string
  /** ISO `YYYY-MM-DD` */
  endDate: string
  /** Sprint に割当済の item 件数 */
  total: number
  /** うち status=done の件数 */
  done: number
  /** ISO `YYYY-MM-DD`、省略時は端末ローカルの今日 */
  today?: string
}

export interface SprintBurndown {
  /** Sprint 期間の総日数 (両端含む、最低 1) */
  totalDays: number
  /** 経過日数 `[0, totalDays]` */
  elapsedDays: number
  /** 残日数 `[0, ∞)` */
  remainingDays: number
  /** 経過率 0..100 (round) */
  elapsedPct: number
  /** 完了率 0..100 (round)、total=0 → 0 */
  completionPct: number
  /** 遅れ気味でないか (total=0 → 常に true、それ以外は完了率 ≥ 経過率-10) */
  isOnTrack: boolean
}

export function computeSprintBurndown(input: BurndownInput): SprintBurndown {
  const today = input.today ?? todayISO()
  const totalDays = Math.max(1, daysBetween(input.startDate, input.endDate) + 1)
  const elapsedDays = Math.max(0, Math.min(totalDays, daysBetween(input.startDate, today) + 1))
  const remainingDays = Math.max(0, daysBetween(today, input.endDate))
  const elapsedPct = rateToPct(elapsedDays / totalDays)
  const total = Math.max(0, input.total)
  const done = Math.max(0, input.done)
  const completionPct = total === 0 ? 0 : rateToPct(done / total)
  const isOnTrack = total === 0 ? true : completionPct >= elapsedPct - 10
  return { totalDays, elapsedDays, remainingDays, elapsedPct, completionPct, isOnTrack }
}

/**
 * iter298 basics: Sprint の進捗 tone (色 / icon の意味付け) を pure に決める。
 *
 * UI の sprints-panel.tsx で `bg-primary` 一律だった progress bar を、
 * `達成 (緑チェック) / 進行中 (青↑) / 遅延 (黄⚠) / 対象外 (zinc)` の 4 段で
 * 視覚的に意味を持たせる substrate (FEEDBACK_QUEUE「Goal / Sprint progress bar:
 * 残/超過/達成を色 + icon で意味付け」)。
 *
 * tone 判定:
 *   - `done`:    completionPct === 100 (= 全 item 完了。状態に関わらず最強の達成サイン)
 *   - `behind`:  status === 'active' && !isOnTrack (active で遅れ気味)
 *   - `onTrack`: status === 'active' && isOnTrack (active で順調)
 *   - `idle`:    上記以外 (planning / completed / cancelled、または total=0)
 *
 * Note: completionPct=100 が active 中の cancelled より優先 (達成は永続)。
 */
export type SprintProgressTone = 'done' | 'onTrack' | 'behind' | 'idle'

export function sprintProgressTone(
  burndown: Pick<SprintBurndown, 'completionPct' | 'isOnTrack'>,
  status: 'planning' | 'active' | 'completed' | 'cancelled',
): SprintProgressTone {
  if (burndown.completionPct >= 100) return 'done'
  if (status === 'active') return burndown.isOnTrack ? 'onTrack' : 'behind'
  return 'idle'
}

const SPRINT_PROGRESS_TONE_LABEL: Record<SprintProgressTone, string> = {
  done: '達成',
  onTrack: '順調',
  behind: '遅れ気味',
  idle: '進行中',
}

/**
 * iter316 refactor: sprints-panel.tsx に inline で定義されていた tone → 日本語 label
 * の map を burndown domain に集約。`goalHealthTierLabel` (iter299 並走 e0a4d20) と
 * 対称な API。AI brief / dashboard widget も同 label を使えるよう pure 化。
 */
export function sprintProgressToneLabel(tone: SprintProgressTone): string {
  return SPRINT_PROGRESS_TONE_LABEL[tone]
}

/**
 * iter307 ai-automation: 完了ペース (avgPerDay) を加味した「予想完了日」/「上振れ・下振れ日数」
 * を返す pure helper。
 *
 * Sprint review の AI brief / dashboard widget が「このペースなら N 日上振れ / 下振れ」
 * を 1 関数で出せる substrate。今までは UI に「elapsedPct vs completionPct」しか無く、
 * 実際の完了ペース (= 過去 N 日の done 数 / N) を加味した projection が取れなかった。
 *
 * 仕様:
 *  - `avgPerDay` <= 0 → projection 不能 (`projectedFinishDate=null`、daysAhead=null、kind='unknown')
 *  - 全 done 済 (done >= total) → `kind='done'`、daysAhead = remainingDays (= 期限まで余裕日数)、
 *    projectedFinishDate = today (= 「今日完了済」と扱う)
 *  - それ以外: 残件 / avgPerDay = 必要日数、`projectedFinishDate = today + ceil(必要日数)`
 *    daysAhead = endDate - projectedFinishDate (符号付き、+ で上振れ / - で下振れ)
 *  - `kind`: daysAhead >= +2 → 'ahead' / -1..+1 → 'on-pace' / -7..-2 → 'behind' / <-7 → 'overdue'
 *
 * ペース信頼性: avgPerDay が小さすぎる (例: 0.05 件/日) と projection が遠未来になる。
 * caller は `kind='ahead'` でも `avgPerDay < 0.5` なら「ペース推定信頼性低」と注釈する想定。
 */
export type SprintProjectionKind = 'done' | 'ahead' | 'on-pace' | 'behind' | 'overdue' | 'unknown'

export interface SprintProjection {
  /** 'YYYY-MM-DD' or null。avgPerDay<=0 のとき null */
  projectedFinishDate: string | null
  /** endDate - projectedFinishDate (符号付き、null なら null) */
  daysAhead: number | null
  kind: SprintProjectionKind
}

export interface SprintProjectionInput {
  /** Sprint の総 item 件数 */
  total: number
  /** うち done 件数 */
  done: number
  /** 'YYYY-MM-DD' */
  endDate: string
  /** 'YYYY-MM-DD'、省略で端末ローカル今日 */
  today?: string
  /** velocity から得られる完了ペース。<=0 で 'unknown' projection */
  avgPerDay: number
}

export function computeSprintProjection(input: SprintProjectionInput): SprintProjection {
  const today = input.today ?? todayISO()
  const total = Math.max(0, input.total)
  const done = Math.max(0, input.done)
  const remaining = Math.max(0, total - done)

  if (total === 0) {
    return { projectedFinishDate: null, daysAhead: null, kind: 'unknown' }
  }

  if (remaining === 0) {
    // 既に全完了: end - today を上振れ日数として返す
    const daysAhead = daysBetween(today, input.endDate)
    return { projectedFinishDate: today, daysAhead, kind: 'done' }
  }

  if (!Number.isFinite(input.avgPerDay) || input.avgPerDay <= 0) {
    return { projectedFinishDate: null, daysAhead: null, kind: 'unknown' }
  }

  const neededDays = Math.ceil(remaining / input.avgPerDay)
  const projectedFinishDate = addDaysISO(today, neededDays)
  const daysAhead = daysBetween(projectedFinishDate, input.endDate)

  let kind: SprintProjectionKind
  if (daysAhead >= 2) kind = 'ahead'
  else if (daysAhead >= -1) kind = 'on-pace'
  else if (daysAhead >= -7) kind = 'behind'
  else kind = 'overdue'

  return { projectedFinishDate, daysAhead, kind }
}

/**
 * AI prompt 行 / dashboard chip 用の 1 行 summary。
 *   - done       → "Sprint 完了 (期限まで N 日)"
 *   - ahead      → "予想 +N 日上振れ (YYYY-MM-DD 完了見込み)"
 *   - on-pace    → "予想 ±0 (期限ぴったり、YYYY-MM-DD)"
 *   - behind     → "予想 -N 日下振れ (YYYY-MM-DD)"
 *   - overdue    → "予想 -N 日 (期限超過、YYYY-MM-DD)"
 *   - unknown    → "予想不能 (ペース不明)"
 */
export function formatSprintProjection(projection: SprintProjection): string {
  if (projection.kind === 'unknown') return '予想不能 (ペース不明)'
  if (projection.kind === 'done') {
    const margin = projection.daysAhead ?? 0
    return margin >= 0
      ? `Sprint 完了 (期限まで ${margin} 日)`
      : `Sprint 完了 (期限後 ${-margin} 日)`
  }
  const date = projection.projectedFinishDate ?? '?'
  const ahead = projection.daysAhead ?? 0
  if (projection.kind === 'on-pace') return `予想 ±${ahead === 0 ? 0 : ahead} (${date})`
  const sign = ahead >= 0 ? '+' : '-'
  const abs = Math.abs(ahead)
  if (projection.kind === 'ahead') return `予想 ${sign}${abs} 日上振れ (${date})`
  if (projection.kind === 'behind') return `予想 ${sign}${abs} 日下振れ (${date})`
  return `予想 ${sign}${abs} 日 (期限超過、${date})`
}
