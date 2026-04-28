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

import { daysBetween, todayISO } from './sprint-date-helpers'

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
  const elapsedPct = Math.round((elapsedDays / totalDays) * 100)
  const total = Math.max(0, input.total)
  const done = Math.max(0, input.done)
  const completionPct = total === 0 ? 0 : Math.round((done / total) * 100)
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
