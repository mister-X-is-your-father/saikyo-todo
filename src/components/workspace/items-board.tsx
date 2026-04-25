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

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { CommandPalette, type PaletteCommand } from '@/components/shared/command-palette'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BacklogView } from '@/components/workspace/backlog-view'
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
  const [paletteSelected, setPaletteSelected] = useState<Item | null>(null)

  const { data, isLoading, error, refetch } = useItems(workspaceId)
  useItemsRealtime(workspaceId)

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((i) => {
      if (i.deletedAt) return false
      if (must && !i.isMust) return false
      if (statusFilter && i.status !== statusFilter) return false
      return true
    })
  }, [data, must, statusFilter])

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
      <ItemEditDialog
        workspaceId={workspaceId}
        item={paletteSelected}
        open={paletteSelected !== null}
        onOpenChange={(o) => {
          if (!o) setPaletteSelected(null)
        }}
        currentUserId={currentUserId}
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
    </div>
  )
}
