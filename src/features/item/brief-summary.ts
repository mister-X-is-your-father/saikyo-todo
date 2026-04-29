/**
 * iter304 ai-automation: AI 朝 brief / pm-agent / dashboard widget 用に、
 * workspace items を 1 関数で「multi-axis 1 prompt 行」に圧縮する combinator。
 *
 * 既存 substrate (iter294 must-risk / iter299 stale-items / iter302 velocity /
 * 既存 selectTopUrgentItems) を呼び出して結果を bundle + 整形。今までは AI brief
 * を作る caller が 4 関数を別々に呼んで連結していたが、本 combinator が:
 *   - 同 `today` を 4 substrate に統一して渡す (タイミング不整合を防ぐ)
 *   - 4 軸を **同じ順序 + 同じセパレータ** で 1 プロンプトに整形
 *   - 各軸の閾値 (top N / withinDays / threshold / window) を 1 オプションで束ねる
 *
 * 戻り値:
 *   - `topUrgent`: selectTopUrgentItems の結果 (default 3 件)
 *   - `mustAtRisk`: selectAtRiskMust の MustRiskEntry[] (default 6 日内)
 *   - `stale`: selectStaleItems の StaleItemEntry[] (default 7 日閾値)
 *   - `velocity`: computeVelocity の summary (default 7 日 window)
 *   - `stuckWip`: selectStuckWipItems の StuckWipEntry[] (default 3 日閾値、iter374 追加)
 *   - `overdueActive`: computeOverdueActive の OverdueActiveStats (iter374 追加)
 *   - `mustOverdue`: computeMustOverdue の MustOverdueStats (iter374 追加、MVP 警報)
 *   - `textSummary`: 7 軸を 7 行に整形した AI prompt 用テキスト
 *
 * 設計原則:
 *   - 純粋 (today を引数で受け取り、内部で new Date() しない)
 *   - substrate と同じ structural fields を要求 (UrgencyFields ∪ MustRiskFields ∪
 *     StaleItemFields ∪ VelocityFields = `BriefItemFields`)
 *   - 0 件軸でも textSummary に 1 行残す (例: "stale 0 (該当なし)") — 朝 brief で
 *     「今日は MUST at-risk なし」が伝わる方が静寂より親切
 */

import {
  computeMustOverdue,
  formatMustOverdueJa,
  type MustOverdueFields,
  type MustOverdueStats,
} from './must-overdue'
import {
  formatAtRiskMustSummary,
  type MustRiskEntry,
  type MustRiskFields,
  selectAtRiskMust,
} from './must-risk'
import {
  computeOverdueActive,
  formatOverdueActiveJa,
  type OverdueActiveFields,
  type OverdueActiveStats,
} from './overdue-active'
import {
  formatStaleItemsSummary,
  selectStaleItems,
  type StaleItemEntry,
  type StaleItemFields,
} from './stale-items'
import { computeUrgency, selectTopUrgentItems, type UrgencyFields } from './urgency'
import {
  computeVelocity,
  formatVelocitySummary,
  type VelocityFields,
  type VelocitySummary,
} from './velocity'
import {
  formatStuckWipSummaryJa,
  selectStuckWipItems,
  type StuckWipEntry,
  type StuckWipFields,
} from './wip-stuck'

/** brief-summary が必要とする Item の structural subset (7 substrate の union) */
export type BriefItemFields = MustRiskFields &
  StaleItemFields &
  VelocityFields &
  UrgencyFields &
  StuckWipFields &
  OverdueActiveFields &
  MustOverdueFields

export interface BriefSummaryOptions {
  /** 上位緊急 item の件数 (default 3) */
  topUrgentN?: number
  /** MUST at-risk の dueDate 閾値 (default 6 日内) */
  mustAtRiskWithinDays?: number
  /** stale 判定の経過日数閾値 (default 7) */
  staleThresholdDays?: number
  /** velocity 集計の window (default 7) */
  velocityWindowDays?: number
  /** stuck WIP 判定の updatedAt 経過日数閾値 (default 3、iter374 追加) */
  stuckWipThresholdDays?: number
}

export interface TopUrgentEntry<T extends BriefItemFields> {
  item: T
  urgency: number
}

export interface BriefSummary<T extends BriefItemFields> {
  topUrgent: TopUrgentEntry<T>[]
  mustAtRisk: MustRiskEntry<T>[]
  stale: StaleItemEntry<T>[]
  velocity: VelocitySummary
  /** iter374 追加: 進行中だが停滞している WIP entries */
  stuckWip: StuckWipEntry<T>[]
  /** iter374 追加: 期限超過で未完了の active item 集計 */
  overdueActive: OverdueActiveStats
  /** iter374 追加: MUST かつ期限超過の最深刻 item 集計 (= MVP 「絶対落とさない」原則違反) */
  mustOverdue: MustOverdueStats
  /** AI prompt 用 7 行テキスト (同 today 同期済) */
  textSummary: string
}

/**
 * 4 substrate を同 today で実行し、結果と整形済テキストを bundle して返す。
 */
export function buildBriefSummary<T extends BriefItemFields>(
  items: readonly T[],
  options: BriefSummaryOptions = {},
  today: Date | string = new Date(),
): BriefSummary<T> {
  const topUrgentN = options.topUrgentN ?? 3
  const mustAtRiskWithinDays = options.mustAtRiskWithinDays ?? 6
  const staleThresholdDays = options.staleThresholdDays ?? 7
  const velocityWindowDays = options.velocityWindowDays ?? 7
  const stuckWipThresholdDays = options.stuckWipThresholdDays ?? 3

  // selectTopUrgentItems は Date を要求するので Date に正規化
  const todayDate = typeof today === 'string' ? new Date(today) : today

  const topItems = selectTopUrgentItems(items, topUrgentN, todayDate)
  const topUrgent: TopUrgentEntry<T>[] = topItems.map((item) => ({
    item,
    urgency: computeUrgency(item, todayDate),
  }))

  const mustAtRisk = selectAtRiskMust(items, { withinDays: mustAtRiskWithinDays }, today)
  const stale = selectStaleItems(items, { thresholdDays: staleThresholdDays }, today)
  const velocity = computeVelocity(items, { windowDays: velocityWindowDays }, today)
  const stuckWip = selectStuckWipItems(items, { thresholdDays: stuckWipThresholdDays }, today)
  const overdueActive = computeOverdueActive(items, today)
  const mustOverdue = computeMustOverdue(items, today)

  const textSummary = [
    formatTopUrgentLine(topUrgent),
    formatAtRiskMustSummary(mustAtRisk),
    formatStaleItemsSummary(stale),
    formatVelocitySummary(velocity, velocityWindowDays),
    formatStuckWipSummaryJa(stuckWip),
    formatOverdueActiveJa(overdueActive),
    formatMustOverdueJa(mustOverdue),
  ].join('\n')

  return {
    topUrgent,
    mustAtRisk,
    stale,
    velocity,
    stuckWip,
    overdueActive,
    mustOverdue,
    textSummary,
  }
}

/**
 * top urgent エントリを 1 行に整形 (`urgent 上位 3: A (urgency 180) / B (135) / C (100)`)。
 * 0 件は `'urgent 上位 0 (該当なし)'`。title 欠落は `'(無題)'` で fallback。
 */
export function formatTopUrgentLine<T extends BriefItemFields>(
  entries: readonly TopUrgentEntry<T>[],
): string {
  if (entries.length === 0) return 'urgent 上位 0 (該当なし)'
  const parts = entries.map((e) => {
    const title = e.item.title ?? '(無題)'
    return `${title} (urgency ${e.urgency})`
  })
  return `urgent 上位 ${entries.length}: ${parts.join(' / ')}`
}
