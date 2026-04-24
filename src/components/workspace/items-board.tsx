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
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useCreateItem, useItems } from '@/features/item/hooks'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { CommandPalette, type PaletteCommand } from '@/components/shared/command-palette'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BacklogView } from '@/components/workspace/backlog-view'
import { DashboardView } from '@/components/workspace/dashboard-view'
import { GanttView } from '@/components/workspace/gantt-view'
import { KanbanView } from '@/components/workspace/kanban-view'

interface Props {
  workspaceId: string
}

const VIEWS = ['kanban', 'backlog', 'gantt', 'dashboard'] as const
type ViewKey = (typeof VIEWS)[number]

export function ItemsBoard({ workspaceId }: Props) {
  const [view, setView] = useQueryState(
    'view',
    parseAsStringEnum<ViewKey>([...VIEWS]).withDefault('kanban'),
  )
  const [must, setMust] = useQueryState('must', parseAsBoolean.withDefault(false))
  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString)

  const { data, isLoading, error, refetch } = useItems(workspaceId)
  const create = useCreateItem(workspaceId)

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((i) => {
      if (i.deletedAt) return false
      if (must && !i.isMust) return false
      if (statusFilter && i.status !== statusFilter) return false
      return true
    })
  }, [data, must, statusFilter])

  const [title, setTitle] = useState('')

  async function handleCreate() {
    const t = title.trim()
    if (!t) return
    try {
      await create.mutateAsync({
        workspaceId,
        title: t,
        description: '',
        status: 'todo',
        isMust: false,
        idempotencyKey: crypto.randomUUID(),
      })
      setTitle('')
      toast.success('Item を作成しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗しました')
    }
  }

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
        id: 'view-kanban',
        label: 'ビューを Kanban に切替',
        group: 'ビュー',
        run: async () => {
          await setView('kanban')
        },
        keywords: ['kanban'],
      },
      {
        id: 'view-backlog',
        label: 'ビューを Backlog に切替',
        group: 'ビュー',
        run: async () => {
          await setView('backlog')
        },
        keywords: ['backlog', 'list'],
      },
      {
        id: 'view-gantt',
        label: 'ビューを Gantt に切替',
        group: 'ビュー',
        run: async () => {
          await setView('gantt')
        },
        keywords: ['gantt', 'timeline'],
      },
      {
        id: 'view-dashboard',
        label: 'ビューを Dashboard に切替',
        group: 'ビュー',
        run: async () => {
          await setView('dashboard')
        },
        keywords: ['dashboard', 'must', 'burndown'],
      },
      {
        id: 'focus-new',
        label: '新規 Item 入力にフォーカス',
        group: 'Item',
        run: () => document.getElementById('new-item-input')?.focus(),
        keywords: ['create', 'new', '作成'],
      },
    ],
    [refetch, setView],
  )

  return (
    <div className="space-y-6">
      <CommandPalette commands={commands} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新規 Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <IMEInput
              id="new-item-input"
              placeholder="タイトル (Enter で作成)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={create.isPending || !title.trim()}>
              作成
            </Button>
          </form>
          <p className="text-muted-foreground mt-2 text-xs">
            Cmd+K でコマンドパレット、Enter で作成 (IME 変換中は無視)。
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2" data-testid="view-switcher">
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
            <option value="todo">todo</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
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
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState title="まだ Item がありません" description="上のフォームから作成してください" />
      ) : view === 'backlog' ? (
        <BacklogView workspaceId={workspaceId} items={filtered} />
      ) : view === 'gantt' ? (
        <GanttView workspaceId={workspaceId} items={filtered} />
      ) : (
        <KanbanView workspaceId={workspaceId} items={filtered} />
      )}
    </div>
  )
}
