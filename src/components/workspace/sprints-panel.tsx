'use client'

/**
 * Sprint 一覧 + 新規作成 + status 操作。
 *   - active を最上位、それ以下は startDate desc
 *   - 進捗はカードに `useSprintProgress` で表示 (active / completed のみ取得)
 *   - status 遷移ボタン: planning → active / active → completed / cancelled
 *   - 編集 (name / 期間 / goal) は inline edit を後回し、まず最小機能
 */
import { useState } from 'react'

import { CheckCircle, Pause, Play, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useChangeSprintStatus,
  useCreateSprint,
  useRunPremortem,
  useRunRetro,
  useSprintProgress,
  useSprints,
} from '@/features/sprint/hooks'
import type { Sprint, SprintStatus } from '@/features/sprint/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { IMEInput } from '@/components/shared/ime-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  workspaceId: string
}

const STATUS_LABEL: Record<SprintStatus, string> = {
  planning: '計画中',
  active: '稼働中',
  completed: '完了',
  cancelled: '中止',
}

const STATUS_COLOR: Record<SprintStatus, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  planning: 'outline',
  active: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
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

function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  const from = Date.UTC(fy!, fm! - 1, fd!)
  const to = Date.UTC(ty!, tm! - 1, td!)
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}

export function SprintsPanel({ workspaceId }: Props) {
  const list = useSprints(workspaceId)
  const createMut = useCreateSprint(workspaceId)
  const changeMut = useChangeSprintStatus(workspaceId)
  const retroMut = useRunRetro(workspaceId)
  const premortemMut = useRunPremortem(workspaceId)

  async function handleRetro(sp: Sprint) {
    try {
      const r = await retroMut.mutateAsync(sp.id)
      toast.success(`Retro Doc を生成しました (${r.iterations} iter, $${r.costUsd.toFixed(4)})`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Retro 生成に失敗')
    }
  }

  async function handlePremortem(sp: Sprint) {
    try {
      const r = await premortemMut.mutateAsync(sp.id)
      toast.success(
        `Pre-mortem Doc を生成しました (${r.iterations} iter, $${r.costUsd.toFixed(4)})`,
      )
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Pre-mortem 生成に失敗')
    }
  }

  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(isoDaysFromNow(13))

  async function handleCreate() {
    const n = name.trim()
    if (!n) return
    if (startDate && endDate && endDate < startDate) {
      toast.error('終了日は開始日以降にしてください')
      return
    }
    try {
      await createMut.mutateAsync({
        workspaceId,
        name: n,
        goal: goal.trim() || null,
        startDate,
        endDate,
        idempotencyKey: crypto.randomUUID(),
      })
      setName('')
      setGoal('')
      toast.success('Sprint を作成しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗')
    }
  }

  async function handleStatusChange(sp: Sprint, status: SprintStatus) {
    try {
      await changeMut.mutateAsync({ id: sp.id, expectedVersion: sp.version, status })
      toast.success(`${STATUS_LABEL[status]} に変更`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'status 変更に失敗')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新規 Sprint</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sprint-name">名前</Label>
                <IMEInput
                  id="sprint-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 2026 W18 Sprint"
                  required
                  aria-required="true"
                  minLength={1}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sprint-start">開始</Label>
                <Input
                  id="sprint-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sprint-end">終了</Label>
                <Input
                  id="sprint-end"
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
              <Label htmlFor="sprint-goal">ゴール (任意)</Label>
              <Textarea
                id="sprint-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="この Sprint で達成したいこと"
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!name.trim() || createMut.isPending}
                data-testid="sprint-create-btn"
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
        <EmptyState title="Sprint がありません" description="上のフォームから作成できます" />
      ) : (
        <ul className="space-y-3" data-testid="sprints-list">
          {list.data.map((sp) => (
            <SprintCard
              key={sp.id}
              sprint={sp}
              onStatusChange={(s) => void handleStatusChange(sp, s)}
              changing={changeMut.isPending}
              onRunRetro={() => void handleRetro(sp)}
              retroPending={retroMut.isPending}
              onRunPremortem={() => void handlePremortem(sp)}
              premortemPending={premortemMut.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

interface CardProps {
  sprint: Sprint
  onStatusChange: (status: SprintStatus) => void
  changing: boolean
  onRunRetro: () => void
  retroPending: boolean
  onRunPremortem: () => void
  premortemPending: boolean
}

function SprintCard({
  sprint,
  onStatusChange,
  changing,
  onRunRetro,
  retroPending,
  onRunPremortem,
  premortemPending,
}: CardProps) {
  const status = sprint.status as SprintStatus
  // active / completed は進捗を取る (planning は未割当が多いので skip)
  const showProgress = status === 'active' || status === 'completed'
  const progress = useSprintProgress(showProgress ? sprint.id : null)
  const total = progress.data?.total ?? 0
  const done = progress.data?.done ?? 0
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  // 期間の経過 / 残日数 (簡易 Burndown 代替)
  const today = todayISO()
  const totalDays = Math.max(1, daysBetween(sprint.startDate, sprint.endDate) + 1) // 両端含む
  const elapsedDays = Math.max(0, Math.min(totalDays, daysBetween(sprint.startDate, today) + 1))
  const remainingDays = Math.max(0, daysBetween(today, sprint.endDate))
  const elapsedPct = Math.round((elapsedDays / totalDays) * 100)
  // ideal な完了 % (時間経過 vs 完了率) — burndown の "ideal line" 相当
  const isOnTrack = total === 0 ? true : pct >= elapsedPct - 10 // 10% 余裕

  return (
    <li data-testid={`sprint-card-${sprint.id}`}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{sprint.name}</CardTitle>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {sprint.startDate} 〜 {sprint.endDate}
              </p>
            </div>
            <Badge variant={STATUS_COLOR[status]} data-testid={`sprint-status-${sprint.id}`}>
              {STATUS_LABEL[status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sprint.goal && (
            <p className="text-muted-foreground line-clamp-2 text-xs">{sprint.goal}</p>
          )}
          {showProgress && (
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">完了率</span>
                  <span
                    className={`font-mono ${
                      status === 'active' && !isOnTrack ? 'text-destructive' : ''
                    }`}
                  >
                    {done} / {total} ({pct}%)
                  </span>
                </div>
                <div className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full">
                  <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                  {/* ideal 線 (経過率) */}
                  {status === 'active' && (
                    <div
                      className="bg-foreground/40 absolute top-0 h-full w-px"
                      style={{ left: `${elapsedPct}%` }}
                      aria-label={`理想ライン ${elapsedPct}%`}
                    />
                  )}
                </div>
              </div>
              {status === 'active' && (
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>
                    経過 {elapsedDays} / {totalDays} 日 ({elapsedPct}%)
                  </span>
                  <span>残 {remainingDays} 日</span>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {status === 'planning' && (
              <Button
                size="sm"
                variant="outline"
                disabled={changing}
                onClick={() => onStatusChange('active')}
                data-testid={`sprint-activate-${sprint.id}`}
              >
                <Play className="mr-1 h-3.5 w-3.5" />
                稼働開始
              </Button>
            )}
            {status === 'active' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={changing}
                  onClick={() => onStatusChange('completed')}
                  data-testid={`sprint-complete-${sprint.id}`}
                >
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  完了
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={changing}
                  onClick={() => onStatusChange('planning')}
                >
                  <Pause className="mr-1 h-3.5 w-3.5" />
                  計画に戻す
                </Button>
              </>
            )}
            {status !== 'cancelled' && status !== 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={changing}
                onClick={() => onStatusChange('cancelled')}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                中止
              </Button>
            )}
            {(status === 'active' || status === 'completed') && (
              <Button
                size="sm"
                variant="outline"
                disabled={retroPending}
                onClick={onRunRetro}
                data-testid={`sprint-retro-${sprint.id}`}
                title="PM Agent が完了/未完 items を要約して Retro Doc を生成"
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                {retroPending ? '振り返り生成中…' : '振り返り生成'}
              </Button>
            )}
            {(status === 'planning' || status === 'active') && (
              <Button
                size="sm"
                variant="outline"
                disabled={premortemPending}
                onClick={onRunPremortem}
                data-testid={`sprint-premortem-${sprint.id}`}
                title="PM Agent が想定リスクと早期警報を Pre-mortem Doc にまとめる"
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                {premortemPending
                  ? 'Pre-mortem 生成中…'
                  : sprint.premortemGeneratedAt
                    ? 'Pre-mortem 再生成'
                    : 'Pre-mortem 生成'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  )
}
