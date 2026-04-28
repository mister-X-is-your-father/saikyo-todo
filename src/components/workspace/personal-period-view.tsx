'use client'

/**
 * Phase 6.15 iter108: 個人の Daily / Weekly / Monthly view (ユーザ要望)。
 * 「個人の週次、日次タスク、月次タスクを表示するモード。それぞれでのゴールを設定して表示」
 *
 * - 上部に period のゴール (textarea + 保存) — 楽観ロック付き
 * - 下部に「この期間の item」一覧
 *     daily:   dueDate / scheduledFor が今日
 *     weekly:  dueDate / scheduledFor が今週 (月曜開始 ISO 週)
 *     monthly: dueDate / scheduledFor が今月
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import { parseAsString, useQueryState } from 'nuqs'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { priorityClass, priorityLabel } from '@/features/item/priority'
import type { Item } from '@/features/item/schema'
import {
  usePersonalPeriodGoal,
  useUpsertPersonalPeriodGoal,
} from '@/features/personal-period-goal/hooks'
import type { Period } from '@/features/personal-period-goal/schema'

import { EmptyState } from '@/components/shared/async-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ItemCheckbox } from '@/components/workspace/item-checkbox'
import { StatusBadge } from '@/components/workspace/status-badge'

interface Props {
  workspaceId: string
  items: Item[]
  period: Period
}

const PERIOD_LABEL: Record<Period, string> = {
  day: '日次',
  week: '週次',
  month: '月次',
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** ISO week number (月曜始まり)。"2026-W18" 形式を返す。 */
function isoWeekKey(d: Date): string {
  // ISO 週 — 木曜が属する年・週で決まる
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = t.getUTCDay() || 7 // Mon=1..Sun=7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((+t - +yearStart) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${pad(week)}`
}

function periodKeyFor(period: Period, today: Date): string {
  if (period === 'day') {
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  }
  if (period === 'month') {
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}`
  }
  return isoWeekKey(today)
}

/** item.dueDate or scheduledFor が `period` の範囲に含まれるか */
function itemInPeriod(item: Item, period: Period, today: Date): boolean {
  const iso = item.dueDate ?? item.scheduledFor
  if (!iso) return false
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return false
  const dt = new Date(y, m - 1, d)
  if (period === 'day') {
    return (
      dt.getFullYear() === today.getFullYear() &&
      dt.getMonth() === today.getMonth() &&
      dt.getDate() === today.getDate()
    )
  }
  if (period === 'month') {
    return dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth()
  }
  // week — ISO 週で比較
  return isoWeekKey(dt) === isoWeekKey(today)
}

export function PersonalPeriodView({ workspaceId, items, period }: Props) {
  const today = useMemo(() => new Date(), [])
  const periodKey = useMemo(() => periodKeyFor(period, today), [period, today])

  const goalQ = usePersonalPeriodGoal(workspaceId, period, periodKey)
  const upsertGoal = useUpsertPersonalPeriodGoal()

  // ゴール textarea (server から到着したら同期)。controlled なまま server text と
  // 同期するため、最後に同期した version を ref で保持して同 version では setDraft しない。
  const [draft, setDraft] = useState('')
  const lastSyncedRef = useRef<string | null>(null)
  useEffect(() => {
    const key = goalQ.data ? `${goalQ.data.id}#${goalQ.data.version}` : 'null'
    if (lastSyncedRef.current === key) return
    lastSyncedRef.current = key
    setDraft(goalQ.data?.text ?? '')
  }, [goalQ.data])

  const filtered = useMemo(
    () =>
      items
        .filter((i) => !i.deletedAt && !i.doneAt)
        .filter((i) => itemInPeriod(i, period, today))
        .sort((a, b) => (a.priority ?? 4) - (b.priority ?? 4)),
    [items, period, today],
  )

  const [, setOpenItemId] = useQueryState('item', parseAsString)

  async function handleSave() {
    try {
      await upsertGoal.mutateAsync({
        workspaceId,
        period,
        periodKey,
        text: draft,
        expectedVersion: goalQ.data?.version ?? 0,
      })
      toast.success(`${PERIOD_LABEL[period]}ゴールを保存しました`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '保存に失敗')
    }
  }

  const dirty = (goalQ.data?.text ?? '') !== draft

  return (
    <div className="space-y-4" data-testid={`personal-period-view-${period}`}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {PERIOD_LABEL[period]}ゴール ({periodKey})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`この${PERIOD_LABEL[period]}で達成したいことを書く (例: ◯◯ を完了する)`}
            rows={3}
            maxLength={2000}
            aria-label={`${PERIOD_LABEL[period]}ゴール`}
            data-testid={`period-goal-textarea-${period}`}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!dirty || upsertGoal.isPending}
              onClick={() => void handleSave()}
              data-testid={`period-goal-save-${period}`}
            >
              {upsertGoal.isPending ? '保存中…' : 'ゴール保存'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {PERIOD_LABEL[period]}の Item ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              title={`${PERIOD_LABEL[period]}範囲の item がありません`}
              description="dueDate / scheduledFor が範囲外、または完了済の item は表示されません。"
            />
          ) : (
            <ul className="space-y-1" data-testid={`period-items-${period}`}>
              {filtered.map((it) => (
                <li
                  key={it.id}
                  onClick={() => void setOpenItemId(it.id)}
                  className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5"
                  data-testid={`period-row-${period}-${it.id}`}
                >
                  <ItemCheckbox item={it} workspaceId={workspaceId} />
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${priorityClass(it.priority)}`}
                    role="img"
                    aria-label={priorityLabel(it.priority)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void setOpenItemId(it.id)
                    }}
                    className="hover:text-primary truncate text-left text-sm font-medium hover:underline"
                    data-testid={`period-title-${period}-${it.id}`}
                  >
                    {it.title}
                  </button>
                  {it.isMust && (
                    <span
                      className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700"
                      role="img"
                      aria-label="MUST item"
                    >
                      MUST
                    </span>
                  )}
                  <div className="ml-auto shrink-0">
                    <StatusBadge status={it.status} />
                  </div>
                  {it.dueDate && (
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {it.dueDate}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
