/**
 * iter796 ai-automation: analytics 4 軸 (reliability / cost-projection / cost-trend /
 * momentum) を 1 関数で `AgentBriefSignal[]` 配列に集約する compose helper。
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
  formatToneCountsJa,
  pickTopItemsByTone,
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
import { type VelocitySummary, velocityToBriefSignal } from '@/features/item/velocity'
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
 * 17. velocity           (= 完了ペース、weekly と並ぶ達成感系)
 * 18. weeklyCompletion   (= 週次完了 trend、達成感 + やる気)
 * 19. momentum           (= backlog momentum)
 * 20. dominantRole       (= 主軸 role、informational、最後)
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
    signals.velocity,
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
