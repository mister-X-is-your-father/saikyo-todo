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
import type { ReactNode } from 'react'

interface Props {
  /** Playwright / a11y 探索 script が状態 view 別に discriminate するための ID */
  testId: 'today-empty-quick-add' | 'inbox-empty-quick-add' | 'board-empty-quick-add'
  /** override 不要だが、shared button のラベル文言を将来差替えしたい時の拡張ポイント */
  children?: ReactNode
}

/**
 * `#quick-add-input` を focus + scrollIntoView する empty-state CTA button。
 * `q` global shortcut の visible mirror (CLAUDE.md / KEYBINDINGS 一致)。
 */
export function FocusQuickAddButton({ testId, children }: Props) {
  return (
    <button
      type="button"
      className="text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none"
      data-testid={testId}
      aria-keyshortcuts="q"
      aria-label="クイック追加にフォーカス (キー: q) — quick-add input にフォーカスして即タスク入力"
      onClick={() => {
        const el = document.getElementById('quick-add-input') as HTMLInputElement | null
        el?.focus()
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }}
    >
      <span aria-hidden="true">{children ?? 'クイック追加にフォーカス (キー: q)'}</span>
    </button>
  )
}
