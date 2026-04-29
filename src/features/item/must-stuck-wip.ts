/**
 * iter364 ai-automation: MUST × stuck WIP combinator。
 *
 * iter357 must-hygiene (= MUST の dueDate 設定状況) と iter359 wip-stuck (= 進行中
 * だが updatedAt が動いていない WIP) を 2 軸で交差させる combinator。iter384
 * (`aged-hygiene-debt` = hygiene-debt × aging) や iter397 (`stale-urgent` = urgency
 * × aging) と同パターンの 2 軸交差 substrate。
 *
 * 単独 must-hygiene (MUST 全般 / dueDate 設定状況) や単独 wip-stuck (停滞 WIP 全般)
 * より signal 強度が高い: MUST はあって当然、stuck WIP も発生して当然、しかし両方
 * 該当 = 「絶対落とせない MUST を着手したのに 3 日以上触っていない」 = 最深刻アラーム。
 *
 * caller benefits:
 *   - AI 朝 brief 「MUST 進行中だが停滞 2 件 (タスクA 7日 / タスクB 4日) — 即対応」を 1 関数で
 *   - pm-agent watch list の最高優先 nudge 候補 (= MUST + 進行中 + 停滞 の triage)
 *   - dashboard 専用 chip 候補 (severity 'critical' = red、wip-stuck chip と異なる色軸)
 */

import { formatTopWithOverflow } from '@/lib/format-list'

import { filterMustOnly } from './must-filter'
import {
  bucketByPriorityWith,
  formatPriorityBucketsCountWithDays,
  type PriorityKey,
} from './priority'
import {
  renderStuckEntry,
  selectStuckWipItems,
  type StuckWipEntry,
  type StuckWipFields,
} from './wip-stuck'

export interface MustStuckWipFields extends StuckWipFields {
  isMust: boolean | null | undefined
}

export interface PickMustStuckWipOptions {
  /** stuck と見なす updatedAt 経過日数の閾値。default 3 (= wip-stuck と同じ) */
  thresholdDays?: number
}

/**
 * isMust === true かつ stuck WIP な entries を stable 順序 (stuckDays desc + 元配列順)
 * で返す薄い filter。selectStuckWipItems に MUST 制約を追加した形。
 *
 * 仕様:
 *   - 内部で wip-stuck の filter ロジックを再適用 (status='in_progress' / done/archive
 *     除外 / updatedAt 不正除外 / 未来時刻除外 / threshold filter)
 *   - 並び順 / fail-soft / threshold の挙動は selectStuckWipItems と完全互換
 *   - isMust=false / null / undefined は除外
 */
export function pickMustStuckWipItems<T extends MustStuckWipFields>(
  items: readonly T[],
  options: PickMustStuckWipOptions = {},
  today: Date | string = new Date(),
): StuckWipEntry<T>[] {
  return selectStuckWipItems(filterMustOnly(items), options, today)
}

/**
 * AI prompt / dashboard 用 1 行 summary:
 *   `'MUST 進行中だが停滞: 2 件 (タスクA 7 日 / タスクB 4 日)'`
 *   `'MUST 進行中だが停滞: 5 件 (タスクA 10 日 / タスクB 8 日 / タスクC 6 日 / 他 2 件)'` (limit=3)
 *   `'MUST 進行中だが停滞 0 件'`
 *
 * limit を超えた残件は「他 N 件」でまとめる。title 欠落は `(無題)` fallback。
 */
export function formatMustStuckWipJa<T extends MustStuckWipFields>(
  entries: readonly StuckWipEntry<T>[],
  limit: number = 3,
): string {
  if (entries.length === 0) return 'MUST 進行中だが停滞 0 件'
  const body = formatTopWithOverflow(entries, renderStuckEntry, limit)
  return `MUST 進行中だが停滞: ${entries.length} 件 (${body})`
}

/**
 * dashboard chip 配色用の severity bucket:
 *  - 'critical' (= 1 件以上 MUST stuck WIP がある = MVP 「絶対落とさない」原則の警報)
 *  - 'idle' (= 0 件 = 健全)
 *
 * wip-stuck の severity は 'severe'/'mild'/'idle' の 3 値だが、本 helper は MUST に
 * 絞った時点で既に「該当 = 最深刻」なので 2 値で十分。red 1 色で表現する想定。
 */
export type MustStuckWipSeverity = 'critical' | 'idle'

export function mustStuckWipSeverity<T extends MustStuckWipFields>(
  entries: readonly StuckWipEntry<T>[],
): MustStuckWipSeverity {
  return entries.length > 0 ? 'critical' : 'idle'
}

/** by-priority 集計の単 bucket 値: must-stuck-wip 件数 + 最長停滞日数 (count=0 → null)。 */
export interface MustStuckWipByPriorityStats {
  count: number
  maxStuckDays: number | null
}

/**
 * iter389 ai-automation: must-stuck-wip を priority 別に集計する pure helper。
 * iter384 (`computeMustOverdueByPriority`) と同シリーズ — must 系を priority 別に
 * 切り分ける substrate (must の中でも P1 偏在は最深刻 escalation を示唆)。
 * iter362 wip-stuck-by-priority の must-only 版とも見れる。
 *
 * 「P1 MUST 進行中だが停滞 2 件 (最長 7日) / P3 MUST 進行中だが停滞 1 件 (最長 4日)」
 * のように、MUST stuck WIP の中でも高優先軸の停滞を分離して可視化。
 *
 * pickMustStuckWipItems の filter ロジックは bucketByPriorityWith 経由で priority 別に
 * 再適用 (P1 のみ / P2 のみ ... の各 bucket 内で MUST stuck WIP 集計)。
 */
export function computeMustStuckWipByPriority<
  T extends MustStuckWipFields & { priority: number | null | undefined },
>(
  items: readonly T[],
  options: PickMustStuckWipOptions = {},
  today: Date | string = new Date(),
): Record<PriorityKey, MustStuckWipByPriorityStats> {
  return bucketByPriorityWith(items, (group) => {
    const entries = pickMustStuckWipItems(group, options, today)
    if (entries.length === 0) return { count: 0, maxStuckDays: null }
    const max = entries.reduce((m, e) => (e.stuckDays > m ? e.stuckDays : m), 0)
    return { count: entries.length, maxStuckDays: max }
  })
}

/**
 * priority 別 must-stuck-wip を 1 行 summary に。例:
 *   'P1 2 件 (最長 7日) / P3 1 件 (最長 4日)' / count=0 P 省略 / 全 P 0 → 'MUST 進行中だが停滞 0 件'
 *
 * iter385 で集約した formatPriorityBucketsCountWithDays を使う 5 callsite 目。
 * label '最長' は wip-stuck-by-priority と同じ vocabulary (= stuckDays 軸の見出し統一)。
 */
export function formatMustStuckWipByPriorityJa(
  byPriority: Record<PriorityKey, MustStuckWipByPriorityStats>,
): string {
  return formatPriorityBucketsCountWithDays(
    byPriority,
    (s) => s.count,
    (s) => s.maxStuckDays,
    '最長',
    'MUST 進行中だが停滞 0 件',
  )
}
