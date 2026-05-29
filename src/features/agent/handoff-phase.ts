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

/**
 * iter1004 ai-automation: ユーザ side action 待ち phase か判定する pure predicate。
 *
 * true: phase ∈ { pending-handoff, plan-ready-for-review, review-requested }
 *   = AI が user に処理を返した状態。`descriptor.primaryActionLabel != null` かつ
 *     `no-ai` を除外したもの (= 「AI workflow 内で user に handoff されている」)
 * false: それ以外
 *   - no-ai      = AI workflow 外 (= 人間担当のみ、descriptor は「AI に任せる」を出すが
 *                  「待ち」 ではなく初期状態)
 *   - in-execution = AI 実行中、user は待つだけ
 *   - completed  = cycle 完了
 *
 * 用途: dashboard 「AI handoff 待ち N 件」 filter / Slack 通知「あなたの操作待ち」 chip /
 * Backlog 「Plan 確認 + Review 待ち」 集計。
 */
export function isHandoffWaitingForUser(phase: AiHandoffPhase): boolean {
  return (
    phase === 'pending-handoff' || phase === 'plan-ready-for-review' || phase === 'review-requested'
  )
}

/**
 * iter1004 ai-automation: AI workflow 進行中 phase か判定する pure predicate。
 *
 * true: phase ∈ { pending-handoff, plan-ready-for-review, in-execution, review-requested }
 *   = AI が関わっている item (= no-ai / completed 以外)
 * false:
 *   - no-ai      = 人間担当のみ (= AI workflow 外)
 *   - completed  = cycle 終了 (= AI も人間も「やること」 が無い)
 *
 * 用途: dashboard 「AI が今関わっている item 数」 / Backlog 「AI workflow 中」 filter /
 * Sprint plan「AI cycle 中の item 抜く / 残す」 集計。
 *
 * `isHandoffWaitingForUser` との差分: `isHandoffActive` は in-execution を含む
 * (= AI 実行中も active)、`isHandoffWaitingForUser` は user action 必要なものだけ。
 */
export function isHandoffActive(phase: AiHandoffPhase): boolean {
  return phase !== 'no-ai' && phase !== 'completed'
}

/**
 * iter538 ai-automation polish: AI handoff phase の 1 行 status (chip aria-label /
 * AI prompt / Slack 通知 用)。
 *   '人間担当 — AssigneePicker で AI を選ぶと「AI に任せた」モードに切替'
 *   'AI hand-off 待ち — Plan 生成を click すると AI が実行計画を comment 投稿'
 *   '完了済 — AI と人間の協業 cycle が完了した item'
 *
 * caller (= chip aria-label / AI prompt / Slack 通知) は本文字列をそのまま埋め込める。
 * 詳細 button label は `getHandoffPhaseDescriptor(phase).primaryActionLabel` で個別に取得。
 */
export function formatHandoffPhaseStatusJa(phase: AiHandoffPhase): string {
  const d = DESCRIPTORS[phase]
  return `${d.chipLabel} — ${d.description}`
}

/**
 * iter1429 ai-automation: items 配列を AI handoff phase 別に件数集計する pure helper。
 *
 * dashboard 「AI handoff 状態別件数」 chip 列 / Slack daily digest 「AI workflow 状態」 panel /
 * Backlog filter 「Plan 確認待ち N 件」 集計 の substrate。
 *
 * 仕様:
 *  - getSignals callback で item ごと HandoffSignals を解決 (comment 検索等の I/O は caller の
 *    責務、本 helper は pure 計算のみ)
 *  - 6 phase (`no-ai` / `pending-handoff` / `plan-ready-for-review` / `in-execution` /
 *    `review-requested` / `completed`) 全 key を持つ Record、該当無し phase は 0
 *  - 順序付き走査、deterministic
 *
 * 用途 (combine pattern):
 *   const signalsByItem = new Map<string, HandoffSignals>()
 *   // caller: comment query で各 item の hasPlanComment / hasAiReviewComment を解決
 *   for (const item of items) {
 *     signalsByItem.set(item.id, await resolveHandoffSignals(item.id))
 *   }
 *   const counts = countItemsByHandoffPhase(items, (it) => signalsByItem.get(it.id)!)
 *   // → { 'no-ai': 5, 'pending-handoff': 2, 'plan-ready-for-review': 1, ... }
 *
 * 既存 helper との関係:
 *   - `getAiHandoffPhase`: 単一 item の phase 解決 (= 本 helper の 1 callback)
 *   - `getHandoffPhaseDescriptor`: phase → 表示用 label / severity (= caller が phase 別 chip render)
 *   - 本 helper: 全 items を phase 別件数に集計 (= dashboard / Slack 状態俯瞰)
 *
 * `isHandoffActive` / `isHandoffWaitingForUser` の集計版が欲しい場合:
 *   const counts = countItemsByHandoffPhase(items, getSignals)
 *   const waiting = counts['pending-handoff'] + counts['plan-ready-for-review'] + counts['review-requested']
 *   const active = waiting + counts['in-execution']
 */
export function countItemsByHandoffPhase<T extends HandoffItemFields>(
  items: ReadonlyArray<T>,
  getSignals: (item: T) => HandoffSignals,
): Record<AiHandoffPhase, number> {
  const counts: Record<AiHandoffPhase, number> = {
    'no-ai': 0,
    'pending-handoff': 0,
    'plan-ready-for-review': 0,
    'in-execution': 0,
    'review-requested': 0,
    completed: 0,
  }
  for (const item of items) {
    counts[getAiHandoffPhase(item, getSignals(item))] += 1
  }
  return counts
}
