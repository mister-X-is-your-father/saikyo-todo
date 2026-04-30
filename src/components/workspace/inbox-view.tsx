'use client'

import { parseAsString, useQueryState } from 'nuqs'

import { priorityClass, priorityLabel } from '@/features/item/priority'
import type { Item } from '@/features/item/schema'

import { EmptyState } from '@/components/shared/async-states'
import { ItemCheckbox } from '@/components/workspace/item-checkbox'
import { MustBadge } from '@/components/workspace/must-badge'
import { StatusBadge } from '@/components/workspace/status-badge'

/**
 * Inbox = scheduledFor も dueDate も無く、done でない Item (未整理 backlog)。
 * ここからユーザが「今日やる / 今週やる」に仕分ける導線。
 */
export function InboxView({
  workspaceId,
  items,
}: {
  workspaceId: string
  items: Item[]
  currentUserId?: string
}) {
  // Phase 6.15 iter 64: title click で ItemEditDialog 開く (Today iter63 と同パターン)
  const [, setOpenItemId] = useQueryState('item', parseAsString)

  const inbox = items
    .filter((i) => !i.doneAt && !i.scheduledFor && !i.dueDate)
    .sort((a, b) => (a.priority ?? 4) - (b.priority ?? 4))

  if (inbox.length === 0) {
    return (
      <EmptyState
        title="Inbox は空です"
        // iter276 basics: 旧説明 (`日付が未設定のタスクがここに溜まります`) は
        // schema 寄りで「だからどうしたい?」が伝わりにくかった → 「日付なしで
        // QuickAdd するとここに来る」「Inbox から `明日` `+3d` 等を後付けすると
        // 仕分けされる」の 2 段で示す。Today (iter273) の同パターン踏襲。
        description={
          <span>
            QuickAdd で日付を入れずに{' '}
            <code className="bg-muted rounded px-1 text-[11px]">あとで読む論文</code> のように
            書くとここに溜まります。仕分けは Item を開いて{' '}
            <code className="bg-muted rounded px-1 text-[11px]">明日</code> や{' '}
            <code className="bg-muted rounded px-1 text-[11px]">+3d</code> を後付けで。
          </span>
        }
        action={
          <button
            type="button"
            className="text-primary hover:bg-muted mt-2 rounded border px-3 py-1.5 text-xs hover:underline"
            data-testid="inbox-empty-quick-add"
            aria-label="クイック追加入力欄にフォーカス (q キーでも可)"
            onClick={() => {
              const el = document.getElementById('quick-add-input') as HTMLInputElement | null
              el?.focus()
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          >
            クイック追加にフォーカス (キー: q)
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-1 rounded-lg border p-2" data-testid="inbox-view">
      <div className="text-muted-foreground mb-1 px-2 text-xs">
        {inbox.length} 件 — scheduledFor も期限も未設定
      </div>
      {inbox.map((it) => (
        <div
          key={it.id}
          role="button"
          tabIndex={0}
          onClick={() => void setOpenItemId(it.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              void setOpenItemId(it.id)
            }
          }}
          aria-label={`${it.title} を編集ダイアログで開く`}
          className="hover:bg-muted/50 focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 focus-visible:ring-2 focus-visible:outline-none"
          data-testid={`inbox-row-${it.id}`}
        >
          <ItemCheckbox item={it} workspaceId={workspaceId} />
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${priorityClass(it.priority)}`}
            title={`p${it.priority ?? 4}`}
            role="img"
            aria-label={priorityLabel(it.priority)}
          />
          {/* iter429: 旧 inner <button> は outer div の role="button" と
              button-in-button 違反 (WAI-ARIA: 非 interactive 化された要素を
              除き focusable child を持てない) のため <span> に降格。
              outer div が単一 interactive element + 全行 click + keyboard
              (Enter/Space) accessible。 */}
          <span className="truncate text-left font-medium" data-testid={`inbox-title-${it.id}`}>
            {it.title}
          </span>
          {it.isMust && <MustBadge data-testid={`inbox-must-${it.id}`} />}
          <div className="ml-auto shrink-0">
            <StatusBadge status={it.status} />
          </div>
        </div>
      ))}
    </div>
  )
}
