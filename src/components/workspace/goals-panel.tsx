'use client'

/**
 * OKR (Goals) 一覧 + 新規作成 + KR 追加 + 進捗表示。
 *   - Goal カード: title / 期間 / status / 全体 progress バー (KR の weighted average)
 *   - 各 Goal expand すると KR list + 個別 progress + 新規 KR フォーム
 *   - KR は items mode (linked items の done 比) と manual mode (current/target) を支援
 */
import { useState } from 'react'

import { ChevronDown, ChevronRight, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useDecomposeGoal } from '@/features/agent/hooks'
import {
  useCreateGoal,
  useCreateKeyResult,
  useDeleteKeyResult,
  useGoalProgress,
  useGoals,
  useKeyResults,
} from '@/features/okr/hooks'
import type { Goal, GoalStatus, ProgressMode } from '@/features/okr/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { IMEInput } from '@/components/shared/ime-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TeamContextEditor } from '@/components/workspace/team-context-editor'

interface Props {
  workspaceId: string
}

const STATUS_LABEL: Record<GoalStatus, string> = {
  active: '稼働中',
  completed: '完了',
  archived: 'アーカイブ',
}
const STATUS_COLOR: Record<GoalStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  archived: 'outline',
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function GoalsPanel({ workspaceId }: Props) {
  const list = useGoals(workspaceId)
  const createMut = useCreateGoal(workspaceId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(isoDaysFromNow(90))

  async function handleCreate() {
    const t = title.trim()
    if (!t) return
    if (startDate && endDate && endDate < startDate) {
      toast.error('終了日は開始日以降にしてください')
      return
    }
    try {
      await createMut.mutateAsync({
        workspaceId,
        title: t,
        description: description.trim() || null,
        period: 'quarterly',
        startDate,
        endDate,
        idempotencyKey: crypto.randomUUID(),
      })
      setTitle('')
      setDescription('')
      toast.success('Goal を作成しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗')
    }
  }

  return (
    <div className="space-y-6">
      <TeamContextEditor workspaceId={workspaceId} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新規 Goal (Objective)</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-3">
                <Label htmlFor="goal-title">Objective (なに / なぜ)</Label>
                <IMEInput
                  id="goal-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 2026 Q2 — システム速度を体感半分に"
                  required
                  aria-required="true"
                  minLength={1}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-start">開始</Label>
                <Input
                  id="goal-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-end">終了</Label>
                <Input
                  id="goal-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  aria-required="true"
                  min={startDate || undefined}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="goal-desc">説明 (任意)</Label>
              <Textarea
                id="goal-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!title.trim() || createMut.isPending}
                data-testid="goal-create-btn"
              >
                {createMut.isPending ? '作成中…' : '作成'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState message={(list.error as Error).message ?? '読み込みに失敗'} />
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState title="Goal がありません" description="上のフォームから作成できます" />
      ) : (
        <ul className="space-y-3" data-testid="goals-list">
          {list.data.map((g) => (
            <GoalCard key={g.id} goal={g} workspaceId={workspaceId} />
          ))}
        </ul>
      )}
    </div>
  )
}

function GoalCard({ goal, workspaceId }: { goal: Goal; workspaceId: string }) {
  const [open, setOpen] = useState(false)
  const status = goal.status as GoalStatus
  const progress = useGoalProgress(open ? goal.id : null)
  const goalPct = progress.data ? Math.round(progress.data.pct * 100) : null
  const decompose = useDecomposeGoal(workspaceId)

  async function handleDecompose() {
    if (
      !window.confirm(`Goal「${goal.title}」を AI が 5〜10 件の Item に分解します。よろしいですか?`)
    )
      return
    try {
      const r = await decompose.mutateAsync({ workspaceId, goalId: goal.id })
      toast.success(
        `分解完了: ${r.iterations} iter, $${r.costUsd.toFixed(4)}, ${r.toolCalls.length} tool call`,
      )
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'AI 分解に失敗')
    }
  }

  return (
    <li data-testid={`goal-card-${goal.id}`}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="hover:bg-muted mt-0.5 rounded p-1"
              aria-expanded={open}
              aria-label={`Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`}
              data-testid={`goal-toggle-${goal.id}`}
            >
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{goal.title}</CardTitle>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {goal.period} · {goal.startDate} 〜 {goal.endDate}
              </p>
              {goalPct !== null && (
                <div className="mt-1.5 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">全体進捗</span>
                    <span className="font-mono">{goalPct}%</span>
                  </div>
                  <div
                    className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
                    role="progressbar"
                    aria-label={`Goal「${goal.title}」全体進捗`}
                    aria-valuenow={goalPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={`${goalPct}%`}
                    data-testid={`goal-progress-${goal.id}`}
                  >
                    <div className="bg-primary h-full" style={{ width: `${goalPct}%` }} />
                  </div>
                </div>
              )}
            </div>
            <Badge variant={STATUS_COLOR[status]} data-testid={`goal-status-${goal.id}`}>
              {STATUS_LABEL[status]}
            </Badge>
          </div>
          {goal.description && (
            <p className="text-muted-foreground mt-2 line-clamp-3 pl-7 text-xs">
              {goal.description}
            </p>
          )}
        </CardHeader>
        {open && (
          <CardContent className="space-y-3 pt-0">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleDecompose()}
                disabled={decompose.isPending || status !== 'active'}
                data-testid={`goal-decompose-${goal.id}`}
                title={
                  status !== 'active'
                    ? 'active な Goal のみ分解可能'
                    : 'AI が Goal + KR + チームコンテキストから 5〜10 件の Item を作成'
                }
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                {decompose.isPending ? 'AI 分解中…' : 'AI 分解'}
              </Button>
            </div>
            <KeyResultList goalId={goal.id} workspaceId={workspaceId} />
          </CardContent>
        )}
      </Card>
    </li>
  )
}

function KeyResultList({ goalId, workspaceId }: { goalId: string; workspaceId: string }) {
  const list = useKeyResults(goalId)
  const progress = useGoalProgress(goalId)
  const create = useCreateKeyResult(goalId, workspaceId)
  const remove = useDeleteKeyResult(goalId, workspaceId)

  async function handleDelete(krId: string, title: string) {
    if (
      !window.confirm(
        `KR「${title}」を削除しますか?\n(soft delete: deleted_at に記録、復元は DB 直接)`,
      )
    )
      return
    try {
      await remove.mutateAsync(krId)
      toast.success('KR を削除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'KR 削除に失敗')
    }
  }

  const [krTitle, setKrTitle] = useState('')
  const [mode, setMode] = useState<ProgressMode>('items')
  const [target, setTarget] = useState<string>('')
  const [unit, setUnit] = useState<string>('')

  async function handleAdd() {
    const t = krTitle.trim()
    if (!t) return
    try {
      await create.mutateAsync({
        goalId,
        title: t,
        progressMode: mode,
        targetValue: mode === 'manual' && target ? Number(target) : null,
        currentValue: mode === 'manual' ? 0 : null,
        unit: unit.trim() || null,
        weight: 1,
        position: list.data?.length ?? 0,
        idempotencyKey: crypto.randomUUID(),
      })
      setKrTitle('')
      setTarget('')
      setUnit('')
      toast.success('KR 追加')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'KR 追加に失敗')
    }
  }

  if (list.isLoading) return <Loading />
  if (list.error) return <ErrorState message={(list.error as Error).message ?? '読み込み失敗'} />

  const krProgressMap = new Map((progress.data?.keyResults ?? []).map((p) => [p.krId, p]))

  return (
    <div className="space-y-3">
      {(list.data ?? []).length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-xs">
          KR がありません。下のフォームから追加。
        </p>
      ) : (
        <ul className="space-y-2" data-testid={`krs-${goalId}`}>
          {(list.data ?? []).map((kr) => {
            const p = krProgressMap.get(kr.id)
            const pct = p ? Math.round(p.pct * 100) : 0
            return (
              <li key={kr.id} className="space-y-1 rounded border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{kr.title}</div>
                    <div className="text-muted-foreground mt-0.5 text-[10px]">
                      mode: {kr.progressMode} · weight: {kr.weight}
                      {kr.progressMode === 'manual' && p && (
                        <>
                          {' '}
                          · {p.current ?? 0} / {p.target ?? 0} {p.unit ?? ''}
                        </>
                      )}
                      {kr.progressMode === 'items' && p && (
                        <>
                          {' '}
                          · items {p.itemsDone}/{p.itemsTotal}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs">{pct}%</span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(kr.id, kr.title)}
                      disabled={remove.isPending}
                      aria-label={`KR「${kr.title}」を削除`}
                      title="KR を削除 (soft delete)"
                      data-testid={`kr-delete-${kr.id}`}
                      className="text-muted-foreground hover:text-destructive text-xs disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div
                  className="bg-muted h-1 w-full overflow-hidden rounded-full"
                  role="progressbar"
                  aria-label={`KR「${kr.title}」進捗`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={
                    kr.progressMode === 'manual' && p
                      ? `${p.current ?? 0} / ${p.target ?? 0} ${p.unit ?? ''} (${pct}%)`
                      : p
                        ? `items ${p.itemsDone}/${p.itemsTotal} (${pct}%)`
                        : `${pct}%`
                  }
                  data-testid={`kr-progress-${kr.id}`}
                >
                  <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form
        className="space-y-2 rounded border border-dashed p-2"
        onSubmit={(e) => {
          e.preventDefault()
          void handleAdd()
        }}
      >
        <div className="flex items-center gap-2">
          <IMEInput
            value={krTitle}
            onChange={(e) => setKrTitle(e.target.value)}
            placeholder="KR タイトル (例: p95 < 200ms)"
            className="flex-1"
            data-testid={`kr-title-input-${goalId}`}
            aria-label="KR タイトル"
            required
            aria-required="true"
            minLength={1}
            maxLength={300}
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ProgressMode)}
            className="rounded border px-2 py-1 text-xs"
            aria-label="KR 進捗算出モード"
          >
            <option value="items">items</option>
            <option value="manual">manual</option>
          </select>
        </div>
        {mode === 'manual' && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="target"
              className="w-32 text-sm"
              aria-label="目標値"
            />
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="unit (件 / %)"
              className="w-24 text-sm"
              aria-label="単位"
              maxLength={20}
            />
          </div>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!krTitle.trim() || create.isPending}
            data-testid={`kr-add-btn-${goalId}`}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            KR 追加
          </Button>
        </div>
      </form>
    </div>
  )
}
