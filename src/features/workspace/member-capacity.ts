/**
 * iter465 P0 (queue: チームメンバー余裕時間 一覧 scope A substrate):
 * 「member の今日 / 今週の利用可能時間 vs 既割当 estimateMinutes 合計」を
 * pure 関数で計算する substrate。
 *
 * 「各チームメンバーが今日、今週、どれくらい余裕な時間があるのかなどもぱっと
 * 見られるようにしたい」(2026-04-29 ユーザ要望) の scope A 最小実装。
 *
 * 役割使い分け:
 *  - 本 helper: capacity (= 8h × N day 等の availability) と used (= 見積合計)
 *    の差分計算 + load status 判定 (緑/黄/赤)
 *  - caller: assignee filter / period filter / capacity 値の決定 (8h × 日数等) は
 *    上位層 (UI / hooks)
 *  - `extractEstimateMinutes` (item/estimate.ts): description から見積分数取出
 *  - `personal-period-goal/period-window`: 期間 (今日 / 今週) の境界計算
 *
 * 仕様:
 *  - 入力 items は **assignee + period で予めフィルタ済** な items 配列
 *    (本 helper は assignee / period を解釈しない)
 *  - estimateMinutes が null / undefined / NaN の Item は **未見積** count に集計
 *    (capacity に算入しない、別 chip で表示する設計)
 *  - estimateMinutes が 負 / Infinity は不正値として未見積扱い (fail-soft)
 *  - status が doneStatusKeys に含まれる Item は **完了済** として used から除外
 *    (capacity に余裕として加算)
 *  - capacityMinutes <= 0 は no-capacity sentinel: utilization=0、load='unknown'
 *  - load 判定 (utilization = used/capacity * 100):
 *    - util < 60 → 'free' (緑、まだ余裕)
 *    - 60 ≤ util < 90 → 'comfortable' (slate、適正範囲)
 *    - 90 ≤ util ≤ 100 → 'tight' (amber、ほぼ満杯)
 *    - util > 100 → 'overloaded' (red、オーバー)
 */

import { formatMinutesJa } from '@/lib/format-duration'
import { rateToPct } from '@/lib/format-rate'
import { type ChipToneClasses, getChipToneClasses } from '@/lib/ui/chip-tone'

export type CapacityLoadStatus = 'free' | 'comfortable' | 'tight' | 'overloaded' | 'unknown'

export interface CapacityItemInput {
  estimateMinutes: number | null | undefined
  status: string | null | undefined
}

export interface MemberCapacityLoad {
  capacityMinutes: number
  usedMinutes: number
  remainingMinutes: number
  utilizationPct: number
  totalItemCount: number
  estimatedItemCount: number
  unestimatedCount: number
  doneItemCount: number
  loadStatus: CapacityLoadStatus
}

const ZERO_RESULT: MemberCapacityLoad = {
  capacityMinutes: 0,
  usedMinutes: 0,
  remainingMinutes: 0,
  utilizationPct: 0,
  totalItemCount: 0,
  estimatedItemCount: 0,
  unestimatedCount: 0,
  doneItemCount: 0,
  loadStatus: 'unknown',
}

export function computeMemberCapacityLoad(
  items: ReadonlyArray<CapacityItemInput>,
  capacityMinutes: number,
  doneStatusKeys: ReadonlySet<string>,
): MemberCapacityLoad {
  if (!Number.isFinite(capacityMinutes) || capacityMinutes <= 0) {
    return { ...ZERO_RESULT, totalItemCount: items.length }
  }

  let usedMinutes = 0
  let estimatedItemCount = 0
  let unestimatedCount = 0
  let doneItemCount = 0

  for (const it of items) {
    const status = it.status ?? ''
    if (doneStatusKeys.has(status)) {
      doneItemCount++
      continue
    }
    const m = it.estimateMinutes
    if (typeof m !== 'number' || !Number.isFinite(m) || m <= 0) {
      unestimatedCount++
      continue
    }
    usedMinutes += m
    estimatedItemCount++
  }

  const remainingMinutes = capacityMinutes - usedMinutes
  const utilizationPct = rateToPct(usedMinutes / capacityMinutes)
  const loadStatus: CapacityLoadStatus =
    utilizationPct < 60
      ? 'free'
      : utilizationPct < 90
        ? 'comfortable'
        : utilizationPct <= 100
          ? 'tight'
          : 'overloaded'

  return {
    capacityMinutes,
    usedMinutes,
    remainingMinutes,
    utilizationPct,
    totalItemCount: items.length,
    estimatedItemCount,
    unestimatedCount,
    doneItemCount,
    loadStatus,
  }
}

/**
 * `MemberCapacityLoad` を ja-JP 1 行 summary に整形 (chip / aria-label / AI brief 共通)。
 *  - 'unknown' → '余裕時間 算定不能'
 *  - 'free' → '余裕あり: 残 X 時間 / capacity Y 時間 (Z%)'
 *  - 'comfortable' → '適正: 残 X 時間 / capacity Y 時間 (Z%)'
 *  - 'tight' → 'ギリギリ: 残 X 時間 / capacity Y 時間 (Z%)'
 *  - 'overloaded' → 'オーバー: -X 時間オーバー / capacity Y 時間 (Z%)'
 *  - 末尾に未見積 N 件 chip を付与 (>0 の時のみ)
 */
export function formatMemberCapacityLoadJa(load: MemberCapacityLoad): string {
  if (load.loadStatus === 'unknown') {
    const tail = load.totalItemCount > 0 ? ` / 全 ${load.totalItemCount} 件` : ''
    return `余裕時間 算定不能${tail}`
  }
  const cap = formatMinutesJa(load.capacityMinutes)
  const remain = formatMinutesJa(Math.abs(load.remainingMinutes))
  const head =
    load.loadStatus === 'free'
      ? `余裕あり: 残 ${remain}`
      : load.loadStatus === 'comfortable'
        ? `適正: 残 ${remain}`
        : load.loadStatus === 'tight'
          ? `ギリギリ: 残 ${remain}`
          : `オーバー: ${remain}超`
  const body = `${head} / capacity ${cap} (${load.utilizationPct}%)`
  const unestTail = load.unestimatedCount > 0 ? ` / 未見積 ${load.unestimatedCount} 件` : ''
  return `${body}${unestTail}`
}

/**
 * iter486 basics (graphical 波及): CapacityLoadStatus を「graphical chip tone」 token に
 * 変換する pure helper。iter485 で集約した `lib/ui/chip-tone.ts` の 6 段階 vocabulary
 * (danger/urgent/warn/info/idle/success) を utilize、特に **'success' tone (emerald)
 * を 'free' (時間に余裕) にマップ** = severity 軸と直交する positive 軸を導入
 * (iter486 で chip-tone vocab に追加)。
 *
 * 配色 token:
 *  - 'danger'  — overloaded (rose、オーバー、危険)
 *  - 'urgent'  — tight (amber 強、ほぼ満杯、警戒)
 *  - 'info'    — comfortable (blue 薄、適正範囲、計画通り)
 *  - 'success' — free (emerald、余裕あり、健全)
 *  - 'idle'    — unknown (slate 薄、計算不能)
 */
export type MemberCapacityTone = 'danger' | 'urgent' | 'info' | 'success' | 'idle'

const STATUS_TONE_MAP: Record<CapacityLoadStatus, MemberCapacityTone> = {
  overloaded: 'danger',
  tight: 'urgent',
  comfortable: 'info',
  free: 'success',
  unknown: 'idle',
}

export function memberCapacityTone(status: CapacityLoadStatus): MemberCapacityTone {
  return STATUS_TONE_MAP[status]
}

/** alias to `ChipToneClasses` (`@/lib/ui/chip-tone`)。caller の import path を維持。 */
export type MemberCapacityChipClasses = ChipToneClasses

/** Tone → Tailwind chip class 3 軸 (bg / text / ring) を 1 関数で。iter485 集約済 helper に委譲。 */
export function memberCapacityChipClasses(status: CapacityLoadStatus): MemberCapacityChipClasses {
  return getChipToneClasses(STATUS_TONE_MAP[status])
}
