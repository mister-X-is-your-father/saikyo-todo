'use client'

/**
 * Item 編集ダイアログ (Tab 版)。
 * - 基本 Tab: title / 説明 / 日付 / MUST+DoD / assignee / tag / AI 分解 CTA
 * - コメント Tab: スレッド (Item に紐付く comments_on_items)
 *
 * AI 分解 CTA は主ボタンとして基本 Tab の上部に配置。子 Item が生成されると
 * hooks 側で items cache が invalidate されるので、親の一覧がすぐ更新される。
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { isPlanComment } from '@/features/agent/agent-plan-prompt'
import { useItemComments } from '@/features/comment/hooks'
import { isInvalidDateRange } from '@/features/item/date-range'
import { formatFriendlyDate } from '@/features/item/date-tokens'
import { summarizeDescendantsProgress } from '@/features/item/descendants-progress'
import {
  itemKeys,
  useArchiveItem,
  useClearItemBaseline,
  useItemAssignees,
  useItems,
  useItemTagIds,
  useSetItemAssignees,
  useSetItemBaseline,
  useSetItemTags,
  useUnarchiveItem,
  useUpdateItem,
} from '@/features/item/hooks'
import type { AssigneeRef } from '@/features/item/repository'
import type { Item } from '@/features/item/schema'
import { useItemDependencies } from '@/features/item-dependency/hooks'
import { summarizeDependencyReadiness } from '@/features/item-dependency/readiness'
import { useAllKeyResultsByWorkspace, useAssignItemToKeyResult } from '@/features/okr/hooks'
import { useAssignItemToSprint, useSprints } from '@/features/sprint/hooks'
import { useCreateTemplateFromItem } from '@/features/template/hooks'

import { AiHandoffPhaseChip } from '@/components/agent/ai-handoff-phase-chip'
import { RecoveryPlanSection } from '@/components/item/recovery-plan-section'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

import { ActivityLog } from './activity-log'
import { AssigneePicker } from './assignee-picker'
import { CommentThread } from './comment-thread'
import { EngineerTriggerButton } from './engineer-trigger-button'
import { ItemDecomposeButton } from './item-decompose-button'
import { ItemDependenciesPanel } from './item-dependencies-panel'
import { ItemPlanGenerateButton } from './item-plan-generate-button'
import { ItemSummaryPanel } from './item-summary-panel'
import { MustBadge } from './must-badge'
import { StartTimerButton } from './start-timer-button'
import { SubtasksPanel } from './subtasks-panel'
import { TagPicker } from './tag-picker'

interface Props {
  workspaceId: string
  item: Item | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId?: string
}

export function ItemEditDialog({ workspaceId, item, open, onOpenChange, currentUserId }: Props) {
  if (!item) return null
  return (
    <ItemEditDialogInner
      key={item.id}
      workspaceId={workspaceId}
      item={item}
      open={open}
      onOpenChange={onOpenChange}
      currentUserId={currentUserId}
    />
  )
}

function ItemEditDialogInner({
  workspaceId,
  item,
  open,
  onOpenChange,
  currentUserId,
}: {
  workspaceId: string
  item: Item
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId?: string
}) {
  const [tab, setTab] = useState<
    'base' | 'summary' | 'subtasks' | 'dependencies' | 'comments' | 'activity'
  >('base')
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [startDate, setStartDate] = useState(item.startDate ?? '')
  const [dueDate, setDueDate] = useState(item.dueDate ?? '')
  const [isMust, setIsMust] = useState(item.isMust)
  const [dod, setDod] = useState(item.dod ?? '')
  // iter504: handleSave validation 失敗 path で focus shift する用 (iter499-503 続編)
  const dodRef = useRef<HTMLInputElement>(null)
  const dueDateRef = useRef<HTMLInputElement>(null)
  // iter1411: この dialog は URL (`?item=`) 駆動で開くため Radix の DialogTrigger が無く、
  // modal Content の onCloseAutoFocus default (triggerRef.focus()) が null を focus して
  // 閉じた後 focus が <body> に落ちる (WCAG 2.4.3 Focus Order 違反)。open 時に opener を
  // 捕捉し、close 時に手動で focus を戻す。
  const openerRef = useRef<HTMLElement | null>(null)

  // Phase 6.15 iter 238: 楽観ロック Conflict UX 改善 (Linear / Asana 風 banner)。
  // dialog open 時の version を state で保持し、Realtime で item.version が server 側
  // で進んだら banner を表示。「最新を読み込み」 button で local 編集 state を破棄して
  // server の最新値で再 sync。dialog 自体は item.id を key にしているので新規 mount
  // 時は再初期化される。
  const [initialVersion, setInitialVersion] = useState(item.version)
  const externallyChanged = item.version !== initialVersion

  const qc = useQueryClient()
  const update = useUpdateItem(workspaceId)
  const archive = useArchiveItem(workspaceId)
  const unarchive = useUnarchiveItem(workspaceId)
  const setBaseline = useSetItemBaseline(workspaceId)
  const clearBaseline = useClearItemBaseline(workspaceId)

  const { data: assignees } = useItemAssignees(item.id)
  const setAssignees = useSetItemAssignees(workspaceId, item.id)
  // iter542 (queue AI 分業 AC-1 wire-up): AI hand-off phase chip 用に comment を fetch、
  // hasPlanComment を isPlanComment marker で判定。useItemComments は他 caller (CommentTab)
  // と queryKey 共通で dedupe される。chip は AI section 上部に配置。
  const { data: itemComments } = useItemComments(item.id)
  const hasPlanComment = useMemo(
    () => (itemComments ?? []).some((c) => isPlanComment(c.body ?? '')),
    [itemComments],
  )
  // iter416 basics: 依存 tab の trigger に「未完了 blocker N 件」 badge を出す。
  // tab を開かなくても「いま依存ブロックされているか」が一瞥で伝わる UX。
  // useItemDependencies は ItemDependenciesPanel と queryKey 共通なので dedupe される
  // (= 1 query で 2 caller)。openBlockedByCount > 0 のときだけ amber chip を render。
  const depsQ = useItemDependencies(item.id)
  const depsReadiness = depsQ.data ? summarizeDependencyReadiness(depsQ.data) : null
  // iter418 basics: 子タスク tab の trigger に「進捗 6/10」 badge を表示。
  // tab を開かずに subtree 進捗が一瞥で伝わる UX (deps-tab badge iter416 と同型)。
  // useItems は SubtasksPanel と queryKey 共通なので 1 query dedupe (= 重複 fetch なし)。
  // pctDone は tab title (= hover で見える) に retained、視覚 chip は 'done/total' 表記
  // (= raw count の方が「6 件中 6 件完了」を瞬時にデコードできる)。
  const allItemsQ = useItems(workspaceId)
  const descendantsProgress = useMemo(
    () =>
      allItemsQ.data
        ? summarizeDescendantsProgress({ id: item.id, parentPath: item.parentPath }, allItemsQ.data)
        : null,
    [allItemsQ.data, item.id, item.parentPath],
  )
  const { data: tagIds } = useItemTagIds(item.id)
  const setTags = useSetItemTags(workspaceId, item.id)
  const sprintsList = useSprints(workspaceId)
  const assignSprint = useAssignItemToSprint(workspaceId)
  const krsList = useAllKeyResultsByWorkspace(workspaceId)
  const assignKr = useAssignItemToKeyResult(workspaceId)
  // FEEDBACK_QUEUE P0 「Template 登録機能」 scope A bind (iter462):
  // 「この Item と subtask を Template として保存」 ghost button を footer に配置。
  // service 側 (iter461 fd9da3a) が parent + 子孫 items を bulk insert するので、
  // ボタン側は itemId を渡すだけで済む。成功 toast に templateId を含めず単に
  // 「Template に保存しました」のみ (template 一覧画面への deep link は scope B 以降)。
  const createTemplateFromItem = useCreateTemplateFromItem(workspaceId)

  async function handleSave() {
    if (isMust && !dod.trim()) {
      toast.error('MUST には DoD が必要です')
      // iter504: validation 失敗 path で first invalid field に focus shift
      // (iter499-503 manual handleSubmit form の onInvalid pattern を ItemEditDialog に展開)
      dodRef.current?.focus()
      return
    }
    if (isInvalidDateRange(startDate, dueDate)) {
      toast.error('期限は開始日以降にしてください')
      dueDateRef.current?.focus()
      return
    }
    const patch = {
      title: title.trim(),
      description,
      startDate: startDate || null,
      dueDate: dueDate || null,
      isMust,
      dod: isMust ? dod.trim() : null,
    }
    try {
      await update.mutateAsync({ id: item.id, expectedVersion: item.version, patch })
      toast.success('Item を更新しました')
      onOpenChange(false)
    } catch (e) {
      // 楽観ロック競合: サーバ最新版を取得して 1 回自動リトライ (Linear / Notion 風)
      if (isAppError(e) && e.code === 'CONFLICT') {
        try {
          await qc.refetchQueries({ queryKey: [...itemKeys.all, workspaceId] })
          const fresh = qc
            .getQueriesData<Item[]>({ queryKey: [...itemKeys.all, workspaceId] })
            .flatMap(([, items]) => items ?? [])
            .find((it) => it.id === item.id)
          if (fresh) {
            await update.mutateAsync({ id: item.id, expectedVersion: fresh.version, patch })
            setInitialVersion(fresh.version)
            toast.success('Item を更新しました（バージョン競合を自動解決）')
            onOpenChange(false)
            return
          }
        } catch {
          // retry も失敗 → fallthrough
        }
      }
      toast.error(isAppError(e) ? e.message : '更新に失敗しました')
    }
  }

  // Phase 6.15 iter 227: Cmd/Ctrl+S で保存 (Todoist / TickTick / Notion 標準)。
  // dialog open + 'base' tab 中のみ有効、IME 変換中は無視、submit 連打は disabled で
  // 防ぐので handleSave 内側の guard に任せる。
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key !== 's' && e.key !== 'S') return
      if (e.isComposing) return
      if (update.isPending || !title.trim()) return
      e.preventDefault()
      void handleSave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // handleSave は title / state クロージャを参照する。state を deps に入れて 最新を bind。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, description, startDate, dueDate, isMust, dod, update.isPending])

  async function handleAssigneeChange(next: AssigneeRef[]) {
    await setAssignees.mutateAsync(next)
  }

  async function handleTagChange(next: string[]) {
    await setTags.mutateAsync(next)
  }

  async function handleSprintChange(next: string | null) {
    try {
      await assignSprint.mutateAsync({ itemId: item.id, sprintId: next })
      toast.success(next ? 'Sprint に割当しました' : 'Sprint 割当を解除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Sprint 割当に失敗')
    }
  }

  async function handleKrChange(next: string | null) {
    try {
      await assignKr.mutateAsync({ itemId: item.id, keyResultId: next })
      toast.success(next ? 'Key Result に割当しました' : 'KR 割当を解除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'KR 割当に失敗')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        data-testid="item-edit-dialog"
        // iter1411: open 直前に focus を持っていた element (= opener) を捕捉。
        // FocusScope が dialog 内へ focus を移す前に発火するので activeElement は opener。
        onOpenAutoFocus={() => {
          const active = document.activeElement
          openerRef.current =
            active instanceof HTMLElement && active !== document.body ? active : null
        }}
        // iter1411: close 時、Radix default の triggerRef.focus() (null) を抑止し opener へ復帰。
        // opener が再 render で外れていれば default に委ねる。
        onCloseAutoFocus={(e) => {
          const opener = openerRef.current
          if (opener && opener.isConnected) {
            e.preventDefault()
            opener.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* iter1754: ItemEditDialog title span は truncate で長 item.title 切れ、
                DialogTitle 自体は aria-label 無 (textContent が SR label)、sighted は
                hover で全 title 見れず。title 付与で sighted hover → 全文 disclose
                (iter1720-1753 sweep を ItemEditDialog header にも展開、modal の
                user identification 即把握向上)。 */}
            <span className="truncate" title={item.title}>
              {item.title}
            </span>
            {item.isMust && <MustBadge />}
          </DialogTitle>
          <DialogDescription>
            保存すると楽観ロックで version が進みます。別端末からの変更があると Conflict
            になります。
          </DialogDescription>
        </DialogHeader>

        {externallyChanged && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200"
            data-testid="item-edit-external-change-banner"
          >
            <span className="mt-0.5" aria-hidden="true">
              ⚠
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">他の人がこの Item を編集しました</div>
              <div className="text-[11px]">
                version {initialVersion} → {item.version}。このまま保存すると Conflict
                エラーになります。
              </div>
            </div>
            <button
              type="button"
              // iter514: pseudo で tap target を 44x44 化 (visual px-2 py-1 text-[11px] 維持、
              // conflict banner row 内 layout を保持)
              className="focus-visible:ring-ring relative shrink-0 rounded border border-amber-600/50 px-2 py-1 text-[11px] font-medium before:absolute before:-inset-3 before:content-[''] hover:bg-amber-600/20 focus-visible:ring-2 focus-visible:outline-none"
              data-testid="item-edit-reload"
              // iter1073: visible "最新を読み込み" は aria-label
              // "自分の編集内容を破棄してサーバの最新値を読み込み直す" に対し
              // "最新値" / "読み込み直す" で characters 不一致 → WCAG 2.5.3
              // (Label in Name) 違反。visible-prefix 先頭固定 (iter1068/1071/1072
              // sweep の続編)。
              aria-label="最新を読み込み — 自分の編集内容を破棄してサーバの最新値を読み込み直す"
              /* iter2079: visible "最新を読み込み" のみで 破壊的 action (自分の編集破棄)
                 context が無く、sighted hover で disclose (notification 全て既読 iter1807 と
                 同 destructive action hover context pattern)。 */
              title="最新を読み込み — 自分の編集内容を破棄してサーバの最新値を読み込み直す"
              onClick={() => {
                if (
                  !window.confirm(
                    '自分の編集内容を破棄して最新値を読み込みますか?\n(保存していない変更は失われます)',
                  )
                )
                  return
                // local state を server snapshot で上書き
                setInitialVersion(item.version)
                setTitle(item.title)
                setDescription(item.description ?? '')
                setStartDate(item.startDate ?? '')
                setDueDate(item.dueDate ?? '')
                setIsMust(item.isMust)
                setDod(item.dod ?? '')
              }}
            >
              <span aria-hidden="true">最新を読み込み</span>
            </button>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          {/* iter327: TabsList に aria-label を付与し landmark / SR ナビ可能に。
              Activity は他 4 タブが日本語のため "アクティビティ" にローカライズ統一 (WCAG 3.1.2)。
              iter1016: shadcn `<TabsList>` default は `h-8` (32px) + `flex-1` で 7 tab を
              equalize するが、iPhone SE 320px viewport では tab 高さ 25px (WCAG 2.5.5
              44x44 違反) + 「アクティビティ」 tab right=427px > dialog right=304px で
              overflow して視認 / tap 不可だった。mobile-first `min-h-14`
              (56px、shadcn inner 50px → tab 49px ≥ 44px) + `overflow-x-auto`
              で 44x44 tap target 確保 + 右端外 tab に touch swipe scroll で到達可能化、
              `sm:min-h-8` で sm 以上 (≥640px) は shadcn default 32px に戻し desktop UX 不変。 */}
          <TabsList
            className="min-h-14 w-full overflow-x-auto sm:min-h-8 sm:overflow-visible [&>button]:min-w-11 sm:[&>button]:min-w-0"
            aria-label="Item 編集タブ"
            /* iter2285: ItemEditDialog の TabsList (Item 編集タブ landmark) の aria-label は
               browser tooltip にならず sighted は hover で「Item 編集 タブ landmark」 disclose
               不可。MCP path A で ItemEditDialog 探索中に発見、5 個別 tab (基本 / サマリ /
               コメント / アクティビティ / etc) には既に title あるが parent TabsList 自体は
               title 欠落。Kanban root iter2281 / Gantt root iter2247 と同 landmark root container
               title pattern を ItemEditDialog TabsList にも展開。 */
            title="Item 編集タブ"
          >
            <TabsTrigger
              value="base"
              data-testid="tab-base"
              aria-label="基本タブ — タイトル / 状態 / 期限 / MUST / 担当 / Tag / DoD を編集"
              /* iter2007: tab trigger visible "基本" のみで descriptive context (Tag / DoD 等
                 編集対象) が無く、sighted hover で disclose (sub-section nav iter1779 と同
                 hover context pattern)。 */
              title="基本タブ — タイトル / 状態 / 期限 / MUST / 担当 / Tag / DoD を編集"
            >
              <span aria-hidden="true">基本</span>
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              data-testid="tab-summary"
              /* iter1671: 旧 "サマリ タブ" / "子タスク タブ" の space-separator は他 tab
                 ("基本タブ" / "依存タブ" / "コメントタブ" / "アクティビティタブ") の no-space
                 convention と divergent。space 削除で全 6 tab を統一 noun-compound format に。 */
              aria-label="サマリタブ — この案件の進捗 / 依存 / 最終更新を一目で確認"
              /* iter2009: tab-base iter2007 と pair、サマリ tab の descriptive context を
                 sighted hover で disclose (6 tab sweep の 2 個目)。 */
              title="サマリタブ — この案件の進捗 / 依存 / 最終更新を一目で確認"
            >
              <span aria-hidden="true">サマリ</span>
            </TabsTrigger>
            <TabsTrigger
              value="subtasks"
              data-testid="tab-subtasks"
              data-subtask-total={descendantsProgress?.total ?? 0}
              data-subtask-done={descendantsProgress?.done ?? 0}
              aria-label={
                descendantsProgress && descendantsProgress.total > 0
                  ? `子タスクタブ — 進捗 ${descendantsProgress.pctDone}% (完了 ${descendantsProgress.done} / 全 ${descendantsProgress.total} 件)`
                  : '子タスクタブ'
              }
              /* iter2011: tab-base/summary iter2007/2009 と pair、子タスク tab の
                 state-dependent descriptive context (進捗率 / 完了数) を sighted hover で
                 disclose (6 tab sweep の 3 個目)。 */
              title={
                descendantsProgress && descendantsProgress.total > 0
                  ? `子タスクタブ — 進捗 ${descendantsProgress.pctDone}% (完了 ${descendantsProgress.done} / 全 ${descendantsProgress.total} 件)`
                  : '子タスクタブ'
              }
            >
              <span aria-hidden="true">子タスク</span>
              {descendantsProgress && descendantsProgress.total > 0 ? (
                <span
                  className={`ml-1 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-medium ring-1 ring-inset ${
                    descendantsProgress.isComplete
                      ? 'bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50'
                      : 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700/50'
                  }`}
                  data-testid="tab-subtasks-progress"
                  aria-hidden="true"
                  title={`進捗 ${descendantsProgress.pctDone}% (完了 ${descendantsProgress.done} / 全 ${descendantsProgress.total} 件)`}
                >
                  {descendantsProgress.done}/{descendantsProgress.total}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="dependencies"
              data-testid="tab-dependencies"
              data-blocked={depsReadiness?.isBlocked ?? false}
              aria-label={
                depsReadiness?.isBlocked
                  ? `依存タブ — 未完了の前提 ${depsReadiness.openBlockedByCount} 件`
                  : '依存タブ'
              }
              /* iter2013: tab-subtasks iter2011 と pair、依存 tab の state-dependent
                 descriptive context (未完了前提件数) を sighted hover で disclose (6 tab sweep
                 の 4 個目)。 */
              title={
                depsReadiness?.isBlocked
                  ? `依存タブ — 未完了の前提 ${depsReadiness.openBlockedByCount} 件`
                  : '依存タブ'
              }
            >
              <span aria-hidden="true">依存</span>
              {depsReadiness && depsReadiness.isBlocked ? (
                <span
                  className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-medium text-amber-800 ring-1 ring-amber-300 ring-inset dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/60"
                  data-testid="tab-dependencies-blocker-count"
                  aria-hidden="true"
                  title={`未完了の前提 ${depsReadiness.openBlockedByCount} 件`}
                >
                  {depsReadiness.openBlockedByCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="comments"
              data-testid="tab-comments"
              aria-label="コメントタブ — 議論履歴 + @メンション + AI Plan 投下"
              /* iter2015: 6 tab sweep の 5 個目、コメント tab の context disclose。 */
              title="コメントタブ — 議論履歴 + @メンション + AI Plan 投下"
            >
              <span aria-hidden="true">コメント</span>
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              data-testid="tab-activity"
              aria-label="アクティビティタブ — 編集履歴 (audit_log) を時系列表示"
              /* iter2015: 6 tab sweep の 6 個目、アクティビティ tab の context disclose。 */
              title="アクティビティタブ — 編集履歴 (audit_log) を時系列表示"
            >
              <span aria-hidden="true">アクティビティ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="mt-4 space-y-4">
            {/* iter549 (queue fluffy-5 wire-up): overdue MUST 救済 action 3 選 を表示。
                isApplicable=false (= overdue MUST でない) なら component が null を返すので
                通常 item では invisible。 */}
            <RecoveryPlanSection
              item={{
                id: item.id,
                title: item.title,
                status: item.status,
                dueDate: item.dueDate,
                isMust: item.isMust,
                priority: item.priority,
                blockedByIds: depsQ.data?.blockedBy.map((d) => d.ref.id) ?? [],
                assigneeIds: (assignees ?? [])
                  .filter((a) => a.actorType === 'user')
                  .map((a) => a.actorId),
              }}
            />
            <div className="bg-primary/5 flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold" role="heading" aria-level={3}>
                  <span aria-hidden="true">🧠 </span>AI で分解
                </div>
                {/* iter1367: bg-primary/5 (#f3f3f3) 上で text-muted-foreground は 4.27:1 (<4.5)。
                    text-foreground/80 で faint tint 上でも WCAG 1.4.3 pass。 */}
                <p className="text-foreground/80 text-xs">
                  Researcher がこの Item を具体的な子タスクに分解します (数秒〜30s)。
                </p>
              </div>
              <ItemDecomposeButton workspaceId={workspaceId} item={item} />
            </div>

            {/* P0「AI 自動実行モード」 scope A: AI 担当 (assignee に agent あり) の時のみ
                表示。Researcher が「実行計画 (Plan)」を Markdown で書いて Item の comment
                として post (🤖 marker 付き)。canGeneratePlan で内部 gate 済 (false なら null)。 */}
            <div className="bg-primary/5 flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 space-y-1.5">
                <div className="text-sm font-semibold" role="heading" aria-level={3}>
                  <span aria-hidden="true">🤖 </span>AI 担当の実行計画
                </div>
                {/* iter542 (queue AI 分業 AC-1 wire-up): handoff-phase chip で
                    「今 AI hand-off の どの段階か」 を 6 phase で可視化。 */}
                <AiHandoffPhaseChip
                  item={{ status: item.status, assignees: assignees ?? [] }}
                  signals={{ hasPlanComment, hasAiReviewComment: false }}
                  showDescription
                  testId="item-edit-ai-handoff-chip"
                />
              </div>
              <ItemPlanGenerateButton
                workspaceId={workspaceId}
                item={item}
                assignees={assignees ?? []}
              />
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold" role="heading" aria-level={3}>
                  <span aria-hidden="true">🛠 </span>Engineer に実装させる
                </div>
                <p className="text-muted-foreground text-xs">
                  Claude (Engineer) が git worktree でコードを書き、commit / PR を作ります。 人間
                  review 必須。
                </p>
              </div>
              <EngineerTriggerButton item={item} />
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold" role="heading" aria-level={3}>
                  <span aria-hidden="true">⏱ </span>タスクタイマー
                </div>
                <p className="text-muted-foreground text-xs">
                  作業時間を計測。停止時に稼働記録 (time_entry) として自動保存します。
                </p>
              </div>
              <StartTimerButton item={item} size="sm" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editTitle">タイトル</Label>
              <IMEInput
                id="editTitle"
                className="h-11"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                aria-required="true"
                aria-invalid={(title.length > 0 && title.trim() === '') || undefined}
                minLength={1}
                maxLength={500}
                autoComplete="off"
                enterKeyHint="next"
                aria-label={
                  title.length === 0
                    ? 'タイトル (必須、最大 500 文字)'
                    : title.trim() === ''
                      ? `タイトル (現在 ${title.length} / 500 文字、空白のみは不正)`
                      : title.length > 480
                        ? `タイトル (現在 ${title.length} / 500 文字、上限近接)`
                        : `タイトル (現在 ${title.length} / 500 文字)`
                }
                /* iter2295: editTitle input の aria-label は state-dependent 4-path (空 / 空白
                   のみ / 上限近接 / 通常) で SR には full context (validation + 文字数) を渡すが
                   browser tooltip にならず sighted は hover で同 context disclose 不可。MCP
                   path A で ItemEditDialog 基本タブで発見、edit-item-sprint/kr iter2287 と
                   同 state-dependent title pattern を title input にも展開、ItemEditDialog の
                   primary input title 補完。 */
                title={
                  title.length === 0
                    ? 'タイトル (必須、最大 500 文字)'
                    : title.trim() === ''
                      ? `タイトル (現在 ${title.length} / 500 文字、空白のみは不正)`
                      : title.length > 480
                        ? `タイトル (現在 ${title.length} / 500 文字、上限近接)`
                        : `タイトル (現在 ${title.length} / 500 文字)`
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editDescription">説明</Label>
              {/* iter1015: 旧 <IMEInput> (1 行 input) に maxLength=10_000 を付けても
                  改行入力不可で長文 Markdown を貼り付けると視覚的に 1 行に潰れて
                  表示・編集不能になっていた。iter111 が decompose-proposals-panel
                  で同 bug を `<Textarea rows=3>` に直した同 fix を ItemEditDialog
                  にも展開。Textarea は form Enter submit 無 + IME 改行不要のため
                  IMEInput 不要 (ItemEditDialog に form-level Enter handler なし)。 */}
              <Textarea
                id="editDescription"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={10_000}
                autoComplete="off"
                aria-label={
                  description.length === 0
                    ? '説明 (任意、最大 10000 文字、Markdown 可、複数行入力可)'
                    : description.length > 9500
                      ? `説明 (現在 ${description.length} / 10000 文字、上限近接)`
                      : `説明 (現在 ${description.length} / 10000 文字)`
                }
                /* iter2297: editDescription textarea の aria-label は state-dependent 3-path
                   (空 / 上限近接 / 通常) で SR には full context を渡すが browser tooltip
                   にならず sighted は hover で同 context (Markdown 可 / 複数行可 / 文字数) は
                   disclose 不可。MCP path A で ItemEditDialog 基本タブで発見、editTitle
                   iter2295 と pair の primary input 2 element (title + description) title
                   完成。 */
                title={
                  description.length === 0
                    ? '説明 (任意、最大 10000 文字、Markdown 可、複数行入力可)'
                    : description.length > 9500
                      ? `説明 (現在 ${description.length} / 10000 文字、上限近接)`
                      : `説明 (現在 ${description.length} / 10000 文字)`
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editStart">開始日</Label>
                <IMEInput
                  id="editStart"
                  type="date"
                  className="h-11"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="edit-item-start-date"
                  enterKeyHint="next"
                  aria-invalid={isInvalidDateRange(startDate, dueDate) || undefined}
                  aria-label={
                    startDate === ''
                      ? '開始日 (任意、期限以前)'
                      : isInvalidDateRange(startDate, dueDate)
                        ? `開始日 (現在: ${startDate}、期限 ${dueDate} より後で不正)`
                        : `開始日 (現在: ${startDate})`
                  }
                  // iter346: 既存 dueDate を超える startDate は不正なので max で HTML5 制約。
                  // 反対方向 (min={startDate}) は editDue 側に既設、両方向ガードで対称化。
                  max={dueDate || undefined}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editDue">期限</Label>
                <IMEInput
                  ref={dueDateRef}
                  id="editDue"
                  type="date"
                  className="h-11"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="edit-item-due-date"
                  enterKeyHint="next"
                  aria-invalid={isInvalidDateRange(startDate, dueDate) || undefined}
                  aria-label={
                    dueDate === ''
                      ? '期限 (任意、開始日以降、MUST item は期限 + Heartbeat 通知が必須)'
                      : isInvalidDateRange(startDate, dueDate)
                        ? `期限 (現在: ${dueDate}、開始日 ${startDate} より前で不正)`
                        : `期限 (現在: ${dueDate})`
                  }
                  min={startDate || undefined}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="editSprint">Sprint</Label>
                <select
                  id="editSprint"
                  value={item.sprintId ?? ''}
                  onChange={(e) => void handleSprintChange(e.target.value || null)}
                  disabled={assignSprint.isPending}
                  aria-busy={assignSprint.isPending || undefined}
                  className="min-h-11 w-full rounded border px-2 py-1.5 text-sm"
                  data-testid="edit-item-sprint"
                  // iter1184: 旧 active path は visible (option text = {current.name} / "未割当") を
                  // 中位置「Sprint「**name**」」「Sprint **未割当**」に持ち voice control
                  // prefix-matching「click {name} / 未割当」 match 不可 (substring 一致のみ)。
                  // pending path も visible (= current.name または "未割当") を含まず WCAG 2.5.3
                  // Label in Name 違反継続。visible 冒頭固定 + em-dash 区切で descriptive 末尾。
                  aria-label={(() => {
                    const current = (sprintsList.data ?? []).find((s) => s.id === item.sprintId)
                    const visible = current?.name ?? '未割当'
                    return assignSprint.isPending
                      ? `${visible} — Sprint 割当を更新中…`
                      : current
                        ? `${visible} — Sprint「${current.name}」に割当中 (変更で別 Sprint へ移動)`
                        : '未割当 — Sprint 未割当 (選択で稼働中 / 計画中 Sprint に割当)'
                  })()}
                  /* iter2287: edit-item-sprint select の aria-label は state-dependent 3-path
                     (pending / 割当中 / 未割当) で SR には full context (current name + 副作用)
                     を渡すが browser tooltip にならず sighted は hover で同 context disclose
                     不可。MCP path A で ItemEditDialog 探索中に発見、edit-item-kr と pair で
                     2 select の title 同時補完。 */
                  title={(() => {
                    const current = (sprintsList.data ?? []).find((s) => s.id === item.sprintId)
                    const visible = current?.name ?? '未割当'
                    return assignSprint.isPending
                      ? `${visible} — Sprint 割当を更新中…`
                      : current
                        ? `${visible} — Sprint「${current.name}」に割当中 (変更で別 Sprint へ移動)`
                        : '未割当 — Sprint 未割当 (選択で稼働中 / 計画中 Sprint に割当)'
                  })()}
                >
                  <option value="">未割当</option>
                  {(() => {
                    const filtered = (sprintsList.data ?? []).filter(
                      (s) => s.status === 'active' || s.status === 'planning',
                    )
                    const active = filtered.filter((s) => s.status === 'active')
                    const planning = filtered.filter((s) => s.status === 'planning')
                    return (
                      <>
                        {active.length > 0 && (
                          <optgroup label="稼働中">
                            {active.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {planning.length > 0 && (
                          <optgroup label="計画中">
                            {planning.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    )
                  })()}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editKr">Key Result (OKR)</Label>
                <select
                  id="editKr"
                  value={item.keyResultId ?? ''}
                  onChange={(e) => void handleKrChange(e.target.value || null)}
                  disabled={assignKr.isPending}
                  aria-busy={assignKr.isPending || undefined}
                  className="min-h-11 w-full rounded border px-2 py-1.5 text-sm"
                  data-testid="edit-item-kr"
                  // iter1185: edit-item-sprint iter1184 と同 sweep — 旧 active path は
                  // visible (option text = {current.title} / "未割当") を中位置
                  // 「Key Result「**title**」」「Key Result **未割当**」に持ち voice control
                  // prefix-matching「click {title} / 未割当」 match 不可。pending も visible 不含。
                  aria-label={(() => {
                    const current = (krsList.data ?? []).find((k) => k.id === item.keyResultId)
                    const visible = current?.title ?? '未割当'
                    return assignKr.isPending
                      ? `${visible} — Key Result 割当を更新中…`
                      : current
                        ? `${visible} — Key Result「${current.title}」(Goal「${current.goalTitle}」) に割当中 (変更で別 KR へ移動)`
                        : '未割当 — Key Result 未割当 (選択で稼働中 Goal の KR に割当)'
                  })()}
                  /* iter2287: edit-item-kr も sprint と pair の state-dependent 3-path title sync。 */
                  title={(() => {
                    const current = (krsList.data ?? []).find((k) => k.id === item.keyResultId)
                    const visible = current?.title ?? '未割当'
                    return assignKr.isPending
                      ? `${visible} — Key Result 割当を更新中…`
                      : current
                        ? `${visible} — Key Result「${current.title}」(Goal「${current.goalTitle}」) に割当中 (変更で別 KR へ移動)`
                        : '未割当 — Key Result 未割当 (選択で稼働中 Goal の KR に割当)'
                  })()}
                >
                  <option value="">未割当</option>
                  {(() => {
                    type Kr = NonNullable<typeof krsList.data>[number]
                    const filtered = (krsList.data ?? []).filter((k) => k.goalStatus === 'active')
                    const byGoal = new Map<string, Kr[]>()
                    for (const kr of filtered) {
                      const arr = byGoal.get(kr.goalTitle) ?? []
                      arr.push(kr)
                      byGoal.set(kr.goalTitle, arr)
                    }
                    return Array.from(byGoal.entries()).map(([goalTitle, krs]) => (
                      <optgroup key={goalTitle} label={`Goal: ${goalTitle}`}>
                        {krs.map((kr) => (
                          <option key={kr.id} value={kr.id}>
                            {kr.title}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  })()}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5" role="group" aria-labelledby="edit-assignees-label">
                <Label id="edit-assignees-label">担当者</Label>
                <AssigneePicker
                  workspaceId={workspaceId}
                  value={assignees ?? []}
                  onChange={handleAssigneeChange}
                  disabled={setAssignees.isPending}
                />
              </div>
              <div className="space-y-1.5" role="group" aria-labelledby="edit-tags-label">
                <Label id="edit-tags-label">タグ</Label>
                <TagPicker
                  workspaceId={workspaceId}
                  value={tagIds ?? []}
                  onChange={handleTagChange}
                  disabled={setTags.isPending}
                />
              </div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isMust}
                onChange={(e) => setIsMust(e.target.checked)}
                data-testid="edit-item-must"
                aria-label={
                  isMust
                    ? 'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'
                    : 'MUST が OFF: 通常タスク — クリックで ON、DoD 必須化'
                }
                /* iter2273: edit-item-must checkbox の aria-label は state-dependent 2-path
                   (ON / OFF、副作用 + 切替先 含む) で SR には full context を渡すが browser
                   tooltip にならず sighted は hover で同 context disclose 不可。MCP path A で
                   ItemEditDialog 内 MUST checkbox 探索中に発見、theme-toggle iter1971 と同
                   state-dependent toggle title pattern を MUST checkbox にも展開。 */
                title={
                  isMust
                    ? 'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'
                    : 'MUST が OFF: 通常タスク — クリックで ON、DoD 必須化'
                }
              />
              {/* iter1371: text-red-700 (#b91c1c) は dark card bg 上で <4.5 (WCAG 1.4.3)。
                  dark:text-red-400 で dark でも pass (light は赤 700 維持)。 */}
              <span className="font-medium text-red-700 dark:text-red-400" aria-hidden="true">
                MUST
              </span>
              <span className="text-muted-foreground text-xs" aria-hidden="true">
                (絶対落とさない)
              </span>
            </label>
            {isMust && (
              <div className="space-y-1.5">
                <Label htmlFor="editDod">
                  DoD (完了条件)
                  {/* iter1511: DoD 必須 asterisk は light 固定 text-red-600 で dark mode で
                      hue が浅く視認性低、iter1508-1510 と同 root。dark variant 補完。 */}
                  <span className="ml-1 text-red-600 dark:text-red-400" aria-hidden="true">
                    *
                  </span>
                </Label>
                <IMEInput
                  ref={dodRef}
                  id="editDod"
                  className="h-11"
                  value={dod}
                  onChange={(e) => setDod(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={(isMust && !dod.trim()) || undefined}
                  aria-describedby="editDod-hint"
                  data-testid="edit-item-dod"
                  autoComplete="off"
                  enterKeyHint="send"
                  aria-label={
                    dod.length === 0
                      ? 'DoD 完了条件 (MUST item は必須、空欄では保存・done 遷移不可)'
                      : isMust && dod.trim() === ''
                        ? `DoD (現在 ${dod.length} 文字、空白のみは MUST 保存に不正)`
                        : `DoD (現在 ${dod.length} 文字、Definition of Done)`
                  }
                />
                <p
                  id="editDod-hint"
                  className="text-muted-foreground text-[11px]"
                  data-testid="edit-item-dod-hint"
                >
                  MUST タスクは DoD (Definition of Done) が必須です。空欄では保存・done
                  遷移できません。
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <ItemSummaryPanel workspaceId={workspaceId} item={item} />
          </TabsContent>

          <TabsContent value="subtasks" className="mt-4">
            <SubtasksPanel workspaceId={workspaceId} parent={item} />
          </TabsContent>

          <TabsContent value="dependencies" className="mt-4">
            <ItemDependenciesPanel workspaceId={workspaceId} item={item} />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            {currentUserId ? (
              <CommentThread
                itemId={item.id}
                workspaceId={workspaceId}
                currentUserId={currentUserId}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                コメント機能を使うには再読み込みしてください
              </p>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityLog itemId={item.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {item.archivedAt ? (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto min-h-11"
              disabled={unarchive.isPending}
              aria-busy={unarchive.isPending || undefined}
              onClick={async () => {
                try {
                  await unarchive.mutateAsync({ id: item.id, expectedVersion: item.version })
                  toast.success('アーカイブを復元しました')
                  onOpenChange(false)
                } catch (e) {
                  toast.error(isAppError(e) ? e.message : '復元に失敗しました')
                }
              }}
              data-testid="item-edit-unarchive"
              // iter1074: visible "アーカイブ復元" は aria-label "アーカイブから復元"
              // で "から" 挿入で literal substring 不一致 → WCAG 2.5.3 (Label in Name)
              // 違反。visible-prefix 先頭固定 (iter1068/1071-1073 sweep の続編)。
              // iter1787: aria-label は browser tooltip にならず sighted は hover で
              // target item.title 即把握できなかった。iter1785 cancel/save と同 pattern
              // を unarchive にも展開、`title={同 aria-label}` 付与で sighted hover で disclose。
              aria-label={
                unarchive.isPending
                  ? `復元中… — 「${item.title}」をアーカイブから復元中`
                  : `アーカイブ復元 — 「${item.title}」をアーカイブから復元`
              }
              title={
                unarchive.isPending
                  ? `復元中… — 「${item.title}」をアーカイブから復元中`
                  : `アーカイブ復元 — 「${item.title}」をアーカイブから復元`
              }
            >
              <span aria-hidden="true">{unarchive.isPending ? '復元中…' : 'アーカイブ復元'}</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground mr-auto min-h-11"
              disabled={archive.isPending}
              aria-busy={archive.isPending || undefined}
              onClick={async () => {
                if (
                  !window.confirm('この Item をアーカイブしますか?\n(後で /archive から復元可能)')
                )
                  return
                try {
                  await archive.mutateAsync({ id: item.id, expectedVersion: item.version })
                  toast.success('アーカイブしました')
                  onOpenChange(false)
                } catch (e) {
                  toast.error(isAppError(e) ? e.message : 'アーカイブに失敗しました')
                }
              }}
              data-testid="item-edit-archive"
              // iter1178: 旧 aria-label 2 path とも visible "アーカイブ" / "アーカイブ中…"
              // を中位置 "「title」を **アーカイブ**" に持ち voice control prefix-matching
              //「click アーカイブ / アーカイブ中…」 match 不可。iter1074 unarchive 同 pattern
              // を archive 側にも展開、visible 冒頭固定 + em-dash 区切で descriptive 末尾。
              // iter1787: aria-label は browser tooltip にならず sighted は hover で
              // target item.title / 「後で復元可能」 hint 即把握できなかった。
              // `title={同 aria-label}` 付与で sighted hover で context disclose。
              aria-label={
                archive.isPending
                  ? `アーカイブ中… — 「${item.title}」をアーカイブ中…`
                  : `アーカイブ — 「${item.title}」をアーカイブ (後で復元可能)`
              }
              title={
                archive.isPending
                  ? `アーカイブ中… — 「${item.title}」をアーカイブ中…`
                  : `アーカイブ — 「${item.title}」をアーカイブ (後で復元可能)`
              }
            >
              <span aria-hidden="true">{archive.isPending ? 'アーカイブ中…' : 'アーカイブ'}</span>
            </Button>
          )}
          {item.startDate && item.dueDate && !item.archivedAt && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground min-h-11"
              disabled={setBaseline.isPending}
              aria-busy={setBaseline.isPending || undefined}
              onClick={async () => {
                try {
                  await setBaseline.mutateAsync({
                    id: item.id,
                    expectedVersion: item.version,
                  })
                  toast.success(
                    item.baselineStartDate
                      ? 'ベースラインを更新しました'
                      : 'ベースラインを記録しました',
                  )
                } catch (e) {
                  toast.error(isAppError(e) ? e.message : 'ベースライン記録に失敗しました')
                }
              }}
              data-testid="item-edit-set-baseline"
              /* iter2121: item-edit-set-baseline title は 2-path (baseline 有/無、
                 pending 不在) で aria-label の 3-path (pending / 更新 / 記録、item.title
                 + state 含む) と divergent → 3-path sync。clear-baseline iter2119 /
                 gantt-summary iter2117 と同 title-aria divergence 修正 pattern。
                 pending state の disclose を追加。 */
              title={
                setBaseline.isPending
                  ? `記録中… — 「${item.title}」のベースラインを記録中`
                  : item.baselineStartDate
                    ? `ベースライン更新 — 「${item.title}」のベースラインを現在の startDate / dueDate に更新 (旧 baseline: ${formatFriendlyDate(item.baselineStartDate, new Date())} → ${formatFriendlyDate(item.baselineEndDate!, new Date())})`
                    : `ベースライン記録 — 「${item.title}」の startDate / dueDate を当初計画 (baseline) として保存`
              }
              // iter1039: visible "ベースライン記録" / "ベースライン更新" を aria-label
              // の prefix に固定し WCAG 2.5.3 satisfy (旧 aria-label は「を現在の
              // startDate / dueDate に」 等 挿入で literal substring 不一致)。
              aria-label={
                setBaseline.isPending
                  ? `記録中… — 「${item.title}」のベースラインを記録中`
                  : item.baselineStartDate
                    ? `ベースライン更新 — 「${item.title}」のベースラインを現在の startDate / dueDate に更新 (旧 baseline: ${item.baselineStartDate} → ${item.baselineEndDate})`
                    : `ベースライン記録 — 「${item.title}」の startDate / dueDate を当初計画 (baseline) として保存`
              }
            >
              <span aria-hidden="true">
                {setBaseline.isPending
                  ? '記録中…'
                  : item.baselineStartDate
                    ? 'ベースライン更新'
                    : 'ベースライン記録'}
              </span>
            </Button>
          )}
          {item.baselineStartDate && !item.archivedAt && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground min-h-11"
              disabled={clearBaseline.isPending}
              aria-busy={clearBaseline.isPending || undefined}
              onClick={async () => {
                if (!window.confirm('baseline をクリアしますか?\n(差分集計から外れます)')) return
                try {
                  await clearBaseline.mutateAsync({
                    id: item.id,
                    expectedVersion: item.version,
                  })
                  toast.success('ベースラインをクリアしました')
                } catch (e) {
                  toast.error(isAppError(e) ? e.message : 'ベースラインクリアに失敗しました')
                }
              }}
              data-testid="item-edit-clear-baseline"
              /* iter2119: item-edit-clear-baseline static title="baseline 列を NULL に戻す"
                 は state-dependent aria-label (pending / idle 2-path、item.title + baseline
                 期間 含む) と divergent → 2-path sync。gantt-summary 3 chip iter2117 /
                 kanban-edit iter2115 と同 title-aria divergence 修正 pattern。
                 destructive action (baseline クリア) で item.title + state context を
                 sighted hover で disclose 価値大。 */
              title={
                clearBaseline.isPending
                  ? `クリア中… — 「${item.title}」のベースラインをクリア中`
                  : `baseline クリア — 「${item.title}」のベースライン (${item.baselineStartDate} → ${item.baselineEndDate}) をクリア`
              }
              // iter1039: visible "baseline クリア" を aria-label の prefix に
              // 固定し WCAG 2.5.3 satisfy (旧 aria-label は "ベースライン (...) をクリア"
              // で literal "baseline クリア" substring 不一致)。
              aria-label={
                clearBaseline.isPending
                  ? `クリア中… — 「${item.title}」のベースラインをクリア中`
                  : `baseline クリア — 「${item.title}」のベースライン (${item.baselineStartDate} → ${item.baselineEndDate}) をクリア`
              }
            >
              <span aria-hidden="true">
                {clearBaseline.isPending ? 'クリア中…' : 'baseline クリア'}
              </span>
            </Button>
          )}
          {!item.archivedAt && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground min-h-11"
              disabled={createTemplateFromItem.isPending}
              aria-busy={createTemplateFromItem.isPending || undefined}
              onClick={async () => {
                if (
                  !window.confirm(
                    'この Item と全ての子孫 (subtask) を Template として保存しますか?\n(再利用時は /<wsId>/templates から展開できます)',
                  )
                )
                  return
                try {
                  await createTemplateFromItem.mutateAsync({ itemId: item.id })
                  toast.success('Template に保存しました')
                } catch (e) {
                  toast.error(isAppError(e) ? e.message : 'Template 保存に失敗しました')
                }
              }}
              data-testid="item-edit-save-as-template"
              /* iter2119: item-edit-save-as-template も clear-baseline と pair で
                 state-dependent aria-label と 2-path sync (item.title + state)。 */
              title={
                createTemplateFromItem.isPending
                  ? `保存中… — 「${item.title}」を Template に保存中`
                  : `Template として保存 — 「${item.title}」と全ての子孫 (subtask) を Template として保存 (再利用可)`
              }
              // iter1302: 旧 aria-label 2 path とも visible "Template として保存" / "保存中…"
              // を中位置 ("「title」を **Template に保存中…**" / "「title」と全ての子孫 (subtask) を
              // **Template として保存**") に持ち voice control prefix-matching
              //「click Template として保存 / 保存中…」 match 不可 (substring 一致のみ)。
              // iter1093-1207 sweep convention (visible 冒頭 + em-dash 区切で descriptive 末尾)
              // に揃え visible 冒頭固定。
              aria-label={
                createTemplateFromItem.isPending
                  ? `保存中… — 「${item.title}」を Template に保存中`
                  : `Template として保存 — 「${item.title}」と全ての子孫 (subtask) を Template として保存 (再利用可)`
              }
            >
              <span aria-hidden="true">
                {createTemplateFromItem.isPending ? '保存中…' : 'Template として保存'}
              </span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            data-testid="item-edit-cancel"
            aria-label={`キャンセル — 「${item.title}」の編集を破棄`}
            // iter1785: visible "キャンセル" のみで sighted は hover で「何の編集を破棄するか」
            // (= item.title) 即把握できなかった (aria-label は browser tooltip にならない)。
            // iter1783 risk-board / iter1781 logout と同 pattern を dialog footer button にも展開。
            title={`キャンセル — 「${item.title}」の編集を破棄`}
          >
            <span aria-hidden="true">キャンセル</span>
          </Button>
          {/* iter1099: save / cancel button の旧 aria-label は visible "保存" / "保存中…" /
              "キャンセル" を末尾持ちで voice control prefix-matching match 不可。
              iter1093-1098 sweep convention に合わせ visible 冒頭固定。
              empty-title path は visible "保存" が既に prefix ("保存するには...") なので維持。
              iter1785: save button も sighted hover で context (target item title + shortcut hint)
              即把握できなかった。`title={同 aria-label}` 付与で sighted hover で context disclose。 */}
          <Button
            type="button"
            className="min-h-11"
            onClick={handleSave}
            disabled={update.isPending || !title.trim()}
            aria-busy={update.isPending || undefined}
            data-testid="item-edit-save"
            aria-keyshortcuts="Meta+S Control+S"
            aria-label={
              !title.trim()
                ? '保存するにはタイトルを入力してください'
                : update.isPending
                  ? `保存中… — 「${item.title}」を保存中`
                  : `保存 — 「${item.title}」を保存 (Cmd/Ctrl+S でも可、楽観ロックで version が進む)`
            }
            title={
              !title.trim()
                ? '保存するにはタイトルを入力してください'
                : update.isPending
                  ? `保存中… — 「${item.title}」を保存中`
                  : `保存 — 「${item.title}」を保存 (Cmd/Ctrl+S でも可、楽観ロックで version が進む)`
            }
          >
            {/* iter1083: visible は ASCII '...' だったが aria-label は U+2026 '…' を使っていて
                literal substring 不一致 = WCAG 2.5.3 違反 + voice control「click 保存中…」 matching 不可。
                iter1078b/1081b/1082b の同 pattern fix を item-edit-dialog にも展開、Unicode '…' に統一。 */}
            <span aria-hidden="true">{update.isPending ? '保存中…' : '保存'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
