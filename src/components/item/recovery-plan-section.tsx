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
  recoveryActionKindLabelJa,
  recoveryActionKindSeverity,
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

/**
 * overdue MUST item に対し救済 action 3 選を表示する section。
 * isApplicable=false なら null (= 描画なし)。
 *
 * iter518 refactor: chip label / severity は recovery-plan.ts の helper
 * (`recoveryActionKindLabelJa` / `recoveryActionKindSeverity`、iter545 で投入) を
 * そのまま消費し、本 component 内の重複 map を削除。escalate は helper では
 * 'danger' (= 自動推論不能、上位者判断必要) に分類されているため SeverityChip
 * 配色も従来 info → danger に shift (semantic 整合)。同様に unblock は
 * danger → warn / split は warn → info に整列。
 */
export function RecoveryPlanSection({ item, heavyAssignees = [], today, className }: Props) {
  const t = today ?? todayISO()
  const plan = buildRecoveryPlan(item, { today: t, heavyAssignees })

  if (!plan.isApplicable || plan.actions.length === 0) return null

  return (
    // iter1376: 旧実装は container bg-rose-50/40 / heading text-rose-900 / action card
    // bg-white が全て light 固定色で dark に追従せず、dark では theme-aware text (foreground/
    // muted) が light bg に乗り white-on-white (1.04) 等の重度 contrast 割れ (WCAG 1.4.3 ×5)。
    // 各々に dark: 変種 / theme token を付与。
    <div
      className={`space-y-2 rounded-lg border border-rose-200 bg-rose-50/40 p-3 dark:border-rose-900/50 dark:bg-rose-950/30 ${className ?? ''}`}
      role="region"
      aria-labelledby="recovery-plan-heading"
      data-testid="recovery-plan-section"
    >
      <h3
        id="recovery-plan-heading"
        className="flex items-center gap-1.5 text-sm font-semibold text-rose-900 dark:text-rose-200"
      >
        <LifeBuoy className="h-4 w-4" aria-hidden="true" />
        MUST 救済プラン
      </h3>
      <p className="text-muted-foreground text-xs">
        この overdue MUST item は落とせない。具体 action 上位 3 つ (data-driven、AI 不使用)。
      </p>
      <ol
        className="space-y-2"
        aria-label={`救済 action ${plan.actions.length} 件`}
        /* iter2315: 救済 action ol の aria-label "救済 action N 件" は browser tooltip にならず
           sighted は hover で count context disclose 不可。Activity 履歴 ul iter2291 / swimlane
           lane 一覧 ul iter2305 と同 一覧 list family title pattern を recovery plan ol にも
           展開、8 entity 一覧 ul/ol family 完成 (+ recovery actions)。 */
        title={`救済 action ${plan.actions.length} 件`}
      >
        {plan.actions.map((action) => {
          const label = recoveryActionKindLabelJa(action.kind)
          return (
            <li
              key={`${action.kind}-${action.rank}`}
              className="bg-card space-y-1 rounded border p-2 text-xs"
              data-testid={`recovery-action-${action.kind}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[10px] tabular-nums" aria-hidden="true">
                  {action.rank}.
                </span>
                <SeverityChip
                  severity={recoveryActionKindSeverity(action.kind)}
                  label={label}
                  ariaLabel={`action 種別 ${label}`}
                />
                <span className="font-medium">{action.title}</span>
              </div>
              <p className="text-muted-foreground pl-6 leading-relaxed">{action.rationale}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
