'use client'

/**
 * OKR (Goals) 一覧 + 新規作成 + KR 追加 + 進捗表示。
 *   - Goal カード: title / 期間 / status / 全体 progress バー (KR の weighted average)
 *   - 各 Goal expand すると KR list + 個別 progress + 新規 KR フォーム
 *   - KR は items mode (linked items の done 比) と manual mode (current/target) を支援
 */
import { useRef, useState } from 'react'

import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Hourglass,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

import { isoDaysFromNow, todayISO } from '@/lib/date/iso'
import { isAppError } from '@/lib/errors'

import { useDecomposeGoal } from '@/features/agent/hooks'
import { isInvalidDateRange } from '@/features/item/date-range'
import { computeGoalHealth, type GoalHealthTier } from '@/features/okr/goal-health'
import {
  useCreateGoal,
  useCreateKeyResult,
  useDeleteKeyResult,
  useGoalProgress,
  useGoals,
  useKeyResults,
  useUpdateGoal,
} from '@/features/okr/hooks'
import {
  type Goal,
  type GoalStatus,
  goalStatusLabelJa,
  type ProgressMode,
} from '@/features/okr/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { IMEInput } from '@/components/shared/ime-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TeamContextEditor } from '@/components/workspace/team-context-editor'
import { WorkspaceModeSelector } from '@/components/workspace/workspace-mode-selector'

interface Props {
  workspaceId: string
}

// iter522 basics: STATUS_LABEL は `goalStatusLabelJa` (okr/schema.ts) に集約。
const STATUS_COLOR: Record<GoalStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  archived: 'outline',
}

// iter301 basics: Goal progress bar の tier 別 tone (色 + icon) を意味付け。
// iter299 並走 `e0a4d20` で goal-health.ts の AI substrate を整備済、本 iter で UI bind。
const TIER_BAR_CLASS: Record<GoalHealthTier, string> = {
  achieved: 'bg-emerald-500',
  'on-track': 'bg-blue-500',
  'at-risk': 'bg-amber-500',
  behind: 'bg-red-500',
  idle: 'bg-primary',
}

const TIER_ICON_CLASS: Record<GoalHealthTier, string> = {
  achieved: 'text-emerald-600',
  'on-track': 'text-blue-600',
  'at-risk': 'text-amber-600',
  behind: 'text-red-600',
  idle: 'text-muted-foreground',
}

export function GoalsPanel({ workspaceId }: Props) {
  const list = useGoals(workspaceId)
  const createMut = useCreateGoal(workspaceId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(isoDaysFromNow(90))
  // iter502: 期間 validation 失敗 path で end-date input に focus shift
  // (iter501 SprintCard 期間編集 と同 pattern、manual handleSubmit form の onInvalid 4 弾目)
  const goalEndRef = useRef<HTMLInputElement>(null)

  async function handleCreate() {
    const t = title.trim()
    if (!t) return
    if (isInvalidDateRange(startDate, endDate)) {
      toast.error('終了日は開始日以降にしてください')
      goalEndRef.current?.focus()
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
      <WorkspaceModeSelector workspaceId={workspaceId} />
      <TeamContextEditor workspaceId={workspaceId} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base" role="heading" aria-level={2}>
            新規 Goal (Objective)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            noValidate
            aria-label="Goal 作成フォーム"
            aria-busy={createMut.isPending || undefined}
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
                  aria-invalid={(title.length > 0 && title.trim() === '') || undefined}
                  minLength={1}
                  maxLength={200}
                  autoComplete="off"
                  aria-label={
                    title.length === 0
                      ? 'Goal Objective (必須、最大 200 文字、なに / なぜを 1 行で)'
                      : title.trim() === ''
                        ? `Goal Objective (現在 ${title.length} / 200 文字、空白のみは不正)`
                        : title.length > 180
                          ? `Goal Objective (現在 ${title.length} / 200 文字、上限近接)`
                          : `Goal Objective (現在 ${title.length} / 200 文字)`
                  }
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
                  aria-invalid={isInvalidDateRange(startDate, endDate) || undefined}
                  max={endDate || undefined}
                  aria-label={
                    startDate === ''
                      ? 'Goal 開始日 (必須、終了日以前)'
                      : isInvalidDateRange(startDate, endDate)
                        ? `Goal 開始日 (現在: ${startDate}、終了日 ${endDate} より後で不正)`
                        : `Goal 開始日 (現在: ${startDate})`
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-end">終了</Label>
                <Input
                  ref={goalEndRef}
                  id="goal-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={isInvalidDateRange(startDate, endDate) || undefined}
                  min={startDate || undefined}
                  aria-label={
                    endDate === ''
                      ? 'Goal 終了日 (必須、開始日以降)'
                      : isInvalidDateRange(startDate, endDate)
                        ? `Goal 終了日 (現在: ${endDate}、開始日 ${startDate} より前で不正)`
                        : `Goal 終了日 (現在: ${endDate})`
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="goal-desc">説明 (任意、Cmd/Ctrl+Enter で作成)</Label>
              <Textarea
                id="goal-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                // iter315: Cmd/Ctrl+Enter で作成 (iter313/314 と同 pattern)。Textarea は
                // form 内でも default Enter が改行のため modifier 必須。タイトル空 / pending 中は noop。
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    title.trim() &&
                    !createMut.isPending
                  ) {
                    e.preventDefault()
                    void handleCreate()
                  }
                }}
                maxLength={2000}
                aria-keyshortcuts="Meta+Enter Control+Enter"
                aria-label={
                  description.length === 0
                    ? 'Goal の説明 (任意、最大 2000 文字、Objective の補足や背景、Cmd/Ctrl+Enter で作成)'
                    : description.length > 1900
                      ? `Goal の説明 (現在 ${description.length} / 2000 文字、上限近接、Cmd/Ctrl+Enter で作成)`
                      : `Goal の説明 (現在 ${description.length} / 2000 文字、Cmd/Ctrl+Enter で作成)`
                }
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                className="min-h-11"
                disabled={!title.trim() || createMut.isPending}
                aria-busy={createMut.isPending || undefined}
                data-testid="goal-create-btn"
                aria-keyshortcuts="Meta+Enter Control+Enter"
                aria-label={
                  !title.trim()
                    ? 'Goal を作成するにはタイトルを入力してください'
                    : createMut.isPending
                      ? 'Goal を作成中…'
                      : 'Goal を新規作成'
                }
              >
                <span aria-hidden="true">{createMut.isPending ? '作成中…' : '作成'}</span>
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
        <EmptyState
          title="Goal がありません"
          // iter286 basics: 旧 "上のフォームから作成できます" は単なる行動指示で
          // OKR (Objective + Key Results) が何かが見えなかった → 用途例 +
          // 期間目安 (典型は四半期) を示す。Today (iter273) / Inbox (iter276) /
          // Workflows (iter281) / Sprints (iter283) と同パターンで 5 view 目。
          description={
            <span>
              中期 (典型は <code className="bg-muted rounded px-1 text-[11px]">3 ヶ月</code>)
              の到達目標 (Objective) と、それを測る数値 (Key Result) を 1〜5 件紐付ける 箱です。 例:{' '}
              <code className="bg-muted rounded px-1 text-[11px]">
                2026 Q2 システム速度を体感半分に
              </code>{' '}
              / Key Result は{' '}
              <code className="bg-muted rounded px-1 text-[11px]">P95 レイテンシ 200ms 以下</code>。
              KR は items 連動 (linked items の done 比) でも手動 (current/target) でも測れます。
            </span>
          }
          action={
            <button
              type="button"
              className="text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none"
              data-testid="goals-empty-create"
              aria-label="Goal 作成フォームの『Objective』入力欄にフォーカス"
              onClick={() => {
                const el = document.getElementById('goal-title') as HTMLInputElement | null
                el?.focus()
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
            >
              <span aria-hidden="true">作成フォームへ</span>
            </button>
          }
        />
      ) : (
        <ul
          className="space-y-3"
          data-testid="goals-list"
          aria-label={`Goal 一覧 ${list.data.length} 件`}
        >
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
  // iter301 basics: progress 取得済の時のみ health 計算 (open 時のみ取得される)
  const health = progress.data
    ? computeGoalHealth({
        pct: progress.data.pct,
        startDate: goal.startDate,
        endDate: goal.endDate,
      })
    : null
  const tier = health?.tier ?? 'idle'
  const ToneIcon =
    tier === 'achieved'
      ? CheckCircle
      : tier === 'on-track'
        ? TrendingUp
        : tier === 'at-risk'
          ? Hourglass
          : tier === 'behind'
            ? AlertTriangle
            : null
  const decompose = useDecomposeGoal(workspaceId)
  const update = useUpdateGoal(workspaceId)

  async function changeStatus(next: GoalStatus) {
    if (
      next === 'archived' &&
      !window.confirm(`Goal「${goal.title}」をアーカイブしますか?\n(後から「active 化」で復帰可能)`)
    )
      return
    try {
      await update.mutateAsync({
        id: goal.id,
        expectedVersion: goal.version,
        patch: { status: next },
      })
      toast.success(`Goal を「${goalStatusLabelJa(next)}」に変更しました`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'status 変更に失敗')
    }
  }

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
              className="hover:bg-muted focus-visible:ring-ring mt-0.5 rounded p-1 focus-visible:ring-2 focus-visible:outline-none"
              aria-expanded={open}
              aria-controls={`goal-body-${goal.id}`}
              aria-label={`Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`}
              data-testid={`goal-toggle-${goal.id}`}
            >
              {open ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base" role="heading" aria-level={3}>
                {goal.title}
              </CardTitle>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {goal.period} · <time dateTime={goal.startDate}>{goal.startDate}</time>
                {' 〜 '}
                <time dateTime={goal.endDate}>{goal.endDate}</time>
              </p>
              {goalPct !== null && (
                <div className="mt-1.5 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      {ToneIcon && (
                        <ToneIcon
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 ${TIER_ICON_CLASS[tier]}`}
                        />
                      )}
                      <span>全体進捗</span>
                      {health && <span className="sr-only">({health.label})</span>}
                    </span>
                    <span
                      className={`font-mono ${
                        tier === 'behind'
                          ? 'text-destructive'
                          : tier === 'achieved'
                            ? 'text-emerald-700'
                            : ''
                      }`}
                      aria-hidden="true"
                    >
                      {goalPct}%
                    </span>
                  </div>
                  <div
                    className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
                    role="progressbar"
                    aria-label={`Goal「${goal.title}」全体進捗 ${goalPct}%${health ? ` (${health.label})` : ''}`}
                    aria-valuenow={goalPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={`${goalPct}%${health ? ` — ${health.label}` : ''}`}
                    data-testid={`goal-progress-${goal.id}`}
                    data-tier={tier}
                  >
                    <div
                      className={`${TIER_BAR_CLASS[tier]} h-full`}
                      style={{ width: `${goalPct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )}
            </div>
            <Badge
              variant={STATUS_COLOR[status]}
              data-testid={`goal-status-${goal.id}`}
              aria-label={`Goal「${goal.title}」のステータス: ${goalStatusLabelJa(status)}`}
            >
              <span aria-hidden="true">{goalStatusLabelJa(status)}</span>
            </Badge>
          </div>
          {goal.description && (
            <p className="text-muted-foreground mt-2 line-clamp-3 pl-7 text-xs">
              {goal.description}
            </p>
          )}
        </CardHeader>
        {open && (
          <CardContent id={`goal-body-${goal.id}`} className="space-y-3 pt-0">
            <div
              className="flex flex-wrap items-center justify-end gap-1.5"
              role="group"
              aria-label={`Goal「${goal.title}」のステータス操作 (現在: ${goalStatusLabelJa(status)}、完了 / アーカイブ / 再開)`}
            >
              {status === 'active' && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11"
                    variant="outline"
                    onClick={() => void changeStatus('completed')}
                    disabled={update.isPending}
                    aria-busy={update.isPending || undefined}
                    data-testid={`goal-complete-${goal.id}`}
                    aria-label={
                      update.isPending
                        ? `Goal「${goal.title}」のステータスを更新中…`
                        : `Goal「${goal.title}」を完了`
                    }
                  >
                    <span aria-hidden="true">完了</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11"
                    variant="ghost"
                    onClick={() => void changeStatus('archived')}
                    disabled={update.isPending}
                    aria-busy={update.isPending || undefined}
                    data-testid={`goal-archive-${goal.id}`}
                    aria-label={
                      update.isPending
                        ? `Goal「${goal.title}」のステータスを更新中…`
                        : `Goal「${goal.title}」をアーカイブ`
                    }
                  >
                    <span aria-hidden="true">アーカイブ</span>
                  </Button>
                </>
              )}
              {status === 'completed' && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11"
                    variant="outline"
                    onClick={() => void changeStatus('active')}
                    disabled={update.isPending}
                    aria-busy={update.isPending || undefined}
                    data-testid={`goal-reactivate-${goal.id}`}
                    aria-label={
                      update.isPending
                        ? `Goal「${goal.title}」のステータスを更新中…`
                        : `Goal「${goal.title}」を active に戻す`
                    }
                  >
                    <span aria-hidden="true">active に戻す</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11"
                    variant="ghost"
                    onClick={() => void changeStatus('archived')}
                    disabled={update.isPending}
                    aria-busy={update.isPending || undefined}
                    data-testid={`goal-archive-${goal.id}`}
                    aria-label={
                      update.isPending
                        ? `Goal「${goal.title}」のステータスを更新中…`
                        : `Goal「${goal.title}」をアーカイブ`
                    }
                  >
                    <span aria-hidden="true">アーカイブ</span>
                  </Button>
                </>
              )}
              {status === 'archived' && (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  variant="outline"
                  onClick={() => void changeStatus('active')}
                  disabled={update.isPending}
                  aria-busy={update.isPending || undefined}
                  data-testid={`goal-reactivate-${goal.id}`}
                  aria-label={
                    update.isPending
                      ? `Goal「${goal.title}」のステータスを更新中…`
                      : `Goal「${goal.title}」を active に戻す`
                  }
                >
                  <span aria-hidden="true">active に戻す</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                variant="outline"
                onClick={() => void handleDecompose()}
                disabled={decompose.isPending || status !== 'active'}
                aria-busy={decompose.isPending || undefined}
                data-testid={`goal-decompose-${goal.id}`}
                title={
                  status !== 'active'
                    ? 'active な Goal のみ分解可能'
                    : 'AI が Goal + KR + チームコンテキストから 5〜10 件の Item を作成'
                }
                aria-label={
                  status !== 'active'
                    ? `Goal「${goal.title}」は active でないため AI 分解不可`
                    : decompose.isPending
                      ? `Goal「${goal.title}」を AI 分解中…`
                      : `Goal「${goal.title}」を AI 分解 (5〜10 件の Item を作成)`
                }
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                <span aria-hidden="true">{decompose.isPending ? 'AI 分解中…' : 'AI 分解'}</span>
              </Button>
            </div>
            <KeyResultList goalId={goal.id} goalTitle={goal.title} workspaceId={workspaceId} />
          </CardContent>
        )}
      </Card>
    </li>
  )
}

function KeyResultList({
  goalId,
  goalTitle,
  workspaceId,
}: {
  goalId: string
  goalTitle: string
  workspaceId: string
}) {
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
        <ul
          className="space-y-2"
          data-testid={`krs-${goalId}`}
          aria-label={`Key Result 一覧 ${(list.data ?? []).length} 件`}
        >
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
                    <span className="font-mono text-xs" aria-hidden="true">
                      {pct}%
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(kr.id, kr.title)}
                      disabled={remove.isPending}
                      aria-busy={remove.isPending || undefined}
                      aria-label={
                        remove.isPending
                          ? `KR「${kr.title}」を削除中…`
                          : `KR「${kr.title}」を削除 (soft delete)`
                      }
                      title="KR を削除 (soft delete)"
                      data-testid={`kr-delete-${kr.id}`}
                      // iter506: pseudo で tap target を 44x44 化 (visual ✕ icon size 維持)
                      className="text-muted-foreground hover:text-destructive focus-visible:ring-ring relative text-xs before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 disabled:before:hidden"
                    >
                      <span aria-hidden="true">✕</span>
                    </button>
                  </div>
                </div>
                <div
                  className="bg-muted h-1 w-full overflow-hidden rounded-full"
                  role="progressbar"
                  aria-label={`KR「${kr.title}」進捗 ${pct}%`}
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
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form
        className="space-y-2 rounded border border-dashed p-2"
        noValidate
        aria-label={`Goal「${goalTitle}」の Key Result 追加フォーム`}
        aria-busy={create.isPending || undefined}
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
            aria-label={
              krTitle.length === 0
                ? 'KR タイトル (必須、最大 300 文字、達成判定可能な数値目標が望ましい)'
                : krTitle.trim() === ''
                  ? `KR タイトル (現在 ${krTitle.length} / 300 文字、空白のみは不正)`
                  : krTitle.length > 280
                    ? `KR タイトル (現在 ${krTitle.length} / 300 文字、上限近接)`
                    : `KR タイトル (現在 ${krTitle.length} / 300 文字)`
            }
            required
            aria-required="true"
            aria-invalid={(krTitle.length > 0 && krTitle.trim() === '') || undefined}
            minLength={1}
            maxLength={300}
            autoComplete="off"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ProgressMode)}
            className="rounded border px-2 py-1 text-xs"
            required
            aria-required="true"
            aria-label={`KR 進捗算出モード (現在: ${
              mode === 'items'
                ? '子 Item 完了率で自動算出'
                : mode === 'manual'
                  ? '目標値 / 単位を手入力'
                  : mode
            })`}
          >
            <option value="items">items (子 Item 完了率)</option>
            <option value="manual">manual (目標値 / 単位)</option>
          </select>
        </div>
        {mode === 'manual' && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="例: 100"
              className="w-32 text-sm"
              required
              aria-required="true"
              aria-invalid={(target !== '' && Number.isNaN(Number(target))) || undefined}
              aria-label={
                target === ''
                  ? '目標値 (KR を達成判定するための数値、必須、decimal 可)'
                  : Number.isNaN(Number(target))
                    ? `目標値 (現在値「${target}」 は数値として不正)`
                    : `目標値 (現在: ${target}${unit ? ` ${unit}` : ''})`
              }
              // iter348: 目標値は decimal 入力可 (% / hours など) のため inputMode="decimal"
              // で mobile に小数 keypad を呼出。step=any で arrow キー / spinner で小数入力可。
              inputMode="decimal"
              step="any"
            />
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="例: 件 / %"
              className="w-24 text-sm"
              aria-label={
                unit.length === 0
                  ? '単位 (任意、最大 20 文字、目標値とセット — 例: 件 / % / hours)'
                  : `単位 (現在: 「${unit}」、${unit.length} 文字)`
              }
              maxLength={20}
              autoComplete="off"
            />
          </div>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            className="min-h-11"
            disabled={!krTitle.trim() || create.isPending}
            aria-busy={create.isPending || undefined}
            data-testid={`kr-add-btn-${goalId}`}
            aria-label={
              !krTitle.trim()
                ? 'Key Result を追加するにはタイトルを入力してください'
                : create.isPending
                  ? 'Key Result を追加中…'
                  : 'Key Result をこの Goal に追加'
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            KR 追加
          </Button>
        </div>
      </form>
    </div>
  )
}
