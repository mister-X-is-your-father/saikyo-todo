'use client'

/**
 * Workspace item ボード。
 * - CommandPalette (Cmd+K)
 * - 新規 Item inline フォーム
 * - View 切替: Kanban (既定) / Backlog — URL param `?view=` で同期 (nuqs)
 * - フィルタ: `?must=1` / `?status=...` を client 側で適用
 */
import { useMemo, useState } from 'react'

import { parseAsBoolean, parseAsString, parseAsStringEnum, useQueryState } from 'nuqs'

import { isAppError } from '@/lib/errors'

import { applyBoardFilters } from '@/features/item/board-filter'
import { useItems } from '@/features/item/hooks'
import { useItemsRealtime } from '@/features/item/realtime'
import type { Item } from '@/features/item/schema'
import { useSprints } from '@/features/sprint/hooks'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { CommandPalette, type PaletteCommand } from '@/components/shared/command-palette'
import { KeybindingsHelpModal } from '@/components/shared/keybindings-help-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BacklogView } from '@/components/workspace/backlog-view'
import { BulkActionBar } from '@/components/workspace/bulk-action-bar'
import { DashboardView } from '@/components/workspace/dashboard-view'
import { GanttView } from '@/components/workspace/gantt-view'
import { InboxView } from '@/components/workspace/inbox-view'
import { ItemEditDialog } from '@/components/workspace/item-edit-dialog'
import { KanbanView } from '@/components/workspace/kanban-view'
import { PersonalPeriodView } from '@/components/workspace/personal-period-view'
import { QuickAdd } from '@/components/workspace/quick-add'
import { TodayView } from '@/components/workspace/today-view'

interface Props {
  workspaceId: string
  currentUserId: string
}

// Phase 6.15 iter108: 個人 daily/weekly/monthly view (ゴール付) を追加。
const VIEWS = [
  'today',
  'inbox',
  'kanban',
  'backlog',
  'gantt',
  'dashboard',
  'daily',
  'weekly',
  'monthly',
] as const
type ViewKey = (typeof VIEWS)[number]

export function ItemsBoard({ workspaceId, currentUserId }: Props) {
  const [view, setView] = useQueryState(
    'view',
    parseAsStringEnum<ViewKey>([...VIEWS]).withDefault('today'),
  )
  const [must, setMust] = useQueryState('must', parseAsBoolean.withDefault(false))
  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString)
  const [sprintFilter, setSprintFilter] = useQueryState('sprint', parseAsString)
  /** Notification click や Command Palette 検索からの deep link 用 URL param */
  const [openItemId, setOpenItemId] = useQueryState('item', parseAsString)
  const [paletteSelected, setPaletteSelected] = useState<Item | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const { data, isLoading, error, refetch } = useItems(workspaceId)
  useItemsRealtime(workspaceId)
  const sprintsList = useSprints(workspaceId)

  // iter295 refactor: filter ロジックを `@/features/item/board-filter` に抽出 (test 11 件)
  const filtered = useMemo(() => {
    if (!data) return []
    const activeSprintId = sprintsList.data?.find((s) => s.status === 'active')?.id ?? null
    return applyBoardFilters({
      items: data,
      must,
      statusFilter,
      sprintFilter,
      activeSprintId,
    })
  }, [data, must, statusFilter, sprintFilter, sprintsList.data])

  const commands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: 'reload',
        label: '再読み込み',
        group: 'ビュー',
        run: async () => {
          await refetch()
        },
        keywords: ['reload', 'refresh'],
      },
      {
        id: 'view-today',
        label: 'Today に切替',
        group: 'ビュー',
        run: async () => {
          await setView('today')
        },
        keywords: ['today', '今日'],
      },
      {
        id: 'view-inbox',
        label: 'Inbox に切替',
        group: 'ビュー',
        run: async () => {
          await setView('inbox')
        },
        keywords: ['inbox', '未整理'],
      },
      {
        id: 'view-kanban',
        label: 'Kanban に切替',
        group: 'ビュー',
        run: async () => {
          await setView('kanban')
        },
        keywords: ['kanban'],
      },
      {
        id: 'view-backlog',
        label: 'Backlog に切替',
        group: 'ビュー',
        run: async () => {
          await setView('backlog')
        },
        keywords: ['backlog', 'list'],
      },
      {
        id: 'view-gantt',
        label: 'Gantt に切替',
        group: 'ビュー',
        run: async () => {
          await setView('gantt')
        },
        keywords: ['gantt', 'timeline'],
      },
      {
        id: 'view-dashboard',
        label: 'Dashboard に切替',
        group: 'ビュー',
        run: async () => {
          await setView('dashboard')
        },
        keywords: ['dashboard', 'must', 'burndown'],
      },
      {
        id: 'focus-new',
        label: 'クイック追加にフォーカス (q)',
        group: 'Item',
        run: () => document.getElementById('quick-add-input')?.focus(),
        keywords: ['create', 'new', '作成', 'q'],
      },
      {
        id: 'help-keybindings',
        label: 'ヘルプ: ショートカット一覧 (?)',
        group: 'ヘルプ',
        run: () => setHelpOpen(true),
        keywords: ['help', 'shortcut', 'ショートカット', 'キー', 'keybinding', '?'],
      },
    ],
    [refetch, setView],
  )

  return (
    <div className="min-w-0 space-y-6">
      <CommandPalette
        commands={commands}
        items={data ?? []}
        onSelectItem={(item) => setPaletteSelected(item)}
      />
      <KeybindingsHelpModal open={helpOpen} onOpenChange={setHelpOpen} />
      <DeepLinkedItemDialog
        items={data ?? []}
        paletteSelected={paletteSelected}
        openItemId={openItemId}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        onClose={() => {
          setPaletteSelected(null)
          if (openItemId) void setOpenItemId(null)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base" role="heading" aria-level={2}>
            新規 Item (クイック追加)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuickAdd workspaceId={workspaceId} />
        </CardContent>
      </Card>

      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="view-switcher"
        role="group"
        aria-label="表示切替"
      >
        <Button
          variant={view === 'today' ? 'default' : 'outline'}
          size="sm"
          className="min-h-11"
          onClick={() => setView('today')}
          data-testid="view-today-btn"
          aria-pressed={view === 'today'}
        >
          Today
        </Button>
        <Button
          variant={view === 'inbox' ? 'default' : 'outline'}
          size="sm"
          className="min-h-11"
          onClick={() => setView('inbox')}
          data-testid="view-inbox-btn"
          aria-pressed={view === 'inbox'}
        >
          Inbox
        </Button>
        <Button
          variant={view === 'kanban' ? 'default' : 'outline'}
          size="sm"
          className="min-h-11"
          onClick={() => setView('kanban')}
          data-testid="view-kanban-btn"
          aria-pressed={view === 'kanban'}
        >
          Kanban
        </Button>
        <Button
          variant={view === 'backlog' ? 'default' : 'outline'}
          size="sm"
          className="min-h-11"
          onClick={() => setView('backlog')}
          data-testid="view-backlog-btn"
          aria-pressed={view === 'backlog'}
        >
          Backlog
        </Button>
        <Button
          variant={view === 'gantt' ? 'default' : 'outline'}
          size="sm"
          className="min-h-11"
          onClick={() => setView('gantt')}
          data-testid="view-gantt-btn"
          aria-pressed={view === 'gantt'}
        >
          Gantt
        </Button>
        <Button
          variant={view === 'dashboard' ? 'default' : 'outline'}
          size="sm"
          className="min-h-11"
          onClick={() => setView('dashboard')}
          data-testid="view-dashboard-btn"
          aria-pressed={view === 'dashboard'}
        >
          Dashboard
        </Button>
        <Button
          variant={view === 'daily' ? 'default' : 'outline'}
          size="sm"
          className="min-h-11"
          onClick={() => setView('daily')}
          data-testid="view-daily-btn"
          aria-pressed={view === 'daily'}
        >
          日次
        </Button>
        <Button
          variant={view === 'weekly' ? 'default' : 'outline'}
          size="sm"
          className="min-h-11"
          onClick={() => setView('weekly')}
          data-testid="view-weekly-btn"
          aria-pressed={view === 'weekly'}
        >
          週次
        </Button>
        <Button
          variant={view === 'monthly' ? 'default' : 'outline'}
          size="sm"
          className="min-h-11"
          onClick={() => setView('monthly')}
          data-testid="view-monthly-btn"
          aria-pressed={view === 'monthly'}
        >
          月次
        </Button>
        <div className="ml-4 flex items-center gap-2 text-sm">
          <label htmlFor="filter-must" className="flex items-center gap-1">
            <input
              id="filter-must"
              type="checkbox"
              checked={must}
              onChange={(e) => setMust(e.target.checked || null)}
              data-testid="filter-must"
              aria-label={must ? 'MUST のみ表示中 (クリックで解除)' : 'MUST のみ表示に絞り込む'}
            />
            MUST のみ
          </label>
          <select
            value={statusFilter ?? ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="rounded border px-2 py-1 text-sm"
            data-testid="filter-status"
            aria-label={
              statusFilter
                ? `ステータスで絞り込み中 (現在: ${statusFilter})。「全ステータス」で解除`
                : 'ステータスで絞り込み (todo / in_progress / done)'
            }
          >
            <option value="">全ステータス</option>
            <option value="todo">TODO</option>
            <option value="in_progress">進行中</option>
            <option value="done">完了</option>
          </select>
          <select
            value={sprintFilter ?? ''}
            onChange={(e) => setSprintFilter(e.target.value || null)}
            className="rounded border px-2 py-1 text-sm"
            data-testid="filter-sprint"
            aria-label={
              sprintFilter
                ? `Sprint で絞り込み中 (現在: ${sprintFilter})。「全 Sprint」で解除`
                : 'Sprint で絞り込み (active / 未割当 / 個別 sprint)'
            }
          >
            <option value="">全 Sprint</option>
            <option value="active">稼働中の Sprint</option>
            <option value="none">未割当のみ</option>
            {(sprintsList.data ?? []).map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
          {(() => {
            // iter296 basics: フィルタ active 時は 「フィルタ後 / 全体」 の比率を出して
            // 「何件除外されたか」を一目で把握できるようにする (Linear / Notion 風)
            const totalActive = (data ?? []).filter((i) => !i.deletedAt).length
            const filterActive = must || Boolean(statusFilter) || Boolean(sprintFilter)
            const label = filterActive
              ? `現在のフィルタ条件で ${filtered.length} 件 (全 ${totalActive} 件中)`
              : `Item 全 ${filtered.length} 件`
            return (
              <span
                className="text-muted-foreground text-xs"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                aria-label={label}
                data-testid="filter-count"
              >
                {filterActive ? `${filtered.length} / ${totalActive} 件` : `${filtered.length} 件`}
              </span>
            )
          })()}
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState
          message={isAppError(error) ? error.message : '一覧取得に失敗しました'}
          onRetry={() => void refetch()}
        />
      ) : view === 'dashboard' ? (
        <DashboardView workspaceId={workspaceId} />
      ) : view === 'today' ? (
        <TodayView workspaceId={workspaceId} items={filtered} currentUserId={currentUserId} />
      ) : view === 'inbox' ? (
        <InboxView workspaceId={workspaceId} items={filtered} currentUserId={currentUserId} />
      ) : view === 'daily' ? (
        <PersonalPeriodView workspaceId={workspaceId} items={filtered} period="day" />
      ) : view === 'weekly' ? (
        <PersonalPeriodView workspaceId={workspaceId} items={filtered} period="week" />
      ) : view === 'monthly' ? (
        <PersonalPeriodView workspaceId={workspaceId} items={filtered} period="month" />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="まだ Item がありません"
          // iter288 basics: 旧説明 (`上のフォームから作成してください`) は
          // 単なる行動指示で、Item とは何かの最初の印象が薄かった → workspace
          // で最初に出会う EmptyState なので、QuickAdd の自然言語例 + 後で
          // できる切替 (Kanban / Backlog / Gantt) を示してオンボーディング化。
          // Today (iter273) / Inbox (iter276) / Workflows (iter281) /
          // Sprints (iter283) / Goals (iter286) と同パターンで 6 view 目。
          description={
            <span>
              チームで共有する 1 件の作業単位 (Item) です。 QuickAdd で{' '}
              <code className="bg-muted rounded px-1 text-[11px]">明日 9時 資料準備 #design</code> /{' '}
              <code className="bg-muted rounded px-1 text-[11px]">+3d レビュー @taro</code>{' '}
              のように日付・タグ・担当者を 1 行で書けます。 作成後は{' '}
              <code className="bg-muted rounded px-1 text-[11px]">Kanban</code> /{' '}
              <code className="bg-muted rounded px-1 text-[11px]">Backlog</code> /{' '}
              <code className="bg-muted rounded px-1 text-[11px]">Gantt</code> /{' '}
              <code className="bg-muted rounded px-1 text-[11px]">Today</code> で view
              を切り替えられます。
            </span>
          }
          action={
            <button
              type="button"
              className="text-primary hover:bg-muted mt-2 rounded border px-3 py-1.5 text-xs hover:underline"
              data-testid="board-empty-quick-add"
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
      ) : view === 'backlog' ? (
        <BacklogView workspaceId={workspaceId} items={filtered} currentUserId={currentUserId} />
      ) : view === 'gantt' ? (
        <GanttView workspaceId={workspaceId} items={filtered} />
      ) : (
        <KanbanView workspaceId={workspaceId} items={filtered} currentUserId={currentUserId} />
      )}

      <BulkActionBar workspaceId={workspaceId} />
    </div>
  )
}

/**
 * Deep link / Command Palette 経由で開く ItemEditDialog ラッパ。
 *   - palette が item を選んだら paletteSelected が入る (props 経由)
 *   - URL に ?item=<id> が付いていたら items から探して開く (notification click 経由)
 *   - 両方 set のときは palette を優先 (より直近のユーザー操作)
 */
function DeepLinkedItemDialog({
  items,
  paletteSelected,
  openItemId,
  workspaceId,
  currentUserId,
  onClose,
}: {
  items: Item[]
  paletteSelected: Item | null
  openItemId: string | null
  workspaceId: string
  currentUserId: string
  onClose: () => void
}) {
  const linkedItem = useMemo(
    () => (openItemId ? (items.find((i) => i.id === openItemId) ?? null) : null),
    [items, openItemId],
  )
  const target = paletteSelected ?? linkedItem
  return (
    <ItemEditDialog
      workspaceId={workspaceId}
      item={target}
      open={target !== null}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      currentUserId={currentUserId}
    />
  )
}
