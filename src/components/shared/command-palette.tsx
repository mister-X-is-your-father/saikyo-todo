'use client'

/**
 * Cmd+K / Ctrl+K で開くコマンドパレット (cmdk + shadcn command の薄いラッパ)。
 * Day 7 雛形: "Item 作成" / "リロード" 等のスタブコマンドのみ。
 * Week 2 以降で action が増えたら register 形式 (plugin) に寄せる。
 */
import { useEffect, useState } from 'react'

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

export function CommandPalette({ commands }: { commands: PaletteCommand[] }) {
  const [open, setOpen] = useState(false)

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

  const groups = groupBy(commands, (c) => c.group ?? 'コマンド')

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="コマンドパレット">
      <CommandInput placeholder="コマンドを入力 (例: Item 作成)…" />
      <CommandList>
        <CommandEmpty>該当するコマンドがありません</CommandEmpty>
        {Object.entries(groups).map(([group, items], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((c) => (
                <CommandItem
                  key={c.id}
                  value={[c.label, ...(c.keywords ?? [])].join(' ')}
                  onSelect={async () => {
                    setOpen(false)
                    await c.run()
                  }}
                >
                  {c.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
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
