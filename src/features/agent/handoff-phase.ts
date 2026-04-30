/**
 * iter537 (queue AC-1 substrate): 「AI に任せた」 1 click hand-off の phase state
 * machine を pure helper として表現。
 *
 * 設計目的 (FEEDBACK_QUEUE.md AI 分業/協業 シリーズ AC-1):
 *   - item に AI assignee 設定 → plan 生成 → 実行 → review 完了 の 1 cycle を
 *     deterministic な 7 phase に分類、UI 側は phase ごとに button / chip / 通知 を
 *     決めるだけ
 *   - assignee=AI 設定 / plan comment 存在 / review comment 存在 / item.status=done
 *     の 4 boolean から phase を導出 (= caller は extra api call 不要)
 *   - 「次に何すべきか」 が ambiguous にならず、UI 側の disable ロジックが単純化
 *
 * Phase 遷移図:
 *   no-ai (assignee 0 or human のみ)
 *      ↓ user が AssigneePicker で AI 選択
 *   pending-handoff (AI assignee 有り、plan comment 無し)
 *      ↓ user が「Plan を生成」 click → researcherService が comment post
 *   plan-pending (handoff 中、plan 生成中) — runtime 状態のため別途 isPending 渡す
 *      ↓ plan comment が DB に着地
 *   plan-ready-for-review (plan comment 有り、review comment 無し、status != done)
 *      ↓ user が plan を承認 + AI が実行開始
 *   in-execution (review 済 plan、status='in_progress')
 *      ↓ AI が完了 + review comment post
 *   review-requested (AI 実行完了、review 待ち、status != done)
 *      ↓ user が完了確認
 *   completed (status='done')
 *
 * AI 不使用、副作用無し、依存無し。pure helper + Vitest 単体 test で網羅。
 */

import { hasAiAssignee } from '@/features/item/ai-assignee'
import type { AssigneeRef } from '@/features/item/repository'

export type AiHandoffPhase =
  | 'no-ai'
  | 'pending-handoff'
  | 'plan-ready-for-review'
  | 'in-execution'
  | 'review-requested'
  | 'completed'

export interface HandoffItemFields {
  status: string | null | undefined
  assignees: readonly AssigneeRef[]
}

export interface HandoffSignals {
  /** 本 item の comment に「🤖 実行計画 (案)」 marker 付き comment が存在するか */
  hasPlanComment: boolean
  /** 本 item の comment に「✅ レビュー結果」 等 marker 付きで AI が完了報告した comment が存在するか */
  hasAiReviewComment: boolean
}

/**
 * item state + signals から AI handoff phase を導出。
 *
 * 優先順 (上 → 下):
 *   1. status='done'           → 'completed'
 *   2. AI assignee 無し        → 'no-ai'
 *   3. plan comment 無し       → 'pending-handoff'
 *   4. AI review comment 有り  → 'review-requested'
 *   5. status='in_progress'    → 'in-execution'
 *   6. それ以外                → 'plan-ready-for-review'
 */
export function getAiHandoffPhase(
  item: HandoffItemFields,
  signals: HandoffSignals,
): AiHandoffPhase {
  if (item.status === 'done') return 'completed'
  if (!hasAiAssignee(item.assignees)) return 'no-ai'
  if (!signals.hasPlanComment) return 'pending-handoff'
  if (signals.hasAiReviewComment) return 'review-requested'
  if (item.status === 'in_progress') return 'in-execution'
  return 'plan-ready-for-review'
}

/**
 * Phase ごとに UI 表示用 label / 次に推奨される action / 副 description を返す。
 * UI は本 helper の output を直 render するだけ (Card chip + button label 連動)。
 */
export interface PhaseDescriptor {
  /** UI chip の label (短く) */
  chipLabel: string
  /** 次にユーザに見せる主 button の label (null = button 非表示) */
  primaryActionLabel: string | null
  /** chip + button の補助 description (1 行) */
  description: string
  /** chip / 配色 hint (caller が SeverityChip に渡せる形) */
  severity: 'ok' | 'info' | 'warn' | 'muted'
}

const DESCRIPTORS: Record<AiHandoffPhase, PhaseDescriptor> = {
  'no-ai': {
    chipLabel: '人間担当',
    primaryActionLabel: 'AI に任せる',
    description: 'AssigneePicker で AI を選ぶと「AI に任せた」モードに切替',
    severity: 'muted',
  },
  'pending-handoff': {
    chipLabel: 'AI hand-off 待ち',
    primaryActionLabel: 'Plan を生成',
    description: 'AI が担当に設定済。Plan 生成を click → AI が実行計画を comment 投稿',
    severity: 'info',
  },
  'plan-ready-for-review': {
    chipLabel: 'Plan 確認待ち',
    primaryActionLabel: 'Plan を承認',
    description: 'AI が Plan を投稿済。内容を確認し承認すると AI が実行開始',
    severity: 'warn',
  },
  'in-execution': {
    chipLabel: 'AI 実行中',
    primaryActionLabel: null,
    description: 'AI が承認済 Plan に基づき実行中。完了 comment が来たら review',
    severity: 'info',
  },
  'review-requested': {
    chipLabel: 'AI 完了報告 — Review 待ち',
    primaryActionLabel: 'Review して完了',
    description: 'AI が実行完了を報告。成果物を確認し問題なければ「完了」 status へ',
    severity: 'warn',
  },
  completed: {
    chipLabel: '完了済',
    primaryActionLabel: null,
    description: 'AI と人間の協業 cycle が完了した item',
    severity: 'ok',
  },
}

export function getHandoffPhaseDescriptor(phase: AiHandoffPhase): PhaseDescriptor {
  return DESCRIPTORS[phase]
}
