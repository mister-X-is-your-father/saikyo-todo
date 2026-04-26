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
const PRIORITY_CLASS: Record<number, string> = {
  1: 'border-red-500 hover:bg-red-50 data-[checked=true]:bg-red-500',
  2: 'border-amber-500 hover:bg-amber-50 data-[checked=true]:bg-amber-500',
  3: 'border-blue-500 hover:bg-blue-50 data-[checked=true]:bg-blue-500',
  4: 'border-slate-400 hover:bg-slate-100 data-[checked=true]:bg-slate-500',
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

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isDone}
      data-checked={isDone}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={handle}
      disabled={toggle.isPending}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${colorClass} ${className ?? ''}`}
      data-testid={`item-checkbox-${item.id}`}
      aria-label={`「${item.title}」を${isDone ? '未完了に戻す' : '完了にする'}`}
      title={isDone ? '未完了に戻す' : '完了にする'}
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
