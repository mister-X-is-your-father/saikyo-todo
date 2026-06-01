'use client'

/**
 * iter1625 (refactor): 6 panel (sprints / goals / integrations / workflows /
 * time-entries / templates) の empty-state 「作成フォームへ」 button が完全同一
 * shape (visible "作成フォームへ" + scrollIntoView + focus id) を inline 重複して
 * いたのを共有 component に集約。差分は 4 prop (targetId / entityName / fieldName /
 * testId) のみ。
 *
 * iter1623 FocusQuickAddButton と同 pattern (= 共通 UX convention を 1 file に
 * 集中、後続変更が 1 箇所完結)、iter1624 `focusElementById` helper を再利用。
 *
 * 6 軸:
 *  - 効率化: 6 file × 8 行 = 48 行重複削減、caller は 1 prop call で済む
 *  - 認知低減: convention (em-dash aria-label / visible 冒頭 / focus-visible
 *    ring / min-h-11 / scrollIntoView) が 1 file に集中
 */
import { focusElementById } from '@/lib/ui/focus-quick-add'

import { EMPTY_CTA_BUTTON_CLASS } from '@/components/shared/empty-cta-button-class'

/**
 * iter1639: testId / targetId を string ではなく既知の literal union に narrow。
 * 6 callsite の data-testid と target input id が typo されたら typecheck で
 * 早期検出可能に。
 *
 * iter1646: 各 targetId に対応する entityName / fieldName を internal lookup table
 * (`FORM_DESCRIPTORS`) に集約。caller は 2 prop (targetId + testId) のみで OK、
 * aria-label の 6 つの descriptive 文言は本 file 内で完全管理。
 */
export type FocusFormTestId =
  | 'sprints-empty-create'
  | 'goals-empty-create'
  | 'integrations-empty-create'
  | 'workflows-empty-create'
  | 'time-entries-empty-create'
  | 'templates-empty-create'

export type FocusFormTargetId =
  | 'sprint-name'
  | 'goal-title'
  | 'src-name'
  | 'wf-name'
  | 'teDate'
  | 'tmpl-name'

/**
 * target input id → (entity 名, field 名) の 1 source of truth。
 *
 * iter1648: invariant test (`focus-form-cta.test.ts`) で 6 key 完全性 +
 * 非空 entityName/fieldName を assert する。export することで test 可能化。
 */
export const FORM_DESCRIPTORS: Record<
  FocusFormTargetId,
  { entityName: string; fieldName: string }
> = {
  'sprint-name': { entityName: 'Sprint', fieldName: '名前' },
  'goal-title': { entityName: 'Goal', fieldName: 'Objective' },
  'src-name': { entityName: 'Source', fieldName: '名前' },
  'wf-name': { entityName: 'Workflow', fieldName: '名前' },
  teDate: { entityName: '稼働記録', fieldName: '勤務日' },
  'tmpl-name': { entityName: 'Template', fieldName: '名前' },
}

interface Props {
  /** 焦点 target の input element id (6 panel 内のいずれか) */
  targetId: FocusFormTargetId
  /** Playwright が panel 別 discriminate するための testid (6 callsite 限定 union) */
  testId: FocusFormTestId
}

export function FocusFormCta({ targetId, testId }: Props) {
  const { entityName, fieldName } = FORM_DESCRIPTORS[targetId]
  return (
    <button
      type="button"
      className={EMPTY_CTA_BUTTON_CLASS}
      data-testid={testId}
      aria-label={`作成フォームへ — ${entityName} 作成フォームの『${fieldName}』入力欄にフォーカス`}
      onClick={() => focusElementById(targetId)}
    >
      <span aria-hidden="true">作成フォームへ</span>
    </button>
  )
}
