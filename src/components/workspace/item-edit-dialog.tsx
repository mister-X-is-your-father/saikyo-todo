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

import { isAppError } from '@/lib/errors'

import {
  useItemAssignees,
  useItemTagIds,
  useSetItemAssignees,
  useSetItemTags,
  useUpdateItem,
} from '@/features/item/hooks'
import type { AssigneeRef } from '@/features/item/repository'
import type { Item } from '@/features/item/schema'

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
import { ItemDecomposeButton } from './item-decompose-button'
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
  const [tab, setTab] = useState<'base' | 'comments' | 'activity'>('base')
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [startDate, setStartDate] = useState(item.startDate ?? '')
  const [dueDate, setDueDate] = useState(item.dueDate ?? '')
  const [isMust, setIsMust] = useState(item.isMust)
  const [dod, setDod] = useState(item.dod ?? '')

  const update = useUpdateItem(workspaceId)

  const { data: assignees } = useItemAssignees(item.id)
  const setAssignees = useSetItemAssignees(workspaceId, item.id)
  const { data: tagIds } = useItemTagIds(item.id)
  const setTags = useSetItemTags(workspaceId, item.id)

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
                <div className="text-sm font-semibold">🧠 AI で分解</div>
                <p className="text-muted-foreground text-xs">
                  Researcher がこの Item を具体的な子タスクに分解します (数秒〜30s)。
                </p>
              </div>
              <ItemDecomposeButton workspaceId={workspaceId} item={item} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editTitle">タイトル</Label>
              <IMEInput id="editTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editDescription">説明</Label>
              <IMEInput
                id="editDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                />
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
