/**
 * iter402 ai-automation: MUST × stale combinator (= 忘れられた MUST item)。
 *
 * iter299 selectStaleItems (= 7+ 日 updatedAt が動いていない items 全般) と
 * must-hygiene を 2 軸で交差させた combinator。iter364 must-stuck-wip (MUST × 停滞 WIP)
 * / iter372 must-overdue (MUST × 期限超過) と並ぶ MUST 系 2 軸交差 substrate 3 弾目。
 *
 * 単独 selectStaleItems (stale 全般) や単独 must-hygiene (MUST dueDate 設定状況) より
 * signal 強度が高い: MUST はあって当然、stale も発生して当然、しかし両方該当 =
 * 「絶対落とせない MUST が 7+ 日触られていない = 完全に忘れられている」 = MVP の核
 * 「MUST 絶対落とさない」原則の sleeper 違反 (= 他の must-* combinators が捕捉できない
 *  時間軸の警告)。
 *
 * caller benefits:
 *   - AI 朝 brief「MUST 古参 2 件 (A 10 日 / B 8 日) — 即対応」を 1 関数で
 *   - pm-agent watch list の 4 弾目 (must-overdue / must-at-risk / must-stuck-wip と同列)
 *   - dashboard 専用 chip 候補 (severity 'critical' = red、他 must-* chip と区別)
 */

import { formatTopWithOverflow } from '@/lib/format-list'

import { filterMustOnly } from './must-filter'
import {
  bucketByPriorityWith,
  formatPriorityBucketsCountWithDays,
  type PriorityKey,
} from './priority'
import {
  selectStaleItems,
  type SelectStaleItemsOptions,
  type StaleItemEntry,
  type StaleItemFields,
} from './stale-items'

export interface MustStaleFields extends StaleItemFields {
  isMust: boolean | null | undefined
}

/**
 * isMust=true かつ stale (= 7+ 日 updatedAt 動いていない、default threshold) な entries を
 * stable 順序 (staleDays desc + 元配列順) で返す薄い filter。selectStaleItems に MUST
 * 制約を追加した形 (iter390 と同じ「pre-filter → 既存 fn 委譲」 pattern)。
 *
 * 仕様:
 *   - 内部で stale-items の filter ロジックを再適用 (done/archive 除外 / cancelled 除外 /
 *     未来時刻除外 / threshold filter)
 *   - 並び順 / fail-soft / threshold の挙動は selectStaleItems と完全互換
 *   - isMust=false / null / undefined は除外
 */
export function pickMustStaleItems<T extends MustStaleFields>(
  items: readonly T[],
  options: SelectStaleItemsOptions = {},
  today: Date | string = new Date(),
): StaleItemEntry<T>[] {
  return selectStaleItems(filterMustOnly(items), options, today)
}

/**
 * AI prompt / dashboard 用 1 行 summary:
 *   `'MUST 古参: 2 件 (A 10 日前 / B 8 日前)'`
 *   `'MUST 古参: 5 件 (A 14 日前 / B 12 日前 / C 10 日前 / 他 2 件)'` (limit=3)
 *   `'MUST 古参 0 件'`
 *
 * iter379 formatMustOverdueTitlesJa / iter382 formatOverdueActiveTitlesJa と同
 * vocabulary、prefix のみ 'MUST 古参' に差し替え。limit を超えた残件は「他 N 件」で
 * まとめる、title 欠落は `(無題)` fallback。
 */
export function formatMustStaleJa<T extends MustStaleFields>(
  entries: readonly StaleItemEntry<T>[],
  limit: number = 3,
): string {
  if (entries.length === 0) return 'MUST 古参 0 件'
  const body = formatTopWithOverflow(
    entries,
    (e) => {
      const title =
        typeof e.item.title === 'string' && e.item.title.length > 0 ? e.item.title : '(無題)'
      return `${title} ${e.staleDays} 日前`
    },
    limit,
  )
  return `MUST 古参: ${entries.length} 件 (${body})`
}

/**
 * dashboard chip 配色用の severity bucket:
 *  - 'critical' (= 1 件以上 MUST stale がある = MVP「絶対落とさない」原則の sleeper 違反)
 *  - 'idle' (= 0 件 = 健全)
 *
 * stale-items の severity は 'severe'/'mild'/'idle' の 3 値だが、本 helper は MUST に
 * 絞った時点で既に「該当 = 最深刻」なので 2 値で十分 (iter364 must-stuck-wip / iter372
 * must-overdue と同パターン、red 1 色で表現する想定)。
 */
export type MustStaleSeverity = 'critical' | 'idle'

export function mustStaleSeverity<T extends MustStaleFields>(
  entries: readonly StaleItemEntry<T>[],
): MustStaleSeverity {
  return entries.length > 0 ? 'critical' : 'idle'
}

/** by-priority 集計の単 bucket 値: must-stale 件数 + 最古日数 (count=0 → null)。 */
export interface MustStaleByPriorityStats {
  count: number
  oldestStaleDays: number | null
}

/**
 * iter404 ai-automation: must-stale を priority 別に集計する pure helper。iter384
 * (must-overdue-by-priority) / iter389 (must-stuck-wip-by-priority) と同シリーズ —
 * must 系 by-priority substrate 3 弾目。must の中でも P1 偏在は最深刻 escalation を
 * 示唆 (= 「絶対落としたくない P1 MUST が放置されている」)。
 *
 * 「P1 MUST 古参 2 件 (最古 14日) / P3 MUST 古参 1 件 (最古 8日)」のように、MUST stale
 * の priority bias を可視化、全体「2 件」だけでは見えない bias を露出。
 *
 * pickMustStaleItems の filter ロジックは bucketByPriorityWith 経由で priority 別に
 * 再適用 (P1 のみ / P2 のみ ... の各 bucket 内で MUST stale 集計)。
 */
export function computeMustStaleByPriority<
  T extends MustStaleFields & { priority: number | null | undefined },
>(
  items: readonly T[],
  options: SelectStaleItemsOptions = {},
  today: Date | string = new Date(),
): Record<PriorityKey, MustStaleByPriorityStats> {
  return bucketByPriorityWith(items, (group) => {
    const entries = pickMustStaleItems(group, options, today)
    if (entries.length === 0) return { count: 0, oldestStaleDays: null }
    const max = entries.reduce((m, e) => (e.staleDays > m ? e.staleDays : m), 0)
    return { count: entries.length, oldestStaleDays: max }
  })
}

/**
 * priority 別 must-stale を 1 行 summary に。例:
 *   'P1 2 件 (最古 14日) / P3 1 件 (最古 8日)' / count=0 P 省略 / 全 P 0 → 'MUST 古参 0 件'
 *
 * iter385 で集約した formatPriorityBucketsCountWithDays を 7 callsite 目で利用、
 * '最古' label = stale-items / overdue-active / must-overdue と vocabulary 統一。
 */
export function formatMustStaleByPriorityJa(
  byPriority: Record<PriorityKey, MustStaleByPriorityStats>,
): string {
  return formatPriorityBucketsCountWithDays(
    byPriority,
    (s) => s.count,
    (s) => s.oldestStaleDays,
    '最古',
    'MUST 古参 0 件',
  )
}
