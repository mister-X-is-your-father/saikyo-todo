/**
 * iter (queue AC-1 substrate): 「AI に任せた」 1 click の action sequence を pure 関数で計算。
 *
 * 設計目的: AC-1 UI button が押されたとき、item の現状から「何を実行すべきか」 を
 * deterministic に決定する。UI 側は返ってきた step 配列を順番に呼ぶだけ。
 *
 * step kinds:
 *   - 'set-ai-assignee': AI assignee がまだ居ない → 追加
 *   - 'generate-plan':   AI Plan がまだ無い → generate を呼ぶ
 *   - 'skip-already':    既に AI 担当 + plan 生成済 → 何もしない (existing comment へ navigate)
 *   - 'blocked-done':    item が done → handoff 不可
 *
 * AC-2 (AI に review してもらう) も同 pattern を再利用予定。
 *
 * 詳細: FEEDBACK_QUEUE.md 「AI との分業/協業 シリーズ」 AC-1
 */
import { hasAiAssignee } from './ai-assignee'
import type { AssigneeRef } from './repository'

export type HandoffStepKind = 'set-ai-assignee' | 'generate-plan' | 'skip-already' | 'blocked-done'

export interface HandoffStep {
  kind: HandoffStepKind
  reason: string
}

export interface HandoffPlanInput {
  status: string
  assignees: readonly AssigneeRef[]
  /** comment list に Plan marker (🤖) を持つ comment が存在するか */
  hasExistingPlan: boolean
}

export interface HandoffPlan {
  steps: HandoffStep[]
  /** UI が button label / toast に使う 1 行 summary */
  summary: string
  /** 実行すべき step がある (= button を実 active にする) */
  actionable: boolean
}

export function planHandoffToAi(input: HandoffPlanInput): HandoffPlan {
  // 完了済 task は handoff 対象外
  if (input.status === 'done') {
    return {
      steps: [{ kind: 'blocked-done', reason: 'task が完了済' }],
      summary: '完了済の task は AI 任せの対象外です',
      actionable: false,
    }
  }

  const aiAlready = hasAiAssignee(input.assignees)
  const steps: HandoffStep[] = []

  if (!aiAlready) {
    steps.push({ kind: 'set-ai-assignee', reason: 'AI assignee 追加' })
  }

  if (!input.hasExistingPlan) {
    steps.push({ kind: 'generate-plan', reason: 'Researcher が Plan を生成 (comment post)' })
  }

  if (steps.length === 0) {
    return {
      steps: [
        {
          kind: 'skip-already',
          reason: 'AI assignee + Plan 既存、comment tab で確認してください',
        },
      ],
      summary: '既に AI 任せ + Plan 生成済 (comment 確認)',
      actionable: false,
    }
  }

  const labels = steps.map((s) => {
    if (s.kind === 'set-ai-assignee') return 'AI 担当に設定'
    if (s.kind === 'generate-plan') return 'Plan 生成'
    return s.kind
  })
  return {
    steps,
    summary: labels.join(' → '),
    actionable: true,
  }
}
