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
    // iter1025: mobile 320px viewport で bar 内容 width が 416px に膨らみ、
    // `fixed left-1/2 -translate-x-1/2` の bar.left が -48px (viewport 左端を超える)、
    // bar.right=368px > viewport 320px overflow になっていた (iter1024
    // ActiveTimerPanel と同 hazard)。`max-w-[calc(100vw-2rem)]` で右 16px + 左 16px
    // margin を引いた viewport 内に常時収め + 内部 `overflow-x-auto` で button 群が
    // 横スクロール可 (touch swipe で 5 status + 削除 + 解除 全部にアクセス可能、
    // 旧 1 行 layout を保ったまま viewport 制限を満たす)。desktop は max-w が大きく効かず元レイアウト維持。
    <div
      className="bg-background fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-lg border px-4 py-2 shadow-lg"
      data-testid="bulk-action-bar"
      role="region"
      /* iter1579: 旧 aria-label paren convention `"一括操作 (X 件選択中)"` は iter1093-1578 sweep の
         em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
      aria-label={`一括操作 — ${count} 件選択中`}
      /* iter1999: region 全体に title を付与し sighted hover で 選択数 disclose、
         iter1997 decompose-proposals bulk group と同 region/group summary pattern。 */
      title={`一括操作 — ${count} 件選択中`}
    >
      <span
        className="text-sm font-medium"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="bulk-count"
      >
        {count} 件選択中
      </span>
      <div className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
      {(statuses ?? []).map((s) => (
        <Button
          key={s.key}
          size="sm"
          className="min-h-11"
          variant="outline"
          disabled={bulkStatus.isPending}
          aria-busy={bulkStatus.isPending || undefined}
          onClick={() => void handleStatus(s.key)}
          data-testid={`bulk-status-${s.key}`}
          // iter1045: visible "<label> に" を aria-label の prefix に固定し WCAG 2.5.3
          // satisfy (旧 aria-label は "「<label>」に" で literal "<label> に" 連続
          // substring 無し、bracket 挿入で voice control match 不可)。
          aria-label={
            bulkStatus.isPending
              ? `${s.label} に変更中… — 選択 ${count} 件のステータスを変更中`
              : `${s.label} に変更 — 選択 ${count} 件を「${s.label}」に変更`
          }
          // iter1827: bulk-action-bar 3 button (status/delete/clear) の hover disclosure
          // (iter1789 comment-thread / iter1791 submit と同 pattern)。
          title={
            bulkStatus.isPending
              ? `${s.label} に変更中… — 選択 ${count} 件のステータスを変更中`
              : `${s.label} に変更 — 選択 ${count} 件を「${s.label}」に変更`
          }
        >
          <span aria-hidden="true">{s.label} に</span>
        </Button>
      ))}
      <Button
        size="sm"
        className="min-h-11"
        variant="destructive"
        disabled={bulkDelete.isPending}
        aria-busy={bulkDelete.isPending || undefined}
        onClick={() => void handleDelete()}
        data-testid="bulk-delete"
        // iter1105: visible "削除" / "解除" を aria-label 冒頭固定 (iter1093-1104 sweep convention)。
        // 旧 aria-label は visible 末尾持ちで voice control prefix-matching「click 削除/解除」 match 不可。
        aria-label={
          bulkDelete.isPending
            ? `削除中… — 選択 ${count} 件を削除中 (soft delete: ゴミ箱で 30 日保持)`
            : `削除 — 選択 ${count} 件を削除 (soft delete: ゴミ箱で 30 日保持)`
        }
        title={
          bulkDelete.isPending
            ? `削除中… — 選択 ${count} 件を削除中 (soft delete: ゴミ箱で 30 日保持)`
            : `削除 — 選択 ${count} 件を削除 (soft delete: ゴミ箱で 30 日保持)`
        }
      >
        <span aria-hidden="true">削除</span>
      </Button>
      <Button
        size="sm"
        className="min-h-11"
        variant="ghost"
        onClick={() => clear()}
        data-testid="bulk-clear"
        aria-label="解除 — 選択を全て解除"
        title="解除 — 選択を全て解除"
      >
        <span aria-hidden="true">解除</span>
      </Button>
    </div>
  )
}

/** 行ごとの選択 checkbox。itemTitle を受け取れば SR に「N番目を選択」ではなく
 * 「『〜』を一括操作対象に追加 / 解除」を読み上げて識別性を上げる。
 * iter1031: mobile 320px で visible checkbox 13x13 は WCAG 2.5.5 違反。
 * `::before` pseudo expansion (iter505 ItemCheckbox / iter507 activity-log と同 pattern)
 * で透明な tap target を視覚 size を保ったまま 44x44 化。 */
export function BulkCheckbox({ itemId, itemTitle }: { itemId: string; itemTitle?: string }) {
  const selected = useBulkSelectionStore((s) => s.selected)
  const toggle = useBulkSelectionStore((s) => s.toggle)
  const checked = selected.has(itemId)
  // iter1220: 旧 aria-label `「title」を一括操作の対象に追加 / から外す` は visible 概念名
  // "一括操作対象" を中位置 "「title」を **一括操作** の..." に持ち voice control
  // prefix-matching「click 一括操作」 match 不可 (icon-only checkbox、visible text 無、
  // title attribute も無し)。item-checkbox iter1219 と同 sweep を BulkCheckbox にも展開。
  // 概念名 "一括操作対象に追加" / "から外す" を aria-label 冒頭固定 + em-dash 区切で
  // descriptive 末尾 (item title / "この行") 保持。
  const action = checked ? '一括操作対象から外す' : '一括操作対象に追加'
  const label = itemTitle
    ? `${action} — 「${itemTitle}」を${action}`
    : `${action} — この行を${action}`
  return (
    <input
      type="checkbox"
      aria-label={label}
      /* iter2183: BulkCheckbox の aria-label "action — 「itemTitle」を action" は browser
         tooltip にならず sighted は hover で itemTitle + action context disclose 不可。
         taskchute-timeline iter2181 / taskchute-ticker iter2179 と同 title=aria-label
         sync pattern。 */
      title={label}
      checked={checked}
      onChange={() => toggle(itemId)}
      onClick={(e) => e.stopPropagation()}
      data-testid={`bulk-select-${itemId}`}
      className="relative before:absolute before:-inset-4 before:content-['']"
    />
  )
}

/** 全選択 / 全解除 checkbox。現ページ全行を対象に。
 * iter1031: 同 BulkCheckbox の tap target 拡張 pattern を header にも適用。 */
export function BulkHeaderCheckbox({ rowIds }: { rowIds: string[] }) {
  const selected = useBulkSelectionStore((s) => s.selected)
  const setMany = useBulkSelectionStore((s) => s.setMany)
  const clear = useBulkSelectionStore((s) => s.clear)
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id))
  return (
    <input
      type="checkbox"
      // iter1220: BulkCheckbox 同 sweep — visible 概念名 "全選択" / "全解除" を冒頭固定で
      // voice control prefix-matching「click 全選択 / 全解除」 match 可能化。
      aria-label={
        allSelected
          ? `全解除 — 現ページ ${rowIds.length} 行をすべて選択中、クリックで全解除`
          : `全選択 — 現ページ ${rowIds.length} 行をすべて一括操作の対象にする`
      }
      /* iter2185: BulkHeaderCheckbox の aria-label (state-dependent 2-path、行数 含む) は
         browser tooltip にならず sighted は hover で 行数 + state context disclose 不可。
         BulkCheckbox iter2183 と pair の bulk family title 同期。 */
      title={
        allSelected
          ? `全解除 — 現ページ ${rowIds.length} 行をすべて選択中、クリックで全解除`
          : `全選択 — 現ページ ${rowIds.length} 行をすべて一括操作の対象にする`
      }
      checked={allSelected}
      onChange={(e) => {
        if (e.target.checked) setMany(rowIds)
        else clear()
      }}
      data-testid="bulk-select-all"
      className="relative before:absolute before:-inset-4 before:content-['']"
    />
  )
}
