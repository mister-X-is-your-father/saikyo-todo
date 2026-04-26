'use client'

import { parseAsString, useQueryState } from 'nuqs'

import { priorityClass, priorityLabel } from '@/features/item/priority'
import type { Item } from '@/features/item/schema'

import { EmptyState } from '@/components/shared/async-states'
import { ItemCheckbox } from '@/components/workspace/item-checkbox'
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
        description="日付が未設定のタスクがここに溜まります。定期的に仕分けを。"
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
          className="hover:bg-muted/50 flex items-center gap-2 rounded px-2 py-1.5"
          data-testid={`inbox-row-${it.id}`}
        >
          <ItemCheckbox item={it} workspaceId={workspaceId} />
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${priorityClass(it.priority)}`}
            title={`p${it.priority ?? 4}`}
            role="img"
            aria-label={priorityLabel(it.priority)}
          />
          <button
            type="button"
            onClick={() => void setOpenItemId(it.id)}
            className="hover:text-primary truncate text-left font-medium hover:underline"
            data-testid={`inbox-title-${it.id}`}
          >
            {it.title}
          </button>
          {it.isMust && (
            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
              MUST
            </span>
          )}
          <div className="ml-auto shrink-0">
            <StatusBadge status={it.status} />
          </div>
        </div>
      ))}
    </div>
  )
}
