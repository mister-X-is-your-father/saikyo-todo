'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { parseAsString, useQueryState } from 'nuqs'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'
import { moveCursor } from '@/lib/keyboard/list-cursor'

import { useToggleCompleteItem } from '@/features/item/hooks'
import { priorityClass, priorityLabel } from '@/features/item/priority'
import type { Item } from '@/features/item/schema'
import { buildTodayGroups } from '@/features/today/build-groups'

import { EmptyState } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ItemCheckbox } from '@/components/workspace/item-checkbox'
import { StartTimerButton } from '@/components/workspace/start-timer-button'
import { StatusBadge } from '@/components/workspace/status-badge'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Phase 6.15 iter 84: 純粋分類関数を `@/features/today/build-groups` に移動。
// 単体テスト (build-groups.test.ts) で 4 group 仕様を検証。

export function TodayView({
  workspaceId,
  items,
}: {
  workspaceId: string
  items: Item[]
  currentUserId?: string
}) {
  const today = todayISO()
  const groups = buildTodayGroups(items, today)
  const total = groups.reduce((sum, g) => sum + g.items.length, 0)
  // Phase 6.15 iter 63: title click で ItemEditDialog 開く (Gantt iter31 と同パターン)
  const [, setOpenItemId] = useQueryState('item', parseAsString)

  // Phase 6.15 iter 253: Vim/TickTick 風キーボードカーソル。
  // group 順 (期限超過 → 今日 → 明日 → 今週内) で flat 化したリストに対して
  // j/k で上下、Enter/e で開く、x/Space で完了切替、Esc で解除。
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const [rawSelectedId, setSelectedId] = useState<string | null>(null)
  // 選択 id が flat list から消えたら描画では null として扱う (完了済 fade out / フィルタ削除に追随)。
  // setState せず derive することで cascade render を回避。
  const selectedId =
    rawSelectedId && flatItems.some((i) => i.id === rawSelectedId) ? rawSelectedId : null
  const toggle = useToggleCompleteItem(workspaceId)
  // effect 内で最新値を参照するための ref。useEffect で同期して render 中の代入を避ける。
  const flatRef = useRef(flatItems)
  const selectedRef = useRef(selectedId)
  const toggleRef = useRef(toggle)
  const setOpenRef = useRef(setOpenItemId)
  useEffect(() => {
    flatRef.current = flatItems
    selectedRef.current = selectedId
    toggleRef.current = toggle
    setOpenRef.current = setOpenItemId
  })

  useEffect(() => {
    if (total === 0) return
    function onKey(e: KeyboardEvent) {
      if (e.isComposing) return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (t?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const list = flatRef.current
      const cur = selectedRef.current

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedId(moveCursor(list, cur, 'down'))
        return
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedId(moveCursor(list, cur, 'up'))
        return
      }
      if (e.key === 'Escape') {
        if (cur != null) {
          e.preventDefault()
          setSelectedId(null)
        }
        return
      }
      if (e.key === 'Enter' || e.key === 'e') {
        if (cur != null) {
          e.preventDefault()
          void setOpenRef.current(cur)
        }
        return
      }
      if (e.key === 'x' || e.key === ' ') {
        if (cur == null) return
        const item = list.find((i) => i.id === cur)
        if (!item) return
        e.preventDefault()
        const isDone = Boolean(item.doneAt)
        toggleRef.current.mutate(
          { id: item.id, expectedVersion: item.version, complete: !isDone },
          {
            onError: (err) =>
              toast.error(isAppError(err) ? err.message : '完了状態の変更に失敗しました'),
          },
        )
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  if (total === 0) {
    return (
      <EmptyState
        icon={
          <span aria-hidden="true" className="text-3xl">
            🎉
          </span>
        }
        title="今日のタスクはありません"
        description="scheduled_for / dueDate を設定すると Today に出てきます"
        action={
          <button
            type="button"
            className="text-primary hover:bg-muted mt-2 rounded border px-3 py-1.5 text-xs hover:underline"
            data-testid="today-empty-quick-add"
            aria-label="クイック追加入力欄にフォーカス (q キーでも可)"
            onClick={() => {
              const el = document.getElementById('quick-add-input') as HTMLInputElement | null
              el?.focus()
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          >
            クイック追加にフォーカス (キー: q)
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-4" data-testid="today-view">
      <p className="text-muted-foreground text-xs" aria-live="polite">
        キーボード: j/k で移動 · Enter または e で編集 · x または Space で完了切替 · Esc で解除
      </p>
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <Card key={g.label} role="region" aria-label={`${g.label} ${g.items.length} 件`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-base ${g.label === '期限超過' ? 'text-red-600' : ''}`}>
                  {g.label} ({g.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.items.map((it) => {
                  const isCursor = it.id === selectedId
                  return (
                    <div
                      key={it.id}
                      onClick={() => void setOpenItemId(it.id)}
                      className={`hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded p-1.5 ${isCursor ? 'ring-primary bg-muted ring-2' : ''}`}
                      data-testid={`today-row-${it.id}`}
                      data-cursor={isCursor ? 'true' : undefined}
                      aria-current={isCursor ? 'true' : undefined}
                    >
                      <ItemCheckbox item={it} workspaceId={workspaceId} />
                      <span
                        className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${priorityClass(it.priority)}`}
                        title={`p${it.priority ?? 4}`}
                        role="img"
                        aria-label={priorityLabel(it.priority)}
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void setOpenItemId(it.id)
                          }}
                          className="hover:text-primary truncate text-left font-medium hover:underline"
                          data-testid={`today-title-${it.id}`}
                        >
                          {it.title}
                        </button>
                        {it.isMust && (
                          <span
                            className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700"
                            role="img"
                            aria-label="MUST item"
                          >
                            MUST
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                        {it.dueTime && (
                          <span className="tabular-nums">{it.dueTime.slice(0, 5)}</span>
                        )}
                        {it.dueDate && it.dueDate !== today && (
                          <span className="text-red-600">期限 {it.dueDate}</span>
                        )}
                        <StatusBadge status={it.status} />
                        <span onClick={(e) => e.stopPropagation()}>
                          <StartTimerButton item={it} size="sm" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ),
      )}
    </div>
  )
}
