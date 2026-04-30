'use client'

/**
 * iter549 (queue fluffy-5 wire-up): MUST 救済プラン section。
 *
 * iter528 着地の `buildRecoveryPlan` (overdue MUST 救済 action 3 選 substrate) を消費し、
 * ItemEditDialog 等で overdue MUST item に対し具体 action 提案を表示する小 component。
 *
 * 設計目的 (FEEDBACK_QUEUE.md fluffy-5):
 *   - 「何が起こったか / 何をすべきか」 の AI 文章 (一般論 fluffy) を排除
 *   - data-driven な具体 action 3 選 (unblock / reassign / split / reschedule / escalate)
 *     を rationale 付きで表示
 *   - todayISO + heavyAssignees option を caller が渡すだけで完結 (副作用無し)
 *
 * isApplicable=false (= overdue MUST でない) なら null を返し UI 上 invisible。
 */
import { LifeBuoy } from 'lucide-react'

import { todayISO } from '@/lib/date/iso'

import {
  buildRecoveryPlan,
  type RecoveryActionKind,
  type RecoveryPlanItemFields,
} from '@/features/item/recovery-plan'

import { SeverityChip } from '@/components/shared/severity-chip'

interface Props {
  item: RecoveryPlanItemFields
  /** 「負荷が高い担当」 のリスト (= reassign 候補から外す側)、option */
  heavyAssignees?: readonly string[]
  /** ISO YYYY-MM-DD、test 注入用 */
  today?: string
  className?: string
}

const ACTION_KIND_SEVERITY: Record<RecoveryActionKind, 'ok' | 'info' | 'warn' | 'danger'> = {
  unblock: 'danger',
  reassign: 'warn',
  split: 'warn',
  reschedule: 'info',
  escalate: 'info',
}

const ACTION_KIND_LABEL: Record<RecoveryActionKind, string> = {
  unblock: '依存先解消',
  reassign: '担当再分配',
  split: '細分化',
  reschedule: '期限再設定',
  escalate: 'エスカレーション',
}

/**
 * overdue MUST item に対し救済 action 3 選を表示する section。
 * isApplicable=false なら null (= 描画なし)。
 */
export function RecoveryPlanSection({ item, heavyAssignees = [], today, className }: Props) {
  const t = today ?? todayISO()
  const plan = buildRecoveryPlan(item, { today: t, heavyAssignees })

  if (!plan.isApplicable || plan.actions.length === 0) return null

  return (
    <div
      className={`space-y-2 rounded-lg border border-rose-200 bg-rose-50/40 p-3 ${className ?? ''}`}
      role="region"
      aria-labelledby="recovery-plan-heading"
      data-testid="recovery-plan-section"
    >
      <h3
        id="recovery-plan-heading"
        className="flex items-center gap-1.5 text-sm font-semibold text-rose-900"
      >
        <LifeBuoy className="h-4 w-4" aria-hidden="true" />
        MUST 救済プラン
      </h3>
      <p className="text-muted-foreground text-xs">
        この overdue MUST item は落とせない。具体 action 上位 3 つ (data-driven、AI 不使用)。
      </p>
      <ol className="space-y-2" aria-label={`救済 action ${plan.actions.length} 件`}>
        {plan.actions.map((action) => (
          <li
            key={`${action.kind}-${action.rank}`}
            className="space-y-1 rounded border bg-white p-2 text-xs"
            data-testid={`recovery-action-${action.kind}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[10px] tabular-nums">{action.rank}.</span>
              <SeverityChip
                severity={ACTION_KIND_SEVERITY[action.kind]}
                label={ACTION_KIND_LABEL[action.kind]}
                ariaLabel={`action 種別 ${ACTION_KIND_LABEL[action.kind]}`}
              />
              <span className="font-medium">{action.title}</span>
            </div>
            <p className="text-muted-foreground pl-6 leading-relaxed">{action.rationale}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
