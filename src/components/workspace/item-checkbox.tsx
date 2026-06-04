'use client'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useToggleCompleteItem } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'

/**
 * 優先度色付きの丸 checkbox。Kanban card / Backlog row / Today view 共通。
 *
 * p1: 赤 / p2: 橙 / p3: 青 / p4 (既定): 灰
 */
// iter1534: hover:bg-{color}-50/100 は light 固定で dark mode で hover state が明色のまま
// 浮く (light hover が dark bg にしみる)。dark:hover:bg-{color}-950/30 を併記、border は
// 500 mid-shade で theme 中間色のため touch なし、checked bg も 500 で theme 中間色維持。
const PRIORITY_CLASS: Record<number, string> = {
  1: 'border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 data-[checked=true]:bg-red-500',
  2: 'border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 data-[checked=true]:bg-amber-500',
  3: 'border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 data-[checked=true]:bg-blue-500',
  4: 'border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/30 data-[checked=true]:bg-slate-500',
}

export function ItemCheckbox({
  item,
  workspaceId,
  className,
}: {
  item: Item
  workspaceId: string
  className?: string
}) {
  const toggle = useToggleCompleteItem(workspaceId)
  // doneAt があれば完了済とみなす (status 文字列は workspace ごとに可変)
  const isDone = Boolean(item.doneAt)

  async function handle(e: React.MouseEvent | React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await toggle.mutateAsync({
        id: item.id,
        expectedVersion: item.version,
        complete: !isDone,
      })
    } catch (err) {
      toast.error(isAppError(err) ? err.message : '完了状態の変更に失敗しました')
    }
  }

  const colorClass = PRIORITY_CLASS[item.priority ?? 4] ?? PRIORITY_CLASS[4]

  // iter505: tap target を 44x44 に拡張 (WCAG 2.5.5 AAA)。視覚 checkbox は h-5 w-5 (20x20)
  // を維持するため、`::before` pseudo で透明な extension を visible 周囲に出す。
  // Tailwind: `before:absolute before:-inset-3` で 12px ずつ外側に伸ばし合計 44x44。
  // `relative` を button に付けて pseudo の anchor を確立、`disabled:before:hidden` で
  // disabled 時は extension を隠して mouseover 等の anchor を消す。
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isDone}
      data-checked={isDone}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={handle}
      disabled={toggle.isPending}
      aria-busy={toggle.isPending || undefined}
      /* iter1667: 旧 className に focus-visible:ring が無く、keyboard user が
         Tab focus した時に視覚 indicator が出なかった (WCAG 2.4.7 Focus Visible
         違反)。`focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`
         を追加し、EMPTY_CTA_BUTTON_CLASS / Button shadcn / 他 inline custom button と
         focus convention 統一。 */
      className={`focus-visible:ring-ring relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors before:absolute before:-inset-3 before:rounded-full before:content-[''] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:before:hidden ${colorClass} ${className ?? ''}`}
      data-testid={`item-checkbox-${item.id}`}
      // iter1219: 旧 aria-label は visible 概念名 "完了にする" / "未完了に戻す" / "切替中…"
      // を末尾 ("「title」を **完了にする**" / "「title」の完了状態を **切替中…**") に持ち
      // voice control prefix-matching「click 完了にする / 未完了に戻す / 切替中…」 match
      // 不可 (icon-only checkbox、visible text 無、title attribute は tooltip 専用)。
      // proposal-reject iter1217 と同 sweep を item-checkbox にも展開。概念名を冒頭固定
      // + em-dash 区切で descriptive 末尾保持。
      aria-label={
        toggle.isPending
          ? `切替中… — 「${item.title}」の完了状態を切替中`
          : isDone
            ? `未完了に戻す — 「${item.title}」を未完了に戻す`
            : `完了にする — 「${item.title}」を完了にする`
      }
      /* iter2319: item-checkbox の旧 title は 2-path で短文 (isDone ? '未完了に戻す' :
         '完了にする') のみ、aria-label の state-dependent 3-path (pending / done / todo、
         item.title 含む) と divergent。pending state も hover で disclose 不可 (toggle 中
         であることが sighted hover で分からなかった)。両 path とも aria-label と同 text の
         title に揃え、3-path sync で「どの item の状態切替か + 進行状況」を hover で disclose。
         start-timer iter2271 と同 title-aria full sync pattern。 */
      title={
        toggle.isPending
          ? `切替中… — 「${item.title}」の完了状態を切替中`
          : isDone
            ? `未完了に戻す — 「${item.title}」を未完了に戻す`
            : `完了にする — 「${item.title}」を完了にする`
      }
    >
      {isDone && (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5 text-white"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7.07 7.07a1 1 0 01-1.42 0L3.296 8.86a1 1 0 111.42-1.42l3.207 3.21 6.36-6.36a1 1 0 011.42 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  )
}
