/**
 * iter327 ai-automation: time_entries から「連続稼働日数」(streak) を計算する pure helper。
 *
 * iter319 `weekly-time-trend.ts` (今週 vs 先週) / iter302 並走 `velocity.ts` (件数ペース) /
 * iter314 `daily-summary.ts` (日次集計) と並ぶ「時間の見方」第 5 軸 — **習慣**。
 *
 * Duolingo / GitHub contribution graph 風の「連続 N 日」モチベーション指標。
 * 1 日でも稼働 0 (= durationMinutes 合計 0) の日が挟まると streak リセット。
 * AI 朝 brief / dashboard widget が「連続稼働 7 日目!」「昨日抜けて連続記録リセット
 * (前回 12 日)」のような前向き / リカバリ文言を出せる substrate。
 *
 * 仕様:
 *   - 「稼働日」 = workDate を bucket key として durationMinutes 合計が >0 の日
 *   - currentStreak: today から逆順に連続して稼働日が続く日数 (today 自身が
 *     非稼働なら 0、yesterday が非稼働でも today が稼働なら 1)
 *   - longestStreak: 入力 entries 範囲内の最長連続日数 (currentStreak も含む)
 *   - lastActiveDate: 最後に稼働した日 (= 最後の active 日付 ISO)。0 件で null
 *
 * 不正値 fail-soft:
 *   - workDate 形式違反 (`/^\d{4}-\d{2}-\d{2}$/` 不一致) は除外
 *   - durationMinutes が NaN/負/Infinity は 0 として扱う (= bucket には残るが
 *     active 判定には貢献しない)
 *   - today が不正 ISO なら currentStreak=0 / lastActiveDate を返すのみ
 *
 * 計算量 O(N + D) (N = entry 数、D = 入力期間日数)。caller は entries を絞った
 * 状態 (例: 直近 90 日) で渡す想定。
 */

import { shiftIsoDate } from '@/lib/date/iso'

import { safeMinutes } from './safe-minutes'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface StreakEntry {
  workDate: string
  durationMinutes: number
}

export interface StreakResult {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
}

// iter330 refactor: shiftDays は lib/date/iso.ts#shiftIsoDate に集約 (2 callsite 重複削除)。

function buildActiveDateSet(entries: readonly StreakEntry[]): Set<string> {
  const totals = new Map<string, number>()
  for (const e of entries) {
    if (!ISO_DATE_RE.test(e.workDate)) continue
    totals.set(e.workDate, (totals.get(e.workDate) ?? 0) + safeMinutes(e.durationMinutes))
  }
  const active = new Set<string>()
  for (const [date, min] of totals) {
    if (min > 0) active.add(date)
  }
  return active
}

export function computeDailyStreak(entries: readonly StreakEntry[], today: string): StreakResult {
  const active = buildActiveDateSet(entries)
  if (active.size === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null }
  }
  // lastActiveDate は ISO 文字列の昇順比較で最大値を取る
  let lastActiveDate: string | null = null
  for (const d of active) {
    if (lastActiveDate === null || d > lastActiveDate) lastActiveDate = d
  }

  let currentStreak = 0
  if (ISO_DATE_RE.test(today)) {
    let cursor = today
    while (active.has(cursor)) {
      currentStreak += 1
      cursor = shiftIsoDate(cursor, -1)
    }
  }

  // longestStreak: ソート済 active dates を走査し、隣接 (前日 +1) なら継続
  const sorted = Array.from(active).sort()
  let longestStreak = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    if (prev !== null && shiftIsoDate(prev, 1) === d) {
      run += 1
    } else {
      run = 1
    }
    if (run > longestStreak) longestStreak = run
    prev = d
  }
  // currentStreak は longest 内に含まれている可能性あり (shift 計算上自動的に反映)
  if (currentStreak > longestStreak) longestStreak = currentStreak

  return { currentStreak, longestStreak, lastActiveDate }
}

export function formatStreakSummary(result: Readonly<StreakResult>, today: string): string {
  if (result.lastActiveDate === null) {
    return '稼働記録: まだ無し'
  }
  if (result.currentStreak > 0) {
    const trail =
      result.longestStreak > result.currentStreak ? ` (最長 ${result.longestStreak} 日)` : ''
    return `連続稼働 ${result.currentStreak} 日目${trail}`
  }
  // currentStreak=0 だが過去 active あり → リセット文言
  if (!ISO_DATE_RE.test(today)) {
    return `稼働記録: 最終 ${result.lastActiveDate} (最長 ${result.longestStreak} 日)`
  }
  // どれくらい前に最終稼働だったか
  const last = result.lastActiveDate
  // 簡易差分: 文字列 ISO で diff を計算
  const [y1, m1, d1] = today.split('-').map(Number)
  const [y2, m2, d2] = last.split('-').map(Number)
  const t1 = Date.UTC(y1!, m1! - 1, d1!)
  const t2 = Date.UTC(y2!, m2! - 1, d2!)
  const diffDays = Math.round((t1 - t2) / 86_400_000)
  if (diffDays <= 1) {
    // 今日が非稼働、昨日が active だった (まだ復帰可能の含み)
    return `連続記録リセット: 昨日 ${last} (最長 ${result.longestStreak} 日)`
  }
  return `連続記録リセット: ${diffDays} 日前 (最長 ${result.longestStreak} 日)`
}
