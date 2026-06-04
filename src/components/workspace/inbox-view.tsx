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
import { FocusQuickAddButton } from '@/components/workspace/focus-quick-add-button'
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
        action={<FocusQuickAddButton testId="inbox-empty-quick-add" />}
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
      /* iter1592: paren convention `Inbox view (...)` を iter1093-1591 sweep の em-dash 区切に統一。
         内側 ':' colon (健全性: X) は em-dash convention で ' — ' に整える。 */
      aria-label={`Inbox view — ${inbox.length} 件、scheduledFor も期限も未設定、健全性 ${healthChip.label}`}
      /* iter1945: region 全体に title を付与し sighted hover で count + 説明 + 健全性
         integrated summary disclose (op-board iter1943 と同 region/widget summary pattern)。 */
      title={`Inbox view — ${inbox.length} 件、scheduledFor も期限も未設定、健全性 ${healthChip.label}`}
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
          /* iter1560: 旧 aria-label `"Inbox 健全性: ${healthChip.label}"` は visible "${label}" を
             末尾に持ち voice control prefix-matching「click 健全」 が strict prefix-match で不可
             (substring 一致のみ)。iter1553-1559 status/role/health Badge family と同 pattern、
             visible 冒頭固定 + em-dash 区切。
             iter1861: iter1847 notification hint chip と同 pattern を inbox-health-hint にも展開。 */
          aria-label={`${healthChip.label} — Inbox 健全性`}
          title={`${healthChip.label} — Inbox 健全性`}
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
          /* iter1600: 旧 aria-label `"GTD 分類: 2 分以内 X 件、Project Y 件、次の action Z 件"` の
             先頭 colon `:` は iter1093-1599 sweep の em-dash 区切と divergent。`GTD 分類:` colon を
             ` — ` em-dash に統一 (内部の 、 separator は維持)。 */
          aria-label={`GTD 分類 — 2 分以内 ${gtdSummary.counts.immediate} 件、Project ${gtdSummary.counts.project} 件、次の action ${gtdSummary.counts['next-action']} 件`}
          /* iter1947: group 全体に title を付与し sighted hover で GTD 3 分類 integrated
             summary disclose (inbox-region iter1945 と同 file 内 sweep)。 */
          title={`GTD 分類 — 2 分以内 ${gtdSummary.counts.immediate} 件、Project ${gtdSummary.counts.project} 件、次の action ${gtdSummary.counts['next-action']} 件`}
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
            /* iter1541: 旧 aria-label `${it.title} を編集ダイアログで開く` は visible-prefix
               ${it.title} を満たすが ' を' 助詞接続で iter1093-1540 sweep の em-dash 区切と
               divergent。`${it.title} — 編集ダイアログで開く` に統一。
               iter1736: inner truncate span は visual で long title 切れ、aria-label は browser
               tooltip にならず sighted は hover で全 title 見られなかった。title 付与で
               sighted hover → 全 title disclose (iter1720/1733/1734/1735 sweep を inbox にも)。 */
            aria-label={`${it.title} — 編集ダイアログで開く`}
            /* iter2155: inbox-view item button title は it.title のみで aria-label
               "${it.title} — 編集ダイアログで開く" の "編集ダイアログで開く" context が
               sighted hover で disclose されない。today-view iter2153 / personal-period
               iter2151 と同 title=aria-label sync pattern。 */
            title={`${it.title} — 編集ダイアログで開く`}
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
