'use client'

/**
 * Day 7 動作確認用の最小 UI。Kanban / Gantt / Backlog の本番ビューは Week 2 以降。
 * - useItems で一覧取得
 * - 新規作成 inline フォーム (IMEInput + useCreateItem)
 * - CommandPalette マウント (Cmd+K でコマンドパレット)
 */
import { useMemo, useState } from 'react'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useCreateItem,
  useItems,
  useSoftDeleteItem,
  useUpdateItemStatus,
} from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { CommandPalette, type PaletteCommand } from '@/components/shared/command-palette'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  workspaceId: string
}

export function ItemsBoard({ workspaceId }: Props) {
  const { data, isLoading, error, refetch } = useItems(workspaceId)
  const create = useCreateItem(workspaceId)
  const toggleStatus = useUpdateItemStatus(workspaceId)
  const softDelete = useSoftDeleteItem(workspaceId)

  const [title, setTitle] = useState('')

  async function handleCreate() {
    const t = title.trim()
    if (!t) return
    try {
      await create.mutateAsync({
        workspaceId,
        title: t,
        description: '',
        status: 'todo',
        isMust: false,
        idempotencyKey: crypto.randomUUID(),
      })
      setTitle('')
      toast.success('Item を作成しました')
    } catch (e) {
      const msg = isAppError(e) ? e.message : '作成に失敗しました'
      toast.error(msg)
    }
  }

  const commands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: 'reload',
        label: '再読み込み',
        group: 'ビュー',
        run: async () => {
          await refetch()
        },
        keywords: ['reload', 'refresh'],
      },
      {
        id: 'focus-new',
        label: '新規 Item 入力にフォーカス',
        group: 'Item',
        run: () => document.getElementById('new-item-input')?.focus(),
        keywords: ['create', 'new', '作成'],
      },
    ],
    [refetch],
  )

  return (
    <div className="space-y-6">
      <CommandPalette commands={commands} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新規 Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <IMEInput
              id="new-item-input"
              placeholder="タイトル (Enter で作成)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={create.isPending || !title.trim()}>
              作成
            </Button>
          </form>
          <p className="text-muted-foreground mt-2 text-xs">
            Cmd+K でコマンドパレット、Enter で作成 (IME 変換中は無視)。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item 一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loading />
          ) : error ? (
            <ErrorState
              message={isAppError(error) ? error.message : '一覧取得に失敗しました'}
              onRetry={() => void refetch()}
            />
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState
              title="まだ Item がありません"
              description="上のフォームから作成してください"
            />
          ) : (
            <ul className="divide-border divide-y">
              {(data ?? []).map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  onToggle={() => {
                    const next =
                      it.status === 'todo'
                        ? 'in_progress'
                        : it.status === 'in_progress'
                          ? 'done'
                          : 'todo'
                    toggleStatus.mutate({ id: it.id, expectedVersion: it.version, status: next })
                  }}
                  onDelete={() => softDelete.mutate({ id: it.id, expectedVersion: it.version })}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: Item
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <li className="flex items-center justify-between py-2">
      <div>
        <span className="text-muted-foreground mr-2 font-mono text-xs">[{item.status}]</span>
        <span>{item.title}</span>
        {item.isMust && <span className="ml-2 text-xs text-red-500">MUST</span>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onToggle}>
          → 次の status
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          削除
        </Button>
      </div>
    </li>
  )
}
