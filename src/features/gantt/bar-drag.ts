/**
 * iter467 P0 (queue: Gantt DnD 期間編集 scope A substrate): Gantt bar の DnD で
 * 期間 (startDate / dueDate) を平行 shift する pixel→day 変換 pure helper。
 *
 * 「ガントチャートの期間を直接ドラッグアンドドロップで移動」(2026-04-29 ユーザ要望)
 * の **scope A 最小** 中央 drag (期間維持で平行 shift)。次 iter で gantt-view bar
 * に dnd-kit Sortable + onDragEnd で本 helper を呼び出す UI bind。
 *
 * scope B (左右 edge resize / 依存連動 shift) は別 iter。
 *
 * 既存資産:
 *  - `shiftIsoDate(iso, days)` (lib/date/iso) で UTC 基準 N 日 shift (TZ shift 無関係)
 *
 * 仕様 (中央 drag = 平行 shift):
 *  - deltaPx (px) を deltaDays (整数日) に丸める: `Math.round(deltaPx / dayPx)`
 *    (snap to day boundary、半日以上で次の日へ)
 *  - dayPx ≤ 0 / NaN / Infinity → noShift sentinel (caller は revert する)
 *  - deltaDays === 0 → 元の値 (動かなかった、mutation 不要)
 *  - deltaDays !== 0 → startDate / dueDate を同じ deltaDays で shift
 *  - startDate / dueDate のどちらかが null なら shift 対象外で null のまま (Gantt の
 *    bar render は両方 set 必須なので caller は drag 不可、本 helper も safe-noop)
 */

import { shiftIsoDate } from '@/lib/date/iso'

export interface BarDragInput {
  /** 元の startDate (`YYYY-MM-DD` or null) */
  startDate: string | null
  /** 元の dueDate (`YYYY-MM-DD` or null) */
  dueDate: string | null
  /** drag による pixel 移動量 (右が正、左が負) */
  deltaPx: number
  /** 1 日あたりの pixel 幅 (zoom level に依存、通常 8〜32px) */
  dayPx: number
}

export interface BarDragResult {
  /** 新 startDate (= 元 ± deltaDays、null は null のまま) */
  startDate: string | null
  /** 新 dueDate (= 元 ± deltaDays、null は null のまま) */
  dueDate: string | null
  /** 適用された日数 shift (round 後)。0 なら何も変わっていない */
  deltaDays: number
  /** 入力が無効で shift できなかった (caller は revert) */
  invalid: boolean
}

export function computeBarDragShift(input: BarDragInput): BarDragResult {
  if (!Number.isFinite(input.dayPx) || input.dayPx <= 0 || !Number.isFinite(input.deltaPx)) {
    return {
      startDate: input.startDate,
      dueDate: input.dueDate,
      deltaDays: 0,
      invalid: true,
    }
  }
  const deltaDays = Math.round(input.deltaPx / input.dayPx)
  if (deltaDays === 0) {
    return {
      startDate: input.startDate,
      dueDate: input.dueDate,
      deltaDays: 0,
      invalid: false,
    }
  }
  return {
    startDate: input.startDate ? shiftIsoDate(input.startDate, deltaDays) : null,
    dueDate: input.dueDate ? shiftIsoDate(input.dueDate, deltaDays) : null,
    deltaDays,
    invalid: false,
  }
}

/**
 * 「scope B 左 edge resize」 (startDate のみ shift、dueDate は固定) のための変種。
 * 仕様: dueDate を不変に保ち、startDate のみ deltaDays shift。startDate > dueDate に
 * なる shift は **clamp** して startDate = dueDate とする (= 期間 0 日)。
 *
 * 本 helper は scope A では未使用 (UI で disable)、scope B 以降で edge drag が
 * 配線された時に使う。
 */
export function computeBarLeftEdgeShift(input: BarDragInput): BarDragResult {
  if (!Number.isFinite(input.dayPx) || input.dayPx <= 0 || !Number.isFinite(input.deltaPx)) {
    return {
      startDate: input.startDate,
      dueDate: input.dueDate,
      deltaDays: 0,
      invalid: true,
    }
  }
  if (!input.startDate || !input.dueDate) {
    return { startDate: input.startDate, dueDate: input.dueDate, deltaDays: 0, invalid: false }
  }
  const deltaDays = Math.round(input.deltaPx / input.dayPx)
  if (deltaDays === 0) {
    return { startDate: input.startDate, dueDate: input.dueDate, deltaDays: 0, invalid: false }
  }
  const newStart = shiftIsoDate(input.startDate, deltaDays)
  const clampedStart = newStart > input.dueDate ? input.dueDate : newStart
  return {
    startDate: clampedStart,
    dueDate: input.dueDate,
    deltaDays,
    invalid: false,
  }
}

/**
 * 「scope B 右 edge resize」 (dueDate のみ shift、startDate は固定) のための変種。
 * dueDate < startDate になる shift は clamp して dueDate = startDate (期間 0 日)。
 */
export function computeBarRightEdgeShift(input: BarDragInput): BarDragResult {
  if (!Number.isFinite(input.dayPx) || input.dayPx <= 0 || !Number.isFinite(input.deltaPx)) {
    return {
      startDate: input.startDate,
      dueDate: input.dueDate,
      deltaDays: 0,
      invalid: true,
    }
  }
  if (!input.startDate || !input.dueDate) {
    return { startDate: input.startDate, dueDate: input.dueDate, deltaDays: 0, invalid: false }
  }
  const deltaDays = Math.round(input.deltaPx / input.dayPx)
  if (deltaDays === 0) {
    return { startDate: input.startDate, dueDate: input.dueDate, deltaDays: 0, invalid: false }
  }
  const newDue = shiftIsoDate(input.dueDate, deltaDays)
  const clampedDue = newDue < input.startDate ? input.startDate : newDue
  return {
    startDate: input.startDate,
    dueDate: clampedDue,
    deltaDays,
    invalid: false,
  }
}
