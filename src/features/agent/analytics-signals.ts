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

import { type DueHitRateStats, dueHitRateToBriefSignal } from '@/features/item/due-hit-rate'
import { type WorkspaceMomentum, workspaceMomentumToBriefSignal } from '@/features/item/momentum'
import {
  type WeeklyCompletionInsight,
  weeklyCompletionInsightToBriefSignal,
} from '@/features/item/weekly-completion-insight'

import {
  type AgentBriefSignal,
  type AgentReliability,
  composeAgentBriefSignals,
} from './agent-reliability'
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
  return out
}

/**
 * AnalyticsSignals を null 除去 + AI brief 表示順 (severity / 重要度 上位 → 補助 下位)
 * の `AgentBriefSignal[]` 配列に変換。caller は `.map(s => <Chip ... />)` で 1 行 render。
 *
 * 表示順:
 *  1. concerningRole   (= 弱点 role 警告、最優先)
 *  2. costProjection   (= 月末コスト予測、cost 軸の主)
 *  3. dueHitRate       (= 期限達成率、商品品質 SLA、cost と並ぶ severity 主)
 *  4. reliability      (= 全体 信頼性 chip)
 *  5. costTrend        (= cost 月次トレンド)
 *  6. weeklyCompletion (= 週次完了 trend、達成感 + やる気)
 *  7. momentum         (= backlog momentum)
 *  8. dominantRole     (= 主軸 role、informational、最後)
 */
export function analyticsSignalsToArray(signals: AnalyticsSignals): AgentBriefSignal[] {
  const ordered: (AgentBriefSignal | null)[] = [
    signals.concerningRole,
    signals.costProjection,
    signals.dueHitRate,
    signals.reliability,
    signals.costTrend,
    signals.weeklyCompletion,
    signals.momentum,
    signals.dominantRole,
  ]
  return ordered.filter((s): s is AgentBriefSignal => s !== null)
}
