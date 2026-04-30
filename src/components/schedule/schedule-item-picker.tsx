'use client'

import { useMemo, useState } from 'react'

import { Search } from 'lucide-react'

import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  items: Item[]
  onPick: (input: { itemId: string | null; note?: string | null }) => void
  onCancel: () => void
  /** actual lane で「割込み」(itemId=null) を許す場合 true */
  allowInterrupt?: boolean
}

export function ScheduleItemPicker({ items, onPick, onCancel, allowInterrupt }: Props) {
  const [q, setQ] = useState('')
  const [interruptNote, setInterruptNote] = useState('')

  const filtered = useMemo(() => {
    if (!q.trim()) return items.slice(0, 20)
    const k = q.toLowerCase()
    return items.filter((i) => i.title.toLowerCase().includes(k)).slice(0, 20)
  }, [q, items])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-picker-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
      className="bg-card fixed inset-0 z-50 m-auto flex h-fit max-h-[80vh] w-full max-w-md flex-col gap-3 rounded-lg border p-4 shadow-2xl"
    >
      <h2 id="schedule-picker-title" className="sr-only">
        {allowInterrupt ? '実績 / 割込みを記録する task を選択' : '想定する task を選択'}
      </h2>
      <div className="flex items-center gap-2">
        <Search className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        <Input
          autoFocus
          aria-label="task を検索"
          placeholder="task を検索…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="max-h-72 overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground py-6 text-center text-sm">
            該当する task が見つかりません
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {filtered.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onPick({ itemId: it.id })}
                  className="hover:bg-accent flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm"
                >
                  <span className="truncate">{it.title}</span>
                  {it.isMust ? (
                    <span className="text-[10px] font-bold text-rose-600">MUST</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {allowInterrupt ? (
        <div className="border-t pt-2">
          <label
            htmlFor="schedule-picker-interrupt-note"
            className="text-muted-foreground mb-1 block text-xs"
          >
            割込み / 休憩 として記録 (task に紐付けない)
          </label>
          <div className="flex gap-2">
            <Input
              id="schedule-picker-interrupt-note"
              placeholder="例: 急な電話 / 昼休み"
              value={interruptNote}
              onChange={(e) => setInterruptNote(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => onPick({ itemId: null, note: interruptNote || '割込み' })}
            >
              割込みとして追加
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex justify-end gap-2 border-t pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </div>
  )
}
