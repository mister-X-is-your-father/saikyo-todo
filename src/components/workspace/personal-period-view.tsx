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
import { type Period, periodLabelJa } from '@/features/personal-period-goal/schema'

import { EmptyState } from '@/components/shared/async-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ItemCheckbox } from '@/components/workspace/item-checkbox'
import { MustBadge } from '@/components/workspace/must-badge'
import { StatusBadge } from '@/components/workspace/status-badge'

interface Props {
  workspaceId: string
  items: Item[]
  period: Period
}

// iter523 basics: PERIOD_LABEL は `periodLabelJa` (personal-period-goal/schema.ts) に集約。

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
      toast.success(`${periodLabelJa(period)}ゴールを保存しました`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '保存に失敗')
    }
  }

  const dirty = (goalQ.data?.text ?? '') !== draft

  return (
    <div className="space-y-4" data-testid={`personal-period-view-${period}`}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base" role="heading" aria-level={2}>
            {periodLabelJa(period)}ゴール ({periodKey})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            // iter314: Cmd/Ctrl+Enter で保存 (iter313 team-context / iter228 comment-thread と
            // 同 pattern)。dirty + !pending のときだけ反応、IME 確定中は無視。
            onKeyDown={(e) => {
              if (
                (e.metaKey || e.ctrlKey) &&
                e.key === 'Enter' &&
                !e.nativeEvent.isComposing &&
                dirty &&
                !upsertGoal.isPending
              ) {
                e.preventDefault()
                void handleSave()
              }
            }}
            placeholder={`この${periodLabelJa(period)}で達成したいことを書く (例: ◯◯ を完了する) (Cmd/Ctrl+Enter で保存)`}
            rows={3}
            maxLength={2000}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            aria-label={
              draft.length === 0
                ? `${periodLabelJa(period)}ゴール (任意、最大 2000 文字、この${periodLabelJa(period)}で達成したいこと、Cmd/Ctrl+Enter で保存)`
                : draft.length > 1900
                  ? `${periodLabelJa(period)}ゴール (現在 ${draft.length} / 2000 文字、上限近接、Cmd/Ctrl+Enter で保存)`
                  : `${periodLabelJa(period)}ゴール (現在 ${draft.length} / 2000 文字、Cmd/Ctrl+Enter で保存)`
            }
            data-testid={`period-goal-textarea-${period}`}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={!dirty || upsertGoal.isPending}
              aria-busy={upsertGoal.isPending || undefined}
              onClick={() => void handleSave()}
              data-testid={`period-goal-save-${period}`}
              aria-keyshortcuts="Meta+Enter Control+Enter"
              aria-label={
                !dirty
                  ? `${periodLabelJa(period)}ゴールに変更がないため保存不要`
                  : upsertGoal.isPending
                    ? `保存中… (${periodLabelJa(period)}ゴールを保存中)`
                    : `ゴール保存 (${periodLabelJa(period)}のゴール文を保存)`
              }
            >
              <span aria-hidden="true">{upsertGoal.isPending ? '保存中…' : 'ゴール保存'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card role="region" aria-label={`${periodLabelJa(period)}の Item ${filtered.length} 件`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base" role="heading" aria-level={2}>
            {periodLabelJa(period)}の Item ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              title={`${periodLabelJa(period)}範囲の item がありません`}
              description="dueDate / scheduledFor が範囲外、または完了済の item は表示されません。"
            />
          ) : (
            <ul
              className="space-y-1"
              data-testid={`period-items-${period}`}
              aria-label={`${periodLabelJa(period)} 期間の Item 一覧 ${filtered.length} 件`}
            >
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
                    className="hover:text-primary focus-visible:ring-ring truncate rounded text-left text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    data-testid={`period-title-${period}-${it.id}`}
                    aria-label={`「${it.title}」を編集`}
                  >
                    {it.title}
                  </button>
                  {it.isMust && <MustBadge data-testid={`period-must-${period}-${it.id}`} />}
                  <div className="ml-auto shrink-0">
                    <StatusBadge status={it.status} />
                  </div>
                  {it.dueDate && (
                    // iter437: 旧 raw ISO `<span>2026-04-30</span>` は SR が
                    // dueDate semantic として認識しないため `<time dateTime>` 要素
                    // に格上げ + aria-label で「期限 ${ISO}」を SR に届ける
                    // (iter435 / iter436 と同 pattern、3 → 4 view で統一)。
                    <time
                      className="text-muted-foreground shrink-0 text-xs tabular-nums"
                      dateTime={it.dueDate}
                      aria-label={`期限 ${it.dueDate}`}
                    >
                      {it.dueDate}
                    </time>
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
