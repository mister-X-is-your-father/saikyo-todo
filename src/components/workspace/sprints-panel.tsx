'use client'

/**
 * Sprint 一覧 + 新規作成 + status 操作。
 *   - active を最上位、それ以下は startDate desc
 *   - 進捗はカードに `useSprintProgress` で表示 (active / completed のみ取得)
 *   - status 遷移ボタン: planning → active / active → completed / cancelled
 *   - 編集 (name / 期間 / goal) は inline edit を後回し、まず最小機能
 */
import { useEffect, useMemo, useRef, useState } from 'react'

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
import { useItems } from '@/features/item/hooks'
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
import { type Sprint, type SprintStatus, sprintStatusLabelJa } from '@/features/sprint/schema'
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
import { FocusFormCta } from '@/components/shared/focus-form-cta'
import { IMEInput } from '@/components/shared/ime-input'
import { SprintRetroWidget } from '@/components/sprint/sprint-retro-widget'
import { SprintRiskBoardWidget } from '@/components/sprint/sprint-risk-board-widget'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SprintSwimlaneDisclosure } from '@/components/workspace/sprint-swimlane-disclosure'

interface Props {
  workspaceId: string
}

// iter521 basics: STATUS_LABEL は `sprintStatusLabelJa` (sprint/schema.ts) に集約。
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
  // iter503: 期間 validation 失敗 path で end-date input に focus shift
  // (iter501 / iter502 続編、Sprint 作成 form の onInvalid 5 弾目)
  const sprintEndRef = useRef<HTMLInputElement>(null)
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
      sprintEndRef.current?.focus()
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
      toast.success(`${sprintStatusLabelJa(status)} に変更`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'status 変更に失敗')
    }
  }

  return (
    <div className="space-y-6">
      <SprintDefaultsEditor workspaceId={workspaceId} />

      <Card role="region" aria-labelledby="sprints-new-heading">
        <CardHeader>
          <CardTitle id="sprints-new-heading" className="text-base" role="heading" aria-level={2}>
            新規 Sprint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            noValidate
            aria-label="Sprint 作成フォーム"
            aria-busy={createMut.isPending || undefined}
            /* iter2045: create form 全体に title を付与し sighted hover で form 用途 disclose
               (operations group iter2031-2043 と同 landmark hover pattern を form にも展開、
               3 entity create form family の 1 個目)。 */
            title="Sprint 作成フォーム"
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
                  className="h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 2026 W18 Sprint"
                  required
                  aria-required="true"
                  aria-invalid={(name.length > 0 && name.trim() === '') || undefined}
                  minLength={1}
                  maxLength={100}
                  // iter344: app 固有 input なので browser auto-fill 候補は無関係 → off
                  autoComplete="off"
                  enterKeyHint="next"
                  // iter1206: 旧 aria-label `Sprint 名前 (...)` (全 4 path) は visible Label
                  // "名前" を中位置 "Sprint **名前** (...)" に持ち voice control prefix-matching
                  // 「click 名前」 match 不可 (substring 一致のみ)。tmpl-name iter1205 と同 sweep
                  // を sprint-name にも展開。Input は htmlFor Label が visible なので Label
                  // text "名前" を冒頭固定 + em-dash 区切で descriptive 末尾保持。
                  aria-label={
                    name.length === 0
                      ? '名前 — Sprint 名前 (必須、最大 100 文字)'
                      : name.trim() === ''
                        ? `名前 — Sprint 名前 (現在 ${name.length} / 100 文字、空白のみは不正)`
                        : name.length > 90
                          ? `名前 — Sprint 名前 (現在 ${name.length} / 100 文字、上限近接)`
                          : `名前 — Sprint 名前 (現在 ${name.length} / 100 文字)`
                  }
                  /* iter1979: state-dependent aria-label を title で sighted hover disclose、
                     iter1975/1977 workflows-panel name/desc / iter1969/1973 comment-thread /
                     iter1967 period-goal と同 state-dependent input pattern (6 input family)。 */
                  title={
                    name.length === 0
                      ? '名前 — Sprint 名前 (必須、最大 100 文字)'
                      : name.trim() === ''
                        ? `名前 — Sprint 名前 (現在 ${name.length} / 100 文字、空白のみは不正)`
                        : name.length > 90
                          ? `名前 — Sprint 名前 (現在 ${name.length} / 100 文字、上限近接)`
                          : `名前 — Sprint 名前 (現在 ${name.length} / 100 文字)`
                  }
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
                  aria-invalid={isInvalidDateRange(startDate, endDate) || undefined}
                  max={endDate || undefined}
                  enterKeyHint="next"
                  // iter1207: 旧 aria-label `Sprint 開始日 (...)` (全 3 path) は visible
                  // Label "開始" を中位置 "Sprint **開始**日 (...)" に持ち voice control
                  // prefix-matching「click 開始」 match 不可 (substring 一致のみ)。
                  // sprint-name iter1206 と同 sweep を sprint-start にも展開。Input は
                  // htmlFor Label が visible なので Label text "開始" を冒頭固定 + em-dash。
                  aria-label={
                    startDate === ''
                      ? '開始 — Sprint 開始日 (必須、終了日以前)'
                      : isInvalidDateRange(startDate, endDate)
                        ? `開始 — Sprint 開始日 (現在: ${startDate}、終了日 ${endDate} より後で不正)`
                        : `開始 — Sprint 開始日 (現在: ${startDate})`
                  }
                  className="min-h-11"
                  /* iter2025: sprint-edit-start/end iter2017/2019 と pair、sprint-create
                     form の sprint-start も state-dependent aria-label の sighted hover
                     disclose (sprints-panel create + edit form 全 date input sweep 完備)。 */
                  title={
                    startDate === ''
                      ? '開始 — Sprint 開始日 (必須、終了日以前)'
                      : isInvalidDateRange(startDate, endDate)
                        ? `開始 — Sprint 開始日 (現在: ${startDate}、終了日 ${endDate} より後で不正)`
                        : `開始 — Sprint 開始日 (現在: ${startDate})`
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sprint-end">終了</Label>
                <Input
                  ref={sprintEndRef}
                  id="sprint-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={isInvalidDateRange(startDate, endDate) || undefined}
                  min={startDate || undefined}
                  enterKeyHint="next"
                  // iter1207: 旧 aria-label `Sprint 終了日 (...)` (全 3 path) は visible
                  // Label "終了" を中位置 "Sprint **終了**日 (...)" に持ち voice control
                  // prefix-matching「click 終了」 match 不可 (substring 一致のみ)。
                  // sprint-start と同 sweep を sprint-end にも展開。Input は htmlFor
                  // Label が visible なので Label text "終了" を冒頭固定 + em-dash。
                  aria-label={
                    endDate === ''
                      ? '終了 — Sprint 終了日 (必須、開始日以降)'
                      : isInvalidDateRange(startDate, endDate)
                        ? `終了 — Sprint 終了日 (現在: ${endDate}、開始日 ${startDate} より前で不正)`
                        : `終了 — Sprint 終了日 (現在: ${endDate})`
                  }
                  className="min-h-11"
                  /* iter2027: sprint-create-start iter2025 と pair、sprints-panel create form
                     2 date input sweep 完備、sprints-panel + goals-panel 全 6 date input
                     state-dependent hover 完備。 */
                  title={
                    endDate === ''
                      ? '終了 — Sprint 終了日 (必須、開始日以降)'
                      : isInvalidDateRange(startDate, endDate)
                        ? `終了 — Sprint 終了日 (現在: ${endDate}、開始日 ${startDate} より前で不正)`
                        : `終了 — Sprint 終了日 (現在: ${endDate})`
                  }
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
                aria-keyshortcuts="Meta+Enter Control+Enter"
                // iter1206: 旧 aria-label `Sprint ゴール (...)` (全 3 path) は visible Label
                // "ゴール (任意、Cmd/Ctrl+Enter で作成)" を中位置 "Sprint **ゴール** (...)" に
                // 持ち voice control prefix-matching「click ゴール」 match 不可 (substring
                // 一致のみ)。sprint-name と同 sweep を sprint-goal にも展開。Textarea は
                // htmlFor Label が visible なので Label text "ゴール" を冒頭固定 + em-dash。
                aria-label={
                  goal.length === 0
                    ? 'ゴール — Sprint ゴール (任意、最大 500 文字、この Sprint で達成したいこと、Cmd/Ctrl+Enter で作成)'
                    : goal.length > 480
                      ? `ゴール — Sprint ゴール (現在 ${goal.length} / 500 文字、上限近接、Cmd/Ctrl+Enter で作成)`
                      : `ゴール — Sprint ゴール (現在 ${goal.length} / 500 文字、Cmd/Ctrl+Enter で作成)`
                }
                /* iter1981: sprint-name iter1979 と pair、sprint-goal textarea も
                   state-dependent aria-label の sighted hover disclose、sprints-panel 内
                   2 input/textarea sweep 完備 (7 state-dependent input family)。 */
                title={
                  goal.length === 0
                    ? 'ゴール — Sprint ゴール (任意、最大 500 文字、この Sprint で達成したいこと、Cmd/Ctrl+Enter で作成)'
                    : goal.length > 480
                      ? `ゴール — Sprint ゴール (現在 ${goal.length} / 500 文字、上限近接、Cmd/Ctrl+Enter で作成)`
                      : `ゴール — Sprint ゴール (現在 ${goal.length} / 500 文字、Cmd/Ctrl+Enter で作成)`
                }
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                className="min-h-11"
                disabled={!name.trim() || createMut.isPending}
                aria-busy={createMut.isPending || undefined}
                data-testid="sprint-create-btn"
                aria-keyshortcuts="Meta+Enter Control+Enter"
                // iter1111: visible "作成" / "作成中…" を aria-label 冒頭固定 (iter1093-1110 sweep)。
                // iter1173: iter1111 で「disabled で対象外」と判断していた not-trim path を改めて
                // 取り込む — disabled button も SR は label を読み上げ、iOS Voice Control は
                // disabled でも match attempt するため visible-prefix で統一すべき
                // (iter1169-1172 と同 sweep 残漏 pattern)。
                aria-label={
                  !name.trim()
                    ? '作成 — Sprint を作成するには名前を入力してください'
                    : createMut.isPending
                      ? '作成中… — Sprint を作成中'
                      : '作成 — Sprint を新規作成'
                }
                // iter1809: iter1799 create-workspace と同 pattern を Sprint/Goal create button にも展開。
                title={
                  !name.trim()
                    ? '作成 — Sprint を作成するには名前を入力してください'
                    : createMut.isPending
                      ? '作成中… — Sprint を作成中'
                      : '作成 — Sprint を新規作成'
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
          title="Sprint がありません"
          // iter283 basics: 旧説明 (`上のフォームから作成できます`) は単なる行動指示で
          // Sprint が何かが見えなかった → 用途例と典型的な期間 (1-2週間) を示す。
          // Today (iter273) / Inbox (iter276) / Workflows (iter281) と同パターン。
          description={
            <span>
              短期 (典型は{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">1-2 週間</code>)
              の スコープ単位で進捗を測る箱です。 ゴール例:{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">
                α リリース準備
              </code>{' '}
              /{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">
                第 3 四半期 OKR
              </code>
              。 完了時に Retro Doc / 開始前に Pre-mortem を生成できます。
            </span>
          }
          action={<FocusFormCta targetId="sprint-name" testId="sprints-empty-create" />}
        />
      ) : (
        // iter448: ul に aria-label を付与し SR list nav で
        // 「Sprint 一覧 N 件」 が context 付きで聞き取れる (iter427 / iter428 /
        // iter438 / iter447 と連続 9 件目の widget list heading 統一)。
        <ul
          className="space-y-3"
          data-testid="sprints-list"
          aria-label={`Sprint 一覧 — ${list.data.length} 件`}
        >
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
  // iter501: 期間 validation 失敗 path で end-date input に focus shift
  // (iter499 / iter500 manual handleSubmit form の onInvalid pattern を 3 件目展開)
  const editEndRef = useRef<HTMLInputElement>(null)
  // active / completed は進捗を取る (planning は未割当が多いので skip)
  const showProgress = status === 'active' || status === 'completed'
  const progress = useSprintProgress(showProgress ? sprint.id : null)
  // iter547 (queue fluffy-3 wire-up): completed sprint で SprintRetroWidget を render するため
  // workspace の全 items を取得 (useItems は各 view と queryKey 共通で dedupe される)。
  // 取得した items を sprintId でフィルタ → SprintRetroItemFields shape へ map。
  const allItems = useItems(sprint.workspaceId)
  const sprintItems = useMemo(
    () =>
      status === 'completed'
        ? (allItems.data ?? [])
            .filter((it) => it.sprintId === sprint.id)
            .map((it) => ({
              status: it.status,
              dueDate: it.dueDate,
              doneAt: it.doneAt,
            }))
        : [],
    [allItems.data, sprint.id, status],
  )
  // iter548 (queue fluffy-2 wire-up): active sprint では Risk Board widget を表示
  const riskBoardItems = useMemo(
    () =>
      status === 'active' || status === 'planning'
        ? (allItems.data ?? [])
            .filter((it) => it.sprintId === sprint.id)
            .map((it) => ({
              id: it.id,
              title: it.title,
              status: it.status,
              dueDate: it.dueDate,
              priority: it.priority,
              isMust: it.isMust,
              blockingCount: 0, // 別 helper で精緻化、当面 0
              assigneeIds: [], // 別 hook で精緻化、当面 []
            }))
        : [],
    [allItems.data, sprint.id, status],
  )
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
  // iter1510: 3 tone 色 (done/onTrack/behind) は light 固定で dark mode で hue が浅く
  // 視認性低 (iter1391/1393/1508/1509 と同 root)。dark variant を併記。
  const toneIconClass =
    tone === 'done'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'onTrack'
        ? 'text-blue-600 dark:text-blue-400'
        : tone === 'behind'
          ? 'text-amber-600 dark:text-amber-400'
          : ''

  return (
    <li data-testid={`sprint-card-${sprint.id}`}>
      <Card role="region" aria-labelledby={`sprint-card-heading-${sprint.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* iter1739: truncate で長 sprint name 切れ + CardTitle は aria-label 無し
                  (textContent が SR label)、sighted は hover で全 name 見れなかった。
                  title 付与で sighted hover → 全 sprint name disclose (iter1720-1738 sweep)。 */}
              <CardTitle
                id={`sprint-card-heading-${sprint.id}`}
                className="truncate text-base"
                role="heading"
                aria-level={3}
                title={sprint.name}
              >
                {sprint.name}
              </CardTitle>
              <p
                className="text-muted-foreground mt-0.5 text-xs"
                data-testid={`sprint-period-${sprint.id}`}
              >
                <time dateTime={sprint.startDate}>{formatDateJa(sprint.startDate)}</time>
                {' 〜 '}
                <time dateTime={sprint.endDate}>{formatDateJa(sprint.endDate)}</time>
              </p>
            </div>
            {/* iter1069: shadcn Badge は role 無 span render で aria-label の SR
                picked-up が divergence (iter1051 WorkspaceHeader role Badge と同 pattern)。
                `role="img"` を prop spread で authoritative 化 (role=img sweep 21 弾目)。 */}
            <Badge
              variant={STATUS_COLOR[status]}
              data-testid={`sprint-status-${sprint.id}`}
              role="img"
              /* iter1553: 旧 aria-label `"Sprint「${sprint.name}」のステータス: ${status}"` は visible
                 "${status}" を末尾に持ち voice control prefix-matching「click 進行中」 が strict
                 prefix-match で不可 (substring 一致のみ)。iter1093-1552 sweep convention で
                 visible 冒頭固定 + em-dash 区切。
                 iter1853: iter1841 StatusBadge / iter1851 calibrated と同 pattern で title 付与、
                 sprint name context を sighted hover で disclose。 */
              aria-label={`${sprintStatusLabelJa(status)} — Sprint「${sprint.name}」のステータス`}
              title={`${sprintStatusLabelJa(status)} — Sprint「${sprint.name}」のステータス`}
            >
              <span aria-hidden="true">{sprintStatusLabelJa(status)}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sprint.goal && (
            // iter1755: sprint.goal は line-clamp-2 で 2 行超は切れる、sighted hover で全文
            // 見れず。title 付与で sighted hover → 全 goal disclose (iter1720-1754 sweep
            // を line-clamp にも展開、truncate と同 disclosure pattern を適用)。
            <p className="text-muted-foreground line-clamp-2 text-xs" title={sprint.goal}>
              {sprint.goal}
            </p>
          )}
          {showProgress && (
            <div className="space-y-2">
              <div className="space-y-1">
                {/* iter912: 視覚 label / 数値行は progressbar (下) の aria-label が完全 content
                    を持つため二重読み上げ排除 (iter907 StatCard / iter909/910/911 dl 続編)。 */}
                <div className="flex items-center justify-between text-xs" aria-hidden="true">
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    {ToneIcon && <ToneIcon className={`h-3.5 w-3.5 ${toneIconClass}`} />}
                    <span>完了率</span>
                  </span>
                  <span
                    className={`font-mono ${
                      tone === 'behind'
                        ? 'text-destructive'
                        : tone === 'done'
                          ? // iter1392: 固定暗色 emerald-700 は dark card bg 上で <4.5。dark:emerald-400 併記。
                            'text-emerald-700 dark:text-emerald-400'
                          : ''
                    }`}
                  >
                    {done} / {total} ({pct}%)
                  </span>
                </div>
                <div
                  className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full"
                  role="progressbar"
                  /* iter1501: aria-valuetext (line 593) は em-dash 区切で iter1494 goals-panel
                     も em-dash 化済。本 progressbar aria-label のみ () 区切が残存していたため、
                     同 row + sibling progressbar と punctuation 体系を揃えた em-dash 化。 */
                  aria-label={`Sprint「${sprint.name}」完了率 ${pct}% — ${done}/${total} 件、${sprintProgressToneLabel(tone)}`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={`${done}/${total} (${pct}%) — ${sprintProgressToneLabel(tone)}`}
                  data-testid={`sprint-progress-${sprint.id}`}
                  data-tone={tone}
                  /* iter1931: progressbar 色 tone (success/warn/danger) は WCAG 1.4.1 (色のみで
                     意味伝達回避) 用に SR aria-valuetext に明示しているが sighted hover では
                     不可達。aria-label と同 text を title に付与し sighted hover で tone disclose
                     (sprint-retro-status-chip iter1923 と同 tone label disclose pattern)。 */
                  title={`Sprint「${sprint.name}」完了率 ${pct}% — ${done}/${total} 件、${sprintProgressToneLabel(tone)}`}
                >
                  <div
                    className={`${PROGRESS_TONE_BAR_CLASS[tone]} h-full`}
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                  {/* ideal 線 (経過率) — 装飾、SR には sibling 「期間進捗」 div が経過 % を伝える */}
                  {status === 'active' && (
                    <div
                      className="bg-foreground/40 absolute top-0 h-full w-px"
                      style={{ left: `${elapsedPct}%` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
              {status === 'active' && (
                <div
                  className="text-muted-foreground flex items-center justify-between text-xs"
                  role="group"
                  aria-label={`Sprint「${sprint.name}」期間進捗 経過 ${elapsedDays} / ${totalDays} 日 (${elapsedPct}%)、残 ${remainingDays} 日`}
                >
                  <span aria-hidden="true">
                    経過 {elapsedDays} / {totalDays} 日 ({elapsedPct}%)
                  </span>
                  <span aria-hidden="true">残 {remainingDays} 日</span>
                </div>
              )}
            </div>
          )}
          {editing && (
            <form
              className="space-y-2 rounded border border-dashed p-2"
              noValidate
              aria-label={`Sprint「${sprint.name}」期間編集フォーム`}
              /* iter2059: edit form の用途 hover disclose、4 form family の 2 個目。 */
              title={`Sprint「${sprint.name}」期間編集フォーム`}
              aria-busy={update.isPending || undefined}
              onSubmit={async (e) => {
                e.preventDefault()
                if (isInvalidDateRange(editStart, editEnd)) {
                  toast.error('終了日は開始日以降にしてください')
                  editEndRef.current?.focus()
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
                    aria-required="true"
                    // iter1207: 旧 aria-label `Sprint 開始日 (...)` は create form と
                    // 同じ visible-prefix 漏れ (Label visible "開始 (曜日)" を中位置に持つ)。
                    // 同 file create form sprint-start と同 sweep を edit form にも展開、
                    // visible "開始" 冒頭固定 + em-dash 区切。
                    aria-label={
                      editStart === ''
                        ? '開始 — Sprint 開始日 (必須、終了日以前)'
                        : isInvalidDateRange(editStart, editEnd)
                          ? `開始 — Sprint 開始日 (現在: ${editStart} (${dayOfWeekJa(editStart)})、終了日 ${editEnd} より後で不正)`
                          : `開始 — Sprint 開始日 (現在: ${editStart} (${dayOfWeekJa(editStart)}))`
                    }
                    aria-invalid={isInvalidDateRange(editStart, editEnd) || undefined}
                    className="min-h-11 text-xs"
                    enterKeyHint="next"
                    data-testid={`sprint-edit-start-${sprint.id}`}
                    /* iter2017: state-dependent aria-label (空 / 不正 / 通常) を title で
                       sighted hover disclose、sprint-name iter1979 / sprint-goal iter1981 と
                       同 file 内 sweep の続編 (sprints-panel edit form date input)。 */
                    title={
                      editStart === ''
                        ? '開始 — Sprint 開始日 (必須、終了日以前)'
                        : isInvalidDateRange(editStart, editEnd)
                          ? `開始 — Sprint 開始日 (現在: ${editStart} (${dayOfWeekJa(editStart)})、終了日 ${editEnd} より後で不正)`
                          : `開始 — Sprint 開始日 (現在: ${editStart} (${dayOfWeekJa(editStart)}))`
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`sprint-edit-end-${sprint.id}`} className="text-[10px]">
                    終了 ({dayOfWeekJa(editEnd)})
                  </Label>
                  <Input
                    ref={editEndRef}
                    id={`sprint-edit-end-${sprint.id}`}
                    type="date"
                    value={editEnd}
                    min={editStart}
                    onChange={(e) => setEditEnd(e.target.value)}
                    required
                    aria-required="true"
                    // iter1207: 旧 aria-label `Sprint 終了日 (...)` は create form と
                    // 同じ visible-prefix 漏れ (Label visible "終了 (曜日)" を中位置に持つ)。
                    // 同 file create form sprint-end と同 sweep を edit form にも展開、
                    // visible "終了" 冒頭固定 + em-dash 区切。
                    aria-label={
                      editEnd === ''
                        ? '終了 — Sprint 終了日 (必須、開始日以降)'
                        : isInvalidDateRange(editStart, editEnd)
                          ? `終了 — Sprint 終了日 (現在: ${editEnd} (${dayOfWeekJa(editEnd)})、開始日 ${editStart} より前で不正)`
                          : `終了 — Sprint 終了日 (現在: ${editEnd} (${dayOfWeekJa(editEnd)}))`
                    }
                    aria-invalid={isInvalidDateRange(editStart, editEnd) || undefined}
                    className="min-h-11 text-xs"
                    enterKeyHint="send"
                    data-testid={`sprint-edit-end-${sprint.id}`}
                    /* iter2019: sprint-edit-start iter2017 と pair、sprint-edit-end も
                       state-dependent aria-label の sighted hover disclose、
                       sprints-panel edit form 2 date input sweep 完備。 */
                    title={
                      editEnd === ''
                        ? '終了 — Sprint 終了日 (必須、開始日以降)'
                        : isInvalidDateRange(editStart, editEnd)
                          ? `終了 — Sprint 終了日 (現在: ${editEnd} (${dayOfWeekJa(editEnd)})、開始日 ${editStart} より前で不正)`
                          : `終了 — Sprint 終了日 (現在: ${editEnd} (${dayOfWeekJa(editEnd)}))`
                    }
                  />
                </div>
              </div>
              <div
                className="flex justify-end gap-1.5"
                role="group"
                /* iter1585: paren convention を em-dash 区切に統一 (iter1093-1584 sweep)。 */
                aria-label={`Sprint「${sprint.name}」の期間編集 form 操作 — キャンセル / 保存`}
                /* iter2041: sprint-period edit form operations group も 4 entity operations
                   family iter2031-2037 と同 pattern (5 entity operations group family、
                   sprint operations / sprint-period edit operations / workflows / goals /
                   comment-edit)。 */
                title={`Sprint「${sprint.name}」の期間編集 form 操作 — キャンセル / 保存`}
              >
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false)
                    setEditStart(sprint.startDate)
                    setEditEnd(sprint.endDate)
                  }}
                  data-testid={`sprint-period-cancel-${sprint.id}`}
                  // iter1103: visible-prefix sweep (iter1093-1102) を sprint-period-cancel/save にも展開
                  // 旧 aria-label は visible "キャンセル"/"保存"/"保存中…" を末尾持ちで prefix-matching match 不可
                  aria-label={`キャンセル — Sprint「${sprint.name}」の期間編集を破棄`}
                >
                  <span aria-hidden="true">キャンセル</span>
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="min-h-11"
                  disabled={update.isPending}
                  aria-busy={update.isPending || undefined}
                  data-testid={`sprint-period-save-${sprint.id}`}
                  aria-label={
                    update.isPending
                      ? `保存中… — Sprint「${sprint.name}」の期間を保存中`
                      : `保存 — Sprint「${sprint.name}」の期間を保存`
                  }
                >
                  <span aria-hidden="true">{update.isPending ? '保存中…' : '保存'}</span>
                </Button>
              </div>
            </form>
          )}
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            /* iter1578: 旧 paren convention `"Sprint「${name}」の操作 (現在: ${status}、...)"` を
               iter1093-1577 sweep の em-dash 区切に統一。visible 冒頭 "Sprint「${name}」" は維持、
               区切のみ '(現在:' → ' — 現在' に統一、closing ')' は削除。iter1573-1577 region/group
               landmark sweep の sprint operations group 着地。 */
            aria-label={`Sprint「${sprint.name}」の操作 — 現在 ${sprintStatusLabelJa(status)}、期間編集 / ステータス遷移 / Retro / Pre-mortem`}
            /* iter2033: workflows-panel operations group iter2031 と同 pattern を sprints-panel
               operations group にも展開、Sprint 名 + 現在 status + operations 構成 hover disclose。 */
            title={`Sprint「${sprint.name}」の操作 — 現在 ${sprintStatusLabelJa(status)}、期間編集 / ステータス遷移 / Retro / Pre-mortem`}
          >
            {!editing && status !== 'cancelled' && status !== 'completed' && (
              <Button
                size="sm"
                className="min-h-11"
                variant="outline"
                onClick={() => setEditing(true)}
                data-testid={`sprint-period-edit-btn-${sprint.id}`}
                /* iter2097: sprint-period-edit static title="期間を編集" は aria-label
                   `期間 — Sprint「${sprint.name}」の期間を編集` と divergent。
                   sprint-retro iter2093 / sprint-premortem iter2095 と同 title-aria
                   divergence 修正 pattern で sync (Sprint name + 用途 context disclose)。 */
                title={`期間 — Sprint「${sprint.name}」の期間を編集`}
                // iter1150: 旧 aria-label `Sprint「name」の期間を編集` は visible "期間"
                // を末尾近く "の**期間**を編集" 中位置に持ち voice control prefix-matching
                //「click 期間」 match 不可。iter1093-1149 sweep convention に揃え
                // visible "期間" 冒頭固定 + em-dash 区切で descriptive 末尾保持。
                aria-label={`期間 — Sprint「${sprint.name}」の期間を編集`}
              >
                <CalendarRange className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                <span aria-hidden="true">期間</span>
              </Button>
            )}
            {/* iter1119: sprint-activate / sprint-complete / sprint-replan / sprint-cancel の
                visible "稼働開始"/"完了"/"計画に戻す"/"中止" を aria-label 冒頭固定 (iter1093-1118 sweep)。
                pending "ステータスを変更中…" は visible が変わらないため visible "稼働開始" 等が
                prefix で無い不一致 → visible-prefix で固定。 */}
            {status === 'planning' && (
              <Button
                size="sm"
                className="min-h-11"
                variant="outline"
                disabled={changing}
                aria-busy={changing || undefined}
                onClick={() => onStatusChange('active')}
                data-testid={`sprint-activate-${sprint.id}`}
                aria-label={
                  changing
                    ? `稼働開始 — Sprint「${sprint.name}」のステータスを変更中…`
                    : `稼働開始 — Sprint「${sprint.name}」を稼働開始`
                }
                /* iter2083: state-dependent action button (稼働開始) を sighted hover で
                   Sprint name context disclose (sync-btn iter2081 と同 button hover pattern)。 */
                title={
                  changing
                    ? `稼働開始 — Sprint「${sprint.name}」のステータスを変更中…`
                    : `稼働開始 — Sprint「${sprint.name}」を稼働開始`
                }
              >
                <Play className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                <span aria-hidden="true">稼働開始</span>
              </Button>
            )}
            {status === 'active' && (
              <>
                <Button
                  size="sm"
                  className="min-h-11"
                  variant="outline"
                  disabled={changing}
                  aria-busy={changing || undefined}
                  onClick={() => onStatusChange('completed')}
                  data-testid={`sprint-complete-${sprint.id}`}
                  aria-label={
                    changing
                      ? `完了 — Sprint「${sprint.name}」のステータスを変更中…`
                      : `完了 — Sprint「${sprint.name}」を完了`
                  }
                  /* iter2085: sprint-activate iter2083 と pair、sprint-complete button も
                     state-dependent button hover (Sprint name + state context disclose)。 */
                  title={
                    changing
                      ? `完了 — Sprint「${sprint.name}」のステータスを変更中…`
                      : `完了 — Sprint「${sprint.name}」を完了`
                  }
                >
                  <CheckCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  <span aria-hidden="true">完了</span>
                </Button>
                <Button
                  size="sm"
                  className="min-h-11"
                  variant="outline"
                  disabled={changing}
                  aria-busy={changing || undefined}
                  onClick={() => onStatusChange('planning')}
                  // iter1020 mobile audit で発見: 他 sprint button (complete / cancel /
                  // retro / premortem) には sprint-<verb>-${id} testid あるが「計画に
                  // 戻す」だけ抜けていた divergence。E2E / mobile audit script からの
                  // 安定 locate のために sprint-replan-${id} testid を付与 (verb は
                  // status('planning') 遷移なので "replan")。
                  data-testid={`sprint-replan-${sprint.id}`}
                  aria-label={
                    changing
                      ? `計画に戻す — Sprint「${sprint.name}」のステータスを変更中…`
                      : `計画に戻す — Sprint「${sprint.name}」を計画に戻す`
                  }
                  /* iter2085: sprint-replan も state-dependent button hover。 */
                  title={
                    changing
                      ? `計画に戻す — Sprint「${sprint.name}」のステータスを変更中…`
                      : `計画に戻す — Sprint「${sprint.name}」を計画に戻す`
                  }
                >
                  <Pause className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  <span aria-hidden="true">計画に戻す</span>
                </Button>
              </>
            )}
            {status !== 'cancelled' && status !== 'completed' && (
              <Button
                size="sm"
                className="min-h-11"
                variant="ghost"
                disabled={changing}
                aria-busy={changing || undefined}
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
                  changing
                    ? `中止 — Sprint「${sprint.name}」を中止中…`
                    : `中止 — Sprint「${sprint.name}」を中止`
                }
                /* iter2087: sprint status transition button family 5 個目 (cancel)、
                   sprint-activate iter2083 / sprint-complete + sprint-replan iter2085 と pair。 */
                title={
                  changing
                    ? `中止 — Sprint「${sprint.name}」を中止中…`
                    : `中止 — Sprint「${sprint.name}」を中止`
                }
              >
                <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                <span aria-hidden="true">中止</span>
              </Button>
            )}
            {(status === 'active' || status === 'completed') && (
              <Button
                size="sm"
                className="min-h-11"
                variant="outline"
                disabled={retroPending}
                aria-busy={retroPending || undefined}
                onClick={onRunRetro}
                data-testid={`sprint-retro-${sprint.id}`}
                // iter1038: visible "振り返り生成" を aria-label の prefix に固定し
                // WCAG 2.5.3 satisfy (旧 "振り返り Doc を生成" は "Doc を" 挿入で
                // literal "振り返り生成" substring 不一致)。
                aria-label={
                  retroPending
                    ? `振り返り生成中… — Sprint「${sprint.name}」の振り返りを生成中`
                    : `振り返り生成 — Sprint「${sprint.name}」の振り返り Doc を生成 (PM Agent が完了/未完 items を要約)`
                }
                /* iter2093: 旧 title は静的 "PM Agent が完了/未完 items を要約して Retro Doc を
                   生成" で state-dependent aria-label と divergent + Sprint name 欠落。
                   aria-label と同 text に揃え (wf-trigger iter2091 / theme-toggle iter1971 と
                   同 title-aria 4-path 同期 pattern)。 */
                title={
                  retroPending
                    ? `振り返り生成中… — Sprint「${sprint.name}」の振り返りを生成中`
                    : `振り返り生成 — Sprint「${sprint.name}」の振り返り Doc を生成 (PM Agent が完了/未完 items を要約)`
                }
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                <span aria-hidden="true">{retroPending ? '振り返り生成中…' : '振り返り生成'}</span>
              </Button>
            )}
            {(status === 'planning' || status === 'active') && (
              <Button
                size="sm"
                className="min-h-11"
                variant="outline"
                disabled={premortemPending}
                aria-busy={premortemPending || undefined}
                onClick={onRunPremortem}
                data-testid={`sprint-premortem-${sprint.id}`}
                // iter1038: visible "Pre-mortem 生成" / "Pre-mortem 再生成" を aria-label
                // の prefix に固定し WCAG 2.5.3 satisfy (旧 "Pre-mortem を生成" は
                // "を" 挿入で literal "Pre-mortem 生成" substring 不一致)。
                aria-label={
                  premortemPending
                    ? `Pre-mortem 生成中… — Sprint「${sprint.name}」の Pre-mortem を生成中`
                    : sprint.premortemGeneratedAt
                      ? `Pre-mortem 再生成 — Sprint「${sprint.name}」の Pre-mortem を再生成 (PM Agent が想定リスクと早期警報を Doc にまとめる)`
                      : `Pre-mortem 生成 — Sprint「${sprint.name}」の Pre-mortem を生成 (PM Agent が想定リスクと早期警報を Doc にまとめる)`
                }
                /* iter2095: sprint-retro iter2093 と pair、sprint-premortem も title-aria
                   state-dependent 同期 (3-path)、divergence 修正 sweep の続編。 */
                title={
                  premortemPending
                    ? `Pre-mortem 生成中… — Sprint「${sprint.name}」の Pre-mortem を生成中`
                    : sprint.premortemGeneratedAt
                      ? `Pre-mortem 再生成 — Sprint「${sprint.name}」の Pre-mortem を再生成 (PM Agent が想定リスクと早期警報を Doc にまとめる)`
                      : `Pre-mortem 生成 — Sprint「${sprint.name}」の Pre-mortem を生成 (PM Agent が想定リスクと早期警報を Doc にまとめる)`
                }
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                <span aria-hidden="true">
                  {premortemPending
                    ? 'Pre-mortem 生成中…'
                    : sprint.premortemGeneratedAt
                      ? 'Pre-mortem 再生成'
                      : 'Pre-mortem 生成'}
                </span>
              </Button>
            )}
          </div>
          {status === 'completed' && sprintItems.length > 0 ? (
            <SprintRetroWidget items={sprintItems} sprintEndISO={sprint.endDate} className="mt-2" />
          ) : null}
          {(status === 'active' || status === 'planning') && riskBoardItems.length > 0 ? (
            <SprintRiskBoardWidget items={riskBoardItems} today={todayISO()} className="mt-2" />
          ) : null}
          <SprintSwimlaneDisclosure
            workspaceId={sprint.workspaceId}
            sprintId={sprint.id}
            sprintName={sprint.name}
            sprintStart={sprint.startDate}
            sprintEnd={sprint.endDate}
          />
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
    <Card
      data-testid="sprint-defaults-editor"
      role="region"
      aria-labelledby="sprint-defaults-heading"
    >
      <CardHeader className="pb-2">
        <CardTitle id="sprint-defaults-heading" className="text-sm" role="heading" aria-level={2}>
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
              className="min-h-11"
              onClick={() => setEditing(true)}
              data-testid="sprint-defaults-edit-btn"
              // iter1153: 旧 aria-label `Sprint デフォルト (...) の編集モードを開く` は
              // visible "編集" を中位置 "の**編集**モードを開く" に持ち voice control
              // prefix-matching「click 編集」 match 不可。iter1093-1152 sweep convention
              // に揃え visible "編集" 冒頭固定 + em-dash 区切で descriptive 末尾保持。
              // iter1597: 内部 paren+colon `(現在: X曜開始 / Y 日)` を iter1093-1596 sweep の
              // em-dash 区切に統一。'(' → ' ' (空白)、'現在:' → '現在'、')' → ' ' (空白) で
              // descriptive 維持。
              aria-label={`編集 — Sprint デフォルト 現在 ${DOW_JA[cur.startDow]}曜開始 / ${cur.lengthDays} 日 の編集モードを開く`}
            >
              <span aria-hidden="true">編集</span>
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            noValidate
            aria-label="Sprint デフォルト設定 編集フォーム"
            aria-busy={upd.isPending || undefined}
            /* iter2059: 3 entity create form family iter2045 と pair、Sprint デフォルト編集
               form の用途を sighted hover で disclose (4 form family の 1 個目、edit form)。 */
            title="Sprint デフォルト設定 編集フォーム"
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
                className="min-h-11 rounded-md border px-2 text-sm"
                required
                aria-required="true"
                // iter1194: 旧 aria-label `Sprint 基本曜日 (現在: ${DOW_JA[dow]}曜開始)` は
                // visible (option text "{label}曜") を中位置に持ち voice control
                // prefix-matching「click {曜}」 match 不可 (substring 一致のみ)。
                // src-kind iter1192 / src-method iter1193 同 sweep を sprint-defaults-dow にも展開。
                aria-label={(() => {
                  const visible = `${DOW_JA[dow] ?? dow}曜`
                  return `${visible} — Sprint 基本曜日 (現在: ${visible}開始)`
                })()}
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
                step={1}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="min-h-11 w-20 text-sm"
                required
                aria-required="true"
                // iter1200: 旧 aria-label `Sprint 期間 (日数、1-90、現在: N 日)` は
                // visible Label "期間 (日)" を中位置 "Sprint **期間** (...)" に持ち
                // voice control prefix-matching「click 期間」 match 不可 (substring 一致のみ)。
                // sprint-defaults-dow iter1194 と同 sweep を sprint-defaults-length にも展開。
                // Input は htmlFor Label が visible なので Label text "期間 (日)" を冒頭固定。
                aria-label={
                  length < 1 || length > 90
                    ? `期間 (日) — Sprint 期間 (日数) の有効範囲は 1-90、現在値 ${length} は範囲外`
                    : `期間 (日) — Sprint 期間 (日数、1-90、現在: ${length} 日)`
                }
                aria-invalid={length < 1 || length > 90 || undefined}
                inputMode="numeric"
                enterKeyHint="send"
                data-testid="sprint-defaults-length"
              />
            </div>
            <div
              className="flex gap-1.5"
              role="group"
              /* iter1607: 旧 aria-label paren convention `"Sprint デフォルト編集の操作 (キャンセル / 保存)"` は
                 iter1093-1606 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
              aria-label="Sprint デフォルト編集の操作 — キャンセル / 保存"
            >
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                variant="ghost"
                onClick={() => {
                  setEditing(false)
                  setDow(cur.startDow)
                  setLength(cur.lengthDays)
                }}
                data-testid="sprint-defaults-cancel"
                // iter1103: visible-prefix sweep (iter1093-1102) を sprint-defaults-cancel/save にも展開
                aria-label="キャンセル — Sprint デフォルトの編集を破棄"
              >
                <span aria-hidden="true">キャンセル</span>
              </Button>
              <Button
                type="submit"
                size="sm"
                className="min-h-11"
                disabled={upd.isPending}
                aria-busy={upd.isPending || undefined}
                data-testid="sprint-defaults-save-btn"
                aria-label={
                  upd.isPending
                    ? '保存中… — Sprint デフォルトを保存中'
                    : '保存 — Sprint デフォルト (基本曜日 / 期間) を保存'
                }
              >
                <span aria-hidden="true">{upd.isPending ? '保存中…' : '保存'}</span>
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
