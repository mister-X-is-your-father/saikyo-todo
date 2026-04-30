'use client'

/**
 * iter519 (queue TC-1): TaskChute mode の 1 列 linear timeline view (skeleton)。
 * 詳細: docs/methodology-modes-plan.md §1 (T-1 1 列 linear timeline) + §5 TC-1
 *
 * scope A: 今日の item を 1 列で時刻昇順に並べるだけ。次 iter で打刻 / 累積残 ticker /
 * 見積 vs 実績 inline / routine 露出 を載せる。
 *
 * 設計判断:
 *   - 既存 today-view (グルーピング表示) は **置き換えない** — view plugin として
 *     並列登録し、URL `?mode=taskchute` 時にユーザが選択できるようにする
 *   - sort は pure helper `sortForTimeline` で外出し (9 unit test)、UI は描画のみ
 *   - 完了済 / archive 済 / scheduledFor 未指定 (= 今日対象でない) は呼出元で
 *     filter してくる前提 (本 component は「並べて表示するだけ」)
 */
import { useMemo } from 'react'

import { Clock4, Sparkles } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'

import { todayISO } from '@/lib/date/iso'

import { priorityClass, priorityLabel } from '@/features/item/priority'
import type { Item } from '@/features/item/schema'
import { sortForTimeline } from '@/features/taskchute/sort-for-timeline'

import { EmptyState } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ItemCheckbox } from '@/components/workspace/item-checkbox'
import { MustBadge } from '@/components/workspace/must-badge'
import { StartTimerButton } from '@/components/workspace/start-timer-button'
import { StatusBadge } from '@/components/workspace/status-badge'

interface Props {
  workspaceId: string
  items: Item[]
}

export function TaskChuteView({ workspaceId, items }: Props) {
  const today = todayISO()
  // 今日対象 (scheduledFor=today もしくは dueDate=today)、active な item のみに絞る
  const targetItems = useMemo(
    () =>
      items.filter((it) => {
        if (it.archivedAt) return false
        if (it.doneAt) return false // 完了済は別 section にしてもよいが scope A では非表示
        const scheduled = it.scheduledFor === today
        const due = it.dueDate === today
        return scheduled || due
      }),
    [items, today],
  )

  const ordered = useMemo(() => sortForTimeline(targetItems), [targetItems])
  const [, setOpenItemId] = useQueryState('item', parseAsString)

  if (ordered.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base" role="heading" aria-level={2}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            TaskChute (今日の 1 列 timeline)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="今日やる task が空です"
            description="ルーティンを投入するか、quick-add で task を作って今日の段取りを組み立てましょう"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="taskchute-view">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-base" role="heading" aria-level={2}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          TaskChute (今日の 1 列 timeline)
          <span className="text-muted-foreground ml-auto text-[11px] font-normal">
            {ordered.length} 件
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol
          className="divide-border divide-y"
          aria-label="今日の task を時刻昇順で並べた 1 列 timeline"
        >
          {ordered.map(({ item, timeLabel }) => (
            <li
              key={item.id}
              className="hover:bg-accent/40 group flex items-center gap-2 py-2 transition"
              data-testid={`taskchute-row-${item.id}`}
            >
              <span
                className="text-muted-foreground inline-flex w-12 shrink-0 items-center gap-0.5 font-mono text-[11px] tabular-nums"
                aria-label={timeLabel ? `予定時刻 ${timeLabel}` : '時刻未指定'}
              >
                {timeLabel ? (
                  <>
                    <Clock4 className="h-3 w-3" aria-hidden="true" />
                    {timeLabel}
                  </>
                ) : (
                  <span className="text-muted-foreground/50">--:--</span>
                )}
              </span>
              <ItemCheckbox workspaceId={workspaceId} item={item} />
              <button
                type="button"
                onClick={() => void setOpenItemId(item.id)}
                className="hover:text-primary flex-1 truncate text-left text-sm transition"
                aria-label={`${item.title} を編集`}
              >
                {item.title}
              </button>
              {item.isMust ? <MustBadge /> : null}
              <span
                className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${priorityClass(item.priority)}`}
                role="img"
                aria-label={priorityLabel(item.priority)}
              >
                {priorityLabel(item.priority)}
              </span>
              <StatusBadge status={item.status} />
              <StartTimerButton item={item} size="sm" />
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground mt-3 text-[11px]">
          時刻指定 → priority → 作成順 で sort。次 iter で 打刻 + 累積残時間 + 見積 vs 実績 inline
          表示が載ります。
        </p>
      </CardContent>
    </Card>
  )
}
