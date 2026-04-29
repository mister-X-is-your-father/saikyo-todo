'use client'

/**
 * Sprint 一覧 + 新規作成 + status 操作。
 *   - active を最上位、それ以下は startDate desc
 *   - 進捗はカードに `useSprintProgress` で表示 (active / completed のみ取得)
 *   - status 遷移ボタン: planning → active / active → completed / cancelled
 *   - 編集 (name / 期間 / goal) は inline edit を後回し、まず最小機能
 */
import { useEffect, useRef, useState } from 'react'

import {
  AlertTriangle,
  CalendarRange,
  CheckCircle,
  Pause,
  Play,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { isInvalidDateRange } from '@/features/item/date-range'
import {
  computeSprintBurndown,
  type SprintProgressTone,
  sprintProgressTone,
  sprintProgressToneLabel,
} from '@/features/sprint/burndown'
import {
  useChangeSprintStatus,
  useCreateSprint,
  useRunPremortem,
  useRunRetro,
  useSprintDefaults,
  useSprintProgress,
  useSprints,
  useUpdateSprint,
  useUpdateSprintDefaults,
} from '@/features/sprint/hooks'
import type { Sprint, SprintStatus } from '@/features/sprint/schema'
import {
  addDaysISO,
  dayOfWeekJa,
  DOW_JA,
  formatDateJa,
  isoDaysFromNow,
  nextDowISO,
  todayISO,
} from '@/features/sprint/sprint-date-helpers'

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

// iter298 basics: progress bar の tone (色 / icon) を意味付け
//   - done    緑 ✓ (達成)
//   - onTrack 青↑ (順調)
//   - behind  黄⚠ (遅延)
//   - idle    zinc 無印 (未着手 / 完了済 / 中止)
// iter316 refactor: tone → 日本語 label は `sprintProgressToneLabel` (burndown.ts) に
// 集約済 (goalHealthTierLabel と対称)。bar class は Tailwind UI 結合なので inline 維持。
const PROGRESS_TONE_BAR_CLASS: Record<SprintProgressTone, string> = {
  done: 'bg-emerald-500',
  onTrack: 'bg-blue-500',
  behind: 'bg-amber-500',
  idle: 'bg-primary',
}

// iter265 refactor: 6 個の純粋日付ヘルパを `@/features/sprint/sprint-date-helpers`
// に抽出し、テスト 21 件を追加。本ファイルは UI 専念。

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

  // Phase 6.15 iter 106: workspace_settings から Sprint 基本曜日 + 期間長を取得し、
  // 新規 form の startDate を「次の起動曜日」、endDate を startDate + (期間-1) 日に初期化する。
  // load 中は従来の "今日 / 13 日後" を使い、defaults 到着後に追従する。
  const defaults = useSprintDefaults(workspaceId)
  const initStart = defaults.data ? nextDowISO(defaults.data.startDow) : todayISO()
  const initEnd = defaults.data
    ? addDaysISO(initStart, Math.max(0, defaults.data.lengthDays - 1))
    : isoDaysFromNow(13)

  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState(initStart)
  const [endDate, setEndDate] = useState(initEnd)
  const [defaultsApplied, setDefaultsApplied] = useState(Boolean(defaults.data))
  // defaults が後から到着した場合、ユーザがまだ手で触っていなければ初期値を defaults に揃える
  if (defaults.data && !defaultsApplied) {
    setStartDate(initStart)
    setEndDate(initEnd)
    setDefaultsApplied(true)
  }

  async function handleCreate() {
    const n = name.trim()
    if (!n) return
    if (isInvalidDateRange(startDate, endDate)) {
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
      <SprintDefaultsEditor workspaceId={workspaceId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base" role="heading" aria-level={2}>
            新規 Sprint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            noValidate
            aria-busy={createMut.isPending || undefined}
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
                  // iter344: app 固有 input なので browser auto-fill 候補は無関係 → off
                  autoComplete="off"
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
                  max={endDate || undefined}
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
              <Label htmlFor="sprint-goal">ゴール (任意、Cmd/Ctrl+Enter で作成)</Label>
              <Textarea
                id="sprint-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                // iter316: Cmd/Ctrl+Enter で作成 (iter313-315 と同 pattern、form 内 Textarea
                // でも default Enter は改行のため modifier 併用必須)。name 空 / pending 中は noop。
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    name.trim() &&
                    !createMut.isPending
                  ) {
                    e.preventDefault()
                    void handleCreate()
                  }
                }}
                placeholder="この Sprint で達成したいこと"
                rows={2}
                maxLength={500}
                aria-label="Sprint ゴール (任意、Cmd/Ctrl+Enter で作成)"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!name.trim() || createMut.isPending}
                data-testid="sprint-create-btn"
                aria-label={
                  !name.trim()
                    ? 'Sprint を作成するには名前を入力してください'
                    : createMut.isPending
                      ? 'Sprint を作成中…'
                      : 'Sprint を新規作成'
                }
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
        <EmptyState
          title="Sprint がありません"
          // iter283 basics: 旧説明 (`上のフォームから作成できます`) は単なる行動指示で
          // Sprint が何かが見えなかった → 用途例と典型的な期間 (1-2週間) を示す。
          // Today (iter273) / Inbox (iter276) / Workflows (iter281) と同パターン。
          description={
            <span>
              短期 (典型は <code className="bg-muted rounded px-1 text-[11px]">1-2 週間</code>) の
              スコープ単位で進捗を測る箱です。 ゴール例:{' '}
              <code className="bg-muted rounded px-1 text-[11px]">α リリース準備</code> /{' '}
              <code className="bg-muted rounded px-1 text-[11px]">第 3 四半期 OKR</code>。 完了時に
              Retro Doc / 開始前に Pre-mortem を生成できます。
            </span>
          }
          action={
            <button
              type="button"
              className="text-primary hover:bg-muted mt-2 rounded border px-3 py-1.5 text-xs hover:underline"
              data-testid="sprints-empty-create"
              aria-label="Sprint 作成フォームの『名前』入力欄にフォーカス"
              onClick={() => {
                const el = document.getElementById('sprint-name') as HTMLInputElement | null
                el?.focus()
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
            >
              作成フォームへ
            </button>
          }
        />
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
  const update = useUpdateSprint(sprint.workspaceId)
  // 期間編集モード (Sprint card 内 inline form)
  const [editing, setEditing] = useState(false)
  const [editStart, setEditStart] = useState(sprint.startDate)
  const [editEnd, setEditEnd] = useState(sprint.endDate)
  // active / completed は進捗を取る (planning は未割当が多いので skip)
  const showProgress = status === 'active' || status === 'completed'
  const progress = useSprintProgress(showProgress ? sprint.id : null)
  const total = progress.data?.total ?? 0
  const done = progress.data?.done ?? 0
  // iter285 refactor: pure helper `computeSprintBurndown` に集約 (テスト 11 件)
  const burndown = computeSprintBurndown({
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    total,
    done,
  })
  const pct = burndown.completionPct
  const { totalDays, elapsedDays, remainingDays, elapsedPct } = burndown
  // iter298 basics: tone は "達成" 永続が最強 → onTrack/behind (active) → idle (それ以外)
  const tone = sprintProgressTone(burndown, status)
  const ToneIcon =
    tone === 'done'
      ? CheckCircle
      : tone === 'onTrack'
        ? TrendingUp
        : tone === 'behind'
          ? AlertTriangle
          : null
  const toneIconClass =
    tone === 'done'
      ? 'text-emerald-600'
      : tone === 'onTrack'
        ? 'text-blue-600'
        : tone === 'behind'
          ? 'text-amber-600'
          : ''

  return (
    <li data-testid={`sprint-card-${sprint.id}`}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate text-base" role="heading" aria-level={3}>
                {sprint.name}
              </CardTitle>
              <p
                className="text-muted-foreground mt-0.5 text-xs"
                data-testid={`sprint-period-${sprint.id}`}
              >
                {formatDateJa(sprint.startDate)} 〜 {formatDateJa(sprint.endDate)}
              </p>
            </div>
            <Badge
              variant={STATUS_COLOR[status]}
              data-testid={`sprint-status-${sprint.id}`}
              aria-label={`Sprint「${sprint.name}」のステータス: ${STATUS_LABEL[status]}`}
            >
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
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    {ToneIcon && (
                      <ToneIcon aria-hidden="true" className={`h-3.5 w-3.5 ${toneIconClass}`} />
                    )}
                    <span>完了率</span>
                    <span className="sr-only">({sprintProgressToneLabel(tone)})</span>
                  </span>
                  <span
                    className={`font-mono ${
                      tone === 'behind'
                        ? 'text-destructive'
                        : tone === 'done'
                          ? 'text-emerald-700'
                          : ''
                    }`}
                  >
                    {done} / {total} ({pct}%)
                  </span>
                </div>
                <div
                  className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full"
                  role="progressbar"
                  aria-label={`Sprint「${sprint.name}」完了率 (${sprintProgressToneLabel(tone)})`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={`${done}/${total} (${pct}%) — ${sprintProgressToneLabel(tone)}`}
                  data-testid={`sprint-progress-${sprint.id}`}
                  data-tone={tone}
                >
                  <div
                    className={`${PROGRESS_TONE_BAR_CLASS[tone]} h-full`}
                    style={{ width: `${pct}%` }}
                  />
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
          {editing && (
            <form
              className="space-y-2 rounded border border-dashed p-2"
              noValidate
              aria-busy={update.isPending || undefined}
              onSubmit={async (e) => {
                e.preventDefault()
                if (isInvalidDateRange(editStart, editEnd)) {
                  toast.error('終了日は開始日以降にしてください')
                  return
                }
                try {
                  await update.mutateAsync({
                    id: sprint.id,
                    expectedVersion: sprint.version,
                    patch: { startDate: editStart, endDate: editEnd },
                  })
                  toast.success('期間を更新しました')
                  setEditing(false)
                } catch (err) {
                  toast.error(isAppError(err) ? err.message : '更新に失敗')
                }
              }}
              data-testid={`sprint-period-edit-${sprint.id}`}
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`sprint-edit-start-${sprint.id}`} className="text-[10px]">
                    開始 ({dayOfWeekJa(editStart)})
                  </Label>
                  <Input
                    id={`sprint-edit-start-${sprint.id}`}
                    type="date"
                    value={editStart}
                    max={editEnd || undefined}
                    onChange={(e) => setEditStart(e.target.value)}
                    required
                    aria-label="Sprint 開始日"
                    className="h-8 text-xs"
                    data-testid={`sprint-edit-start-${sprint.id}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`sprint-edit-end-${sprint.id}`} className="text-[10px]">
                    終了 ({dayOfWeekJa(editEnd)})
                  </Label>
                  <Input
                    id={`sprint-edit-end-${sprint.id}`}
                    type="date"
                    value={editEnd}
                    min={editStart}
                    onChange={(e) => setEditEnd(e.target.value)}
                    required
                    aria-label="Sprint 終了日"
                    className="h-8 text-xs"
                    data-testid={`sprint-edit-end-${sprint.id}`}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false)
                    setEditStart(sprint.startDate)
                    setEditEnd(sprint.endDate)
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={update.isPending}
                  aria-busy={update.isPending || undefined}
                  data-testid={`sprint-period-save-${sprint.id}`}
                  aria-label={
                    update.isPending
                      ? `Sprint「${sprint.name}」の期間を保存中…`
                      : `Sprint「${sprint.name}」の期間を保存`
                  }
                >
                  {update.isPending ? '保存中…' : '保存'}
                </Button>
              </div>
            </form>
          )}
          <div className="flex flex-wrap gap-1.5">
            {!editing && status !== 'cancelled' && status !== 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                data-testid={`sprint-period-edit-btn-${sprint.id}`}
                title="期間を編集"
                aria-label={`Sprint「${sprint.name}」の期間を編集`}
              >
                <CalendarRange className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                期間
              </Button>
            )}
            {status === 'planning' && (
              <Button
                size="sm"
                variant="outline"
                disabled={changing}
                onClick={() => onStatusChange('active')}
                data-testid={`sprint-activate-${sprint.id}`}
                aria-label={
                  changing
                    ? `Sprint「${sprint.name}」のステータスを変更中…`
                    : `Sprint「${sprint.name}」を稼働開始`
                }
              >
                <Play className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
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
                  aria-label={
                    changing
                      ? `Sprint「${sprint.name}」のステータスを変更中…`
                      : `Sprint「${sprint.name}」を完了`
                  }
                >
                  <CheckCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  完了
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={changing}
                  onClick={() => onStatusChange('planning')}
                  aria-label={
                    changing
                      ? `Sprint「${sprint.name}」のステータスを変更中…`
                      : `Sprint「${sprint.name}」を計画に戻す`
                  }
                >
                  <Pause className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  計画に戻す
                </Button>
              </>
            )}
            {status !== 'cancelled' && status !== 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={changing}
                onClick={() => {
                  if (
                    !window.confirm(
                      'この Sprint を中止しますか?\n割当中の Item は外れず残りますが、status は cancelled になります。',
                    )
                  )
                    return
                  onStatusChange('cancelled')
                }}
                data-testid={`sprint-cancel-${sprint.id}`}
                aria-label={
                  changing ? `Sprint「${sprint.name}」を中止中…` : `Sprint「${sprint.name}」を中止`
                }
              >
                <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                中止
              </Button>
            )}
            {(status === 'active' || status === 'completed') && (
              <Button
                size="sm"
                variant="outline"
                disabled={retroPending}
                aria-busy={retroPending || undefined}
                onClick={onRunRetro}
                data-testid={`sprint-retro-${sprint.id}`}
                title="PM Agent が完了/未完 items を要約して Retro Doc を生成"
                aria-label={
                  retroPending
                    ? `Sprint「${sprint.name}」の振り返りを生成中…`
                    : `Sprint「${sprint.name}」の振り返り Doc を生成 (PM Agent が完了/未完 items を要約)`
                }
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {retroPending ? '振り返り生成中…' : '振り返り生成'}
              </Button>
            )}
            {(status === 'planning' || status === 'active') && (
              <Button
                size="sm"
                variant="outline"
                disabled={premortemPending}
                aria-busy={premortemPending || undefined}
                onClick={onRunPremortem}
                data-testid={`sprint-premortem-${sprint.id}`}
                title="PM Agent が想定リスクと早期警報を Pre-mortem Doc にまとめる"
                aria-label={
                  premortemPending
                    ? `Sprint「${sprint.name}」の Pre-mortem を生成中…`
                    : sprint.premortemGeneratedAt
                      ? `Sprint「${sprint.name}」の Pre-mortem を再生成 (PM Agent が想定リスクと早期警報を Doc にまとめる)`
                      : `Sprint「${sprint.name}」の Pre-mortem を生成 (PM Agent が想定リスクと早期警報を Doc にまとめる)`
                }
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
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

/**
 * Phase 6.15 iter 110: workspace 単位 Sprint デフォルト (基本曜日 + 期間日数) 編集 inline editor。
 * member 以下が見ても read-only 状態 (mutation でサーバが PermissionError を返す)。
 */
function SprintDefaultsEditor({ workspaceId }: { workspaceId: string }) {
  const q = useSprintDefaults(workspaceId)
  const upd = useUpdateSprintDefaults(workspaceId)
  const [editing, setEditing] = useState(false)
  const [dow, setDow] = useState(1)
  const [length, setLength] = useState(14)

  // 取得後 form state を初期化 (1 回のみ — ユーザ編集中は上書きしない)
  const lastLoadedRef = useRef(false)
  useEffect(() => {
    if (lastLoadedRef.current || !q.data) return
    lastLoadedRef.current = true
    setDow(q.data.startDow)
    setLength(q.data.lengthDays)
  }, [q.data])

  if (!q.data) return null
  const cur = q.data

  async function save() {
    try {
      await upd.mutateAsync({ startDow: dow, lengthDays: length })
      toast.success('Sprint デフォルトを更新しました')
      setEditing(false)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '更新に失敗 (admin 以上が必要)')
    }
  }

  return (
    <Card data-testid="sprint-defaults-editor">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm" role="heading" aria-level={2}>
          Sprint デフォルト (workspace 全体)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!editing ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span data-testid="sprint-defaults-summary">
              基本: <strong>{DOW_JA[cur.startDow]}曜開始</strong> /{' '}
              <strong>{cur.lengthDays} 日</strong>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              data-testid="sprint-defaults-edit-btn"
              aria-label={`Sprint デフォルト (現在: ${DOW_JA[cur.startDow]}曜開始 / ${cur.lengthDays} 日) の編集モードを開く`}
            >
              編集
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            noValidate
            aria-busy={upd.isPending || undefined}
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <div>
              <Label htmlFor="sprint-defaults-dow" className="text-[10px]">
                基本曜日
              </Label>
              <select
                id="sprint-defaults-dow"
                value={dow}
                onChange={(e) => setDow(Number(e.target.value))}
                className="h-9 rounded-md border px-2 text-sm"
                aria-label="Sprint 基本曜日"
                data-testid="sprint-defaults-dow"
              >
                {DOW_JA.map((label, i) => (
                  <option key={i} value={i}>
                    {label}曜
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="sprint-defaults-length" className="text-[10px]">
                期間 (日)
              </Label>
              <Input
                id="sprint-defaults-length"
                type="number"
                min={1}
                max={90}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="h-9 w-20 text-sm"
                aria-label="Sprint 期間 (日数)"
                data-testid="sprint-defaults-length"
              />
            </div>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false)
                  setDow(cur.startDow)
                  setLength(cur.lengthDays)
                }}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={upd.isPending}
                aria-busy={upd.isPending || undefined}
                data-testid="sprint-defaults-save-btn"
                aria-label={
                  upd.isPending
                    ? 'Sprint デフォルトを保存中…'
                    : 'Sprint デフォルト (基本曜日 / 期間) を保存'
                }
              >
                {upd.isPending ? '保存中…' : '保存'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
