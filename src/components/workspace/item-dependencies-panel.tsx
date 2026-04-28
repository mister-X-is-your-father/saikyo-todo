'use client'

/**
 * Item 依存関係 (item_dependencies) Panel — ItemEditDialog の "依存" tab。
 *
 *   - 前提条件 (blockedBy): この Item が後続。上流 Item の完了待ち
 *   - 後続タスク (blocking): この Item が前提。自分の完了を待つ Item
 *   - 関連    (related)   : relates_to 双方向
 *
 * 追加 picker は同 workspace の Item を select。type は blocks / relates_to。
 * - blocks: 上流 (前提) になる Item を選ぶ → fromItemId=picked, toItemId=self
 *   （= "この Item は picked の後続")
 * - relates_to: 関連を結ぶ → fromItemId=self, toItemId=picked
 */
import { useMemo, useState } from 'react'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useItems } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'
import {
  useAddItemDependency,
  useItemDependencies,
  useRemoveItemDependency,
} from '@/features/item-dependency/hooks'
import type { ItemDependencyType } from '@/features/item-dependency/schema'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  workspaceId: string
  item: Item
}

export function ItemDependenciesPanel({ workspaceId, item }: Props) {
  const { data, isLoading } = useItemDependencies(item.id)
  const allItems = useItems(workspaceId)
  const add = useAddItemDependency(item.id)
  const remove = useRemoveItemDependency(item.id)

  const [pickKind, setPickKind] = useState<'prerequisite' | 'related'>('prerequisite')
  const [pickId, setPickId] = useState('')

  const candidates = useMemo(() => {
    const all = allItems.data ?? []
    return all.filter((i) => i.id !== item.id && !i.deletedAt)
  }, [allItems.data, item.id])

  async function handleAdd() {
    if (!pickId) return
    try {
      if (pickKind === 'prerequisite') {
        // 自分が後続 → fromItemId = picked, toItemId = self, type='blocks'
        await add.mutateAsync({ fromItemId: pickId, toItemId: item.id, type: 'blocks' })
      } else {
        await add.mutateAsync({ fromItemId: item.id, toItemId: pickId, type: 'relates_to' })
      }
      setPickId('')
      toast.success('依存を追加しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '追加に失敗しました')
    }
  }

  async function handleRemove(args: {
    fromItemId: string
    toItemId: string
    type: ItemDependencyType
  }) {
    try {
      await remove.mutateAsync(args)
      toast.success('依存を解除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '解除に失敗しました')
    }
  }

  if (isLoading)
    return (
      <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
        読み込み中…
      </p>
    )

  const blockedBy = data?.blockedBy ?? []
  const blocking = data?.blocking ?? []
  const related = data?.related ?? []

  return (
    <div className="space-y-5" data-testid="dependencies-panel">
      <Section
        title="前提条件 (これが終わらないと進められない)"
        emptyText="前提条件はありません"
        items={blockedBy}
        onRemove={(ref) => handleRemove({ fromItemId: ref.id, toItemId: item.id, type: 'blocks' })}
        accent="rose"
      />
      <Section
        title="後続タスク (この Item を待っている)"
        emptyText="後続タスクはありません"
        items={blocking}
        onRemove={(ref) => handleRemove({ fromItemId: item.id, toItemId: ref.id, type: 'blocks' })}
        accent="amber"
      />
      <Section
        title="関連"
        emptyText="関連はありません"
        items={related}
        onRemove={(ref) =>
          handleRemove({ fromItemId: item.id, toItemId: ref.id, type: 'relates_to' })
        }
        accent="slate"
      />

      <div className="space-y-2 rounded border border-dashed p-3">
        <Label>依存を追加</Label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pickKind}
            onChange={(e) => setPickKind(e.target.value as 'prerequisite' | 'related')}
            className="rounded border px-2 py-1.5 text-sm"
            data-testid="dep-kind"
            aria-label="依存の種類"
          >
            <option value="prerequisite">前提条件 (上流)</option>
            <option value="related">関連</option>
          </select>
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="min-w-[260px] flex-1 rounded border px-2 py-1.5 text-sm"
            data-testid="dep-target"
            aria-label="依存先 Item"
          >
            <option value="">Item を選択…</option>
            {candidates.map((c) => (
              <option
                key={c.id}
                value={c.id}
                aria-label={
                  c.isMust ? `MUST: ${c.title} (${c.status})` : `${c.title} (${c.status})`
                }
              >
                {c.isMust ? '⚠ ' : ''}
                {c.title} [{c.status}]
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!pickId || add.isPending}
            onClick={() => void handleAdd()}
            data-testid="dep-add-btn"
            aria-label={
              !pickId
                ? '依存を追加するには対象 Item を選択してください'
                : add.isPending
                  ? '依存を追加中…'
                  : '選択した Item を依存先として追加'
            }
          >
            {add.isPending ? '追加中…' : '追加'}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">循環 (A → B → A) になる依存は拒否されます</p>
      </div>
    </div>
  )
}

function Section({
  title,
  emptyText,
  items,
  onRemove,
  accent,
}: {
  title: string
  emptyText: string
  items: Array<{
    ref: { id: string; title: string; status: string; isMust: boolean; doneAt: Date | null }
    createdAt: Date
  }>
  onRemove: (ref: { id: string; title: string; status: string }) => void
  accent: 'rose' | 'amber' | 'slate'
}) {
  const accentClass =
    accent === 'rose'
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
      : accent === 'amber'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {items.map(({ ref }) => (
            <li
              key={ref.id}
              className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm"
              data-testid={`dep-${ref.id}`}
            >
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${accentClass}`}>
                {ref.status}
              </span>
              <span className="flex-1 truncate">
                {ref.isMust && (
                  <span aria-label="MUST item" role="img" className="mr-1">
                    <span aria-hidden="true">⚠</span>
                  </span>
                )}
                {ref.title}
              </span>
              {ref.doneAt && <span className="text-[10px] text-emerald-600">完了済み</span>}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(ref)}
                data-testid={`dep-remove-${ref.id}`}
                aria-label={`依存「${ref.title}」を解除`}
                title={`依存「${ref.title}」を解除`}
              >
                解除
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
