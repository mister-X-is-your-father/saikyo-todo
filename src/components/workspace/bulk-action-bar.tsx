'use client'

/**
 * Bulk Action Bar (固定 bottom)。
 * - useBulkSelectionStore の選択件数 > 0 で表示
 * - workspace_statuses から遷移可能 status を展開、一括 status 変更 + delete
 * - 失敗件数は toast で集計表示
 */
import { useEffect } from 'react'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'
import { useBulkSelectionStore } from '@/lib/stores/bulk-selection'

import { useBulkSoftDeleteItem, useBulkUpdateItemStatus } from '@/features/item/hooks'
import { useWorkspaceStatuses } from '@/features/workspace/hooks'

import { Button } from '@/components/ui/button'

interface Props {
  workspaceId: string
}

export function BulkActionBar({ workspaceId }: Props) {
  const selected = useBulkSelectionStore((s) => s.selected)
  const clear = useBulkSelectionStore((s) => s.clear)
  const { data: statuses } = useWorkspaceStatuses(workspaceId)
  const bulkStatus = useBulkUpdateItemStatus(workspaceId)
  const bulkDelete = useBulkSoftDeleteItem(workspaceId)

  // workspace 遷移時に clear
  useEffect(() => {
    return () => clear()
  }, [workspaceId, clear])

  const count = selected.size
  if (count === 0) return null

  async function handleStatus(statusKey: string) {
    const ids = Array.from(selected)
    try {
      const res = await bulkStatus.mutateAsync({ ids, status: statusKey })
      const okN = res.succeeded.length
      const failN = res.failed.length
      toast.success(`${okN} 件のステータスを更新しました${failN > 0 ? ` (失敗 ${failN})` : ''}`)
      clear()
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '一括更新に失敗')
    }
  }

  async function handleDelete() {
    const ids = Array.from(selected)
    if (!confirm(`${ids.length} 件を soft delete しますか?`)) return
    try {
      const res = await bulkDelete.mutateAsync({ ids })
      const okN = res.succeeded.length
      const failN = res.failed.length
      toast.success(`${okN} 件を削除しました${failN > 0 ? ` (失敗 ${failN})` : ''}`)
      clear()
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '一括削除に失敗')
    }
  }

  return (
    <div
      className="bg-background fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-lg border px-4 py-2 shadow-lg"
      data-testid="bulk-action-bar"
      role="region"
      aria-label={`一括操作 (${count} 件選択中)`}
    >
      <span className="text-sm font-medium" data-testid="bulk-count">
        {count} 件選択中
      </span>
      <div className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
      {(statuses ?? []).map((s) => (
        <Button
          key={s.key}
          size="sm"
          variant="outline"
          disabled={bulkStatus.isPending}
          onClick={() => void handleStatus(s.key)}
          data-testid={`bulk-status-${s.key}`}
          aria-label={`選択 ${count} 件を「${s.label}」に変更`}
        >
          {s.label} に
        </Button>
      ))}
      <Button
        size="sm"
        variant="destructive"
        disabled={bulkDelete.isPending}
        onClick={() => void handleDelete()}
        data-testid="bulk-delete"
        aria-label={`選択 ${count} 件を soft delete`}
      >
        削除
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => clear()}
        data-testid="bulk-clear"
        aria-label="選択を解除"
      >
        解除
      </Button>
    </div>
  )
}

/** 行ごとの選択 checkbox。 */
export function BulkCheckbox({ itemId }: { itemId: string }) {
  const selected = useBulkSelectionStore((s) => s.selected)
  const toggle = useBulkSelectionStore((s) => s.toggle)
  const checked = selected.has(itemId)
  return (
    <input
      type="checkbox"
      aria-label="選択"
      checked={checked}
      onChange={() => toggle(itemId)}
      onClick={(e) => e.stopPropagation()}
      data-testid={`bulk-select-${itemId}`}
    />
  )
}

/** 全選択 / 全解除 checkbox。現ページ全行を対象に。 */
export function BulkHeaderCheckbox({ rowIds }: { rowIds: string[] }) {
  const selected = useBulkSelectionStore((s) => s.selected)
  const setMany = useBulkSelectionStore((s) => s.setMany)
  const clear = useBulkSelectionStore((s) => s.clear)
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id))
  return (
    <input
      type="checkbox"
      aria-label="全選択"
      checked={allSelected}
      onChange={(e) => {
        if (e.target.checked) setMany(rowIds)
        else clear()
      }}
      data-testid="bulk-select-all"
    />
  )
}
