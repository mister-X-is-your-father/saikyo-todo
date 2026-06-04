/**
 * iter1732 refactor: prefers-reduced-motion check helper (iter1726 / iter1727 で
 * focusElementById + gantt-view scrollToToday に inline 重複していたのを 1 helper に
 * 集約)。
 *
 * WCAG 2.3.3 (Animation from Interactions) 対応用:
 *  - JS `scrollIntoView({ behavior: 'smooth' })` / `scrollTo({ behavior: 'smooth' })` 等は
 *    CSS `@media (prefers-reduced-motion: reduce) { scroll-behavior: auto }` を override する
 *    ため、JS 側で明示 check が必要
 *  - 本 helper を caller の behavior 切替に挟むことで reduced-motion ユーザは smooth scroll
 *    を回避 (前庭障害ユーザの不快/めまい防止)
 *
 * defensive:
 *  - SSR (typeof window === 'undefined') では false (= 動的環境前提)
 *  - jsdom 等 matchMedia 未実装環境では optional chain で false fall-through
 *
 * 利用例:
 *   import { prefersReducedMotion } from '@/lib/ui/prefers-reduced-motion'
 *
 *   const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
 *   el.scrollTo({ left: 100, behavior })
 *
 * 既存 caller (iter1732 で本 helper 経由に置換):
 *  - src/lib/ui/focus-quick-add.ts focusElementById (iter1726 inline 配線)
 *  - src/components/workspace/gantt-view.tsx scrollToToday (iter1727 inline 配線)
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}
