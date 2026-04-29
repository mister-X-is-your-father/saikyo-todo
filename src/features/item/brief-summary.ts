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
  /**
   * iter396 basics: 現在 headline / severity を決定している axis (null = 全 axis 0)。
   * caller は switch で axis 別の chip 配色 / 通知 icon / banner styling を 1 か所で
   * 切替できる (= severity の "high" 内 3 軸 mustAtRisk/overdueActive/stuckWip も
   * 区別可能、severity だけでは見えない nuance)。
   */
  activeAxis: BriefAxis | null
  /**
   * iter397 ai-automation: 現在 1+ 件 triggered な axes 全部を severity 順で並べた
   * リスト (空配列 = 全 axis 0)。`activeAxis` は最深刻 1 軸のみだが、`activeAxes` は
   * 同時発生中の全 axes を返すので「同時に 3 軸警報 = 危機的状態」のような状況を
   * 1 値で観測可能。
   *
   * caller benefits:
   *   - AI 朝 brief「今日は MUST 期限超過 + stuck WIP + stale 3 軸 同時発生 — 危機的」
   *   - mobile UI で active axis 数 (= activeAxes.length) を chip badge で表示
   *   - dashboard で「危機度メーター」(= 1 軸 / 2 軸 / 3 軸+ で警告強度を変える)
   */
  activeAxes: BriefAxis[]
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

  const activeAxis = detectBriefActiveAxis({
    topUrgent,
    mustAtRisk,
    stale,
    stuckWip,
    overdueActive,
    mustOverdue,
  })

  const activeAxes = detectBriefActiveAxes({
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
    activeAxis,
    activeAxes,
  }
}

/**
 * iter395 refactor: 6 軸を severity 順に検査して「現時点で最深刻な軸」を 1 値で返す。
 * pickBriefHeadline / pickBriefHeadlineWithTitles / pickBriefSeverity の 3 関数で
 * 同 shape の 5 段カスケード if が重複していたので 1 か所に集約 (iter325 / iter330 /
 * ... / iter390 と同じ「同 shape の散在を 1 file に」方針 22 弾目)。
 *
 * 順序 (= MVP「絶対落とさない」原則の優先度):
 *  1. 'mustOverdue' (total > 0) — MVP 違反警報 = 最深刻 ('critical' severity)
 *  2. 'mustAtRisk' (length > 0) — MUST 期限近接 ('high')
 *  3. 'overdueActive' (total > 0) — 期限超過全般 ('high')
 *  4. 'stuckWip' (length > 0) — 進行中で停滞 ('high')
 *  5. 'stale' (length > 0) — 7+ 日触っていない ('medium')
 *  6. 'topUrgent' (length > 0) — 緊急 candidate のみ ('low')
 *  7. null — 全 axis 0 件 ('idle')
 *
 * caller (3 関数 + 将来の chip 配色 / 通知 icon 切替) は同 detector を共有することで
 * severity 順序の不整合を構造的に防げる。
 */
/**
 * iter396 basics: BriefSummary の「現時点で最深刻な軸」識別子。pickBriefHeadline /
 * pickBriefSeverity / pickBriefHeadlineWithTitles の 3 関数が共通参照する severity
 * 順 axis (severity 順序: mustOverdue → mustAtRisk → overdueActive → stuckWip →
 * stale → topUrgent)。caller (chip 配色 / 通知 icon / dashboard banner styling) は
 * \`BriefSummary.activeAxis\` を switch して axis 別 UI を 1 か所で切替可能。
 */
export type BriefAxis =
  | 'mustOverdue'
  | 'mustAtRisk'
  | 'overdueActive'
  | 'stuckWip'
  | 'stale'
  | 'topUrgent'

/**
 * iter396 basics: 6 軸を severity 順に検査して「現時点で最深刻な軸」を 1 値で返す。
 * null は「全 axis 0 件」(= 完璧、'idle' severity)。
 *
 * caller (UI / chip / 通知) が BriefSummary を作る前に axis だけ早期判定したい時、
 * または `BriefSummary.activeAxis` (本 fn の結果が bundle される) を switch して
 * axis 別 UI を切替する用。
 */
export function detectBriefActiveAxis<T extends BriefItemFields>(input: {
  topUrgent: TopUrgentEntry<T>[]
  mustAtRisk: MustRiskEntry<T>[]
  stale: StaleItemEntry<T>[]
  stuckWip: StuckWipEntry<T>[]
  overdueActive: OverdueActiveStats
  mustOverdue: MustOverdueStats
}): BriefAxis | null {
  if (input.mustOverdue.total > 0) return 'mustOverdue'
  if (input.mustAtRisk.length > 0) return 'mustAtRisk'
  if (input.overdueActive.total > 0) return 'overdueActive'
  if (input.stuckWip.length > 0) return 'stuckWip'
  if (input.stale.length > 0) return 'stale'
  if (input.topUrgent.length > 0) return 'topUrgent'
  return null
}

/**
 * iter397 ai-automation: 現在 1+ 件 triggered な axes 全部を severity 順で返す。
 * detectBriefActiveAxis は「最深刻 1 軸」のみだが、本 fn は「同時発生中の全 axes」を
 * 返すので「3 軸 同時警報 = 危機的状態」のような multi-axis view を 1 fn で取得可。
 *
 * 順序は detectBriefActiveAxis と同じ severity 順 (mustOverdue → mustAtRisk →
 * overdueActive → stuckWip → stale → topUrgent)。1+ 件の axis のみ含む (= 0 件の
 * axis は除外)、空配列 = 全 axis 0 = 'idle' 状態。
 */
export function detectBriefActiveAxes<T extends BriefItemFields>(input: {
  topUrgent: TopUrgentEntry<T>[]
  mustAtRisk: MustRiskEntry<T>[]
  stale: StaleItemEntry<T>[]
  stuckWip: StuckWipEntry<T>[]
  overdueActive: OverdueActiveStats
  mustOverdue: MustOverdueStats
}): BriefAxis[] {
  const axes: BriefAxis[] = []
  if (input.mustOverdue.total > 0) axes.push('mustOverdue')
  if (input.mustAtRisk.length > 0) axes.push('mustAtRisk')
  if (input.overdueActive.total > 0) axes.push('overdueActive')
  if (input.stuckWip.length > 0) axes.push('stuckWip')
  if (input.stale.length > 0) axes.push('stale')
  if (input.topUrgent.length > 0) axes.push('topUrgent')
  return axes
}

/**
 * iter377 ai-automation: 6 軸を severity 順にスキャンして 1 行 headline を返す
 * (iter395 で `detectBriefActiveAxis` に集約)。stats-only 版。
 */
function pickBriefHeadline<T extends BriefItemFields>(input: {
  topUrgent: TopUrgentEntry<T>[]
  mustAtRisk: MustRiskEntry<T>[]
  stale: StaleItemEntry<T>[]
  stuckWip: StuckWipEntry<T>[]
  overdueActive: OverdueActiveStats
  mustOverdue: MustOverdueStats
}): string {
  const axis = detectBriefActiveAxis(input)
  switch (axis) {
    case 'mustOverdue':
      return formatMustOverdueJa(input.mustOverdue)
    case 'mustAtRisk':
      return formatAtRiskMustSummary(input.mustAtRisk)
    case 'overdueActive':
      return formatOverdueActiveJa(input.overdueActive)
    case 'stuckWip':
      return formatStuckWipSummaryJa(input.stuckWip)
    case 'stale':
      return formatStaleItemsSummary(input.stale)
    case 'topUrgent':
    case null:
      return formatTopUrgentLine(input.topUrgent)
  }
}

/**
 * iter394 ai-automation: 6 軸の集約 severity を 5 段階で返す (iter395 で
 * `detectBriefActiveAxis` に集約)。
 *
 * mapping:
 *  - mustOverdue → 'critical'
 *  - mustAtRisk / overdueActive / stuckWip → 'high'
 *  - stale → 'medium'
 *  - topUrgent → 'low'
 *  - null (全 axis 0) → 'idle'
 */
function pickBriefSeverity<T extends BriefItemFields>(input: {
  topUrgent: TopUrgentEntry<T>[]
  mustAtRisk: MustRiskEntry<T>[]
  stale: StaleItemEntry<T>[]
  stuckWip: StuckWipEntry<T>[]
  overdueActive: OverdueActiveStats
  mustOverdue: MustOverdueStats
}): BriefSeverity {
  const axis = detectBriefActiveAxis(input)
  switch (axis) {
    case 'mustOverdue':
      return 'critical'
    case 'mustAtRisk':
    case 'overdueActive':
    case 'stuckWip':
      return 'high'
    case 'stale':
      return 'medium'
    case 'topUrgent':
      return 'low'
    case null:
      return 'idle'
  }
}

/**
 * iter388 basics: pickBriefHeadline と同じ severity 順だが、must-overdue / overdue-active
 * 軸のとき entries (具体名 + overdueDays) で 1 行 alert を返す (iter395 で
 * `detectBriefActiveAxis` に集約)。
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
  const axis = detectBriefActiveAxis(input)
  switch (axis) {
    case 'mustOverdue':
      return formatMustOverdueTitlesJa(input.mustOverdueEntries)
    case 'mustAtRisk':
      return formatAtRiskMustSummary(input.mustAtRisk)
    case 'overdueActive':
      return formatOverdueActiveTitlesJa(input.overdueActiveEntries)
    case 'stuckWip':
      return formatStuckWipSummaryJa(input.stuckWip)
    case 'stale':
      return formatStaleItemsSummary(input.stale)
    case 'topUrgent':
    case null:
      return formatTopUrgentLine(input.topUrgent)
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
