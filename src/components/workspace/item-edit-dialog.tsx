'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useUpdateItem } from '@/features/item/hooks'
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

export function ItemEditDialog({
  workspaceId,
  item,
  open,
  onOpenChange,
}: {
  workspaceId: string
  item: Item | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!item) return null
  // item が変わるたびに key で再 mount してフォーム state を初期化する
  // (useEffect + setState cascading warn 回避)
  return (
    <ItemEditDialogInner
      key={item.id}
      workspaceId={workspaceId}
      item={item}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

function ItemEditDialogInner({
  workspaceId,
  item,
  open,
  onOpenChange,
}: {
  workspaceId: string
  item: Item
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [startDate, setStartDate] = useState(item.startDate ?? '')
  const [dueDate, setDueDate] = useState(item.dueDate ?? '')
  const [isMust, setIsMust] = useState(item.isMust)
  const [dod, setDod] = useState(item.dod ?? '')

  const update = useUpdateItem(workspaceId)

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" data-testid="item-edit-dialog">
        <DialogHeader>
          <DialogTitle>Item 編集</DialogTitle>
          <DialogDescription>
            保存すると楽観ロックで version が進みます。別端末からの変更があると Conflict
            になります。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
        </div>
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
