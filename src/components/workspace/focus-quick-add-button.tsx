'use client'

/**
 * iter1623: 3 view (today / inbox / items-board) の empty-state action button
 * (`#quick-add-input` への focus + scrollIntoView) が完全同一コードを 3 箇所
 * 重複していたのを共有 component に集約。差分は data-testid のみで、className
 * / aria-label / aria-keyshortcuts / onClick はすべて同一。
 *
 * 6 軸 効率化 + 認知低減: 1 file に focus shortcut hint convention を集約 = 後続の
 * convention 変更 (em-dash / visible prefix / etc.) が 1 箇所で完結。
 */
import { focusQuickAdd } from '@/lib/ui/focus-quick-add'

import { EMPTY_CTA_BUTTON_CLASS } from '@/components/shared/empty-cta-button-class'

interface Props {
  /** Playwright / a11y 探索 script が状態 view 別に discriminate するための ID */
  testId: 'today-empty-quick-add' | 'inbox-empty-quick-add' | 'board-empty-quick-add'
}

/**
 * `#quick-add-input` を focus + scrollIntoView する empty-state CTA button。
 * `q` global shortcut の visible mirror (CLAUDE.md / KEYBINDINGS 一致)。
 *
 * iter1630: 旧 `children?: ReactNode` prop は全 3 caller が未指定で fallback 一択
 * だったため削除 (CLAUDE.md「仮想需要に備えた抽象禁止」)。可変文言が必要に
 * なった時は再追加可。
 */
export function FocusQuickAddButton({ testId }: Props) {
  return (
    <button
      type="button"
      className={EMPTY_CTA_BUTTON_CLASS}
      data-testid={testId}
      aria-keyshortcuts="q"
      aria-label="クイック追加にフォーカス (キー: q) — quick-add input にフォーカスして即タスク入力"
      onClick={focusQuickAdd}
    >
      <span aria-hidden="true">クイック追加にフォーカス (キー: q)</span>
    </button>
  )
}
