'use client'

/**
 * Phase 6.15 iter117: ワークフロー一覧 + 作成 + 手動 trigger UI (最小)。
 * - 一覧: name / description / enabled / 「実行」/「無効化」/「削除」
 * - 作成: name + description + 空 graph
 * - 手動 trigger: 押下で sync 実行 → 結果 (status / output) を toast に
 *
 * graph 編集 UI (React Flow ベース DAG editor) は次 iter。今は graph は API 経由で更新する。
 */
import { useMemo, useRef, useState } from 'react'

import { ChevronDown, ChevronRight, Pencil, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { formatRunDuration, formatRunTime } from '@/features/workflow/format'
import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useTriggerWorkflow,
  useUpdateWorkflow,
  useWorkflowNodeRuns,
  useWorkflowRuns,
  useWorkflows,
} from '@/features/workflow/hooks'
import { appendNodePreset, NODE_PRESETS } from '@/features/workflow/node-presets'
import { runStatusBadgeClass, runStatusLabel } from '@/features/workflow/run-status'
import type { Workflow, WorkflowRun } from '@/features/workflow/schema'
import { WorkflowGraphSchema, WorkflowTriggerSchema } from '@/features/workflow/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { FocusFormCta } from '@/components/shared/focus-form-cta'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WorkflowGraphCanvas } from '@/components/workflow/workflow-graph-canvas'

interface Props {
  workspaceId: string
}

export function WorkflowsPanel({ workspaceId }: Props) {
  const list = useWorkflows(workspaceId)
  const create = useCreateWorkflow(workspaceId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function handleCreate() {
    const n = name.trim()
    if (!n) return
    try {
      await create.mutateAsync({
        workspaceId,
        name: n,
        description: description.trim(),
        graph: { nodes: [], edges: [] },
        trigger: { kind: 'manual' },
      })
      setName('')
      setDescription('')
      toast.success('Workflow を作成しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗')
    }
  }

  return (
    <section
      className="space-y-6"
      data-testid="workflows-panel"
      aria-label="Workflow 一覧と新規作成"
      /* iter2069: section 全体に title を付与し sighted hover で section 用途 disclose、
         team-capacity section iter2053 と同 section landmark hover summary pattern。 */
      title="Workflow 一覧と新規作成"
    >
      <Card role="region" aria-labelledby="workflows-new-heading">
        <CardHeader>
          <CardTitle id="workflows-new-heading" className="text-base" role="heading" aria-level={2}>
            新規 Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            noValidate
            aria-label="Workflow 作成フォーム"
            /* iter2045: create form 全体に title を付与 (3 entity create form family の 3 個目で完備)。 */
            title="Workflow 作成フォーム"
            aria-busy={create.isPending || undefined}
            data-testid="create-workflow-form"
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="wf-name">名前</Label>
              <IMEInput
                id="wf-name"
                className="h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 朝の Slack 通知"
                required
                aria-required="true"
                aria-invalid={(name.length > 0 && name.trim() === '') || undefined}
                minLength={1}
                maxLength={200}
                autoComplete="off"
                enterKeyHint="next"
                // iter1203: 旧 aria-label `Workflow 名前 (...)` (全 4 path) は visible
                // Label "名前" を中位置 "Workflow **名前** (...)" に持ち voice control
                // prefix-matching「click 名前」 match 不可 (substring 一致のみ)。
                // p-title iter1201 と同 sweep を wf-name にも展開。Input は htmlFor
                // Label が visible なので Label text "名前" を冒頭固定 + em-dash 区切。
                aria-label={
                  name.length === 0
                    ? '名前 — Workflow 名前 (必須、最大 200 文字、何を自動化するか分かる名前)'
                    : name.trim() === ''
                      ? `名前 — Workflow 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`
                      : name.length > 180
                        ? `名前 — Workflow 名前 (現在 ${name.length} / 200 文字、上限近接)`
                        : `名前 — Workflow 名前 (現在 ${name.length} / 200 文字)`
                }
                /* iter1975: state-dependent aria-label (空 / 空白のみ / 上限近接 / 通常) は
                   SR のみ伝達、title で sighted hover disclose (iter1969/1973 comment-thread /
                   iter1967 period-goal と同 state-dependent input pattern)。 */
                title={
                  name.length === 0
                    ? '名前 — Workflow 名前 (必須、最大 200 文字、何を自動化するか分かる名前)'
                    : name.trim() === ''
                      ? `名前 — Workflow 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`
                      : name.length > 180
                        ? `名前 — Workflow 名前 (現在 ${name.length} / 200 文字、上限近接)`
                        : `名前 — Workflow 名前 (現在 ${name.length} / 200 文字)`
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wf-desc">説明 (任意、Cmd/Ctrl+Enter で作成)</Label>
              <Textarea
                id="wf-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                // iter329: Cmd/Ctrl+Enter で作成 (iter313-318 続編、Textarea Cmd+Enter sweep)。
                // form 内 Textarea でも default Enter は改行のため modifier 必須。
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    name.trim() &&
                    !create.isPending
                  ) {
                    e.preventDefault()
                    void handleCreate()
                  }
                }}
                rows={2}
                maxLength={2000}
                placeholder="この workflow が何を自動化するか"
                aria-keyshortcuts="Meta+Enter Control+Enter"
                // iter1203: 旧 aria-label `Workflow の説明 (...)` (全 3 path) は visible
                // Label "説明 (任意、Cmd/Ctrl+Enter で作成)" を中位置 "Workflow の **説明**
                // (...)" に持ち voice control prefix-matching「click 説明」 match 不可
                // (substring 一致のみ)。wf-name と同 sweep を wf-desc にも展開。Textarea
                // は htmlFor Label が visible なので Label text "説明" を冒頭固定。
                aria-label={
                  description.length === 0
                    ? '説明 — Workflow の説明 (任意、最大 2000 文字、Cmd/Ctrl+Enter で作成)'
                    : description.length > 1900
                      ? `説明 — Workflow の説明 (現在 ${description.length} / 2000 文字、上限近接、Cmd/Ctrl+Enter で作成)`
                      : `説明 — Workflow の説明 (現在 ${description.length} / 2000 文字、Cmd/Ctrl+Enter で作成)`
                }
                /* iter1977: wf-name iter1975 と pair、wf-desc も state-dependent aria-label の
                   sighted hover disclose、workflows-panel 内 2 input/textarea sweep 完備。 */
                title={
                  description.length === 0
                    ? '説明 — Workflow の説明 (任意、最大 2000 文字、Cmd/Ctrl+Enter で作成)'
                    : description.length > 1900
                      ? `説明 — Workflow の説明 (現在 ${description.length} / 2000 文字、上限近接、Cmd/Ctrl+Enter で作成)`
                      : `説明 — Workflow の説明 (現在 ${description.length} / 2000 文字、Cmd/Ctrl+Enter で作成)`
                }
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                className="min-h-11"
                disabled={!name.trim() || create.isPending}
                aria-busy={create.isPending || undefined}
                data-testid="wf-create-btn"
                aria-keyshortcuts="Meta+Enter Control+Enter"
                // iter1118: visible "作成" / "作成中…" を aria-label 冒頭固定 (iter1093-1117 sweep)。
                // empty-title は維持。
                // iter1172: iter1118 sweep の not-trim path 漏れ — 旧 'Workflow を作成するには
                // 名前を入力してください' は visible "作成" を中位置 "Workflow を **作成** するには…"
                // に持ち voice control prefix-matching「click 作成」 match 不可
                // (iter1169/1170/1171 と同 sweep 残漏 pattern)。
                aria-label={
                  !name.trim()
                    ? '作成 — Workflow を作成するには名前を入力してください'
                    : create.isPending
                      ? '作成中… — Workflow を作成中'
                      : '作成 — Workflow を新規作成 (Cmd/Ctrl+Enter でも可)'
                }
                // iter1811: iter1809 sprint/goal / template と pair で creation 5 entity 全 hover disclosure 完備。
                title={
                  !name.trim()
                    ? '作成 — Workflow を作成するには名前を入力してください'
                    : create.isPending
                      ? '作成中… — Workflow を作成中'
                      : '作成 — Workflow を新規作成 (Cmd/Ctrl+Enter でも可)'
                }
              >
                <span aria-hidden="true">{create.isPending ? '作成中…' : '作成'}</span>
              </Button>
            </div>
          </form>
          <p className="text-muted-foreground mt-2 text-[11px]">
            graph (nodes / edges) の編集 UI は次 iter で React Flow を実装予定。 現状は空 graph
            で作成し、API 経由で更新できる。
          </p>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState
          message={isAppError(list.error) ? list.error.message : '一覧取得に失敗'}
          onRetry={() => void list.refetch()}
        />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          title="Workflow がありません"
          // iter281 basics: 旧説明 (`上のフォームから作成してください`) は単なる行動指示で
          // Workflow が何ができるかが見えなかった → ユースケース 3 種 (item 作成 → Slack 通知、
          // 朝の brief 生成、毎日 reminder) を <code> chip で示し、最小ビルド (1 noop ノード)
          // から育てる粒度を伝える。Today (iter273) / Inbox (iter276) と同パターン。
          description={
            <span>
              用途例:{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">
                item 作成 → Slack 通知
              </code>{' '}
              /{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">
                朝の brief 生成
              </code>{' '}
              /{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">
                毎日 reminder
              </code>
              。 まず空 graph で作成し、後から graph editor で node / edge を追加します。
            </span>
          }
          action={<FocusFormCta targetId="wf-name" testId="workflows-empty-create" />}
        />
      ) : (
        <ul
          className="space-y-3"
          data-testid="workflows-list"
          aria-label={`Workflow 一覧 — ${list.data!.length} 件`}
          /* iter2189: Workflow 一覧 ul の aria-label "Workflow 一覧 — N 件" は browser
             tooltip にならず sighted は hover で件数 context disclose 不可。
             active-timer-ops iter2187 / BulkHeaderCheckbox iter2185 と同 title=aria-label
             sync pattern。 */
          title={`Workflow 一覧 — ${list.data!.length} 件`}
        >
          {list.data!.map((wf) => (
            <li key={wf.id}>
              <WorkflowCard workspaceId={workspaceId} wf={wf} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function WorkflowCard({ workspaceId, wf }: { workspaceId: string; wf: Workflow }) {
  const update = useUpdateWorkflow(workspaceId)
  const del = useDeleteWorkflow(workspaceId)
  const trigger = useTriggerWorkflow()
  const nodeCount = (wf.graph as { nodes?: unknown[] }).nodes?.length ?? 0
  const triggerKind = (wf.trigger as { kind?: string }).kind ?? 'manual'
  const [editorOpen, setEditorOpen] = useState(false)
  const [runsOpen, setRunsOpen] = useState(false)

  async function toggleEnabled() {
    try {
      await update.mutateAsync({
        id: wf.id,
        expectedVersion: wf.version,
        patch: { enabled: !wf.enabled },
      })
      toast.success(wf.enabled ? '無効化しました' : '有効化しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '更新に失敗')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Workflow「${wf.name}」を削除しますか?`)) return
    try {
      await del.mutateAsync(wf.id)
      toast.success('削除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '削除に失敗')
    }
  }

  async function handleTrigger() {
    if (nodeCount === 0) {
      toast.error('node が無い workflow は実行できません')
      return
    }
    try {
      const r = await trigger.mutateAsync({ workflowId: wf.id })
      if (r.status === 'succeeded') {
        toast.success(`実行成功 (run ${r.runId.slice(0, 8)})`)
      } else {
        toast.error(`実行失敗: ${r.error ?? 'unknown'}`)
      }
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '実行に失敗')
    }
  }

  return (
    <Card
      data-testid={`wf-card-${wf.id}`}
      role="region"
      aria-labelledby={`wf-card-heading-${wf.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* iter1740: truncate で長 workflow name 切れ、aria-label 無し、sighted は hover で
                全 name 見れない。title 付与で sighted hover → 全 wf.name disclose
                (iter1720-1739 sweep を workflow card にも展開、iter1739 sprints/goals と同 pattern)。 */}
            <CardTitle
              id={`wf-card-heading-${wf.id}`}
              className="truncate text-base"
              role="heading"
              aria-level={3}
              title={wf.name}
            >
              {wf.name}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">
              trigger: {triggerKind} · nodes: {nodeCount} · {wf.enabled ? '有効' : '無効'}
            </p>
            {wf.description && (
              // iter1769: wf.description は line-clamp-2 で 2 行超切れ、title 無で sighted は
              // hover で全 description 見れず。title 付与で iter1755 sprints/goals / iter1756
              // decompose と同 line-clamp + title pattern を workflows にも展開。
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs" title={wf.description}>
                {wf.description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          /* iter1581: paren convention の `(現在:` を iter1578-1580 operations group sweep に
             合わせ em-dash 区切に統一。visible 冒頭 "Workflow「${name}」" は維持。 */
          aria-label={`Workflow「${wf.name}」の操作 — 現在 ${wf.enabled ? '有効' : '無効'}、実行 / 編集 / 有効化切替 / 削除`}
          /* iter2031: group 全体に title を付与し sighted hover で Workflow 名 + 現在 enabled
             state + operations 構成 disclose (decompose-proposals bulk group iter1997 と同
             group landmark summary pattern)。 */
          title={`Workflow「${wf.name}」の操作 — 現在 ${wf.enabled ? '有効' : '無効'}、実行 / 編集 / 有効化切替 / 削除`}
        >
          <Button
            size="sm"
            className="min-h-11"
            variant="outline"
            onClick={() => void handleTrigger()}
            disabled={!wf.enabled || trigger.isPending}
            aria-busy={trigger.isPending || undefined}
            data-testid={`wf-run-${wf.id}`}
            // iter1116: wf-trigger / wf-edit / wf-toggle / wf-runs-toggle の旧 aria-label は visible
            // "実行"/"実行中…"/"編集"/"無効化"/"有効化"/"履歴" を末尾持ちで voice control prefix-matching
            // match 不可。iter1093-1115 sweep convention に合わせ visible 冒頭固定。
            // iter1165: wf-trigger の !wf.enabled / nodeCount===0 path は iter1116 で
            // 漏れていた (visible "実行" を末尾 "実行不可" に持ち prefix-match 不可)。
            // visible "実行" 冒頭固定 + em-dash 区切で descriptive 末尾保持。
            aria-label={
              !wf.enabled
                ? `実行 — Workflow「${wf.name}」は無効化中のため実行不可`
                : nodeCount === 0
                  ? `実行 — Workflow「${wf.name}」は node が無いため実行不可`
                  : trigger.isPending
                    ? `実行中… — Workflow「${wf.name}」を実行中`
                    : `実行 — Workflow「${wf.name}」を手動で sync 実行 (各 node 10-60s timeout)`
            }
            /* iter2091: 旧 title は 2-path (nodeCount===0 / else) で aria-label の 4-path
               (disabled / no-node / pending / normal) と divergent、Workflow name context も
               欠落。aria-label と同 4-path text に揃え SR ↔ sighted hover vocab 一致
               (theme-toggle iter1971 と同 title-aria divergence 修正 pattern)。 */
            title={
              !wf.enabled
                ? `実行 — Workflow「${wf.name}」は無効化中のため実行不可`
                : nodeCount === 0
                  ? `実行 — Workflow「${wf.name}」は node が無いため実行不可`
                  : trigger.isPending
                    ? `実行中… — Workflow「${wf.name}」を実行中`
                    : `実行 — Workflow「${wf.name}」を手動で sync 実行 (各 node 10-60s timeout)`
            }
          >
            <Play className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            <span aria-hidden="true">{trigger.isPending ? '実行中…' : '実行'}</span>
          </Button>
          {/* iter1813: iter1809 sprint/goal / iter1811 template/wf-create と同 pattern を
              wf-edit/toggle/runs-toggle/delete 4 button family にも展開、wf-* button group
              全 hover disclosure 完備。 */}
          <Button
            size="sm"
            className="min-h-11"
            variant="outline"
            onClick={() => setEditorOpen(true)}
            data-testid={`wf-edit-${wf.id}`}
            aria-label={`編集 — Workflow「${wf.name}」の graph / trigger を編集`}
            title={`編集 — Workflow「${wf.name}」の graph / trigger を編集`}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            <span aria-hidden="true">編集</span>
          </Button>
          <Button
            size="sm"
            className="min-h-11"
            variant="ghost"
            onClick={() => void toggleEnabled()}
            disabled={update.isPending}
            aria-busy={update.isPending || undefined}
            data-testid={`wf-toggle-${wf.id}`}
            // iter1165: wf-toggle pending path は iter1116 で漏れ — 旧
            // `Workflow「name」の状態を更新中…` は visible "無効化"/"有効化" を
            // 含まず substring 一致すら不可 (WCAG 2.5.3 Label in Name 違反)。
            // wf.enabled 別に visible 冒頭固定 + em-dash 区切で分岐。
            aria-label={
              update.isPending
                ? wf.enabled
                  ? `無効化 — Workflow「${wf.name}」の状態を更新中…`
                  : `有効化 — Workflow「${wf.name}」の状態を更新中…`
                : wf.enabled
                  ? `無効化 — Workflow「${wf.name}」を無効化`
                  : `有効化 — Workflow「${wf.name}」を有効化`
            }
            title={
              update.isPending
                ? wf.enabled
                  ? `無効化 — Workflow「${wf.name}」の状態を更新中…`
                  : `有効化 — Workflow「${wf.name}」の状態を更新中…`
                : wf.enabled
                  ? `無効化 — Workflow「${wf.name}」を無効化`
                  : `有効化 — Workflow「${wf.name}」を有効化`
            }
          >
            <span aria-hidden="true">{wf.enabled ? '無効化' : '有効化'}</span>
          </Button>
          <Button
            size="sm"
            className="min-h-11"
            variant="ghost"
            onClick={() => setRunsOpen((v) => !v)}
            aria-expanded={runsOpen}
            /* iter1645: controlled `<div id={`wf-runs-${wf.id}`}>` は `{runsOpen && (...)}`
               条件下のみ render される。runsOpen 時のみ aria-controls 設定で dangling 回避
               (iter1637/iter1645 sweep)。 */
            aria-controls={runsOpen ? `wf-runs-${wf.id}` : undefined}
            aria-label={
              runsOpen
                ? `履歴 — Workflow「${wf.name}」の実行履歴 (直近 5 件) を閉じる`
                : `履歴 — Workflow「${wf.name}」の実行履歴 (直近 5 件) を表示`
            }
            title={
              runsOpen
                ? `履歴 — Workflow「${wf.name}」の実行履歴 (直近 5 件) を閉じる`
                : `履歴 — Workflow「${wf.name}」の実行履歴 (直近 5 件) を表示`
            }
            data-testid={`wf-runs-toggle-${wf.id}`}
          >
            {runsOpen ? (
              <ChevronDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span aria-hidden="true">履歴</span>
          </Button>
          <Button
            size="sm"
            // iter1028: icon-only Button は size="sm" + min-h-11 で高さ 44 OK だが
            // 幅 36px < 44 で WCAG 2.5.5 違反 (iter1024 active-timer-pause/pip と
            // 同 hazard)。min-w-11 で両軸 satisfy。
            className="min-h-11 min-w-11"
            variant="ghost"
            onClick={() => void handleDelete()}
            disabled={del.isPending}
            aria-busy={del.isPending || undefined}
            data-testid={`wf-delete-${wf.id}`}
            // iter1215: 旧 aria-label は visible 概念名 "削除" を末尾 ("Workflow「name」を **削除**")
            // に持ち voice control prefix-matching「click 削除」 match 不可 (icon-only Trash2
            // で visible text 無、title attribute も無し)。src-delete と同 sweep を wf-delete
            // にも展開。概念名 "削除" / "削除中…" を aria-label 冒頭固定 + em-dash 区切。
            // iter1813: icon-only Trash2 で sighted は hover で何の操作か即把握できなかった。
            // title 付与で sighted hover で delete context (workflow name) disclose。
            aria-label={
              del.isPending
                ? `削除中… — Workflow「${wf.name}」を削除中`
                : `削除 — Workflow「${wf.name}」を削除`
            }
            title={
              del.isPending
                ? `削除中… — Workflow「${wf.name}」を削除中`
                : `削除 — Workflow「${wf.name}」を削除`
            }
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
          </Button>
        </div>
        {runsOpen && (
          <div id={`wf-runs-${wf.id}`} className="mt-3" data-testid={`wf-runs-${wf.id}`}>
            <WorkflowRunHistory workflowId={wf.id} />
          </div>
        )}
      </CardContent>
      <WorkflowEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        wf={wf}
        onSave={async (graph, triggerVal) => {
          await update.mutateAsync({
            id: wf.id,
            expectedVersion: wf.version,
            patch: { graph, trigger: triggerVal },
          })
        }}
      />
    </Card>
  )
}

interface EditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wf: Workflow
  onSave: (
    graph: ReturnType<typeof WorkflowGraphSchema.parse>,
    trigger: ReturnType<typeof WorkflowTriggerSchema.parse>,
  ) => Promise<void>
}

function WorkflowEditorDialog({ open, onOpenChange, wf, onSave }: EditorProps) {
  const [graphText, setGraphText] = useState(() => JSON.stringify(wf.graph, null, 2))
  const [triggerText, setTriggerText] = useState(() => JSON.stringify(wf.trigger, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // iter1413: controlled dialog (DialogTrigger 無し) で閉じた後 focus が <body> に落ちる
  // (WCAG 2.4.3、iter1411/1412 と同根)。opener を捕捉し close 時に復帰させる。
  const openerRef = useRef<HTMLElement | null>(null)

  // iter (queue: workflow graphical 段階 A): 視覚プレビュー用に graphText を best-effort で
  // parse。失敗 (編集中の不正 JSON) なら直前の有効な graph を表示し続ける (= viewer は
  // breaking しない)。
  const previewGraph = useMemo(() => {
    try {
      return WorkflowGraphSchema.parse(JSON.parse(graphText))
    } catch {
      return wf.graph as ReturnType<typeof WorkflowGraphSchema.parse>
    }
  }, [graphText, wf.graph])

  // dialog が再 open されたら最新 wf 値で初期化 (前回の編集中値を残さない)
  if (open && wf.updatedAt) {
    // no-op — 初期値は useState の lazy init で設定済。再 open 時は意図的に保持する。
  }

  async function handleSave() {
    setError(null)
    let graph
    let triggerVal
    try {
      graph = WorkflowGraphSchema.parse(JSON.parse(graphText))
    } catch (e) {
      setError(`graph JSON 不正: ${e instanceof Error ? e.message : String(e)}`)
      return
    }
    try {
      triggerVal = WorkflowTriggerSchema.parse(JSON.parse(triggerText))
    } catch (e) {
      setError(`trigger JSON 不正: ${e instanceof Error ? e.message : String(e)}`)
      return
    }
    setSaving(true)
    try {
      await onSave(graph, triggerVal)
      toast.success('Workflow を保存しました')
      onOpenChange(false)
    } catch (e) {
      const msg = isAppError(e) ? e.message : '保存に失敗'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        data-testid={`wf-editor-dialog-${wf.id}`}
        onOpenAutoFocus={() => {
          const active = document.activeElement
          openerRef.current =
            active instanceof HTMLElement && active !== document.body ? active : null
        }}
        onCloseAutoFocus={(e) => {
          const opener = openerRef.current
          if (opener && opener.isConnected) {
            e.preventDefault()
            opener.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Workflow 編集 — {wf.name}</DialogTitle>
          <DialogDescription>
            graph を JSON で編集 (上の視覚プレビューに即時反映)。zod スキーマで保存時にバリデー
            ション。drag&drop での edit は段階 B で実装予定。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">視覚プレビュー (read-only、JSON 編集に追従)</Label>
            <WorkflowGraphCanvas
              graph={previewGraph}
              className="h-56"
              testId={`wf-editor-canvas-${wf.id}`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`wf-editor-graph-${wf.id}`}>
              graph ({'{ nodes: [...], edges: [...] }'})
            </Label>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              /* iter1593: 旧 aria-label paren convention `"node 追加プリセット (X 種、graph JSON に skeleton を 1 click 投入)"` は
                 iter1093-1592 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
              aria-label={`node 追加プリセット — ${NODE_PRESETS.length} 種、graph JSON に skeleton を 1 click 投入`}
              /* iter2141: node 追加プリセット group の aria-label は browser tooltip にならず
                 sighted は hover で preset count + 用途 context disclose 不可。
                 subtask-group iter2139 / budget-edit-ops iter2137 と同 title=aria-label
                 sync pattern。 */
              title={`node 追加プリセット — ${NODE_PRESETS.length} 種、graph JSON に skeleton を 1 click 投入`}
            >
              {NODE_PRESETS.map((preset) => (
                <Button
                  key={preset.type}
                  type="button"
                  size="sm"
                  className="min-h-11"
                  variant="outline"
                  onClick={() => setGraphText(appendNodePreset(graphText, preset))}
                  data-testid={`wf-node-preset-${preset.type}-${wf.id}`}
                  title={preset.title}
                  // iter1035: visible "+ ${type}" を aria-label の prefix に固定し
                  // WCAG 2.5.3 Label in Name satisfy (voice control 「click + noop」 で
                  // accessible name に literal "+ noop" substring 必要)。
                  aria-label={`+ ${preset.type} — graph に ${preset.title} の skeleton node を追加`}
                >
                  <span aria-hidden="true">+ {preset.type}</span>
                </Button>
              ))}
            </div>
            <Textarea
              id={`wf-editor-graph-${wf.id}`}
              value={graphText}
              onChange={(e) => setGraphText(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              data-testid={`wf-editor-graph-${wf.id}`}
              aria-label={
                graphText.length === 0
                  ? 'graph JSON (workflow の node 定義を JSON で記述、上のプリセット button で skeleton 追加可)'
                  : error?.startsWith('graph JSON 不正')
                    ? `graph JSON (現在 ${graphText.length} 文字、JSON parse error あり)`
                    : `graph JSON (現在 ${graphText.length} 文字、node 定義 JSON)`
              }
              /* iter2357: wf-editor-graph textarea の aria-label は state-dependent 3-path
                 (空 / parse-error / 通常、文字数含む) で SR には full context (= プリセット
                 button hint + JSON parse error 警告) を渡すが browser tooltip にならず
                 sighted は hover で同 context disclose 不可。editDescription iter2297 /
                 edit-item-dod iter2355 と同 textarea title-aria 3-path sync pattern を
                 wf-editor-graph にも展開、workflow editor graph JSON 入力 form hint 補完。 */
              title={
                graphText.length === 0
                  ? 'graph JSON (workflow の node 定義を JSON で記述、上のプリセット button で skeleton 追加可)'
                  : error?.startsWith('graph JSON 不正')
                    ? `graph JSON (現在 ${graphText.length} 文字、JSON parse error あり)`
                    : `graph JSON (現在 ${graphText.length} 文字、node 定義 JSON)`
              }
              aria-invalid={error?.startsWith('graph JSON 不正') || undefined}
              aria-describedby={error ? `wf-editor-error-${wf.id}` : undefined}
            />
            <p className="text-muted-foreground text-[10px]">
              プリセット button で skeleton node を JSON に追加できます (id は自動 unique 化、 node
              type 詳細は registry.ts)
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`wf-editor-trigger-${wf.id}`}>
              trigger ({'{ kind: "manual" | "cron" | "item-event" | "webhook" }'})
            </Label>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              /* iter1595: 旧 aria-label paren convention `"trigger プリセット (4 種: manual / cron / item-event / webhook、JSON に 1 click 投入)"` は
                 iter1093-1594 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、内部 colon は space、closing ')' は削除。 */
              aria-label="trigger プリセット — 4 種 manual / cron / item-event / webhook、JSON に 1 click 投入"
              /* iter2143: trigger プリセット group の aria-label は browser tooltip にならず
                 sighted は hover で 4 trigger kind + 用途 context disclose 不可。
                 wf-node-presets iter2141 / subtask-group iter2139 と同 title=aria-label
                 sync pattern。 */
              title="trigger プリセット — 4 種 manual / cron / item-event / webhook、JSON に 1 click 投入"
            >
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                variant="outline"
                onClick={() => setTriggerText(JSON.stringify({ kind: 'manual' }, null, 2))}
                data-testid={`wf-trigger-preset-manual-${wf.id}`}
                title="手動 trigger 専用 (実行 button から起動)"
                // iter1117: visible "manual"/"cron"/"item-event"/"webhook" を aria-label 冒頭固定
                // (iter1093-1116 sweep)。旧 aria-label は visible 中位置持ちで prefix-matching 不可。
                aria-label="manual — trigger を manual (手動実行のみ) に切替"
              >
                <span aria-hidden="true">manual</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                variant="outline"
                onClick={() =>
                  setTriggerText(JSON.stringify({ kind: 'cron', cron: '0 9 * * *' }, null, 2))
                }
                data-testid={`wf-trigger-preset-cron-${wf.id}`}
                title="cron trigger (例: 毎日 09:00)"
                aria-label="cron — trigger を cron (毎日 09:00 等) に切替"
              >
                <span aria-hidden="true">cron</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                variant="outline"
                onClick={() =>
                  setTriggerText(
                    JSON.stringify({ kind: 'item-event', event: 'create', filter: {} }, null, 2),
                  )
                }
                data-testid={`wf-trigger-preset-item-event-${wf.id}`}
                title="item-event (create / update / status_change / complete)"
                aria-label="item-event — trigger を item-event (create / update / status_change / complete) に切替"
              >
                <span aria-hidden="true">item-event</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                variant="outline"
                onClick={() =>
                  setTriggerText(
                    JSON.stringify(
                      {
                        kind: 'webhook',
                        secret: crypto.randomUUID().replace(/-/g, '').slice(0, 24),
                      },
                      null,
                      2,
                    ),
                  )
                }
                data-testid={`wf-trigger-preset-webhook-${wf.id}`}
                title="webhook trigger (POST /api/workflows/webhook/<secret>)"
                aria-label="webhook — trigger を webhook (POST /api/workflows/webhook/<secret>) に切替"
              >
                <span aria-hidden="true">webhook</span>
              </Button>
            </div>
            <Textarea
              id={`wf-editor-trigger-${wf.id}`}
              value={triggerText}
              onChange={(e) => setTriggerText(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              data-testid={`wf-editor-trigger-${wf.id}`}
              aria-label={
                triggerText.length === 0
                  ? 'trigger JSON (manual / cron / item-event / webhook の 4 種、上のプリセット button で template 挿入可)'
                  : error?.startsWith('trigger JSON 不正')
                    ? `trigger JSON (現在 ${triggerText.length} 文字、JSON parse error あり)`
                    : `trigger JSON (現在 ${triggerText.length} 文字、起動条件 JSON)`
              }
              /* iter2359: wf-editor-trigger textarea の aria-label は state-dependent
                 3-path (空 / parse-error / 通常、文字数含む) で SR には full context
                 (= 4 種類 trigger hint + JSON parse error 警告) を渡すが browser tooltip
                 にならず sighted は hover で同 context disclose 不可。wf-editor-graph
                 iter2357 と pair で workflow editor 2 textarea (graph / trigger) family
                 完成、editor 内 form hint hover disclose 補完。 */
              title={
                triggerText.length === 0
                  ? 'trigger JSON (manual / cron / item-event / webhook の 4 種、上のプリセット button で template 挿入可)'
                  : error?.startsWith('trigger JSON 不正')
                    ? `trigger JSON (現在 ${triggerText.length} 文字、JSON parse error あり)`
                    : `trigger JSON (現在 ${triggerText.length} 文字、起動条件 JSON)`
              }
              aria-invalid={error?.startsWith('trigger JSON 不正') || undefined}
              aria-describedby={error ? `wf-editor-error-${wf.id}` : undefined}
            />
            <p className="text-muted-foreground text-[10px]">
              プリセット button で typical な JSON を流し込めます (cron は毎日 09:00、 webhook は
              random secret、item-event は create + 空 filter)。
            </p>
          </div>
          {error && (
            <p
              id={`wf-editor-error-${wf.id}`}
              className="text-destructive text-xs"
              role="alert"
              data-testid={`wf-editor-error-${wf.id}`}
            >
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          {/* iter1108: visible-prefix sweep (iter1093-1107) を workflow editor cancel/save にも展開。
              旧 aria-label は visible "キャンセル" / "保存" / "保存中…" を末尾持ち、prefix-matching 不可。 */}
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            data-testid={`wf-editor-cancel-${wf.id}`}
            aria-label={`キャンセル — Workflow「${wf.name}」の編集を破棄`}
            /* iter2415: wf-editor cancel + 隣 save 両 button の aria-label は SR に full
               context (workflow.name 含む dynamic 破棄 / 保存 action) を渡すが browser
               tooltip にならず sighted は hover で disclose 不可。sprint-defaults cancel/save
               iter2363 / sprint-period cancel/save iter2351 / goal status transition iter2365 と
               同 pair button title pattern を wf-editor cancel/save にも展開、Workflow
               editor dialog の cancel/save 2 button family 完成。 */
            title={`キャンセル — Workflow「${wf.name}」の編集を破棄`}
          >
            <span aria-hidden="true">キャンセル</span>
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={saving}
            aria-busy={saving || undefined}
            onClick={() => void handleSave()}
            data-testid={`wf-editor-save-${wf.id}`}
            aria-label={
              saving
                ? `保存中… — Workflow「${wf.name}」の編集を保存中`
                : `保存 — Workflow「${wf.name}」の graph / trigger を保存`
            }
            /* iter2415: state-dependent 2-path (pending / idle) も title sync。 */
            title={
              saving
                ? `保存中… — Workflow「${wf.name}」の編集を保存中`
                : `保存 — Workflow「${wf.name}」の graph / trigger を保存`
            }
          >
            <span aria-hidden="true">{saving ? '保存中…' : '保存'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Phase 6.15 iter120: Workflow の直近 5 件の run 履歴。
 * status / triggerKind / 開始時刻 / duration を tabular-nums で表示。
 *
 * Phase 6.15 iter137: 各 run 行を expander にして node_runs (input / output /
 * error / duration) を disclosure で展開表示。失敗 run の原因を画面で追える。
 */
function WorkflowRunHistory({ workflowId }: { workflowId: string }) {
  const q = useWorkflowRuns(workflowId)
  const trigger = useTriggerWorkflow()
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  if (q.isLoading) {
    return (
      <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
        読み込み中…
      </p>
    )
  }
  if (q.error) {
    return (
      <p className="text-destructive text-xs" role="alert">
        履歴の取得に失敗
      </p>
    )
  }
  const runs = q.data ?? []
  if (runs.length === 0) {
    // iter298 basics: 旧「まだ実行履歴がありません」だけでは「どう動かすのか」が
    // 伝わらなかった → 上の `▶ 実行` button で 1 回起動 / cron schedule で自動起動
    // の 2 経路を示す。失敗 / 成功 / 各 node の duration が下に並ぶことも示唆。
    return (
      <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
        まだ実行履歴がありません。 上の{' '}
        <code className="bg-muted text-foreground rounded px-1">▶ 実行</code> button
        で手動起動、または schedule (cron) を設定すると自動起動。 各 run の状態 (queued / running /
        succeeded / failed) と node 別 duration がここに並びます。
      </p>
    )
  }
  async function handleRerun(r: WorkflowRun) {
    try {
      const res = await trigger.mutateAsync({ workflowId: r.workflowId, input: r.input })
      if (res.status === 'succeeded') {
        toast.success(`再実行成功 (run ${res.runId.slice(0, 8)})`)
      } else {
        toast.error(`再実行失敗: ${res.error ?? 'unknown'}`)
      }
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '再実行に失敗')
    }
  }
  return (
    <ul
      className="divide-y rounded border text-xs"
      data-testid={`wf-runs-list-${workflowId}`}
      /* iter1586: 旧 aria-label paren convention `"直近の実行履歴 X 件 (最新順)"` は iter1093-1585
         sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
      aria-label={`直近の実行履歴 ${runs.length} 件 — 最新順`}
      /* iter2417: wf-runs-list <ul> の aria-label "直近の実行履歴 N 件 — 最新順" は SR に
         list landmark (件数 + 並び順) を渡すが browser tooltip にならず sighted は hover で
         同 list landmark summary 把握不可。src-imports-list iter2405 / Sprint 一覧 ul iter2193 /
         KR 一覧 ul iter2329 と同 list family title pattern を wf-runs-list にも展開、
         Workflow 詳細 panel 実行履歴 hover disclose 補完、src-imports + wf-runs で「直近の N件
         — 最新順」 history list family pattern 2 element 完成。 */
      title={`直近の実行履歴 ${runs.length} 件 — 最新順`}
    >
      {runs.map((r) => {
        const isOpen = expandedRunId === r.id
        return (
          <li key={r.id} className="flex items-stretch" data-testid={`wf-run-row-${r.id}`}>
            <div className="flex-1">
              <button
                type="button"
                className="hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center gap-2 px-2 py-1.5 text-left focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => setExpandedRunId(isOpen ? null : r.id)}
                aria-expanded={isOpen}
                /* iter1645: controlled div は `{isOpen && (...)}` 条件下のみ render される。
                   isOpen 時のみ aria-controls 設定で dangling 回避 (iter1637/iter1645 sweep)。 */
                aria-controls={isOpen ? `wf-run-nodes-${r.id}` : undefined}
                /* iter1555: 旧 `のノード詳細を{閉じる|表示}` は ' を' 助詞接続で iter1093-1554
                   sweep の em-dash 区切と divergent。operation-board disclosure (iter1547) と
                   同 pattern で em-dash 化。visible prefix `${triggerKind} 実行 (${time})` は維持。 */
                aria-label={
                  isOpen
                    ? `${r.triggerKind} 実行 (${formatRunTime(r)}) — ノード詳細を閉じる`
                    : `${r.triggerKind} 実行 (${formatRunTime(r)}) — ノード詳細を表示`
                }
                data-testid={`wf-run-toggle-${r.id}`}
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <RunStatusBadge status={r.status} />
                <span className="text-muted-foreground" aria-hidden="true">
                  {r.triggerKind}
                </span>
                <time
                  className="text-muted-foreground tabular-nums"
                  dateTime={
                    r.startedAt instanceof Date ? r.startedAt.toISOString() : (r.startedAt ?? '')
                  }
                  aria-hidden="true"
                >
                  {formatRunTime(r)}
                </time>
                <span className="text-muted-foreground ml-auto tabular-nums" aria-hidden="true">
                  {formatRunDuration(r)}
                </span>
              </button>
              {isOpen && (
                <div id={`wf-run-nodes-${r.id}`} className="bg-muted/20 border-t px-2 py-2">
                  <WorkflowNodeRunsList runId={r.id} />
                </div>
              )}
            </div>
            <button
              type="button"
              className="hover:bg-muted/50 text-muted-foreground hover:text-foreground focus-visible:ring-ring flex shrink-0 items-center gap-1 border-l px-2 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
              disabled={trigger.isPending}
              aria-busy={trigger.isPending || undefined}
              onClick={(e) => {
                e.stopPropagation()
                void handleRerun(r)
              }}
              // iter1167: 旧 aria-label 2 path とも visible "再" を中位置 "再実行中…" /
              // "再実行" に持ち voice control prefix-matching「click 再」 match 不可
              // (substring 一致のみ)。iter1093-1166 sweep convention に揃え visible
              // "再" 冒頭固定 + em-dash 区切で descriptive 末尾保持。
              aria-label={
                trigger.isPending
                  ? `再 — 実行 ${r.id.slice(0, 8)} を再実行中…`
                  : `再 — 実行 ${r.id.slice(0, 8)} を同じ input で再実行`
              }
              /* iter2101: wf-run-rerun static title (run time のみ) は state-dependent
                 aria-label (再実行中… / 同じ input で再実行 + run id) と divergent。
                 kr-delete iter2099 / sprint-period-edit iter2097 / sprint-premortem
                 iter2095 / sprint-retro iter2093 と同 title-aria divergence 修正 pattern。
                 run id + state + 実行時刻 context を sighted hover で disclose。 */
              title={
                trigger.isPending
                  ? `再 — 実行 ${r.id.slice(0, 8)} を再実行中…`
                  : `再 — 実行 ${r.id.slice(0, 8)} を同じ input で再実行 (${formatRunTime(r)})`
              }
              data-testid={`wf-run-rerun-${r.id}`}
            >
              <Play className="h-3 w-3" aria-hidden="true" />
              <span aria-hidden="true">再</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Phase 6.15 iter137: 1 run の各 node の input/output/error/duration を行ごとに表示。
 * 失敗 run なら error が赤字で <pre>、output は <details> の中で確認できる。
 */
function WorkflowNodeRunsList({ runId }: { runId: string }) {
  const q = useWorkflowNodeRuns(runId, { enabled: true })
  if (q.isLoading)
    return (
      <p className="text-muted-foreground text-[11px]" role="status" aria-live="polite">
        node 詳細を読み込み中…
      </p>
    )
  if (q.error)
    return (
      <p className="text-destructive text-[11px]" role="alert">
        node 詳細の取得に失敗
      </p>
    )
  const rows = q.data ?? []
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-[11px]" role="status" aria-live="polite">
        node 実行履歴がありません
      </p>
    )
  }
  return (
    <ul
      className="space-y-1.5"
      data-testid={`wf-node-runs-${runId}`}
      aria-label={`Workflow node 実行履歴 — ${rows.length} 件`}
    >
      {rows.map((nr) => (
        <li
          key={nr.id}
          className="bg-background space-y-1 rounded border p-1.5"
          data-testid={`wf-node-run-${nr.id}`}
        >
          <div className="flex items-center gap-2 text-[11px]">
            <RunStatusBadge status={nr.status} />
            <span className="font-mono">{nr.nodeId}</span>
            <span className="text-muted-foreground">({nr.nodeType})</span>
            <span className="text-muted-foreground ml-auto tabular-nums">
              {nr.durationMs != null ? `${nr.durationMs}ms` : '—'}
            </span>
          </div>
          {nr.error && (
            <pre
              className="overflow-x-auto rounded bg-red-50 px-2 py-1 text-[10px] whitespace-pre-wrap text-red-700 dark:bg-red-950 dark:text-red-300"
              data-testid={`wf-node-run-error-${nr.id}`}
              aria-label={`node ${nr.nodeId} のエラー`}
              role="alert"
            >
              {nr.error}
            </pre>
          )}
          {nr.output != null && (
            <details className="text-[10px]">
              <summary
                className="text-muted-foreground focus-visible:ring-ring cursor-pointer rounded focus-visible:ring-2 focus-visible:outline-none"
                /* iter1543: 旧 `node ${nr.nodeId} の output (jsonb) を開閉` は visible
                   "output (jsonb)" を中位置 "node ${nodeId} の **output (jsonb)** を開閉" に
                   持ち voice control prefix-matching「click output」 が strict prefix-match
                   で不可。iter1093-1542 sweep convention に揃え visible 冒頭固定 + em-dash 区切。 */
                aria-label={`output (jsonb) — node ${nr.nodeId} の出力を開閉`}
                data-testid={`wf-node-run-output-summary-${nr.id}`}
              >
                output (jsonb)
              </summary>
              <pre className="bg-muted/30 mt-1 overflow-x-auto rounded px-2 py-1 whitespace-pre-wrap">
                {JSON.stringify(nr.output, null, 2)}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ul>
  )
}

function RunStatusBadge({ status }: { status: string }) {
  const cls = runStatusBadgeClass(status)
  const label = runStatusLabel(status)
  // iter1064: role 無 span + aria-label を `role="img"` で authoritative
  // 化 (iter1023/1049-1063 同 pattern、role=img sweep 17 弾目)。
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}
      role="img"
      /* iter1558: 旧 aria-label `"実行ステータス: ${label}"` は visible "${label}" を末尾に持ち
         voice control prefix-matching「click 成功」 が strict prefix-match で不可 (substring 一致のみ)。
         iter1553-1557 status/role Badge family と同 pattern、visible 冒頭固定 + em-dash 区切。
         iter1857: iter1853 sprint-status / iter1855 goal-status と同 pattern を wf-run-status にも展開。 */
      aria-label={`${label} — 実行ステータス`}
      title={`${label} — 実行ステータス`}
    >
      <span aria-hidden="true">{label}</span>
    </span>
  )
}
