'use client'

import { useMemo } from 'react'

import { parseAsString, useQueryState } from 'nuqs'

import { summarizeInbox } from '@/features/gtd/inbox-process'
import { extractEstimateMinutes } from '@/features/item/estimate'
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

  // iter544 (queue methodology GT-3 wire-up): GTD Inbox Process classification の
  // bucket count summary を上部に表示。1 click で「2 分 rule で即やる候補」 が即視認。
  const gtdSummary = useMemo(
    () =>
      summarizeInbox(
        inbox.map((it) => ({
          id: it.id,
          title: it.title,
          dod: it.dod,
          estimateMin: extractEstimateMinutes(it.description) ?? null,
          // assignees / stakeholders / hasSubtasks は別 hook 必要なのでまず default 値で運用、
          // 精緻化は AC-1 wire-up (iter542) と同様 useItemAssignees 利用で次 iter
        })),
      ),
    [inbox],
  )

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
      {/* iter544 (queue GT-3 wire-up): GTD Inbox Process classification の bucket count chip 群 */}
      {(gtdSummary.counts.immediate > 0 ||
        gtdSummary.counts.project > 0 ||
        gtdSummary.counts['next-action'] > 0) && (
        <div
          className="mb-1 flex flex-wrap items-center gap-1.5 px-2 text-[11px]"
          data-testid="inbox-gtd-summary"
          // iter443: 旧 role="status" は live region のため inbox 変更時に SR が
          // 再 announce → noise。静的 classification chip 群には role="group" が
          // 適切 (iter423 SeverityChip と同 pattern)。aria-label は集約 source の
          // まま。
          role="group"
          aria-label={`GTD 分類: 2 分以内 ${gtdSummary.counts.immediate} 件、Project ${gtdSummary.counts.project} 件、次の action ${gtdSummary.counts['next-action']} 件`}
        >
          {gtdSummary.counts.immediate > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
              <span aria-hidden="true">⚡</span>
              <span>2 分 rule {gtdSummary.counts.immediate}</span>
            </span>
          )}
          {gtdSummary.counts.project > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-sky-700">
              <span aria-hidden="true">🗂</span>
              <span>Project {gtdSummary.counts.project}</span>
            </span>
          )}
          {gtdSummary.counts['next-action'] > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-slate-700">
              <span>Next action {gtdSummary.counts['next-action']}</span>
            </span>
          )}
        </div>
      )}
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
