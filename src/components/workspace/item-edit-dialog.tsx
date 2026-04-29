'use client'

/**
 * Item 編集ダイアログ (Tab 版)。
 * - 基本 Tab: title / 説明 / 日付 / MUST+DoD / assignee / tag / AI 分解 CTA
 * - コメント Tab: スレッド (Item に紐付く comments_on_items)
 *
 * AI 分解 CTA は主ボタンとして基本 Tab の上部に配置。子 Item が生成されると
 * hooks 側で items cache が invalidate されるので、親の一覧がすぐ更新される。
 */
import { useEffect, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { isInvalidDateRange } from '@/features/item/date-range'
import { formatFriendlyDate } from '@/features/item/date-tokens'
import {
  itemKeys,
  useArchiveItem,
  useClearItemBaseline,
  useItemAssignees,
  useItemTagIds,
  useSetItemAssignees,
  useSetItemBaseline,
  useSetItemTags,
  useUnarchiveItem,
  useUpdateItem,
} from '@/features/item/hooks'
import type { AssigneeRef } from '@/features/item/repository'
import type { Item } from '@/features/item/schema'
import { useAllKeyResultsByWorkspace, useAssignItemToKeyResult } from '@/features/okr/hooks'
import { useAssignItemToSprint, useSprints } from '@/features/sprint/hooks'

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

import { ActivityLog } from './activity-log'
import { AssigneePicker } from './assignee-picker'
import { CommentThread } from './comment-thread'
import { EngineerTriggerButton } from './engineer-trigger-button'
import { ItemDecomposeButton } from './item-decompose-button'
import { ItemDependenciesPanel } from './item-dependencies-panel'
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
  const [tab, setTab] = useState<'base' | 'subtasks' | 'dependencies' | 'comments' | 'activity'>(
    'base',
  )
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [startDate, setStartDate] = useState(item.startDate ?? '')
  const [dueDate, setDueDate] = useState(item.dueDate ?? '')
  const [isMust, setIsMust] = useState(item.isMust)
  const [dod, setDod] = useState(item.dod ?? '')

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
  const { data: tagIds } = useItemTagIds(item.id)
  const setTags = useSetItemTags(workspaceId, item.id)
  const sprintsList = useSprints(workspaceId)
  const assignSprint = useAssignItemToSprint(workspaceId)
  const krsList = useAllKeyResultsByWorkspace(workspaceId)
  const assignKr = useAssignItemToKeyResult(workspaceId)

  async function handleSave() {
    if (isMust && !dod.trim()) {
      toast.error('MUST には DoD が必要です')
      return
    }
    if (isInvalidDateRange(startDate, dueDate)) {
      toast.error('期限は開始日以降にしてください')
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
      <DialogContent className="sm:max-w-2xl" data-testid="item-edit-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{item.title}</span>
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
              className="shrink-0 rounded border border-amber-600/50 px-2 py-1 text-[11px] font-medium hover:bg-amber-600/20"
              data-testid="item-edit-reload"
              aria-label="自分の編集内容を破棄してサーバの最新値を読み込み直す"
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
              最新を読み込み
            </button>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          {/* iter327: TabsList に aria-label を付与し landmark / SR ナビ可能に。
              Activity は他 4 タブが日本語のため "アクティビティ" にローカライズ統一 (WCAG 3.1.2)。 */}
          <TabsList className="w-full" aria-label="Item 編集タブ">
            <TabsTrigger value="base" data-testid="tab-base">
              基本
            </TabsTrigger>
            <TabsTrigger value="subtasks" data-testid="tab-subtasks">
              子タスク
            </TabsTrigger>
            <TabsTrigger value="dependencies" data-testid="tab-dependencies">
              依存
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">
              コメント
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              アクティビティ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="mt-4 space-y-4">
            <div className="bg-primary/5 flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  <span aria-hidden="true">🧠 </span>AI で分解
                </div>
                <p className="text-muted-foreground text-xs">
                  Researcher がこの Item を具体的な子タスクに分解します (数秒〜30s)。
                </p>
              </div>
              <ItemDecomposeButton workspaceId={workspaceId} item={item} />
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
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
                <div className="text-sm font-semibold">
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                aria-required="true"
                minLength={1}
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editDescription">説明</Label>
              <IMEInput
                id="editDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={10_000}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editStart">開始日</Label>
                <IMEInput
                  id="editStart"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="edit-item-start-date"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editDue">期限</Label>
                <IMEInput
                  id="editDue"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="edit-item-due-date"
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
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  data-testid="edit-item-sprint"
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
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  data-testid="edit-item-kr"
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
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isMust}
                onChange={(e) => setIsMust(e.target.checked)}
                data-testid="edit-item-must"
              />
              <span className="font-medium text-red-700">MUST</span>
              <span className="text-muted-foreground text-xs">(絶対落とさない)</span>
            </label>
            {isMust && (
              <div className="space-y-1.5">
                <Label htmlFor="editDod">
                  DoD (完了条件)
                  <span className="ml-1 text-red-600" aria-hidden="true">
                    *
                  </span>
                </Label>
                <IMEInput
                  id="editDod"
                  value={dod}
                  onChange={(e) => setDod(e.target.value)}
                  required
                  aria-required="true"
                  aria-describedby="editDod-hint"
                  data-testid="edit-item-dod"
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
              className="mr-auto"
              aria-label={
                unarchive.isPending
                  ? `「${item.title}」をアーカイブから復元中…`
                  : `「${item.title}」をアーカイブから復元`
              }
            >
              {unarchive.isPending ? '復元中…' : 'アーカイブ復元'}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
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
              className="text-muted-foreground mr-auto"
              aria-label={
                archive.isPending
                  ? `「${item.title}」をアーカイブ中…`
                  : `「${item.title}」をアーカイブ (後で復元可能)`
              }
            >
              {archive.isPending ? 'アーカイブ中…' : 'アーカイブ'}
            </Button>
          )}
          {item.startDate && item.dueDate && !item.archivedAt && (
            <Button
              variant="ghost"
              size="sm"
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
              className="text-muted-foreground"
              title={
                item.baselineStartDate
                  ? // iter268 basics: title は hover 用なので friendly 表示。aria-label
                    // 側 (SR) は ISO のままで日付の precision を保つ。
                    `現在の baseline: ${formatFriendlyDate(item.baselineStartDate, new Date())} → ${formatFriendlyDate(item.baselineEndDate!, new Date())}`
                  : 'startDate / dueDate を当初計画として保存'
              }
              aria-label={
                setBaseline.isPending
                  ? `「${item.title}」のベースラインを記録中…`
                  : item.baselineStartDate
                    ? `「${item.title}」のベースラインを現在の startDate / dueDate に更新 (旧 baseline: ${item.baselineStartDate} → ${item.baselineEndDate})`
                    : `「${item.title}」の startDate / dueDate を当初計画 (baseline) として保存`
              }
            >
              {setBaseline.isPending
                ? '記録中…'
                : item.baselineStartDate
                  ? 'ベースライン更新'
                  : 'ベースライン記録'}
            </Button>
          )}
          {item.baselineStartDate && !item.archivedAt && (
            <Button
              variant="ghost"
              size="sm"
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
              className="text-muted-foreground"
              title="baseline 列を NULL に戻す"
              aria-label={
                clearBaseline.isPending
                  ? `「${item.title}」のベースラインをクリア中…`
                  : `「${item.title}」のベースライン (${item.baselineStartDate} → ${item.baselineEndDate}) をクリア`
              }
            >
              {clearBaseline.isPending ? 'クリア中…' : 'baseline クリア'}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={update.isPending || !title.trim()}
            aria-busy={update.isPending || undefined}
            data-testid="item-edit-save"
            aria-label={
              !title.trim()
                ? '保存するにはタイトルを入力してください'
                : update.isPending
                  ? `「${item.title}」を保存中…`
                  : `「${item.title}」を保存 (楽観ロックで version が進む)`
            }
          >
            {update.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
