'use client'

/**
 * Cmd+K / Ctrl+K で開くコマンドパレット (cmdk + shadcn command の薄いラッパ)。
 *
 * 2 モード:
 *   - 通常: commands を表示 (plugin 登録 action 含む)
 *   - `?` プレフィクス: items を fuse.js で fuzzy 検索、選択で onSelectItem
 */
import { useEffect, useMemo, useState } from 'react'

import Fuse from 'fuse.js'

import type { Item } from '@/features/item/schema'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

export interface PaletteCommand {
  id: string
  label: string
  group?: string
  run: () => void | Promise<void>
  keywords?: string[]
}

export interface CommandPaletteProps {
  commands: PaletteCommand[]
  items?: Item[]
  onSelectItem?: (item: Item) => void
}

export function CommandPalette({ commands, items, onSelectItem }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) setQuery('')
  }

  const isItemSearch = query.startsWith('?')
  const itemSearchQuery = isItemSearch ? query.slice(1).trim() : ''

  const itemResults = useMemo(() => {
    if (!items || !isItemSearch) return []
    if (itemSearchQuery === '') return items.slice(0, 20)
    const fuse = new Fuse(items, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'description', weight: 0.3 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    })
    return fuse.search(itemSearchQuery, { limit: 20 }).map((r) => r.item)
  }, [items, isItemSearch, itemSearchQuery])

  const groups = useMemo(() => groupBy(commands, (c) => c.group ?? 'コマンド'), [commands])

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title="コマンドパレット">
      <CommandInput
        placeholder="コマンド or ? でタスク検索…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isItemSearch ? (
          <>
            <CommandEmpty>
              {items ? '該当するタスクがありません' : 'タスクを読み込み中…'}
            </CommandEmpty>
            <CommandGroup heading={`タスク検索 "${itemSearchQuery}"`}>
              {itemResults.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.id}`}
                  onSelect={() => {
                    handleOpenChange(false)
                    onSelectItem?.(item)
                  }}
                  data-testid={`palette-item-${item.id}`}
                >
                  <span className="truncate">{item.title}</span>
                  {item.isMust && (
                    <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                      MUST
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : (
          <>
            <CommandEmpty>該当するコマンドがありません</CommandEmpty>
            {Object.entries(groups).map(([group, list], idx) => (
              <div key={group}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={group}>
                  {list.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={[c.label, ...(c.keywords ?? [])].join(' ')}
                      onSelect={async () => {
                        handleOpenChange(false)
                        await c.run()
                      }}
                    >
                      {c.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}

function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of arr) {
    const k = key(item)
    ;(out[k] ??= []).push(item)
  }
  return out
}
