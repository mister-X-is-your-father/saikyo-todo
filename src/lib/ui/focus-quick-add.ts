/**
 * iter1624: `#quick-add-input` への focus + scrollIntoView を 1 関数に集約。
 *
 * 集約前の 3 callsite:
 *   - `src/components/shared/global-shortcuts.tsx`         (`q` 押下 → focus)
 *   - `src/components/workspace/focus-quick-add-button.tsx` (empty-state CTA)
 *   - `src/components/workspace/items-board.tsx`            (Command Palette command)
 *
 * 集約後: 全 caller が `focusQuickAdd()` を呼ぶ。差分は 「scrollIntoView するか」 だが
 * すべて user-driven な focus action なので scrollIntoView を **常に実行**。
 * off-screen でも視野に入る = WCAG 2.4.3 focus-visible 補完。
 *
 * iter1623 で empty-state button 自体を集約済、本 iter は **focus 実行 logic** を
 * 集約する補完 refactor。
 */

/**
 * 任意の id を持つ HTMLElement を focus + scrollIntoView する pure DOM helper。
 *
 * iter1625: 6 panel (sprints / goals / integrations / workflows / time-entries /
 * templates) の 「作成フォームへ」 CTA + iter1624 focusQuickAdd で 共通利用。
 *
 * 返り値: focus できたら true、要素が無ければ false。
 */
export function focusElementById(id: string): boolean {
  const el = document.getElementById(id) as HTMLElement | null
  if (!el) return false
  el.focus()
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}

/**
 * `#quick-add-input` 要素を focus + scrollIntoView する。
 * 要素が DOM に存在しない (= layout 未 mount / 別 page) ときは noop。
 *
 * `focusElementById('quick-add-input')` の thin wrapper。意味的にも実装的にも
 * 「quick-add input」 専用の名前付き helper として 3 caller (global-shortcuts /
 * empty-state CTA / Command Palette command) が使う。
 *
 * 返り値: focus できたら true、要素が無ければ false (= caller が hint 表示等に使う場合用)。
 */
export function focusQuickAdd(): boolean {
  return focusElementById('quick-add-input')
}
