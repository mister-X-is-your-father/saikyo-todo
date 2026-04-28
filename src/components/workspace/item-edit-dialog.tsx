'use client'

/**
 * Item 編集ダイアログ (Tab 版)。
 * - 基本 Tab: title / 説明 / 日付 / MUST+DoD / assignee / tag / AI 分解 CTA
 * - コメント Tab: スレッド (Item に紐付く comments_on_items)
 *
 * AI 分解 CTA は主ボタンとして基本 Tab の上部に配置。子 Item が生成されると
 * hooks 側で items cache が invalidate されるので、親の一覧がすぐ更新される。
 */
import { useState } from 'react'

import { toast } from 'sonner'

import { fullPathOf } from '@/lib/db/ltree-path'
import { isAppError } from '@/lib/errors'

import {
  useArchiveItem,
  useClearItemBaseline,
  useCreateItem,
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
import { DecomposeProposalsPanel } from './decompose-proposals-panel'
import { EngineerTriggerButton } from './engineer-trigger-button'
import { ItemDecomposeButton } from './item-decompose-button'
import { ItemDependenciesPanel } from './item-dependencies-panel'
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
    if (startDate && dueDate && startDate > dueDate) {
      toast.error('期限は開始日以降にしてください')
      return
    }
    try {
      await update.mutateAsync({
        id: item.id,
        expectedVersion: item.version,
        patch: {
          title: title.trim(),
          description,
          startDate: startDate || null,
          dueDate: dueDate || null,
          isMust,
          dod: isMust ? dod.trim() : null,
        },
      })
      toast.success('Item を更新しました')
      onOpenChange(false)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '更新に失敗しました')
    }
  }

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
            {item.isMust && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                MUST
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            保存すると楽観ロックで version が進みます。別端末からの変更があると Conflict
            になります。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full">
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
              Activity
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
              <div className="space-y-1.5">
                <Label>担当者</Label>
                <AssigneePicker
                  workspaceId={workspaceId}
                  value={assignees ?? []}
                  onChange={handleAssigneeChange}
                  disabled={setAssignees.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label>タグ</Label>
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
                <Label htmlFor="editDod">DoD (完了条件)</Label>
                <IMEInput id="editDod" value={dod} onChange={(e) => setDod(e.target.value)} />
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
            >
              {unarchive.isPending ? '復元中…' : 'アーカイブ復元'}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={archive.isPending}
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
            >
              {archive.isPending ? 'アーカイブ中…' : 'アーカイブ'}
            </Button>
          )}
          {item.startDate && item.dueDate && !item.archivedAt && (
            <Button
              variant="ghost"
              size="sm"
              disabled={setBaseline.isPending}
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
                  ? `現在の baseline: ${item.baselineStartDate} → ${item.baselineEndDate}`
                  : 'startDate / dueDate を当初計画として保存'
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
            >
              {clearBaseline.isPending ? 'クリア中…' : 'baseline クリア'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={update.isPending || !title.trim()}
            data-testid="item-edit-save"
          >
            {update.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 子タスク (subtasks) panel — ItemEditDialog の "子タスク" tab。
 *   - 既存 children を一覧表示 (status badge)
 *   - textarea で改行区切り bulk 追加 (parentItemId=item.id)
 *   - Researcher 等の AI 分解とは別経路 (即時、課金なし)
 *
 * children の判定: items 全件取得して parentPath が parent の fullPath に一致するもの。
 * fullPathOf は pure function なので client で計算可能。
 */
function SubtasksPanel({ workspaceId, parent }: { workspaceId: string; parent: Item }) {
  const items = useItems(workspaceId)
  const create = useCreateItem(workspaceId)
  const [bulkText, setBulkText] = useState('')

  const parentFullPath = fullPathOf({ id: parent.id, parentPath: parent.parentPath })

  const children = (items.data ?? [])
    .filter((i) => !i.deletedAt && i.parentPath === parentFullPath)
    .sort((a, b) => a.position.localeCompare(b.position))

  async function handleBulkAdd() {
    const titles = bulkText
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
    if (titles.length === 0) return
    let succeeded = 0
    for (const t of titles) {
      try {
        await create.mutateAsync({
          workspaceId,
          title: t,
          description: '',
          status: 'todo',
          parentItemId: parent.id,
          priority: 4,
          isMust: false,
          idempotencyKey: crypto.randomUUID(),
        })
        succeeded += 1
      } catch (e) {
        console.error('[subtasks] create failed', e)
      }
    }
    if (succeeded > 0) {
      toast.success(`子タスクを ${succeeded} 件追加しました`)
      setBulkText('')
    }
    if (succeeded < titles.length) {
      toast.error(`${titles.length - succeeded} 件は追加に失敗しました`)
    }
  }

  return (
    <div className="space-y-4" data-testid="subtasks-panel">
      <DecomposeProposalsPanel workspaceId={workspaceId} parentItemId={parent.id} />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">既存の子タスク ({children.length})</h3>
        {items.isLoading ? (
          <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
            読み込み中…
          </p>
        ) : children.length === 0 ? (
          <p className="text-muted-foreground text-xs" role="status">
            まだ子タスクがありません
          </p>
        ) : (
          <ul className="space-y-1" data-testid="subtasks-list">
            {children.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm"
                data-testid={`subtask-${c.id}`}
              >
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    c.status === 'done'
                      ? 'bg-green-100 text-green-700'
                      : c.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {c.status}
                </span>
                <span className="flex-1 truncate">{c.title}</span>
                {c.isMust && (
                  <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-700">
                    MUST
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 rounded border border-dashed p-2">
        <Label htmlFor="subtasks-bulk">改行区切りで bulk 追加</Label>
        <textarea
          id="subtasks-bulk"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={5}
          className="bg-background w-full rounded border px-2 py-1.5 font-mono text-sm"
          placeholder={'例:\n仕様書を読む\nスキーマ設計\nプロトタイプ実装'}
          data-testid="subtasks-bulk-input"
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            空行は無視。priority=4 / status=todo で作成。
          </span>
          <Button
            type="button"
            size="sm"
            disabled={!bulkText.trim() || create.isPending}
            onClick={() => void handleBulkAdd()}
            data-testid="subtasks-bulk-add-btn"
          >
            {create.isPending
              ? '追加中…'
              : `${bulkText.split('\n').filter((t) => t.trim()).length} 件追加`}
          </Button>
        </div>
      </div>
    </div>
  )
}
