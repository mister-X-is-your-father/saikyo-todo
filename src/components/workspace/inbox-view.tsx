'use client'

import { useMemo } from 'react'

import { parseAsString, useQueryState } from 'nuqs'

import { buildFourStateHintChip } from '@/lib/widget/severity-bridges'

import {
  classifyInboxHealthHint,
  formatInboxHealthHintJa,
  summarizeInbox,
} from '@/features/gtd/inbox-process'
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
            <code className="bg-muted text-foreground rounded px-1 text-[11px]">
              あとで読む論文
            </code>{' '}
            のように 書くとここに溜まります。仕分けは Item を開いて{' '}
            <code className="bg-muted text-foreground rounded px-1 text-[11px]">明日</code> や{' '}
            <code className="bg-muted text-foreground rounded px-1 text-[11px]">+3d</code>{' '}
            を後付けで。
          </span>
        }
        action={
          <button
            type="button"
            className="text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none"
            data-testid="inbox-empty-quick-add"
            aria-keyshortcuts="q"
            aria-label="クイック追加にフォーカス (キー: q) — quick-add input にフォーカスして即タスク入力"
            onClick={() => {
              const el = document.getElementById('quick-add-input') as HTMLInputElement | null
              el?.focus()
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          >
            <span aria-hidden="true">クイック追加にフォーカス (キー: q)</span>
          </button>
        }
      />
    )
  }

  // iter494 (queue GT-3 polish) + iter505 simplification: buildFourStateHintChip で 1 行化
  const healthChip = buildFourStateHintChip(
    gtdSummary,
    classifyInboxHealthHint,
    formatInboxHealthHintJa,
  )

  return (
    <div
      className="space-y-1 rounded-lg border p-2"
      data-testid="inbox-view"
      role="region"
      aria-label={`Inbox view (${inbox.length} 件、scheduledFor も期限も未設定、健全性: ${healthChip.label})`}
    >
      <div className="mb-1 flex items-center gap-2 px-2 text-xs">
        {/* iter923: parent region aria-label "Inbox view (${N} 件、scheduledFor も
            期限も未設定、健全性: ${label})" が完全 content を持つため、内側
            visible count + scheduledFor 説明 span は二重読み上げ → aria-hidden 化、
            region aria-label 単独 SR 経路に集約 (iter918-922 続編)。 */}
        <span className="text-muted-foreground" aria-hidden="true">
          {inbox.length} 件 — scheduledFor も期限も未設定
        </span>
        {/* iter1058: role 無 span + aria-label を `role="img"` で
            authoritative 化 (iter1023/1049-1057 同 pattern、role=img sweep
            11 弾目)。 */}
        <span
          className={`ml-auto rounded-full border px-1.5 py-0.5 text-[11px] ${healthChip.chipClass}`}
          data-testid="inbox-health-hint"
          data-severity={healthChip.severity}
          role="img"
          aria-label={`Inbox 健全性: ${healthChip.label}`}
        >
          <span aria-hidden="true">{healthChip.label}</span>
        </span>
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
            <span
              /* iter1517: GTD 3 chip (immediate/project/next-action) は light 固定で
                 dark mode で明色 chip 浮き contrast 不適。iter1376/1493/1512-1516 chip dark
                 variant pattern を本 3 chip にも展開。 */
              className="inline-flex items-center gap-0.5 rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              aria-hidden="true"
            >
              <span>⚡</span>
              <span>2 分 rule {gtdSummary.counts.immediate}</span>
            </span>
          )}
          {gtdSummary.counts.project > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300"
              aria-hidden="true"
            >
              <span>🗂</span>
              <span>Project {gtdSummary.counts.project}</span>
            </span>
          )}
          {gtdSummary.counts['next-action'] > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300"
              aria-hidden="true"
            >
              {/* iter932: 兄弟 chip (immediate ⚡ / project 🗂) と視覚一貫性を揃え、
                  next-action にも ➡ emoji を付与 (parent aria-hidden で SR 影響なし)。 */}
              <span>➡️</span>
              <span>Next action {gtdSummary.counts['next-action']}</span>
            </span>
          )}
        </div>
      )}
      {inbox.map((it) => (
        // iter1404: ItemCheckbox は interactive なので role="button" 行の子に置くと
        // nested-interactive (WCAG 4.1.2) になる (iter429 は title <button>→<span> 降格
        // のみで checkbox を取り残し)。checkbox を click 領域の外 (sibling) に出し、編集
        // ダイアログ open の role="button" は内側 flex-1 div に限定。行 hover/全幅 click 感は
        // wrapper flex + 内側 flex-1 で保持、checkbox は独立 toggle。
        <div
          key={it.id}
          className="hover:bg-muted/50 flex items-center gap-2 rounded px-2 py-1.5"
          data-testid={`inbox-row-${it.id}`}
        >
          <ItemCheckbox item={it} workspaceId={workspaceId} />
          <div
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
            className="focus-visible:ring-ring flex flex-1 cursor-pointer items-center gap-2 rounded focus-visible:ring-2 focus-visible:outline-none"
          >
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${priorityClass(it.priority)}`}
              title={`p${it.priority ?? 4}`}
              role="img"
              aria-label={priorityLabel(it.priority)}
            />
            <span
              className="truncate text-left font-medium"
              data-testid={`inbox-title-${it.id}`}
              aria-hidden="true"
            >
              {it.title}
            </span>
            {it.isMust && <MustBadge data-testid={`inbox-must-${it.id}`} />}
            <div className="ml-auto shrink-0">
              <StatusBadge status={it.status} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
