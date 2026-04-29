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
  formatMustOverdueTitlesJa,
  type MustOverdueEntry,
  type MustOverdueFields,
  type MustOverdueStats,
  pickMustOverdueItems,
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
  formatOverdueActiveTitlesJa,
  type OverdueActiveEntry,
  type OverdueActiveFields,
  type OverdueActiveStats,
  pickOverdueActiveItems,
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
  /**
   * iter387 追加: MUST × overdue な items の具体名 + overdueDays 一覧 (overdueDays desc 並び)。
   * caller (AI brief / pm-agent / dashboard tooltip) は同じ buildBriefSummary 呼出から
   * stats と entries を両方取り出せるので、items を 2 度 walk する必要が無い。
   */
  mustOverdueEntries: MustOverdueEntry<T>[]
  /** iter387 追加: overdue active な items の具体名 + overdueDays 一覧 (must 限定でない全般)。 */
  overdueActiveEntries: OverdueActiveEntry<T>[]
  /** AI prompt 用 7 行テキスト (同 today 同期済) */
  textSummary: string
  /**
   * iter377: 7 軸のうち最も深刻な signal だけを 1 行で返す compact headline。
   * mobile UI / status bar / 通知 1 行で「最優先アラート」を表示する用。
   * 全 axis idle なら `'問題なし — 今日 top urgent: ...'` (= top urgent 列挙) を返す。
   */
  headline: string
  /**
   * iter388: headline と同じ severity 順だが、must-overdue / overdue-active 軸のとき
   * iter387 で bundle した entries を使い「具体名 + overdueDays」で 1 行 alert を返す。
   * 例: `'MUST 期限超過: 提出書類 14日 / 連絡 5日'` (= 何が overdue か即特定可能)
   *
   * `headline` (stats only) と並んで存在し、caller は用途で使い分け:
   *   - mobile status bar / 短い通知 → `headline` (stats only、固定長)
   *   - actionable AI brief / 通知 detail → `headlineWithTitles` (具体名、長さ可変)
   *
   * mustAtRisk / stale / topUrgent 軸 (= entries-based 軸) は元々 entries 経由で
   * 整形しているので headline と同一文言に。差分が出るのは must-overdue / overdue-active
   * 軸のみ (= stats-only headline → entries-based titles へ昇格)。
   */
  headlineWithTitles: string
  /**
   * iter394 ai-automation: 7 軸のうち最も深刻な軸の severity を 1 つに集約。
   * mobile UI / status bar / 通知 / dashboard banner が「全体の警報レベル」を 1 値で
   * 受け取り、配色 / icon / 通知音 等を切替えるための axis-aggregate 指標。
   *
   * 値は `'critical' / 'high' / 'medium' / 'low' / 'idle'` の 5 段階:
   *  - 'critical' = mustOverdue.total > 0 (= MVP「絶対落とさない」原則違反、最深刻)
   *  - 'high'     = mustAtRisk.length > 0 OR overdueActive.total > 0 OR stuckWip.length > 0
   *  - 'medium'   = stale.length > 0
   *  - 'low'      = topUrgent.length > 0 (= 警報無し、緊急対応 candidate のみ)
   *  - 'idle'     = 全 axis 0 件 (= 完璧な状態)
   *
   * pickBriefHeadline の severity 順序と整合 (= headline が表示している軸が
   * 'critical' であれば severity も 'critical')。
   */
  severity: BriefSeverity
}

/** iter394: BriefSummary の集約 severity (5 段階)。 */
export type BriefSeverity = 'critical' | 'high' | 'medium' | 'low' | 'idle'

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
  // iter387 ai-automation: 同 today で具体名 entries も同時に集約 (caller の重複 walk 回避)
  const mustOverdueEntries = pickMustOverdueItems(items, today)
  const overdueActiveEntries = pickOverdueActiveItems(items, today)

  const textSummary = [
    formatTopUrgentLine(topUrgent),
    formatAtRiskMustSummary(mustAtRisk),
    formatStaleItemsSummary(stale),
    formatVelocitySummary(velocity, velocityWindowDays),
    formatStuckWipSummaryJa(stuckWip),
    formatOverdueActiveJa(overdueActive),
    formatMustOverdueJa(mustOverdue),
  ].join('\n')

  const headline = pickBriefHeadline({
    topUrgent,
    mustAtRisk,
    stale,
    stuckWip,
    overdueActive,
    mustOverdue,
  })

  const headlineWithTitles = pickBriefHeadlineWithTitles({
    topUrgent,
    mustAtRisk,
    stale,
    stuckWip,
    overdueActive,
    mustOverdue,
    mustOverdueEntries,
    overdueActiveEntries,
  })

  const severity = pickBriefSeverity({
    topUrgent,
    mustAtRisk,
    stale,
    stuckWip,
    overdueActive,
    mustOverdue,
  })

  return {
    topUrgent,
    mustAtRisk,
    stale,
    velocity,
    stuckWip,
    overdueActive,
    mustOverdue,
    mustOverdueEntries,
    overdueActiveEntries,
    textSummary,
    headline,
    headlineWithTitles,
    severity,
  }
}

/**
 * iter377 ai-automation: 7 axis を severity 順にスキャンして 1 行 headline を返す。
 *
 * 順序 (= MVP「絶対落とさない」原則の優先度):
 *  1. mustOverdue (total > 0) — MUST 期限超過 = 最深刻
 *  2. mustAtRisk (length > 0) — MUST 期限近接
 *  3. overdueActive (total > 0) — 期限超過全般
 *  4. stuckWip (length > 0) — 進行中で停滞
 *  5. stale (length > 0) — 7+ 日触っていない
 *  6. (else) — top urgent 1 件
 *  7. (全部 0) — 'urgent 上位 0 (該当なし)' fallback
 */
function pickBriefHeadline<T extends BriefItemFields>(input: {
  topUrgent: TopUrgentEntry<T>[]
  mustAtRisk: MustRiskEntry<T>[]
  stale: StaleItemEntry<T>[]
  stuckWip: StuckWipEntry<T>[]
  overdueActive: OverdueActiveStats
  mustOverdue: MustOverdueStats
}): string {
  if (input.mustOverdue.total > 0) {
    return formatMustOverdueJa(input.mustOverdue)
  }
  if (input.mustAtRisk.length > 0) {
    return formatAtRiskMustSummary(input.mustAtRisk)
  }
  if (input.overdueActive.total > 0) {
    return formatOverdueActiveJa(input.overdueActive)
  }
  if (input.stuckWip.length > 0) {
    return formatStuckWipSummaryJa(input.stuckWip)
  }
  if (input.stale.length > 0) {
    return formatStaleItemsSummary(input.stale)
  }
  return formatTopUrgentLine(input.topUrgent)
}

/**
 * iter394 ai-automation: 7 軸の集約 severity を 5 段階で返す。pickBriefHeadline と同じ
 * severity 順序を保つので、headline が表示している軸 = severity の決定軸 (= UI が
 * 「色」と「文言」を一貫して選べる)。
 *
 * 順序 (mustOverdue 'critical' を最深刻として MVP 原則優先):
 *  1. mustOverdue (total > 0) → 'critical' (= MVP 違反警報、red 強調)
 *  2. mustAtRisk / overdueActive / stuckWip (1+ 件) → 'high' (= 注意要、red/amber)
 *  3. stale (1+ 件) → 'medium' (= 放置注意、amber)
 *  4. topUrgent (1+ 件) → 'low' (= 警報無し、緊急対応 candidate あり、neutral)
 *  5. 全 axis 0 → 'idle' (= 完璧、green/grey)
 */
function pickBriefSeverity<T extends BriefItemFields>(input: {
  topUrgent: TopUrgentEntry<T>[]
  mustAtRisk: MustRiskEntry<T>[]
  stale: StaleItemEntry<T>[]
  stuckWip: StuckWipEntry<T>[]
  overdueActive: OverdueActiveStats
  mustOverdue: MustOverdueStats
}): BriefSeverity {
  if (input.mustOverdue.total > 0) return 'critical'
  if (input.mustAtRisk.length > 0 || input.overdueActive.total > 0 || input.stuckWip.length > 0) {
    return 'high'
  }
  if (input.stale.length > 0) return 'medium'
  if (input.topUrgent.length > 0) return 'low'
  return 'idle'
}

/**
 * iter388 basics: pickBriefHeadline と同じ severity 順だが、must-overdue / overdue-active
 * 軸のとき stats でなく entries (具体名 + overdueDays) で 1 行 alert を返す。
 *
 * caller (mobile UI / 通知 detail / actionable AI brief) は「何が overdue なのか」を即特定可。
 * stats-only headline とは別フィールドで保持 (両方 BriefSummary に bundle、用途で使い分け)。
 */
function pickBriefHeadlineWithTitles<T extends BriefItemFields>(input: {
  topUrgent: TopUrgentEntry<T>[]
  mustAtRisk: MustRiskEntry<T>[]
  stale: StaleItemEntry<T>[]
  stuckWip: StuckWipEntry<T>[]
  overdueActive: OverdueActiveStats
  mustOverdue: MustOverdueStats
  mustOverdueEntries: MustOverdueEntry<T>[]
  overdueActiveEntries: OverdueActiveEntry<T>[]
}): string {
  if (input.mustOverdue.total > 0) {
    return formatMustOverdueTitlesJa(input.mustOverdueEntries)
  }
  if (input.mustAtRisk.length > 0) {
    return formatAtRiskMustSummary(input.mustAtRisk)
  }
  if (input.overdueActive.total > 0) {
    return formatOverdueActiveTitlesJa(input.overdueActiveEntries)
  }
  if (input.stuckWip.length > 0) {
    return formatStuckWipSummaryJa(input.stuckWip)
  }
  if (input.stale.length > 0) {
    return formatStaleItemsSummary(input.stale)
  }
  return formatTopUrgentLine(input.topUrgent)
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
