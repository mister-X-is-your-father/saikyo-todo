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

import { useItems } from '@/features/item/hooks'
import { useItemsRealtime } from '@/features/item/realtime'
import type { Item } from '@/features/item/schema'
import { useSprints } from '@/features/sprint/hooks'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { CommandPalette, type PaletteCommand } from '@/components/shared/command-palette'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BacklogView } from '@/components/workspace/backlog-view'
import { BulkActionBar } from '@/components/workspace/bulk-action-bar'
import { DashboardView } from '@/components/workspace/dashboard-view'
import { GanttView } from '@/components/workspace/gantt-view'
import { InboxView } from '@/components/workspace/inbox-view'
import { ItemEditDialog } from '@/components/workspace/item-edit-dialog'
import { KanbanView } from '@/components/workspace/kanban-view'
import { QuickAdd } from '@/components/workspace/quick-add'
import { TodayView } from '@/components/workspace/today-view'

interface Props {
  workspaceId: string
  currentUserId: string
}

const VIEWS = ['today', 'inbox', 'kanban', 'backlog', 'gantt', 'dashboard'] as const
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

  const { data, isLoading, error, refetch } = useItems(workspaceId)
  useItemsRealtime(workspaceId)
  const sprintsList = useSprints(workspaceId)

  const filtered = useMemo(() => {
    if (!data) return []
    const activeSprintId = sprintsList.data?.find((s) => s.status === 'active')?.id ?? null
    return data.filter((i) => {
      if (i.deletedAt) return false
      if (must && !i.isMust) return false
      if (statusFilter && i.status !== statusFilter) return false
      if (sprintFilter === 'active') {
        if (!activeSprintId || i.sprintId !== activeSprintId) return false
      } else if (sprintFilter === 'none') {
        if (i.sprintId) return false
      } else if (sprintFilter && sprintFilter !== '') {
        if (i.sprintId !== sprintFilter) return false
      }
      return true
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
    ],
    [refetch, setView],
  )

  return (
    <div className="space-y-6">
      <CommandPalette
        commands={commands}
        items={data ?? []}
        onSelectItem={(item) => setPaletteSelected(item)}
      />
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
          <CardTitle className="text-base">新規 Item (クイック追加)</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickAdd workspaceId={workspaceId} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2" data-testid="view-switcher">
        <Button
          variant={view === 'today' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('today')}
          data-testid="view-today-btn"
        >
          Today
        </Button>
        <Button
          variant={view === 'inbox' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('inbox')}
          data-testid="view-inbox-btn"
        >
          Inbox
        </Button>
        <Button
          variant={view === 'kanban' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('kanban')}
          data-testid="view-kanban-btn"
        >
          Kanban
        </Button>
        <Button
          variant={view === 'backlog' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('backlog')}
          data-testid="view-backlog-btn"
        >
          Backlog
        </Button>
        <Button
          variant={view === 'gantt' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('gantt')}
          data-testid="view-gantt-btn"
        >
          Gantt
        </Button>
        <Button
          variant={view === 'dashboard' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('dashboard')}
          data-testid="view-dashboard-btn"
        >
          Dashboard
        </Button>
        <div className="ml-4 flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={must}
              onChange={(e) => setMust(e.target.checked || null)}
              data-testid="filter-must"
            />
            MUST のみ
          </label>
          <select
            value={statusFilter ?? ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="rounded border px-2 py-1 text-sm"
            data-testid="filter-status"
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
            aria-label="Sprint filter"
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
          <span className="text-muted-foreground text-xs">{filtered.length} 件</span>
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
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState title="まだ Item がありません" description="上のフォームから作成してください" />
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
