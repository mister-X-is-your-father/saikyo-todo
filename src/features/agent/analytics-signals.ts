/**
 * iter796 ai-automation: analytics 4 軸 (reliability / cost-projection / cost-trend /
 * momentum) を 1 関数で `AgentBriefSignal[]` 配列に集約する compose helper。
 *
 * iter1715-1745 拡張: 21 軸 (= reliability/dominant/concerning + costProjection/costTrend +
 * momentum/weeklyCompletion/dueHitRate/velocity/biasTrend/backlogAging/waitingSummary/
 * consultationCounts/weeklyReviewDue/inboxBucketCounts/stuckWip/overdueActive/slipDays/
 * urgencyTierCounts/mustHygiene/streakMilestone/streakComparison/doneToday) に拡張。
 * iter1722-1754 cluster-based subset API (達成感 / 警戒 cluster 完全対称 8 関数 + 2 combine):
 *  - 4 軸 trio (各 cluster):
 *    - pick    : pickAchievementSignals     / pickConcerningSignals     (subset 配列)
 *    - has     : hasAchievementSignals      / hasConcerningSignals      (boolean gate)
 *    - count   : countAchievementSignals    / countConcerningSignals    (active 数 number)
 *    - format  : formatAchievementSignalsLineJa / formatConcerningSignalsLineJa (1 行 ja text)
 *  - 2 combine helper:
 *    - formatClusterSummaryLinesJa     : 警戒 + 達成感 詳細 2 行 (Slack body / AI brief paragraph)
 *    - formatClusterCountsHeadlineJa   : '警戒 N / 達成感 M' 件数 1 行 headline (channel header)
 *  - 2 invariant gate (iter1748 / iter1753):
 *    - 互いに disjoint (∩=∅)
 *    - 部分集合性 (countAch + countCon <= analyticsSignalsToArray.length)
 *
 * これで Slack daily digest / AI 朝 brief / dashboard 全 caller pattern を 1 関数 chain で
 * build 可能 (= 「ポジティブ vs 警告」 paragraph 分離 + 件数 headline)。
 *
 * 設計目的:
 *  - AI 朝 brief / Slack daily digest / dashboard chip area が「analytics 全体を
 *    1 行ずつ chip render」したい時に caller 側で各 helper 呼び出し + 合成 が必要
 *    だった。本 helper で `signals = composeAnalyticsSignals({ reliability, ... })`
 *    → `analyticsSignalsToArray(signals).map(s => <Chip ... />)` で 1 行 render が完成
 *  - 各入力は **optional** (= caller は欲しい軸だけ compute して渡す、未渡しは null)
 *  - 既存 `composeAgentBriefSignals` (iter497) は agent-reliability 内で完結だったが、
 *    cost / momentum を含めた **真に統一された 1 関数** に格上げ
 *
 * 入力:
 *  - reliability:    `computeAgentReliability(...)` の結果 (省略時 reliability/dominant/concerning すべて null)
 *  - costProjection: `computeCostMonthProjection(...)` の結果 (省略時 null)
 *  - costTrend:      `computeMonthlyCostTrend(...)` の結果 (省略時 null)
 *  - momentum:       `computeWorkspaceMomentum(...)` の結果 (省略時 null)
 *
 * 出力 `AnalyticsSignals` (各 field は signal | null):
 *  - reliability:    全体 信頼性 (compact text + tone)
 *  - dominantRole:   主軸 role (= invocation 数最多、healthy 時のみ)
 *  - concerningRole: 弱点 role (= warn/critical 時のみ)
 *  - costProjection: 月末コスト予測 chip
 *  - costTrend:      this/prior month cost 差分 chip
 *  - momentum:       backlog momentum (intake vs done)
 *
 * `analyticsSignalsToArray` は null 除去 + 順序を AI brief 表示順 (重要 → 補助) に
 * 揃える utility。
 */

import {
  type ChipTone,
  countItemsByTone,
  filterItemsByMinTone,
  formatToneCountsJa,
  groupItemsByTone,
  pickTopItemsByTone,
  someItemHasMinTone,
} from '@/lib/ui/chip-tone'

import {
  type InboxBucketCounts,
  inboxBucketCountsToBriefSignal,
} from '@/features/gtd/inbox-process'
import { type AgingKind, backlogAgingToBriefSignal } from '@/features/item/backlog-aging'
import {
  type ConsultationCounts,
  consultationCountsToBriefSignal,
} from '@/features/item/consultation-tally'
import { type DueHitRateStats, dueHitRateToBriefSignal } from '@/features/item/due-hit-rate'
import { type WorkspaceMomentum, workspaceMomentumToBriefSignal } from '@/features/item/momentum'
import { type MustHygieneStats, mustHygieneToBriefSignal } from '@/features/item/must-hygiene'
import { type OverdueActiveStats, overdueActiveToBriefSignal } from '@/features/item/overdue-active'
import { type SlipDaysStats, slipDaysToBriefSignal } from '@/features/item/slip-days'
import { type UrgencyTier, urgencyTierCountsToBriefSignal } from '@/features/item/urgency'
import {
  computeCompletionStreak,
  computeStreakComparisonSignal,
  doneTodayToBriefSignal,
  streakToBriefSignal,
  type VelocitySummary,
  velocityToBriefSignal,
} from '@/features/item/velocity'
import { type WaitingSummary, waitingSummaryToBriefSignal } from '@/features/item/waiting-elapsed'
import {
  type WeeklyCompletionInsight,
  weeklyCompletionInsightToBriefSignal,
} from '@/features/item/weekly-completion-insight'
import {
  type StuckWipEntry,
  type StuckWipFields,
  stuckWipToBriefSignal,
} from '@/features/item/wip-stuck'
import { type BiasTrend, biasTrendToBriefSignal } from '@/features/time-entry/bias-trend'
import {
  type WeeklyReviewDueKind,
  weeklyReviewDueToBriefSignal,
} from '@/features/today/weekly-review-checklist'

import { type AgentReliability, composeAgentBriefSignals } from './agent-reliability'
import { type AgentBriefSignal } from './brief-signal'
import { type CostMonthProjection, costMonthProjectionToBriefSignal } from './cost-month-projection'
import { type MonthlyCostTrend, monthlyCostTrendToBriefSignal } from './cost-monthly-trend'

export interface AnalyticsSignalsInput {
  reliability?: AgentReliability
  costProjection?: CostMonthProjection
  costTrend?: MonthlyCostTrend
  momentum?: WorkspaceMomentum
  /** iter797 ai-automation: 5 軸目として weekly completion insight も統合 */
  weeklyCompletion?: WeeklyCompletionInsight
  /** iter799 ai-automation: 6 軸目として due-hit-rate (期限達成率) も統合 */
  dueHitRate?: DueHitRateStats
  /** iter803 basics: 7 軸目として velocity (完了ペース、直近 7 日 trend) も統合 */
  velocity?: VelocitySummary
  /** iter805 refactor: 8 軸目として bias-trend (見積精度の変化) も統合 */
  biasTrend?: BiasTrend
  /**
   * iter1026 basics: 9 軸目として backlog-aging (= ancient/stale counts、停滞度合い) も統合。
   * 値は `countItemsByAge(items, today)` の出力 (= Record<AgingKind, number>)。
   * caller は backlog item を事前 filter (= 完了/archive 除外) してから渡すこと。
   */
  backlogAging?: Readonly<Record<AgingKind, number>>
  /**
   * iter1041 basics: 10 軸目として waiting-summary (= 連絡待ち item 集計、escalate / リマインド時期) も統合。
   * 値は `summarizeWaitingItems(items, now)` の出力。
   * caller は waitingFor != null の item を事前抽出してから渡すこと。
   */
  waitingSummary?: WaitingSummary
  /**
   * iter1043 basics: 11 軸目として consultation-counts (= 相談 task 状態別件数、判断漏れ / 締切間近) も統合。
   * 値は ConsultationCounts (= Readonly<Record<ConsultationStatus, number>>)。
   * caller は consultation kind の item を事前 filter + status 集計してから渡すこと。
   */
  consultationCounts?: ConsultationCounts
  /**
   * iter1044 refactor: 12 軸目として weekly-review-due (= GTD Weekly Review 点検状態) も統合。
   * 値は WeeklyReviewDueKind (`'recent' | 'never-reviewed' | 'overdue'`)。
   * caller は `classifyWeeklyReviewDue({ lastReviewAt, now })` の出力を渡す。
   */
  weeklyReviewDue?: WeeklyReviewDueKind
  /**
   * iter1048 basics: 13 軸目として GTD Inbox bucket counts (= Inbox 健全性、process 滞留度合い) も統合。
   * 値は `summarizeInbox(items).counts` の出力 (= Readonly<Record<GtdBucket, number>>)。
   * caller は inbox item (= scheduledFor も dueDate も未設定) を事前 filter してから渡すこと。
   */
  inboxBucketCounts?: InboxBucketCounts
  /**
   * iter1050 refactor: 14 軸目として stuck WIP entries (= 進行中だが N 日 updatedAt 未動、再開 nudge 候補) も統合。
   * 値は `selectStuckWipItems(items, {}, today)` の出力 (= StuckWipEntry<StuckWipFields>[])。
   * caller は workspace 全 item から作成。空 array (= 停滞なし) 時は idle chip。
   */
  stuckWipEntries?: readonly StuckWipEntry<StuckWipFields>[]
  /**
   * iter1051 basics: 15 軸目として overdue active stats (= dueDate < today + 未完了 item の集計) も統合。
   * 値は `computeOverdueActive(items, today)` の出力 (= OverdueActiveStats)。
   * 計画 vs 現実の最も深刻な乖離。caller は workspace 全 item から作成、空時は idle chip。
   */
  overdueActive?: OverdueActiveStats
  /**
   * iter1053 basics: 16 軸目として slip days stats (= doneAt > dueDate の retrospective 集計) も統合。
   * 値は `computeSlipDays(items, { since })` の出力 (= SlipDaysStats)。
   * count=0 → idle chip / mild → warn / severe (7d+) → danger。
   */
  slipDays?: SlipDaysStats
  /**
   * iter1057 ai-automation: 17 軸目として urgency tier counts (= critical/high/medium/low/none 件数) も統合。
   * 値は `countItemsByUrgencyTier(items, today)` の出力 (= Record<UrgencyTier, number>)。
   * critical > 0 → danger / high > 0 → warn / それ以外 → idle (= chip 非表示 progressive disclosure)。
   */
  urgencyTierCounts?: Readonly<Record<UrgencyTier, number>>
  /**
   * iter1059 refactor: 18 軸目として MUST hygiene stats (= MUST item の dueDate hygiene 集計) も統合。
   * 値は `computeMustHygiene(items)` の出力 (= MustHygieneStats)。
   * severe (coverage < 50%) → danger / mild → warn / clean → success / idle → idle。
   */
  mustHygiene?: MustHygieneStats
  /**
   * iter1715 ai-automation: 19 軸目として streak milestone (= 完了 streak 6 段階 milestone) も統合。
   * 値は `computeVelocity(items, {}, now)` の出力 (= VelocitySummary、velocity 軸と同 input)。
   * 内部で `computeCompletionStreak` → `streakToBriefSignal` chain で chip data 化、
   * 6 段階 milestone (none/bronze/silver/gold/platinum/legend) を positive polarity で chip 化。
   * none → idle / bronze → info / silver+ → success (= 達成感の lossy 縮約)。
   * velocity 軸と同 VelocitySummary を input にしているが、velocity は trend (up/flat/down)、
   * 本 軸 は streak (連続日数) と異なる視点で chip 出力 (= 並列軸として両立可)。
   */
  streakMilestone?: VelocitySummary
  /**
   * iter1719 ai-automation: 20 軸目として streak comparison (= 現在 vs best streak 比較) も統合。
   * 値は `computeVelocity(items, {}, now)` の出力 (= VelocitySummary、velocity / streakMilestone と同 input)。
   * 内部で `computeStreakComparisonSignal(summary)` (iter1718) chain で chip data 化。
   * tone (positive polarity): best=0→idle / curr=0&best>0→warn (再開 nudge) / curr>=best→success
   * (記録更新中!) / curr<best→info。streakMilestone (= 現在 milestone のみ) と並列軸として両立、
   * dashboard で 2 chip 同時 render 可能 (= 「7 日連続 🥈 シルバー」 + 「今 7 日連続 (最高記録更新中!)」)。
   */
  streakComparison?: VelocitySummary
  /**
   * iter1728 basics: 21 軸目として今日累計完了件数 (= countDoneToday の出力) も統合。
   * 値は number (iter1726 `countDoneToday(items, today)` の出力)。
   * 内部で `doneTodayToBriefSignal(count)` (iter1727) で chip data 化。
   * tone (positive polarity 3 段階): count<=0→idle / count===1→info / count>=2→success。
   * streak 系 (連続日数) と異なり「今日 1 日のみ」 の chip。Today view / dashboard 「やる気」 panel
   * で「今日 X 件完了!」 即時可視化用 (= 達成感 cluster の 4 軸目)。
   */
  doneToday?: number
}

export interface AnalyticsSignals {
  reliability: AgentBriefSignal | null
  dominantRole: AgentBriefSignal | null
  concerningRole: AgentBriefSignal | null
  costProjection: AgentBriefSignal | null
  costTrend: AgentBriefSignal | null
  momentum: AgentBriefSignal | null
  /** iter797 ai-automation: 週次完了 trend chip (positive polarity, up=success) */
  weeklyCompletion: AgentBriefSignal | null
  /** iter799 ai-automation: 期限達成率 chip (positive polarity, hi=success) */
  dueHitRate: AgentBriefSignal | null
  /** iter803 basics: 完了ペース chip (positive polarity, up=success、velocity hint) */
  velocity: AgentBriefSignal | null
  /** iter805 refactor: 見積精度の変化 chip (positive polarity, improving=success) */
  biasTrend: AgentBriefSignal | null
  /** iter1026 basics: backlog 停滞度合い chip (positive polarity, fresh=success / ancient=danger) */
  backlogAging: AgentBriefSignal | null
  /** iter1041 basics: 連絡待ち chip (= escalate=danger / リマインド=warn / 健全=success / 空=idle) */
  waitingSummary: AgentBriefSignal | null
  /** iter1043 basics: 相談 chip (= 判断漏れ=danger / 締切間近=warn / 受付中=info / 決定済=success / 空=idle) */
  consultationCounts: AgentBriefSignal | null
  /** iter1044 refactor: GTD Weekly Review chip (= overdue=danger / never-reviewed=warn / recent=success) */
  weeklyReviewDue: AgentBriefSignal | null
  /** iter1048 basics: Inbox bucket counts chip (= severe=danger / moderate=warn / mild=success / idle=idle) */
  inboxBucketCounts: AgentBriefSignal | null
  /** iter1050 refactor: 停滞 WIP chip (= severe 7d+=danger / mild 1-6d=warn / idle=idle) */
  stuckWip: AgentBriefSignal | null
  /** iter1051 basics: 期限超過 active chip (= severe 7d+ or 5+ 件=danger / mild=warn / idle=idle) */
  overdueActive: AgentBriefSignal | null
  /** iter1053 basics: 完了遅延 retrospective chip (= severe 7d+=danger / mild=warn / count=0=idle) */
  slipDays: AgentBriefSignal | null
  /** iter1057 ai-automation: 緊急度件数 chip (= critical>0=danger / high>0=warn / それ以外=idle) */
  urgencyTierCounts: AgentBriefSignal | null
  /** iter1059 refactor: MUST hygiene chip (= severe=danger / mild=warn / clean=success / idle=idle) */
  mustHygiene: AgentBriefSignal | null
  /** iter1715 ai-automation: streak milestone chip (positive polarity, bronze→info / silver+→success) */
  streakMilestone: AgentBriefSignal | null
  /** iter1719 ai-automation: streak comparison chip (positive polarity, curr>=best→success 記録更新中) */
  streakComparison: AgentBriefSignal | null
  /** iter1728 basics: 今日累計完了 chip (positive polarity 3 段階, 0→idle / 1→info / 2+→success) */
  doneToday: AgentBriefSignal | null
}

const EMPTY: AnalyticsSignals = {
  reliability: null,
  dominantRole: null,
  concerningRole: null,
  costProjection: null,
  costTrend: null,
  momentum: null,
  weeklyCompletion: null,
  dueHitRate: null,
  velocity: null,
  biasTrend: null,
  backlogAging: null,
  waitingSummary: null,
  consultationCounts: null,
  weeklyReviewDue: null,
  inboxBucketCounts: null,
  stuckWip: null,
  overdueActive: null,
  slipDays: null,
  urgencyTierCounts: null,
  mustHygiene: null,
  streakMilestone: null,
  streakComparison: null,
  doneToday: null,
}

export function composeAnalyticsSignals(input: AnalyticsSignalsInput): AnalyticsSignals {
  const out: AnalyticsSignals = { ...EMPTY }
  if (input.reliability) {
    const sub = composeAgentBriefSignals(input.reliability)
    out.reliability = sub.reliability
    out.dominantRole = sub.dominantRole
    out.concerningRole = sub.concerningRole
  }
  if (input.costProjection) {
    out.costProjection = costMonthProjectionToBriefSignal(input.costProjection)
  }
  if (input.costTrend) {
    out.costTrend = monthlyCostTrendToBriefSignal(input.costTrend)
  }
  if (input.momentum) {
    out.momentum = workspaceMomentumToBriefSignal(input.momentum)
  }
  if (input.weeklyCompletion) {
    out.weeklyCompletion = weeklyCompletionInsightToBriefSignal(input.weeklyCompletion)
  }
  if (input.dueHitRate) {
    out.dueHitRate = dueHitRateToBriefSignal(input.dueHitRate)
  }
  if (input.velocity) {
    out.velocity = velocityToBriefSignal(input.velocity)
  }
  if (input.biasTrend) {
    out.biasTrend = biasTrendToBriefSignal(input.biasTrend)
  }
  if (input.backlogAging) {
    out.backlogAging = backlogAgingToBriefSignal(input.backlogAging)
  }
  if (input.waitingSummary) {
    out.waitingSummary = waitingSummaryToBriefSignal(input.waitingSummary)
  }
  if (input.consultationCounts) {
    out.consultationCounts = consultationCountsToBriefSignal(input.consultationCounts)
  }
  if (input.weeklyReviewDue) {
    out.weeklyReviewDue = weeklyReviewDueToBriefSignal(input.weeklyReviewDue)
  }
  if (input.inboxBucketCounts) {
    out.inboxBucketCounts = inboxBucketCountsToBriefSignal(input.inboxBucketCounts)
  }
  if (input.stuckWipEntries) {
    out.stuckWip = stuckWipToBriefSignal(input.stuckWipEntries)
  }
  if (input.overdueActive) {
    out.overdueActive = overdueActiveToBriefSignal(input.overdueActive)
  }
  if (input.slipDays) {
    out.slipDays = slipDaysToBriefSignal(input.slipDays)
  }
  if (input.urgencyTierCounts) {
    out.urgencyTierCounts = urgencyTierCountsToBriefSignal(input.urgencyTierCounts)
  }
  if (input.mustHygiene) {
    out.mustHygiene = mustHygieneToBriefSignal(input.mustHygiene)
  }
  if (input.streakMilestone) {
    out.streakMilestone = streakToBriefSignal(computeCompletionStreak(input.streakMilestone))
  }
  if (input.streakComparison) {
    out.streakComparison = computeStreakComparisonSignal(input.streakComparison)
  }
  if (typeof input.doneToday === 'number') {
    out.doneToday = doneTodayToBriefSignal(input.doneToday)
  }
  return out
}

/**
 * AnalyticsSignals を null 除去 + AI brief 表示順 (severity / 重要度 上位 → 補助 下位)
 * の `AgentBriefSignal[]` 配列に変換。caller は `.map(s => <Chip ... />)` で 1 行 render。
 *
 * 表示順:
 *  1. concerningRole     (= 弱点 role 警告、最優先)
 *  2. costProjection     (= 月末コスト予測、cost 軸の主)
 *  3. dueHitRate         (= 期限達成率、商品品質 SLA、cost と並ぶ severity 主)
 *  4. biasTrend          (= 見積精度の変化、品質系 trend、severity 主の補佐)
 *  5. backlogAging       (= 停滞度合い、danger=古参累積、moment と並ぶ backlog 軸 severity 主)
 *  6. waitingSummary     (= 連絡待ち、danger=escalate、外部依存 軸 severity 主)
 *  7. consultationCounts (= 相談、danger=判断漏れ、合意 軸 severity 主)
 *  8. weeklyReviewDue    (= GTD Weekly Review、danger=overdue、習慣 軸 severity 主)
 *  9. inboxBucketCounts  (= GTD Inbox 健全性、danger=要 process、GTD flow 軸 severity 主)
 * 10. stuckWip           (= 進行中だが停滞、danger=7d+ 停滞、再開 nudge 軸 severity 主)
 * 11. overdueActive      (= 期限超過 active、danger=7d+ or 5+ 件、計画乖離 軸 severity 主)
 * 12. slipDays           (= 完了遅延 retrospective、danger=7d+、見積精度乖離 軸 severity 主)
 * 13. urgencyTierCounts  (= 緊急度件数、danger=critical 含む、最優先 actionable 軸 severity 主)
 * 14. mustHygiene        (= MUST hygiene、danger=coverage<50%、計画漏れ防止 軸 severity 主)
 * 15. reliability        (= 全体 信頼性 chip)
 * 16. costTrend          (= cost 月次トレンド)
 * 17. doneToday         (= 今日累計完了、最も immediate な達成感 chip、iter1728)
 * 18. velocity           (= 完了ペース、weekly と並ぶ達成感系)
 * 19. streakMilestone    (= 完了 streak milestone、velocity 直後の達成感 chip、iter1715)
 * 20. streakComparison   (= 現在 vs best streak 比較、streakMilestone 直後の達成感 chip、iter1719)
 * 21. weeklyCompletion   (= 週次完了 trend、達成感 + やる気)
 * 22. momentum           (= backlog momentum)
 * 23. dominantRole       (= 主軸 role、informational、最後)
 */
export function analyticsSignalsToArray(signals: AnalyticsSignals): AgentBriefSignal[] {
  const ordered: (AgentBriefSignal | null)[] = [
    signals.concerningRole,
    signals.costProjection,
    signals.dueHitRate,
    signals.biasTrend,
    signals.backlogAging,
    signals.waitingSummary,
    signals.consultationCounts,
    signals.weeklyReviewDue,
    signals.inboxBucketCounts,
    signals.stuckWip,
    signals.overdueActive,
    signals.slipDays,
    signals.urgencyTierCounts,
    signals.mustHygiene,
    signals.reliability,
    signals.costTrend,
    signals.doneToday,
    signals.velocity,
    signals.streakMilestone,
    signals.streakComparison,
    signals.weeklyCompletion,
    signals.momentum,
    signals.dominantRole,
  ]
  return ordered.filter((s): s is AgentBriefSignal => s !== null)
}

/**
 * iter816 basics: AnalyticsSignals を 1 行 plain text に整形する compose helper。
 * AI 朝 brief prompt / Slack daily digest の text 部分 (= 視覚的 chip ではなく plain
 * text channel) で「signal text を `/` 区切りで連結」する pattern を 1 関数化。
 *
 * caller pattern:
 *   const signals = composeAnalyticsSignals({...})
 *   const line = formatAnalyticsSignalsLineJa(signals)
 *   // → '弱点: PM 要調査 (50%) / AI コスト: 増加 (+30%) / AI 信頼性: 注意 (...)'
 *
 * 0 件 (= 全 signal null) → '記録なし'。
 *
 * `analyticsSignalsToArray` で順序整列 + null 除去 → text join、空配列 sentinel。
 * tone は plain text では落とす (= 視覚 chip 経路でのみ使用)。
 */
export function formatAnalyticsSignalsLineJa(signals: AnalyticsSignals): string {
  const arr = analyticsSignalsToArray(signals)
  if (arr.length === 0) return '記録なし'
  return arr.map((s) => s.text).join(' / ')
}

/**
 * iter1722 ai-automation: AnalyticsSignals から **達成感 cluster 3 軸** (velocity /
 * streakMilestone / streakComparison) のみを抽出する subset extractor。
 *
 * 用途:
 *  - Slack daily digest「今日の達成感」 section (= 警告系 chip と分離して positive
 *    feedback を集約) で「達成感 3 chip だけ」 を render
 *  - dashboard「やる気 panel」 disclosure で 3 chip cluster を別 row に整列
 *  - AI 朝 brief で「達成感セクション」 を冒頭に置きたいとき (= positive 強調)
 *
 * 表示順: velocity → streakMilestone → streakComparison
 * (= `analyticsSignalsToArray` の 17→18→19 位 順序に整合、達成感 cluster の
 * polarity 順 = trend chip → milestone chip → 過去 best 比較 chip)
 *
 * null 除去 + 並び順保持。全 3 軸 null → 空配列 (= 達成感 chip area 非表示用 gate)。
 *
 * 既存 helper との関係:
 *  - `analyticsSignalsToArray`: 全 20 軸 順序整列 + null 除去 (= 全 chip 個別 render 用)
 *  - 本 helper: 達成感 3 軸 のみ抽出 (= positive feedback section 専用、軸 5 やる気)
 *
 * 設計意図: severity chip (= 警告系) と達成感 chip を **視覚的に分離** することで
 * 「片付けるべき もの」 と「褒められる もの」 が一目で区別できる UX を作る (= 軸 5
 * やる気)。Duolingo の「Today's progress」 / GitHub Contributions の summary widget
 * の「ポジティブ section」 と同じ pattern。
 */
export function pickAchievementSignals(signals: AnalyticsSignals): AgentBriefSignal[] {
  const ordered: (AgentBriefSignal | null)[] = [
    signals.doneToday,
    signals.velocity,
    signals.streakMilestone,
    signals.streakComparison,
  ]
  return ordered.filter((s): s is AgentBriefSignal => s !== null)
}

/**
 * iter1752 ai-automation: 達成感 cluster の active signal 数。
 * `pickAchievementSignals(signals).length` の薄い wrapper。
 *
 * 用途:
 *  - UI badge 数 (= 「今日の達成感 3 件」 NavBar badge)
 *  - Slack daily digest headline 数 (= 「✨ 達成感 3 / ⚠ 警戒 2」)
 *  - dashboard summary chip area の「達成感セクション件数」
 *
 * `hasAchievementSignals` (iter1742) は boolean、本 helper は number。
 * 「ある or ない」 だけ知りたい時は has 版、件数を表示したい時は本 helper。
 */
export function countAchievementSignals(signals: AnalyticsSignals): number {
  return pickAchievementSignals(signals).length
}

/**
 * iter1742 ai-automation: 達成感 cluster に 1 軸以上 active signal があるかの predicate。
 *
 * `pickAchievementSignals(signals).length > 0` の薄い wrapper、UI / Slack notifier
 * の「達成感セクション表示 gate」 を 1 関数で書ける。
 *
 * caller pattern (達成感 panel 表示 gate):
 *   const signals = composeAnalyticsSignals({ ... })
 *   if (hasAchievementSignals(signals)) {
 *     return <AchievementPanel signals={signals} />
 *   }
 *
 * `pickAchievementSignals(signals).length > 0` で書くより semantic に明確 (= 「ある or
 * ない」 が boolean で示される、配列 length 比較の意図が読み手に伝わりやすい)。
 */
export function hasAchievementSignals(signals: AnalyticsSignals): boolean {
  return (
    signals.doneToday !== null ||
    signals.velocity !== null ||
    signals.streakMilestone !== null ||
    signals.streakComparison !== null
  )
}

/**
 * iter1744 ai-automation: 警戒系 (warn/danger/urgent tone) の signal を抽出する subset
 * extractor。`pickAchievementSignals` (= 達成感 cluster) の complement。
 *
 * `filterSignalsByMinTone('warn')` (iter1427) と同 semantics だが、analyticsSignalsToArray
 * の表示順を保つ薄い wrapper として明示的に export。「警戒 panel」 / 「concerning section」
 * UI / Slack notifier の concerning row gate caller に直接渡せる。
 *
 * 仕様:
 *  - tone ∈ {warn, danger, urgent} の signal のみ抽出
 *  - 表示順は `analyticsSignalsToArray` (severity rank 上位 → 補助 下位) を保持
 *  - 0 件 (= 警戒なし) → 空配列
 *
 * caller pattern (concerning panel 表示 gate):
 *   const signals = composeAnalyticsSignals({ ... })
 *   const concerning = pickConcerningSignals(signals)
 *   if (concerning.length > 0) {
 *     return <ConcerningPanel signals={concerning} />
 *   }
 *
 * 既存 helper との関係:
 *  - `pickAchievementSignals`: 達成感 4 軸 (positive polarity) 抽出
 *  - 本 helper: 警戒系 (severity 軸) 抽出 (= negative polarity / concerning)
 *  - `filterSignalsByMinTone('warn')`: 同等の semantics、本 helper は名前で意図明確化
 */
// iter1750 refactor: 手書き `(s) => s.tone === 'warn' || 'danger' || 'urgent'` filter を
// iter1699 着地 `filterSignalsByMinTone(signals, 'warn')` 経由に委譲。tone 集合
// {warn, danger, urgent} 定義の二重持ち (本 helper + iter1747 hasConcerningSignals) を
// iter1699 generic primitive に集約、新 tone 階層追加時の追従漏れ防止。表示順 / 0 件→空配列
// 等価性は `filterItemsByMinTone` 経路で保証 (iter1744 docstring も同 semantics と明記済)。
export function pickConcerningSignals(signals: AnalyticsSignals): AgentBriefSignal[] {
  return filterSignalsByMinTone(signals, 'warn')
}

/**
 * iter1747 ai-automation: 警戒 cluster に 1 軸以上 active signal があるかの predicate。
 * iter1742 `hasAchievementSignals` (達成感 cluster 版) の対称 concerning 版。
 *
 * `pickConcerningSignals(signals).length > 0` の薄い wrapper、UI / Slack notifier
 * の「警戒セクション表示 gate」 を 1 関数 boolean で書ける。
 *
 * caller pattern (concerning panel 表示 gate):
 *   const signals = composeAnalyticsSignals({ ... })
 *   if (hasConcerningSignals(signals)) {
 *     return <ConcerningPanel signals={signals} />
 *   }
 *
 * 既存 helper との関係:
 *  - `hasAchievementSignals` (iter1742): 達成感 cluster 4 軸 boolean (positive polarity)
 *  - `pickConcerningSignals` (iter1744): 警戒 subset 配列 (warn/danger/urgent)
 *  - `formatConcerningSignalsLineJa` (iter1745): 警戒 1 行 text (Slack section 用)
 *  - 本 helper: 警戒 cluster boolean (= 「警戒あり/なし」 gate)
 *
 * 設計意図: 達成感 cluster と対称的に「ある or ない」 を 1 関数 boolean で示す。
 * UI / Slack notifier の「警戒セクション render 判定」 で `if (length > 0)` 比較より
 * semantic 明確 (= 「警戒があるか」 が読み手に直接伝わる)。
 */
// iter1760 refactor: iter1750 で着地した `pickConcerningSignals(...).length > 0` 委譲 chain を、
// iter1759 で chip-tone primitive に追加した `someItemHasMinTone` (= short-circuit boolean)
// 経由に切替。filter 配列 build を回避 (= 最初の警戒 match で early return)、warm path の
// hot signal (= 23 軸中の警戒 1 件目で打切り) で構造的 perf 改善 + semantic「any 警戒あり」
// を 1 関数呼び出しで明示。invariant test (iter1747 has === pick.length>0 / iter1758
// pickConcerning === filterMinTone(s,'warn')) で意味的等価性を gate 継続。
export function hasConcerningSignals(signals: AnalyticsSignals): boolean {
  return someItemHasMinTone(analyticsSignalsToArray(signals), (s) => s.tone, 'warn')
}

/**
 * iter1752 ai-automation: 警戒 cluster の active signal 数。
 * iter1752 `countAchievementSignals` の対称 concerning 版、`pickConcerningSignals(signals).length`
 * の薄い wrapper。
 *
 * 用途:
 *  - UI badge 数 (= 「警戒 3 件」 alert NavBar badge)
 *  - Slack daily digest headline 数 (= 「✨ 達成感 3 / ⚠ 警戒 2」)
 *  - dashboard 警戒セクションの件数 (header / chip 上部)
 *
 * `hasConcerningSignals` (iter1747) は boolean、本 helper は number。
 * cluster 対称 API: pick (array) / has (boolean) / count (number) / formatLineJa (text)
 * の 4 関数 trio が両 cluster で完全対称化。
 */
export function countConcerningSignals(signals: AnalyticsSignals): number {
  return pickConcerningSignals(signals).length
}

/**
 * iter1745 ai-automation: 警戒 cluster を「警戒: ...」 prefix 付き 1 行 ja-JP text に
 * 整形する compose helper。`formatAchievementSignalsLineJa` (iter1725) と対称的な
 * concerning 版、Slack daily digest「今日の警告」 section 用。
 *
 * 仕様:
 *  - 警戒 signal 0 件 → '警戒: なし' sentinel (= 安心 feedback)
 *  - 1+ signal active → '警戒: ' + text を `/` 連結
 *  - severity 上位順 (analyticsSignalsToArray の rank) を保持
 *
 * caller pattern (Slack daily digest plain text body):
 *   const signals = composeAnalyticsSignals({...})
 *   slack.post(
 *     formatConcerningSignalsLineJa(signals) + '\n' +    // 警戒
 *     formatAchievementSignalsLineJa(signals)            // 達成感
 *   )
 *
 * 設計意図: 警告系 vs 達成感系 を **別 paragraph** で post することで、ユーザは
 * channel で「何が悪い / 何が良い」 を一目で区別可能 (= 軸 1 可視化)。
 */
export function formatConcerningSignalsLineJa(signals: AnalyticsSignals): string {
  return buildClusterLineJa('警戒: ', '警戒: なし', pickConcerningSignals(signals))
}

/**
 * iter1725 refactor: 達成感 cluster 3 軸を「達成感: ...」 prefix 付き 1 行 ja-JP text に
 * 整形する compose helper。Slack daily digest「今日の達成感」 section / AI 朝 brief
 * 「達成感セクション」 で plain text 行として埋め込む用。
 *
 * iter1722 `pickAchievementSignals` (= subset 配列) + iter816 `formatAnalyticsSignalsLineJa`
 * (= 全 chip 1 行 text) の 達成感 subset 版。「達成感: ペースは上向き / 7 日連続 🥈 シルバー
 * / (最高記録更新中!)」 のような 1 行を 1 関数で出せる。
 *
 * 仕様:
 *  - 全 3 軸 null → '達成感: 記録なし' sentinel
 *  - 1 軸以上 active → '達成感: ' + text を `/` 連結 (= formatAnalyticsSignalsLineJa と同 join)
 *  - tone は plain text では落とす (= 視覚 chip 経路でのみ使用)
 *
 * caller pattern (Slack daily digest plain text body):
 *   const signals = composeAnalyticsSignals({...})
 *   const achievementsLine = formatAchievementSignalsLineJa(signals)
 *   slack.post(`今日の状況\n${achievementsLine}\n${formatAnalyticsSignalsLineJa(signals)}`)
 *
 * 既存 helper との関係:
 *  - `pickAchievementSignals` (iter1722): subset 配列を返す (chip 個別 render 用)
 *  - 本 helper: 達成感 subset を 1 行 text 化 (= plain text channel 用)
 *  - `formatAnalyticsSignalsLineJa` (iter816): 全 20 軸を 1 行 text 化 (= 全体概要)
 *
 * 設計意図: severity chip (= 警告系) と達成感 chip を **視覚分離** するための text 経路。
 * Slack channel に「警告 / 達成感」 を別 paragraph として post でき、軸 5 やる気 が
 * 軸 3 / 4 (警告) に埋もれない UX を作る。
 */
export function formatAchievementSignalsLineJa(signals: AnalyticsSignals): string {
  return buildClusterLineJa('達成感: ', '達成感: 記録なし', pickAchievementSignals(signals))
}

// iter1755 refactor: cluster 別 1 行 ja-JP text の共通 pattern (prefix + signals.text を ' / ' で
// 連結、empty は sentinel) を 1 private helper に抽出。formatConcerning (iter1745) +
// formatAchievement (iter1725) の手書き 4 行 × 2 件を 2 行 × 2 件 + 共通 4 行に圧縮、
// 「cluster line format」 意図を 1 関数に集約 (= 新 cluster 追加時の追従漏れ防止 / 1 関数で
// format 仕様 (separator / sentinel pattern) を 1 view で読める)。
function buildClusterLineJa(
  prefix: string,
  emptySentinel: string,
  signals: AgentBriefSignal[],
): string {
  if (signals.length === 0) return emptySentinel
  return prefix + signals.map((s) => s.text).join(' / ')
}

/**
 * iter1749 ai-automation: 警戒 + 達成感 cluster の 2 行 summary を 1 関数で build。
 * `formatConcerningSignalsLineJa` (iter1745) + `formatAchievementSignalsLineJa` (iter1725) を
 * `\n` 連結する 1-call helper、Slack daily digest body / AI 朝 brief plain text の
 * 「警戒 → 達成感」 2 paragraph 構造を最小 boilerplate で実現。
 *
 * 仕様:
 *  - 1 行目: 警戒 cluster ('警戒: ...' or '警戒: なし')
 *  - 2 行目: 達成感 cluster ('達成感: ...' or '達成感: 記録なし')
 *  - 連結 separator: '\n' (= plain text の paragraph break)
 *  - 順序: 警戒 → 達成感 (= 重要 / 警告系を先頭で読者の attention を引き、達成感で締める
 *    Slack notification UX。軸 4 漏れ防止 が 軸 5 やる気 より優先される severity 設計)
 *
 * caller pattern (Slack daily digest plain text body):
 *   const signals = composeAnalyticsSignals({...})
 *   slack.post(`今日の状況\n${formatClusterSummaryLinesJa(signals)}`)
 *   // → 今日の状況
 *   //   警戒: 期限超過 3 件 / 連絡待ち 1 件停滞中
 *   //   達成感: 7 日連続 🥈 シルバー / 完了 12 件
 *
 * 既存 helper との関係:
 *  - `formatConcerningSignalsLineJa` (iter1745): 警戒 1 行のみ
 *  - `formatAchievementSignalsLineJa` (iter1725): 達成感 1 行のみ
 *  - `formatAnalyticsSignalsLineJa` (iter816): 全軸 1 行 (cluster 区別なし)
 *  - 本 helper: 警戒 + 達成感 を 2 行 (cluster 区別 + paragraph break)
 *
 * 設計意図: caller が 2 関数を `\n` で繋ぐ boilerplate を 1 関数に集約。Slack notifier
 * の本文 build を `formatClusterSummaryLinesJa(signals)` 1 行で済ませる。順序は
 * severity 設計 (警戒 → 達成感) に従い caller 側で再変換しなくて済む。
 */
export function formatClusterSummaryLinesJa(signals: AnalyticsSignals): string {
  return formatConcerningSignalsLineJa(signals) + '\n' + formatAchievementSignalsLineJa(signals)
}

/**
 * iter1754 ai-automation: cluster 別 active 数を 1 行 headline ja-JP に整形。
 * iter1752 countAchievement / countConcerningSignals を「警戒 N / 達成感 M」 形式に composing。
 *
 * 用途:
 *  - AI 朝 brief 冒頭 headline (= '警戒 2 / 達成感 3')
 *  - Slack daily digest channel header
 *  - dashboard summary chip area「cluster 件数」 1 行
 *
 * 仕様:
 *  - 両 0 → '警戒 0 / 達成感 0' (= 件数を明示、'記録なし' sentinel ではない)
 *    → 「今日は cluster 軸も静か」 を明示的に示す
 *  - 順序: 警戒 → 達成感 (= formatClusterSummaryLinesJa と同 severity 設計)
 *  - separator: ' / ' (= formatAnalyticsSignalsLineJa と同記号)
 *
 * caller pattern (AI 朝 brief headline):
 *   const signals = composeAnalyticsSignals({...})
 *   const headline = formatClusterCountsHeadlineJa(signals)
 *   // → '警戒 2 / 達成感 3'
 *   slack.post(`今日の状況: ${headline}\n${formatClusterSummaryLinesJa(signals)}`)
 *
 * 既存 helper との関係:
 *  - `countAchievementSignals` / `countConcerningSignals` (iter1752): 個別 number
 *  - `formatAnalyticsSignalsToneSummaryJa` (iter954): tone 別件数 ('緊急 1 / 注意 2')
 *  - 本 helper: cluster 別件数 ('警戒 2 / 達成感 3'、tone 細粒度より高 abstraction)
 *  - `formatClusterSummaryLinesJa` (iter1749): cluster 詳細 2 行 (本 helper は 1 行 headline)
 *
 * 設計意図: 「今日全体を 1 行で把握」 をさらに圧縮した headline。formatToneSummary は
 * 5 段階 tone vocab (緊急/要対応/注意/...) で長くなるが、cluster 軸 2 件だけの本 helper は
 * **常に 2 数値の固定 format** で channel header / UI badge 上部に最適。
 */
export function formatClusterCountsHeadlineJa(signals: AnalyticsSignals): string {
  const concerning = countConcerningSignals(signals)
  const achievement = countAchievementSignals(signals)
  return `警戒 ${concerning} / 達成感 ${achievement}`
}

/**
 * iter1762 ai-automation: cluster 件数 headline を 1 chip (AgentBriefSignal) に変換。
 * iter1754 formatClusterCountsHeadlineJa (= text) + tone derivation の 1 関数化、
 * dashboard 上部 / Slack notifier の「今日 1 chip 概要」 を 1 chip で render 可能。
 *
 * tone 判定 (= chip 配色):
 *  - 警戒 > 0 → 'warn'    (= 今日は警戒事項あり、注意喚起)
 *  - 警戒 = 0 + 達成感 > 0 → 'success' (= 今日は達成のみ、positive day)
 *  - 両 0 → 'idle'        (= 今日は cluster 軸記録なし、静か)
 *
 * 仕様:
 *  - text: formatClusterCountsHeadlineJa(signals) と同 ('警戒 N / 達成感 M')
 *  - tone: 上記 3 段階判定
 *  - signal.text は format regex (iter1757) に従う
 *
 * caller pattern (dashboard summary chip):
 *   const signals = composeAnalyticsSignals({...})
 *   const chip = clusterCountsToAgentBriefSignal(signals)
 *   <Chip text={chip.text} tone={chip.tone} />
 *
 * 既存 helper との関係:
 *  - `formatClusterCountsHeadlineJa` (iter1754): text のみ ('警戒 N / 達成感 M')
 *  - `countConcerningSignals` / `countAchievementSignals` (iter1752): 個別 number
 *  - 本 helper: text + tone (= 1 chip 完結、配色 + 文言)
 *  - `pickHighestSeveritySignal` (iter957): 全 signal から最重要 1 chip (詳細 chip 軸)
 *
 * 設計意図: dashboard / AI 朝 brief / Slack の「全体状態 1 chip」 が caller の手動 tone
 * 判定なしで build 可能。tone が 3 段階 (warn/success/idle) に整理されることで、UI 側で
 * 「警戒 vs 達成 vs 静か」 の 3 状態を 1 chip で示し、軸 1 可視化 + 軸 5 やる気 を両立。
 */
export function clusterCountsToAgentBriefSignal(signals: AnalyticsSignals): AgentBriefSignal {
  const concerning = countConcerningSignals(signals)
  const achievement = countAchievementSignals(signals)
  const tone: ChipTone = concerning > 0 ? 'warn' : achievement > 0 ? 'success' : 'idle'
  return {
    text: formatClusterCountsHeadlineJa(signals),
    tone,
  }
}

/**
 * iter954 ai-automation: AnalyticsSignals の non-null signal を ChipTone 別に件数集計。
 *
 * 用途: AI 朝 brief / Slack daily digest の冒頭 headline で「全 chip の tone 分布」を
 * 1 行で出すための substrate。caller は本 helper → `formatToneCountsJa(counts)` →
 * '緊急 1 / 注意 2 / 達成 3' の 1 行 summary を作れる。
 *
 * `countItemsByTone` (lib/ui/chip-tone) の AnalyticsSignals 特化版 (= getTone callback の
 * boilerplate を caller が書かなくて済む)。0 signal 入力 → 全 0 の Record (= UI 側で「記録なし」分岐可)。
 *
 * iter955 refactor: 内部実装を共通 `countItemsByTone` に委譲 (forEach 手書きを排除、
 * tone 0 初期化の責務を共通 helper に集約)。出力 shape は不変。
 *
 * 既存 helper との関係:
 *   - `analyticsSignalsToArray`: null 除去 + 表示順整列 (chip 個別 render 用)
 *   - `formatAnalyticsSignalsLineJa`: 全 signal text を `/` 連結 (= 個別 text 並び)
 *   - 本 helper: tone 別 件数集計 (= signal の severity distribution、headline 用)
 */
export function countAnalyticsSignalsByTone(signals: AnalyticsSignals): Record<ChipTone, number> {
  return countItemsByTone(analyticsSignalsToArray(signals), (s) => s.tone)
}

/**
 * iter954 ai-automation: AnalyticsSignals の tone 分布を 1 行 ja-JP に整形 (headline 用)。
 *
 *   countAnalyticsSignalsByTone(signals) → formatToneCountsJa(counts)
 *
 * 全 signal null → '0 件' (= 既存 formatToneCountsJa の空 sentinel)、
 * その他 → '緊急 1 / 要対応 2 / 達成 3' のような 1 行。
 *
 * caller pattern (Slack daily digest 冒頭):
 *   const signals = composeAnalyticsSignals({ ... })
 *   const headline = formatAnalyticsSignalsToneSummaryJa(signals)
 *   const detail = formatAnalyticsSignalsLineJa(signals)
 *   // → Slack '今日の analytics: 緊急 1 / 要対応 2 / 達成 3\n${detail}'
 */
export function formatAnalyticsSignalsToneSummaryJa(signals: AnalyticsSignals): string {
  return formatToneCountsJa(countAnalyticsSignalsByTone(signals))
}

/**
 * iter957 ai-automation: AnalyticsSignals 中で最も attention rank が高い signal を抽出。
 *
 * 用途:
 *   - AI 朝 brief / Slack daily digest の「最重要 1 行」 headline (= 「⚠️ PM 信頼性 50%」)
 *   - dashboard summary chip area 上部の「優先 alert」 1 chip
 *   - notification badge tone (= 最悪 signal の tone を採用)
 *
 * 仕様:
 *   - non-null signal を `analyticsSignalsToArray` で順序整列 + null 除去
 *   - 各 signal の tone から `pickHighestSeverityTone` (lib/ui/chip-tone) で最悪 tone を選出
 *   - 同 rank が複数の場合は `analyticsSignalsToArray` の表示順 (= concerningRole が
 *     dueHitRate より優先) を保つ (stable max、`.find` で配列先頭 match を採る)
 *   - 全 null → null sentinel
 *
 * iter960 refactor: 手書き max loop を `pickHighestSeverityTone` + `.find(tone match)` に
 * 簡素化 (lib/ui/chip-tone の既存 helper を再利用、max-by-tone の semantics を 1 module に集約)。
 *
 * 既存 helper との関係:
 *   - `countAnalyticsSignalsByTone`: 分布集計 (= headline summary 文字列向け)
 *   - `analyticsSignalsToArray`: 全 signal 配列 (= chip 個別 render 向け)
 *   - 本 helper: 単一 signal 抽出 (= 1 chip alert / badge tone 向け)
 */
export function pickHighestSeveritySignal(signals: AnalyticsSignals): AgentBriefSignal | null {
  // iter1425 refactor: iter1424 で追加した `pickTopSignalsBySeverity(signals, 1)` の先頭抽出と等価。
  // 旧実装は `pickHighestSeverityTone + arr.find(tone match)` の 2 段だったが、
  // n=1 版で完全に表現できる (= 並び順 + tie-break が iter1424 で `pickTopItemsByTone` 経由で
  // stable max を保証、analyticsSignalsToArray の domain 順優先も同等)。
  // unit test (711-752) は変更不要、`pickTopSignalsBySeverity` test (n=1 等価) で同一性 assert 済。
  return pickTopSignalsBySeverity(signals, 1)[0] ?? null
}

/**
 * iter1424 ai-automation: AnalyticsSignals から「上位 N 件の最 severe signals」を抽出する pure helper。
 *
 * `pickHighestSeveritySignal` (iter957) は単一 1 件、本 helper は **N 件版**。
 * AI 朝 brief / Slack daily digest の **「最重要 alert top 3」 headline** や
 * dashboard **「優先 alert chip 列」** が欲しい場面の substrate。
 *
 * 実装: iter1423 で chip-tone.ts に追加した `pickTopItemsByTone` を `analyticsSignalsToArray`
 * の出力に対して呼ぶだけの薄ラッパー (= 「items × getTone callback」 pattern を AnalyticsSignals
 * 特化版 boilerplate 排除)。
 *
 * 仕様:
 *  - 全 signal null → 空配列 (= caller の guard 不要)
 *  - n <= 0 → 空配列 (defensive)
 *  - n >= 非 null signal 数 → 全 non-null signal を tone severity 降順で
 *  - 並び順: chip-tone attention rank 降順 (= danger → urgent → warn → info → idle → success)
 *  - 同 rank は `analyticsSignalsToArray` の domain 表示順 (= concerningRole が dueHitRate より優先)
 *    を保持 (= stable sort、`pickTopItemsByTone` が `compareChipTones` 経由で stable)
 *
 * caller pattern (AI 朝 brief 「最重要 3 alert」 headline):
 *   const signals = composeAnalyticsSignals({...})
 *   const top3 = pickTopSignalsBySeverity(signals, 3)
 *   const headline = top3.map(s => s.text).join(' / ')
 *   // → '弱点: PM 要調査 (50%) / コスト超過 (+80%) / 期限達成率 低 (45%)'
 *
 * 既存 helper との関係:
 *   - `analyticsSignalsToArray`: 全 signal 配列 (= 全 chip render 向け、domain 順)
 *   - `pickHighestSeveritySignal`: 単一抽出 (= 1 chip alert / badge tone 向け)
 *   - `countAnalyticsSignalsByTone`: tone 分布集計 (= '緊急 1 / 注意 2' summary 向け)
 *   - 本 helper: 上位 N 抽出 (= top N alert headline 向け、severity 順並べ)
 */
export function pickTopSignalsBySeverity(signals: AnalyticsSignals, n: number): AgentBriefSignal[] {
  return pickTopItemsByTone(analyticsSignalsToArray(signals), (s) => s.tone, n)
}

/**
 * iter1426 basics: AnalyticsSignals の上位 N severe signals を 1 行 ja-JP に整形する compose helper。
 *
 * 役割は `formatAnalyticsSignalsLineJa` (iter816、= 全 signal text を `/` 連結) の **top N 版**。
 * AI 朝 brief / Slack daily digest 「最重要 3 alert headline」 の 1 行を `caller` が
 * 自前で `pickTopSignalsBySeverity + .map(s => s.text).join(...)` する pattern を 1 関数化。
 *
 * 仕様:
 *  - 全 signal null → '記録なし' (= 既存 `formatAnalyticsSignalsLineJa` と同 sentinel)
 *  - n <= 0 → '記録なし' (= `pickTopSignalsBySeverity` が空配列 → 整形結果も sentinel)
 *  - n >= 非 null signal 数 → 全 non-null signal を severity 順で連結
 *  - 並び順 = `pickTopSignalsBySeverity` と同 (= chip-tone attention rank 降順、同 rank stable)
 *  - 連結文字は ' / ' (= `formatAnalyticsSignalsLineJa` と整合)
 *
 * caller pattern (AI 朝 brief 「最重要 3 alert」 1 行 headline):
 *   const signals = composeAnalyticsSignals({...})
 *   const headline = formatTopSignalsLineJa(signals, 3)
 *   // → '弱点: PM 要調査 (50%) / コスト超過 (+80%) / 期限達成率 低 (45%)'
 *
 * 既存 helper との関係:
 *   - `formatAnalyticsSignalsLineJa`: 全 signal を domain 表示順で連結 (= chip 群一覧 向け)
 *   - 本 helper: 上位 N を severity 順で連結 (= 「最重要だけ」 headline 向け)
 *   - `pickTopSignalsBySeverity`: chip render 用 (= UI が個別 tone 配色を bind したい場合)
 */
export function formatTopSignalsLineJa(signals: AnalyticsSignals, n: number): string {
  const top = pickTopSignalsBySeverity(signals, n)
  if (top.length === 0) return '記録なし'
  return top.map((s) => s.text).join(' / ')
}

/**
 * iter1427 ai-automation: AnalyticsSignals から「`minTone` 以上の severity を持つ signals のみ」
 * filter して返す pure helper。
 *
 * 用途: AI 朝 brief / Slack daily digest の「**concerning だけ headline**」 (= success / idle を
 * 除外して chip 列を凝集表示) の substrate。dashboard 「現在の警戒 signal」 panel も同。
 *
 * 仕様:
 *  - `minTone` 以上の attention rank を持つ signal のみ通過 (= rank >= rank(minTone))
 *    例: minTone='warn' → danger / urgent / warn のみ通過 (info / idle / success は除外)
 *  - 並び順は `analyticsSignalsToArray` の domain 表示順 (= 既存 chip 並びと整合)
 *  - 全 null or 全 filter 除外 → 空配列
 *  - `pickTopSignalsBySeverity` (= severity 降順 + N 件) とは異なる軸:
 *      - 本 helper: severity 閾値 filter (件数制限なし、domain 順保持)
 *      - pickTop: severity 順 + 件数制限 (= top N alert headline 向け)
 *
 * caller pattern (「警戒 signal だけ chip 列」):
 *   const concerning = filterSignalsByMinTone(signals, 'warn')
 *   // → danger/urgent/warn の signal だけ、domain 表示順で
 *   concerning.map(s => <Chip text={s.text} tone={s.tone} />)
 *
 * 既存 helper との関係:
 *  - `analyticsSignalsToArray`: 全 non-null signal 配列 (= 閾値なし)
 *  - `pickTopSignalsBySeverity`: 上位 N 件 (= severity 順、件数制限)
 *  - `pickHighestSeveritySignal`: 単一最重要 signal
 *  - 本 helper: 閾値以上の signal 全件 (= 「警戒 signal だけ凝集」)
 */
// iter1699 refactor: iter1698 で着地した generic `filterItemsByMinTone` (chip-tone primitive) に
// 委譲、手書き `chipToneAttentionRank` + `filter` の重複ロジックを排除。`groupSignalsByTone`
// (iter1428) / `pickTopSignalsBySeverity` (iter1424) と同 pattern の AnalyticsSignals 特化薄
// ラッパー。signal の表示順 (domain order = concerningRole 先頭) は `analyticsSignalsToArray`
// が担保、本 helper は閾値 filter のみ責務。
export function filterSignalsByMinTone(
  signals: AnalyticsSignals,
  minTone: ChipTone,
): AgentBriefSignal[] {
  return filterItemsByMinTone(analyticsSignalsToArray(signals), (s) => s.tone, minTone)
}

/**
 * iter1428 basics: AnalyticsSignals を ChipTone 別の signal 配列に分配する pure helper。
 *
 * `countAnalyticsSignalsByTone` (iter954) は **件数のみ** だが、本 helper は **signal 自身**
 * を tone 別に分配する。caller は tone 別の chip row を 1 行ずつ render できる:
 *
 *   const grouped = groupSignalsByTone(signals)
 *   grouped.danger.map(s => <Chip text={s.text} tone="danger" />)
 *   grouped.warn.map(s => <Chip text={s.text} tone="warn" />)
 *   ...
 *
 * 仕様:
 *  - 6 tone (danger / urgent / warn / info / idle / success) すべての key を持つ Record
 *  - 該当 signal 無し tone は空配列 (= caller の undefined check 不要、`grouped.danger.length === 0`
 *    で chip row 非表示判断可能)
 *  - 各 array 内の並び順は `analyticsSignalsToArray` の domain 表示順 を保持 (= concerningRole
 *    が先頭、stable)
 *  - 全 null → 6 key すべて空配列
 *
 * 用途:
 *  - dashboard 「重要度別 chip 行」 layout (= 危ない行 / 注意行 / 達成行 を縦に並べる)
 *  - AI 朝 brief 「重要度別 grouping」 出力 (= caller が tone 別に prefix label を付与)
 *  - Slack daily digest 「concerning / positive panel 分離」 (= grouped.danger を critical
 *    section、grouped.success を good section に振り分け)
 *
 * 既存 helper との関係:
 *  - `countAnalyticsSignalsByTone`: tone 別件数 (= 集計のみ、signal は捨てる)
 *  - `analyticsSignalsToArray`: 全 signal 1 配列 (= tone 区別なし)
 *  - `pickTopSignalsBySeverity`: severity 順 N 件 (= tone は混在)
 *  - `filterSignalsByMinTone`: 閾値以上の signal (= 1 軸 filter)
 *  - 本 helper: tone 別 **分配** (= 6 軸 grouping、UI 縦配置 / Slack section 分離 向け)
 */
// iter1700 refactor: iter1431 で着地した generic `groupItemsByTone` (chip-tone primitive) に
// 委譲、手書き 6 tone Record 初期化 + for-loop の重複ロジックを排除。iter1699
// `filterSignalsByMinTone → filterItemsByMinTone` と同 pattern (= primitive 委譲の 4 軸目)。
// signal の domain 表示順 (concerningRole 先頭) は `analyticsSignalsToArray` が担保、本 helper
// は tone 別分配のみ責務に集約。
export function groupSignalsByTone(
  signals: AnalyticsSignals,
): Record<ChipTone, AgentBriefSignal[]> {
  return groupItemsByTone(analyticsSignalsToArray(signals), (s) => s.tone)
}
