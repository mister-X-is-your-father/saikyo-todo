'use client'

import { parseAsString, useQueryState } from 'nuqs'

import type { Item } from '@/features/item/schema'

import { EmptyState } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ItemCheckbox } from '@/components/workspace/item-checkbox'
import { StatusBadge } from '@/components/workspace/status-badge'

const PRIO_DOT: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-blue-500',
  4: 'bg-slate-400',
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Group {
  label: string
  items: Item[]
}

function buildGroups(items: Item[], today: string): Group[] {
  const overdue: Item[] = []
  const todayList: Item[] = []
  for (const it of items) {
    if (it.doneAt) continue
    const due = it.dueDate
    const sched = it.scheduledFor
    if (due && due < today) {
      overdue.push(it)
      continue
    }
    if (sched === today || due === today) {
      todayList.push(it)
    }
  }
  const priSort = (a: Item, b: Item) => (a.priority ?? 4) - (b.priority ?? 4)
  return [
    { label: '期限超過', items: overdue.sort(priSort) },
    { label: '今日', items: todayList.sort(priSort) },
  ]
}

export function TodayView({
  workspaceId,
  items,
}: {
  workspaceId: string
  items: Item[]
  currentUserId?: string
}) {
  const today = todayISO()
  const groups = buildGroups(items, today)
  const total = groups.reduce((sum, g) => sum + g.items.length, 0)
  // Phase 6.15 iter 63: title click で ItemEditDialog 開く (Gantt iter31 と同パターン)
  const [, setOpenItemId] = useQueryState('item', parseAsString)

  if (total === 0) {
    return (
      <EmptyState
        title="今日のタスクはありません 🎉"
        description="scheduled_for / dueDate を設定すると Today に出てきます"
      />
    )
  }

  return (
    <div className="space-y-4" data-testid="today-view">
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <Card key={g.label}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-base ${g.label === '期限超過' ? 'text-red-600' : ''}`}>
                  {g.label} ({g.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.items.map((it) => (
                  <div
                    key={it.id}
                    className="hover:bg-muted/50 flex items-start gap-2 rounded p-1.5"
                    data-testid={`today-row-${it.id}`}
                  >
                    <ItemCheckbox item={it} workspaceId={workspaceId} />
                    <span
                      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                        PRIO_DOT[it.priority ?? 4]
                      }`}
                      title={`p${it.priority ?? 4}`}
                    />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void setOpenItemId(it.id)}
                        className="hover:text-primary truncate text-left font-medium hover:underline"
                        data-testid={`today-title-${it.id}`}
                      >
                        {it.title}
                      </button>
                      {it.isMust && (
                        <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                          MUST
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                      {it.dueTime && <span className="tabular-nums">{it.dueTime.slice(0, 5)}</span>}
                      {it.dueDate && it.dueDate !== today && (
                        <span className="text-red-600">期限 {it.dueDate}</span>
                      )}
                      <StatusBadge status={it.status} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ),
      )}
    </div>
  )
}
