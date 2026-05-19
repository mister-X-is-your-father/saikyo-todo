/**
 * iter305 refactor: gantt-view.tsx 内 inline で書かれていた「日付範囲 / 全日数 /
 * 今日の pixel offset」の計算を pure 関数に集約。
 *
 * 抽出元: `src/components/workspace/gantt-view.tsx#GanttView` 内 `range` /
 * `totalDays` / `todayX` の inline useMemo + 計算式 (合計 ~25 行)。
 *
 * 抽出効用:
 *  - useMemo の dep array が複雑化していたが pure 関数化で関心分離
 *  - AI brief / dashboard widget が「Gantt の範囲を計算したい」時に同 logic 流用
 *  - 単体テストで boundary (空配列 / 1 件 / 多件 / 範囲外 today / 24h fraction) を固定
 *
 * 入力は `Date` 配列の `{start, due}` 構造体 (toDate で正規化済を caller 想定)。
 * date-fns に依存 (既存 dependency、pure 関数なので env 不要)。
 */

import { addDays, differenceInCalendarDays } from 'date-fns'

import { formatLocalISO } from '@/lib/date/iso'

/** Gantt 行の最小入力 (start/due の Date が必須)。caller 側で `toDate` 通過想定。 */
export interface GanttRow {
  start: Date
  due: Date
}

export interface GanttRange {
  /** 範囲の開始 (= min(start) - 1 日) */
  start: Date
  /** 範囲の終了 (= max(due) + 1 日) */
  end: Date
}

/**
 * items の `start` 最小値と `due` 最大値を求め、両端 1 日ずつ余白を取った範囲を返す。
 * items が空なら null (= Gantt 自体を描画しない caller 側で early return 用)。
 */
export function computeGanttRange(rows: readonly GanttRow[]): GanttRange | null {
  if (rows.length === 0) return null
  let min = rows[0]!.start
  let max = rows[0]!.due
  for (const x of rows) {
    if (x.start < min) min = x.start
    if (x.due > max) max = x.due
  }
  return { start: addDays(min, -1), end: addDays(max, 1) }
}

/** 範囲の総日数 (両端含む)。range が null なら 0。 */
export function computeTotalDays(range: GanttRange | null): number {
  if (!range) return 0
  return differenceInCalendarDays(range.end, range.start) + 1
}

/**
 * 今日の pixel offset を Gantt timeline 上で計算。range 範囲外なら null
 * (= Today 線を描画しない caller 側 fallback 用)。
 *
 * `dayPx` (= 1 日分の幅 px) は zoom level (compact/normal/wide) で外部入力。
 * 24 時間 fraction も加味して、午後 3 時なら + 0.625 * dayPx 分シフトする (TeamGantt
 * の Today 線は時刻精度で動く)。
 */
export function computeTodayX(range: GanttRange | null, today: Date, dayPx: number): number | null {
  if (!range) return null
  const dayOffset = differenceInCalendarDays(today, range.start)
  const totalDays = computeTotalDays(range)
  if (dayOffset < 0 || dayOffset >= totalDays) return null
  const hourFraction = (today.getHours() * 60 + today.getMinutes()) / (24 * 60)
  return (dayOffset + hourFraction) * dayPx
}

/**
 * iter310 refactor: gantt-view.tsx 内 inline で書かれていた「月境界 day index」
 * 計算を pure 関数化。
 *
 * `days` (= range.start から 1 日刻みの Date 配列) を走査し、前日と月が変わる
 * index を返す。caller 側はこれを timeline 上で `i * dayPx` に縦線を描く
 * (TeamGantt 風 month boundary)。
 *
 * - days が空 / 1 件 → 空配列 (境界なし)
 * - 月をまたぐたびに index を 1 個追加、最大で `days.length - 1` 個
 * - 年跨ぎ (12 月 → 1 月) も別月として境界に入る (getMonth は 0-11)
 */
export function computeMonthBoundaries(days: readonly Date[]): number[] {
  const boundaries: number[] = []
  for (let i = 1; i < days.length; i++) {
    if (days[i]!.getMonth() !== days[i - 1]!.getMonth()) {
      boundaries.push(i)
    }
  }
  return boundaries
}

/**
 * iter1008 basics: GanttRange を ja-JP 1 行に整形 (chip / aria-label / Slack 通知 用)。
 *
 *   - null → 'Gantt 範囲なし'
 *   - 通常 → 'Gantt 範囲: 2026-04-01 〜 2026-05-31 (61 日間)'
 *
 * caller (= gantt-view header aria-label / dashboard widget / AI prompt) は本文字列を
 * そのまま埋め込み可能。`computeTotalDays` を内部呼び出して日数も同行に含める。
 *
 * 日付フォーマットは Locale 依存最小化のため ISO `YYYY-MM-DD` 固定 (= `padStart`)。
 * 時刻 fraction は無視 (= 日付のみ)、`computeTodayX` (時刻精度) との視覚 reference 軸。
 *
 * 既存 helper との関係:
 *   - `computeGanttRange`: rows → range null-able 計算
 *   - `computeTotalDays`: range → 日数
 *   - 本 helper: 上記 2 つの output を 1 行 chip 文言に整形 (= UI 直 bind 経路)
 */
export function formatGanttRangeJa(range: GanttRange | null): string {
  if (range === null) return 'Gantt 範囲なし'
  const days = computeTotalDays(range)
  return `Gantt 範囲: ${formatLocalISO(range.start)} 〜 ${formatLocalISO(range.end)} (${days} 日間)`
}
