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

interface Props {
  /** 焦点 target の input element id (e.g., `sprint-name` / `goal-title`) */
  targetId: string
  /** aria-label に inline する entity 名 (e.g., `'Sprint'` / `'Goal'`) */
  entityName: string
  /** aria-label に inline する field 名 (e.g., `'名前'` / `'Objective'` / `'勤務日'`) */
  fieldName: string
  /** Playwright が panel 別 discriminate するための testid */
  testId: string
}

export function FocusFormCta({ targetId, entityName, fieldName, testId }: Props) {
  return (
    <button
      type="button"
      className="text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none"
      data-testid={testId}
      aria-label={`作成フォームへ — ${entityName} 作成フォームの『${fieldName}』入力欄にフォーカス`}
      onClick={() => focusElementById(targetId)}
    >
      <span aria-hidden="true">作成フォームへ</span>
    </button>
  )
}
