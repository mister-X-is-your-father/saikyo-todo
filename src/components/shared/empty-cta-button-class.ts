/**
 * iter1633: empty-state action button (FocusQuickAddButton iter1623 +
 * FocusFormCta iter1625) で完全同一の Tailwind className を共有定数に集約。
 *
 * 視覚 convention:
 *  - `text-primary` — link 風の主要色
 *  - `hover:bg-muted hover:underline` — hover affordance
 *  - `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`
 *    — focus indicator (WCAG 2.4.7)
 *  - `min-h-11` — tap target >= 44px (WCAG 2.5.5)
 *  - `inline-flex items-center` — leading icon 余地を残しつつ horizontal layout
 *  - `mt-2 rounded border px-3 py-1.5 text-xs` — EmptyState 内 spacing と
 *    視覚的 hierarchy (CTA は本文より小さく、囲み border で「ここを押せる」を示す)
 *
 * caller (現在 2 件、将来追加された empty-state CTA も同 convention で揃える):
 *  - `src/components/shared/focus-form-cta.tsx`
 *  - `src/components/workspace/focus-quick-add-button.tsx`
 *
 * className を共有することで:
 *  - 視覚 convention drift を unit level で防ぐ (= 6 軸「認知低減」 + a-g「一貫性」)
 *  - Tailwind 文字列の typo / 部分欠落を 1 箇所修正で全 caller に伝播
 *  - hover / focus / a11y treatment が常に同期
 */
export const EMPTY_CTA_BUTTON_CLASS =
  'text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none'
